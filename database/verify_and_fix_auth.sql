-- Complete Guide: Verify and Fix Authentication for admin@darecentre.in
-- Run these queries one by one in Supabase SQL Editor

-- ============================================
-- STEP 1: Check if user exists in auth.users
-- ============================================
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'admin@darecentre.in' OR email ILIKE 'admin%darecentre%';

-- If this returns NO ROWS, the user doesn't exist - go to STEP 2
-- If this returns a row, note the id and go to STEP 3

-- ============================================
-- STEP 2: Create the user (if it doesn't exist)
-- ============================================
-- You CANNOT create users via SQL in Supabase
-- You MUST use the Supabase Dashboard:

-- 1. Go to: Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" button (or "Invite user")
-- 3. Fill in:
--    - Email: admin@darecentre.in
--    - Password: Dkit@2012
--    - Auto Confirm User: YES (check this box)
-- 4. Click "Create user"
-- 5. After creating, come back and run STEP 3

-- ============================================
-- STEP 3: Verify user was created and get UUID
-- ============================================
SELECT 
  id as user_uuid,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@darecentre.in';

-- Copy the user_uuid (id) from the result above
-- You'll need it for STEP 4

-- ============================================
-- STEP 4: Assign Super Admin Role
-- ============================================
-- Replace 'YOUR_USER_UUID_HERE' with the UUID from STEP 3

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
-- STEP 5: Verify everything is set up correctly
-- ============================================
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  ar.role,
  ar.email as role_email,
  ar.created_at as role_created_at
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- Expected result:
-- - user_id: should have a UUID
-- - auth_email: admin@darecentre.in
-- - email_confirmed_at: should NOT be null (or Auto Confirm was enabled)
-- - role: super_admin
-- - role_email: admin@darecentre.in

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If email_confirmed_at is NULL:
-- Option 1: Enable "Auto Confirm User" in Auth settings
-- Option 2: Manually confirm in Dashboard → Authentication → Users → Click user → Confirm email

-- If password doesn't work:
-- 1. Go to Dashboard → Authentication → Users
-- 2. Find admin@darecentre.in
-- 3. Click on the user
-- 4. Click "Reset Password" or "Change Password"
-- 5. Set new password: Dkit@2012
-- 6. Save

-- If role is NULL or wrong:
-- Run STEP 4 again with the correct UUID

