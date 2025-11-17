-- Update QR code URLs from localhost to production domain
-- This script updates all qr_code_url values to use https://cv.darecentre.in/
-- Only updates the qr_code_url column - all other data remains unchanged
--
-- The URL format will be: https://cv.darecentre.in/verify/{url_encoded_certificate_no}
-- Example: https://cv.darecentre.in/verify/DARE%2FAIR%2FLP%2F25-26-001

UPDATE public.certificates
SET qr_code_url = 'https://cv.darecentre.in/verify/' || 
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(certificate_no, '/', '%2F'),
              ' ', '%20'
            ),
            '+', '%2B'
          ),
          '#', '%23'
        ),
        '&', '%26'
      ),
      '?', '%3F'
    )
WHERE qr_code_url LIKE '%localhost%'
   OR qr_code_url NOT LIKE 'https://cv.darecentre.in%';

-- Optional: Verify the update by checking a few records
-- Uncomment the line below to see the results:
-- SELECT certificate_no, qr_code_url FROM public.certificates LIMIT 10;
