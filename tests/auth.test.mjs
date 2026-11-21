import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAuthDatabase } = require('../server/authDb.cjs');
const { createAuthService } = require('../server/authService.cjs');
const { handleAuthAndAdminHttp } = require('../server/authHttpHandlers.cjs');

function extractOtpFromEmail(email) {
  const match = String(email?.text || '').match(/verification code is:\s*(\d{6})/i);
  assert.ok(match, 'Expected 6-digit OTP inside delivered verification email text');
  return match[1];
}

function createHarness() {
  let currentNowMs = Date.UTC(2026, 10, 17, 12, 0, 0);
  const sentEmails = [];

  const db = createAuthDatabase(':memory:', { seedDefaults: true });
  const emailTransport = {
    async sendMail(mail) {
      sentEmails.push(mail);
      return { messageId: `test_msg_${sentEmails.length}` };
    },
  };

  const authService = createAuthService({
    db,
    emailTransport,
    secret: 'unit_test_hmac_secret_with_at_least_32_characters_len',
    now: () => currentNowMs,
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

    const handled = await handleAuthAndAdminHttp({
      req,
      res,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      readBody,
      isLegacyOwnerAuth: () => false,
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
    authService,
    sentEmails,
    advanceMs(ms) {
      currentNowMs += ms;
    },
    async start() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
    async api(path, { method = 'GET', body, headers = {} } = {}) {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, headers: res.headers, body: json };
    },
  };
}

test('1. Successful registration stores hashed password & hashed OTP, creates unverified user, and sends branded HTML email', async () => {
  const h = createHarness();
  await h.start();
  try {
    const res = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Alice Uwimana',
        username: 'alice_rw',
        email: 'Alice.Uwimana@Example.com',
        phone: '+250 788 555 111',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.requiresVerification, true);
    assert.ok(res.body.verificationToken);
    assert.equal(res.body.user.isVerified, false);
    assert.equal(res.body.user.accountStatus, 'unverified');
    assert.equal('password_hash' in res.body.user, false);

    // Ensure OTP is NEVER leaked in registration API JSON
    assert.equal('otp' in res.body, false);
    assert.equal('otpCode' in res.body, false);

    // Verify DB state
    const userRow = h.db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get('alice.uwimana@example.com');
    assert.ok(userRow);
    assert.equal(userRow.is_verified, 0);
    assert.equal(userRow.account_status, 'unverified');
    assert.equal(userRow.verified_at, null);
    assert.ok(userRow.password_hash.startsWith('scrypt$'));
    assert.notEqual(userRow.password_hash, 'StrongPass123!');

    assert.equal(h.sentEmails.length, 1);
    const mail = h.sentEmails[0];
    const otp = extractOtpFromEmail(mail);
    assert.match(otp, /^\d{6}$/);

    // Verify HTML email contains Tolkflow branding, welcome, OTP, 5-min expiry, and security warning
    assert.match(mail.html, /TOLKFLOW/);
    assert.match(mail.html, /svg/i);
    assert.match(mail.html, /Welcome to TOLKFLOW/i);
    assert.match(mail.html, new RegExp(otp));
    assert.match(mail.html, /5 minutes/i);
    assert.match(mail.html, /Security Warning/i);

    // Ensure DB stores HMAC hash, NOT plaintext OTP
    const evRow = h.db.prepare('SELECT * FROM email_verifications WHERE user_id = ?').get(userRow.id);
    assert.ok(evRow);
    assert.notEqual(evRow.otp_hash, otp);
    assert.equal(evRow.attempts, 0);
    assert.equal(evRow.used_at, null);
  } finally {
    await h.stop();
  }
});

test('2 & 8. Login before verification is denied; correct OTP verifies account and enables authenticated login & /api/auth/me', async () => {
  const h = createHarness();
  await h.start();
  try {
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Eric Ndayisaba',
        username: 'eric_nd',
        email: 'eric@tolkflow-test.org',
        password: 'Password2026!',
        confirmPassword: 'Password2026!',
      },
    });
    assert.equal(reg.status, 201);

    // Scenario 7: Login before verification must fail cleanly with 403 and redirect token, no sessionToken
    const preLogin = await h.api('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'eric@tolkflow-test.org',
        password: 'Password2026!',
      },
    });
    assert.equal(preLogin.status, 403);
    assert.equal(preLogin.body.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(preLogin.body.requiresVerification, true);
    assert.ok(preLogin.body.verificationToken);
    assert.equal(preLogin.body.sessionToken, undefined);

    // Scenario 2: Verify with correct OTP
    const otp = extractOtpFromEmail(h.sentEmails[0]);
    const verify = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: {
        verificationToken: preLogin.body.verificationToken,
        otp,
      },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.success, true);
    assert.equal(verify.body.user.isVerified, true);
    assert.equal(verify.body.user.accountStatus, 'verified');
    assert.ok(verify.body.user.verifiedAt);
    assert.ok(verify.body.sessionToken);

    const me = await h.api('/api/auth/me', {
      headers: { Authorization: `Bearer ${verify.body.sessionToken}` },
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'eric@tolkflow-test.org');
    assert.equal(me.body.user.isVerified, true);

    // Scenario 8: Login after verification succeeds with username or email
    const postLogin = await h.api('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'eric_nd',
        password: 'Password2026!',
      },
    });
    assert.equal(postLogin.status, 200);
    assert.equal(postLogin.body.success, true);
    assert.ok(postLogin.body.sessionToken);
    assert.ok(postLogin.body.csrfToken);
    assert.equal('password_hash' in postLogin.body.user, false);
  } finally {
    await h.stop();
  }
});

