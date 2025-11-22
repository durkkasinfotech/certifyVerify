import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CertificateList from '../components/CertificateList.jsx';
import ApprovalRequests from '../components/ApprovalRequests.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
import ManualEntry from '../components/ManualEntry.jsx';
import Footer from '../components/layout/Footer.jsx';
import NavBar from '../components/layout/NavBar.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import TopBar from '../components/layout/TopBar.jsx';
import { supabase } from '../utils/supabaseClient.js';
import { clearCachedUserRole } from '../utils/authHelpers.js';

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals', 'certificates', 'manual', 'bulk'

  const supabaseConfigured = useMemo(() => Boolean(supabase), []);

  const handleLogout = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('Logging out from Super Admin...');
      
      // Sign out from Supabase
      if (supabase) {
        try {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            // eslint-disable-next-line no-console
            console.warn('Supabase signOut warning:', signOutError);
          }
        } catch (signOutErr) {
          // eslint-disable-next-line no-console
          console.warn('Error during Supabase signOut:', signOutErr);
        }
      }
      
      // Clear all session data
      sessionStorage.removeItem('auth_session');
      clearCachedUserRole();
      
      // Clear localStorage if Supabase stored anything there
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // eslint-disable-next-line no-console
      console.log('Logout successful, redirecting to login...');
      
      // Use window.location for complete cleanup and redirect
      window.location.href = '/superadmin/login';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      
      // Even if there's an error, clear session and redirect
      sessionStorage.removeItem('auth_session');
      clearCachedUserRole();
      
      // Force redirect even on error
      window.location.href = '/super-admin/login';
    }
  };

  const fetchCertificates = async () => {
    if (!supabaseConfigured) return;
    setIsTableLoading(true);

    try {
      // Super admin can see all certificates that exist in the database
      // Only show certificates with valid certificate numbers from the database
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .not('certificate_no', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Filter to ensure only certificates with valid certificate numbers are shown
      const validCertificates = (data ?? []).filter(cert => cert.certificate_no && cert.certificate_no.trim());
      setCertificates(validCertificates);
      
      // Separate pending approvals
      const pending = validCertificates.filter(cert => cert.status === 'pending_approval');
      setPendingCertificates(pending);
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

    const init = async () => {
      // Show dashboard immediately, load data in background
      setIsInitialising(false);
      // Fetch certificates in background
      await fetchCertificates();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

  const handleApprovalChange = () => {
    // Refresh certificates after approval/rejection
    fetchCertificates();
  };

  return (
    <div className="min-h-screen bg-light">
      <TopBar />
      <NavBar />
      <div className="relative">
        <PageHeader
          title="Super Admin Dashboard"
          subtitle="Manage certificate approvals, edit records, and oversee all certificate operations."
        />
        <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4 md:right-8 md:top-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 active:bg-red-800 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-3"
            title="Logout from Super Admin"
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
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'approvals'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-600 hover:text-primary'
                }`}
              >
                <i className="fa fa-clock mr-2" aria-hidden="true" />
                Approval Requests
                {pendingCertificates.length > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                    {pendingCertificates.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'certificates'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-600 hover:text-primary'
                }`}
              >
                <i className="fa fa-certificate mr-2" aria-hidden="true" />
                All Certificates
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'manual'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-600 hover:text-primary'
                }`}
              >
                <i className="fa fa-plus-circle mr-2" aria-hidden="true" />
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bulk')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'bulk'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-600 hover:text-primary'
                }`}
              >
                <i className="fa fa-upload mr-2" aria-hidden="true" />
                Bulk Upload
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'approvals' ? (
              <ApprovalRequests
                pendingCertificates={pendingCertificates}
                onApprovalChange={handleApprovalChange}
                isLoading={isTableLoading}
              />
            ) : activeTab === 'certificates' ? (
              <CertificateList
                certificates={certificates}
                isLoading={isTableLoading}
                onRefresh={fetchCertificates}
                isSuperAdmin={true}
              />
            ) : activeTab === 'manual' ? (
              <ManualEntry onUploadComplete={fetchCertificates} />
            ) : activeTab === 'bulk' ? (
              <UploadExcel onUploadComplete={fetchCertificates} />
            ) : null}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SuperAdmin;

