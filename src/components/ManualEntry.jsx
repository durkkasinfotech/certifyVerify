import { useMemo, useState } from 'react';
import {
  buildQrCodeUrl,
  formatDateForDb,
  getAcademicYearSegment,
  getNextSequence,
  makeCertificateNumber,
  normalizeDate,
} from '../utils/certificateHelpers';
import { supabase } from '../utils/supabaseClient';

const ManualEntry = ({ onUploadComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [entries, setEntries] = useState([
    {
      sno: '',
      roll_no: '',
      name: '',
      phone: '',
      email: '',
      date_issued: '',
      issued_by: '',
      mode: '',
      location_or_institution: '',
      certificate_no: '',
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

  const handleInputChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
    setError('');
    setSuccessMessage('');
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setEntries([
      {
        sno: '',
        roll_no: '',
        name: '',
        phone: '',
        email: '',
        date_issued: '',
        issued_by: '',
        mode: '',
        location_or_institution: '',
        certificate_no: '',
      },
    ]);
    setError('');
    setSuccessMessage('');
  };

  const addEntry = () => {
    if (entries.length >= 2) return;
    setEntries([
      ...entries,
      {
        sno: '',
        roll_no: '',
        name: '',
        phone: '',
        email: '',
        date_issued: '',
        issued_by: '',
        mode: '',
        location_or_institution: '',
        certificate_no: '',
      },
    ]);
  };

  const removeEntry = (index) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Please set the environment variables and reload.');
      return;
    }

    // Validate required fields
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.name?.trim()) {
        setError(`Entry ${i + 1}: Name is required.`);
        return;
      }
      if (!entry.date_issued?.trim()) {
        setError(`Entry ${i + 1}: Date issued is required.`);
        return;
      }
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const cache = new Map();
      const payload = [];

      for (const entry of entries) {
        const issuedDate = normalizeDate(entry.date_issued);
        if (!issuedDate) {
          throw new Error(
            `Unable to parse the issued date for ${entry.name || 'one of the entries'}. ` +
              'Please enter a valid date (e.g., DD/MM/YYYY or YYYY-MM-DD).'
          );
        }

        const academicYear = getAcademicYearSegment(issuedDate);

        let certificateNo = entry.certificate_no?.trim().replace(/\s+/g, '').toUpperCase() || '';

        if (!certificateNo) {
          if (!cache.has(academicYear)) {
            const nextSeq = await getNextSequence({ yearSegment: academicYear });
            cache.set(academicYear, nextSeq);
          }

          const nextSequence = cache.get(academicYear);
          certificateNo = makeCertificateNumber(nextSequence, academicYear);
          cache.set(academicYear, nextSequence + 1);
        }

        const toNullIfEmpty = (input) => {
          if (input === null || typeof input === 'undefined') return null;
          const trimmed = `${input}`.trim();
          return trimmed.length ? trimmed : null;
        };

        payload.push({
          sno: entry.sno ? Number.parseInt(entry.sno, 10) : null,
          roll_no: toNullIfEmpty(entry.roll_no),
          name: entry.name.trim(),
          phone: toNullIfEmpty(entry.phone),
          email: toNullIfEmpty(entry.email),
          date_issued: formatDateForDb(issuedDate),
          issued_by: toNullIfEmpty(entry.issued_by),
          mode: toNullIfEmpty(entry.mode),
          location_or_institution: toNullIfEmpty(entry.location_or_institution),
          certificate_no: certificateNo,
          qr_code_url: buildQrCodeUrl(certificateNo),
        });
      }

      const { data, error: insertError } = await supabase
        .from('certificates')
        .insert(payload)
        .select();

      if (insertError) {
        throw insertError;
      }

      onUploadComplete?.();
      setEntries([
        {
          sno: '',
          roll_no: '',
          name: '',
          phone: '',
          email: '',
          date_issued: '',
          issued_by: '',
          mode: '',
          location_or_institution: '',
          certificate_no: '',
        },
      ]);
      setSuccessMessage(
        `${entries.length} certificate record${entries.length > 1 ? 's' : ''} uploaded successfully.`
      );
      // Collapse after successful upload
      setTimeout(() => {
        setIsExpanded(false);
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      const message =
        err?.message ?? 'An unexpected error occurred while uploading certificates.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white/90 p-6 shadow-soft">
      {!isExpanded ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
              Manual Entry
            </p>
            <h2 className="mt-1 font-heading text-[28px] text-dark">Add Certificate Manually</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Enter certificate details manually. You can add up to 2 entries at once.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExpand}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90"
          >
            <i className="fa fa-plus" aria-hidden="true" />
            <span>Add Entry</span>
          </button>
        </div>
      ) : (
        <>
          <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
                Manual Entry
              </p>
              <h2 className="mt-1 font-heading text-[28px] text-dark">Add Certificate Manually</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Enter certificate details manually. You can add up to 2 entries at once. Leave{' '}
                <code className="font-mono text-xs">certificate_no</code> blank to auto-generate.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {entries.length < 2 && (
                <button
                  type="button"
                  onClick={addEntry}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/20"
                >
                  <i className="fa fa-plus" aria-hidden="true" />
                  <span>Add Another Entry</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCollapse}
                className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-300"
              >
                <i className="fa fa-times" aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>
          </header>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <i className="fa fa-circle-check mr-2" aria-hidden="true" />
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-6">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg text-dark">
                Entry {index + 1} {entries.length > 1 && '(Required)'}
              </h3>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  <i className="fa fa-trash mr-1" aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Date Issued <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entry.date_issued}
                  onChange={(e) => handleInputChange(index, 'date_issued', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="DD/MM/YYYY or YYYY-MM-DD"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Roll No
                </label>
                <input
                  type="text"
                  value={entry.roll_no}
                  onChange={(e) => handleInputChange(index, 'roll_no', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter roll number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Certificate No
                </label>
                <input
                  type="text"
                  value={entry.certificate_no}
                  onChange={(e) => handleInputChange(index, 'certificate_no', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={entry.email}
                  onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={entry.phone}
                  onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Mode</label>
                <input
                  type="text"
                  value={entry.mode}
                  onChange={(e) => handleInputChange(index, 'mode', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Online, Offline"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Issued By
                </label>
                <input
                  type="text"
                  value={entry.issued_by}
                  onChange={(e) => handleInputChange(index, 'issued_by', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter issuer name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Location / Institution
                </label>
                <input
                  type="text"
                  value={entry.location_or_institution}
                  onChange={(e) =>
                    handleInputChange(index, 'location_or_institution', e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter location or institution"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">S.No</label>
                <input
                  type="number"
                  value={entry.sno}
                  onChange={(e) => handleInputChange(index, 'sno', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Serial number (optional)"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Fields marked with <span className="text-red-500">*</span> are required. Certificate
          number will be auto-generated if left blank.
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !entries.some((e) => e.name?.trim() && e.date_issued?.trim())}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUploading ? (
            <>
              <i className="fa fa-spinner fa-spin" aria-hidden="true" />
              Uploading...
            </>
          ) : (
            <>
              <i className="fa fa-cloud-upload-alt" aria-hidden="true" />
              Save to Supabase
            </>
          )}
        </button>
      </div>
        </>
      )}
    </section>
  );
};

export default ManualEntry;

