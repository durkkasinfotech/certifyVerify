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
        .order('created_at', { ascending: false });

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
          title="Admin Dashboard"
          subtitle="Upload certificate batches, generate QR codes, and manage verification records."
        />
        <div className="absolute right-4 top-4 z-10 md:right-8 md:top-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 md:px-5 md:py-3"
          >
            <i className="fa fa-sign-out-alt" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-8 sm:pb-12 lg:px-0">
        {!supabaseConfigured ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
            <i className="fa fa-triangle-exclamation text-3xl" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-2xl">Supabase not configured</h2>
            <p className="mt-2 text-sm">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your
              environment configuration to enable admin features.
            </p>
          </div>
        ) : isInitialising ? (
          <div className="rounded-3xl bg-white/90 px-6 py-12 text-center shadow-soft">
            <i className="fa fa-spinner fa-spin text-3xl text-primary" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-600">Preparing your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 md:space-y-10">
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
