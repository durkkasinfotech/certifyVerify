-- COMPLETE SETUP: Both Admin and Super Admin Users
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================
-- STEP 1: Disable RLS (temporary - for setup)
-- ============================================
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Check if users exist
-- ============================================
SELECT '=== CHECKING USERS ===' as step;
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('learn@darecentre.in', 'admin@darecentre.in')
ORDER BY email;

-- If users don't exist, create them in Dashboard:
-- Dashboard → Authentication → Users → Add user
-- User 1: learn@darecentre.in, Password: Dkit@2012, Auto Confirm: YES
-- User 2: admin@darecentre.in, Password: Dkit@2012, Auto Confirm: YES

-- ============================================
-- STEP 3: Assign Normal Admin Role to learn@darecentre.in
-- ============================================
SELECT '=== ASSIGNING ADMIN ROLE ===' as step;

INSERT INTO public.admin_roles (user_id, role, email)
SELECT 
  id as user_id,
  'admin' as role,
  'learn@darecentre.in' as email
FROM auth.users
WHERE email = 'learn@darecentre.in'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  email = 'learn@darecentre.in',
  updated_at = timezone('utc', now());

-- ============================================
-- STEP 4: Assign Super Admin Role to admin@darecentre.in
-- ============================================
SELECT '=== ASSIGNING SUPER ADMIN ROLE ===' as step;

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
-- STEP 5: Verify Both Users
-- ============================================
SELECT '=== VERIFICATION ===' as step;

SELECT 
  au.email,
  ar.role,
  CASE 
    WHEN ar.role = 'admin' THEN '✅ NORMAL ADMIN - Login at /login'
    WHEN ar.role = 'super_admin' THEN '✅ SUPER ADMIN - Login at /super-admin/login'
    WHEN ar.role IS NULL THEN '❌ NO ROLE ASSIGNED'
    ELSE '⚠️ UNKNOWN ROLE'
  END as status,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '✅ Email confirmed'
  END as email_status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email IN ('learn@darecentre.in', 'admin@darecentre.in')
ORDER BY au.email;

-- Expected Result:
-- learn@darecentre.in | admin | ✅ NORMAL ADMIN - Login at /login
-- admin@darecentre.in | super_admin | ✅ SUPER ADMIN - Login at /super-admin/login

-- ============================================
-- STEP 6: Re-enable RLS with correct policies
-- ============================================
SELECT '=== RE-ENABLING RLS ===' as step;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Service role can read all roles" ON public.admin_roles;

-- Create policy for authenticated users
CREATE POLICY "Users can read their own role"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for service role
CREATE POLICY "Service role can read all roles"
  ON public.admin_roles
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================
-- FINAL CHECK
-- ============================================
SELECT '=== FINAL STATUS ===' as step;

SELECT 
  au.email,
  ar.role,
  '✅ READY TO LOGIN' as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email IN ('learn@darecentre.in', 'admin@darecentre.in')
ORDER BY au.email;

