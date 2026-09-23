-- ============================================================
-- WE NEED YOUR HELP — D1 Database Schema
-- این فایل را یک بار در Cloudflare D1 اجرا کنید.
-- ============================================================

-- ---------- جدول Donations ----------
CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    payment_request_id TEXT,
    donor_name TEXT DEFAULT 'Anonymous',
    donor_message TEXT DEFAULT '',
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    network TEXT NOT NULL,
    transaction_hash TEXT UNIQUE,
    wallet_address TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    public_visibility INTEGER DEFAULT 1,
    leaderboard_visibility INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_donations_status
    ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_confirmed_at
    ON donations(confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_leaderboard
    ON donations(leaderboard_visibility, amount DESC);
CREATE INDEX IF NOT EXISTS idx_donations_public
    ON donations(public_visibility, confirmed_at DESC);

-- ---------- جدول Payment Requests ----------
CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    requested_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    network TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT DEFAULT 'AWAITING_PAYMENT',
    created_block INTEGER,
    transaction_hash TEXT,
    donation_id TEXT,
    donor_name TEXT DEFAULT 'Anonymous',
    donor_message TEXT DEFAULT '',
    public_visibility INTEGER DEFAULT 1,
    leaderboard_visibility INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pr_status
    ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_created
    ON payment_requests(created_at DESC);

-- ---------- جدول Milestones ----------
CREATE TABLE IF NOT EXISTS milestones (
    amount REAL PRIMARY KEY,
    status TEXT DEFAULT 'PENDING',
    reached_at TEXT
);

-- ---------- جدول Social Posts (برای فازهای بعدی) ----------
CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content TEXT NOT NULL,
    media_path TEXT,
    status TEXT DEFAULT 'PENDING',
    external_post_id TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    published_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_unique_daily
    ON social_posts(platform, content_type, substr(created_at, 1, 10));

-- ---------- جدول Cron Logs (برای idempotency) ----------
CREATE TABLE IF NOT EXISTS cron_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    status TEXT DEFAULT 'STARTED',
    details TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(job_name, run_date)
);

-- ---------- مقدار اولیه Milestones ----------
INSERT OR IGNORE INTO milestones (amount, status) VALUES
    (10, 'PENDING'),
    (100, 'PENDING'),
    (1000, 'PENDING'),
    (10000, 'PENDING'),
    (100000, 'PENDING'),
    (1000000, 'PENDING');
