-- FIX FOR NORMAL ADMIN LOGIN
-- Run this to assign 'admin' role (for /admin login)

-- Step 1: Disable RLS temporarily
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Assign 'admin' role (for normal admin login at /admin)
INSERT INTO public.admin_roles (user_id, role, email)
SELECT 
  id as user_id,
  'admin' as role,  -- Note: 'admin' for normal admin, 'super_admin' for super admin
  'admin@darecentre.in' as email
FROM auth.users
WHERE email = 'admin@darecentre.in'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',  -- Change to 'admin' for normal admin access
  email = 'admin@darecentre.in',
  updated_at = timezone('utc', now());

-- Step 3: Verify
SELECT 
  au.email,
  ar.role,
  CASE 
    WHEN ar.role = 'admin' THEN '✅ NORMAL ADMIN - Can login at /admin'
    WHEN ar.role = 'super_admin' THEN '✅ SUPER ADMIN - Can login at /super-admin/login'
    ELSE '❌ NO ROLE'
  END as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- NOTE: If you want BOTH admin and super admin access, you'll need separate users
-- OR you can switch between roles by running this script with 'admin' or 'super_admin'

