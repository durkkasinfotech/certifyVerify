import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { toExcelWorkbook } from '../utils/excelParser';
import { extractSequenceNumber } from '../utils/certificateHelpers';
import { generateCertificatePDF, downloadPDF, viewPDF } from '../utils/certificateGenerator';
import EditCertificateModal from './EditCertificateModal.jsx';
import { supabase } from '../utils/supabaseClient';

const getColumns = (isSuperAdmin) => {
  const baseColumns = [
  { key: 'certificate_no', label: 'Certificate Number' },
  { key: 'name', label: 'Name' },
  { key: 'course_name', label: 'Course Name' },
  { key: 'date_issued', label: 'Date Issued' },
  { key: 'mode', label: 'Mode' },
];

  // Show status column for both Admin and Super Admin
  baseColumns.push({ key: 'status', label: 'Status' });
  
  return baseColumns;
};

const filterRecords = (records, query, isSuperAdmin) => {
  if (!query) return records;
  const lower = query.toLowerCase();
  return records.filter((record) =>
    [
      record.certificate_no,
      record.name,
      record.course_name,
      record.date_issued,
      record.mode,
      record.status, // Always include status in search
    ]
      .filter(Boolean)
      .some((value) => `${value}`.toLowerCase().includes(lower))
  );
};

