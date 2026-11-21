const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  getSharedAuthDb,
  runInTransaction,
  hashPasswordScrypt,
  verifyPasswordScrypt,
} = require('./authDb.cjs');
const {
  sendVerificationEmail,
  getEmailDeliveryStatus,
} = require('./emailService.cjs');

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;
const VERIFICATION_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_TTL_REMEMBER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SESSION_TTL_SHORT_MS = 12 * 60 * 60 * 1000; // 12 hours

function resolveRuntimeSecret() {
  const fromEnv = (process.env.OTP_HMAC_SECRET || process.env.AUTH_SESSION_SECRET || '').trim();
  if (fromEnv) return fromEnv;

  const secretPath = path.join(process.cwd(), '.data', '.auth_runtime_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const val = fs.readFileSync(secretPath, 'utf8').trim();
      if (val.length >= 32) return val;
    }
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

function maskEmail(email) {
  const str = String(email || '').trim();
  const [local, domain] = str.split('@');
  if (!local || !domain) return str;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, Math.min(6, local.length - visible.length)))}@${domain}`;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

class SlidingWindowRateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  check(key, limit, windowMs, nowMs) {
    const timestamps = (this.buckets.get(key) || []).filter((ts) => nowMs - ts < windowMs);
    if (timestamps.length >= limit) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000));
      this.buckets.set(key, timestamps);
      return { allowed: false, retryAfterSeconds };
    }
    timestamps.push(nowMs);
    this.buckets.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

function toSafeUser(row) {
  if (!row) return null;
  const isVerified = Boolean(row.is_verified);
  const status = row.account_status || (isVerified ? 'verified' : 'unverified');
  return {
    id: row.id,
    name: row.full_name,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    phone: row.phone || '',
    country: row.country || 'Rwanda',
    preferredLanguage: row.preferred_language || 'en',
    avatar:
      row.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    bio: row.bio || 'TOLKFLOW Member',
    status: status === 'suspended' ? 'offline' : 'online',
    verified: isVerified,
    isVerified,
    accountStatus: status,
    isBlocked: status === 'suspended',
    role: row.role || 'user',
    interests: ['Multilingual AI', 'Global Chat'],
    followersCount: 0,
    followingCount: 0,
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    createdAt: row.created_at,
    verifiedAt: row.verified_at || null,
  };
}

function createAuthService(options = {}) {
  const db = options.db || getSharedAuthDb();
  const customTransport = options.emailTransport || null;
  const hmacSecret = options.secret || resolveRuntimeSecret();
  const getNowMs = typeof options.now === 'function' ? options.now : () => Date.now();
  const rateLimiter = new SlidingWindowRateLimiter();

  function hashOtp(userId, otpCode) {
    const salt = crypto.randomBytes(16).toString('hex');
    const digest = crypto
      .createHmac('sha256', hmacSecret)
      .update(`${userId}:${String(otpCode).trim()}:${salt}`)
      .digest('hex');
    return `${salt}$${digest}`;
  }

  function verifyOtpHash(userId, otpCode, storedHash) {
    if (!storedHash || typeof storedHash !== 'string') return false;
    const parts = storedHash.split('$');
    if (parts.length !== 2) return false;
    const [salt, expectedHex] = parts;
    try {
      const actualHex = crypto
        .createHmac('sha256', hmacSecret)
        .update(`${userId}:${String(otpCode).trim()}:${salt}`)
        .digest('hex');
      const a = Buffer.from(actualHex, 'hex');
      const b = Buffer.from(expectedHex, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  function signVerificationToken(userId, email) {
    const payloadObj = {
      purpose: 'email_verification',
      uid: userId,
      email: String(email || '').toLowerCase(),
      exp: getNowMs() + VERIFICATION_TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', hmacSecret)
      .update(payloadB64)
      .digest('base64url');
    return `${payloadB64}.${sig}`;
  }

  function verifyVerificationToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return null;
    const expectedSig = crypto
      .createHmac('sha256', hmacSecret)
      .update(payloadB64)
      .digest('base64url');
    try {
      const a = Buffer.from(sigB64);
      const b = Buffer.from(expectedSig);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (parsed.purpose !== 'email_verification' || !parsed.uid || !parsed.exp) return null;
      if (Number(parsed.exp) <= getNowMs()) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function logAudit(userId, eventType, detail, ipAddress) {
    try {
      db.prepare(`
        INSERT INTO auth_audit_logs (id, user_id, event_type, detail, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `aud_${crypto.randomUUID()}`,
        userId || null,
        eventType,
        detail,
        ipAddress || 'unknown',
        new Date(getNowMs()).toISOString()
      );
    } catch {}
  }

  function issueSessionForUser(userId, rememberDevice = true) {
    const nowMs = getNowMs();
    const rawToken = `tkf_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenHash = sha256Hex(rawToken);
    const csrfToken = crypto.randomBytes(24).toString('base64url');
    const ttlMs = rememberDevice ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_SHORT_MS;
    const expiresAt = new Date(nowMs + ttlMs).toISOString();
    const createdAt = new Date(nowMs).toISOString();
    const sessionId = `sess_${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, csrf_token, remember_device, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, tokenHash, csrfToken, rememberDevice ? 1 : 0, expiresAt, createdAt);

    return { sessionToken: rawToken, csrfToken, expiresAt };
  }

  async function registerUser(payload, ip = '127.0.0.1') {
    const nowMs = getNowMs();
    const rl = rateLimiter.check(`register:${ip}`, 10, 10 * 60 * 1000, nowMs);
    if (!rl.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: 'RATE_LIMITED',
          error: `Too many registration requests. Please wait ${rl.retryAfterSeconds}s and try again.`,
        },
      };
    }

    const fullName = String(payload.fullName || payload.name || '').trim();
    const username = String(payload.username || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();
    const password = String(payload.password || '');
    const confirmPassword =
      payload.confirmPassword !== undefined ? String(payload.confirmPassword) : password;
    const preferredLanguage = String(payload.preferredLanguage || 'en').trim() || 'en';
    const country = String(payload.country || 'Rwanda').trim() || 'Rwanda';

    if (fullName.length < 2 || fullName.length > 120) {
      return { status: 400, body: { success: false, error: 'Full name must be between 2 and 120 characters.' } };
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Username must be 3–30 characters using only letters, numbers, or underscores.',
        },
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { status: 400, body: { success: false, error: 'Please provide a valid email address.' } };
    }
    if (phone && (phone.length < 7 || phone.length > 25)) {
      return { status: 400, body: { success: false, error: 'Phone number format is invalid.' } };
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Password must be at least 8 characters and include both letters and numbers.',
        },
      };
    }
    if (password !== confirmPassword) {
      return { status: 400, body: { success: false, error: 'Password and confirm password do not match.' } };
    }

    const emailStatus = getEmailDeliveryStatus(customTransport);
    if (!emailStatus.configured) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'EMAIL_SERVICE_UNCONFIGURED',
          error:
            'Email delivery service is not configured on the server. Configure RESEND_API_KEY, SENDGRID_API_KEY, or SMTP credentials to send verification codes.',
          missingEnv: emailStatus.missingEnv,
        },
      };
    }

    const userId = `user_${crypto.randomUUID()}`;
    const otpCode = String(crypto.randomInt(100000, 1000000));
    const otpHash = hashOtp(userId, otpCode);
    const passwordHash = hashPasswordScrypt(password);
    const createdAtIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + OTP_EXPIRY_MS).toISOString();

    try {
      runInTransaction(db, () => {
        const existingEmail = db
          .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
          .get(email);
        if (existingEmail) {
          const err = new Error('An account with this email address already exists.');
          err.code = 'DUPLICATE_EMAIL';
          throw err;
        }

        const existingUsername = db
          .prepare('SELECT id FROM users WHERE lower(username) = lower(?)')
          .get(username);
        if (existingUsername) {
          const err = new Error('This username is already taken.');
          err.code = 'DUPLICATE_USERNAME';
          throw err;
        }

        db.prepare(`
          INSERT INTO users (
            id, full_name, username, email, phone, password_hash,
            country, preferred_language, avatar, bio, role,
            is_verified, account_status, two_factor_enabled,
            created_at, verified_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 0, 'unverified', 0, ?, NULL, ?)
        `).run(
          userId,
          fullName,
          username,
          email,
          phone,
          passwordHash,
          country,
          preferredLanguage,
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
          'TOLKFLOW Global Member',
          createdAtIso,
          createdAtIso
        );

        db.prepare(`
          INSERT INTO email_verifications (id, user_id, otp_hash, expires_at, attempts, used_at, created_at)
          VALUES (?, ?, ?, ?, 0, NULL, ?)
        `).run(`ev_${crypto.randomUUID()}`, userId, otpHash, expiresAtIso, createdAtIso);
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_EMAIL' || err.code === 'DUPLICATE_USERNAME') {
        return { status: 409, body: { success: false, code: err.code, error: err.message } };
      }
      if (String(err.message || '').includes('UNIQUE')) {
        return { status: 409, body: { success: false, code: 'DUPLICATE_ACCOUNT', error: 'Email or username already exists.' } };
      }
      throw err;
    }

    try {
      await sendVerificationEmail({
        to: email,
        fullName,
        otpCode,
        expiresMinutes: 5,
        customTransport,
      });
    } catch (emailErr) {
      // Roll back the unverified registration cleanly so the user is not stranded if SMTP/API fails
      try {
        runInTransaction(db, () => {
          db.prepare('DELETE FROM users WHERE id = ? AND is_verified = 0').run(userId);
        });
      } catch {}
      logAudit(userId, 'REGISTER_EMAIL_FAILED', `Email dispatch failed for ${maskEmail(email)}`, ip);
      return {
        status: emailErr.code === 'EMAIL_SERVICE_UNCONFIGURED' ? 503 : 502,
        body: {
          success: false,
          code: emailErr.code || 'EMAIL_DELIVERY_FAILED',
          error: emailErr.message || 'Unable to deliver verification email.',
        },
      };
    }

    logAudit(userId, 'REGISTER_PENDING_VERIFICATION', `Registered unverified account ${maskEmail(email)}`, ip);

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const verificationToken = signVerificationToken(userId, email);

    return {
      status: 201,
      body: {
        success: true,
        requiresVerification: true,
        verificationToken,
        maskedEmail: maskEmail(email),
        email,
        expiresAt: expiresAtIso,
        resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        user: toSafeUser(createdUser),
        message: 'Account created. We have sent a 6-digit verification code to your email address.',
      },
    };
  }

  async function verifyEmailOtp(payload, ip = '127.0.0.1') {
    const nowMs = getNowMs();
    const rl = rateLimiter.check(`verify_ip:${ip}`, 20, 15 * 60 * 1000, nowMs);
    if (!rl.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: 'RATE_LIMITED',
          error: `Too many verification attempts. Wait ${rl.retryAfterSeconds}s and try again.`,
        },
      };
    }

    const tokenData = verifyVerificationToken(payload.verificationToken);
    if (!tokenData) {
      return {
        status: 401,
        body: {
          success: false,
          code: 'INVALID_VERIFICATION_SESSION',
          error: 'Verification session is invalid or expired. Please sign in or resend a code.',
        },
      };
    }

    const otpClean = String(payload.otp || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(otpClean)) {
      return {
        status: 400,
        body: { success: false, code: 'INVALID_OTP_FORMAT', error: 'Please enter a valid 6-digit numeric code.' },
      };
    }

    const txResult = runInTransaction(db, () => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenData.uid);
      if (!user) {
        return { status: 404, body: { success: false, error: 'Account not found.' } };
      }
      if (user.account_status === 'suspended') {
        return { status: 403, body: { success: false, code: 'ACCOUNT_SUSPENDED', error: 'This account has been suspended.' } };
      }
      if (user.is_verified === 1 && user.account_status === 'verified') {
        return {
          status: 409,
          body: { success: false, code: 'ALREADY_VERIFIED', error: 'Account is already verified.' },
        };
      }

      const ev = db
        .prepare(`
          SELECT * FROM email_verifications
          WHERE user_id = ?
          ORDER BY created_at DESC, rowid DESC
          LIMIT 1
        `)
        .get(user.id);

      if (!ev || ev.used_at !== null) {
        return {
          status: 400,
          body: {
            success: false,
            code: 'OTP_USED_OR_MISSING',
            error: 'This verification code has already been used or superseded. Please request a new code.',
          },
        };
      }

      if (new Date(ev.expires_at).getTime() <= nowMs) {
        return {
          status: 410,
          body: {
            success: false,
            code: 'OTP_EXPIRED',
            error: 'Verification code has expired (5-minute limit). Please click Resend Code.',
          },
        };
      }

      if (Number(ev.attempts) >= MAX_OTP_ATTEMPTS) {
        db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(
          new Date(nowMs).toISOString(),
          ev.id
        );
        return {
          status: 429,
          body: {
            success: false,
            code: 'OTP_MAX_ATTEMPTS',
            error: 'Maximum incorrect verification attempts reached. Please request a new verification code.',
          },
        };
      }

      const valid = verifyOtpHash(user.id, otpClean, ev.otp_hash);
      if (!valid) {
        const nextAttempts = Number(ev.attempts) + 1;
        const lockOut = nextAttempts >= MAX_OTP_ATTEMPTS;
        db.prepare('UPDATE email_verifications SET attempts = ?, used_at = ? WHERE id = ?').run(
          nextAttempts,
          lockOut ? new Date(nowMs).toISOString() : null,
          ev.id
        );
        const remaining = Math.max(0, MAX_OTP_ATTEMPTS - nextAttempts);
        return {
          status: lockOut ? 429 : 400,
          body: {
            success: false,
            code: lockOut ? 'OTP_MAX_ATTEMPTS' : 'INVALID_OTP',
            remainingAttempts: remaining,
            error: lockOut
              ? 'Too many incorrect attempts. This code is now invalid — please request a new code.'
              : `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          },
        };
      }

      const nowIso = new Date(nowMs).toISOString();
      db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(nowIso, ev.id);
      db.prepare(`
        UPDATE users
        SET is_verified = 1, account_status = 'verified', verified_at = ?, updated_at = ?
        WHERE id = ?
      `).run(nowIso, nowIso, user.id);

      const session = issueSessionForUser(user.id, true);
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

      return {
        status: 200,
        userId: user.id,
        body: {
          success: true,
          message: 'Your Tolkflow account is now verified!',
          sessionToken: session.sessionToken,
          csrfToken: session.csrfToken,
          expiresAt: session.expiresAt,
          user: toSafeUser(updatedUser),
        },
      };
    });

    if (txResult.status === 200) {
      logAudit(txResult.userId, 'EMAIL_VERIFIED', 'User verified email via 6-digit OTP', ip);
    } else if (tokenData?.uid) {
      logAudit(tokenData.uid, 'OTP_VERIFY_FAILED', txResult.body.code || 'FAILED', ip);
    }

    return { status: txResult.status, body: txResult.body, setSessionCookies: txResult.status === 200 ? txResult.body : null };
  }

  async function resendVerificationOtp(payload, ip = '127.0.0.1') {
    const nowMs = getNowMs();
    const tokenData = verifyVerificationToken(payload.verificationToken);
    if (!tokenData) {
      return {
        status: 401,
        body: {
          success: false,
          code: 'INVALID_VERIFICATION_SESSION',
          error: 'Verification session expired. Please log in again to continue.',
        },
      };
    }

    const emailStatus = getEmailDeliveryStatus(customTransport);
    if (!emailStatus.configured) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'EMAIL_SERVICE_UNCONFIGURED',
          error: 'Email delivery service is not configured on the server.',
          missingEnv: emailStatus.missingEnv,
        },
      };
    }

    const rlHourly = rateLimiter.check(`resend_hr:${tokenData.uid}`, 6, 60 * 60 * 1000, nowMs);
    if (!rlHourly.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: 'RATE_LIMITED',
          error: `Hourly resend limit reached. Try again in ${rlHourly.retryAfterSeconds}s.`,
        },
      };
    }

    const otpCode = String(crypto.randomInt(100000, 1000000));
    const nowIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + OTP_EXPIRY_MS).toISOString();

    const txResult = runInTransaction(db, () => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenData.uid);
      if (!user) {
        return { errorStatus: 404, errorBody: { success: false, error: 'Account not found.' } };
      }
      if (user.account_status === 'suspended') {
        return { errorStatus: 403, errorBody: { success: false, error: 'Account is suspended.' } };
      }
      if (user.is_verified === 1) {
        return { errorStatus: 409, errorBody: { success: false, error: 'Account is already verified.' } };
      }

      const latest = db
        .prepare('SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1')
        .get(user.id);
      if (latest) {
        const elapsedMs = nowMs - new Date(latest.created_at).getTime();
        if (elapsedMs < RESEND_COOLDOWN_SECONDS * 1000) {
          const waitSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
          return {
            errorStatus: 429,
            errorBody: {
              success: false,
              code: 'RESEND_COOLDOWN',
              retryAfterSeconds: waitSeconds,
              error: `Please wait ${waitSeconds}s before requesting a new verification code.`,
            },
          };
        }
      }

      // Invalidate ALL previous unused OTPs atomically
      db.prepare('UPDATE email_verifications SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(
        nowIso,
        user.id
      );

      const newEvId = `ev_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO email_verifications (id, user_id, otp_hash, expires_at, attempts, used_at, created_at)
        VALUES (?, ?, ?, ?, 0, NULL, ?)
      `).run(newEvId, user.id, hashOtp(user.id, otpCode), expiresAtIso, nowIso);

      return { user, newEvId };
    });

    if (txResult.errorStatus) {
      return { status: txResult.errorStatus, body: txResult.errorBody };
    }

    try {
      await sendVerificationEmail({
        to: txResult.user.email,
        fullName: txResult.user.full_name,
        otpCode,
        expiresMinutes: 5,
        customTransport,
      });
    } catch (emailErr) {
      try {
        db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(nowIso, txResult.newEvId);
      } catch {}
      return {
        status: 502,
        body: {
          success: false,
          code: 'EMAIL_DELIVERY_FAILED',
          error: emailErr.message || 'Failed to resend verification email.',
        },
      };
    }

    logAudit(txResult.user.id, 'OTP_RESENT', `Resent 6-digit OTP to ${maskEmail(txResult.user.email)}`, ip);

    return {
      status: 200,
      body: {
        success: true,
        maskedEmail: maskEmail(txResult.user.email),
        expiresAt: expiresAtIso,
        resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        message: 'A new 6-digit verification code has been sent to your email address.',
      },
    };
  }

  async function changeUnverifiedEmail(payload, ip = '127.0.0.1') {
    const nowMs = getNowMs();
    const tokenData = verifyVerificationToken(payload.verificationToken);
    if (!tokenData) {
      return {
        status: 401,
        body: { success: false, code: 'INVALID_VERIFICATION_SESSION', error: 'Verification session expired.' },
      };
    }

    const newEmail = String(payload.newEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) {
      return { status: 400, body: { success: false, error: 'Please enter a valid new email address.' } };
    }

    const emailStatus = getEmailDeliveryStatus(customTransport);
    if (!emailStatus.configured) {
      return {
        status: 503,
        body: { success: false, code: 'EMAIL_SERVICE_UNCONFIGURED', error: 'Email service is not configured.' },
      };
    }

    const otpCode = String(crypto.randomInt(100000, 1000000));
    const nowIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + OTP_EXPIRY_MS).toISOString();

    const txResult = runInTransaction(db, () => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenData.uid);
      if (!user) return { errorStatus: 404, errorBody: { success: false, error: 'Account not found.' } };
      if (user.is_verified === 1) {
        return { errorStatus: 409, errorBody: { success: false, error: 'Verified accounts must update email in Settings.' } };
      }

      const duplicate = db
        .prepare('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?')
        .get(newEmail, user.id);
      if (duplicate) {
        return {
          errorStatus: 409,
          errorBody: { success: false, code: 'DUPLICATE_EMAIL', error: 'That email address is already registered.' },
        };
      }

      const oldEmail = user.email;
      db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(newEmail, nowIso, user.id);
      db.prepare('UPDATE email_verifications SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(
        nowIso,
        user.id
      );

      const newEvId = `ev_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO email_verifications (id, user_id, otp_hash, expires_at, attempts, used_at, created_at)
        VALUES (?, ?, ?, ?, 0, NULL, ?)
      `).run(newEvId, user.id, hashOtp(user.id, otpCode), expiresAtIso, nowIso);

      return { user, oldEmail, newEvId };
    });

    if (txResult.errorStatus) {
      return { status: txResult.errorStatus, body: txResult.errorBody };
    }

    try {
      await sendVerificationEmail({
        to: newEmail,
        fullName: txResult.user.full_name,
        otpCode,
        expiresMinutes: 5,
        customTransport,
      });
    } catch (emailErr) {
      // Revert email change cleanly if delivery fails
      try {
        runInTransaction(db, () => {
          db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(
            txResult.oldEmail,
            nowIso,
            txResult.user.id
          );
          db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(nowIso, txResult.newEvId);
        });
      } catch {}
      return {
        status: 502,
        body: { success: false, code: 'EMAIL_DELIVERY_FAILED', error: emailErr.message || 'Email delivery failed.' },
      };
    }

    const newVerificationToken = signVerificationToken(txResult.user.id, newEmail);
    logAudit(txResult.user.id, 'EMAIL_CHANGED_BEFORE_VERIFY', `Changed unverified email to ${maskEmail(newEmail)}`, ip);

    return {
      status: 200,
      body: {
        success: true,
        verificationToken: newVerificationToken,
        email: newEmail,
        maskedEmail: maskEmail(newEmail),
        expiresAt: expiresAtIso,
        resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        message: 'Email updated. A new 6-digit verification code has been sent.',
      },
    };
  }

  async function loginUser(payload, ip = '127.0.0.1') {
    const nowMs = getNowMs();
    const identifier = String(payload.identifier || payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const rememberDevice = payload.rememberDevice !== false;

    const rl = rateLimiter.check(`login:${ip}:${identifier}`, 10, 15 * 60 * 1000, nowMs);
    if (!rl.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          code: 'RATE_LIMITED',
          error: `Too many login attempts. Please wait ${rl.retryAfterSeconds}s.`,
        },
      };
    }

    if (!identifier || !password) {
      return { status: 400, body: { success: false, error: 'Email/username and password are required.' } };
    }

    const user = db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)')
      .get(identifier, identifier);

    if (!user || !verifyPasswordScrypt(password, user.password_hash)) {
      logAudit(user?.id || null, 'LOGIN_FAILED', `Failed login attempt for ${identifier}`, ip);
      return { status: 401, body: { success: false, code: 'INVALID_CREDENTIALS', error: 'Invalid email/username or password.' } };
    }

    if (user.account_status === 'suspended') {
      logAudit(user.id, 'LOGIN_BLOCKED_SUSPENDED', 'Suspended account login denied', ip);
      return {
        status: 403,
        body: {
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'Your account has been suspended by an administrator. Contact TOLKFLOW support.',
        },
      };
    }

    // Critical requirement: Never allow unverified accounts to log in or obtain session tokens
    if (user.is_verified !== 1 || user.account_status === 'unverified') {
      const verificationToken = signVerificationToken(user.id, user.email);
      logAudit(user.id, 'LOGIN_REDIRECT_OTP', 'Unverified account redirected to OTP verification', ip);
      return {
        status: 403,
        body: {
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          requiresVerification: true,
          verificationToken,
          email: user.email,
          maskedEmail: maskEmail(user.email),
          error: 'Your email address is not yet verified. Please enter your 6-digit verification code or request a new one.',
        },
      };
    }

    const session = issueSessionForUser(user.id, rememberDevice);
    logAudit(user.id, 'LOGIN_SUCCESS', 'Verified user authenticated', ip);

    return {
      status: 200,
      body: {
        success: true,
        sessionToken: session.sessionToken,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
        user: toSafeUser(user),
      },
      setSessionCookies: session,
    };
  }

  function authenticateRequest(req, options = {}) {
    const nowMs = getNowMs();
    const authHeader = String(req.headers['authorization'] || '').trim();
    const cookies = parseCookies(req.headers['cookie']);
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const rawToken = bearerToken || cookies.tolkflow_session || '';

    if (!rawToken) {
      return { ok: false, status: 401, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    }

    const usingCookie = !bearerToken && Boolean(cookies.tolkflow_session);
    const tokenHash = sha256Hex(rawToken);
    const row = db
      .prepare(`
        SELECT s.id AS session_id, s.csrf_token, s.expires_at, s.revoked_at, u.*
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
      `)
      .get(tokenHash);

    if (!row || row.revoked_at !== null || new Date(row.expires_at).getTime() <= nowMs) {
      return { ok: false, status: 401, code: 'SESSION_EXPIRED', error: 'Session is invalid or expired.' };
    }

    // CSRF validation for cookie-authenticated mutations
    const method = String(req.method || 'GET').toUpperCase();
    if (usingCookie && options.requireCsrf !== false && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfHeader = String(req.headers['x-csrf-token'] || '');
      if (!csrfHeader || csrfHeader !== row.csrf_token) {
        return { ok: false, status: 403, code: 'CSRF_INVALID', error: 'Invalid or missing CSRF token.' };
      }
    }

    if (row.account_status === 'suspended') {
      return { ok: false, status: 403, code: 'ACCOUNT_SUSPENDED', error: 'Account is suspended.' };
    }

    if (row.is_verified !== 1 || row.account_status !== 'verified') {
      return {
        ok: false,
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Access denied. Account email verification is required.',
      };
    }

    return { ok: true, sessionId: row.session_id, user: toSafeUser(row), csrfToken: row.csrf_token };
  }

  function logoutSession(req) {
    const authHeader = String(req.headers['authorization'] || '').trim();
    const cookies = parseCookies(req.headers['cookie']);
    const rawToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : cookies.tolkflow_session || '';
    if (rawToken) {
      db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ?').run(
        new Date(getNowMs()).toISOString(),
        sha256Hex(rawToken)
      );
    }
    return { status: 200, body: { success: true, message: 'Logged out successfully.' } };
  }

  function listAdminUsers(filters = {}) {
    const allRows = db
      .prepare(`
        SELECT
          id, full_name, username, email, phone, country, preferred_language,
          avatar, bio, role, is_verified, account_status, two_factor_enabled,
          created_at, verified_at, updated_at
        FROM users
        ORDER BY datetime(created_at) DESC
      `)
      .all();

    const safeUsers = allRows.map(toSafeUser);
    const totalUsers = safeUsers.length;
    const verifiedCount = safeUsers.filter((u) => u.isVerified).length;
    const unverifiedCount = safeUsers.filter((u) => !u.isVerified && u.accountStatus !== 'suspended').length;
    const suspendedCount = safeUsers.filter((u) => u.accountStatus === 'suspended').length;
    const verificationRatePercent = totalUsers > 0 ? Math.round((verifiedCount / totalUsers) * 100) : 0;

    let filtered = safeUsers;
    if (filters.verification === 'verified') {
      filtered = filtered.filter((u) => u.isVerified);
    } else if (filters.verification === 'unverified') {
      filtered = filtered.filter((u) => !u.isVerified);
    } else if (filters.verification === 'suspended') {
      filtered = filtered.filter((u) => u.accountStatus === 'suspended');
    }

    if (filters.q) {
      const q = String(filters.q).toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    return {
      users: filtered,
      stats: {
        totalUsers,
        verifiedCount,
        unverifiedCount,
        suspendedCount,
        verificationRatePercent,
      },
    };
  }

  function applyAdminUserAction({ userId, action, role }, ip = '127.0.0.1') {
    const nowIso = new Date(getNowMs()).toISOString();
    return runInTransaction(db, () => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { status: 404, body: { success: false, error: 'User not found.' } };
      }

      if (action === 'suspend') {
        db.prepare(`UPDATE users SET account_status = 'suspended', updated_at = ? WHERE id = ?`).run(nowIso, userId);
        db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(nowIso, userId);
        logAudit(userId, 'ADMIN_SUSPEND_USER', `Suspended @${user.username}`, ip);
      } else if (action === 'reactivate') {
        const nextStatus = user.is_verified === 1 ? 'verified' : 'unverified';
        db.prepare(`UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?`).run(nextStatus, nowIso, userId);
        logAudit(userId, 'ADMIN_REACTIVATE_USER', `Reactivated @${user.username} -> ${nextStatus}`, ip);
      } else if (action === 'change_role' && ['user', 'moderator', 'superadmin'].includes(role)) {
        db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, nowIso, userId);
        logAudit(userId, 'ADMIN_ROLE_CHANGE', `Changed role of @${user.username} to ${role}`, ip);
      } else if (action === 'delete') {
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        logAudit(userId, 'ADMIN_DELETE_USER', `Deleted user @${user.username}`, ip);
        return { status: 200, body: { success: true, deletedId: userId } };
      } else {
        return { status: 400, body: { success: false, error: 'Unsupported administrative action.' } };
      }

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return { status: 200, body: { success: true, user: toSafeUser(updated) } };
    });
  }

  return {
    db,
    registerUser,
    verifyEmailOtp,
    resendVerificationOtp,
    changeUnverifiedEmail,
    loginUser,
    authenticateRequest,
    logoutSession,
    listAdminUsers,
    applyAdminUserAction,
    getEmailDeliveryStatus: () => getEmailDeliveryStatus(customTransport),
    signVerificationToken,
  };
}

let sharedAuthService = null;
function getSharedAuthService() {
  if (!sharedAuthService) {
    sharedAuthService = createAuthService();
  }
  return sharedAuthService;
}

module.exports = {
  createAuthService,
  getSharedAuthService,
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
};
