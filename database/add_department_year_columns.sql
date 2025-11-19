-- Add Department and Academic Year columns to certificates table
-- Run this first before uploading the new data

-- Add department column (for B.B.A, etc.)
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS department text;

-- Add academic_year column (for 2025-2028, etc.)
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS academic_year text;

-- Update comments
COMMENT ON COLUMN public.certificates.department IS 'Department or course name (e.g., B.B.A)';
COMMENT ON COLUMN public.certificates.academic_year IS 'Academic year range (e.g., 2025-2028)';