test('3. Incorrect OTP increments attempts and locks out after 5 wrong guesses', async () => {
  const h = createHarness();
  await h.start();
  try {
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Claudine Mutoni',
        username: 'claudine_m',
        email: 'claudine@example.com',
        password: 'SafePass999!',
        confirmPassword: 'SafePass999!',
      },
    });
    const realOtp = extractOtpFromEmail(h.sentEmails[0]);
    const wrongOtp = realOtp === '000000' ? '111111' : '000000';

    for (let i = 1; i <= 4; i += 1) {
      const attempt = await h.api('/api/auth/verify-otp', {
        method: 'POST',
        body: { verificationToken: reg.body.verificationToken, otp: wrongOtp },
      });
      assert.equal(attempt.status, 400);
      assert.equal(attempt.body.code, 'INVALID_OTP');
      assert.equal(attempt.body.remainingAttempts, 5 - i);
    }

    // 5th wrong attempt invalidates the OTP
    const fifth = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp: wrongOtp },
    });
    assert.equal(fifth.status, 429);
    assert.equal(fifth.body.code, 'OTP_MAX_ATTEMPTS');

    // Now even the previously valid OTP must be rejected because used_at was set
    const afterLock = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp: realOtp },
    });
    assert.equal(afterLock.status, 400);
    assert.equal(afterLock.body.code, 'OTP_USED_OR_MISSING');
  } finally {
    await h.stop();
  }
});

test('4. Expired OTP is rejected after 5 minutes', async () => {
  const h = createHarness();
  await h.start();
  try {
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Patrick Habimana',
        username: 'patrick_hb',
        email: 'patrick@example.com',
        password: 'PassWord2026',
        confirmPassword: 'PassWord2026',
      },
    });
    const otp = extractOtpFromEmail(h.sentEmails[0]);

    // Advance 5 minutes and 1 second
    h.advanceMs(5 * 60 * 1000 + 1000);

    const verify = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp },
    });
    assert.equal(verify.status, 410);
    assert.equal(verify.body.code, 'OTP_EXPIRED');
  } finally {
    await h.stop();
  }
});

test('5. Reused OTP cannot be submitted a second time after verification', async () => {
  const h = createHarness();
  await h.start();
  try {
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Grace Ingabire',
        username: 'grace_ing',
        email: 'grace@example.com',
        password: 'GracePass123',
        confirmPassword: 'GracePass123',
      },
    });
    const otp = extractOtpFromEmail(h.sentEmails[0]);

    const first = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp },
    });
    assert.equal(first.status, 200);

    const second = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp },
    });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'ALREADY_VERIFIED');
  } finally {
    await h.stop();
  }
});

test('6. Resend OTP enforces 60s cooldown, invalidates old OTP, and change-email updates unverified email', async () => {
  const h = createHarness();
  await h.start();
  try {
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Samuel Mugisha',
        username: 'sam_mugisha',
        email: 'sam.typo@example.com',
        password: 'SamPass2026!',
        confirmPassword: 'SamPass2026!',
      },
    });
    const firstOtp = extractOtpFromEmail(h.sentEmails[0]);

    // Immediate resend blocked by 60s cooldown
    const tooEarly = await h.api('/api/auth/resend-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken },
    });
    assert.equal(tooEarly.status, 429);
    assert.equal(tooEarly.body.code, 'RESEND_COOLDOWN');
    assert.ok(tooEarly.body.retryAfterSeconds > 0);

    // Advance clock 61s and resend
    h.advanceMs(61 * 1000);
    const resend = await h.api('/api/auth/resend-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken },
    });
    assert.equal(resend.status, 200);
    assert.equal(h.sentEmails.length, 2);
    const secondOtp = extractOtpFromEmail(h.sentEmails[1]);

    // First OTP must now fail if used (unless identical by 1-in-900k chance; ensure old row has used_at)
    const evRows = h.db
      .prepare('SELECT used_at FROM email_verifications WHERE user_id = ? ORDER BY created_at ASC')
      .all(reg.body.user.id);
    assert.equal(evRows.length, 2);
    assert.ok(evRows[0].used_at !== null, 'First OTP row must be marked used/invalidated on resend');
    assert.equal(evRows[1].used_at, null);

    if (firstOtp !== secondOtp) {
      const tryOld = await h.api('/api/auth/verify-otp', {
        method: 'POST',
        body: { verificationToken: reg.body.verificationToken, otp: firstOtp },
      });
      assert.equal(tryOld.status, 400);
    }

    // Change email before verification
    const changed = await h.api('/api/auth/change-email', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, newEmail: 'sam.fixed@example.com' },
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.email, 'sam.fixed@example.com');
    assert.equal(h.sentEmails.length, 3);
    const thirdOtp = extractOtpFromEmail(h.sentEmails[2]);

    const verified = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: changed.body.verificationToken, otp: thirdOtp },
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.user.email, 'sam.fixed@example.com');
  } finally {
    await h.stop();
  }
});

