import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { getUserRole, setCachedUserRole } from '../utils/authHelpers';
import Footer from '../components/layout/Footer.jsx';
import NavBar from '../components/layout/NavBar.jsx';
import TopBar from '../components/layout/TopBar.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
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
          // Redirect super admin to their own dashboard
          navigate('/superadmin', { replace: true });
          return;
        }
        
        if (role === 'admin') {
          // Store session in sessionStorage
          sessionStorage.setItem('auth_session', JSON.stringify(session));
          setCachedUserRole(role);
          navigate('/admin', { replace: true });
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

    // Trim email to remove any whitespace
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // eslint-disable-next-line no-console
      console.log('Attempting login with email:', trimmedEmail);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail.toLowerCase(), // Ensure email is lowercase
        password: password, // Don't trim password - passwords can have spaces
      });

      if (authError) {
        // Simple error message for password/auth errors
        let errorMessage = 'Incorrect password';
        
        // Check for specific error types - keep it simple
        if (authError.message) {
          if (authError.message.includes('Invalid login credentials') || 
              authError.message.includes('Invalid credentials') ||
              authError.status === 400 ||
              authError.status === 401) {
            errorMessage = 'Incorrect password';
          } else if (authError.status === 429) {
            errorMessage = 'Too many login attempts. Please try again later.';
          } else {
            errorMessage = 'Incorrect password';
          }
        }
        
        // Log full error for debugging (but don't show to user)
        // eslint-disable-next-line no-console
        console.error('Login error details:', {
          message: authError.message,
          status: authError.status,
          error: authError,
        });
        
        setError(errorMessage);
        return;
      }

      if (!data || !data.session) {
        setError('Login failed. No session was created. Please try again.');
        return;
      }

      // Check user role - redirect super admin to their own login
      // eslint-disable-next-line no-console
      console.log('Checking user role for normal admin login...');
      
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
        setError(
          'Failed to verify user role. Please check browser console and ensure the role is assigned. ' +
          'Run database/SIMPLE_FIX.sql in Supabase SQL Editor if needed.'
        );
        setIsLoading(false);
        return;
      }
      
      // eslint-disable-next-line no-console
      console.log('Role check result:', role);
      
      if (role === 'super_admin') {
        await supabase.auth.signOut();
        setError('Incorrect password');
        setIsLoading(false);
        return;
      }

      if (!role || role !== 'admin') {
        await supabase.auth.signOut();
        setError('Incorrect password');
        setIsLoading(false);
        return;
      }

      // Store session and role in sessionStorage (clears on tab close)
      // eslint-disable-next-line no-console
      console.log('Login successful, storing session...');
      sessionStorage.setItem('auth_session', JSON.stringify(data.session));
      setCachedUserRole(role);
      // eslint-disable-next-line no-console
      console.log('Redirecting to admin dashboard...');
      navigate('/admin', { replace: true });
    } catch (err) {
      // Handle unexpected errors
      const errorMessage = err?.message || err?.error_description || 'An unexpected error occurred. Please try again.';
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
            <h1 className="font-heading text-3xl text-dark">Admin Login</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your credentials to access the admin dashboard
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

export default Login;

