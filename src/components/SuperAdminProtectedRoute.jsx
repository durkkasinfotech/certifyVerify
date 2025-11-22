import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { getUserRole, setCachedUserRole, clearCachedUserRole, getCachedUserRole } from '../utils/authHelpers';

const SuperAdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectToAdmin, setRedirectToAdmin] = useState(false);
  const hasLoadedRef = useRef(false); // Track if we've already loaded with cache

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check cached role first (for faster reload)
      const cachedRole = getCachedUserRole();
      const storedSession = sessionStorage.getItem('auth_session');
      
      if (!storedSession) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // If cached role is admin, redirect to admin route immediately
      if (cachedRole === 'admin' && storedSession) {
        // eslint-disable-next-line no-console
        console.log('SuperAdminProtectedRoute - Cached admin detected, redirecting to admin route');
        setRedirectToAdmin(true);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // If we have cached super_admin role and session, load IMMEDIATELY (0 delay)
      if (cachedRole === 'super_admin' && storedSession) {
        // Load instantly with cached data - no async checks
        setIsAuthenticated(true);
        setIsLoading(false);
        hasLoadedRef.current = true; // Mark as loaded
        
        // Verify session in background (completely non-blocking, never redirects)
        // Don't await, just fire and forget - this is ONLY for refresh, not for auth
        setTimeout(() => {
          supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
              if (error || !session) {
                // Only clear cache, don't redirect if page already loaded
                if (!hasLoadedRef.current) {
                  sessionStorage.removeItem('auth_session');
                  clearCachedUserRole();
                  setIsAuthenticated(false);
                } else {
                  // Page already loaded, just update cache silently
                  sessionStorage.removeItem('auth_session');
                  clearCachedUserRole();
                }
              } else if (session) {
                // Update session if valid
                sessionStorage.setItem('auth_session', JSON.stringify(session));
              }
            })
            .catch(() => {
              // Silently ignore - don't redirect after page has loaded
            });
        }, 0);
        
        return;
      }

      try {
        // Full authentication check with very short timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 1000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (error || !session) {
          sessionStorage.removeItem('auth_session');
          clearCachedUserRole();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check if user is super admin with shorter timeout
        // eslint-disable-next-line no-console
        console.log('SuperAdminProtectedRoute - Checking role...');
        
        const rolePromise = getUserRole();
        const roleTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Role check timeout')), 2000)
        );

        let role;
        try {
          role = await Promise.race([rolePromise, roleTimeoutPromise]);
        } catch (roleError) {
          // eslint-disable-next-line no-console
          console.error('SuperAdminProtectedRoute - Role check error:', roleError);
          
          // If timeout, use cached role if available
          if (roleError.message === 'Role check timeout') {
            if (cachedRole === 'admin') {
              // eslint-disable-next-line no-console
              console.log('SuperAdminProtectedRoute - Role check timeout, cached admin detected, redirecting');
              setRedirectToAdmin(true);
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            } else if (cachedRole === 'super_admin') {
              // eslint-disable-next-line no-console
              console.log('SuperAdminProtectedRoute - Role check timeout, using cached role');
              role = 'super_admin';
            } else {
              sessionStorage.removeItem('auth_session');
              clearCachedUserRole();
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            }
          } else {
            sessionStorage.removeItem('auth_session');
            clearCachedUserRole();
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }
        
        // eslint-disable-next-line no-console
        console.log('SuperAdminProtectedRoute - User role:', role);
        
        if (!role) {
          // eslint-disable-next-line no-console
          console.log('SuperAdminProtectedRoute - No role found');
          sessionStorage.removeItem('auth_session');
          clearCachedUserRole();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        if (role !== 'super_admin') {
          // eslint-disable-next-line no-console
          console.log('SuperAdminProtectedRoute - Wrong role:', role, 'Expected: super_admin');
          
          // If user is admin, redirect to admin dashboard
          if (role === 'admin') {
            // eslint-disable-next-line no-console
            console.log('SuperAdminProtectedRoute - Admin detected, redirecting to admin route');
            setRedirectToAdmin(true);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
          
          // For other roles or no role, clear session and redirect to login
          sessionStorage.removeItem('auth_session');
          clearCachedUserRole();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // eslint-disable-next-line no-console
        console.log('SuperAdminProtectedRoute - Access granted');

        // Update sessionStorage and cache
        sessionStorage.setItem('auth_session', JSON.stringify(session));
        setCachedUserRole(role);
        setIsAuthenticated(true);
        hasLoadedRef.current = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('SuperAdminProtectedRoute - Auth check error:', err);
        
        // If timeout error, check cached role and redirect accordingly
        if (err.message?.includes('timeout') && cachedRole === 'admin' && storedSession) {
          // eslint-disable-next-line no-console
          console.log('SuperAdminProtectedRoute - Using cached admin role due to timeout, redirecting');
          setRedirectToAdmin(true);
          setIsAuthenticated(false);
        } else if (err.message?.includes('timeout') && cachedRole === 'super_admin' && storedSession) {
          // eslint-disable-next-line no-console
          console.log('SuperAdminProtectedRoute - Using cached data due to timeout');
          setIsAuthenticated(true);
          hasLoadedRef.current = true;
        } else {
          sessionStorage.removeItem('auth_session');
          clearCachedUserRole();
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes (only for explicit sign out, not for reloads)
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange(async (event, session) => {
      // Only handle explicit sign out events, ignore token refresh events
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        sessionStorage.removeItem('auth_session');
        clearCachedUserRole();
        setIsAuthenticated(false);
        setIsLoading(false);
        hasLoadedRef.current = false;
      } else if (event === 'SIGNED_IN' && session && !hasLoadedRef.current) {
        // Only process SIGNED_IN if we haven't already loaded with cache
        try {
          const rolePromise = getUserRole();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Role check timeout')), 2000)
          );
          
          const role = await Promise.race([rolePromise, timeoutPromise]);
          
          if (role === 'admin') {
            // Admin trying to access super admin route - redirect
            setRedirectToAdmin(true);
            setIsAuthenticated(false);
          } else if (role === 'super_admin') {
            sessionStorage.setItem('auth_session', JSON.stringify(session));
            setCachedUserRole(role);
            setIsAuthenticated(true);
            hasLoadedRef.current = true;
          } else {
            setIsAuthenticated(false);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('SuperAdminProtectedRoute - Auth state change role check error:', err);
          // Don't redirect if we already loaded with cache
          if (!hasLoadedRef.current) {
            setIsAuthenticated(false);
          }
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
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

  // Redirect admin to their own route
  if (redirectToAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return isAuthenticated ? children : <Navigate to="/superadmin/login" replace />;
};

export default SuperAdminProtectedRoute;

