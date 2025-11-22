import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { getUserRole, setCachedUserRole } from '../utils/authHelpers';
import Footer from '../components/layout/Footer.jsx';
import NavBar from '../components/layout/NavBar.jsx';
import TopBar from '../components/layout/TopBar.jsx';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in as super admin
    const checkSession = async () => {
      if (!supabase) {
        setError('Supabase is not configured. Please set the environment variables.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const role = await getUserRole();
        if (role === 'super_admin') {
          setCachedUserRole(role);
          sessionStorage.setItem('auth_session', JSON.stringify(session));
          navigate('/superadmin', { replace: true });
        }
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!supabase) {
      setError('Supabase is not configured. Please set the environment variables.');
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Log the attempt (without password)
      // eslint-disable-next-line no-console
      console.log('=== LOGIN ATTEMPT ===');
      // eslint-disable-next-line no-console
      console.log('Email:', trimmedEmail.toLowerCase());
      // eslint-disable-next-line no-console
      console.log('Password length:', password.length);
      // eslint-disable-next-line no-console
      console.log('Supabase configured:', !!supabase);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail.toLowerCase(),
        password: password,
      });
      
      // eslint-disable-next-line no-console
      console.log('Auth response:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasError: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status,
      });

      if (authError) {
        // eslint-disable-next-line no-console
        console.error('Authentication error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          error: authError,
        });
        
        // Simple error message for password/auth errors
        let errorMessage = 'Incorrect credentials';
        
        if (authError.message) {
          if (authError.message.includes('Invalid login credentials') || 
              authError.message.includes('Invalid credentials') ||
              authError.status === 400 ||
              authError.status === 401) {
            errorMessage = 'Incorrect credentials';
          } else if (authError.status === 429) {
            errorMessage = 'Too many login attempts. Please try again later.';
          } else {
            errorMessage = 'Incorrect credentials';
          }
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (!data || !data.session) {
        setError('Login failed. No session was created. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if user is super admin (with timeout)
      // eslint-disable-next-line no-console
      console.log('Checking user role...');
      
      let role;
      try {
        // Add timeout to prevent infinite loading
        const rolePromise = getUserRole();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Role check timeout')), 10000)
        );
        
        role = await Promise.race([rolePromise, timeoutPromise]);
      } catch (roleError) {
        // eslint-disable-next-line no-console
        console.error('Error checking role:', roleError);
        
        if (roleError.message === 'Role check timeout') {
          setError(
            'Role check timed out. This might be due to RLS policies. ' +
            'Please run the SIMPLE_FIX.sql script in Supabase SQL Editor to fix this.'
          );
        } else {
          setError(
            'Failed to verify user role. Error: ' + roleError.message + '. ' +
            'Please check browser console for details and ensure the role is assigned in the database.'
          );
        }
        setIsLoading(false);
        return;
      }
      
      // eslint-disable-next-line no-console
      console.log('Role check result:', role);
      
      if (!role || role !== 'super_admin') {
        await supabase.auth.signOut();
        setError('Incorrect credentials');
        setIsLoading(false);
        return;
      }

      // Store session and role
      // eslint-disable-next-line no-console
      console.log('Login successful, storing session...');
      sessionStorage.setItem('auth_session', JSON.stringify(data.session));
      setCachedUserRole(role);
      // eslint-disable-next-line no-console
      console.log('Redirecting to super admin dashboard...');
      navigate('/superadmin', { replace: true });
    } catch (err) {
      const errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <TopBar />
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-16 lg:px-0">
        <div className="rounded-2xl bg-white/90 p-8 shadow-soft">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl text-dark">Super Admin Login</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your credentials to access the Super Admin dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? (
                <>
                  <i className="fa fa-spinner fa-spin mr-2" aria-hidden="true" />
                  Logging in...
                </>
              ) : (
                <>
                  <i className="fa fa-sign-in-alt mr-2" aria-hidden="true" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SuperAdminLogin;

