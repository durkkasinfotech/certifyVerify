import { supabase } from './supabaseClient';

const DEFAULT_PREFIX = import.meta.env.VITE_CERT_PREFIX ?? 'DARE/AIR/LP';
// CONSTANT: Year segment for certificate numbers - NEVER CHANGES
const YEAR_SEGMENT = '25-26';
const resolveOrigin = () => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};
const VERIFY_BASE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? resolveOrigin();

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const tryParseDelimitedDate = (value) => {
  const trimmed = `${value}`.trim();
  const matcher = trimmed.match(
    /^(?<day>\d{1,2})[\/\-.](?<month>\d{1,2})[\/\-.](?<year>\d{2,4})$/
  );
  if (!matcher) return null;

  const day = Number.parseInt(matcher.groups.day, 10);
  const month = Number.parseInt(matcher.groups.month, 10);
  let year = Number.parseInt(matcher.groups.year, 10);

  if (year < 100) {
    const currentCentury = Math.trunc(new Date().getFullYear() / 100) * 100;
    year += currentCentury;
  }

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
};

export const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return new Date(EXCEL_EPOCH + value * MS_PER_DAY);
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const delimited = tryParseDelimitedDate(value);
    if (delimited) {
      return delimited;
    }
  }

  return null;
};

export const formatDateForDb = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convert full academic year (2025-2028) to short format (25-26) for certificate numbers
export const normalizeAcademicYearSegment = (academicYear) => {
  if (!academicYear || !academicYear.trim()) {
    return null;
  }

  const trimmed = academicYear.trim();
  
  // If already in short format (25-26), return as is
  if (/^\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // If in full format (2025-2028), convert to short format (25-26)
  const fullFormatMatch = trimmed.match(/^(\d{4})-(\d{4})$/);
  if (fullFormatMatch) {
    const startYear = fullFormatMatch[1];
    const endYear = fullFormatMatch[2];
    const shortStart = startYear.slice(-2);
    const shortEnd = endYear.slice(-2);
    return `${shortStart}-${shortEnd}`;
  }
  
  // If single year (2025), convert to 25-26 format
  const singleYearMatch = trimmed.match(/^(\d{4})$/);
  if (singleYearMatch) {
    const year = Number.parseInt(singleYearMatch[1], 10);
    if (!Number.isNaN(year)) {
      const shortYear = `${year}`.slice(-2);
      const nextShort = `${(year + 1)}`.slice(-2);
      return `${shortYear}-${nextShort}`;
    }
  }
  
  return null;
};

export const getAcademicYearSegment = (date) => {
  // Returns format: 25-26 (for 2025-2026 academic year)
  // Only the last 2 digits of each year, separated by hyphen
  const year = date.getFullYear();
  const shortYear = `${year}`.slice(-2);
  const nextShort = `${(year + 1)}`.slice(-2);
  return `${shortYear}-${nextShort}`;
};

export const extractSequenceNumber = (certificateNo) => {
  if (!certificateNo) return 0;
  
  // Handle multiple formats:
  // 1. DARE/AIR/LP/25-26/059 (slash after year segment)
  // 2. DARE/AIR/LP/25-26-059 (hyphen after year segment)
  // 3. 25-26/059 (just year segment and sequence)
  // 4. 25-26-059 (year segment and sequence with hyphen)
  
  // Try to match sequence number at the end (3+ digits)
  // Pattern: .../059 or ...-059 or ...059
  const patterns = [
    /[\/-](\d{3,})$/,           // Match /059 or -059 at the end
    /(\d{3,})$/,                // Match 059 at the end (fallback)
  ];
  
  for (const pattern of patterns) {
    const match = certificateNo.match(pattern);
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > 0) {
        return seq;
      }
    }
  }
  
  return 0;
};

export const makeCertificateNumber = (sequence, yearSegment = YEAR_SEGMENT, prefix = DEFAULT_PREFIX) => {
  // Ensure sequence is a number and pad to 3 digits (001, 002, etc.)
  const seqNum = Number.parseInt(sequence, 10) || 0;
  const seq = `${seqNum}`.padStart(3, '0');
  
  // Format: DARE/AIR/LP/25-26/001
  // CONSTANT: Year segment is always '25-26' - NEVER CHANGES
  // Only the last 3 digits (sequence) change, everything else stays the same
  return `${prefix}/${YEAR_SEGMENT}/${seq}`;
};

