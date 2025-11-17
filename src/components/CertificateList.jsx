import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import { toExcelWorkbook } from '../utils/excelParser';

const columns = [
  { key: 'sno', label: 'S.No' },
  { key: 'certificate_no', label: 'Certificate Number' },
  { key: 'name', label: 'Name' },
  { key: 'roll_no', label: 'Roll No' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'mode', label: 'Mode' },
  { key: 'location_or_institution', label: 'Location / Institution' },
  { key: 'date_issued', label: 'Date Issued' },
  { key: 'issued_by', label: 'Issued By' },
];

const filterRecords = (records, query) => {
  if (!query) return records;
  const lower = query.toLowerCase();
  return records.filter((record) =>
    [
      record.sno ?? '',
      record.certificate_no,
      record.name,
      record.roll_no,
      record.email,
      record.phone,
      record.mode,
      record.location_or_institution,
    ]
      .filter(Boolean)
      .some((value) => `${value}`.toLowerCase().includes(lower))
  );
};

const CertificateList = ({ certificates, isLoading, onRefresh }) => {
  const [search, setSearch] = useState('');

  const filteredCertificates = useMemo(
    () => filterRecords(certificates, search),
    [certificates, search]
  );

  const getQrElementId = (certificateNo) =>
    `qr-${(certificateNo ?? '').replace(/[^a-zA-Z0-9]/g, '-')}`;

  const handleExportExcel = () => {
    if (!filteredCertificates.length) return;
    const workbook = toExcelWorkbook(filteredCertificates);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `certificate-export-${Date.now()}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!filteredCertificates.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(12);
    doc.text('Dare Centre - Certificate Report', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [columns.map((column) => column.label)],
      body: filteredCertificates.map((record) =>
        columns.map((column) => record[column.key] ?? '')
      ),
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [40, 120, 235],
        textColor: 255,
      },
    });

    doc.save(`certificate-report-${Date.now()}.pdf`);
  };

  const handleDownloadQr = (record) => {
    if (!record || !record.certificate_no) return;
    const canvas = document.getElementById(getQrElementId(record.certificate_no));
    if (!canvas) return;

    // Sanitize filename by removing invalid characters
    const sanitizeFileName = (str) => {
      if (!str) return '';
      return str.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_').trim();
    };

    const name = sanitizeFileName(record.name);
    const rollNo = sanitizeFileName(record.roll_no);
    
    // Build filename with name and registration number
    let filename = record.certificate_no;
    if (name) {
      filename = `${name}_${filename}`;
    }
    if (rollNo) {
      filename = `${filename}_${rollNo}`;
    }

    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${filename}.png`;
    link.click();
  };

  return (
    <section className="rounded-2xl bg-white/90 p-6 shadow-soft">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
            Certificates
          </p>
          <h2 className="mt-1 font-heading text-[28px] text-dark">Issued Certificates</h2>
          <p className="mt-2 text-sm text-slate-500">
            Overview of uploaded certificates with quick filters and export options.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search certificates"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white"
          >
            <i className="fa fa-rotate" aria-hidden="true" /> Refresh
          </button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!filteredCertificates.length}
        >
          <i className="fa fa-file-excel" aria-hidden="true" /> Export Excel
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!filteredCertificates.length}
        >
          <i className="fa fa-file-pdf" aria-hidden="true" /> Export PDF
        </button>
        <p className="text-xs text-slate-500">
          Showing {filteredCertificates.length} of {certificates.length} certificate(s)
        </p>
      </div>

      <div className="mt-6 max-h-[26rem] overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-primary text-left text-xs uppercase tracking-wide text-white">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3">QR Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/80">
            {isLoading ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length + 1}>
                  <i className="fa fa-spinner fa-spin mr-2" aria-hidden="true" />
                  Loading certificate records...
                </td>
              </tr>
            ) : !filteredCertificates.length ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length + 1}>
                  No certificates found for the selected filters.
                </td>
              </tr>
            ) : (
              filteredCertificates.map((record) => (
                <tr key={record.id}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-600">
                      {record[column.key] || '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="rounded-lg border border-slate-200 p-2 shadow-sm">
                      <QRCodeCanvas
                        id={getQrElementId(record.certificate_no)}
                        value={record.qr_code_url}
                        size={96}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor="#120f2d"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={record.qr_code_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white"
                      >
                        <i className="fa fa-link" aria-hidden="true" />
                        Open Link
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadQr(record)}
                        className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white"
                      >
                        <i className="fa fa-download" aria-hidden="true" />
                        Download QR
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CertificateList;
