# Super Admin Module Setup Guide

This guide explains how to set up and use the Super Admin module for the certificate verification system.

## Features

- **Super Admin Role**: Full control with edit, delete, and approval capabilities
- **Normal Admin Role**: Can create entries that require approval
- **Approval Workflow**: All entries from normal admins go to "Waiting for Approval" status
- **Separate Login**: Super Admin has a dedicated login page at `/super-admin/login`

## Database Setup

1. **Run the Migration Script**:
   - Open your Supabase SQL Editor
   - Run the script: `database/add_super_admin_schema.sql`
   - This will:
     - Add `status` column to `certificates` table
     - Create `admin_roles` table
     - Set up indexes and RLS policies

2. **Create Admin Roles**:
   After running the migration, you need to manually insert admin roles.

   **Quick Setup for admin@darecentre.in as Super Admin:**
   
   ```sql
   -- Step 1: Find the UUID for admin@darecentre.in
   SELECT id, email FROM auth.users WHERE email = 'admin@darecentre.in';
   
   -- Step 2: Copy the UUID from Step 1 and use it here
   -- Replace 'YOUR_USER_UUID_HERE' with the actual UUID
   INSERT INTO public.admin_roles (user_id, role, email)
   VALUES (
     'YOUR_USER_UUID_HERE',  -- Paste the UUID from Step 1
     'super_admin',
     'admin@darecentre.in'
   )
   ON CONFLICT (user_id) 
   DO UPDATE SET 
     role = 'super_admin',
     email = 'admin@darecentre.in',
     updated_at = timezone('utc', now());
   ```

   **Alternative: One-step setup (if you know the email exists):**
   
   ```sql
   -- This will automatically find the user and assign the role
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

   **To verify the role was created:**
   
   ```sql
   SELECT ar.*, au.email as auth_email 
   FROM public.admin_roles ar
   JOIN auth.users au ON ar.user_id = au.id
   WHERE ar.email = 'admin@darecentre.in';
   ```

   **For other admin users:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find the user and copy their UUID
   - Use the INSERT statement above with the correct UUID and email

## User Roles

### Normal Admin (`admin`)
- **Login**: `/login` (existing login page)
- **Access**: `/admin`
- **Capabilities**:
  - Upload bulk certificates (Excel)
  - Add manual entries
  - View approved certificates only
  - All entries created go to "pending_approval" status

### Super Admin (`super_admin`)
- **Login**: `/super-admin/login` (dedicated login page)
- **Access**: `/super-admin`
- **Capabilities**:
  - View all certificates (approved, pending, rejected)
  - Approve/reject pending certificates
  - Edit any certificate
  - Delete any certificate
  - Bulk approve all pending certificates
  - All entries created are automatically approved

## Workflow

1. **Normal Admin creates entry**:
   - Entry is saved with `status = 'pending_approval'`
   - Entry does NOT appear in normal admin's certificate list
   - Entry appears in Super Admin's approval requests

2. **Super Admin reviews**:
   - Super Admin logs in at `/super-admin/login`
   - Views "Approval Requests" tab
   - Can approve or reject individual entries
   - Can bulk approve all pending entries

3. **After approval**:
   - Entry status changes to `approved`
   - Entry appears in normal admin's certificate list
   - Entry is visible in public verification

## Routes

- `/login` - Normal Admin login
- `/admin` - Normal Admin dashboard
- `/super-admin/login` - Super Admin login
- `/super-admin` - Super Admin dashboard

## Security Notes

- Super Admin cannot access `/admin` route (redirected to their own dashboard)
- Normal Admin cannot access `/super-admin` routes
- Role-based authentication is enforced at route level
- All role checks are performed server-side via Supabase RLS

## Troubleshooting

### "Invalid email or password" error

This error occurs **before** role checking, meaning the authentication itself is failing. Follow these steps:

1. **Check if user exists in Supabase Auth:**
   ```sql
   -- Run this in Supabase SQL Editor
   SELECT id, email, email_confirmed_at, created_at
   FROM auth.users
   WHERE email = 'admin@darecentre.in';
   ```

2. **If user doesn't exist, create it:**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add user" or "Invite user"
   - Enter email: `admin@darecentre.in`
   - Set password: `Dkit@2012`
   - **Important**: Make sure email confirmation is disabled OR confirm the email
   - After creating, run the role assignment script (`setup_super_admin.sql`)

3. **If user exists but login fails:**
   - Check for extra spaces in email/password
   - Verify password is exactly `Dkit@2012` (case-sensitive)
   - Try resetting the password in Supabase Dashboard
   - Check browser console (F12) for detailed error messages

4. **Verify email format:**
   - Supabase stores emails in lowercase
   - The code automatically converts to lowercase, so `Admin@DareCentre.in` should work
   - But verify the actual stored email matches

### "Access denied" error (after successful login)

This means authentication worked but role check failed:

- Ensure the user has a corresponding entry in `admin_roles` table
- Check that the `user_id` matches the UUID from `auth.users`
- Run the setup script: `database/setup_super_admin.sql`

### Certificates not showing
- Normal Admin: Only sees certificates with `status = 'approved'`
- Super Admin: Sees all certificates regardless of status

### Approval not working
- Ensure RLS policies allow updates to `certificates` table
- Check that the user has `super_admin` role in `admin_roles` table

### Quick Diagnostic Queries

Run these in Supabase SQL Editor to diagnose issues:

```sql
-- 1. Check if user exists
SELECT id, email FROM auth.users WHERE email = 'admin@darecentre.in';

-- 2. Check if role is assigned
SELECT ar.*, au.email 
FROM public.admin_roles ar
JOIN auth.users au ON ar.user_id = au.id
WHERE au.email = 'admin@darecentre.in';

-- 3. Check all admin roles
SELECT ar.*, au.email as auth_email
FROM public.admin_roles ar
JOIN auth.users au ON ar.user_id = au.id;
```

