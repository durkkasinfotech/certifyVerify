import { useEffect, useMemo, useState } from 'react';
import {
  buildQrCodeUrl,
  certificateNumberExists,
  formatDateForDb,
  getAcademicYearSegment,
  getNextSequence,
  makeCertificateNumber,
  normalizeAcademicYearSegment,
  normalizeDate,
} from '../utils/certificateHelpers';
import { supabase } from '../utils/supabaseClient';
import { getUserRole } from '../utils/authHelpers';

const ManualEntry = ({ onUploadComplete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [entry, setEntry] = useState({
    sno: '',
    roll_no: '',
    name: '',
    department: '',
    academic_year: '',
    course_name: 'AI-Powered Logistics Practitioner - Foundation Level',
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
  const [isGeneratingCertNo, setIsGeneratingCertNo] = useState(false);

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

  // Auto-generate certificate number when date_issued or academic_year is filled
  useEffect(() => {
    const generateCertificateNumber = async () => {
      // Only generate if certificate_no is empty and we have required fields
      if (entry.certificate_no?.trim()) {
        return; // Don't regenerate if already set
      }

      // Need either date_issued or academic_year to generate
      const hasDate = entry.date_issued?.trim();
      const hasAcademicYear = entry.academic_year?.trim();

      if (!hasDate && !hasAcademicYear) {
        return; // Not enough info to generate
      }

      if (!supabaseConfigured) {
        return;
      }

      setIsGeneratingCertNo(true);
      try {
        // CONSTANT: Year segment is always '25-26' for certificate numbers
        const yearSegment = '25-26';
        
        // Auto-generate from highest existing certificate number globally
        // getNextSequence already checks for uniqueness, so this will be unique
        const nextSeq = await getNextSequence({ yearSegment, useGlobal: true });
        const certificateNo = makeCertificateNumber(nextSeq);
        setEntry((prev) => ({ ...prev, certificate_no: certificateNo }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error auto-generating certificate number:', error);
        // Don't show error to user, just silently fail
      } finally {
        setIsGeneratingCertNo(false);
      }
    };

    // Only generate when modal is open
    if (isModalOpen) {
      generateCertificateNumber();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.date_issued, entry.academic_year, isModalOpen, supabaseConfigured]);

  const resetForm = () => {
    setEntry({
      sno: '',
      roll_no: '',
      name: '',
      department: '',
      academic_year: '',
      course_name: 'AI-Powered Logistics Practitioner - Foundation Level',
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

    // Validate all required fields
    if (!entry.name?.trim()) {
      setError('Name is required.');
      return;
    }
    if (!entry.roll_no?.trim()) {
      setError('Roll No is required.');
      return;
    }
    if (!entry.email?.trim()) {
      setError('Email is required.');
      return;
    }
    if (!validateEmail(entry.email)) {
      setError('Please enter a valid email address with @ symbol (e.g., user@example.com)');
      return;
    }
    if (!entry.department?.trim()) {
      setError('Department (Dep) is required.');
      return;
    }
    if (!entry.academic_year?.trim()) {
      setError('Academic Year (Year) is required.');
      return;
    }
    if (!entry.location_or_institution?.trim()) {
      setError('Institution (Ins) is required.');
      return;
    }
    if (!entry.location?.trim()) {
      setError('Location is required.');
      return;
    }
    if (!entry.phone?.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (entry.phone.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!entry.mode?.trim()) {
      setError('Mode is required. Please select Online or Offline.');
      return;
    }
    if (!entry.issued_by?.trim()) {
      setError('Issued By is required.');
      return;
    }
    if (!entry.date_issued?.trim()) {
      setError('Date issued is required.');
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

      // CONSTANT: Year segment is always '25-26' for certificate numbers
      const yearSegment = '25-26';

      let certificateNo = entry.certificate_no?.trim().replace(/\s+/g, '').toUpperCase() || '';

      if (!certificateNo) {
        // Auto-generate from highest existing certificate number globally
        // getNextSequence already checks for uniqueness, so this will be unique
        const nextSeq = await getNextSequence({ yearSegment, useGlobal: true });
        certificateNo = makeCertificateNumber(nextSeq);
      } else {
        // If certificate number is manually provided, verify it's unique
        const exists = await certificateNumberExists(certificateNo);
        if (exists) {
          throw new Error(`Certificate number ${certificateNo} already exists. Please use a unique certificate number.`);
        }
      }

      const toNullIfEmpty = (input) => {
        if (input === null || typeof input === 'undefined') return null;
        const trimmed = `${input}`.trim();
        return trimmed.length ? trimmed : null;
      };

      // Determine status based on user role
      // IMPORTANT: Normal admin entries MUST go to 'pending_approval' for Super Admin approval
      const userRole = await getUserRole();
      // eslint-disable-next-line no-console
      console.log('ManualEntry - User role detected:', userRole);
      
      // Force status to 'pending_approval' for all entries created through Admin dashboard
      // Only Super Admin entries (created through Super Admin dashboard) should be 'approved'
      // Since this is ManualEntry component used in Admin dashboard, always set to 'pending_approval'
      const status = userRole === 'super_admin' ? 'approved' : 'pending_approval';
      
      // eslint-disable-next-line no-console
      console.log('ManualEntry - Setting status to:', status, '(userRole:', userRole, ')');

      const payload = {
        sno: entry.sno ? Number.parseInt(entry.sno, 10) : null,
        roll_no: entry.roll_no.trim(),
        name: entry.name.trim(),
        department: entry.department.trim(),
        academic_year: entry.academic_year.trim() || academicYear,
        course_name: entry.course_name.trim() || 'AI-Powered Logistics Practitioner - Foundation Level',
        location_or_institution: entry.location_or_institution.trim(),
        location: entry.location.trim(),
        phone: entry.phone.trim(),
        certificate_no: certificateNo,
        mode: entry.mode.trim(),
        issued_by: entry.issued_by.trim(),
        email: entry.email.trim().toLowerCase(),
        date_issued: formatDateForDb(issuedDate),
        qr_code_url: buildQrCodeUrl(certificateNo),
        status: status, // Explicitly set status: 'pending_approval' for admin, 'approved' for super_admin
      };

      // Debug logging
      // eslint-disable-next-line no-console
      console.log('ManualEntry - Inserting payload with status:', status, 'Full payload:', payload);

      const { data, error: insertError } = await supabase
        .from('certificates')
        .insert([payload])
        .select();
      
      // Debug logging
      if (insertError) {
        // eslint-disable-next-line no-console
        console.error('ManualEntry - Insert error:', insertError);
      } else {
        // eslint-disable-next-line no-console
        console.log('ManualEntry - Insert successful, returned data:', data);
      }

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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Serial number (optional)"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 2. Roll No */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Roll No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.roll_no}
                      onChange={(e) => handleInputChange('roll_no', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter roll number"
                      required
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter full name"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 4. Email */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={entry.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                      className={`w-full rounded-lg border bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${emailError
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      placeholder="Enter email with @ symbol"
                      required
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
                      Dep (Department) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., B.B.A"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 5. Year (Academic Year) */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Year (Academic Year) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.academic_year}
                      onChange={(e) => handleInputChange('academic_year', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., 2025-2028"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* Course Name */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Course Name
                    </label>
                    <input
                      type="text"
                      value={entry.course_name}
                      onChange={(e) => handleInputChange('course_name', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., AI-Powered Logistics Practitioner - Foundation Level"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 6. Ins (Institution) */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Ins (Institution) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.location_or_institution}
                      onChange={(e) => handleInputChange('location_or_institution', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter institution name"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 7. Location */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter location address"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 8. Phone Number */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter 10 digit phone number"
                      required
                      disabled={isUploading}
                    />
                  </div>

                  {/* 9. Certificate Number */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Certificate Number
                      {isGeneratingCertNo && (
                        <span className="ml-2 text-xs text-slate-500">
                          <i className="fa fa-spinner fa-spin" aria-hidden="true" /> Generating...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={entry.certificate_no || ''}
                      onChange={(e) => {
                        // Allow manual entry/paste, but normalize it
                        const value = e.target.value.trim().toUpperCase().replace(/\s+/g, '');
                        handleInputChange('certificate_no', value);
                      }}
                      onPaste={(e) => {
                        // Handle paste event - normalize the pasted value
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const normalized = pasted.trim().toUpperCase().replace(/\s+/g, '');
                        handleInputChange('certificate_no', normalized);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder={isGeneratingCertNo ? 'Generating certificate number...' : 'Auto-generated when date is filled (or paste/enter manually)'}
                      disabled={isUploading}
                    />
                    {entry.certificate_no && (
                      <p className="mt-1 text-[10px] sm:text-xs text-slate-500">
                        <i className="fa fa-info-circle mr-1" aria-hidden="true" />
                        {entry.certificate_no.match(/^DARE\/AIR\/LP\/\d{2}-\d{2}\/\d{3,}$/) 
                          ? 'Valid format. Will check for duplicates before saving.'
                          : 'Auto-generated from highest existing certificate number'}
                      </p>
                    )}
                  </div>

                  {/* 10. Mode */}
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                      Mode <span className="text-red-500">*</span>
                    </label>
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
                      Issued By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={entry.issued_by}
                      onChange={(e) => handleInputChange('issued_by', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter issuer name"
                      required
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    All fields marked with <span className="text-red-500">*</span> are required.
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
                      disabled={
                        isUploading ||
                        !entry.name?.trim() ||
                        !entry.roll_no?.trim() ||
                        !entry.email?.trim() ||
                        !entry.department?.trim() ||
                        !entry.academic_year?.trim() ||
                        !entry.location_or_institution?.trim() ||
                        !entry.location?.trim() ||
                        !entry.phone?.trim() ||
                        entry.phone.replace(/\D/g, '').length !== 10 ||
                        !entry.mode?.trim() ||
                        !entry.issued_by?.trim() ||
                        !entry.date_issued?.trim() ||
                        !!emailError
                      }
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
                          <span>Send to Approval</span>
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
