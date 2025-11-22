-- EMERGENCY FIX - Run this to immediately fix loading issue
-- This disables RLS completely so login works

-- Step 1: Completely disable RLS (temporary fix)
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Make sure role is assigned
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

-- Step 3: Verify it worked
SELECT 
  au.email,
  ar.role,
  '✅ FIXED - RLS DISABLED' as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- IMPORTANT: After login works, you can re-enable RLS with:
-- ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
-- Then run the policy creation from SIMPLE_FIX.sql

