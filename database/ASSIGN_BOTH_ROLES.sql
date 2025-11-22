-- OPTION: Assign both admin and super_admin roles
-- This creates TWO role entries (you'll need to modify the table structure)
-- OR use this to switch between roles

-- For now, you can only have ONE role per user
-- So choose either 'admin' OR 'super_admin'

-- OPTION 1: Normal Admin (login at /admin)
-- Run this:
/*
INSERT INTO public.admin_roles (user_id, role, email)
SELECT 
  id as user_id,
  'admin' as role,
  'admin@darecentre.in' as email
FROM auth.users
WHERE email = 'admin@darecentre.in'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  email = 'admin@darecentre.in';
*/

-- OPTION 2: Super Admin (login at /super-admin/login)
-- Run this:
/*
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
  email = 'admin@darecentre.in';
*/

-- CURRENT STATUS CHECK:
SELECT 
  au.email,
  ar.role,
  CASE 
    WHEN ar.role = 'admin' THEN '✅ Can login at /admin (Normal Admin)'
    WHEN ar.role = 'super_admin' THEN '✅ Can login at /super-admin/login (Super Admin)'
    ELSE '❌ NO ROLE - Cannot login'
  END as login_info
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

