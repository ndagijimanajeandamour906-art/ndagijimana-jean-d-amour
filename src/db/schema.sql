-- =====================================================================
-- TOLKFLOW DATABASE ARCHITECTURE SCHEMA (PostgreSQL / Supabase Relational Schema)
-- 23 Core Relational Tables with Indexes, Constraints, and Foreign Keys
-- =====================================================================

-- 1. Supported Languages
CREATE TABLE IF NOT EXISTS supported_languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    flag VARCHAR(10) NOT NULL,
    region VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(50) PRIMARY KEY,
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
    preferred_language VARCHAR(10) REFERENCES supported_languages(code) DEFAULT 'en',
    role VARCHAR(50) REFERENCES roles(id) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (account_status IN ('unverified', 'verified', 'suspended')),
    is_suspended BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. Email Verifications (Hashed 6-digit OTP tokens, single-use, 5-minute TTL)
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4c. User Sessions (Server-verified session hashes + CSRF token)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    csrf_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(is_verified, account_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_created ON email_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- 5. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    status_text VARCHAR(255) DEFAULT 'Connecting with the world',
    online_status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    interests TEXT[] DEFAULT '{}',
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    title VARCHAR(150),
    avatar_url TEXT,
    description TEXT,
    created_by UUID REFERENCES users(id),
    is_encrypted BOOLEAN DEFAULT TRUE,
    auto_translate BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Conversation Members
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID,
    PRIMARY KEY (conversation_id, user_id)
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    text_content TEXT NOT NULL,
    detected_language VARCHAR(10) REFERENCES supported_languages(code),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'video', 'file', 'system')),
    media_url TEXT,
    media_size VARCHAR(50),
    media_duration INTEGER,
    reply_to_id UUID REFERENCES messages(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    delivery_status VARCHAR(20) DEFAULT 'delivered' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Message Translations (Stores pre-computed or on-demand multilingual translations)
CREATE TABLE IF NOT EXISTS message_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    target_language VARCHAR(10) NOT NULL REFERENCES supported_languages(code),
    translated_text TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'tolkflow-gemini',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, target_language)
);

-- 10. Groups
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    photo_url TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    member_limit INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Group Members
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 12. Contacts
CREATE TABLE IF NOT EXISTS contacts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100),
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, contact_user_id)
);

-- 13. Posts (Social Media Feed)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    original_language VARCHAR(10) REFERENCES supported_languages(code),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    location VARCHAR(150),
    hashtags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Post Media
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
);

-- 15. Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    original_language VARCHAR(10) REFERENCES supported_languages(code),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Reactions
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('message', 'post', 'comment', 'story')),
    target_id UUID NOT NULL,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id, emoji)
);

-- 17. Stories (24h Ephemeral Status)
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('text', 'image', 'video')),
    media_url TEXT,
    caption TEXT,
    background_style VARCHAR(100),
    viewers_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Calls (WebRTC Logs)
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    conversation_id UUID REFERENCES conversations(id),
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('voice', 'video')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('missed', 'completed', 'declined', 'failed')),
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user', 'post', 'message', 'group')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Blocked Users
CREATE TABLE IF NOT EXISTS blocked_users (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, blocked_user_id)
);

-- 22. Devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(150) NOT NULL,
    browser VARCHAR(100),
    ip_address VARCHAR(50),
    location VARCHAR(100),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT FALSE
);

-- 23. Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-throughput queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- 24. National News Articles
CREATE TABLE IF NOT EXISTS national_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    official_source VARCHAR(150) NOT NULL,
    official_source_url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    verified_by VARCHAR(150),
    is_breaking BOOLEAN DEFAULT FALSE,
    viewers_count INTEGER DEFAULT 1,
    image_url TEXT,
    ai_analysis JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. National Laws & Regulatory Compliance
