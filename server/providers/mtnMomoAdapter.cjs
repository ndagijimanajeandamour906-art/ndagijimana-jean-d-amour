const crypto = require('node:crypto');

function normalizeRwandaMsisdn(rawPhone) {
  const digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('250') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('07') && digits.length === 10) {
    return `250${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `250${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

function maskPhoneNumber(msisdn) {
  const clean = String(msisdn || '').replace(/[^\d+]/g, '');
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 5)}****${clean.slice(-3)}`;
}

function createMtnMomoAdapter({ fetchFn = fetch, timeoutMs = 12000, configOverride = {} } = {}) {
  let cachedToken = null;
  let cachedTokenExpiresAtMs = 0;

  function getConfig() {
    const env = (configOverride.env ?? process.env.MTN_MOMO_ENV ?? 'sandbox').trim();
    const baseUrl = (
      configOverride.baseUrl ??
      process.env.MTN_MOMO_BASE_URL ??
      (env === 'mtnrwanda' ? 'https://proxy.momoapi.mtn.com' : 'https://sandbox.momodeveloper.mtn.com')
    )
      .trim()
      .replace(/\/+$/, '');
    const subscriptionKey = (configOverride.subscriptionKey ?? process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? '').trim();
    const apiUser = (configOverride.apiUser ?? process.env.MTN_MOMO_API_USER ?? '').trim();
    const apiKey = (configOverride.apiKey ?? process.env.MTN_MOMO_API_KEY ?? '').trim();
    const targetEnvironment = (
      configOverride.targetEnvironment ??
      process.env.MTN_MOMO_TARGET_ENVIRONMENT ??
      (env === 'mtnrwanda' ? 'mtnrwanda' : 'sandbox')
    ).trim();
    const callbackUrl = (
      configOverride.callbackUrl ??
      process.env.MTN_MOMO_CALLBACK_URL ??
      `${(process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/api/payments/mtn/callback`
    ).trim();
    const callbackSecret = (configOverride.callbackSecret ?? process.env.MTN_MOMO_CALLBACK_SECRET ?? '').trim();

    const missingEnv = [];
    if (!subscriptionKey) missingEnv.push('MTN_MOMO_SUBSCRIPTION_KEY');
    if (!apiUser) missingEnv.push('MTN_MOMO_API_USER');
    if (!apiKey) missingEnv.push('MTN_MOMO_API_KEY');

    return {
      env,
      mode: env === 'mtnrwanda' || env === 'production' ? 'production' : 'sandbox',
      baseUrl,
      subscriptionKey,
      apiUser,
      apiKey,
      targetEnvironment,
      callbackUrl,
      callbackSecret,
      configured: missingEnv.length === 0,
      missingEnv,
    };
  }

  function getStatus() {
    const cfg = getConfig();
    return {
      code: 'mtn_momo_rw',
      name: 'MTN Mobile Money (Rwanda)',
      adapterType: 'mobile_money',
      mode: cfg.mode,
      targetEnvironment: cfg.targetEnvironment,
      configured: cfg.configured,
      connectionStatus: cfg.configured ? 'connected' : 'missing_credentials',
      missingEnv: cfg.missingEnv,
      supportedCurrencies: cfg.mode === 'production' ? ['RWF'] : ['RWF', 'EUR'],
    };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error('MTN MoMo API request timed out while waiting for gateway confirmation.');
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getAccessToken(forceRefresh = false) {
    const cfg = getConfig();
    if (!cfg.configured) {
      const err = new Error(
        `MTN MoMo Collections API credentials are not configured (${cfg.missingEnv.join(', ')}).`
      );
      err.code = 'PROVIDER_UNCONFIGURED';
      err.statusCode = 503;
      err.missingEnv = cfg.missingEnv;
      throw err;
    }

    const nowMs = Date.now();
    if (!forceRefresh && cachedToken && nowMs < cachedTokenExpiresAtMs - 30000) {
      return cachedToken;
    }

    const basicCreds = Buffer.from(`${cfg.apiUser}:${cfg.apiKey}`).toString('base64');
    const res = await fetchWithTimeout(`${cfg.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicCreds}`,
        'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const err = new Error(data.message || data.error || `MTN MoMo OAuth token failed (${res.status})`);
      err.code = 'MTN_OAUTH_FAILED';
      err.statusCode = 502;
      throw err;
    }

    const expiresInSec = Number(data.expires_in || 3600);
    cachedToken = data.access_token;
    cachedTokenExpiresAtMs = nowMs + expiresInSec * 1000;
    return cachedToken;
  }

  async function initiatePayment({
    referenceId,
    amount,
    currency,
    phoneNumber,
    externalId,
    payerMessage = 'TOLKFLOW Subscription Payment',
    payeeNote = 'TOLKFLOW Services',
  }) {
    const cfg = getConfig();
    const msisdn = normalizeRwandaMsisdn(phoneNumber);
    if (!msisdn) {
      const err = new Error('Valid MTN Mobile Money phone number is required (e.g. +250788123456 or 0788123456).');
      err.code = 'INVALID_PHONE_NUMBER';
      err.statusCode = 400;
      throw err;
    }

    const momoRefId = referenceId || crypto.randomUUID();
    const accessToken = await getAccessToken();

    // MTN MoMo Sandbox strictly accepts EUR unless using live mtnrwanda RWF merchant account
    const providerCurrency =
      cfg.targetEnvironment === 'sandbox' && String(currency).toUpperCase() === 'RWF'
        ? String(process.env.MTN_SANDBOX_FORCE_EUR === 'true' ? 'EUR' : 'RWF')
        : String(currency || 'RWF').toUpperCase();

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'X-Reference-Id': momoRefId,
      'X-Target-Environment': cfg.targetEnvironment,
      'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
      'Content-Type': 'application/json',
    };

    if (cfg.callbackUrl && /^https?:\/\//i.test(cfg.callbackUrl)) {
      headers['X-Callback-Url'] = cfg.callbackUrl;
    }

    const payload = {
      amount: String(Math.round(Number(amount) * 100) / 100),
      currency: providerCurrency,
      externalId: String(externalId || momoRefId),
      payer: {
        partyIdType: 'MSISDN',
        partyId: msisdn,
      },
      payerMessage: String(payerMessage).slice(0, 140),
      payeeNote: String(payeeNote).slice(0, 140),
    };

    const res = await fetchWithTimeout(`${cfg.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status !== 202 && !res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const err = new Error(
        errBody?.message || `MTN RequestToPay rejected (${res.status})`
      );
      err.code = 'MTN_REQUEST_REJECTED';
      err.statusCode = res.status >= 400 && res.status < 500 ? 400 : 502;
      throw err;
    }

    // Critical security guarantee: Never return 'successful' on initial 202 Accepted!
    return {
      status: 'pending',
      rawStatus: 'ACCEPTED',
      externalReference: momoRefId,
      maskedIdentifier: maskPhoneNumber(msisdn),
      providerCurrency,
      message: 'MTN MoMo payment prompt dispatched. Waiting for customer PIN confirmation on phone.',
    };
  }

  async function verifyStatus(externalReference) {
    const cfg = getConfig();
    if (!externalReference) {
      const err = new Error('Missing MTN MoMo reference ID.');
      err.code = 'INVALID_REFERENCE';
      err.statusCode = 400;
      throw err;
    }

    const accessToken = await getAccessToken();
    const res = await fetchWithTimeout(
      `${cfg.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(externalReference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Target-Environment': cfg.targetEnvironment,
          'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
        },
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.message || `MTN status verification failed (${res.status})`);
      err.code = res.status === 404 ? 'INVALID_REFERENCE' : 'MTN_VERIFY_FAILED';
      err.statusCode = res.status === 404 ? 404 : 502;
      throw err;
    }

    const rawStatus = String(data.status || 'PENDING').toUpperCase();
    if (rawStatus === 'SUCCESSFUL') {
      return {
        status: 'successful',
        rawStatus,
        externalReference: data.financialTransactionId || externalReference,
        reason: '',
      };
    }

    if (rawStatus === 'PENDING' || rawStatus === 'CREATED') {
      return {
        status: 'pending',
        rawStatus,
        externalReference,
        reason: '',
      };
    }

    const reasonText =
      typeof data.reason === 'object'
        ? data.reason?.message || data.reason?.code || rawStatus
        : data.reason || `Payment ${rawStatus.toLowerCase()} by MTN MoMo`;

    return {
      status: rawStatus === 'CANCELLED' ? 'cancelled' : 'failed',
      rawStatus,
      externalReference,
      reason: String(reasonText),
    };
  }

  function verifyCallbackSignature(headers = {}, rawBody = '') {
    const cfg = getConfig();
    if (!cfg.callbackSecret) {
      // Without a shared callback secret configured, callbacks are authenticated by re-querying MTN Collections GET /requesttopay/:id
      return { signatureValid: false, requiresRemoteVerify: true };
    }

    const sigHeader = String(
      headers['x-mtn-callback-signature'] || headers['x-callback-signature'] || ''
    ).trim();
    const tokenHeader = String(headers['x-callback-secret'] || '').trim();

    if (tokenHeader) {
      const a = Buffer.from(tokenHeader);
      const b = Buffer.from(cfg.callbackSecret);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      return { signatureValid: ok, requiresRemoteVerify: true };
    }

    if (sigHeader) {
      const expected = crypto
        .createHmac('sha256', cfg.callbackSecret)
        .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}))
        .digest('hex');
      const a = Buffer.from(sigHeader.replace(/^sha256=/i, ''));
      const b = Buffer.from(expected);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      return { signatureValid: ok, requiresRemoteVerify: true };
    }

    return { signatureValid: false, rejected: true };
  }

  return {
    code: 'mtn_momo_rw',
    getStatus,
    getAccessToken,
    initiatePayment,
    verifyStatus,
    verifyCallbackSignature,
    normalizeRwandaMsisdn,
  };
}

module.exports = {
  createMtnMomoAdapter,
  normalizeRwandaMsisdn,
  maskPhoneNumber,
};
