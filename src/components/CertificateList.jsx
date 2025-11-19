import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import { toExcelWorkbook } from '../utils/excelParser';
import { extractSequenceNumber } from '../utils/certificateHelpers';

const columns = [
  { key: 'certificate_no', label: 'Certificate Number' },
  { key: 'name', label: 'Name' },
  { key: 'date_issued', label: 'Date Issued' },
  { key: 'mode', label: 'Mode' },
];

const filterRecords = (records, query) => {
  if (!query) return records;
  const lower = query.toLowerCase();
  return records.filter((record) =>
    [
      record.certificate_no,
      record.name,
      record.date_issued,
      record.mode,
    ]
      .filter(Boolean)
      .some((value) => `${value}`.toLowerCase().includes(lower))
  );
};

const CertificateList = ({ certificates, isLoading, onRefresh }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({
    certificate_no: '',
    name: '',
    date_issued: '',
    mode: '',
  });

  const filteredCertificates = useMemo(() => {
    let filtered = certificates;

    // Apply global search filter
    if (search) {
      filtered = filterRecords(filtered, search);
    }

    // Apply column-specific filters
    filtered = filtered.filter((record) => {
      return (
        (!columnFilters.certificate_no ||
          `${record.certificate_no ?? ''}`.toLowerCase().includes(columnFilters.certificate_no.toLowerCase())) &&
        (!columnFilters.name ||
          `${record.name ?? ''}`.toLowerCase().includes(columnFilters.name.toLowerCase())) &&
        (!columnFilters.date_issued ||
          `${record.date_issued ?? ''}`.toLowerCase().includes(columnFilters.date_issued.toLowerCase())) &&
        (!columnFilters.mode ||
          `${record.mode ?? ''}`.toLowerCase().includes(columnFilters.mode.toLowerCase()))
      );
    });

    // Sort by certificate number in ascending order
    return [...filtered].sort((a, b) => {
      const seqA = extractSequenceNumber(a.certificate_no);
      const seqB = extractSequenceNumber(b.certificate_no);
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      // If sequence numbers are the same, sort by full certificate number
      return (a.certificate_no || '').localeCompare(b.certificate_no || '');
    });
  }, [certificates, search, columnFilters]);

  const handleColumnFilterChange = (columnKey, value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setColumnFilters({
      certificate_no: '',
      name: '',
      date_issued: '',
      mode: '',
    });
  };

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

  const generatePdfSummary = () => {
    if (!filteredCertificates.length) return null;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(12);
    doc.text('Dare Centre - Certificate Summary Report', 14, 18);
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

    return doc;
  };

  const handleViewPdfSummary = () => {
    const doc = generatePdfSummary();
    if (!doc) return;
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
  };

  const handleExportPdfSummary = () => {
    const doc = generatePdfSummary();
    if (!doc) return;
    doc.save(`certificate-summary-${Date.now()}.pdf`);
  };

  const generatePdfDetails = () => {
    if (!filteredCertificates.length) return null;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(12);
    doc.text('Dare Centre - Certificate Details Report', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 26);

    // All database fields
    const allColumns = [
      'S.No',
      'Certificate Number',
      'Name',
      'Roll No',
      'Email',
      'Phone',
      'Date Issued',
      'Issued By',
      'Mode',
      'Location / Institution',
    ];

    autoTable(doc, {
      startY: 32,
      head: [allColumns],
      body: filteredCertificates.map((record) => [
        record.sno ?? '',
        record.certificate_no ?? '',
        record.name ?? '',
        record.roll_no ?? '',
        record.email ?? '',
        record.phone ?? '',
        record.date_issued ?? '',
        record.issued_by ?? '',
        record.mode ?? '',
        record.location_or_institution ?? '',
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [40, 120, 235],
        textColor: 255,
      },
    });

    return doc;
  };

  const handleViewPdfDetails = () => {
    const doc = generatePdfDetails();
    if (!doc) return;
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
  };

  const handleExportPdfDetails = () => {
    const doc = generatePdfDetails();
    if (!doc) return;
    doc.save(`certificate-details-${Date.now()}.pdf`);
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
    <section className="rounded-xl bg-white/90 p-4 shadow-soft sm:rounded-2xl sm:p-6">
      <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
            Certificates
          </p>
          <h2 className="mt-1 font-heading text-xl text-dark sm:text-2xl md:text-[28px]">Issued Certificates</h2>
          <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
            Overview of uploaded certificates with quick filters and export options.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
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

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
        >
          <i className="fa fa-file-excel text-xs" aria-hidden="true" /> <span>Excel</span>
        </button>
        <div className="inline-flex items-center gap-1 rounded-lg border border-secondary/30 bg-secondary/5 p-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={handleViewPdfSummary}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
            disabled={!filteredCertificates.length}
          >
            <i className="fa fa-eye text-xs" aria-hidden="true" /> <span>View Summary</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdfSummary}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary/80 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
            disabled={!filteredCertificates.length}
            title="Download Summary PDF"
          >
            <i className="fa fa-download text-xs" aria-hidden="true" />
          </button>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={handleViewPdfDetails}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
            disabled={!filteredCertificates.length}
          >
            <i className="fa fa-eye text-xs" aria-hidden="true" /> <span>View Details</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdfDetails}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary/80 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
            disabled={!filteredCertificates.length}
            title="Download Details PDF"
          >
            <i className="fa fa-download text-xs" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 sm:text-xs">
          Showing {filteredCertificates.length} of {certificates.length} certificate(s)
        </p>
        {(search || Object.values(columnFilters).some((filter) => filter)) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
          >
            <i className="fa fa-times text-xs" aria-hidden="true" /> <span>Clear Filters</span>
          </button>
        )}
      </div>

      <div className="mt-4 max-h-[45rem] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 sm:mt-6">
        <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-primary text-left text-[10px] uppercase tracking-wide text-white sm:text-xs">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3 whitespace-nowrap bg-primary">
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">{column.label}</span>
                    <div className="relative">
                      <i className="fa fa-filter absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-white/70 sm:text-[9px]" aria-hidden="true" />
                      <input
                        type="text"
                        value={columnFilters[column.key] || ''}
                        onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-md border border-white/40 bg-white/15 px-2 pl-6 py-1.5 text-[9px] text-white placeholder:text-white/50 focus:border-white/80 focus:bg-white/25 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all sm:px-2.5 sm:pl-7 sm:py-2 sm:text-[10px]"
                      />
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3 whitespace-nowrap bg-primary">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-[9px] sm:text-[10px] md:text-xs">QR Code</span>
                  <div className="h-5 sm:h-6"></div>
                </div>
              </th>
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
                    <td key={column.key} className="px-1.5 py-1.5 text-slate-600 text-xs sm:px-2 sm:py-2 sm:text-sm md:px-4 md:py-3 whitespace-nowrap">
                      <span className="block truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{record[column.key] || '—'}</span>
                    </td>
                  ))}
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3">
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                      <div className="rounded-lg border border-slate-200 p-0.5 shadow-sm sm:p-1 md:p-2">
                        <QRCodeCanvas
                          id={getQrElementId(record.certificate_no)}
                          value={record.qr_code_url}
                          size={60}
                          level="H"
                          includeMargin
                          bgColor="#ffffff"
                          fgColor="#120f2d"
                        />
                      </div>
                      <div className="flex flex-row items-center justify-center gap-1.5 w-full sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Navigate to verify page with certificate number
                            const encodedCertNo = encodeURIComponent(record.certificate_no);
                            navigate(`/verify/${encodedCertNo}`);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-full border border-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]"
                          title={`Verify ${record.name} - ${record.certificate_no}`}
                        >
                          <i className="fa fa-link text-[9px] sm:text-xs" aria-hidden="true" />
                          <span className="hidden sm:inline">Open</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadQr(record)}
                          className="inline-flex items-center justify-center gap-1 rounded-full border border-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]"
                        >
                          <i className="fa fa-download text-[9px] sm:text-xs" aria-hidden="true" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
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
