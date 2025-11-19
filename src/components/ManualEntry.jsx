import { useEffect, useMemo, useState } from 'react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [entry, setEntry] = useState({
    sno: '',
    roll_no: '',
    name: '',
    department: '',
    academic_year: '',
    location_or_institution: '',
    location: '',
    phone: '',
    certificate_no: '',
    mode: '',
    issued_by: '',
    email: '',
    date_issued: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const resetForm = () => {
    setEntry({
      sno: '',
      roll_no: '',
      name: '',
      department: '',
      academic_year: '',
      location_or_institution: '',
      location: '',
      phone: '',
      certificate_no: '',
      mode: '',
      issued_by: '',
      email: '',
      date_issued: '',
    });
    setError('');
    setSuccessMessage('');
    setEmailError('');
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') return true; // Empty email is valid (optional field)
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (field, value) => {
    setEntry({ ...entry, [field]: value });
    setError('');
    setSuccessMessage('');
    
    // Validate email in real-time
    if (field === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Please enter a valid email address with @ symbol (e.g., user@example.com)');
      } else {
        setEmailError('');
      }
    }
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
    setShowAddAnother(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowAddAnother(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Please set the environment variables and reload.');
      return;
    }

    // Validate required fields
    if (!entry.name?.trim()) {
      setError('Name is required.');
      return;
    }
    if (!entry.date_issued?.trim()) {
      setError('Date issued is required.');
      return;
    }
    // Validate email if provided
    if (entry.email?.trim() && !validateEmail(entry.email)) {
      setError('Please enter a valid email address with @ symbol (e.g., user@example.com)');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const issuedDate = normalizeDate(entry.date_issued);
      if (!issuedDate) {
        throw new Error(
          `Unable to parse the issued date. ` +
            'Please enter a valid date (e.g., DD/MM/YYYY or YYYY-MM-DD).'
        );
      }

      // Use provided academic_year or calculate from date
      const academicYear = entry.academic_year?.trim() || getAcademicYearSegment(issuedDate);

      let certificateNo = entry.certificate_no?.trim().replace(/\s+/g, '').toUpperCase() || '';

      if (!certificateNo) {
        const nextSeq = await getNextSequence({ yearSegment: academicYear });
        certificateNo = makeCertificateNumber(nextSeq, academicYear);
      }

      const toNullIfEmpty = (input) => {
        if (input === null || typeof input === 'undefined') return null;
        const trimmed = `${input}`.trim();
        return trimmed.length ? trimmed : null;
      };

      const payload = {
        sno: entry.sno ? Number.parseInt(entry.sno, 10) : null,
        roll_no: toNullIfEmpty(entry.roll_no),
        name: entry.name.trim(),
        department: toNullIfEmpty(entry.department),
        academic_year: toNullIfEmpty(entry.academic_year) || academicYear,
        location_or_institution: toNullIfEmpty(entry.location_or_institution),
        location: toNullIfEmpty(entry.location),
        phone: toNullIfEmpty(entry.phone),
        certificate_no: certificateNo,
        mode: toNullIfEmpty(entry.mode),
        issued_by: toNullIfEmpty(entry.issued_by),
        email: toNullIfEmpty(entry.email),
        date_issued: formatDateForDb(issuedDate),
        qr_code_url: buildQrCodeUrl(certificateNo),
      };

      const { data, error: insertError } = await supabase
        .from('certificates')
        .insert([payload])
        .select();

      if (insertError) {
        throw insertError;
      }

      onUploadComplete?.();
      setSuccessMessage('Certificate record uploaded successfully!');
      setIsUploading(false);
      
      // Show "Add Another" confirmation after a brief delay
      setTimeout(() => {
        setShowAddAnother(true);
      }, 500);
    } catch (err) {
      const message =
        err?.message ?? 'An unexpected error occurred while uploading certificate.';
      setError(message);
      setIsUploading(false);
    }
  };

  const handleAddAnother = () => {
    resetForm();
    setShowAddAnother(false);
  };

  return (
    <>
      <section className="rounded-xl bg-white/90 p-4 shadow-soft sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-3 items-start justify-between sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
              Manual Entry
            </p>
            <h2 className="mt-1 font-heading text-xl text-dark sm:text-2xl md:text-[28px]">
              Add Certificate Manually
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:mt-2 sm:text-sm">
              Enter certificate details manually one entry at a time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 shadow-md hover:shadow-lg"
          >
            <i className="fa fa-plus text-xs sm:text-sm" aria-hidden="true" />
            <span>Add Entry</span>
          </button>
        </div>
      </section>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-heading text-lg sm:text-xl md:text-2xl text-dark truncate">Enter the details</h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Fill in the certificate information below
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                disabled={isUploading}
                aria-label="Close modal"
              >
                <i className="fa fa-times text-lg sm:text-xl" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-4 md:p-6">
              {error ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-600">
                  <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
                  {error}
                </div>
              ) : null}

              {successMessage && !showAddAnother ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-emerald-700">
                  <i className="fa fa-circle-check mr-2" aria-hidden="true" />
                  {successMessage}
                </div>
              ) : null}

              {showAddAnother ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-6 sm:px-6 sm:py-8 text-center">
                  <i className="fa fa-circle-check text-3xl sm:text-4xl text-primary mb-3 sm:mb-4" aria-hidden="true" />
                  <h4 className="font-heading text-lg sm:text-xl font-semibold text-dark mb-2">
                    Certificate Added Successfully!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6">
                    Would you like to add another certificate?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleAddAnother}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90"
                    >
                      <i className="fa fa-plus" aria-hidden="true" />
                      <span>Add Another</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-200 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-300"
                    >
                      <i className="fa fa-check" aria-hidden="true" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-5 md:grid-cols-2">
                  {/* 1. S.No */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">S.No</label>
                    <input
                      type="number"
                      value={entry.sno}
                      onChange={(e) => handleInputChange('sno', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Serial number (optional)"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 2. Roll No */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Roll No
                    </label>
                    <input
                      type="text"
                      value={entry.roll_no}
                      onChange={(e) => handleInputChange('roll_no', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter roll number"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 3. Name */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter full name"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 4. Email */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={entry.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                      className={`w-full rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                        emailError
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                      }`}
                      placeholder="Enter email with @ symbol"
                      disabled={isUploading}
                    />
                    {emailError && (
                      <p className="mt-1 text-[10px] sm:text-xs text-red-600">
                        <i className="fa fa-exclamation-circle mr-1" aria-hidden="true" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* 5. Dep (Department) */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Dep (Department)
                    </label>
                    <input
                      type="text"
                      value={entry.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., B.B.A"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 5. Year (Academic Year) */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Year (Academic Year)
                    </label>
                    <input
                      type="text"
                      value={entry.academic_year}
                      onChange={(e) => handleInputChange('academic_year', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., 2025-2028"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 6. Ins (Institution) */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Ins (Institution)
                    </label>
                    <input
                      type="text"
                      value={entry.location_or_institution}
                      onChange={(e) => handleInputChange('location_or_institution', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter institution name"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 7. Location */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Location
                    </label>
                    <input
                      type="text"
                      value={entry.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter location address"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 8. Phone Number */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      value={entry.phone}
                      onChange={(e) => {
                        // Only allow numbers and limit to 10 digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        handleInputChange('phone', value);
                      }}
                      pattern="[0-9]{10}"
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter 10 digit phone number"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 9. Certificate Number */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Certificate Number
                    </label>
                    <input
                      type="text"
                      value={entry.certificate_no}
                      disabled
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                      placeholder="Auto-generated (cannot be modified)"
                    />
                  </div>

                  {/* 10. Mode */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Mode</label>
                    <div className="flex gap-3 sm:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="Online"
                          checked={entry.mode === 'Online'}
                          onChange={(e) => handleInputChange('mode', e.target.value)}
                          disabled={isUploading}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-xs sm:text-sm text-slate-700">Online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="Offline"
                          checked={entry.mode === 'Offline'}
                          onChange={(e) => handleInputChange('mode', e.target.value)}
                          disabled={isUploading}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-xs sm:text-sm text-slate-700">Offline</span>
                      </label>
                    </div>
                  </div>

                  {/* 11. Issued By */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Issued By
                    </label>
                    <input
                      type="text"
                      value={entry.issued_by}
                      onChange={(e) => handleInputChange('issued_by', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter issuer name"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Date Issued - Required for processing */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Date Issued <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={(() => {
                        // Convert date to YYYY-MM-DD format for date input
                        if (!entry.date_issued) return '';
                        const date = normalizeDate(entry.date_issued);
                        if (date) {
                          return formatDateForDb(date);
                        }
                        // If already in YYYY-MM-DD format, return as is
                        if (entry.date_issued.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          return entry.date_issued;
                        }
                        return '';
                      })()}
                      onChange={(e) => handleInputChange('date_issued', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              {!showAddAnother && (
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-4 sm:pt-6">
                  <p className="text-[10px] sm:text-xs text-slate-500 text-center sm:text-left">
                    Fields marked with <span className="text-red-500">*</span> are required.
                    Certificate number will be auto-generated.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={isUploading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <i className="fa fa-times" aria-hidden="true" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isUploading || !entry.name?.trim() || !entry.date_issued?.trim() || !!emailError}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isUploading ? (
                        <>
                          <i className="fa fa-spinner fa-spin" aria-hidden="true" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa fa-cloud-upload-alt" aria-hidden="true" />
                          <span>Save Certificate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualEntry;
