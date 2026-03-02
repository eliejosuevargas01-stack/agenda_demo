(() => {
  'use strict';

  const LOGIN_FILE = 'admin-login.html';
  const PRIMARY_KEY = 'admin_session';

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function hasActiveSession(session) {
    if (!session || typeof session !== 'object') return false;
    if (session.loggedIn === true) return true;
    if (session.loginTime || session.token || session.sessionId || session.session_id) return true;
    if (session.usuario || session.username || session.admin || session.role) return true;
    if (session.id_admin != null || session.admin_id != null) return true;
    return false;
  }

  function getSession() {
    const primary = safeParse(localStorage.getItem(PRIMARY_KEY));
    return hasActiveSession(primary) ? primary : null;
  }

  function currentPage() {
    const path = window.location.pathname || '';
    const parts = path.split('/');
    const page = (parts[parts.length - 1] || '').toLowerCase();
    return page || 'index.html';
  }

  function onLoginPage() {
    return currentPage() === LOGIN_FILE;
  }

  function redirectToLogin() {
    if (onLoginPage()) return;
    const target = currentPage();
    const dest = `${LOGIN_FILE}?redirect=${encodeURIComponent(target)}`;
    try {
      window.location.replace(dest);
    } catch (_) {
      window.location.href = dest;
    }
  }

  function requireAuth() {
    const session = getSession();
    if (!hasActiveSession(session)) {
      try {
        localStorage.removeItem(PRIMARY_KEY);
      } catch (_) {}
      redirectToLogin();
      return null;
    }
    return session;
  }

  function logout() {
    try {
      localStorage.removeItem(PRIMARY_KEY);
    } catch (_) {}
    redirectToLogin();
  }

  function onStorage(event) {
    if (!event) return;
    if (event.key !== PRIMARY_KEY) return;
    if (event.newValue) return;
    requireAuth();
  }

  window.AdminAuth = { getSession, requireAuth, logout, hasActiveSession };

  if (!onLoginPage()) {
    requireAuth();
    window.addEventListener('storage', onStorage);
  }
})();

