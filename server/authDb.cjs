const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordScrypt(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, originalHex] = parts;
  try {
    const derived = crypto.scryptSync(String(password), salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

const DEFAULT_SEED_USERS = [
  {
    id: 'user_damour',
    full_name: 'Jean Damour Ndagijimana',
    username: 'damour_rw',
    email: 'ndagijimanajeandamour906@gmail.com',
    phone: '+250 788 123 456',
    country: 'Rwanda',
    preferred_language: 'rw',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    bio: 'Creator & Executive Project Owner of TOLKFLOW.',
    role: 'superadmin',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 1,
    created_at: '2025-02-01T12:00:00.000Z',
    verified_at: '2025-02-01T12:00:00.000Z',
  },
  {
    id: 'user_alex',
    full_name: 'Alex Vance',
    username: 'alex_vance',
    email: 'alex.vance@tolkflow.io',
    phone: '+1 415 890 4321',
    country: 'United States',
    preferred_language: 'en',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    bio: 'Core Platform Administrator & Infrastructure Architect.',
    role: 'superadmin',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 1,
    created_at: '2025-01-15T10:00:00.000Z',
    verified_at: '2025-01-15T10:00:00.000Z',
  },
  {
    id: 'user_liwei',
    full_name: 'Li Wei',
    username: 'li_wei_shanghai',
    email: 'liwei@tech-orient.cn',
    phone: '+86 138 0013 8000',
    country: 'China',
    preferred_language: 'zh-CN',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    bio: 'Building real-time cross-border AI bridges from Shanghai.',
    role: 'user',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 1,
    created_at: '2025-02-10T08:00:00.000Z',
    verified_at: '2025-02-10T08:00:00.000Z',
  },
  {
    id: 'user_sarah',
    full_name: 'Sarah Chen',
    username: 'sarah_chen',
    email: 'sarah@neuro-ai.sg',
    phone: '+65 9123 4567',
    country: 'Singapore',
    preferred_language: 'en',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    bio: 'Multilingual AI researcher & WebRTC specialist.',
    role: 'user',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 1,
    created_at: '2025-02-14T09:30:00.000Z',
    verified_at: '2025-02-14T09:30:00.000Z',
  },
  {
    id: 'user_tariq',
    full_name: 'Tariq Mansoor',
    username: 'tariq_dubai',
    email: 'tariq@gulf-mesh.ae',
    phone: '+971 50 123 4567',
    country: 'United Arab Emirates',
    preferred_language: 'ar',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    bio: 'Global telecommunications strategist.',
    role: 'user',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 0,
    created_at: '2025-02-18T11:00:00.000Z',
    verified_at: '2025-02-18T11:00:00.000Z',
  },
  {
    id: 'user_amara',
    full_name: 'Amara Okafor',
    username: 'amara_lagos',
    email: 'amara@finflow.ng',
    phone: '+234 803 123 4567',
    country: 'Nigeria',
    preferred_language: 'en',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&auto=format&fit=crop&q=80',
    bio: 'Fintech builder across West & East Africa.',
    role: 'user',
    is_verified: 1,
    account_status: 'verified',
    two_factor_enabled: 1,
    created_at: '2025-02-22T14:15:00.000Z',
    verified_at: '2025-02-22T14:15:00.000Z',
  },
];

function createAuthDatabase(dbPathOverride, options = {}) {
  const dbPath =
    dbPathOverride ||
    process.env.DB_PATH ||
    path.join(process.cwd(), '.data', 'tolkflow.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'Rwanda',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'superadmin')),
      is_verified INTEGER NOT NULL DEFAULT 0,
      account_status TEXT NOT NULL DEFAULT 'unverified' CHECK (account_status IN ('unverified', 'verified', 'suspended')),
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      verified_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      csrf_token TEXT NOT NULL,
      remember_device INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      detail TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
    CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users (is_verified, account_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user_created ON email_verifications (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications (expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id, expires_at DESC);
  `);

  if (options.seedDefaults !== false) {
    const existingCountRow = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    if (existingCountRow && Number(existingCountRow.count) === 0) {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO users (
          id, full_name, username, email, phone, password_hash,
          country, preferred_language, avatar, bio, role,
          is_verified, account_status, two_factor_enabled,
          created_at, verified_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const defaultPass = process.env.DEFAULT_SEED_PASSWORD || crypto.randomBytes(16).toString('hex');
      const seededHash = hashPasswordScrypt(defaultPass);

      db.exec('BEGIN IMMEDIATE');
      try {
        for (const u of DEFAULT_SEED_USERS) {
          insertStmt.run(
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone || '',
            seededHash,
            u.country,
            u.preferred_language,
            u.avatar,
            u.bio,
            u.role,
            u.is_verified,
            u.account_status,
            u.two_factor_enabled,
            u.created_at,
            u.verified_at,
            u.created_at
          );
        }
        db.exec('COMMIT');
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
    }
  }

  return db;
}

function runInTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    throw err;
  }
}

let sharedDb = null;
function getSharedAuthDb() {
  if (!sharedDb) {
    sharedDb = createAuthDatabase();
  }
  return sharedDb;
}

module.exports = {
  createAuthDatabase,
  getSharedAuthDb,
  runInTransaction,
  hashPasswordScrypt,
  verifyPasswordScrypt,
};
