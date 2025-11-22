-- COMPLETE FIX: Assign Roles and Fix RLS Policies
-- Run this ENTIRE script in Supabase SQL Editor
-- This will fix both admin and super admin access

-- ============================================
-- STEP 1: Verify users exist
-- ============================================
-- Check what users exist in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('admin@darecentre.in')
ORDER BY email;

-- If no users found, you MUST create them in Supabase Dashboard first:
-- Dashboard → Authentication → Users → Add user

-- ============================================
-- STEP 2: Fix RLS Policies (Allow role reading)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admin_roles;

-- Create policy that allows users to read their own role
CREATE POLICY "Users can read their own role"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Also allow service role to read all (for admin operations)
-- This is needed when using service role key
CREATE POLICY "Service role can read all roles"
  ON public.admin_roles
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================
-- STEP 3: Assign Super Admin Role
-- ============================================
-- This will automatically find admin@darecentre.in and assign super_admin role

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
-- STEP 4: Verify Everything is Set Up
-- ============================================
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  ar.role,
  ar.email as role_email,
  ar.created_at as role_created_at,
  CASE 
    WHEN ar.role IS NULL THEN '❌ NO ROLE ASSIGNED'
    WHEN ar.role = 'super_admin' THEN '✅ SUPER ADMIN'
    WHEN ar.role = 'admin' THEN '✅ ADMIN'
    ELSE '⚠️ UNKNOWN ROLE'
  END as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- Expected result:
-- - user_id: UUID
-- - auth_email: admin@darecentre.in
-- - email_confirmed_at: NOT NULL
-- - role: super_admin
-- - status: ✅ SUPER ADMIN

-- ============================================
-- STEP 5: Test Role Lookup (Simulate what app does)
-- ============================================
-- This simulates what the app does when checking roles
-- Replace 'YOUR_USER_UUID' with the actual UUID from STEP 4

-- First, get your user UUID:
-- SELECT id FROM auth.users WHERE email = 'admin@darecentre.in';

-- Then test (replace UUID):
-- SELECT role 
-- FROM public.admin_roles 
-- WHERE user_id = 'YOUR_USER_UUID_HERE';

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If role is still NULL after running this script:
-- 1. Make sure user exists: SELECT * FROM auth.users WHERE email = 'admin@darecentre.in';
-- 2. Check if INSERT worked: SELECT * FROM public.admin_roles WHERE email = 'admin@darecentre.in';
-- 3. Verify RLS: Try the SELECT query from STEP 5

-- If you get "permission denied" errors:
-- 1. Make sure you're running this as the database owner/service role
-- 2. Check RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_roles';
-- 3. The policies should allow SELECT for authenticated users

-- If login works but role check fails:
-- 1. Check browser console (F12) for the exact error
-- 2. The error should show if it's RLS blocking or no role found
-- 3. Run STEP 4 to verify role is assigned

