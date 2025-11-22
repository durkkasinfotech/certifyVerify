import { supabase } from './supabaseClient';

/**
 * Get the current user's role
 * @returns {Promise<'admin'|'super_admin'|null>}
 */
export const getUserRole = async () => {
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      // eslint-disable-next-line no-console
      console.error('Error getting user:', userError);
      return null;
    }

    if (!user) {
      // eslint-disable-next-line no-console
      console.log('No user found in session');
      return null;
    }

    // eslint-disable-next-line no-console
    console.log('Fetching role for user:', user.id, user.email);

    // Query with timeout using Promise.race
    const queryPromise = supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Timeout after 2 seconds (faster)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 2000);
    });
    
    let queryResult;
    try {
      queryResult = await Promise.race([queryPromise, timeoutPromise]);
    } catch (timeoutError) {
      if (timeoutError.message === 'TIMEOUT') {
        throw new Error('Role check timeout. RLS policy is blocking. Please run database/EMERGENCY_FIX.sql in Supabase SQL Editor to disable RLS temporarily.');
      }
      throw timeoutError;
    }
    
    const { data, error } = queryResult;

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user role from database:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        user_id: user.id,
        user_email: user.email,
      });
      
      // Check if it's a permission/RLS error
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        // eslint-disable-next-line no-console
        console.error('RLS Policy Error: User cannot read their role. Run EMERGENCY_FIX.sql');
        throw new Error('RLS policy is blocking role access. Please run database/EMERGENCY_FIX.sql');
      }
      
      return null;
    }

    if (!data) {
      // eslint-disable-next-line no-console
      console.log('No role data returned for user');
      return null;
    }

    // eslint-disable-next-line no-console
    console.log('✅ User role found:', data.role);
    return data.role;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user role:', error);
    return null;
  }
};

/**
 * Check if current user is Super Admin
 * @returns {Promise<boolean>}
 */
export const isSuperAdmin = async () => {
  const role = await getUserRole();
  return role === 'super_admin';
};

/**
 * Check if current user is Admin (normal admin)
 * @returns {Promise<boolean>}
 */
export const isAdmin = async () => {
  const role = await getUserRole();
  return role === 'admin' || role === 'super_admin';
};

/**
 * Get user role from session storage (cached)
 * @returns {string|null}
 */
export const getCachedUserRole = () => {
  try {
    const role = sessionStorage.getItem('user_role');
    return role || null;
  } catch {
    return null;
  }
};

/**
 * Set user role in session storage (cache)
 * @param {string} role
 */
export const setCachedUserRole = (role) => {
  try {
    sessionStorage.setItem('user_role', role);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear cached user role
 */
export const clearCachedUserRole = () => {
  try {
    sessionStorage.removeItem('user_role');
  } catch {
    // Ignore storage errors
  }
};

