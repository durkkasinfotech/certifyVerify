-- Migration: Add Super Admin role system and approval workflow
-- Run this script in Supabase SQL Editor

-- 1. Add status column to certificates table
alter table public.certificates
  add column if not exists status text not null default 'pending_approval';

-- 2. Create index for status lookups
create index if not exists certificates_status_idx on public.certificates (status);

-- 3. Create admin_roles table to store user roles
create table if not exists public.admin_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  email text not null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

-- 4. Create index for user_id lookups
create index if not exists admin_roles_user_id_idx on public.admin_roles (user_id);
create index if not exists admin_roles_email_idx on public.admin_roles (email);

-- 5. Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- 6. Create trigger to auto-update updated_at
drop trigger if exists update_admin_roles_updated_at on public.admin_roles;
create trigger update_admin_roles_updated_at
  before update on public.admin_roles
  for each row
  execute function update_updated_at_column();

-- 7. Enable Row Level Security (RLS)
alter table public.admin_roles enable row level security;

-- 8. Create policies for admin_roles
-- Drop existing policies if they exist
drop policy if exists "Users can read their own role" on public.admin_roles;
drop policy if exists "Service role can read all roles" on public.admin_roles;

-- Allow users to read their own role
create policy "Users can read their own role"
  on public.admin_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow service role to read all roles (for admin operations)
create policy "Service role can read all roles"
  on public.admin_roles
  for select
  to service_role
  using (true);

-- 9. Update existing certificates to 'approved' status (for backward compatibility)
-- This assumes existing certificates should be approved
-- Comment out if you want to review existing certificates first
-- update public.certificates
-- set status = 'approved'
-- where status = 'pending_approval';

comment on column public.certificates.status is 'Certificate approval status: pending_approval, approved, or rejected';
comment on table public.admin_roles is 'Stores admin user roles (admin or super_admin)';

