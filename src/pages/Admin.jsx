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
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);

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
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('certificate_no', { ascending: true });

      if (error) {
        throw error;
      }

      setCertificates(data ?? []);
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
      await fetchCertificates();
      setIsInitialising(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

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
            <p className="mt-3 text-sm font-semibold text-slate-600 sm:text-base">Preparing your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
            <UploadExcel onUploadComplete={fetchCertificates} />

            <ManualEntry onUploadComplete={fetchCertificates} />

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
