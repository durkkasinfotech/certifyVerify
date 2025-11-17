import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

const normalizeCertificateNumber = (value) =>
  `${value ?? ''}`.trim().toUpperCase().replace(/\s+/g, '');

const prefixSegmentCount =
  (import.meta.env.VITE_CERT_PREFIX ?? 'DARE/AIR/LP').split('/').length;

const convertLegacyHyphenToSlash = (value) => {
  if (!value || value.includes('/')) return value;
  let remaining = prefixSegmentCount;
  let converted = '';

  for (const char of value) {
    if (char === '-' && remaining > 0) {
      converted += '/';
      remaining -= 1;
    } else {
      converted += char;
    }
  }

  return converted;
};

const toCanonicalCertificate = (value) => {
  const normalized = normalizeCertificateNumber(value);
  if (!normalized) return '';
  if (normalized.includes('/')) return normalized;
  return convertLegacyHyphenToSlash(normalized);
};

const toPathCertificate = (value) => encodeURIComponent(toCanonicalCertificate(value));

const VerifyCertificate = ({ initialCertificate }) => {
  const navigate = useNavigate();
  const [certificateNumber, setCertificateNumber] = useState(
    toCanonicalCertificate(initialCertificate ?? '')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [visibleItems, setVisibleItems] = useState({
    badge: false,
    name: false,
    details: Array(6).fill(false),
  });

  const handleVerify = async (value) => {
    if (!supabaseConfigured) {
      setError(
        'Verification service is currently unavailable. Please configure Supabase credentials.'
      );
      return;
    }

    const rawInput = value || certificateNumber;
    const input = toCanonicalCertificate(rawInput);

    if (!input) {
      setError('Enter a certificate number to proceed.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      let { data, error: queryError } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_no', input)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      if (!data) {
        const fallback = await supabase
          .from('certificates')
          .select('*')
          .ilike('certificate_no', input)
          .limit(1);

        if (fallback.error) {
          throw fallback.error;
        }

        data = fallback.data?.[0];
      }

      if (!data) {
        throw new Error(
          'Certificate number not found in our records. Please check the number or contact Dare Centre support.'
        );
      }

      setResult(data);
      setError('');
      setVisibleItems({
        badge: false,
        name: false,
        details: Array(6).fill(false),
      });
      navigate(`/verify/${toPathCertificate(data.certificate_no)}`, { replace: true });
    } catch (err) {
      const message = err?.message ?? 'Verification failed. Please try again later.';
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCertificate) {
      const normalized = toCanonicalCertificate(initialCertificate);
      setCertificateNumber(normalized);
      // Reset result on page refresh/load - don't auto-verify
      setResult(null);
      setError('');
      setVisibleItems({
        badge: false,
        name: false,
        details: Array(6).fill(false),
      });
    }
  }, [initialCertificate]);

  // Staggered animation effect when result is set
  useEffect(() => {
    if (!result) {
      setVisibleItems({
        badge: false,
        name: false,
        details: Array(6).fill(false),
      });
      return;
    }

    // Reset and start animations
    setVisibleItems({
      badge: false,
      name: false,
      details: Array(6).fill(false),
    });

    const timeouts = [];

    // Badge appears first
    timeouts.push(
      setTimeout(() => {
        setVisibleItems((prev) => ({ ...prev, badge: true }));
      }, 0)
    );

    // Name appears after 1 second
    timeouts.push(
      setTimeout(() => {
        setVisibleItems((prev) => ({ ...prev, name: true }));
      }, 1000)
    );

    // Details appear one by one with 1-second gaps
    const detailFields = [
      'certificate_no',
      'email',
      'mode',
      'location_or_institution',
      'date_issued',
      'issued_by',
    ];
    detailFields.forEach((_, index) => {
      timeouts.push(
        setTimeout(() => {
          setVisibleItems((prev) => {
            const newDetails = [...prev.details];
            newDetails[index] = true;
            return { ...prev, details: newDetails };
          });
        }, 2000 + index * 1000)
      );
    });


    // Cleanup function to clear timeouts
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [result]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-slate-50/50 p-4 shadow-2xl ring-1 ring-slate-200/50 sm:p-6 md:p-10">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="relative mb-6 sm:mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary sm:px-4 sm:py-1.5">
          <i className="fa fa-shield-check text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Secure Verification</span>
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-dark sm:text-3xl md:text-4xl lg:text-5xl">
          Verify Your Certificate
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base md:text-lg">
          Enter the certificate number exactly as it appears on the certificate to verify instantly.
        </p>
      </div>

      <div className="relative space-y-4 sm:space-y-6">
        <label className="block">
          <span className="mb-2 block text-xs font-display font-semibold uppercase tracking-wider text-slate-700 sm:mb-3 sm:text-sm">
            Certificate Number
          </span>
          <div className="mt-2 flex flex-col gap-3 sm:mt-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                <i className="fa fa-certificate text-sm text-slate-400 sm:text-base" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={certificateNumber}
                onChange={(event) =>
                  setCertificateNumber(toCanonicalCertificate(event.target.value))
                }
                placeholder="e.g. DARE/AIR/LP/25-26-001"
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 py-3 text-sm font-semibold uppercase tracking-wide text-dark shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary focus:shadow-lg focus:shadow-primary/10 focus:ring-2 focus:ring-primary/10 sm:rounded-2xl sm:pl-12 sm:pr-4 sm:py-4 sm:text-base"
              />
            </div>
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isLoading}
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/90 px-6 py-3 font-display text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-slate-300 disabled:shadow-none sm:w-auto sm:rounded-2xl sm:px-8 sm:py-4 sm:text-sm"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {isLoading ? (
                <>
                  <i className="fa fa-spinner fa-spin relative z-10" aria-hidden="true" />
                  <span className="relative z-10">Verifying...</span>
                </>
              ) : (
                <>
                  <i className="fa fa-search relative z-10" aria-hidden="true" />
                  <span className="relative z-10">Verify</span>
                </>
              )}
            </button>
          </div>
        </label>

        {error ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-red-200/80 bg-gradient-to-br from-red-50 to-red-100/50 px-4 py-4 shadow-lg ring-2 ring-red-100 sm:rounded-2xl sm:px-6 sm:py-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 rounded-full bg-red-500/10 p-1.5 sm:p-2">
                <i className="fa fa-circle-xmark text-lg text-red-600 sm:text-xl" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-red-800 sm:text-base">Certificate not found</p>
                <p className="mt-1 text-xs leading-relaxed text-red-700 sm:text-sm break-words">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-4 text-white shadow-2xl ring-4 ring-emerald-200/30 sm:rounded-3xl sm:p-6 md:p-10">
            <div className="relative flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start">
              <div className="flex-1 space-y-4 sm:space-y-5">
                <div
                  className={`transform transition-all duration-700 ease-out ${
                    visibleItems.badge
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-8 opacity-0'
                  }`}
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider shadow-xl ring-2 ring-white/50 sm:gap-2.5 sm:px-5 sm:py-2.5">
                    <i className="fa fa-circle-check text-xs text-emerald-600 sm:text-sm" aria-hidden="true" /> 
                    <span className="text-dark">Verified Certificate</span>
                  </div>
                </div>
                <h3
                  className={`transform text-center font-heading text-2xl font-bold leading-tight tracking-tight text-dark transition-all duration-700 ease-out sm:text-3xl md:text-4xl lg:text-5xl ${
                    visibleItems.name
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-8 opacity-0'
                  }`}
                >
                  {result.name}
                </h3>
                <div className="grid gap-3 text-xs sm:gap-4 sm:text-sm md:grid-cols-2 md:gap-5">
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[0]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-hashtag text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Certificate Number
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark break-all sm:text-base md:text-lg">{result.certificate_no}</p>
                  </div>
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[1]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-envelope text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Email
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark break-all sm:text-base md:text-lg">{result.email || '—'}</p>
                  </div>
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[2]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-laptop text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Mode
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark sm:text-base md:text-lg">{result.mode || '—'}</p>
                  </div>
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[3]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-map-marker-alt text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Location / Institution
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark break-words sm:text-base md:text-lg">
                      {result.location_or_institution || '—'}
                    </p>
                  </div>
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[4]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-calendar-alt text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Date Issued
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark sm:text-base md:text-lg">{result.date_issued}</p>
                  </div>
                  <div
                    className={`transform rounded-xl bg-white/90 p-3 backdrop-blur-md shadow-lg ring-1 ring-white/50 transition-all duration-700 ease-out hover:bg-white sm:rounded-2xl sm:p-4 md:p-5 ${
                      visibleItems.details[5]
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      <i className="fa fa-user-tie text-xs text-slate-600 sm:text-sm" aria-hidden="true" />
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-700 sm:text-xs">
                        Issued By
                      </span>
                    </div>
                    <p className="font-display text-sm font-semibold text-dark break-words sm:text-base md:text-lg">{result.issued_by || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VerifyCertificate;