test('9. Duplicate email or duplicate username registration fails with 409', async () => {
  const h = createHarness();
  await h.start();
  try {
    const first = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Diane Mukamana',
        username: 'diane_m',
        email: 'diane@example.com',
        password: 'DianePass123',
        confirmPassword: 'DianePass123',
      },
    });
    assert.equal(first.status, 201);

    const dupEmail = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Other User',
        username: 'diane_other',
        email: 'DIANE@example.com',
        password: 'DianePass123',
        confirmPassword: 'DianePass123',
      },
    });
    assert.equal(dupEmail.status, 409);
    assert.equal(dupEmail.body.code, 'DUPLICATE_EMAIL');

    const dupUsername = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Other User',
        username: 'DIANE_M',
        email: 'other@example.com',
        password: 'DianePass123',
        confirmPassword: 'DianePass123',
      },
    });
    assert.equal(dupUsername.status, 409);
    assert.equal(dupUsername.body.code, 'DUPLICATE_USERNAME');
  } finally {
    await h.stop();
  }
});

test('10. Unauthorized API access is rejected, admin endpoints require superadmin/moderator & omit password/OTP hashes, and suspension revokes sessions', async () => {
  const h = createHarness();
  await h.start();
  try {
    // No token -> 401
    const unauthMe = await h.api('/api/auth/me');
    assert.equal(unauthMe.status, 401);

    // Forged token -> 401
    const forgedMe = await h.api('/api/auth/me', {
      headers: { Authorization: 'Bearer tkf_forged_invalid_token' },
    });
    assert.equal(forgedMe.status, 401);

    // Admin endpoints without auth -> 401
    const unauthAdmin = await h.api('/api/admin/verifications');
    assert.equal(unauthAdmin.status, 401);

    // Register & verify standard user
    const reg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Regular Member',
        username: 'regular_member',
        email: 'regular@example.com',
        password: 'UserPass2026!',
        confirmPassword: 'UserPass2026!',
      },
    });
    const otp = extractOtpFromEmail(h.sentEmails[0]);
    const verify = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: reg.body.verificationToken, otp },
    });
    const userToken = verify.body.sessionToken;

    // Regular user cannot call admin endpoints -> 403
    const userAdminCall = await h.api('/api/admin/verifications', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(userAdminCall.status, 403);

    // Promote user_alex (seeded superadmin) session check via direct service session or DB role promotion on test user
    h.db.prepare("UPDATE users SET role = 'superadmin' WHERE id = 'user_alex'").run();
    const adminSession = h.authService.db
      ? (() => {
          // Register + verify + elevate an admin account through real endpoints
          return null;
        })()
      : null;
    void adminSession;

    const adminReg = await h.api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Admin Tester',
        username: 'admin_tester',
        email: 'admin-tester@example.com',
        password: 'AdminPass2026!',
        confirmPassword: 'AdminPass2026!',
      },
    });
    const adminOtp = extractOtpFromEmail(h.sentEmails[1]);
    const adminVerify = await h.api('/api/auth/verify-otp', {
      method: 'POST',
      body: { verificationToken: adminReg.body.verificationToken, otp: adminOtp },
    });
    h.db.prepare("UPDATE users SET role = 'superadmin' WHERE id = ?").run(adminVerify.body.user.id);
    const adminToken = adminVerify.body.sessionToken;

    const adminList = await h.api('/api/admin/verifications', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminList.status, 200);
    assert.equal(adminList.body.success, true);
    assert.ok(adminList.body.stats.totalUsers >= 2);
    assert.ok(adminList.body.stats.verifiedCount >= 2);
    for (const u of adminList.body.users) {
      assert.equal('password_hash' in u, false);
      assert.equal('passwordHash' in u, false);
      assert.equal('otp_hash' in u, false);
    }

    // Cookie CSRF check on admin mutation
    const csrfReject = await h.api('/api/admin/users/action', {
      method: 'POST',
      headers: { Cookie: `tolkflow_session=${encodeURIComponent(adminToken)}` },
      body: { userId: verify.body.user.id, action: 'suspend' },
    });
    assert.equal(csrfReject.status, 403);

    // Admin suspends regular user using Bearer token
    const suspendRes = await h.api('/api/admin/users/action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { userId: verify.body.user.id, action: 'suspend' },
    });
    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.user.accountStatus, 'suspended');

    // Suspended user's existing session & login are immediately rejected
    const suspendedMe = await h.api('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(suspendedMe.status, 401);

    const suspendedLogin = await h.api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'regular@example.com', password: 'UserPass2026!' },
    });
    assert.equal(suspendedLogin.status, 403);
    assert.equal(suspendedLogin.body.code, 'ACCOUNT_SUSPENDED');
  } finally {
    await h.stop();
  }
});
