-- Fix Certificate Number Format
-- Updates certificate_no column from hyphen format to slash format before sequence number
--
-- FROM: DARE/AIR/LP/25-26-001
-- TO:   DARE/AIR/LP/25-26/001
--
-- This script updates ALL records in the certificates table

UPDATE public.certificates
SET certificate_no = 
    REGEXP_REPLACE(
        certificate_no,
        '-(\d{3,})$',  -- Matches hyphen followed by 3+ digits at the end (e.g., -001, -002, -003)
        '/\1',         -- Replaces with slash followed by the same digits (e.g., /001, /002, /003)
        'g'
    )
WHERE certificate_no ~ '-\d{3,}$'  -- Only update rows ending with hyphen followed by 3+ digits
  AND certificate_no NOT LIKE '%/%/%/%';  -- Skip rows already in correct format (4 slashes)

-- Verification: Check how many records will be affected (run before UPDATE)
-- SELECT COUNT(*) as total_records_to_update 
-- FROM public.certificates 
-- WHERE certificate_no ~ '-\d{3,}$' 
--   AND certificate_no NOT LIKE '%/%/%/%';

-- Verification: View sample records before update
-- SELECT id, certificate_no, name 
-- FROM public.certificates 
-- WHERE certificate_no ~ '-\d{3,}$' 
-- ORDER BY id 
-- LIMIT 10;

-- Verification: View sample records after update
-- SELECT id, certificate_no, name 
-- FROM public.certificates 
-- WHERE certificate_no LIKE '%/%/%/%' 
-- ORDER BY id 
-- LIMIT 10;

-- Verification: Check for any remaining hyphen format certificates (should return 0 after update)
-- SELECT COUNT(*) as remaining_hyphen_format
-- FROM public.certificates 
-- WHERE certificate_no ~ '-\d{3,}$';

