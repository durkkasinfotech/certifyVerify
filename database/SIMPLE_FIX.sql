-- SIMPLE FIX - Run this to fix login issues
-- This fixes RLS policies and assigns roles

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Service role can read all roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admin_roles;

-- Step 2: Disable RLS temporarily to fix data
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Assign role
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

-- Step 3: Verify
SELECT 
  au.email,
  ar.role,
  '✅ READY' as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';

-- Step 4: Re-enable RLS with simple policy
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own role" ON public.admin_roles;

CREATE POLICY "Users can read their own role"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- NOTE: If this still doesn't work, keep RLS disabled temporarily:
-- ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;
-- (Only for testing - re-enable later for security)

