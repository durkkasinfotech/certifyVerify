-- QUICK FIX: Run this if you just need to assign roles
-- This is a simplified version for quick fixes

-- Step 1: Assign Super Admin role to admin@darecentre.in
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

-- Step 2: Verify it worked
SELECT 
  au.email as auth_email,
  ar.role,
  CASE 
    WHEN ar.role IS NULL THEN '❌ NO ROLE'
    ELSE '✅ ' || UPPER(ar.role)
  END as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- If you see "❌ NO ROLE", the user doesn't exist in auth.users
-- Create it in Dashboard → Authentication → Users first