// Check if a certificate number already exists in the database
export const certificateNumberExists = async (certificateNo) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  if (!certificateNo || !certificateNo.trim()) {
    return false;
  }

  // Check for exact match (case-insensitive)
  const { data, error } = await supabase
    .from('certificates')
    .select('certificate_no')
    .eq('certificate_no', certificateNo.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking certificate number existence:', error);
    // If there's an error, assume it doesn't exist to avoid blocking
    return false;
  }

  return !!data;
};

// Get the highest sequence number globally (across all certificates)
export const getHighestSequenceNumber = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  // Get all certificate numbers
  const { data, error } = await supabase
    .from('certificates')
    .select('certificate_no');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No existing certificates found. Starting from sequence 1.');
    return 0; // No certificates exist, start from 1
  }

  // Extract sequence numbers from all certificates and find the maximum
  const sequences = data.map((row) => extractSequenceNumber(row.certificate_no));
  const maxSequence = sequences.reduce((acc, value) => Math.max(acc, value), 0);

  // eslint-disable-next-line no-console
  console.log(`Found ${data.length} existing certificates. Highest sequence: ${maxSequence}. Next will be: ${maxSequence + 1}`);

  return maxSequence;
};

// Get a unique certificate number by checking for duplicates
export const getUniqueCertificateNumber = async ({ prefix = DEFAULT_PREFIX, yearSegment, useGlobal = false, maxAttempts = 100 }) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  let nextSeq;
  
  // If useGlobal is true, find highest sequence across all certificates
  if (useGlobal) {
    const highestSeq = await getHighestSequenceNumber();
    nextSeq = highestSeq + 1;
  } else {
    // Original logic: find max sequence for specific year segment
    // Query for both formats: with slash (25-26/001) and hyphen (25-26-001) for backward compatibility
    const likePatternSlash = `${prefix}/${yearSegment}/%`;
    const likePatternHyphen = `${prefix}/${yearSegment}-%`;
    
    const [resultSlash, resultHyphen] = await Promise.all([
      supabase.from('certificates').select('certificate_no').like('certificate_no', likePatternSlash),
      supabase.from('certificates').select('certificate_no').like('certificate_no', likePatternHyphen),
    ]);

    if (resultSlash.error) {
      throw resultSlash.error;
    }
    if (resultHyphen.error) {
      throw resultHyphen.error;
    }

    // Combine results from both queries
    const allCertificates = [
      ...(resultSlash.data || []),
      ...(resultHyphen.data || []),
    ];

    const maxSequence = allCertificates
      .map((row) => extractSequenceNumber(row.certificate_no))
      .reduce((acc, value) => Math.max(acc, value), 0) ?? 0;

    nextSeq = maxSequence + 1;
  }

  // Keep checking until we find a unique certificate number
  let attempts = 0;
  while (attempts < maxAttempts) {
    const candidateCertNo = makeCertificateNumber(nextSeq, yearSegment, prefix);
    const exists = await certificateNumberExists(candidateCertNo);
    
    if (!exists) {
      // Found a unique certificate number
      return nextSeq;
    }
    
    // Certificate number already exists, try next sequence
    nextSeq++;
    attempts++;
  }

  // If we've tried too many times, throw an error
  throw new Error(`Unable to generate unique certificate number after ${maxAttempts} attempts. Please check for duplicate entries.`);
};

export const getNextSequence = async ({ prefix = DEFAULT_PREFIX, yearSegment = YEAR_SEGMENT, useGlobal = false }) => {
  // Use the new unique certificate number generator
  // CONSTANT: yearSegment is always '25-26' for certificate numbers
  return await getUniqueCertificateNumber({ prefix, yearSegment: YEAR_SEGMENT, useGlobal });
};

export const buildQrCodeUrl = (certificateNo) => {
  const pathSegment = encodeURIComponent(certificateNo);
  return `${VERIFY_BASE_URL.replace(/\/$/, '')}/verify/${pathSegment}`;
};
