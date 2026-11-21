-- =====================================================================
-- MIGRATION 002: TOLKFLOW AUTOMATIC PAYMENT GATEWAY & FINANCIAL LEDGER
-- =====================================================================

-- 1. Currencies
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    symbol VARCHAR(12) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Exchange Rates (Verified rates from approved FX provider)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(10) NOT NULL REFERENCES currencies(code),
    target_currency VARCHAR(10) NOT NULL REFERENCES currencies(code),
    rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
    source VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (base_currency, target_currency)
);

-- 3. Payment Providers
CREATE TABLE IF NOT EXISTS payment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    adapter_type VARCHAR(50) NOT NULL,
    region VARCHAR(80) NOT NULL,
    countries JSONB NOT NULL DEFAULT '[]',
    supported_currencies JSONB NOT NULL DEFAULT '[]',
    mode VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    connection_status VARCHAR(30) NOT NULL DEFAULT 'missing_credentials',
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(120) NOT NULL UNIQUE,
    idempotency_key VARCHAR(120) UNIQUE,
    user_id VARCHAR(120) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone_masked VARCHAR(60),
    country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
    plan_id VARCHAR(40),
    service_name VARCHAR(150) NOT NULL,
    provider_code VARCHAR(50) NOT NULL REFERENCES payment_providers(code),
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL REFERENCES currencies(code),
    amount_usd NUMERIC(18, 4) NOT NULL DEFAULT 0,
    exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded')),
    external_reference VARCHAR(180),
    failure_reason TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Payment Transactions (Immutable Ledger - Never Deleted)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    transaction_ref VARCHAR(120) NOT NULL,
    provider_code VARCHAR(50) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    external_reference VARCHAR(180),
    raw_status VARCHAR(80),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Payment Webhooks (Idempotent Webhook Deduplication)
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(50) NOT NULL,
    event_id VARCHAR(180) NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    transaction_ref VARCHAR(120),
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    payload_json JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_code, event_id)
);

-- 7. Refunds
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    transaction_ref VARCHAR(120) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    external_refund_id VARCHAR(180),
    initiated_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 8. Invoices / Receipts
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
    user_id VARCHAR(120) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255),
    service_name VARCHAR(150) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'refunded', 'void')),
    receipt_json JSONB NOT NULL DEFAULT '{}',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 9. Payment Audit Logs
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(120) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    detail TEXT NOT NULL,
    ip_address VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_country ON payments(provider_code, country);
CREATE INDEX IF NOT EXISTS idx_payment_tx_payment_id ON payment_transactions(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_ref ON payment_webhooks(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_logs(created_at DESC);
