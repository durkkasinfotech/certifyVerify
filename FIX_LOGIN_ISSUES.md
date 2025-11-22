# Complete Fix for Login Issues

## Quick Fix (Run This First)

Run `database/SIMPLE_FIX.sql` in Supabase SQL Editor. This will:
1. Temporarily disable RLS
2. Assign the super_admin role
3. Re-enable RLS with correct policies

## Step-by-Step Fix

### Step 1: Run Diagnostic Script

Run `database/DIAGNOSE_AND_FIX.sql` in Supabase SQL Editor.

This will show you:
- ✅ If user exists
- ✅ If role is assigned
- ✅ If RLS policies are correct
- ✅ Current status

### Step 2: Check the Results

Look at the final verification query result. You should see one of these:

**✅ SUPER ADMIN - READY TO LOGIN**
→ Everything is fixed! Try logging in.

**❌ USER DOES NOT EXIST**
→ Go to Step 3

**⚠️ EMAIL NOT CONFIRMED**
→ Go to Step 4

**❌ NO ROLE ASSIGNED**
→ Go to Step 5

### Step 3: Create User (if doesn't exist)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"**
3. Enter:
   - Email: `admin@darecentre.in`
   - Password: `Dkit@2012`
   - **Auto Confirm User**: ✅ CHECK THIS
4. Click **"Create user"**
5. Run `database/SIMPLE_FIX.sql` again

### Step 4: Confirm Email (if not confirmed)

**Option A: Disable Email Confirmation (Recommended)**
1. Dashboard → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **TURN IT OFF** (disable)
4. Save

**Option B: Manually Confirm**
1. Dashboard → **Authentication** → **Users**
2. Find `admin@darecentre.in`
3. Click on user
4. Click **"Confirm email"**

### Step 5: Assign Role Manually

If role is still not assigned, run this:

```sql
-- First, get the user UUID
SELECT id FROM auth.users WHERE email = 'admin@darecentre.in';

-- Then use that UUID (replace YOUR_UUID_HERE)
INSERT INTO public.admin_roles (user_id, role, email)
VALUES (
  'YOUR_UUID_HERE',
  'super_admin',
  'admin@darecentre.in'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'super_admin',
  email = 'admin@darecentre.in';
```

## Temporary Workaround (If RLS is blocking)

If RLS policies are still causing issues, temporarily disable them:

```sql
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING**: This is only for testing. Re-enable RLS later:

```sql
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

## Testing After Fix

1. **Clear browser cache** or use **Incognito mode**
2. Go to `/super-admin/login`
3. Enter:
   - Email: `admin@darecentre.in`
   - Password: `Dkit@2012`
4. **Open browser console (F12)** and check for:
   - `=== LOGIN ATTEMPT ===`
   - `Fetching role for user: [UUID] [email]`
   - `User role found: super_admin`
   - `SuperAdminProtectedRoute - Access granted`

## Common Issues

### Issue: "No role found" in console
**Solution**: Run `database/SIMPLE_FIX.sql` again

### Issue: "RLS policy error" in console
**Solution**: 
1. Run the RLS fix from `database/DIAGNOSE_AND_FIX.sql` (Part 4)
2. Or temporarily disable RLS (see workaround above)

### Issue: Login works but redirects to login page
**Solution**: 
1. Check browser console for role check errors
2. Verify role is assigned: `SELECT * FROM admin_roles WHERE email = 'admin@darecentre.in';`
3. Check RLS policies are correct

### Issue: Can't login to either admin or super admin
**Solution**:
1. Make sure user exists in `auth.users`
2. Make sure email is confirmed
3. Make sure role is assigned in `admin_roles`
4. Check browser console for exact error

## Still Not Working?

1. **Share the browser console output** (F12 → Console tab)
2. **Share the SQL query results** from `DIAGNOSE_AND_FIX.sql`
3. Check if Supabase environment variables are set correctly

