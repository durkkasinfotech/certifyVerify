import { supabase } from './supabaseClient';

const DEFAULT_PREFIX = import.meta.env.VITE_CERT_PREFIX ?? 'DARE/AIR/LP';
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

export const getAcademicYearSegment = (date) => {
  const year = date.getFullYear();
  const shortYear = `${year}`.slice(-2);
  const nextShort = `${(year + 1)}`.slice(-2);
  return `${shortYear}-${nextShort}`;
};

export const extractSequenceNumber = (certificateNo) => {
  if (!certificateNo) return 0;
  // Handle both formats: 25-26/001 (slash) or 25-26-001 (hyphen)
  const match = certificateNo.match(/(\d{2}-\d{2})[\/-](\d{3,})$/);
  if (!match) return 0;
  return Number.parseInt(match[2], 10) || 0;
};

export const makeCertificateNumber = (sequence, yearSegment, prefix = DEFAULT_PREFIX) => {
  const seq = `${sequence}`.padStart(3, '0');
  return `${prefix}/${yearSegment}/${seq}`;
};

export const getNextSequence = async ({ prefix = DEFAULT_PREFIX, yearSegment }) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
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

  return maxSequence + 1;
};

export const buildQrCodeUrl = (certificateNo) => {
  const pathSegment = encodeURIComponent(certificateNo);
  return `${VERIFY_BASE_URL.replace(/\/$/, '')}/verify/${pathSegment}`;
};
