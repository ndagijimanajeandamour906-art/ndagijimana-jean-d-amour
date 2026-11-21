const { getSharedAuthService } = require('./authService.cjs');
const { getSharedPaymentService } = require('./paymentService.cjs');

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

function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let json = {};
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = {};
        }
      }
      resolve({ raw, json });
    });
    req.on('error', () => resolve({ raw: '', json: {} }));
  });
}

async function handlePaymentHttp({
  req,
  res,
  pathname,
  searchParams,
  readBody,
  isLegacyOwnerAuth,
  paymentService: providedPaymentService,
  authService: providedAuthService,
  onUserSubscriptionActivated,
}) {
  const paymentService = providedPaymentService || getSharedPaymentService();
  const authService = providedAuthService || getSharedAuthService();
  const clientIp = getClientIp(req);

  const authenticateCustomer = () => {
    // Allow authenticated DB session user OR verified legacy owner token
    const authRes = authService.authenticateRequest(req);
    if (authRes.ok) {
      return { ok: true, user: authRes.user, isAdmin: authRes.user.role === 'superadmin' || authRes.user.role === 'moderator' };
    }
    if (typeof isLegacyOwnerAuth === 'function' && isLegacyOwnerAuth()) {
      return {
        ok: true,
        user: {
          id: 'user_damour',
          name: 'Jean Damour Ndagijimana',
          email: 'ndagijimanajeandamour906@gmail.com',
          country: 'Rwanda',
          role: 'superadmin',
        },
        isAdmin: true,
      };
    }
    return { ok: false, status: authRes.status || 401, code: authRes.code || 'UNAUTHORIZED', error: authRes.error || 'Authentication required.' };
  };

  const authenticateAdmin = () => {
    if (typeof isLegacyOwnerAuth === 'function' && isLegacyOwnerAuth()) {
      return {
        ok: true,
        actor: { id: 'owner_davd', name: 'DAVD Owner', role: 'superadmin' },
      };
    }
    const authRes = authService.authenticateRequest(req);
    if (!authRes.ok) {
      return { ok: false, status: authRes.status || 401, code: authRes.code || 'UNAUTHORIZED', error: authRes.error };
    }
    if (authRes.user.role !== 'superadmin' && authRes.user.role !== 'moderator') {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        error: 'Access Denied: Financial administration requires superadmin or moderator privileges.',
      };
    }
    return { ok: true, actor: authRes.user };
  };

  try {
  // 1. Public Available Payment Methods & Verified FX Rates (never exposes API credentials)
  if (pathname === '/api/payments/methods' && req.method === 'GET') {
    const country = searchParams?.get('country') || 'Rwanda';
    const result = await paymentService.listAvailableMethods({ country });
    sendJson(res, 200, { success: true, ...result });
    return true;
  }

  // 2. Customer's Own Payment History & Subscription
  if (pathname === '/api/payments/my' && req.method === 'GET') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const data = paymentService.listUserPayments(auth.user.id);
    sendJson(res, 200, { success: true, ...data });
    return true;
  }

  // 3. Create Unified Payment
  if (pathname === '/api/payments/create' && req.method === 'POST') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const body = await readBody();
    const resObj = await paymentService.initiateUnifiedPayment(body, { actor: auth.user, ip: clientIp });
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 4. MTN MoMo Request to Pay
  if (pathname === '/api/payments/mtn/request' && req.method === 'POST') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const body = await readBody();
    const resObj = await paymentService.initiateUnifiedPayment(
      { ...body, providerCode: 'mtn_momo_rw' },
      { actor: auth.user, ip: clientIp }
    );
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 5. International Payment Create (Stripe / PayPal / Flutterwave)
  if (pathname === '/api/payments/international/create' && req.method === 'POST') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const body = await readBody();
    const providerCode = String(body.providerCode || body.provider || 'stripe_cards').trim();
    if (providerCode === 'mtn_momo_rw') {
      sendJson(res, 400, { success: false, code: 'INVALID_ROUTE', error: 'Use /api/payments/mtn/request for MTN MoMo.' });
      return true;
    }
    const resObj = await paymentService.initiateUnifiedPayment(
      { ...body, providerCode },
      { actor: auth.user, ip: clientIp }
    );
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 6. Transaction Status Verification (GET /api/payments/status/:id)
  if (pathname.startsWith('/api/payments/status/') && req.method === 'GET') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const id = decodeURIComponent(pathname.slice('/api/payments/status/'.length)).trim();
    if (!id) {
      sendJson(res, 400, { success: false, code: 'MISSING_REFERENCE', error: 'Transaction ID is required.' });
      return true;
    }
    const resObj = await paymentService.verifyAndGetPaymentStatus(id, {
      actor: auth.user,
      isAdmin: auth.isAdmin,
    });
    if (resObj.body?.payment?.status === 'successful' && typeof onUserSubscriptionActivated === 'function') {
      onUserSubscriptionActivated(resObj.body.payment);
    }
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 7. Payment Receipt Endpoint (GET /api/payments/receipt/:id)
  if (pathname.startsWith('/api/payments/receipt/') && req.method === 'GET') {
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const id = decodeURIComponent(pathname.slice('/api/payments/receipt/'.length)).trim();
    const resObj = await paymentService.verifyAndGetPaymentStatus(id, {
      actor: auth.user,
      isAdmin: auth.isAdmin,
    });
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 8. MTN MoMo Callback / Webhook (POST /api/payments/mtn/callback)
  if (pathname === '/api/payments/mtn/callback' && (req.method === 'POST' || req.method === 'PUT')) {
    const { raw, json } = await readRawBody(req);
    const resObj = await paymentService.handleMtnCallback({
      headers: req.headers,
      rawBody: raw,
      body: json,
      ip: clientIp,
    });
    if (resObj.body?.payment?.status === 'successful' && typeof onUserSubscriptionActivated === 'function') {
      onUserSubscriptionActivated(resObj.body.payment);
    }
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 9. International Provider Webhook (POST /api/payments/international/webhook)
  if (pathname === '/api/payments/international/webhook' && req.method === 'POST') {
    const { raw, json } = await readRawBody(req);
    const providerCode = searchParams?.get('provider') || '';
    const resObj = await paymentService.handleInternationalWebhook({
      providerCode,
      headers: req.headers,
      rawBody: raw,
      body: json,
      ip: clientIp,
    });
    if (resObj.body?.payment?.status === 'successful' && typeof onUserSubscriptionActivated === 'function') {
      onUserSubscriptionActivated(resObj.body.payment);
    }
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  // 10. Live Customer Payment Status SSE Stream (GET /api/payments/stream/:id)
  if (pathname.startsWith('/api/payments/stream/') && req.method === 'GET') {
    const tokenParam = searchParams?.get('token') || '';
    if (tokenParam && !req.headers['authorization']) {
      req.headers['authorization'] = `Bearer ${tokenParam}`;
    }
    const auth = authenticateCustomer();
    if (!auth.ok) {
      sendJson(res, auth.status, { success: false, code: auth.code, error: auth.error });
      return true;
    }
    const id = decodeURIComponent(pathname.slice('/api/payments/stream/'.length)).trim();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSse = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const initial = await paymentService.verifyAndGetPaymentStatus(id, {
      actor: auth.user,
      isAdmin: auth.isAdmin,
    });
    sendSse('payment:snapshot', initial.body);

    const unsubscribe = paymentService.subscribeEvents((evt) => {
      const p = evt?.payload?.payment;
      if (p && (p.id === id || p.transactionRef === id || p.externalReference === id)) {
        sendSse(evt.type, evt.payload);
      }
    });

    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    return true;
  }

  // 11. Admin Financial SSE Real-Time Stream (GET /api/admin/payments/stream)
  if (pathname === '/api/admin/payments/stream' && req.method === 'GET') {
    const tokenParam = searchParams?.get('token') || '';
    const isLegacyQueryToken =
      tokenParam &&
      typeof isLegacyOwnerAuth === 'function' &&
      (() => {
        req.headers['authorization'] = `Bearer ${tokenParam}`;
        return isLegacyOwnerAuth();
      })();
    if (tokenParam && !req.headers['authorization']) {
      req.headers['authorization'] = `Bearer ${tokenParam}`;
    }
    const adminCheck = isLegacyQueryToken
      ? { ok: true, actor: { id: 'owner_davd', role: 'superadmin' } }
      : authenticateAdmin();

    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, code: adminCheck.code, error: adminCheck.error });
      return true;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSse = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendSse('revenue:snapshot', paymentService.listAdminPayments({}));

    const unsubscribe = paymentService.subscribeEvents((evt) => {
      sendSse(evt.type, evt.payload);
    });

    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    return true;
  }

  // 12. Admin Payments List (GET /api/admin/payments)
  if (pathname === '/api/admin/payments' && req.method === 'GET') {
    const adminCheck = authenticateAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, code: adminCheck.code, error: adminCheck.error });
      return true;
    }
    const result = paymentService.listAdminPayments({
      q: searchParams?.get('q') || '',
      status: searchParams?.get('status') || 'all',
      provider: searchParams?.get('provider') || 'all',
      country: searchParams?.get('country') || 'all',
      dateFrom: searchParams?.get('dateFrom') || '',
      dateTo: searchParams?.get('dateTo') || '',
    });
    sendJson(res, 200, { success: true, ...result });
    return true;
  }

  // 13. Admin Revenue Summary (GET /api/admin/revenue)
  if (pathname === '/api/admin/revenue' && req.method === 'GET') {
    const adminCheck = authenticateAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, code: adminCheck.code, error: adminCheck.error });
      return true;
    }
    const revenue = paymentService.getAdminRevenueSummary();
    sendJson(res, 200, { success: true, revenue });
    return true;
  }

  // 14. Admin Payment Reports Download (GET /api/admin/payment-reports)
  if (pathname === '/api/admin/payment-reports' && req.method === 'GET') {
    const adminCheck = authenticateAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, code: adminCheck.code, error: adminCheck.error });
      return true;
    }
    const report = paymentService.generateFinancialReport({
      format: searchParams?.get('format') || 'csv',
      q: searchParams?.get('q') || '',
      status: searchParams?.get('status') || 'all',
      provider: searchParams?.get('provider') || 'all',
      country: searchParams?.get('country') || 'all',
      dateFrom: searchParams?.get('dateFrom') || '',
      dateTo: searchParams?.get('dateTo') || '',
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.end(report.content);
    return true;
  }

  // 15. Admin Refund Endpoint (POST /api/admin/payments/refund)
  if (pathname === '/api/admin/payments/refund' && req.method === 'POST') {
    const adminCheck = authenticateAdmin();
    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { success: false, code: adminCheck.code, error: adminCheck.error });
      return true;
    }
    const body = await readBody();
    const resObj = await paymentService.processRefund({
      paymentId: body.paymentId || body.transactionRef,
      reason: body.reason,
      actor: adminCheck.actor,
      ip: clientIp,
    });
    sendJson(res, resObj.status, resObj.body);
    return true;
  }

  return false;
  } catch (err) {
    if (!res.headersSent) {
      sendJson(res, err?.statusCode || 503, {
        success: false,
        code: err?.code || 'DATABASE_UNAVAILABLE',
        error: err?.message || 'Payment service temporarily unavailable.',
      });
      return true;
    }
    return true;
  }
}

module.exports = {
  handlePaymentHttp,
};
