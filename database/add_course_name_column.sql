-- Add course_name column to certificates table
-- This script adds a new column for storing course names with a default value
-- Run this in your Supabase SQL editor

-- Add course_name column with default value
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS course_name text DEFAULT 'AI-Powered Logistics Practitioner - Foundation Level';

-- Update existing records to have the default course name (if they don't already have one)
UPDATE public.certificates 
SET course_name = 'AI-Powered Logistics Practitioner - Foundation Level'
WHERE course_name IS NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.certificates.course_name IS 'Name of the course for which the certificate was issued (e.g., AI-Powered Logistics Practitioner - Foundation Level)';

-- Verify the changes
-- Uncomment the following line to see the updated table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'certificates' AND column_name = 'course_name';
