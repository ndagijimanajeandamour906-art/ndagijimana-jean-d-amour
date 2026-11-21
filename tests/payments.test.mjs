import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAuthDatabase } = require('../server/authDb.cjs');
const { createAuthService } = require('../server/authService.cjs');
const { ensurePaymentSchema } = require('../server/paymentDb.cjs');
const { createPaymentService } = require('../server/paymentService.cjs');
const { handlePaymentHttp } = require('../server/paymentHttpHandlers.cjs');
const { createMtnMomoAdapter } = require('../server/providers/mtnMomoAdapter.cjs');
const {
  createStripeAdapter,
  createPayPalAdapter,
  createFlutterwaveAdapter,
} = require('../server/providers/internationalAdapters.cjs');

function signStripePayload(secret, rawBody, timestampSec = 1700000000) {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampSec}.${rawBody}`)
    .digest('hex');
  return `t=${timestampSec},v1=${sig}`;
}

function createPaymentTestHarness(overrides = {}) {
  let currentNowMs = Date.UTC(2026, 10, 18, 12, 0, 0);
  const db = createAuthDatabase(':memory:', { seedDefaults: true });
  ensurePaymentSchema(db);

  // Create one verified standard customer and one verified superadmin
  const sentEmails = [];
  const authService = createAuthService({
    db,
    emailTransport: {
      async sendMail(mail) {
        sentEmails.push(mail);
        return { messageId: `msg_${sentEmails.length}` };
      },
    },
    secret: 'test_auth_hmac_secret_with_at_least_32_characters_len',
    now: () => currentNowMs,
  });

  async function createVerifiedUserToken({ fullName, username, email, role = 'user' }) {
    const reg = await authService.registerUser({
      fullName,
      username,
      email,
      phone: '+250 788 111 222',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      preferredLanguage: 'en',
    });
    assert.equal(reg.status, 201);
    const lastMail = sentEmails[sentEmails.length - 1];
    const otp = String(lastMail.text).match(/verification code is:\s*(\d{6})/i)[1];
    const verify = await authService.verifyEmailOtp({
      verificationToken: reg.body.verificationToken,
      otp,
    });
    assert.equal(verify.status, 200);
    if (role !== 'user') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, verify.body.user.id);
    }
    const login = await authService.loginUser({
      identifier: email,
      password: 'Password123!',
    });
    assert.equal(login.status, 200);
    return { token: login.body.sessionToken, user: login.body.user };
  }

  // Mutable sandbox state for remote provider endpoints
  const remoteState = {
    mtnStatuses: new Map(), // ref -> { status, reason, financialTransactionId }
    stripeSessions: new Map(),
    simulateDbDown: false,
    simulateMtnTimeoutMs: 0,
  };

  const mtnSecretCfg = {
    env: 'sandbox',
    baseUrl: 'https://sandbox.momodeveloper.mtn.com',
    subscriptionKey: 'sub_key_sandbox_test',
    apiUser: 'api_user_uuid_test',
    apiKey: 'api_key_secret_test',
    targetEnvironment: 'sandbox',
    callbackUrl: 'https://tolkflow.test/api/payments/mtn/callback',
    callbackSecret: 'mtn_callback_hmac_secret_123',
  };

  const stripeSecretCfg = {
    secretKey: 'sk_test_sandbox_stripe_key_123',
    webhookSecret: 'whsec_test_stripe_secret_123',
  };

  const mockFetch = async (url, init = {}) => {
    const u = String(url);

    // 1. Verified FX API (never hardcoded in paymentService; served via HTTP mock)
    if (u.includes('open.er-api.com')) {
      return new Response(
        JSON.stringify({
          result: 'success',
          base_code: 'USD',
          rates: {
            USD: 1,
            RWF: 1380,
            EUR: 0.92,
            GBP: 0.79,
            KES: 129,
            UGX: 3700,
            NGN: 1650,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. MTN MoMo OAuth token
    if (u.endsWith('/collection/token/')) {
      return new Response(
        JSON.stringify({ access_token: 'mtn_oauth_access_token_xyz', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. MTN MoMo RequestToPay (supports AbortSignal timeout simulation)
    if (u.endsWith('/collection/v1_0/requesttopay') && init.method === 'POST') {
      if (remoteState.simulateMtnTimeoutMs > 0) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, remoteState.simulateMtnTimeoutMs);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
      const ref = init.headers['X-Reference-Id'];
      if (!remoteState.mtnStatuses.has(ref)) {
        remoteState.mtnStatuses.set(ref, { status: 'PENDING', reason: '' });
      }
      return new Response('', { status: 202 });
    }

    // 4. MTN MoMo Status Query
    if (u.includes('/collection/v1_0/requesttopay/') && (!init.method || init.method === 'GET')) {
      const ref = decodeURIComponent(u.split('/collection/v1_0/requesttopay/')[1]);
      const st = remoteState.mtnStatuses.get(ref);
      if (!st) {
        return new Response(JSON.stringify({ message: 'Reference not found' }), { status: 404 });
      }
      return new Response(
        JSON.stringify({
          amount: '9646',
          currency: 'RWF',
          externalId: ref,
          status: st.status,
          financialTransactionId: st.financialTransactionId || (st.status === 'SUCCESSFUL' ? `mtn_fin_${ref.slice(0, 8)}` : undefined),
          reason: st.reason ? { code: st.reason, message: st.reason } : undefined,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Stripe Checkout Create
    if (u === 'https://api.stripe.com/v1/checkout/sessions' && init.method === 'POST') {
      const sessId = `cs_test_${crypto.randomUUID().slice(0, 10)}`;
      remoteState.stripeSessions.set(sessId, { id: sessId, payment_status: 'unpaid', status: 'open' });
      return new Response(
        JSON.stringify({
          id: sessId,
          url: `https://checkout.stripe.com/pay/${sessId}`,
          payment_status: 'unpaid',
          status: 'open',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Stripe Session Verify
    if (u.startsWith('https://api.stripe.com/v1/checkout/sessions/') && init.method === 'GET') {
      const sessId = decodeURIComponent(u.split('/checkout/sessions/')[1]);
      const s = remoteState.stripeSessions.get(sessId) || { id: sessId, payment_status: 'unpaid', status: 'open' };
      return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. Stripe Refunds
    if (u === 'https://api.stripe.com/v1/refunds' && init.method === 'POST') {
      return new Response(
        JSON.stringify({ id: `re_test_${crypto.randomUUID().slice(0, 8)}`, status: 'succeeded' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: `Unmocked URL: ${u}` }), { status: 404 });
  };

  const timeoutMs = overrides.timeoutMs ?? 2000;
  const paymentService = createPaymentService({
    getDb: () => {
      if (remoteState.simulateDbDown) {
        throw new Error('SQLite connection pool unavailable (simulated outage)');
      }
      return db;
    },
    fetchFn: mockFetch,
    timeoutMs,
    now: () => currentNowMs,
    mtnAdapter: createMtnMomoAdapter({ fetchFn: mockFetch, timeoutMs, configOverride: mtnSecretCfg }),
    stripeAdapter: createStripeAdapter({ fetchFn: mockFetch, timeoutMs, configOverride: stripeSecretCfg }),
    paypalAdapter: createPayPalAdapter({ fetchFn: mockFetch, timeoutMs }),
    flutterwaveAdapter: createFlutterwaveAdapter({ fetchFn: mockFetch, timeoutMs }),
  });

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
    const readBody = () =>
      new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (!raw) return resolve({});
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
      });

    const handled = await handlePaymentHttp({
      req,
      res,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      readBody,
      isLegacyOwnerAuth: () => false,
      paymentService,
      authService,
    });

    if (!handled) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  let baseUrl = '';
  return {
    db,
    paymentService,
    remoteState,
    mtnSecretCfg,
    stripeSecretCfg,
    createVerifiedUserToken,
    async start() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
    async api(path, { method = 'GET', body, rawBody, headers = {} } = {}) {
      const payload = rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined;
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(payload !== undefined && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: payload,
      });
      const text = await res.text();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      return { status: res.status, headers: res.headers, body: json, rawText: text };
    },
  };
}

