-- Supabase schema for the Dare Centre certificate verification app
-- Run this script inside the SQL editor or via psql to recreate the table structure.

-- Optional: change the schema name if you do not use the default `public`.
create table if not exists public.certificates (
  id bigint generated always as identity primary key,
  sno bigint,
  roll_no text,
  name text not null,
  phone text,
  email text,
  date_issued date not null,
  issued_by text,
  mode text,
  location_or_institution text,
  certificate_no text not null unique,
  qr_code_url text not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

-- Speed up lookups by certificate number (used on the public verify page).
create index if not exists certificates_certificate_no_idx on public.certificates (certificate_no);
create index if not exists certificates_sno_idx on public.certificates (sno);

-- Optional: keep email unique if each email should only get one certificate.
-- create unique index certificates_email_unique_idx on public.certificates (email);

-- Ensure sensible defaults when inserting records without optional fields.
alter table public.certificates
  alter column phone set default null,
  alter column email set default null,
  alter column issued_by set default null,
  alter column mode set default null,
  alter column location_or_institution set default null;

comment on table public.certificates is 'Issued certificates managed by the Dare Centre admin dashboard.';
comment on column public.certificates.certificate_no is 'Unique Dare Centre certificate identifier (e.g. DARE/AIR/LP/25-26-001).';
comment on column public.certificates.qr_code_url is 'Public URL encoded in the QR code for verification.';
comment on column public.certificates.sno is 'Row serial number as provided in the Excel input sheet.';

