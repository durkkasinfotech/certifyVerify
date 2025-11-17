import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check sessionStorage first (for tab close detection)
      const storedSession = sessionStorage.getItem('auth_session');
      if (!storedSession) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Verify session with Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          // Clear invalid session
          sessionStorage.removeItem('auth_session');
          setIsAuthenticated(false);
        } else {
          // Update sessionStorage
          sessionStorage.setItem('auth_session', JSON.stringify(session));
          setIsAuthenticated(true);
        }
      } catch (err) {
        sessionStorage.removeItem('auth_session');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        sessionStorage.removeItem('auth_session');
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' && session) {
        sessionStorage.setItem('auth_session', JSON.stringify(session));
        setIsAuthenticated(true);
      }
    });

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Handle tab close - sessionStorage automatically clears on tab close
  // But we also listen for visibility changes to detect when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When tab becomes hidden, we don't clear immediately
      // But when it becomes visible again, we'll check the session
      if (document.visibilityState === 'visible') {
        // Re-check session when tab becomes visible
        const storedSession = sessionStorage.getItem('auth_session');
        if (!storedSession) {
          setIsAuthenticated(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light">
        <div className="text-center">
          <i className="fa fa-spinner fa-spin text-4xl text-primary" aria-hidden="true" />
          <p className="mt-4 font-semibold text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

