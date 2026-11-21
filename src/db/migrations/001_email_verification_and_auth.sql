-- =====================================================================
-- TOLKFLOW MIGRATION 001: ACCOUNT REGISTRATION, EMAIL OTP VERIFICATION & SESSIONS
-- Compatible with PostgreSQL 15+ and SQLite (via runtime driver)
-- =====================================================================

-- 1. Extend users table with account verification and lifecycle status fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'unverified'
        CHECK (account_status IN ('unverified', 'verified', 'suspended'));

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Synchronize existing verified users cleanly without altering created accounts
UPDATE users
SET
    account_status = CASE
        WHEN is_suspended = TRUE THEN 'suspended'
        WHEN is_verified = TRUE THEN 'verified'
        ELSE 'unverified'
    END,
    verified_at = CASE
        WHEN is_verified = TRUE AND verified_at IS NULL THEN COALESCE(updated_at, created_at, NOW())
        ELSE verified_at
    END
WHERE account_status IS NULL OR account_status = 'unverified';

-- 2. Email Verification OTP Table (Never stores plaintext OTP; stores salted HMAC hash)
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Authenticated User Sessions Table (with CSRF token pairing)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    csrf_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- 4. Indexes for high-throughput lookup, uniqueness, and verification checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users (is_verified, account_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_active ON email_verifications (user_id, created_at DESC) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id, expires_at DESC);