test('1. Successful MTN MoMo payment: stays pending on RequestToPay, confirms only after verified SUCCESSFUL status, creates receipt & activates subscription', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Alice Uwimana',
      username: 'alice_momo',
      email: 'alice.momo@tolkflow.test',
      role: 'user',
    });
    const admin = await h.createVerifiedUserToken({
      fullName: 'Admin Damour',
      username: 'admin_damour',
      email: 'admin.damour@tolkflow.test',
      role: 'superadmin',
    });

    const methodsRes = await h.api('/api/payments/methods?country=Rwanda');
    assert.equal(methodsRes.status, 200);
    assert.equal(methodsRes.body.isRwanda, true);
    assert.equal(methodsRes.body.providers[0].code, 'mtn_momo_rw');
    assert.equal(methodsRes.body.exchangeRates.available, true);

    // Initiate MTN MoMo RequestToPay
    const initRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'standard',
        currency: 'RWF',
        country: 'Rwanda',
        phoneNumber: '+250788123456',
        idempotencyKey: 'idem_mtn_success_01',
      },
    });

    assert.equal(initRes.status, 202);
    assert.equal(initRes.body.success, true);
    assert.equal(initRes.body.payment.status, 'pending');
    assert.equal(initRes.body.payment.amountUsd, 6.99);
    assert.equal(initRes.body.payment.amount, Math.round(6.99 * 1380));

    // Revenue must still be 0 while payment is pending
    const revBefore = await h.api('/api/admin/revenue', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(revBefore.status, 200);
    assert.equal(revBefore.body.revenue.totalRevenueUsd, 0);
    assert.equal(revBefore.body.revenue.pendingCount, 1);

    // MTN customer approves prompt -> provider returns SUCCESSFUL
    h.remoteState.mtnStatuses.set(initRes.body.payment.externalReference, {
      status: 'SUCCESSFUL',
      financialTransactionId: 'FIN_MTN_998877',
    });

    const statusRes = await h.api(`/api/payments/status/${initRes.body.payment.transactionRef}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.payment.status, 'successful');
    assert.equal(statusRes.body.payment.externalReference, 'FIN_MTN_998877');
    assert.equal(statusRes.body.invoice.status, 'paid');

    // Subscription activated & revenue credited
    const myRes = await h.api('/api/payments/my', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(myRes.body.subscription.plan_id, 'standard');
    assert.equal(myRes.body.subscription.status, 'active');

    const revAfter = await h.api('/api/admin/revenue', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(revAfter.body.revenue.totalSuccessfulPayments, 1);
    assert.equal(revAfter.body.revenue.totalRevenueUsd, 6.99);
    assert.equal(revAfter.body.revenue.mtnMomoCount, 1);
  } finally {
    await h.stop();
  }
});

test('2. Failed MTN MoMo payment: updates status to failed, preserves immutable transaction history, does NOT activate subscription or add revenue', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Eric Nshuti',
      username: 'eric_rw',
      email: 'eric@tolkflow.test',
    });
    const admin = await h.createVerifiedUserToken({
      fullName: 'Admin Check',
      username: 'admin_check',
      email: 'admin.check@tolkflow.test',
      role: 'superadmin',
    });

    const initRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'business',
        currency: 'RWF',
        country: 'Rwanda',
        phoneNumber: '0788999000',
        idempotencyKey: 'idem_mtn_fail_01',
      },
    });
    assert.equal(initRes.status, 202);

    h.remoteState.mtnStatuses.set(initRes.body.payment.externalReference, {
      status: 'FAILED',
      reason: 'NOT_ENOUGH_FUNDS',
    });

    const statusRes = await h.api(`/api/payments/status/${initRes.body.payment.transactionRef}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.payment.status, 'failed');
    assert.match(statusRes.body.payment.failureReason, /NOT_ENOUGH_FUNDS/);

    const myRes = await h.api('/api/payments/my', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(myRes.body.subscription, null);
    assert.equal(myRes.body.payments.length, 1);

    // Check immutable ledger has both initiation & failure entries
    const txRows = h.db
      .prepare('SELECT event_type, status FROM payment_transactions WHERE payment_id = ?')
      .all(initRes.body.payment.id);
    assert.ok(txRows.some((r) => r.event_type === 'payment_failed' && r.status === 'failed'));

    const revRes = await h.api('/api/admin/revenue', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(revRes.body.revenue.totalRevenueUsd, 0);
    assert.equal(revRes.body.revenue.failedCount, 1);
  } finally {
    await h.stop();
  }
});

