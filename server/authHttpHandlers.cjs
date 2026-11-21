const { getSharedAuthService } = require('./authService.cjs');

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(data));
}

function buildSessionCookieHeaders(session) {
  if (!session) return {};
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? '; Secure' : '';
  return {
    'Set-Cookie': [
      `tolkflow_session=${encodeURIComponent(session.sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${14 * 24 * 3600}${secureFlag}`,
      `tolkflow_csrf=${encodeURIComponent(session.csrfToken)}; Path=/; SameSite=Lax; Max-Age=${14 * 24 * 3600}${secureFlag}`,
    ],
  };
}

function buildClearSessionHeaders() {
  return {
    'Set-Cookie': [
      'tolkflow_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
      'tolkflow_csrf=; Path=/; SameSite=Lax; Max-Age=0',
    ],
  };
}

/**
 * Shared HTTP route handler used identically by both Vite dev server and production server.cjs
 * Returns true if the request path matched and was handled, false otherwise.
 */
async function handleAuthAndAdminHttp({
  req,
  res,
  pathname,
  searchParams,
  readBody,
  isLegacyOwnerAuth,
  syncLegacyUsers,
  authService: providedAuthService,
}) {
  const authService = providedAuthService || getSharedAuthService();
  const clientIp = getClientIp(req);

  const isAuthorizedAdmin = () => {
    if (typeof isLegacyOwnerAuth === 'function' && isLegacyOwnerAuth()) {
      return { ok: true, actor: 'owner' };
    }
    const check = authService.authenticateRequest(req);
    if (!check.ok) return { ok: false, status: check.status, error: check.error };
    if (check.user.role !== 'superadmin' && check.user.role !== 'moderator') {
      return { ok: false, status: 403, error: 'Access Denied: Administrator privileges required.' };
    }
    return { ok: true, actor: check.user.id };
  };

  // 1. Email Delivery Service Status (never exposes secrets)
  if (pathname === '/api/auth/email-status' && req.method === 'GET') {
    sendJson(res, 200, { success: true, ...authService.getEmailDeliveryStatus() });
    return true;
  }

  // 2. Register Unverified User + Generate Hashed 6-digit OTP + Dispatch Real Email
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await readBody();
    const result = await authService.registerUser(body, clientIp);
    if (result.status === 201 && typeof syncLegacyUsers === 'function') {
      syncLegacyUsers(result.body.user);
    }
    sendJson(res, result.status, result.body);
    return true;
  }

  // 3. Verify 6-Digit OTP (Atomic DB transaction -> sets account_status='verified' + issues session)
  if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    const body = await readBody();
    const result = await authService.verifyEmailOtp(body, clientIp);
    if (result.status === 200 && typeof syncLegacyUsers === 'function') {
      syncLegacyUsers(result.body.user);
    }
    const headers = result.setSessionCookies ? buildSessionCookieHeaders(result.setSessionCookies) : {};
    sendJson(res, result.status, result.body, headers);
    return true;
  }

  // 4. Resend 6-Digit OTP (60s cooldown, invalidates old OTPs)
  if (pathname === '/api/auth/resend-otp' && req.method === 'POST') {
    const body = await readBody();
    const result = await authService.resendVerificationOtp(body, clientIp);
    sendJson(res, result.status, result.body);
    return true;
  }

  // 5. Change Email Before Verification (Updates unverified user email & sends fresh OTP)
  if (pathname === '/api/auth/change-email' && req.method === 'POST') {
    const body = await readBody();
    const result = await authService.changeUnverifiedEmail(body, clientIp);
    sendJson(res, result.status, result.body);
    return true;
  }

  // 6. Login (Blocks unverified & suspended accounts cleanly)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody();
    const result = await authService.loginUser(body, clientIp);
    const headers = result.setSessionCookies ? buildSessionCookieHeaders(result.setSessionCookies) : {};
    sendJson(res, result.status, result.body, headers);
    return true;
  }

  // 7. Logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const result = authService.logoutSession(req);
    sendJson(res, result.status, result.body, buildClearSessionHeaders());
    return true;
  }

  // 8. Protected Current User Session Check (Strictly rejects unverified/suspended/unauthenticated requests)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const auth = authService.authenticateRequest(req);
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    sendJson(res, 200, { success: true, user: auth.user, csrfToken: auth.csrfToken });
    return true;
  }

  // 9. Admin Verification & User Governance Endpoints
  if (pathname === '/api/admin/verifications' && req.method === 'GET') {
    const adminCheck = isAuthorizedAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, error: adminCheck.error });
      return true;
    }
    const verification = searchParams?.get('verification') || 'all';
    const q = searchParams?.get('q') || '';
    const result = authService.listAdminUsers({ verification, q });
    sendJson(res, 200, { success: true, ...result });
    return true;
  }

  if (pathname === '/api/admin/users' && req.method === 'GET') {
    const adminCheck = isAuthorizedAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, error: adminCheck.error });
      return true;
    }
    const verification = searchParams?.get('verification') || 'all';
    const q = searchParams?.get('q') || '';
    const result = authService.listAdminUsers({ verification, q });
    sendJson(res, 200, { success: true, ...result });
    return true;
  }

  if (pathname === '/api/admin/users/action' && req.method === 'POST') {
    const adminCheck = isAuthorizedAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, error: adminCheck.error });
      return true;
    }
    const body = await readBody();
    const result = authService.applyAdminUserAction(body, clientIp);
    if (result.status === 200 && result.body.user && typeof syncLegacyUsers === 'function') {
      syncLegacyUsers(result.body.user);
    }
    sendJson(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleAuthAndAdminHttp,
};