CREATE TABLE IF NOT EXISTS national_laws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    title_kinyarwanda VARCHAR(255),
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    gazette_number VARCHAR(100) NOT NULL,
    published_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'requires_action' CHECK (status IN ('compliant', 'requires_action', 'under_review', 'action_taken')),
    category VARCHAR(50) NOT NULL,
    official_source VARCHAR(150) NOT NULL,
    official_source_url TEXT,
    affected_entities TEXT[] DEFAULT '{}',
    summary TEXT NOT NULL,
    summary_kinyarwanda TEXT,
    full_articles_highlight TEXT,
    platform_impact_summary TEXT,
    platform_action_taken TEXT,
    requires_admin_approval BOOLEAN DEFAULT TRUE,
    affected_users_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Legal Audit Logs (Immutable regulatory action log)
CREATE TABLE IF NOT EXISTS legal_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_id UUID REFERENCES national_laws(id) ON DELETE SET NULL,
    law_title VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    action_taken TEXT NOT NULL,
    reviewed_by VARCHAR(150) NOT NULL,
    reviewer_role VARCHAR(50) NOT NULL,
    legal_reference VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL,
    affected_system_module VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Jurisdictions Profiles
CREATE TABLE IF NOT EXISTS jurisdictions (
    country_code VARCHAR(10) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    flag VARCHAR(10) NOT NULL,
    primary_language VARCHAR(50) NOT NULL,
    data_protection_authority VARCHAR(150) NOT NULL,
    emergency_cyber_contact VARCHAR(150) NOT NULL,
    requires_parental_consent_under INTEGER DEFAULT 18,
    encryption_mandate VARCHAR(30) DEFAULT 'mandatory',
    active_laws_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Screen Time & Digital Wellbeing Logs
CREATE TABLE IF NOT EXISTS screen_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_minutes INTEGER NOT NULL DEFAULT 0,
    breaks_taken INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 29. System Health Audits
CREATE TABLE IF NOT EXISTS system_health_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type VARCHAR(50) NOT NULL,
    total_modules INTEGER NOT NULL,
    operational_modules INTEGER NOT NULL,
    failing_modules INTEGER NOT NULL,
    avg_api_latency_ms NUMERIC(6, 2) NOT NULL,
    db_pool_status VARCHAR(50) NOT NULL,
    cpu_percent NUMERIC(5, 2) NOT NULL,
    memory_used_mb INTEGER NOT NULL,
    concurrency_capacity INTEGER NOT NULL,
    run_by VARCHAR(150) NOT NULL,
    report_summary JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. Automated Repairs History
CREATE TABLE IF NOT EXISTS automated_repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id VARCHAR(100) NOT NULL,
    module_name VARCHAR(150) NOT NULL,
    issue_description TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    repair_status VARCHAR(50) NOT NULL CHECK (repair_status IN ('fixed_and_tested', 'working_without_changes', 'partially_working', 'blocked_by_infrastructure')),
    test_verification_result TEXT NOT NULL,
    repaired_by VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Extended Indexes for 5,000+ Concurrent Scalability
CREATE INDEX IF NOT EXISTS idx_national_news_country ON national_news(country_code, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_national_laws_status ON national_laws(status, country_code);
CREATE INDEX IF NOT EXISTS idx_legal_audit_logs_timestamp ON legal_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_screen_time_user_date ON screen_time_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_system_health_audits_created ON system_health_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automated_repairs_module ON automated_repairs(module_id, timestamp DESC);

-- 31. Project Owners (Dedicated Single Permanent Owner Registry)
CREATE TABLE IF NOT EXISTS project_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    owner_code_hash VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
    profile_picture TEXT,
    account_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'verified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_owners_email ON project_owners(email);
CREATE INDEX IF NOT EXISTS idx_project_owners_phone ON project_owners(phone_number);
CREATE INDEX IF NOT EXISTS idx_project_owners_status ON project_owners(account_status);

-- =====================================================================
-- 32-40. TOLKFLOW AUTOMATIC PAYMENT GATEWAY TABLES (See 002_payment_system.sql)
-- =====================================================================
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    symbol VARCHAR(12) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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