test('3. Pending payment: stays pending without confirming service or adding revenue', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Pending Tester',
      username: 'pending_user',
      email: 'pending@tolkflow.test',
    });

    const initRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'basic',
        currency: 'RWF',
        country: 'Rwanda',
        phoneNumber: '+250788222333',
      },
    });
    assert.equal(initRes.status, 202);

    const statusRes = await h.api(`/api/payments/status/${initRes.body.payment.transactionRef}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.payment.status, 'pending');
    assert.equal(statusRes.body.invoice.status, 'issued');

    const myRes = await h.api('/api/payments/my', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(myRes.body.subscription, null);
  } finally {
    await h.stop();
  }
});

test('4. Duplicate callback: second MTN callback with same eventId is deduplicated idempotently and never double-credits revenue', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Callback User',
      username: 'cb_user',
      email: 'cb@tolkflow.test',
    });
    const admin = await h.createVerifiedUserToken({
      fullName: 'Admin CB',
      username: 'admin_cb',
      email: 'admin.cb@tolkflow.test',
      role: 'superadmin',
    });

    const initRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'standard',
        currency: 'RWF',
        country: 'Rwanda',
        phoneNumber: '+250788444555',
      },
    });
    const extRef = initRes.body.payment.externalReference;
    h.remoteState.mtnStatuses.set(extRef, { status: 'SUCCESSFUL', financialTransactionId: 'FIN_CB_111' });

    const cbPayload = JSON.stringify({
      eventId: 'evt_mtn_unique_001',
      referenceId: extRef,
      status: 'SUCCESSFUL',
    });
    const cbSig = crypto.createHmac('sha256', h.mtnSecretCfg.callbackSecret).update(cbPayload).digest('hex');

    const cb1 = await h.api('/api/payments/mtn/callback', {
      method: 'POST',
      headers: { 'x-mtn-callback-signature': cbSig },
      rawBody: cbPayload,
    });
    assert.equal(cb1.status, 200);
    assert.equal(cb1.body.payment.status, 'successful');
    assert.ok(!cb1.body.duplicate);

    const cb2 = await h.api('/api/payments/mtn/callback', {
      method: 'POST',
      headers: { 'x-mtn-callback-signature': cbSig },
      rawBody: cbPayload,
    });
    assert.equal(cb2.status, 200);
    assert.equal(cb2.body.duplicate, true);

    const rev = await h.api('/api/admin/revenue', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(rev.body.revenue.totalSuccessfulPayments, 1);
    assert.equal(rev.body.revenue.totalRevenueUsd, 6.99);
  } finally {
    await h.stop();
  }
});

test('5. International payment success: Stripe checkout with verified EUR conversion & signed webhook activates service + supports refund & CSV export', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Claire Dupont',
      username: 'claire_fr',
      email: 'claire@tolkflow.test',
    });
    const admin = await h.createVerifiedUserToken({
      fullName: 'Admin Intl',
      username: 'admin_intl',
      email: 'admin.intl@tolkflow.test',
      role: 'superadmin',
    });

    const createRes = await h.api('/api/payments/international/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'business',
        providerCode: 'stripe_cards',
        currency: 'EUR',
        country: 'France',
        idempotencyKey: 'idem_stripe_ok_01',
      },
    });
    assert.equal(createRes.status, 202);
    assert.ok(createRes.body.checkoutUrl.includes('checkout.stripe.com'));
    assert.equal(createRes.body.payment.status, 'pending');
    assert.equal(createRes.body.payment.amountUsd, 14.99);
    assert.equal(createRes.body.payment.amount, Number((14.99 * 0.92).toFixed(2)));

    // Idempotent replay returns same transaction
    const replayRes = await h.api('/api/payments/international/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'business',
        providerCode: 'stripe_cards',
        currency: 'EUR',
        country: 'France',
        idempotencyKey: 'idem_stripe_ok_01',
      },
    });
    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.body.idempotentReplay, true);
    assert.equal(replayRes.body.payment.id, createRes.body.payment.id);

    // Send verified Stripe webhook
    const whBody = JSON.stringify({
      id: 'evt_stripe_1001',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: createRes.body.payment.externalReference,
          payment_intent: 'pi_stripe_verified_777',
          payment_status: 'paid',
          metadata: { transaction_ref: createRes.body.payment.transactionRef },
        },
      },
    });
    const sig = signStripePayload(h.stripeSecretCfg.webhookSecret, whBody);

    const whRes = await h.api('/api/payments/international/webhook?provider=stripe_cards', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      rawBody: whBody,
    });
    assert.equal(whRes.status, 200);
    assert.equal(whRes.body.payment.status, 'successful');

    // Verify CSV financial report & admin refund flow
    const csvRes = await h.api('/api/admin/payment-reports?format=csv', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.rawText, new RegExp(createRes.body.payment.transactionRef));

    const refundRes = await h.api('/api/admin/payments/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: { paymentId: createRes.body.payment.id, reason: 'Customer double-billing request' },
    });
    assert.equal(refundRes.status, 200);
    assert.equal(refundRes.body.payment.status, 'refunded');
  } finally {
    await h.stop();
  }
});

test('6. International payment failure & tampered webhook signature rejection', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'John Smith',
      username: 'john_us',
      email: 'john@tolkflow.test',
    });

    const createRes = await h.api('/api/payments/international/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'basic',
        providerCode: 'stripe_cards',
        currency: 'USD',
        country: 'United States',
      },
    });
    assert.equal(createRes.status, 202);

    // Reject forged/invalid webhook signature
    const badWh = await h.api('/api/payments/international/webhook?provider=stripe_cards', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1700000000,v1=forged_hex_signature' },
      body: { id: 'evt_forged', type: 'checkout.session.completed' },
    });
    assert.equal(badWh.status, 401);
    assert.equal(badWh.body.code, 'INVALID_WEBHOOK_SIGNATURE');

    // Signed failure event updates transaction to failed
    const failBody = JSON.stringify({
      id: 'evt_stripe_fail_1',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: createRes.body.payment.externalReference,
          status: 'failed',
          last_payment_error: { message: 'Card declined by issuing bank' },
          metadata: { transaction_ref: createRes.body.payment.transactionRef },
        },
      },
    });
    const sig = signStripePayload(h.stripeSecretCfg.webhookSecret, failBody);

    const failRes = await h.api('/api/payments/international/webhook?provider=stripe_cards', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      rawBody: failBody,
    });
    assert.equal(failRes.status, 200);
    assert.equal(failRes.body.payment.status, 'failed');
    assert.match(failRes.body.payment.failureReason, /Card declined/);
  } finally {
    await h.stop();
  }
});

test('7. Invalid transaction reference returns 404 INVALID_TRANSACTION_REFERENCE', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Ref Checker',
      username: 'ref_user',
      email: 'ref@tolkflow.test',
    });

    const statusRes = await h.api('/api/payments/status/TKF-NONEXISTENT-9999', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(statusRes.status, 404);
    assert.equal(statusRes.body.code, 'INVALID_TRANSACTION_REFERENCE');

    // Also test CVV/PIN rejection security rule
    const secRes = await h.api('/api/payments/international/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'basic',
        providerCode: 'stripe_cards',
        currency: 'USD',
        cvv: '123',
      },
    });
    assert.equal(secRes.status, 400);
    assert.equal(secRes.body.code, 'FORBIDDEN_SENSITIVE_FIELD');
  } finally {
    await h.stop();
  }
});

test('8. Unauthorized admin access returns 401 unauthenticated and 403 for standard user role', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const regularUser = await h.createVerifiedUserToken({
      fullName: 'Regular Member',
      username: 'reg_member',
      email: 'member@tolkflow.test',
      role: 'user',
    });

    const unauthRev = await h.api('/api/admin/revenue');
    assert.equal(unauthRev.status, 401);

    const unauthPay = await h.api('/api/admin/payments');
    assert.equal(unauthPay.status, 401);

    const forbiddenPay = await h.api('/api/admin/payments', {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    assert.equal(forbiddenPay.status, 403);

    const forbiddenReport = await h.api('/api/admin/payment-reports?format=json', {
      headers: { Authorization: `Bearer ${regularUser.token}` },
    });
    assert.equal(forbiddenReport.status, 403);

    const forbiddenRefund = await h.api('/api/admin/payments/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularUser.token}` },
      body: { paymentId: 'pay_123', reason: 'Unauthorized attempt' },
    });
    assert.equal(forbiddenRefund.status, 403);
  } finally {
    await h.stop();
  }
});

