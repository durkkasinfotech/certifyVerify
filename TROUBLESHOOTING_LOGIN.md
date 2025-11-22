# Troubleshooting: Invalid Email or Password Error

If you're getting "Invalid email or password" error, follow these steps **in order**:

## Step 1: Check Browser Console

1. Open your browser
2. Press **F12** (or Right-click → Inspect)
3. Go to the **Console** tab
4. Try logging in again
5. Look for messages starting with `=== LOGIN ATTEMPT ===`
6. Copy all the console messages and check:
   - Is Supabase configured? (should be `true`)
   - What's the exact error message?
   - What's the error status code?

## Step 2: Verify User Exists in Supabase

Run this in **Supabase SQL Editor**:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@darecentre.in';
```

**If NO results:**
- The user doesn't exist → Go to Step 3

**If results found:**
- Note the `id` (UUID)
- Check if `email_confirmed_at` is NULL → If NULL, go to Step 4
- If confirmed, go to Step 5

## Step 3: Create the User

**You CANNOT create users via SQL. You MUST use the Dashboard:**

1. Go to: **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** button (top right)
3. Fill in the form:
   - **Email**: `admin@darecentre.in`
   - **Password**: `Dkit@2012`
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (very important!)
4. Click **"Create user"**
5. Wait for confirmation
6. Go to Step 5

## Step 4: Confirm Email (if needed)

If `email_confirmed_at` is NULL:

**Option A: Enable Auto Confirm (Recommended)**
1. Go to: **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **DISABLE** it (turn it off)
4. This allows users to login without email confirmation

**Option B: Manually Confirm**
1. Go to: **Supabase Dashboard** → **Authentication** → **Users**
2. Find `admin@darecentre.in`
3. Click on the user
4. Click **"Confirm email"** button

## Step 5: Assign Super Admin Role

Run this in **Supabase SQL Editor**:

```sql
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
```

## Step 6: Verify Everything

Run this to verify:

```sql
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  ar.role,
  ar.email as role_email
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';
```

**Expected Result:**
- ✅ `user_id`: Should have a UUID
- ✅ `auth_email`: `admin@darecentre.in`
- ✅ `email_confirmed_at`: Should NOT be null
- ✅ `role`: `super_admin`
- ✅ `role_email`: `admin@darecentre.in`

## Step 7: Test Login

1. Go to `/super-admin/login`
2. Enter:
   - Email: `admin@darecentre.in`
   - Password: `Dkit@2012`
3. Check browser console (F12) for any errors
4. If still failing, check the console error message

## Common Issues

### Issue: "Email not confirmed"
**Solution**: Follow Step 4 above

### Issue: "User not found"
**Solution**: Follow Step 3 to create the user

### Issue: "Invalid credentials"
**Solution**: 
1. Reset password in Dashboard → Authentication → Users
2. Set password to: `Dkit@2012`
3. Make sure no extra spaces

### Issue: Password works in Dashboard but not in app
**Solution**:
1. Check browser console for exact error
2. Verify Supabase environment variables are set
3. Check that you're using the correct Supabase project

## Still Not Working?

1. **Check Supabase Environment Variables:**
   - `VITE_SUPABASE_URL` should be set
   - `VITE_SUPABASE_ANON_KEY` should be set
   - Restart your dev server after changing env variables

2. **Try Resetting Password:**
   - Dashboard → Authentication → Users
   - Find `admin@darecentre.in`
   - Click user → Reset Password
   - Set to: `Dkit@2012`

3. **Check Network Tab:**
   - F12 → Network tab
   - Try login
   - Look for failed requests to Supabase
   - Check the response error

4. **Verify Supabase Project:**
   - Make sure you're using the correct Supabase project
   - Check that the URL and keys match your project

