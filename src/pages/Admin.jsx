import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadExcel from '../components/UploadExcel.jsx';
import ManualEntry from '../components/ManualEntry.jsx';
import CertificateList from '../components/CertificateList.jsx';
import Footer from '../components/layout/Footer.jsx';
import NavBar from '../components/layout/NavBar.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import TopBar from '../components/layout/TopBar.jsx';
import { supabase } from '../utils/supabaseClient.js';

const Admin = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [pendingRejectedCertificates, setPendingRejectedCertificates] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [showPendingRejected, setShowPendingRejected] = useState(false); // Toggle for pending/rejected section
  const [deletingId, setDeletingId] = useState(null); // Track which certificate is being deleted

  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      // Clear sessionStorage
      sessionStorage.removeItem('auth_session');
      // Redirect to login
      navigate('/login', { replace: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      // Still clear session and redirect even if there's an error
      sessionStorage.removeItem('auth_session');
      navigate('/login', { replace: true });
    }
  };

  const fetchCertificates = async () => {
    if (!supabaseConfigured) return;
    setIsTableLoading(true);

    try {
      // Normal admin can see all certificates (approved and pending) to track status
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('certificate_no', { ascending: true });

      if (error) {
        throw error;
      }

      const allCertificates = data ?? [];
      
      // Separate approved certificates from pending/rejected
      const approved = allCertificates.filter(cert => cert.status === 'approved');
      const pendingRejected = allCertificates.filter(cert => 
        cert.status === 'pending_approval' || cert.status === 'rejected'
      );
      
      setCertificates(approved);
      setPendingRejectedCertificates(pendingRejected);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load certificates', error);
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    if (!supabaseConfigured) {
      setIsInitialising(false);
      return;
    }

    // Show dashboard immediately (no delay)
    setIsInitialising(false);
    
    // Fetch certificates in background (non-blocking)
    fetchCertificates().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch certificates:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

  const handleDeletePendingRejected = async (certificate) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE the certificate for ${certificate.name} (${certificate.certificate_no})? This action cannot be undone and will completely remove the data from the database.`)) {
      return;
    }

    setDeletingId(certificate.id);

    try {
      // Permanently delete from database - this completely removes the record
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificate.id);

      if (error) {
        throw error;
      }

      // eslint-disable-next-line no-console
      console.log('Certificate permanently deleted from database:', certificate.id, certificate.certificate_no);

      // Refresh the list to reflect the deletion
      await fetchCertificates();
      
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

  return (
    <div className="min-h-screen bg-light">
      <TopBar />
      <NavBar />
      <div className="relative">
        <PageHeader
          title="Certificate Admin Dashboard"
          subtitle="Upload certificate batches, generate QR codes, and manage verification records."
        />
        <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4 md:right-8 md:top-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-3"
          >
            <i className="fa fa-sign-out-alt text-xs sm:text-sm" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 pt-4 pb-6 sm:px-4 sm:pt-6 sm:pb-8 md:pt-8 md:pb-12 lg:px-0">
        {!supabaseConfigured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-amber-800 sm:rounded-2xl sm:px-6 sm:py-8 md:rounded-3xl">
            <i className="fa fa-triangle-exclamation text-2xl sm:text-3xl" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-xl sm:text-2xl">Supabase not configured</h2>
            <p className="mt-2 text-xs sm:text-sm px-2">
              Add <code className="text-[10px] sm:text-xs">VITE_SUPABASE_URL</code> and <code className="text-[10px] sm:text-xs">VITE_SUPABASE_ANON_KEY</code> to your
              environment configuration to enable admin features.
            </p>
          </div>
        ) : isInitialising ? (
          <div className="rounded-xl bg-white/90 px-4 py-8 text-center shadow-soft sm:rounded-2xl sm:px-6 sm:py-12 md:rounded-3xl">
            <i className="fa fa-spinner fa-spin text-2xl text-primary sm:text-3xl" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-600 sm:text-base">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
            <UploadExcel onUploadComplete={fetchCertificates} />

            <ManualEntry onUploadComplete={fetchCertificates} />

            {/* Pending/Rejected Certificates Table */}
            {pendingRejectedCertificates.length > 0 && (
              <section className="rounded-xl bg-white/90 p-4 shadow-soft sm:rounded-2xl sm:p-6">
                <header className="mb-4 sm:mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-secondary">
                        Pending & Rejected Certificates
                      </p>
                      <h2 className="mt-1 font-heading text-xl text-dark sm:text-2xl md:text-[28px]">
                        Waiting for Approval / Rejected
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                        Certificates that are pending Super Admin approval or have been rejected.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        ({pendingRejectedCertificates.length} {pendingRejectedCertificates.length === 1 ? 'certificate' : 'certificates'})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPendingRejected(!showPendingRejected)}
                      className="flex-shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                      aria-label={showPendingRejected ? 'Hide pending certificates' : 'Show pending certificates'}
                    >
                      <i 
                        className={`fa ${showPendingRejected ? 'fa-chevron-up' : 'fa-chevron-down'} mr-2`} 
                        aria-hidden="true"
                      />
                      <span className="hidden sm:inline">
                        {showPendingRejected ? 'Hide' : 'Show'}
                      </span>
                    </button>
                  </div>
                </header>
                {showPendingRejected && (
                  <div className="mt-4 max-h-[30rem] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 sm:mt-6">
                    <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                      <thead className="sticky top-0 z-10 bg-yellow-50 text-left text-[10px] uppercase tracking-wide text-slate-700 sm:text-xs">
                        <tr>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Certificate #</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Name</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Email</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Course</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Date Issued</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Status</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Created</th>
                          <th className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white/80">
                        {pendingRejectedCertificates.map((certificate) => (
                          <tr key={certificate.id} className="hover:bg-slate-50">
                            <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-slate-900">
                              {certificate.certificate_no}
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3">
                              <p className="font-semibold text-dark">{certificate.name}</p>
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 text-xs">
                              {certificate.email}
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 text-xs">
                              {certificate.course_name || '—'}
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">
                              {certificate.date_issued ? new Date(certificate.date_issued).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-xs ${
                                certificate.status === 'pending_approval'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : certificate.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {certificate.status === 'pending_approval' ? '⏳ Pending' : certificate.status === 'rejected' ? '✗ Rejected' : certificate.status || '—'}
                              </span>
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-500 text-xs">
                              {certificate.created_at
                                ? new Date(certificate.created_at).toLocaleString()
                                : '—'}
                            </td>
                            <td className="px-2 py-2 sm:px-4 sm:py-3">
                              <button
                                type="button"
                                onClick={() => handleDeletePendingRejected(certificate)}
                                disabled={deletingId === certificate.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-3 sm:py-1.5 sm:text-xs"
                                aria-label={`Delete certificate ${certificate.certificate_no}`}
                              >
                                {deletingId === certificate.id ? (
                                  <>
                                    <i className="fa fa-spinner fa-spin" aria-hidden="true" />
                                    <span className="hidden sm:inline">Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="fa fa-trash" aria-hidden="true" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Approved Certificates Table */}
            <CertificateList
              certificates={certificates}
              isLoading={isTableLoading}
              onRefresh={fetchCertificates}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
