# TOLKFLOW — Global Communication & Automated Payment Platform

TOLKFLOW is a full-stack multilingual communication platform built with **React 19, TypeScript, Tailwind CSS v4, Vite, Node.js HTTP/WebSocket, and SQLite (`node:sqlite`)** alongside reference PostgreSQL schemas and migrations.

It includes:
- Real-time P2P/group messaging, WebRTC voice/video calls, AI translation, Flow Rooms, and News/Compliance governance.
- **Account Registration & Email OTP Verification System** (`server/authService.cjs`, `server/emailService.cjs`).
- **Automated Payment Gateway** supporting **MTN Mobile Money (Rwanda Collections API)** and **International Gateways (Stripe Cards, PayPal, Flutterwave Africa)** with verified live FX conversion, webhook/callback signature verification, immutable transaction ledgers, invoices/receipts, and a real-time **Admin Financial Dashboard** over SSE & WebSockets.

---

## 1. Prerequisites

- **Node.js 22.x** or higher (uses built-in `node:sqlite` and `node:test`)
- **npm** 10+

---

## 2. Installation

```bash
npm install
```

Copy the example environment file and configure your secrets in `.env` (never commit `.env`):

```bash
cp .env.example .env
```

---

## 3. Environment Configuration

All sensitive API keys and credentials are **backend-only** (never prefixed with `VITE_`):

### Security & Database
- `AUTH_SESSION_SECRET`: 32+ byte random hex string for session token signing.
- `OTP_HMAC_SECRET`: 32+ byte random hex string for OTP hash verification.
- `DB_PATH`: Optional path to the SQLite database file (defaults to `.data/tolkflow.db`).

### Email Delivery (Required for Account Registration OTPs)
Configure at least one provider:
- **Resend**: `RESEND_API_KEY`, `EMAIL_FROM`
- **SendGrid**: `SENDGRID_API_KEY`, `EMAIL_FROM`
- **SMTP (Nodemailer)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### MTN MoMo Collections API (Rwanda)
- `APP_BASE_URL`: Public HTTPS URL for callbacks (e.g. `https://your-domain.com` or `http://localhost:3000` in dev)
- `MTN_MOMO_ENV`: `sandbox` for testing or `mtnrwanda` for production
- `MTN_MOMO_BASE_URL`: `https://sandbox.momodeveloper.mtn.com` (sandbox) or MTN production endpoint
- `MTN_MOMO_SUBSCRIPTION_KEY`: MTN Collections Primary Subscription Key (`Ocp-Apim-Subscription-Key`)
- `MTN_MOMO_API_USER`: Provisioned API User UUID (`X-Reference-Id`)
- `MTN_MOMO_API_KEY`: Generated API Key for OAuth 2.0 token exchange
- `MTN_MOMO_TARGET_ENVIRONMENT`: `sandbox` or `mtnrwanda`
- `MTN_MOMO_CALLBACK_URL`: Override callback URL (`/api/payments/mtn/callback`)
- `MTN_MOMO_CALLBACK_SECRET`: Optional HMAC SHA-256 secret for callback verification

### International Payment Providers & FX Rates
- **Stripe (Visa/Mastercard)**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **PayPal**: `PAYPAL_ENV` (`sandbox`/`live`), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- **Flutterwave (Africa)**: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`
- **FX API**: `EXCHANGE_RATE_API_URL` (defaults to `https://open.er-api.com/v6/latest/USD`), optional `EXCHANGE_RATE_API_KEY`

> Note: TOLKFLOW never invents exchange rates. If no live FX API rate or cached DB rate is available for a currency conversion, checkout returns `503 EXCHANGE_RATE_UNAVAILABLE` (or `USD` can be used directly).

---

## 4. Database Setup & Migrations

### SQLite (Built-in Default)
Both development (`vite.config.ts`) and production (`server.cjs`) automatically initialize the SQLite schema and seed payment providers/currencies on startup inside `DB_PATH` (default `.data/tolkflow.db`) using:
- `server/authDb.cjs`
- `server/paymentDb.cjs`

### PostgreSQL Reference Migrations
If deploying with PostgreSQL (`DATABASE_URL`), apply the full schema and ordered migrations:

```bash
psql "$DATABASE_URL" -f src/db/schema.sql
psql "$DATABASE_URL" -f src/db/migrations/001_email_verification_and_auth.sql
psql "$DATABASE_URL" -f src/db/migrations/002_payment_system.sql
```

---

## 5. Running the Application

### Development Mode (Vite + Backend Middleware + WebSocket Signaling on Port 3000)
```bash
npm run dev
```

### TypeScript Check & Production Build
```bash
npm run lint
npm run build
```

### Production Server (`dist/` + API + WebSockets on Port 3000)
```bash
npm run build
npm start
```

---

## 6. Running Automated Tests

Run both the authentication/OTP suite and the complete payment gateway suite:

```bash
node --test tests/auth.test.mjs tests/payments.test.mjs
```

### Covered Payment Test Scenarios (`tests/payments.test.mjs`)
1. **Successful MTN MoMo Payment**: RequestToPay returns `pending` (`202`), revenue remains `$0`, verified `SUCCESSFUL` status updates ledger, invoice/receipt, `user_subscriptions`, and revenue totals.
2. **Failed MTN MoMo Payment**: Provider failure marks payment `failed`, preserves immutable ledger history, and leaves revenue unchanged.
3. **Pending Payment**: `PENDING` status keeps subscription inactive and revenue at `0`.
4. **Duplicate Callback**: Duplicate MTN callback `eventId` is deduplicated idempotently in `payment_webhooks` without double-counting revenue.
5. **International Payment Success**: Stripe checkout with verified FX conversion + HMAC `Stripe-Signature` webhook marks payment `successful` and activates subscription.
6. **International Payment Failure & Bad Signature**: Rejects invalid webhook signatures (`401`) and processes `payment_intent.payment_failed` cleanly.
7. **Invalid Transaction Reference**: Returns `404 INVALID_TRANSACTION_REFERENCE`.
8. **Unauthorized Admin Access**: Enforces `401` for unauthenticated requests and `403` for non-admin users on `/api/admin/payments`, `/api/admin/revenue`, `/api/admin/payment-reports`, and `/api/admin/payments/refund`.
9. **Database Failure**: Gracefully handles database errors with structured `503 DATABASE_UNAVAILABLE` JSON responses.
10. **Provider Timeout**: Handles slow gateway timeouts (`AbortError`) cleanly with `504 PROVIDER_TIMEOUT`.

---

## 7. Security & Financial Integrity Guarantees

- **No Premature Success**: Payments are never marked `successful` from an initial `202` RequestToPay/checkout creation response; confirmation requires verified provider status checks or cryptographically verified webhooks.
- **No Unverified Admin Approval**: Administrators can view transactions, download CSV/JSON reports, inspect receipts, and issue refunds on confirmed payments—never manually declare unverified payments as paid.
- **No Raw Card/PIN Handling**: Requests containing `cvv`, `cvc`, `pin`, `momoPin`, or `cardNumber` are rejected (`400 FORBIDDEN_SENSITIVE_FIELD`).
- **Immutable Financial Ledger**: `payment_transactions` and `payment_audit_logs` retain complete event history across failures, cancellations, and refunds.