test('9. Database failure returns graceful 503 DATABASE_UNAVAILABLE without crashing server', async () => {
  const h = createPaymentTestHarness();
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'DB Fault Tester',
      username: 'db_tester',
      email: 'db@tolkflow.test',
    });

    h.remoteState.simulateDbDown = true;

    const createRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'basic',
        currency: 'RWF',
        phoneNumber: '+250788111999',
      },
    });
    assert.equal(createRes.status, 503);
    assert.equal(createRes.body.code, 'DATABASE_UNAVAILABLE');

    const statusRes = await h.api('/api/payments/status/TKF-ANY', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert.equal(statusRes.status, 503);
    assert.equal(statusRes.body.code, 'DATABASE_UNAVAILABLE');
  } finally {
    await h.stop();
  }
});

test('10. Payment provider timeout returns 504 PROVIDER_TIMEOUT and never confirms payment as successful', async () => {
  const h = createPaymentTestHarness({ timeoutMs: 80 });
  await h.start();
  try {
    const customer = await h.createVerifiedUserToken({
      fullName: 'Timeout Tester',
      username: 'timeout_user',
      email: 'timeout@tolkflow.test',
    });

    h.remoteState.simulateMtnTimeoutMs = 500;

    const timeoutRes = await h.api('/api/payments/mtn/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.token}` },
      body: {
        planId: 'standard',
        currency: 'RWF',
        country: 'Rwanda',
        phoneNumber: '+250788666777',
      },
    });

    assert.equal(timeoutRes.status, 504);
    assert.equal(timeoutRes.body.code, 'PROVIDER_TIMEOUT');
    assert.notEqual(timeoutRes.body.payment?.status, 'successful');

    const audit = h.db
      .prepare("SELECT action FROM payment_audit_logs WHERE action = 'PAYMENT_PROVIDER_TIMEOUT'")
      .all();
    assert.equal(audit.length, 1);
  } finally {
    await h.stop();
  }
});
