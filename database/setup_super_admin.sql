-- Setup Script: Create Super Admin Role for admin@darecentre.in
-- Run this script in Supabase SQL Editor AFTER running add_super_admin_schema.sql
-- This script will automatically find the user by email and assign the super_admin role

-- Method 1: Automatic setup (recommended)
-- This will find the user by email and assign the role automatically
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

-- Method 2: Manual setup (if Method 1 doesn't work)
-- Step 1: Find the UUID first
-- SELECT id, email FROM auth.users WHERE email = 'admin@darecentre.in';

-- Step 2: Use the UUID from Step 1 in this INSERT:
-- INSERT INTO public.admin_roles (user_id, role, email)
-- VALUES (
--   'PASTE_UUID_HERE',  -- Replace with UUID from Step 1
--   'super_admin',
--   'admin@darecentre.in'
-- )
-- ON CONFLICT (user_id) 
-- DO UPDATE SET 
--   role = 'super_admin',
--   email = 'admin@darecentre.in',
--   updated_at = timezone('utc', now());

-- Verify the role was created successfully:
SELECT 
  ar.id,
  ar.user_id,
  ar.role,
  ar.email as role_email,
  au.email as auth_email,
  ar.created_at,
  ar.updated_at
FROM public.admin_roles ar
JOIN auth.users au ON ar.user_id = au.id
WHERE ar.email = 'admin@darecentre.in' OR au.email = 'admin@darecentre.in';

