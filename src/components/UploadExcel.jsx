import { useMemo, useState } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import {
  buildQrCodeUrl,
  formatDateForDb,
  getAcademicYearSegment,
  getNextSequence,
  makeCertificateNumber,
  normalizeDate,
} from '../utils/certificateHelpers';
import { supabase } from '../utils/supabaseClient';

const UploadExcel = ({ onUploadComplete }) => {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const totalRows = rows.length;
  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

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

        const academicYear = getAcademicYearSegment(issuedDate);

        let certificateNo =
          `${row.certificate_no_raw ?? ''}`.trim().replace(/\s+/g, '').toUpperCase() || '';

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
          sno: row.sno ?? null,
          roll_no: toNullIfEmpty(row.roll_no),
          name: `${row.name}`.trim(),
          phone: toNullIfEmpty(row.phone),
          email: toNullIfEmpty(row.email),
          date_issued: formatDateForDb(issuedDate),
          issued_by: toNullIfEmpty(row.issued_by),
          mode: toNullIfEmpty(row.mode),
          location_or_institution: toNullIfEmpty(row.location_or_institution),
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
    <section className="rounded-2xl bg-white/90 p-6 shadow-soft">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
            Upload Excel
          </p>
          <h2 className="mt-1 font-heading text-[28px] text-dark">Bulk Certificate Import</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Upload an Excel sheet with columns:{' '}
            <code className="font-mono text-xs">sno, roll_no, name, phone, email, date_issued,
            issued_by, mode, location_or_institution, certificate_no</code>.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90">
          <i className="fa fa-file-upload" aria-hidden="true" />
          <span>Select File</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        </label>
      </header>

      {fileName ? (
        <div className="mb-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary">
          <i className="fa fa-file-excel mr-2" aria-hidden="true" />
          <span>{fileName}</span>
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
        <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700 md:grid-cols-3">
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
        <div className="mt-6 max-h-[26rem] overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-primary text-left text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Date Issued</th>
                <th className="px-4 py-3">Certificate #</th>
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
                    <td className="px-4 py-3 font-medium text-slate-600">{row.sno}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-dark">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.roll_no}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                        <i className="fa fa-graduation-cap text-[10px]" aria-hidden="true" />
                        {row.mode || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{issuedText}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.certificate_no_raw || (
                        <span className="text-xs uppercase text-amber-600">Auto-generate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Ensure the Excel headers exactly match the required schema. Leave <code>certificate_no</code>{' '}
          blank to auto-generate values.
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!rows.length || isUploading}
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
    </section>
  );
};

export default UploadExcel;
