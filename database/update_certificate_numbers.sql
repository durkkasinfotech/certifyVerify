-- Update certificate numbers from hyphen format to slash format before sequence number
-- This script updates certificate_no column:
-- From: DARE/AIR/LP/25-26-001
-- To:   DARE/AIR/LP/25-26/001
--
-- This change is applied to ALL records in the database

UPDATE public.certificates
SET certificate_no = 
    REGEXP_REPLACE(
        certificate_no,
        '-(\d{3,})$',  -- Match hyphen followed by 3+ digits at the end (e.g., -001, -002, -060)
        '/\1',         -- Replace with slash followed by the same digits (e.g., /001, /002, /060)
        'g'
    )
WHERE certificate_no ~ '-\d{3,}$'  -- Only update rows where certificate_no ends with hyphen followed by 3+ digits
  AND certificate_no NOT LIKE '%/%/%/%';  -- Skip if already in correct format with 4 slashes

-- Verification queries (optional - uncomment to check results):

-- Check certificate numbers before update:
-- SELECT id, certificate_no, name FROM public.certificates WHERE certificate_no LIKE '%-%' ORDER BY id;

-- Check certificate numbers after update:
-- SELECT id, certificate_no, name FROM public.certificates WHERE certificate_no LIKE '%/%/%/%' ORDER BY id;

-- Count how many records will be affected:
-- SELECT COUNT(*) as records_to_update 
-- FROM public.certificates 
-- WHERE certificate_no ~ '-\d{3,}$' 
--   AND certificate_no NOT LIKE '%/%/%/%';

-- Verify all certificate numbers now use slash format (check for any remaining hyphen format):
-- SELECT id, certificate_no 
-- FROM public.certificates 
-- WHERE certificate_no ~ '-\d{3,}$'
-- ORDER BY id;

