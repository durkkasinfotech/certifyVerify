import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../utils/excelParser';
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

const UploadExcel = ({ onUploadComplete }) => {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  const totalRows = rows.length;
  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

  const downloadSampleExcel = () => {
    // Column order: S.No, Roll No, Name, Email, Dep, Year, Course Name, Ins, Location, Phone Number, Certificate Number, Mode, Issued By, Date Issued, QR_URL
    const headers = ['S.No', 'Roll No', 'Name', 'Email', 'Dep', 'Year', 'Course Name', 'Ins', 'Location', 'Phone Number', 'Certificate Number', 'Mode', 'Issued By', 'Date Issued', 'QR_URL'];

    // Sample data rows - 3rd row has empty name to test validation
    const sampleData = [
      headers,
      [1, 'DC2025001', 'Rajesh Kumar', 'rajesh.kumar@example.com', 'B.B.A', '2025-2028', 'AI-Powered Logistics Practitioner - Foundation Level', 'Dare Centre Institute of Excellence', 'Chennai, Tamil Nadu', '9876543210', '', 'Online', 'Dr. Suresh Babu', '2025-01-15', ''],
      [2, 'DC2025002', 'Priya Sharma', 'priya.sharma@example.com', 'B.Com', '2025-2028', 'AI-Powered Logistics Practitioner - Foundation Level', 'Dare Centre Institute of Excellence', 'Coimbatore, Tamil Nadu', '9876543211', '', 'Offline', 'Dr. Suresh Babu', '2025-01-15', ''],
      [3, 'DC2025003', '', 'arun.prakash@example.com', 'B.B.A', '2025-2028', 'AI-Powered Logistics Practitioner - Foundation Level', 'Dare Centre Institute of Excellence', 'Madurai, Tamil Nadu', '9876543212', '', 'Online', 'Dr. Suresh Babu', '2025-01-20', ''],
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 12 }, // Roll No
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 12 }, // Dep
      { wch: 12 }, // Year
      { wch: 50 }, // Course Name
      { wch: 40 }, // Ins
      { wch: 40 }, // Location
      { wch: 15 }, // Phone Number
      { wch: 25 }, // Certificate Number
      { wch: 12 }, // Mode
      { wch: 15 }, // Issued By
      { wch: 15 }, // Date Issued
      { wch: 50 }, // QR_URL
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');

    // Generate Excel file and download
    XLSX.writeFile(wb, 'certificate_sample.xlsx');
  };

  const parsedSummary = useMemo(() => {
    if (!totalRows) {
      return null;
    }

    const modes = rows.reduce(
      (acc, row) => {
        const value = `${row.mode ?? ''}`.toLowerCase();
        const key = value.includes('offline') ? 'offline' : 'online';
        acc[key] += 1;
        return acc;
      },
      { online: 0, offline: 0 }
    );

    return {
      total: totalRows,
      online: modes.online,
      offline: modes.offline,
    };
  }, [rows, totalRows]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccessMessage('');
    setIsParsing(true);

    try {
      const parsed = await parseExcelFile(file);
      setRows(parsed);
    } catch (err) {
      setRows([]);
      setError(err.message ?? 'Unable to read the selected file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleClearFile = () => {
    setFileName('');
    setRows([]);
    setError('');
    setSuccessMessage('');
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!rows.length) return;
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Please set the environment variables and reload.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validate all required fields before processing
      const requiredFields = [
        { key: 'name', label: 'Name' },
        { key: 'roll_no', label: 'Roll No' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'department', label: 'Department (Dep)' },
        { key: 'academic_year', label: 'Academic Year (Year)' },
        { key: 'location_or_institution', label: 'Institution (Ins)' },
        { key: 'location', label: 'Location' },
        { key: 'mode', label: 'Mode' },
        { key: 'issued_by', label: 'Issued By' },
        { key: 'date_issued_raw', label: 'Date Issued' },
      ];

      // Check each row for empty required fields
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;

        // Check each required field
        for (const field of requiredFields) {
          const value = row[field.key];
          const isEmpty = !value || `${value}`.trim() === '';

          if (isEmpty) {
            throw new Error(
              `Row ${rowNumber}: "${field.label}" is required and cannot be empty. ` +
              `Please fill all required fields in the Excel file.`
            );
          }
        }

        // Validate date format
        const issuedDate = normalizeDate(row.date_issued_raw);
        if (!issuedDate) {
          throw new Error(
            `Row ${rowNumber}: Invalid date format for "Date Issued". ` +
            `Please ensure the date is in a valid format (e.g., DD/MM/YYYY or YYYY-MM-DD).`
          );
        }

        // Validate email format
        if (row.email && !row.email.includes('@')) {
          throw new Error(
            `Row ${rowNumber}: Invalid email format. Email must contain "@" symbol.`
          );
        }

        // Validate phone number (10 digits)
        if (row.phone) {
          const phoneDigits = row.phone.replace(/\D/g, '');
          if (phoneDigits.length !== 10) {
            throw new Error(
              `Row ${rowNumber}: Phone number must be exactly 10 digits.`
            );
          }
        }
      }

      // Determine status based on user role
      const userRole = await getUserRole();
      const status = userRole === 'super_admin' ? 'approved' : 'pending_approval';

      const cache = new Map();
      const payload = [];

      for (const row of rows) {
        const issuedDate = normalizeDate(row.date_issued_raw);
        if (!issuedDate) {
          throw new Error(
            `Unable to parse the issued date for ${row.name || 'one of the rows'}. ` +
            'Please ensure the "date_issued" column contains valid dates.'
          );
        }

        // CONSTANT: Year segment is always '25-26' for certificate numbers
        const yearSegment = '25-26';

        let certificateNo =
          `${row.certificate_no_raw ?? ''}`.trim().replace(/\s+/g, '').toUpperCase() || '';

        if (!certificateNo) {
          // Auto-generate from highest existing certificate number globally
          // For bulk upload, we need to track sequence to avoid duplicates within the same upload
          if (!cache.has(yearSegment)) {
            const nextSeq = await getNextSequence({ yearSegment, useGlobal: true });
            cache.set(yearSegment, nextSeq);
          }

          let nextSequence = cache.get(yearSegment);
          let candidateCertNo = makeCertificateNumber(nextSequence);
          
          // Check for duplicates and keep incrementing until we find a unique number
          let exists = await certificateNumberExists(candidateCertNo);
          let attempts = 0;
          
          while (exists && attempts < 100) {
            nextSequence++;
            candidateCertNo = makeCertificateNumber(nextSequence);
            exists = await certificateNumberExists(candidateCertNo);
            attempts++;
          }
          
          if (exists) {
            throw new Error(`Unable to generate unique certificate number for row ${index + 1}. Too many duplicates found.`);
          }
          
          certificateNo = candidateCertNo;
          cache.set(yearSegment, nextSequence + 1);
        } else {
          // If certificate number is provided, verify it's unique
          const exists = await certificateNumberExists(certificateNo);
          if (exists) {
            throw new Error(`Certificate number ${certificateNo} already exists (row ${index + 1}). Please use a unique certificate number.`);
          }
        }

        const toNullIfEmpty = (input) => {
          if (input === null || typeof input === 'undefined') return null;
          const trimmed = `${input}`.trim();
          return trimmed.length ? trimmed : null;
        };

        payload.push({
          sno: row.sno ?? null,
          roll_no: `${row.roll_no}`.trim(),
          name: `${row.name}`.trim(),
          department: `${row.department}`.trim(),
          academic_year: `${row.academic_year}`.trim() || null,
          course_name: toNullIfEmpty(row.course_name) || 'AI-Powered Logistics Practitioner - Foundation Level',
          location_or_institution: `${row.location_or_institution}`.trim(),
          location: `${row.location}`.trim(),
          phone: `${row.phone}`.trim(),
          certificate_no: certificateNo,
          mode: `${row.mode}`.trim(),
          issued_by: `${row.issued_by}`.trim(),
          email: `${row.email}`.trim().toLowerCase(),
          date_issued: formatDateForDb(issuedDate),
          qr_code_url: row.qr_code_url || buildQrCodeUrl(certificateNo),
          status: status,
          // created_at will use database default: timezone('utc', now())
        });
      }

      const { data, error: insertError } = await supabase
        .from('certificates')
        .insert(payload)
        .select();

      if (insertError) {
        throw insertError;
      }

      onUploadComplete?.(data ?? []);
      setRows([]);
      setFileName('');
      setSuccessMessage('Certificate records uploaded successfully.');
    } catch (err) {
      const message =
        err?.message ?? 'An unexpected error occurred while uploading certificates.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-xl bg-white/90 p-4 shadow-soft sm:rounded-2xl sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
            Upload Excel
          </p>
          <h2 className="mt-1 font-heading text-xl text-dark sm:text-2xl md:text-[28px]">Bulk Certificate Import</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={downloadSampleExcel}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 sm:gap-3 sm:px-5 sm:py-3 sm:text-sm"
          >
            <i className="fa fa-download" aria-hidden="true" />
            <span>Download Sample Excel File</span>
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 sm:gap-3 sm:px-5 sm:py-3 sm:text-sm">
            <i className="fa fa-file-upload" aria-hidden="true" />
            <span>Select File</span>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </header>

      {fileName ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary">
          <div className="flex items-center gap-2">
            <i className="fa fa-file-excel" aria-hidden="true" />
            <span className="truncate">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="ml-2 flex-shrink-0 rounded-full p-1.5 text-primary transition hover:bg-primary/20"
            aria-label="Remove file"
          >
            <i className="fa fa-times text-sm" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {isParsing ? (
        <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
          <i className="fa fa-spinner fa-spin" aria-hidden="true" />
          Reading file, please wait...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <i className="fa fa-circle-check mr-2" aria-hidden="true" />
          {successMessage}
        </div>
      ) : null}

      {parsedSummary ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-700 sm:mt-6 sm:gap-4 sm:p-4 sm:text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Rows</p>
            <p className="mt-1 text-2xl font-semibold text-dark">{parsedSummary.total}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Online</p>
            <p className="mt-1 text-2xl font-semibold text-dark">{parsedSummary.online}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Offline</p>
            <p className="mt-1 text-2xl font-semibold text-dark">{parsedSummary.offline}</p>
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <div className="mt-4 max-h-[26rem] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 sm:mt-6">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-primary text-left text-[10px] uppercase tracking-wide text-white sm:text-xs">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">S.No</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Name</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Roll No</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Mode</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Date Issued</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Certificate #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/80">
              {rows.map((row) => {
                const issuedDate = normalizeDate(row.date_issued_raw);
                const issuedText = issuedDate
                  ? issuedDate.toLocaleDateString()
                  : row.date_issued_raw;
                return (
                  <tr key={`${row.roll_no}-${row.sno}`}>
                    <td className="px-2 py-2 font-medium text-slate-600 sm:px-4 sm:py-3">{row.sno}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <p className="font-semibold text-dark text-xs sm:text-sm">{row.name}</p>
                      <p className="text-[10px] text-slate-500 sm:text-xs">{row.email}</p>
                    </td>
                    <td className="px-2 py-2 text-slate-600 sm:px-4 sm:py-3 whitespace-nowrap">{row.roll_no}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary sm:gap-2 sm:px-3 sm:py-1 sm:text-xs">
                        <i className="fa fa-graduation-cap text-[8px] sm:text-[10px]" aria-hidden="true" />
                        {row.mode || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">{issuedText}</td>
                    <td className="px-2 py-2 text-slate-600 sm:px-4 sm:py-3">
                      {row.certificate_no_raw ? (
                        <span className="font-mono text-xs font-semibold text-dark break-all">{row.certificate_no_raw}</span>
                      ) : (
                        <span className="text-[10px] uppercase text-amber-600 sm:text-xs">Auto-generate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:mt-6 sm:flex-row sm:items-center">
        <p className="text-[10px] text-slate-500 sm:text-xs">
          Ensure the Excel headers exactly match the required schema. Leave <code>certificate_no</code>{' '}
          blank to auto-generate values.
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!rows.length || isUploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
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
    </section>
  );
};

export default UploadExcel;
