const crypto = require('node:crypto');
const { getSharedAuthDb } = require('./authDb.cjs');

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, is_active: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, is_active: 1 },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF', decimals: 0, is_active: 1 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, is_active: 1 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES', decimals: 2, is_active: 1 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', decimals: 0, is_active: 1 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2, is_active: 1 },
];

const DEFAULT_PROVIDERS = [
  {
    code: 'mtn_momo_rw',
    name: 'MTN Mobile Money (Rwanda)',
    adapter_type: 'mobile_money',
    region: 'Rwanda & East Africa',
    countries: ['Rwanda', 'RW'],
    supported_currencies: ['RWF', 'EUR'],
    is_enabled: 1,
  },
  {
    code: 'stripe_cards',
    name: 'Visa / Mastercard (International Cards)',
    adapter_type: 'card',
    region: 'Global',
    countries: ['GLOBAL', 'United States', 'United Kingdom', 'France', 'Germany', 'Canada', 'Singapore', 'United Arab Emirates', 'Rwanda', 'Kenya', 'Nigeria', 'South Africa'],
    supported_currencies: ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'NGN'],
    is_enabled: 1,
  },
  {
    code: 'paypal',
    name: 'PayPal Global Checkout',
    adapter_type: 'wallet',
    region: 'International',
    countries: ['GLOBAL', 'United States', 'United Kingdom', 'France', 'Germany', 'Canada', 'Singapore', 'United Arab Emirates'],
    supported_currencies: ['USD', 'EUR', 'GBP'],
    is_enabled: 1,
  },
  {
    code: 'flutterwave_africa',
    name: 'Flutterwave Regional Mobile & Cards',
    adapter_type: 'regional_gateway',
    region: 'Pan-African & Global',
    countries: ['Rwanda', 'Kenya', 'Uganda', 'Tanzania', 'Nigeria', 'South Africa', 'RW', 'KE', 'UG', 'TZ', 'NG', 'ZA'],
    supported_currencies: ['RWF', 'KES', 'UGX', 'NGN', 'USD', 'EUR'],
    is_enabled: 1,
  },
];

function ensurePaymentSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals INTEGER NOT NULL DEFAULT 2,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      base_currency TEXT NOT NULL REFERENCES currencies(code),
      target_currency TEXT NOT NULL REFERENCES currencies(code),
      rate REAL NOT NULL CHECK (rate > 0),
      source TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      UNIQUE (base_currency, target_currency)
    );

    CREATE TABLE IF NOT EXISTS payment_providers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      region TEXT NOT NULL,
      countries_json TEXT NOT NULL DEFAULT '[]',
      supported_currencies_json TEXT NOT NULL DEFAULT '[]',
      mode TEXT NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production')),
      is_enabled INTEGER NOT NULL DEFAULT 1,
      connection_status TEXT NOT NULL DEFAULT 'missing_credentials',
      last_checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      transaction_ref TEXT NOT NULL UNIQUE,
      idempotency_key TEXT UNIQUE,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      customer_phone_masked TEXT DEFAULT '',
      country TEXT NOT NULL DEFAULT 'Rwanda',
      plan_id TEXT DEFAULT '',
      service_name TEXT NOT NULL,
      provider_code TEXT NOT NULL REFERENCES payment_providers(code),
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL REFERENCES currencies(code),
      amount_usd REAL NOT NULL DEFAULT 0,
      exchange_rate REAL NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded')),
      external_reference TEXT DEFAULT '',
      failure_reason TEXT DEFAULT '',
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
      transaction_ref TEXT NOT NULL,
      provider_code TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      external_reference TEXT DEFAULT '',
      raw_status TEXT DEFAULT '',
      error_message TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id TEXT PRIMARY KEY,
      provider_code TEXT NOT NULL,
      event_id TEXT NOT NULL,
      payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
      transaction_ref TEXT DEFAULT '',
      signature_valid INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed',
      processed_at TEXT NOT NULL,
      UNIQUE (provider_code, event_id)
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
      transaction_ref TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
      external_refund_id TEXT DEFAULT '',
      initiated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      service_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'refunded', 'void')),
      receipt_json TEXT NOT NULL DEFAULT '{}',
      issued_at TEXT NOT NULL,
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
      last_payment_id TEXT,
      activated_at TEXT NOT NULL,
      expires_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_provider_country ON payments(provider_code, country);
    CREATE INDEX IF NOT EXISTS idx_payment_tx_payment_id ON payment_transactions(payment_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_webhooks_ref ON payment_webhooks(transaction_ref);
    CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id, issued_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_logs(created_at DESC);
  `);

  const nowIso = new Date().toISOString();

  const insertCurrency = db.prepare(`
    INSERT OR IGNORE INTO currencies (code, name, symbol, decimals, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const c of DEFAULT_CURRENCIES) {
    insertCurrency.run(c.code, c.name, c.symbol, c.decimals, c.is_active, nowIso);
  }

  const insertProvider = db.prepare(`
    INSERT OR IGNORE INTO payment_providers (
      id, code, name, adapter_type, region, countries_json, supported_currencies_json,
      mode, is_enabled, connection_status, last_checked_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sandbox', ?, 'missing_credentials', NULL, ?, ?)
  `);
  for (const p of DEFAULT_PROVIDERS) {
    insertProvider.run(
      `prov_${p.code}`,
      p.code,
      p.name,
      p.adapter_type,
      p.region,
      JSON.stringify(p.countries),
      JSON.stringify(p.supported_currencies),
      p.is_enabled,
      nowIso,
      nowIso
    );
  }

  return db;
}

function getSharedPaymentDb() {
  const db = getSharedAuthDb();
  return ensurePaymentSchema(db);
}

module.exports = {
  ensurePaymentSchema,
  getSharedPaymentDb,
  DEFAULT_CURRENCIES,
  DEFAULT_PROVIDERS,
};
