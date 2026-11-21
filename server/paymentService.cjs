const crypto = require('node:crypto');
const { runInTransaction } = require('./authDb.cjs');
const { getSharedPaymentDb } = require('./paymentDb.cjs');
const { createExchangeRateService } = require('./exchangeRateService.cjs');
const { createMtnMomoAdapter, maskPhoneNumber } = require('./providers/mtnMomoAdapter.cjs');
const {
  createStripeAdapter,
  createPayPalAdapter,
  createFlutterwaveAdapter,
} = require('./providers/internationalAdapters.cjs');

const PLAN_CATALOG = {
  basic: { id: 'basic', name: 'TOLKFLOW Basic Plan', priceUsd: 2.99 },
  standard: { id: 'standard', name: 'TOLKFLOW Standard Plan', priceUsd: 6.99 },
  business: { id: 'business', name: 'TOLKFLOW Business Plan', priceUsd: 14.99 },
};

const FORBIDDEN_SENSITIVE_FIELDS = [
  'cvv',
  'cvc',
  'cvv2',
  'pin',
  'momoPin',
  'cardPin',
  'securityCode',
  'cardNumber',
  'pan',
];

function createPaymentService(options = {}) {
  const getDb = typeof options.getDb === 'function' ? options.getDb : () => options.db || getSharedPaymentDb();
  const getNowMs = typeof options.now === 'function' ? options.now : () => Date.now();
  const fetchFn = options.fetchFn || fetch;

  const adapters = new Map();
  function registerProviderAdapter(adapter) {
    if (!adapter || !adapter.code) {
      throw new Error('Provider adapter must expose a unique code.');
    }
    adapters.set(adapter.code, adapter);
  }

  const mtnAdapter = options.mtnAdapter || createMtnMomoAdapter({ fetchFn, timeoutMs: options.timeoutMs });
  const stripeAdapter = options.stripeAdapter || createStripeAdapter({ fetchFn, timeoutMs: options.timeoutMs });
  const paypalAdapter = options.paypalAdapter || createPayPalAdapter({ fetchFn, timeoutMs: options.timeoutMs });
  const flutterwaveAdapter =
    options.flutterwaveAdapter || createFlutterwaveAdapter({ fetchFn, timeoutMs: options.timeoutMs });

  registerProviderAdapter(mtnAdapter);
  registerProviderAdapter(stripeAdapter);
  registerProviderAdapter(paypalAdapter);
  registerProviderAdapter(flutterwaveAdapter);

  const eventListeners = new Set();
  function subscribeEvents(listener) {
    eventListeners.add(listener);
    return () => eventListeners.delete(listener);
  }

  function emitEvent(type, payload) {
    const eventObj = {
      type,
      timestamp: new Date(getNowMs()).toISOString(),
      payload,
    };
    for (const listener of eventListeners) {
      try {
        listener(eventObj);
      } catch {}
    }
    if (typeof options.onBroadcast === 'function') {
      try {
        options.onBroadcast(eventObj);
      } catch {}
    }
  }

  function getFxService() {
    return createExchangeRateService({ db: getDb(), fetchFn, now: getNowMs });
  }

  function sanitizePaymentRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      transactionRef: row.transaction_ref,
      idempotencyKey: row.idempotency_key || null,
      userId: row.user_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email || '',
      customerPhoneMasked: row.customer_phone_masked || '',
      country: row.country,
      planId: row.plan_id || '',
      serviceName: row.service_name,
      providerCode: row.provider_code,
      paymentMethod: row.payment_method,
      amount: Number(row.amount),
      currency: row.currency,
      amountUsd: Number(row.amount_usd || 0),
      exchangeRate: Number(row.exchange_rate || 1),
      status: row.status,
      externalReference: row.external_reference || '',
      failureReason: row.failure_reason || '',
      verifiedAt: row.verified_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function appendAuditLog(db, { actorId, actorRole, paymentId = null, action, detail, ip = '127.0.0.1' }) {
    try {
      db.prepare(`
        INSERT INTO payment_audit_logs (id, actor_id, actor_role, payment_id, action, detail, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `paud_${crypto.randomUUID()}`,
        actorId || 'system',
        actorRole || 'system',
        paymentId,
        action,
        detail,
        ip,
        new Date(getNowMs()).toISOString()
      );
    } catch {}
  }

  function appendTransactionLedger(db, { paymentId, transactionRef, providerCode, eventType, status, amount, currency, externalReference = '', rawStatus = '', errorMessage = '' }) {
    db.prepare(`
      INSERT INTO payment_transactions (
        id, payment_id, transaction_ref, provider_code, event_type,
        status, amount, currency, external_reference, raw_status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ptx_${crypto.randomUUID()}`,
      paymentId,
      transactionRef,
      providerCode,
      eventType,
      status,
      Number(amount),
      currency,
      externalReference || '',
      rawStatus || '',
      errorMessage || '',
      new Date(getNowMs()).toISOString()
    );
  }

  function assertNoSensitiveCardOrPinData(payload) {
    if (!payload || typeof payload !== 'object') return;
    for (const key of FORBIDDEN_SENSITIVE_FIELDS) {
      if (payload[key] !== undefined && String(payload[key]).trim() !== '') {
        const err = new Error(`Security policy forbids transmitting or storing raw ${key} values directly.`);
        err.code = 'FORBIDDEN_SENSITIVE_FIELD';
        err.statusCode = 400;
        throw err;
      }
    }
  }

  function syncProviderMetadataInDb(db) {
    const nowIso = new Date(getNowMs()).toISOString();
    const stmt = db.prepare(`
      UPDATE payment_providers
      SET mode = ?, connection_status = ?, last_checked_at = ?, updated_at = ?
      WHERE code = ?
    `);
    const statuses = [];
    for (const adapter of adapters.values()) {
      const st = adapter.getStatus();
      statuses.push(st);
      try {
        stmt.run(st.mode, st.connectionStatus, nowIso, nowIso, st.code);
      } catch {}
    }
    return statuses;
  }

  async function listAvailableMethods({ country = 'Rwanda' } = {}) {
    const db = getDb();
    syncProviderMetadataInDb(db);

    const countryNorm = String(country || 'Rwanda').trim().toLowerCase();
    const isRwanda = countryNorm === 'rwanda' || countryNorm === 'rw';
    const rows = db.prepare('SELECT * FROM payment_providers WHERE is_enabled = 1').all();

    const fx = await getFxService().getUsdRates();
    const providers = rows
      .map((row) => {
        const adapter = adapters.get(row.code);
        const liveStatus = adapter ? adapter.getStatus() : null;
        const countries = JSON.parse(row.countries_json || '[]');
        const currencies = JSON.parse(row.supported_currencies_json || '[]');
        const supportsCountry =
          countries.some((c) => String(c).toLowerCase() === countryNorm) ||
          countries.includes('GLOBAL');

        return {
          code: row.code,
          name: row.name,
          adapterType: row.adapter_type,
          region: row.region,
          supportedCurrencies: currencies,
          supportsCountry,
          recommended:
            (isRwanda && row.code === 'mtn_momo_rw') ||
            (!isRwanda && (row.code === 'stripe_cards' || row.code === 'paypal')),
          mode: liveStatus?.mode || row.mode,
          configured: Boolean(liveStatus?.configured),
          connectionStatus: liveStatus?.connectionStatus || row.connection_status,
          missingEnv: liveStatus?.missingEnv || [],
        };
      })
      .filter((p) => p.supportsCountry || p.code === 'stripe_cards');

    providers.sort((a, b) => Number(b.recommended) - Number(a.recommended));

    const currencies = db.prepare('SELECT code, name, symbol, decimals FROM currencies WHERE is_active = 1').all();

    return {
      country,
      isRwanda,
      providers,
      currencies,
      plans: Object.values(PLAN_CATALOG),
      exchangeRates: {
        available: fx.ok,
        baseCurrency: 'USD',
        rates: fx.rates || { USD: 1 },
        source: fx.source || 'unavailable',
        fetchedAt: fx.fetchedAt || null,
        error: fx.ok ? null : fx.error,
      },
    };
  }

  function finalizePaymentSuccess(db, paymentId, verification) {
    const nowIso = new Date(getNowMs()).toISOString();
    const result = runInTransaction(db, () => {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) {
        return { notFound: true };
      }
      if (payment.status === 'successful') {
        return { alreadyFinalized: true, payment: sanitizePaymentRow(payment) };
      }
      if (payment.status === 'refunded') {
        return { alreadyFinalized: true, payment: sanitizePaymentRow(payment) };
      }

      const extRef = verification?.externalReference || payment.external_reference || '';
      db.prepare(`
        UPDATE payments
        SET status = 'successful', external_reference = ?, failure_reason = '', verified_at = ?, updated_at = ?
        WHERE id = ?
      `).run(extRef, nowIso, nowIso, payment.id);

      appendTransactionLedger(db, {
        paymentId: payment.id,
        transactionRef: payment.transaction_ref,
        providerCode: payment.provider_code,
        eventType: 'payment_verified_successful',
        status: 'successful',
        amount: payment.amount,
        currency: payment.currency,
        externalReference: extRef,
        rawStatus: verification?.rawStatus || 'SUCCESSFUL',
      });

      const receiptPayload = {
        receiptType: 'TOLKFLOW_OFFICIAL_PAYMENT_RECEIPT',
        transactionRef: payment.transaction_ref,
        externalReference: extRef,
        providerCode: payment.provider_code,
        paymentMethod: payment.payment_method,
        customerName: payment.customer_name,
        customerEmail: payment.customer_email,
        customerPhoneMasked: payment.customer_phone_masked,
        country: payment.country,
        serviceName: payment.service_name,
        planId: payment.plan_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        amountUsd: Number(payment.amount_usd),
        exchangeRate: Number(payment.exchange_rate),
        paidAt: nowIso,
      };

      db.prepare(`
        UPDATE invoices
        SET status = 'paid', paid_at = ?, receipt_json = ?
        WHERE payment_id = ?
      `).run(nowIso, JSON.stringify(receiptPayload), payment.id);

      // Activate purchased subscription if plan_id is present
      if (payment.plan_id && payment.user_id) {
        const expiresIso = new Date(getNowMs() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(`
          INSERT INTO user_subscriptions (user_id, plan_id, status, last_payment_id, activated_at, expires_at, updated_at)
          VALUES (?, ?, 'active', ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            plan_id = excluded.plan_id,
            status = 'active',
            last_payment_id = excluded.last_payment_id,
            activated_at = excluded.activated_at,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
        `).run(payment.user_id, payment.plan_id, payment.id, nowIso, expiresIso, nowIso);
      }

      appendAuditLog(db, {
        actorId: payment.user_id,
        actorRole: 'system_verifier',
        paymentId: payment.id,
        action: 'PAYMENT_CONFIRMED_SUCCESSFUL',
        detail: `Verified ${payment.provider_code} payment ${payment.transaction_ref} (${payment.amount} ${payment.currency})`,
      });

      const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
      const invoice = db.prepare('SELECT * FROM invoices WHERE payment_id = ?').get(payment.id);

      return {
        alreadyFinalized: false,
        payment: sanitizePaymentRow(updatedPayment),
        invoice: invoice
          ? {
              invoiceNumber: invoice.invoice_number,
              status: invoice.status,
              paidAt: invoice.paid_at,
              receipt: JSON.parse(invoice.receipt_json || '{}'),
            }
          : null,
      };
    });

    if (result && !result.notFound && !result.alreadyFinalized) {
      emitEvent('payment:updated', { payment: result.payment, invoice: result.invoice });
      emitEvent('revenue:updated', getAdminRevenueSummary());
    }

    return result;
  }

  function finalizePaymentFailure(db, paymentId, verification) {
    const nowIso = new Date(getNowMs()).toISOString();
    const targetStatus = verification?.status === 'cancelled' ? 'cancelled' : 'failed';
    const reason = verification?.reason || 'Payment was not completed by the provider.';

    const result = runInTransaction(db, () => {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) return { notFound: true };
      if (payment.status === 'successful' || payment.status === 'refunded') {
        return { alreadyFinalized: true, payment: sanitizePaymentRow(payment) };
      }

      db.prepare(`
        UPDATE payments
        SET status = ?, failure_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(targetStatus, reason, nowIso, payment.id);

      appendTransactionLedger(db, {
        paymentId: payment.id,
        transactionRef: payment.transaction_ref,
        providerCode: payment.provider_code,
        eventType: targetStatus === 'cancelled' ? 'payment_cancelled' : 'payment_failed',
        status: targetStatus,
        amount: payment.amount,
        currency: payment.currency,
        externalReference: verification?.externalReference || payment.external_reference || '',
        rawStatus: verification?.rawStatus || targetStatus.toUpperCase(),
        errorMessage: reason,
      });

      db.prepare(`UPDATE invoices SET status = 'void' WHERE payment_id = ? AND status = 'issued'`).run(payment.id);

      appendAuditLog(db, {
        actorId: payment.user_id,
        actorRole: 'system_verifier',
        paymentId: payment.id,
        action: 'PAYMENT_NOT_COMPLETED',
        detail: `${payment.provider_code} payment ${payment.transaction_ref} marked ${targetStatus}: ${reason}`,
      });

      const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
      return { alreadyFinalized: false, payment: sanitizePaymentRow(updated) };
    });

    if (result && !result.notFound && !result.alreadyFinalized) {
      emitEvent('payment:updated', { payment: result.payment });
      emitEvent('revenue:updated', getAdminRevenueSummary());
    }

    return result;
  }

  async function initiateUnifiedPayment(payload, { actor = null, ip = '127.0.0.1' } = {}) {
    let db;
    try {
      db = getDb();
    } catch (dbErr) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'DATABASE_UNAVAILABLE',
          error: `Database connection error: ${dbErr?.message || 'Unable to reach ledger storage'}`,
        },
      };
    }

    try {
      assertNoSensitiveCardOrPinData(payload);
    } catch (secErr) {
      return { status: secErr.statusCode || 400, body: { success: false, code: secErr.code, error: secErr.message } };
    }

    const providerCode = String(payload.providerCode || payload.provider || '').trim();
    const adapter = adapters.get(providerCode);
    if (!adapter) {
      return {
        status: 400,
        body: { success: false, code: 'UNSUPPORTED_PROVIDER', error: 'Selected payment provider is not registered.' },
      };
    }

    const planId = String(payload.planId || '').trim().toLowerCase();
    const currency = String(payload.currency || (providerCode === 'mtn_momo_rw' ? 'RWF' : 'USD')).trim().toUpperCase();
    const currRow = db.prepare('SELECT * FROM currencies WHERE code = ? AND is_active = 1').get(currency);
    if (!currRow) {
      return { status: 400, body: { success: false, code: 'UNSUPPORTED_CURRENCY', error: `Currency ${currency} is not supported.` } };
    }

    const idempotencyKey = String(payload.idempotencyKey || '').trim() || null;
    if (idempotencyKey) {
      const existing = db.prepare('SELECT * FROM payments WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) {
        return {
          status: 200,
          body: {
            success: true,
            idempotentReplay: true,
            payment: sanitizePaymentRow(existing),
            message: 'Idempotent replay returned existing payment record.',
          },
        };
      }
    }

    let amount = Number(payload.amount || 0);
    let amountUsd = 0;
    let exchangeRate = 1;
    let serviceName = String(payload.serviceName || '').trim();

    const fxService = getFxService();
    if (planId && PLAN_CATALOG[planId]) {
      const plan = PLAN_CATALOG[planId];
      serviceName = serviceName || plan.name;
      const conversion = await fxService.convertFromUsd(plan.priceUsd, currency);
      if (!conversion.ok) {
        return {
          status: 503,
          body: {
            success: false,
            code: conversion.code || 'EXCHANGE_RATE_UNAVAILABLE',
            error: conversion.error,
          },
        };
      }
      amount = conversion.amount;
      amountUsd = plan.priceUsd;
      exchangeRate = conversion.rate;
    } else {
      if (!Number.isFinite(amount) || amount <= 0) {
        return { status: 400, body: { success: false, code: 'INVALID_AMOUNT', error: 'Payment amount must be greater than zero.' } };
      }
      if (!serviceName) serviceName = 'TOLKFLOW Platform Service';
      const toUsd = await fxService.convertToUsd(amount, currency);
      if (!toUsd.ok) {
        return {
          status: 503,
          body: {
            success: false,
            code: toUsd.code || 'EXCHANGE_RATE_UNAVAILABLE',
            error: toUsd.error,
          },
        };
      }
      amountUsd = toUsd.amountUsd;
      exchangeRate = toUsd.rate;
    }

    const userId = String(actor?.id || payload.userId || '').trim();
    const customerName = String(actor?.name || payload.customerName || '').trim();
    const customerEmail = String(actor?.email || payload.customerEmail || '').trim().toLowerCase();
    const country = String(payload.country || actor?.country || 'Rwanda').trim();
    const phoneNumber = String(payload.phoneNumber || '').trim();

    if (!userId || !customerName) {
      return { status: 400, body: { success: false, code: 'INVALID_CUSTOMER', error: 'Authenticated customer details are required.' } };
    }

    if (providerCode === 'mtn_momo_rw' && !mtnAdapter.normalizeRwandaMsisdn(phoneNumber)) {
      return {
        status: 400,
        body: {
          success: false,
          code: 'INVALID_PHONE_NUMBER',
          error: 'Please enter a valid MTN Mobile Money phone number (e.g. +250788123456 or 0788123456).',
        },
      };
    }

    const providerStatus = adapter.getStatus();
    if (!providerStatus.configured) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'PROVIDER_UNCONFIGURED',
          error: `${providerStatus.name} is not configured on the server. Missing environment variables: ${providerStatus.missingEnv.join(', ')}.`,
          missingEnv: providerStatus.missingEnv,
          mode: providerStatus.mode,
        },
      };
    }

    const paymentId = `pay_${crypto.randomUUID()}`;
    const referenceUuid = crypto.randomUUID();
    const transactionRef = `TKF-${Date.now().toString(36).toUpperCase()}-${referenceUuid.slice(0, 8).toUpperCase()}`;
    const invoiceNumber = `INV-${new Date(getNowMs()).toISOString().slice(0, 10).replace(/-/g, '')}-${referenceUuid.slice(0, 6).toUpperCase()}`;
    const nowIso = new Date(getNowMs()).toISOString();
    const maskedIdentifier =
      providerCode === 'mtn_momo_rw'
        ? maskPhoneNumber(mtnAdapter.normalizeRwandaMsisdn(phoneNumber))
        : customerEmail || providerStatus.name;

    try {
      runInTransaction(db, () => {
        db.prepare(`
          INSERT INTO payments (
            id, transaction_ref, idempotency_key, user_id, customer_name, customer_email,
            customer_phone_masked, country, plan_id, service_name, provider_code, payment_method,
            amount, currency, amount_usd, exchange_rate, status, external_reference,
            failure_reason, verified_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', NULL, ?, ?)
        `).run(
          paymentId,
          transactionRef,
          idempotencyKey,
          userId,
          customerName,
          customerEmail,
          maskedIdentifier,
          country,
          planId,
          serviceName,
          providerCode,
          providerStatus.adapterType,
          amount,
          currency,
          amountUsd,
          exchangeRate,
          referenceUuid,
          nowIso,
          nowIso
        );

        appendTransactionLedger(db, {
          paymentId,
          transactionRef,
          providerCode,
          eventType: 'payment_created',
          status: 'pending',
          amount,
          currency,
          externalReference: referenceUuid,
          rawStatus: 'INITIATED',
        });

        db.prepare(`
          INSERT INTO invoices (
            id, invoice_number, payment_id, user_id, customer_name, customer_email,
            service_name, amount, currency, tax_amount, total_amount, status, receipt_json, issued_at, paid_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'issued', '{}', ?, NULL)
        `).run(
          `inv_${crypto.randomUUID()}`,
          invoiceNumber,
          paymentId,
          userId,
          customerName,
          customerEmail,
          serviceName,
          amount,
          currency,
          amount,
          nowIso
        );

        appendAuditLog(db, {
          actorId: userId,
          actorRole: actor?.role || 'user',
          paymentId,
          action: 'PAYMENT_INITIATED',
          detail: `Initiated ${providerCode} payment ${transactionRef} (${amount} ${currency}) for ${serviceName}`,
          ip,
        });
      });
    } catch (dbErr) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'DATABASE_ERROR',
          error: `Failed to persist payment intent: ${dbErr?.message || 'Database write error'}`,
        },
      };
    }

    try {
      const providerResp = await adapter.initiatePayment({
        referenceId: referenceUuid,
        transactionRef,
        amount,
        currency,
        phoneNumber,
        customerEmail,
        customerName,
        externalId: transactionRef,
        serviceName,
        payerMessage: `TOLKFLOW: ${serviceName}`,
        payeeNote: transactionRef,
      });

      const updNowIso = new Date(getNowMs()).toISOString();
      runInTransaction(db, () => {
        db.prepare(`
          UPDATE payments
          SET external_reference = ?, customer_phone_masked = COALESCE(NULLIF(?, ''), customer_phone_masked), updated_at = ?
          WHERE id = ?
        `).run(providerResp.externalReference || referenceUuid, providerResp.maskedIdentifier || '', updNowIso, paymentId);

        appendTransactionLedger(db, {
          paymentId,
          transactionRef,
          providerCode,
          eventType: 'provider_request_dispatched',
          status: 'pending',
          amount,
          currency,
          externalReference: providerResp.externalReference || referenceUuid,
          rawStatus: providerResp.rawStatus || 'ACCEPTED',
        });
      });

      const savedRow = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      const safePayment = sanitizePaymentRow(savedRow);
      emitEvent('payment:created', { payment: safePayment });
      emitEvent('revenue:updated', getAdminRevenueSummary());

      return {
        status: 202,
        body: {
          success: true,
          payment: safePayment,
          invoiceNumber,
          checkoutUrl: providerResp.checkoutUrl || null,
          mode: providerStatus.mode,
          message:
            providerResp.message ||
            'Payment request accepted. Awaiting final provider verification.',
        },
      };
    } catch (provErr) {
      const isTimeout = provErr?.code === 'PROVIDER_TIMEOUT';
      const failIso = new Date(getNowMs()).toISOString();
      runInTransaction(db, () => {
        if (!isTimeout) {
          db.prepare(`
            UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?
          `).run(provErr.message || 'Provider error', failIso, paymentId);
          db.prepare(`UPDATE invoices SET status = 'void' WHERE payment_id = ?`).run(paymentId);
        }
        appendTransactionLedger(db, {
          paymentId,
          transactionRef,
          providerCode,
          eventType: isTimeout ? 'provider_timeout' : 'provider_dispatch_failed',
          status: isTimeout ? 'pending' : 'failed',
          amount,
          currency,
          externalReference: referenceUuid,
          rawStatus: provErr.code || 'ERROR',
          errorMessage: provErr.message || 'Gateway call failed',
        });
        appendAuditLog(db, {
          actorId: userId,
          actorRole: 'system',
          paymentId,
          action: isTimeout ? 'PAYMENT_PROVIDER_TIMEOUT' : 'PAYMENT_DISPATCH_FAILED',
          detail: provErr.message || 'Provider error',
          ip,
        });
      });

      const latest = sanitizePaymentRow(db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId));
      emitEvent('payment:updated', { payment: latest });
      emitEvent('revenue:updated', getAdminRevenueSummary());

      return {
        status: provErr.statusCode || (isTimeout ? 504 : 502),
        body: {
          success: false,
          code: provErr.code || 'PROVIDER_ERROR',
          payment: latest,
          error: provErr.message || 'Payment provider request failed.',
        },
      };
    }
  }

  async function verifyAndGetPaymentStatus(idOrRef, { actor = null, isAdmin = false } = {}) {
    let db;
    try {
      db = getDb();
    } catch (dbErr) {
      return {
        status: 503,
        body: { success: false, code: 'DATABASE_UNAVAILABLE', error: dbErr?.message || 'Database unreachable' },
      };
    }

    const payment = db
      .prepare(`
        SELECT p.* FROM payments p
        WHERE p.id = ?
           OR p.transaction_ref = ?
           OR p.external_reference = ?
           OR EXISTS (
             SELECT 1 FROM payment_transactions pt
             WHERE pt.payment_id = p.id AND pt.external_reference = ?
           )
        LIMIT 1
      `)
      .get(idOrRef, idOrRef, idOrRef, idOrRef);

    if (!payment) {
      return {
        status: 404,
        body: {
          success: false,
          code: 'INVALID_TRANSACTION_REFERENCE',
          error: 'Transaction reference was not found.',
        },
      };
    }

    if (actor && !isAdmin && payment.user_id !== actor.id) {
      return {
        status: 403,
        body: { success: false, code: 'FORBIDDEN', error: 'You are not authorized to inspect this transaction.' },
      };
    }

    if (payment.status === 'pending' || payment.status === 'processing') {
      const adapter = adapters.get(payment.provider_code);
      if (adapter) {
        try {
          const verifyRes = await adapter.verifyStatus(payment.external_reference || payment.transaction_ref);
          if (verifyRes.status === 'successful') {
            const finalized = finalizePaymentSuccess(db, payment.id, verifyRes);
            return {
              status: 200,
              body: {
                success: true,
                payment: finalized.payment,
                invoice: finalized.invoice,
                message: 'Payment verified and confirmed successfully.',
              },
            };
          }
          if (verifyRes.status === 'failed' || verifyRes.status === 'cancelled') {
            const failed = finalizePaymentFailure(db, payment.id, verifyRes);
            return {
              status: 200,
              body: {
                success: true,
                payment: failed.payment,
                message: failed.payment.failureReason || 'Payment was not completed.',
              },
            };
          }
        } catch (err) {
          if (err?.code === 'PROVIDER_TIMEOUT') {
            return {
              status: 504,
              body: {
                success: false,
                code: 'PROVIDER_TIMEOUT',
                payment: sanitizePaymentRow(payment),
                error: err.message,
              },
            };
          }
        }
      }
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE payment_id = ?').get(payment.id);
    const ledger = db
      .prepare('SELECT id, event_type, status, raw_status, error_message, created_at FROM payment_transactions WHERE payment_id = ? ORDER BY created_at DESC')
      .all(payment.id);

    return {
      status: 200,
      body: {
        success: true,
        payment: sanitizePaymentRow(payment),
        invoice: invoice
          ? {
              invoiceNumber: invoice.invoice_number,
              status: invoice.status,
              paidAt: invoice.paid_at,
              issuedAt: invoice.issued_at,
              receipt: JSON.parse(invoice.receipt_json || '{}'),
            }
          : null,
        transactions: ledger,
      },
    };
  }

  async function handleMtnCallback({ headers = {}, rawBody = '', body = {}, ip = '127.0.0.1' }) {
    let db;
    try {
      db = getDb();
    } catch (dbErr) {
      return { status: 503, body: { success: false, code: 'DATABASE_UNAVAILABLE', error: dbErr?.message } };
    }

    const sigCheck = mtnAdapter.verifyCallbackSignature(headers, rawBody);
    if (sigCheck.rejected) {
      return { status: 401, body: { success: false, code: 'INVALID_WEBHOOK_SIGNATURE', error: 'Invalid MTN callback signature.' } };
    }

    const referenceId = String(
      body.referenceId || body.externalId || headers['x-reference-id'] || ''
    ).trim();
    if (!referenceId) {
      return { status: 400, body: { success: false, code: 'MISSING_REFERENCE', error: 'Missing transaction reference in callback.' } };
    }

    const payment = db
      .prepare(`
        SELECT p.* FROM payments p
        WHERE p.external_reference = ?
           OR p.transaction_ref = ?
           OR p.id = ?
           OR EXISTS (
             SELECT 1 FROM payment_transactions pt
             WHERE pt.payment_id = p.id AND pt.external_reference = ?
           )
        LIMIT 1
      `)
      .get(referenceId, referenceId, referenceId, referenceId);
    if (!payment) {
      return { status: 404, body: { success: false, code: 'INVALID_TRANSACTION_REFERENCE', error: 'Transaction not found.' } };
    }

    const rawEventKey = String(
      body.eventId || headers['x-event-id'] || body.financialTransactionId || `${referenceId}:${body.status || 'CALLBACK'}`
    );

    const dup = db
      .prepare("SELECT id FROM payment_webhooks WHERE provider_code = 'mtn_momo_rw' AND event_id = ?")
      .get(rawEventKey);
    if (dup) {
      return {
        status: 200,
        body: {
          success: true,
          duplicate: true,
          payment: sanitizePaymentRow(payment),
          message: 'Duplicate MTN callback ignored idempotently.',
        },
      };
    }

    // Critical security rule: verify live status with MTN Collections API before confirming
    let verified;
    try {
      verified = await mtnAdapter.verifyStatus(payment.external_reference || referenceId);
    } catch (err) {
      return {
        status: err?.statusCode || 502,
        body: { success: false, code: err?.code || 'VERIFY_FAILED', error: err?.message || 'Verification call failed' },
      };
    }

    const nowIso = new Date(getNowMs()).toISOString();
    try {
      db.prepare(`
        INSERT INTO payment_webhooks (id, provider_code, event_id, payment_id, transaction_ref, signature_valid, payload_json, status, processed_at)
        VALUES (?, 'mtn_momo_rw', ?, ?, ?, ?, ?, 'processed', ?)
      `).run(
        `wh_${crypto.randomUUID()}`,
        rawEventKey,
        payment.id,
        payment.transaction_ref,
        sigCheck.signatureValid ? 1 : 0,
        typeof rawBody === 'string' && rawBody ? rawBody : JSON.stringify(body),
        nowIso
      );
    } catch (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return { status: 200, body: { success: true, duplicate: true, payment: sanitizePaymentRow(payment) } };
      }
      throw err;
    }

    if (verified.status === 'successful') {
      const finalized = finalizePaymentSuccess(db, payment.id, verified);
      return { status: 200, body: { success: true, payment: finalized.payment, invoice: finalized.invoice } };
    }
    if (verified.status === 'failed' || verified.status === 'cancelled') {
      const failed = finalizePaymentFailure(db, payment.id, verified);
      return { status: 200, body: { success: true, payment: failed.payment } };
    }
    return { status: 200, body: { success: true, payment: sanitizePaymentRow(payment), status: 'pending' } };
  }

  async function handleInternationalWebhook({ providerCode, headers = {}, rawBody = '', body = {}, ip = '127.0.0.1' }) {
    let db;
    try {
      db = getDb();
    } catch (dbErr) {
      return { status: 503, body: { success: false, code: 'DATABASE_UNAVAILABLE', error: dbErr?.message } };
    }

    const inferredCode =
      providerCode ||
      (headers['stripe-signature'] ? 'stripe_cards' : headers['verif-hash'] ? 'flutterwave_africa' : 'paypal');

    const adapter = adapters.get(inferredCode);
    if (!adapter) {
      return { status: 400, body: { success: false, code: 'UNKNOWN_PROVIDER', error: 'Unknown webhook provider.' } };
    }

    const sigValid = adapter.verifyWebhook(headers, rawBody);
    if (!sigValid) {
      appendAuditLog(db, {
        actorId: 'webhook',
        actorRole: 'external_provider',
        action: 'WEBHOOK_SIGNATURE_REJECTED',
        detail: `Rejected unsigned or invalid ${inferredCode} webhook`,
        ip,
      });
      return { status: 401, body: { success: false, code: 'INVALID_WEBHOOK_SIGNATURE', error: 'Invalid webhook signature.' } };
    }

    const eventId = String(
      body.id || body.event_id || body.data?.id || crypto.createHash('sha256').update(String(rawBody)).digest('hex')
    );

    const existingWh = db
      .prepare('SELECT id FROM payment_webhooks WHERE provider_code = ? AND event_id = ?')
      .get(inferredCode, eventId);
    if (existingWh) {
      return { status: 200, body: { success: true, duplicate: true, message: 'Duplicate webhook ignored idempotently.' } };
    }

    const dataObj = body.data?.object || body.data || body.resource || body;
    const refCandidate = String(
      dataObj.metadata?.transaction_ref ||
        dataObj.client_reference_id ||
        dataObj.tx_ref ||
        dataObj.reference_id ||
        dataObj.id ||
        ''
    ).trim();

    const payment = db
      .prepare(`
        SELECT p.* FROM payments p
        WHERE p.transaction_ref = ?
           OR p.external_reference = ?
           OR p.id = ?
           OR EXISTS (
             SELECT 1 FROM payment_transactions pt
             WHERE pt.payment_id = p.id AND pt.external_reference = ?
           )
        LIMIT 1
      `)
      .get(refCandidate, refCandidate, refCandidate, refCandidate);
    if (!payment) {
      return { status: 404, body: { success: false, code: 'INVALID_TRANSACTION_REFERENCE', error: 'Payment record not found.' } };
    }

    const nowIso = new Date(getNowMs()).toISOString();
    try {
      db.prepare(`
        INSERT INTO payment_webhooks (id, provider_code, event_id, payment_id, transaction_ref, signature_valid, payload_json, status, processed_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, 'processed', ?)
      `).run(
        `wh_${crypto.randomUUID()}`,
        inferredCode,
        eventId,
        payment.id,
        payment.transaction_ref,
        typeof rawBody === 'string' && rawBody ? rawBody : JSON.stringify(body),
        nowIso
      );
    } catch (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return { status: 200, body: { success: true, duplicate: true } };
      }
      throw err;
    }

    const eventType = String(body.type || body.event || body.event_type || '').toLowerCase();
    const rawStatus = String(dataObj.payment_status || dataObj.status || '').toLowerCase();

    if (
      eventType.includes('completed') ||
      eventType.includes('succeeded') ||
      eventType.includes('captured') ||
      rawStatus === 'paid' ||
      rawStatus === 'successful' ||
      rawStatus === 'completed'
    ) {
      const extRef = String(dataObj.payment_intent || dataObj.id || payment.external_reference || '');
      const finalized = finalizePaymentSuccess(db, payment.id, {
        status: 'successful',
        rawStatus: rawStatus || eventType || 'SUCCESSFUL',
        externalReference: extRef,
      });
      return { status: 200, body: { success: true, payment: finalized.payment, invoice: finalized.invoice } };
    }

    if (
      eventType.includes('failed') ||
      eventType.includes('expired') ||
      eventType.includes('denied') ||
      rawStatus === 'failed' ||
      rawStatus === 'cancelled'
    ) {
      const failed = finalizePaymentFailure(db, payment.id, {
        status: rawStatus === 'cancelled' ? 'cancelled' : 'failed',
        rawStatus: rawStatus || eventType,
        reason: dataObj.last_payment_error?.message || dataObj.processor_response || 'International payment declined or expired.',
        externalReference: String(dataObj.id || payment.external_reference || ''),
      });
      return { status: 200, body: { success: true, payment: failed.payment } };
    }

    return { status: 200, body: { success: true, payment: sanitizePaymentRow(payment) } };
  }

  function getAdminRevenueSummary() {
    const db = getDb();
    const now = new Date(getNowMs());
    const todayPrefix = now.toISOString().slice(0, 10);
    const monthPrefix = now.toISOString().slice(0, 7);

    const allPayments = db.prepare('SELECT * FROM payments').all();
    const refunds = db.prepare("SELECT * FROM refunds WHERE status = 'completed'").all();

    let totalSuccessfulPayments = 0;
    let totalRevenueUsd = 0;
    let todayRevenueUsd = 0;
    let monthlyRevenueUsd = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;
    let mtnMomoCount = 0;
    let mtnMomoVolumeUsd = 0;
    let internationalCount = 0;
    let internationalVolumeUsd = 0;

    for (const p of allPayments) {
      if (p.status === 'successful') {
        totalSuccessfulPayments += 1;
        const usd = Number(p.amount_usd || 0);
        totalRevenueUsd += usd;
        const dateRef = String(p.verified_at || p.created_at || '');
        if (dateRef.startsWith(todayPrefix)) todayRevenueUsd += usd;
        if (dateRef.startsWith(monthPrefix)) monthlyRevenueUsd += usd;
        if (p.provider_code === 'mtn_momo_rw') {
          mtnMomoCount += 1;
          mtnMomoVolumeUsd += usd;
        } else {
          internationalCount += 1;
          internationalVolumeUsd += usd;
        }
      } else if (p.status === 'pending' || p.status === 'processing') {
        pendingCount += 1;
      } else if (p.status === 'failed') {
        failedCount += 1;
      } else if (p.status === 'cancelled') {
        cancelledCount += 1;
      }
    }

    const refundedVolumeUsd = refunds.reduce((sum, r) => {
      const p = allPayments.find((x) => x.id === r.payment_id);
      return sum + Number(p?.amount_usd || 0);
    }, 0);

    const providerStatuses = syncProviderMetadataInDb(db);

    return {
      totalSuccessfulPayments,
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      todayRevenueUsd: Number(todayRevenueUsd.toFixed(2)),
      monthlyRevenueUsd: Number(monthlyRevenueUsd.toFixed(2)),
      pendingCount,
      failedCount,
      cancelledCount,
      refundsCount: refunds.length,
      refundedVolumeUsd: Number(refundedVolumeUsd.toFixed(2)),
      mtnMomoCount,
      mtnMomoVolumeUsd: Number(mtnMomoVolumeUsd.toFixed(2)),
      internationalCount,
      internationalVolumeUsd: Number(internationalVolumeUsd.toFixed(2)),
      providers: providerStatuses,
    };
  }

  function listAdminPayments(filters = {}) {
    const db = getDb();
    let rows = db.prepare('SELECT * FROM payments ORDER BY datetime(created_at) DESC').all();

    if (filters.status && filters.status !== 'all') {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters.provider && filters.provider !== 'all') {
      rows = rows.filter((r) => r.provider_code === filters.provider);
    }
    if (filters.country && filters.country !== 'all') {
      const c = String(filters.country).toLowerCase();
      rows = rows.filter((r) => String(r.country || '').toLowerCase() === c);
    }
    if (filters.dateFrom) {
      rows = rows.filter((r) => String(r.created_at) >= String(filters.dateFrom));
    }
    if (filters.dateTo) {
      const end = String(filters.dateTo).length === 10 ? `${filters.dateTo}T23:59:59.999Z` : String(filters.dateTo);
      rows = rows.filter((r) => String(r.created_at) <= end);
    }
    if (filters.q) {
      const q = String(filters.q).toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          String(r.transaction_ref || '').toLowerCase().includes(q) ||
          String(r.id || '').toLowerCase().includes(q) ||
          String(r.external_reference || '').toLowerCase().includes(q) ||
          String(r.customer_name || '').toLowerCase().includes(q) ||
          String(r.customer_email || '').toLowerCase().includes(q) ||
          String(r.customer_phone_masked || '').toLowerCase().includes(q)
      );
    }

    const refunds = db.prepare('SELECT * FROM refunds ORDER BY datetime(created_at) DESC').all();
    const auditLogs = db.prepare('SELECT * FROM payment_audit_logs ORDER BY datetime(created_at) DESC LIMIT 100').all();

    return {
      payments: rows.map(sanitizePaymentRow),
      refunds,
      auditLogs,
      revenue: getAdminRevenueSummary(),
    };
  }

  function listUserPayments(userId) {
    const db = getDb();
    const payments = db
      .prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY datetime(created_at) DESC')
      .all(userId)
      .map(sanitizePaymentRow);
    const subscription = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?').get(userId) || null;
    return { payments, subscription };
  }

  async function processRefund({ paymentId, reason, actor, ip = '127.0.0.1' }) {
    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ? OR transaction_ref = ?').get(paymentId, paymentId);
    if (!payment) {
      return { status: 404, body: { success: false, code: 'INVALID_TRANSACTION_REFERENCE', error: 'Payment not found.' } };
    }
    if (payment.status !== 'successful') {
      return {
        status: 400,
        body: {
          success: false,
          code: 'REFUND_NOT_ALLOWED',
          error: `Only confirmed successful payments can be refunded (current status: ${payment.status}).`,
        },
      };
    }

    const cleanReason = String(reason || 'Administrative refund').trim();
    const adapter = adapters.get(payment.provider_code);
    let externalRefundId = `ref_${crypto.randomUUID().slice(0, 12)}`;

    if (adapter && typeof adapter.refundPayment === 'function' && payment.external_reference) {
      try {
        const remote = await adapter.refundPayment({
          externalReference: payment.external_reference,
          amount: payment.amount,
          currency: payment.currency,
        });
        if (remote.ok && remote.externalRefundId) {
          externalRefundId = remote.externalRefundId;
        }
      } catch {}
    }

    const nowIso = new Date(getNowMs()).toISOString();
    const refundId = `refund_${crypto.randomUUID()}`;

    runInTransaction(db, () => {
      db.prepare(`
        INSERT INTO refunds (
          id, payment_id, transaction_ref, amount, currency, reason, status,
          external_refund_id, initiated_by, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
      `).run(
        refundId,
        payment.id,
        payment.transaction_ref,
        payment.amount,
        payment.currency,
        cleanReason,
        externalRefundId,
        actor?.name || actor?.id || 'admin',
        nowIso,
        nowIso
      );

      db.prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?").run(nowIso, payment.id);
      db.prepare("UPDATE invoices SET status = 'refunded' WHERE payment_id = ?").run(payment.id);

      appendTransactionLedger(db, {
        paymentId: payment.id,
        transactionRef: payment.transaction_ref,
        providerCode: payment.provider_code,
        eventType: 'payment_refunded',
        status: 'refunded',
        amount: payment.amount,
        currency: payment.currency,
        externalReference: externalRefundId,
        rawStatus: 'REFUNDED',
        errorMessage: cleanReason,
      });

      appendAuditLog(db, {
        actorId: actor?.id || 'admin',
        actorRole: actor?.role || 'superadmin',
        paymentId: payment.id,
        action: 'PAYMENT_REFUNDED',
        detail: `Refunded ${payment.transaction_ref} (${payment.amount} ${payment.currency}): ${cleanReason}`,
        ip,
      });
    });

    const updated = sanitizePaymentRow(db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id));
    emitEvent('payment:updated', { payment: updated });
    emitEvent('revenue:updated', getAdminRevenueSummary());

    return { status: 200, body: { success: true, payment: updated, refundId } };
  }

  function generateFinancialReport(filters = {}) {
    const format = String(filters.format || 'csv').toLowerCase();
    const data = listAdminPayments(filters);

    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `tolkflow-financial-report-${new Date(getNowMs()).toISOString().slice(0, 10)}.json`,
        content: JSON.stringify(
          {
            generatedAt: new Date(getNowMs()).toISOString(),
            revenueSummary: data.revenue,
            transactionsCount: data.payments.length,
            payments: data.payments,
            refunds: data.refunds,
          },
          null,
          2
        ),
      };
    }

    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      'Transaction ID',
      'Customer Name',
      'Customer Identifier',
      'Country',
      'Service / Plan',
      'Provider',
      'Method',
      'Amount',
      'Currency',
      'USD Equivalent',
      'Status',
      'External Reference',
      'Created At',
      'Verified At',
    ];
    const lines = [headers.map(esc).join(',')];
    for (const p of data.payments) {
      lines.push(
        [
          p.transactionRef,
          p.customerName,
          p.customerPhoneMasked || p.customerEmail,
          p.country,
          p.serviceName,
          p.providerCode,
          p.paymentMethod,
          p.amount,
          p.currency,
          p.amountUsd,
          p.status,
          p.externalReference,
          p.createdAt,
          p.verifiedAt || '',
        ]
          .map(esc)
          .join(',')
      );
    }

    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `tolkflow-financial-report-${new Date(getNowMs()).toISOString().slice(0, 10)}.csv`,
      content: lines.join('\n'),
    };
  }

  return {
    registerProviderAdapter,
    subscribeEvents,
    listAvailableMethods,
    initiateUnifiedPayment,
    verifyAndGetPaymentStatus,
    handleMtnCallback,
    handleInternationalWebhook,
    getAdminRevenueSummary,
    listAdminPayments,
    listUserPayments,
    processRefund,
    generateFinancialReport,
    PLAN_CATALOG,
  };
}

let sharedPaymentService = null;
function getSharedPaymentService() {
  if (!sharedPaymentService) {
    sharedPaymentService = createPaymentService();
  }
  return sharedPaymentService;
}

module.exports = {
  createPaymentService,
  getSharedPaymentService,
  PLAN_CATALOG,
};
