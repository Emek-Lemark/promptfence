/**
 * Fetch wrapper for admin API calls with automatic 401 handling.
 * Clears token and redirects to /login on session expiry.
 */

const SESSION_EXPIRED_KEY = 'sessionExpiredMessage';

/**
 * Make an authenticated API request.
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options (method, body, etc.)
 * @param {function} router - Next.js router instance for navigation
 * @returns {Promise<{res: Response, data: any}>}
 */
export async function adminFetch(url, options = {}, router) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - session expired
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('installCode');
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'Session expired. Please log in again.');
    }
    if (router) {
      router.push('/login');
    }
    return { res, data: null };
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Response may not be JSON
  }

  return { res, data };
}

/**
 * Get and clear the session expired message (one-time display).
 * @returns {string|null}
 */
export function getSessionExpiredMessage() {
  if (typeof window === 'undefined') return null;
  const message = sessionStorage.getItem(SESSION_EXPIRED_KEY);
  if (message) {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  }
  return message;
}

/**
 * Check if user has a valid token stored.
 * @returns {boolean}
 */
export function hasToken() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

/**
 * Clear all auth data from storage.
 */
export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('installCode');
}
