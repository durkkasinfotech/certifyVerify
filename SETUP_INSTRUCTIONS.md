# Complete Setup Instructions - Both Admin Users

## Users Setup

1. **Normal Admin**: `learn@darecentre.in` → Login at `/login` → Access `/admin`
2. **Super Admin**: `admin@darecentre.in` → Login at `/super-admin/login` → Access `/super-admin`

## Step-by-Step Setup

### Step 1: Create Users in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** (do this twice)

**User 1 - Normal Admin:**
- Email: `learn@darecentre.in`
- Password: `Dkit@2012`
- **Auto Confirm User**: ✅ CHECK THIS
- Click **"Create user"**

**User 2 - Super Admin:**
- Email: `admin@darecentre.in`
- Password: `Dkit@2012`
- **Auto Confirm User**: ✅ CHECK THIS
- Click **"Create user"**

### Step 2: Run SQL Script

Run `database/SETUP_BOTH_USERS.sql` in **Supabase SQL Editor**.

This will:
- ✅ Assign `admin` role to `learn@darecentre.in`
- ✅ Assign `super_admin` role to `admin@darecentre.in`
- ✅ Fix RLS policies
- ✅ Verify everything is set up

### Step 3: Test Logins

**Test Normal Admin:**
1. Go to `/login`
2. Email: `learn@darecentre.in`
3. Password: `Dkit@2012`
4. Should redirect to `/admin`

**Test Super Admin:**
1. Go to `/super-admin/login`
2. Email: `admin@darecentre.in`
3. Password: `Dkit@2012`
4. Should redirect to `/super-admin`

## Troubleshooting

### If users don't exist:
- Create them in Dashboard first (Step 1)
- Then run the SQL script (Step 2)

### If email not confirmed:
- Dashboard → Authentication → Settings
- Disable "Enable email confirmations"
- OR manually confirm in Dashboard → Users

### If RLS is blocking:
- The SQL script disables RLS temporarily
- Then re-enables it with correct policies
- If still blocked, run: `ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;`

### If login still fails:
1. Check browser console (F12)
2. Verify users exist: `SELECT * FROM auth.users WHERE email IN ('learn@darecentre.in', 'admin@darecentre.in');`
3. Verify roles assigned: `SELECT * FROM admin_roles WHERE email IN ('learn@darecentre.in', 'admin@darecentre.in');`

## Quick Verification Query

Run this to check everything:

```sql
SELECT 
  au.email,
  ar.role,
  au.email_confirmed_at,
  CASE 
    WHEN ar.role = 'admin' THEN '✅ Login at /login'
    WHEN ar.role = 'super_admin' THEN '✅ Login at /super-admin/login'
    ELSE '❌ NO ROLE'
  END as login_info
FROM auth.users au
LEFT JOIN public.admin_roles ar ON au.id = ar.user_id
WHERE au.email IN ('learn@darecentre.in', 'admin@darecentre.in')
ORDER BY au.email;
```

Expected result:
- `learn@darecentre.in` | `admin` | ✅ Login at /login
- `admin@darecentre.in` | `super_admin` | ✅ Login at /super-admin/login

