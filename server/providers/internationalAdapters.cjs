const crypto = require('node:crypto');

function createStripeAdapter({ fetchFn = fetch, timeoutMs = 12000, configOverride = {} } = {}) {
  function getConfig() {
    const secretKey = (configOverride.secretKey ?? process.env.STRIPE_SECRET_KEY ?? '').trim();
    const webhookSecret = (configOverride.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
    const missingEnv = [];
    if (!secretKey) missingEnv.push('STRIPE_SECRET_KEY');
    return {
      secretKey,
      webhookSecret,
      mode: secretKey.startsWith('sk_live_') ? 'production' : 'sandbox',
      configured: Boolean(secretKey),
      missingEnv,
    };
  }

  function getStatus() {
    const cfg = getConfig();
    return {
      code: 'stripe_cards',
      name: 'Visa / Mastercard (International Cards)',
      adapterType: 'card',
      mode: cfg.mode,
      configured: cfg.configured,
      connectionStatus: cfg.configured ? 'connected' : 'missing_credentials',
      missingEnv: cfg.missingEnv,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'NGN'],
    };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchFn(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error('Stripe gateway timed out.');
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function initiatePayment({ referenceId, amount, currency, customerEmail, serviceName, successUrl, cancelUrl }) {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error('Stripe card gateway is not configured (STRIPE_SECRET_KEY missing).');
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      err.missingEnv = cfg.missingEnv;
      throw err;
    }

    const curr = String(currency || 'USD').toLowerCase();
    const zeroDecimal = ['rwf', 'ugx', 'jpy'].includes(curr);
    const unitAmount = zeroDecimal ? Math.round(Number(amount)) : Math.round(Number(amount) * 100);
    const appBase = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl || `${appBase}/?payment_ref=${encodeURIComponent(referenceId)}&status=success`);
    params.set('cancel_url', cancelUrl || `${appBase}/?payment_ref=${encodeURIComponent(referenceId)}&status=cancelled`);
    params.set('client_reference_id', referenceId);
    if (customerEmail) params.set('customer_email', customerEmail);
    params.set('line_items[0][price_data][currency]', curr);
    params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
    params.set('line_items[0][price_data][product_data][name]', serviceName || 'TOLKFLOW Plan');
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[transaction_ref]', referenceId);

    const res = await fetchWithTimeout('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': referenceId,
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const err = new Error(data?.error?.message || `Stripe checkout failed (${res.status})`);
      err.code = 'STRIPE_INITIATE_FAILED';
      err.statusCode = 502;
      throw err;
    }

    return {
      status: 'pending',
      rawStatus: data.payment_status || 'unpaid',
      externalReference: data.id,
      checkoutUrl: data.url || '',
      maskedIdentifier: customerEmail || 'Visa / Mastercard Checkout',
    };
  }

  async function verifyStatus(externalReference) {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error('Stripe secret key not configured.');
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      throw err;
    }

    const res = await fetchWithTimeout(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(externalReference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${cfg.secretKey}` },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `Stripe verify failed (${res.status})`);
      err.code = res.status === 404 ? 'INVALID_REFERENCE' : 'STRIPE_VERIFY_FAILED';
      err.statusCode = res.status === 404 ? 404 : 502;
      throw err;
    }

    if (data.payment_status === 'paid') {
      return {
        status: 'successful',
        rawStatus: 'paid',
        externalReference: data.payment_intent || data.id,
        reason: '',
      };
    }
    if (data.status === 'expired') {
      return {
        status: 'failed',
        rawStatus: 'expired',
        externalReference: data.id,
        reason: 'Checkout session expired.',
      };
    }
    return {
      status: 'pending',
      rawStatus: data.payment_status || data.status || 'open',
      externalReference: data.id,
      reason: '',
    };
  }

  function verifyWebhook(headers = {}, rawBody = '') {
    const cfg = getConfig();
    if (!cfg.webhookSecret) return false;
    const sigHeader = String(headers['stripe-signature'] || '');
    const parts = Object.fromEntries(
      sigHeader.split(',').map((kv) => {
        const idx = kv.indexOf('=');
        return idx > 0 ? [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()] : ['', ''];
      })
    );
    if (!parts.t || !parts.v1) return false;
    const signedPayload = `${parts.t}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;
    const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(signedPayload).digest('hex');
    const a = Buffer.from(parts.v1);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async function refundPayment({ externalReference, amount, currency }) {
    const cfg = getConfig();
    if (!cfg.configured) {
      return { ok: false, error: 'STRIPE_SECRET_KEY missing; cannot execute remote Stripe refund.' };
    }
    const params = new URLSearchParams();
    if (String(externalReference).startsWith('pi_')) {
      params.set('payment_intent', externalReference);
    } else {
      params.set('charge', externalReference);
    }
    if (amount) {
      const zeroDecimal = ['rwf', 'ugx'].includes(String(currency || '').toLowerCase());
      params.set('amount', String(zeroDecimal ? Math.round(amount) : Math.round(amount * 100)));
    }

    const res = await fetchWithTimeout('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `Stripe refund error (${res.status})` };
    }
    return { ok: true, externalRefundId: data.id };
  }

  return {
    code: 'stripe_cards',
    getStatus,
    initiatePayment,
    verifyStatus,
    verifyWebhook,
    refundPayment,
  };
}

function createPayPalAdapter({ fetchFn = fetch, timeoutMs = 12000, configOverride = {} } = {}) {
  function getConfig() {
    const env = (configOverride.env ?? process.env.PAYPAL_ENV ?? 'sandbox').trim();
    const clientId = (configOverride.clientId ?? process.env.PAYPAL_CLIENT_ID ?? '').trim();
    const clientSecret = (configOverride.clientSecret ?? process.env.PAYPAL_CLIENT_SECRET ?? '').trim();
    const webhookId = (configOverride.webhookId ?? process.env.PAYPAL_WEBHOOK_ID ?? '').trim();
    const baseUrl = env === 'live' || env === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const missingEnv = [];
    if (!clientId) missingEnv.push('PAYPAL_CLIENT_ID');
    if (!clientSecret) missingEnv.push('PAYPAL_CLIENT_SECRET');
    return {
      mode: env === 'live' || env === 'production' ? 'production' : 'sandbox',
      baseUrl,
      clientId,
      clientSecret,
      webhookId,
      configured: missingEnv.length === 0,
      missingEnv,
    };
  }

  function getStatus() {
    const cfg = getConfig();
    return {
      code: 'paypal',
      name: 'PayPal Global Checkout',
      adapterType: 'wallet',
      mode: cfg.mode,
      configured: cfg.configured,
      connectionStatus: cfg.configured ? 'connected' : 'missing_credentials',
      missingEnv: cfg.missingEnv,
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
    };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchFn(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error('PayPal gateway timed out.');
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getAccessToken() {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error('PayPal credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).');
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      err.missingEnv = cfg.missingEnv;
      throw err;
    }
    const creds = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
    const res = await fetchWithTimeout(`${cfg.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const err = new Error(data.error_description || `PayPal OAuth failed (${res.status})`);
      err.code = 'PAYPAL_OAUTH_FAILED';
      err.statusCode = 502;
      throw err;
    }
    return { accessToken: data.access_token, cfg };
  }

  async function initiatePayment({ referenceId, amount, currency, serviceName }) {
    const { accessToken, cfg } = await getAccessToken();
    const appBase = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const res = await fetchWithTimeout(`${cfg.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': referenceId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: referenceId,
            description: serviceName || 'TOLKFLOW Plan',
            amount: {
              currency_code: String(currency || 'USD').toUpperCase(),
              value: Number(amount).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${appBase}/?payment_ref=${encodeURIComponent(referenceId)}&status=success`,
          cancel_url: `${appBase}/?payment_ref=${encodeURIComponent(referenceId)}&status=cancelled`,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const err = new Error(data.message || `PayPal order creation failed (${res.status})`);
      err.code = 'PAYPAL_INITIATE_FAILED';
      err.statusCode = 502;
      throw err;
    }

    const approveLink = Array.isArray(data.links)
      ? data.links.find((l) => l.rel === 'approve')?.href || ''
      : '';

    return {
      status: 'pending',
      rawStatus: data.status || 'CREATED',
      externalReference: data.id,
      checkoutUrl: approveLink,
      maskedIdentifier: 'PayPal Account',
    };
  }

  async function verifyStatus(externalReference) {
    const { accessToken, cfg } = await getAccessToken();
    const res = await fetchWithTimeout(
      `${cfg.baseUrl}/v2/checkout/orders/${encodeURIComponent(externalReference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || `PayPal status check failed (${res.status})`);
      err.code = res.status === 404 ? 'INVALID_REFERENCE' : 'PAYPAL_VERIFY_FAILED';
      err.statusCode = res.status === 404 ? 404 : 502;
      throw err;
    }

    const raw = String(data.status || 'CREATED').toUpperCase();
    if (raw === 'COMPLETED') {
      return { status: 'successful', rawStatus: raw, externalReference: data.id, reason: '' };
    }
    if (raw === 'VOIDED' || raw === 'DECLINED') {
      return { status: 'failed', rawStatus: raw, externalReference: data.id, reason: `PayPal order ${raw}` };
    }
    return { status: 'pending', rawStatus: raw, externalReference: data.id, reason: '' };
  }

  function verifyWebhook(headers = {}, rawBody = '') {
    const cfg = getConfig();
    if (!cfg.webhookId) return false;
    const sig = String(headers['paypal-transmission-sig'] || headers['x-paypal-hmac'] || '');
    if (!sig) return false;
    const expected = crypto
      .createHmac('sha256', cfg.webhookId)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  return {
    code: 'paypal',
    getStatus,
    initiatePayment,
    verifyStatus,
    verifyWebhook,
  };
}

function createFlutterwaveAdapter({ fetchFn = fetch, timeoutMs = 12000, configOverride = {} } = {}) {
  function getConfig() {
    const secretKey = (configOverride.secretKey ?? process.env.FLUTTERWAVE_SECRET_KEY ?? '').trim();
    const webhookHash = (configOverride.webhookHash ?? process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '').trim();
    const missingEnv = [];
    if (!secretKey) missingEnv.push('FLUTTERWAVE_SECRET_KEY');
    return {
      secretKey,
      webhookHash,
      mode: secretKey.startsWith('FLWSECK_TEST') ? 'sandbox' : 'production',
      configured: Boolean(secretKey),
      missingEnv,
    };
  }

  function getStatus() {
    const cfg = getConfig();
    return {
      code: 'flutterwave_africa',
      name: 'Flutterwave Regional Mobile & Cards',
      adapterType: 'regional_gateway',
      mode: cfg.mode,
      configured: cfg.configured,
      connectionStatus: cfg.configured ? 'connected' : 'missing_credentials',
      missingEnv: cfg.missingEnv,
      supportedCurrencies: ['RWF', 'KES', 'UGX', 'NGN', 'USD', 'EUR'],
    };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchFn(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error('Flutterwave gateway timed out.');
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function initiatePayment({ referenceId, amount, currency, customerEmail, customerName, phoneNumber, serviceName }) {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error('Flutterwave gateway is not configured (FLUTTERWAVE_SECRET_KEY missing).');
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      err.missingEnv = cfg.missingEnv;
      throw err;
    }

    const appBase = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const res = await fetchWithTimeout('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: referenceId,
        amount: Number(amount),
        currency: String(currency || 'USD').toUpperCase(),
        redirect_url: `${appBase}/?payment_ref=${encodeURIComponent(referenceId)}`,
        customer: {
          email: customerEmail || 'customer@tolkflow.io',
          phonenumber: phoneNumber || '',
          name: customerName || 'TOLKFLOW Member',
        },
        customizations: {
          title: 'TOLKFLOW Payment',
          description: serviceName || 'TOLKFLOW Subscription',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== 'success') {
      const err = new Error(data.message || `Flutterwave initialization failed (${res.status})`);
      err.code = 'FLW_INITIATE_FAILED';
      err.statusCode = 502;
      throw err;
    }

    return {
      status: 'pending',
      rawStatus: 'CREATED',
      externalReference: referenceId,
      checkoutUrl: data?.data?.link || '',
      maskedIdentifier: customerEmail || phoneNumber || 'Flutterwave Checkout',
    };
  }

  async function verifyStatus(externalReference) {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error('Flutterwave secret key missing.');
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      throw err;
    }
    const res = await fetchWithTimeout(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(externalReference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${cfg.secretKey}` },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || `Flutterwave verify failed (${res.status})`);
      err.code = res.status === 404 ? 'INVALID_REFERENCE' : 'FLW_VERIFY_FAILED';
      err.statusCode = res.status === 404 ? 404 : 502;
      throw err;
    }

    const st = String(data?.data?.status || '').toLowerCase();
    if (st === 'successful') {
      return { status: 'successful', rawStatus: 'successful', externalReference: String(data.data.id || externalReference), reason: '' };
    }
    if (st === 'failed' || st === 'cancelled') {
      return { status: st, rawStatus: st, externalReference, reason: data.data?.processor_response || 'Payment failed' };
    }
    return { status: 'pending', rawStatus: st || 'pending', externalReference, reason: '' };
  }

  function verifyWebhook(headers = {}) {
    const cfg = getConfig();
    if (!cfg.webhookHash) return false;
    const incoming = String(headers['verif-hash'] || '');
    const a = Buffer.from(incoming);
    const b = Buffer.from(cfg.webhookHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  return {
    code: 'flutterwave_africa',
    getStatus,
    initiatePayment,
    verifyStatus,
    verifyWebhook,
  };
}

module.exports = {
  createStripeAdapter,
  createPayPalAdapter,
  createFlutterwaveAdapter,
};
