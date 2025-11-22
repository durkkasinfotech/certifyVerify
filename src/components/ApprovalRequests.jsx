import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const ApprovalRequests = ({ pendingCertificates, onApprovalChange, isLoading }) => {
  const [processingIds, setProcessingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleApprove = async (certificate) => {
    setProcessingIds((prev) => new Set(prev).add(certificate.id));
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ status: 'approved' })
        .eq('id', certificate.id);

      if (updateError) {
        throw updateError;
      }

      onApprovalChange();
    } catch (err) {
      setError(err.message || 'Failed to approve certificate');
      // eslint-disable-next-line no-console
      console.error('Approval error:', err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(certificate.id);
        return next;
      });
    }
  };

  const handleReject = async (certificate) => {
    if (!confirm(`Are you sure you want to reject the certificate for ${certificate.name}? This action cannot be undone.`)) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(certificate.id));
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ status: 'rejected' })
        .eq('id', certificate.id);

      if (updateError) {
        throw updateError;
      }

      onApprovalChange();
    } catch (err) {
      setError(err.message || 'Failed to reject certificate');
      // eslint-disable-next-line no-console
      console.error('Rejection error:', err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(certificate.id);
        return next;
      });
    }
  };

  const handleBulkApprove = async () => {
    if (!confirm(`Are you sure you want to approve all ${pendingCertificates.length} pending certificates?`)) {
      return;
    }

    setProcessingIds(new Set(pendingCertificates.map(c => c.id)));
    setError('');

    try {
      const ids = pendingCertificates.map(c => c.id);
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ status: 'approved' })
        .in('id', ids);

      if (updateError) {
        throw updateError;
      }

      onApprovalChange();
    } catch (err) {
      setError(err.message || 'Failed to approve certificates');
      // eslint-disable-next-line no-console
      console.error('Bulk approval error:', err);
    } finally {
      setProcessingIds(new Set());
    }
  };

  return (
    <section className="rounded-xl bg-white/90 p-4 shadow-soft sm:rounded-2xl sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
            Approval Requests
          </p>
          <h2 className="mt-1 font-heading text-xl text-dark sm:text-2xl md:text-[28px]">
            Waiting for Approval
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
            Review and approve or reject certificate entries submitted by administrators.
          </p>
        </div>
        {pendingCertificates.length > 0 && (
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={processingIds.size > 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:gap-3 sm:px-5 sm:py-3 sm:text-sm"
          >
            <i className="fa fa-check-double" aria-hidden="true" />
            Approve All ({pendingCertificates.length})
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl bg-white/90 px-4 py-12 text-center shadow-soft">
          <i className="fa fa-spinner fa-spin text-2xl text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading approval requests...</p>
        </div>
      ) : pendingCertificates.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-12 text-center">
          <i className="fa fa-check-circle text-4xl text-green-500 mb-4" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600">No pending approval requests</p>
          <p className="mt-1 text-xs text-slate-500">All certificates have been reviewed.</p>
        </div>
      ) : (
        <div className="mt-4 max-h-[45rem] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 sm:mt-6">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-primary text-left text-[10px] uppercase tracking-wide text-white sm:text-xs">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Certificate #</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Name</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Roll No</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Email</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Course</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Date Issued</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Created</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/80">
              {pendingCertificates.map((certificate) => {
                const isProcessing = processingIds.has(certificate.id);
                return (
                  <tr key={certificate.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-slate-900">
                      {certificate.certificate_no}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <p className="font-semibold text-dark">{certificate.name}</p>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">{certificate.roll_no}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 text-xs">
                      {certificate.email}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 text-xs">
                      {certificate.course_name || '—'}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">
                      {certificate.date_issued ? new Date(certificate.date_issued).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-500 text-xs">
                      {certificate.created_at
                        ? new Date(certificate.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(certificate)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
                          title="Approve"
                        >
                          {isProcessing ? (
                            <i className="fa fa-spinner fa-spin" aria-hidden="true" />
                          ) : (
                            <i className="fa fa-check" aria-hidden="true" />
                          )}
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(certificate)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
                          title="Reject"
                        >
                          {isProcessing ? (
                            <i className="fa fa-spinner fa-spin" aria-hidden="true" />
                          ) : (
                            <i className="fa fa-times" aria-hidden="true" />
                          )}
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ApprovalRequests;

