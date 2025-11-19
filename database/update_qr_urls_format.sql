-- Update QR code URLs to unencoded format with slash before sequence number
-- This script:
-- 1. Converts sequence separator from hyphen to slash (25-26-001 -> 25-26/001)
-- 2. Updates qr_code_url to unencoded format: https://cv.darecentre.in/verify/DARE/AIR/LP/25-26/001
--
-- Current format: https://cv.darecentre.in/verify/DARE%2FAIR%2FLP%2F25-26-001
-- Target format:  https://cv.darecentre.in/verify/DARE/AIR/LP/25-26/001
--
-- This approach uses the certificate_no column directly (recommended)

UPDATE public.certificates
SET qr_code_url = 'https://cv.darecentre.in/verify/' ||
    REGEXP_REPLACE(
        certificate_no,
        '-(\d{3,})$',  -- Match hyphen followed by 3+ digits at the end (e.g., -001, -002)
        '/\1',         -- Replace with slash followed by same digits (e.g., /001, /002)
        'g'
    )
WHERE qr_code_url IS NOT NULL
  AND certificate_no IS NOT NULL;

-- Alternative approach: If certificate_no is not in correct format, decode from existing qr_code_url:
-- UPDATE public.certificates
-- SET qr_code_url = 
--     'https://cv.darecentre.in/verify/' ||
--     REGEXP_REPLACE(
--         -- Decode URL-encoded certificate number from existing URL
--         REPLACE(
--             REPLACE(
--                 REPLACE(
--                     REPLACE(
--                         REPLACE(
--                             REPLACE(
--                                 REPLACE(
--                                     REPLACE(
--                                         -- Extract the encoded part from current URL (everything after /verify/)
--                                         SUBSTRING(qr_code_url FROM '/verify/(.+)$'),
--                                         '%2F', '/'  -- Decode slashes
--                                     ),
--                                     '%20', ' '  -- Decode spaces
--                                 ),
--                                 '%2B', '+'  -- Decode plus signs
--                             ),
--                             '%23', '#'  -- Decode hash
--                         ),
--                         '%26', '&'  -- Decode ampersand
--                     ),
--                     '%3F', '?'  -- Decode question mark
--                 ),
--                 '%3D', '='  -- Decode equals
--             ),
--             '%40', '@'  -- Decode @
--         ),
--         '-(\d{3,})$',  -- Match hyphen followed by 3+ digits at the end (e.g., -001)
--         '/\1',         -- Replace with slash followed by same digits (e.g., /001)
--         'g'
--     )
-- WHERE qr_code_url LIKE '%cv.darecentre.in/verify/%'
--   AND qr_code_url LIKE '%\%2F%';  -- Only update URL-encoded URLs

-- Verification queries (optional - uncomment to check results):

-- Check current QR URLs (before update):
-- SELECT certificate_no, qr_code_url FROM public.certificates WHERE qr_code_url LIKE '%\%2F%' LIMIT 10;

-- Check updated QR URLs (after update):
-- SELECT certificate_no, qr_code_url FROM public.certificates WHERE qr_code_url LIKE '%/25-26/%' LIMIT 10;

-- Count how many records will be affected:
-- SELECT COUNT(*) as records_to_update 
-- FROM public.certificates 
-- WHERE qr_code_url LIKE '%cv.darecentre.in/verify/%'
--   AND qr_code_url LIKE '%\%2F%';

-- Verify all QR URLs now use unencoded format with slash:
-- SELECT certificate_no, qr_code_url 
-- FROM public.certificates 
-- WHERE qr_code_url LIKE '%cv.darecentre.in/verify/%'
-- ORDER BY certificate_no
-- LIMIT 10;