const CertificateList = ({ certificates, isLoading, onRefresh, isSuperAdmin = false }) => {
  const navigate = useNavigate();
  const columns = useMemo(() => getColumns(isSuperAdmin), [isSuperAdmin]);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({
    certificate_no: '',
    name: '',
    course_name: '',
    date_issued: '',
    mode: '',
    status: '', // Always include status filter
  });
  const [generatingCertId, setGeneratingCertId] = useState(null);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingAllQr, setDownloadingAllQr] = useState(false);

  const filteredCertificates = useMemo(() => {
    let filtered = certificates;

    // Apply global search filter
    if (search) {
      filtered = filterRecords(filtered, search, isSuperAdmin);
    }

    // Apply column-specific filters
    filtered = filtered.filter((record) => {
      return (
        (!columnFilters.certificate_no ||
          `${record.certificate_no ?? ''}`.toLowerCase().includes(columnFilters.certificate_no.toLowerCase())) &&
        (!columnFilters.name ||
          `${record.name ?? ''}`.toLowerCase().includes(columnFilters.name.toLowerCase())) &&
        (!columnFilters.course_name ||
          `${record.course_name ?? ''}`.toLowerCase().includes(columnFilters.course_name.toLowerCase())) &&
        (!columnFilters.date_issued ||
          `${record.date_issued ?? ''}`.toLowerCase().includes(columnFilters.date_issued.toLowerCase())) &&
        (!columnFilters.mode ||
          `${record.mode ?? ''}`.toLowerCase().includes(columnFilters.mode.toLowerCase())) &&
        (!columnFilters.status ||
          `${record.status ?? ''}`.toLowerCase().includes(columnFilters.status.toLowerCase()))
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
  }, [certificates, search, columnFilters, isSuperAdmin]);

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
      course_name: '',
      date_issued: '',
      mode: '',
      status: '', // Always include status filter
    });
  };

  const handleEdit = (certificate) => {
    setEditingCertificate(certificate);
  };

  const handleDelete = async (certificate) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE the certificate for ${certificate.name} (${certificate.certificate_no})? This action cannot be undone and will completely remove the data from the database.`)) {
      return;
    }

    setDeletingId(certificate.id);

    try {
      // Permanently delete from database - this completely removes the record
      const { error, data } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificate.id)
        .select();

      if (error) {
        throw error;
      }

      // eslint-disable-next-line no-console
      console.log('Certificate permanently deleted from database:', certificate.id, certificate.certificate_no);

      // Refresh the list to reflect the deletion
      onRefresh();
      
      // Show success message
      alert(`Certificate ${certificate.certificate_no} has been permanently deleted from the database.`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete error:', err);
      alert(`Failed to delete certificate: ${err.message}\n\nPlease check the console for more details.`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = () => {
    setEditingCertificate(null);
    onRefresh();
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

  // Sanitize filename by removing invalid characters
  const sanitizeFileName = (str) => {
    if (!str) return '';
    return str.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_').trim();
  };

  const getQrFileName = (record) => {
    const name = sanitizeFileName(record.name);
    const certNo = sanitizeFileName(record.certificate_no);
    
    // Build filename: Name_CertificateNumber.png
    let filename = certNo;
    if (name) {
      filename = `${name}_${certNo}`;
    }
    return `${filename}.png`;
  };

  const handleDownloadQr = (record) => {
    if (!record || !record.certificate_no) return;
    const canvas = document.getElementById(getQrElementId(record.certificate_no));
    if (!canvas) return;

    const filename = getQrFileName(record);
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    link.click();
  };

  const handleDownloadAllApprovedQr = async () => {
    // Filter only approved certificates
    const approvedCertificates = filteredCertificates.filter(cert => cert.status === 'approved');
    
    if (approvedCertificates.length === 0) {
      alert('No approved certificates found to download QR codes.');
      return;
    }

    setDownloadingAllQr(true);

    try {
      const zip = new JSZip();
      const qrFolder = zip.folder('approved_qr_codes');

      // Wait a bit to ensure all QR codes are rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process all QR codes and wait for all blobs
      const blobPromises = approvedCertificates.map((record) => {
        return new Promise((resolve) => {
          try {
            const canvas = document.getElementById(getQrElementId(record.certificate_no));
            if (!canvas) {
              // eslint-disable-next-line no-console
              console.warn(`QR code canvas not found for ${record.certificate_no}`);
              resolve(null);
              return;
            }

            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                const filename = getQrFileName(record);
                resolve({ filename, blob });
              } else {
                resolve(null);
              }
            }, 'image/png');
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Error processing QR for ${record.certificate_no}:`, error);
            resolve(null);
          }
        });
      });

      // Wait for all blobs to be processed
      const results = await Promise.all(blobPromises);
      
      let successCount = 0;
      let failCount = 0;

      // Add all successful blobs to zip
      results.forEach((result) => {
        if (result && result.blob) {
          qrFolder.file(result.filename, result.blob);
          successCount++;
        } else {
          failCount++;
        }
      });

      if (successCount === 0) {
        alert('No QR codes could be generated. Please ensure the certificates are displayed in the table.');
        setDownloadingAllQr(false);
        return;
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `approved_qr_codes_${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(zipBlob, zipFileName);

      alert(`QR codes downloaded successfully!\n\nSuccess: ${successCount} files\nFailed: ${failCount} files`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error downloading QR codes:', error);
      alert(`Failed to download QR codes: ${error.message}`);
    } finally {
      setDownloadingAllQr(false);
    }
  };

  const handleViewCertificate = async (record) => {
    try {
      setGeneratingCertId(record.id);
      
      // Validate required data before generating
      if (!record.name || !record.certificate_no) {
        throw new Error('Certificate data is incomplete. Name and Certificate Number are required.');
      }
      
      // Use certificate number from database (record.certificate_no)
      const pdfBlob = await generateCertificatePDF(record, record.certificate_no);
      viewPDF(pdfBlob);
    } catch (error) {
      console.error('Error viewing certificate:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to generate certificate preview.\n\nError: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setGeneratingCertId(null);
    }
  };

  const handleDownloadCertificate = async (record) => {
    try {
      setGeneratingCertId(record.id);
      
      // Validate required data before generating
      if (!record.name || !record.certificate_no) {
        throw new Error('Certificate data is incomplete. Name and Certificate Number are required.');
      }
      
      // Use certificate number from database (record.certificate_no)
      const pdfBlob = await generateCertificatePDF(record, record.certificate_no);
      const filename = `${record.name}_${record.certificate_no}.pdf`;
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to download certificate.\n\nError: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setGeneratingCertId(null);
    }
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
        <button
          type="button"
          onClick={handleDownloadAllApprovedQr}
          disabled={downloadingAllQr || filteredCertificates.filter(cert => cert.status === 'approved').length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
          title="Download all approved QR codes as ZIP"
        >
          {downloadingAllQr ? (
            <>
              <i className="fa fa-spinner fa-spin text-xs" aria-hidden="true" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <i className="fa fa-qrcode text-xs" aria-hidden="true" />
              <span>Download All QR</span>
            </>
          )}
        </button>
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
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">Digital Certificate</span>
                  <div className="h-5 sm:h-6"></div>
                </div>
              </th>
              <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3 whitespace-nowrap bg-primary">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">QR Code</span>
                  <div className="h-5 sm:h-6"></div>
                </div>
              </th>
              {isSuperAdmin && (
                <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3 whitespace-nowrap bg-primary">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">Actions</span>
                    <div className="h-5 sm:h-6"></div>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/80">
            {isLoading ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length + 2 + (isSuperAdmin ? 1 : 0)}>
                  <i className="fa fa-spinner fa-spin mr-2" aria-hidden="true" />
                  Loading certificate records...
                </td>
              </tr>
            ) : !filteredCertificates.length ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length + 2 + (isSuperAdmin ? 1 : 0)}>
                  No certificates found for the selected filters.
                </td>
              </tr>
            ) : (
              filteredCertificates.map((record) => (
                <tr key={record.id}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-1.5 py-1.5 text-slate-600 text-xs sm:px-2 sm:py-2 sm:text-sm md:px-4 md:py-3 whitespace-nowrap">
                      {column.key === 'status' ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-xs ${
                          record.status === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : record.status === 'pending_approval'
                            ? 'bg-yellow-100 text-yellow-700'
                            : record.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {record.status === 'approved' ? '✓ Verified' : record.status === 'pending_approval' ? '⏳ Pending' : record.status === 'rejected' ? '✗ Rejected' : record.status || '—'}
                        </span>
                      ) : (
                      <span className="block truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{record[column.key] || '—'}</span>
                      )}
                    </td>
                  ))}
                  {/* Digital Certificate Download Column */}
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3">
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-0.5 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewCertificate(record)}
                          disabled={generatingCertId === record.id}
                          className="inline-flex items-center justify-center gap-1 rounded-md bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                          title="View Digital Certificate"
                        >
                          {generatingCertId === record.id ? (
                            <i className="fa fa-spinner fa-spin text-xs" aria-hidden="true" />
                          ) : (
                            <i className="fa fa-eye text-xs" aria-hidden="true" />
                          )}
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <div className="h-4 w-px bg-primary/30"></div>
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(record)}
                          disabled={generatingCertId === record.id}
                          className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                          title="Download Digital Certificate PDF"
                        >
                          {generatingCertId === record.id ? (
                            <i className="fa fa-spinner fa-spin text-xs" aria-hidden="true" />
                          ) : (
                            <i className="fa fa-download text-xs" aria-hidden="true" />
                          )}
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  {/* QR Code Column */}
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
                          title="Download QR Code Image"
                        >
                          <i className="fa fa-qrcode text-[9px] sm:text-xs" aria-hidden="true" />
                          <span className="hidden sm:inline">QR</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-4 md:py-3">
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="inline-flex items-center justify-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                          title="Edit Certificate"
                        >
                          <i className="fa fa-edit text-xs" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record)}
                          disabled={deletingId === record.id}
                          className="inline-flex items-center justify-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                          title="Delete Certificate"
                        >
                          {deletingId === record.id ? (
                            <i className="fa fa-spinner fa-spin text-xs" aria-hidden="true" />
                          ) : (
                            <i className="fa fa-trash text-xs" aria-hidden="true" />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCertificate && (
        <EditCertificateModal
          certificate={editingCertificate}
          isOpen={!!editingCertificate}
          onClose={() => setEditingCertificate(null)}
          onSave={handleEditSave}
        />
      )}
    </section>
  );
};

export default CertificateList;
