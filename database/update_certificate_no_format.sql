-- Update Certificate Number Format
-- Converts certificate_no from hyphen format to slash format before sequence number
--
-- FROM: DARE/AIR/LP/25-26-001
-- TO:   DARE/AIR/LP/25-26/001
--
-- This updates ALL records in the certificates table

UPDATE public.certificates
SET certificate_no = 
    REGEXP_REPLACE(
        certificate_no,
        '-(\d{3,})$',  -- Match hyphen followed by 3+ digits at the end (e.g., -001, -002)
        '/\1',         -- Replace with slash followed by same digits (e.g., /001, /002)
        'g'
    )
WHERE certificate_no ~ '-\d{3,}$';  -- Only update rows ending with hyphen followed by 3+ digits

