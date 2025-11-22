-- ============================================
-- COMPLETE DIAGNOSTIC AND FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: DIAGNOSTIC - Check Current State
-- ============================================

-- 1.1 Check if users exist
SELECT '=== CHECKING USERS ===' as step;
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@darecentre.in';

-- 1.2 Check if roles table exists
SELECT '=== CHECKING ROLES TABLE ===' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_roles'
) as roles_table_exists;

-- 1.3 Check current roles
SELECT '=== CHECKING CURRENT ROLES ===' as step;
SELECT 
  au.id as user_id,
  au.email as auth_email,
  ar.id as role_id,
  ar.role,
  ar.email as role_email
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- 1.4 Check RLS policies
SELECT '=== CHECKING RLS POLICIES ===' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'admin_roles';

-- ============================================
-- PART 2: FIX - Remove All Policies and Recreate
-- ============================================

SELECT '=== FIXING RLS POLICIES ===' as step;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Service role can read all roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admin_roles;

-- Disable RLS temporarily to fix data
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: ASSIGN ROLES
-- ============================================

SELECT '=== ASSIGNING ROLES ===' as step;

-- Assign super_admin role
INSERT INTO public.admin_roles (user_id, role, email)
SELECT 
  id as user_id,
  'super_admin' as role,
  'admin@darecentre.in' as email
FROM auth.users
WHERE email = 'admin@darecentre.in'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'super_admin',
  email = 'admin@darecentre.in',
  updated_at = timezone('utc', now());

-- ============================================
-- PART 4: RE-ENABLE RLS WITH CORRECT POLICIES
-- ============================================

SELECT '=== RE-ENABLING RLS ===' as step;

-- Re-enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows authenticated users to read their own role
CREATE POLICY "Users can read their own role"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Also allow service role (for admin operations)
CREATE POLICY "Service role can read all roles"
  ON public.admin_roles
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================
-- PART 5: VERIFY FIX
-- ============================================

SELECT '=== VERIFICATION ===' as step;

-- Final check
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  ar.role,
  ar.email as role_email,
  CASE 
    WHEN au.id IS NULL THEN '❌ USER DOES NOT EXIST'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ EMAIL NOT CONFIRMED'
    WHEN ar.role IS NULL THEN '❌ NO ROLE ASSIGNED'
    WHEN ar.role = 'super_admin' THEN '✅ SUPER ADMIN - READY TO LOGIN'
    WHEN ar.role = 'admin' THEN '✅ ADMIN - READY TO LOGIN'
    ELSE '⚠️ UNKNOWN STATUS'
  END as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- Test query (simulates what the app does)
SELECT '=== TESTING ROLE LOOKUP ===' as step;
-- This should return a role if everything is working
-- Replace 'USER_UUID' with actual UUID from above
SELECT 
  'Run this with your user UUID:' as instruction,
  'SELECT role FROM public.admin_roles WHERE user_id = ''YOUR_UUID_HERE'';' as query;

-- ============================================
-- PART 6: TROUBLESHOOTING NOTES
-- ============================================

-- If status shows "❌ USER DOES NOT EXIST":
-- → Create user in Dashboard → Authentication → Users

-- If status shows "⚠️ EMAIL NOT CONFIRMED":
-- → Go to Dashboard → Authentication → Settings → Disable "Enable email confirmations"
-- OR manually confirm in Dashboard → Authentication → Users

-- If status shows "❌ NO ROLE ASSIGNED":
-- → The INSERT in PART 3 failed - check if user exists first

-- If status shows "✅ SUPER ADMIN":
-- → Everything is set up! Try logging in now.

