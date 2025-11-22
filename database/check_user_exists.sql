-- Script to check if admin@darecentre.in exists in Supabase Auth
-- Run this in Supabase SQL Editor

-- Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'admin@darecentre.in' OR email = 'admin@darecentre.in';

-- Check all users (to see what emails are actually stored)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check if user has a role assigned
SELECT 
  ar.id as role_id,
  ar.user_id,
  ar.role,
  ar.email as role_email,
  au.email as auth_email,
  au.id as auth_user_id
FROM public.admin_roles ar
RIGHT JOIN auth.users au ON ar.user_id = au.id
WHERE au.email = 'admin@darecentre.in' OR au.email ILIKE '%admin%darecentre%';

-- If user doesn't exist, you need to create it in Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Add user" or "Invite user"
-- 3. Enter email: admin@darecentre.in
-- 4. Set password: Dkit@2012
-- 5. Confirm email (or disable email confirmation in Auth settings)

