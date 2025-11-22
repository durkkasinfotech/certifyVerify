# Quick Fix Guide - Admin Login Issues

## Problem: Can't login to /admin

**Error**: "Access denied. You do not have admin privileges."

## Solution: Assign Admin Role

### Step 1: Run this SQL in Supabase SQL Editor

```sql
-- Disable RLS temporarily
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- Assign 'admin' role
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
  email = 'admin@darecentre.in',
  updated_at = timezone('utc', now());

-- Verify
SELECT 
  au.email,
  ar.role,
  '✅ READY' as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';
```

### Step 2: Clear Browser Cache
- Press Ctrl+Shift+Delete
- Or use Incognito window

### Step 3: Login
- Go to `/login`
- Email: `admin@darecentre.in`
- Password: `Dkit@2012`

## Choose Your Role

You can only have **ONE role** per user. Choose:

### Option A: Normal Admin (login at `/admin`)
- Run `database/FIX_ADMIN_LOGIN.sql`
- Role: `admin`
- Can create entries (goes to pending approval)
- Can view approved certificates only

### Option B: Super Admin (login at `/super-admin/login`)
- Run `database/EMERGENCY_FIX.sql`
- Role: `super_admin`
- Can approve/reject entries
- Can edit/delete certificates
- Full control

### Option C: Switch Between Roles
- Run the SQL script for the role you want
- The `ON CONFLICT` will update the existing role

## Current Role Check

Run this to see your current role:

```sql
SELECT 
  au.email,
  ar.role,
  CASE 
    WHEN ar.role = 'admin' THEN '✅ Can login at /admin'
    WHEN ar.role = 'super_admin' THEN '✅ Can login at /super-admin/login'
    ELSE '❌ NO ROLE'
  END as status
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email = 'admin@darecentre.in';
```

## Still Not Working?

1. Make sure user exists: `SELECT * FROM auth.users WHERE email = 'admin@darecentre.in';`
2. Make sure RLS is disabled: `ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;`
3. Check browser console (F12) for errors
4. Verify role is assigned: `SELECT * FROM admin_roles WHERE email = 'admin@darecentre.in';`

