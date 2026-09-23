/* ============================================================
   WE NEED YOUR HELP — Cloudflare Worker Backend
   این فایل در Cloudflare Dashboard کپی-پیست می‌شود.
   Dependencies: D1 binding با نام "DB"
   ============================================================ */

// ============================================================
// 1. CONFIG — تنظیمات اصلی
// ============================================================

const CONFIG = {
    // تاریخ راه‌اندازی پروژه (YYYY-MM-DD) — برای Days Since Launch
    LAUNCH_DATE: "2026-09-23",

    // انقضای درخواست پرداخت (دقیقه)
    PAYMENT_REQUEST_TTL_MINUTES: 60,

    // مهلت اضافی بعد از انقضا برای پذیرش پرداخت دیرهنگام (ساعت)
    PAYMENT_GRACE_HOURS: 24,

    // تلورانس پذیرش مبلغ (کسری تا 1%)
    AMOUNT_TOLERANCE: 0.01,

    // حداکثر تعداد رکورد در Recent و Leaderboard
    RECENT_LIMIT: 50,
    LEADERBOARD_LIMIT: 3,

    // شبکه‌های پشتیبانی‌شده
    NETWORKS: {
        polygon: {
            name: "Polygon",
            chainId: 137,
            rpc: "https://polygon-rpc.com",
            explorer: "https://polygonscan.com",
            token: {
                symbol: "USDT",
                address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                decimals: 6
            },
            destination: "0xf80C6b072AF48331Bd03E3a9355C305aab02146A",
            confirmations: 12
        },
        base: {
            name: "Base",
            chainId: 8453,
            rpc: "https://mainnet.base.org",
            explorer: "https://basescan.org",
            token: {
                symbol: "USDC",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                decimals: 6
            },
            destination: "0xf80C6b072AF48331Bd03E3a9355C305aab02146A",
            confirmations: 12
        },
        ethereum: {
            name: "Ethereum",
            chainId: 1,
            rpc: "https://eth.llamarpc.com",
            explorer: "https://etherscan.io",
            token: {
                symbol: "USDT",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                decimals: 6
            },
            destination: "0xf80C6b072AF48331Bd03E3a9355C305aab02146A",
            confirmations: 12
        },
        tron: {
            name: "TRON",
            chainId: null,
            rpc: "https://api.trongrid.io",
            explorer: "https://tronscan.org",
            token: {
                symbol: "USDT",
                address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                decimals: 6
            },
            destination: "TGD6jBjf7Dwi89JSbCMFENkD665G73uKzT",
            confirmations: 19,
            isTron: true
        }
    }
};

// ============================================================
// 2. Utility Functions
// ============================================================

/**
 * پاسخ JSON استاندارد
 */
function json(data, status, extraHeaders) {
    const headers = Object.assign(
        {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        },
        extraHeaders || {}
    );
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers
    });
}

/**
 * CORS headers — اجازه دسترسی از دامنه فرانت‌اند
 */
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
    };
}

/**
 * پاسخ JSON با CORS
 */
function jsonCors(data, status) {
    return json(data, status, corsHeaders());
}

/**
 * تولید ID کوتاه تصادفی (24 کاراکتر hex)
 */
function shortId() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * زمان حال به فرمت ISO 8601 UTC
 */
function nowIso() {
    return new Date().toISOString();
}

/**
 * تبدیل ISO string به timestamp عددی
 */
function toMillis(iso) {
    return new Date(iso).getTime();
}

/**
 * بررسی معتبر بودن آدرس EVM (0x + 40 hex)
 */
function isValidEvmAddress(addr) {
    return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/**
 * بررسی معتبر بودن آدرس TRON (شروع با T، 34 کاراکتر base58)
 */
function isValidTronAddress(addr) {
    return typeof addr === "string" && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
}

/**
 * Sanitize متن ورودی کاربر
 */
function sanitizeText(text, maxLen) {
    if (typeof text !== "string") return "";
    // حذف کاراکترهای کنترل و فاصله‌های اضافی
    let s = text.replace(/[\u0000-\u001F\u007F]/g, " ");
    s = s.trim().slice(0, maxLen || 200);
    return s;
}

// ============================================================
// 3. Database Helpers
// ============================================================

/**
 * خواندن یک ردیف donation با id
 */
async function getDonationById(env, id) {
    return await env.DB
        .prepare("SELECT * FROM donations WHERE id = ?")
        .bind(id)
        .first();
}

/**
 * خواندن یک ردیف payment_request با id
 */
async function getPaymentRequestById(env, id) {
    return await env.DB
        .prepare("SELECT * FROM payment_requests WHERE id = ?")
        .bind(id)
        .first();
}

/**
 * مجموع کل کمک‌های تأییدشده
 */
async function getTotalRaised(env) {
    const row = await env.DB
        .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE status = 'CONFIRMED'")
        .first();
    return Number(row && row.total) || 0;
}

/**
 * تعداد کمک‌ها (donations تأییدشده)
 */
async function getTotalDonors(env) {
    const row = await env.DB
        .prepare("SELECT COUNT(*) AS c FROM donations WHERE status = 'CONFIRMED'")
        .first();
    return Number(row && row.c) || 0;
}

/**
 * محاسبه روزهای سپری شده از راه‌اندازی
 */
function getDaysSinceLaunch() {
    const launch = new Date(CONFIG.LAUNCH_DATE + "T00:00:00Z").getTime();
    const now = Date.now();
    if (now < launch) return 1;
    return Math.floor((now - launch) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * بررسی تکراری بودن transaction_hash
 */
async function isTxHashUsed(env, txHash) {
    const row = await env.DB
        .prepare("SELECT id FROM donations WHERE transaction_hash = ?")
        .bind(txHash)
        .first();
    return !!row;
}

/**
 * به‌روزرسانی وضعیت milestones بر اساس مجموع فعلی
 */
async function updateMilestones(env, total) {
    const now = nowIso();
    await env.DB
        .prepare(
            "UPDATE milestones SET status = 'REACHED', reached_at = ? " +
            "WHERE status = 'PENDING' AND amount <= ?"
        )
        .bind(now, total)
        .run();
}

// ============================================================
// 4. Blockchain — EVM Adapter
// ============================================================

const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * فراخوانی JSON-RPC روی شبکه EVM
 */
async function evmRpc(network, method, params) {
    const net = CONFIG.NETWORKS[network];
    if (!net || net.isTron) throw new Error("Not an EVM network: " + network);

    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: method,
        params: params || []
    };

    const res = await fetch(net.rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("RPC HTTP " + res.status);
    const data = await res.json();
    if (data.error) throw new Error("RPC: " + (data.error.message || "unknown"));
    return data.result;
}

/**
 * گرفتن شماره بلاک فعلی
 */
async function evmGetCurrentBlock(network) {
    const hex = await evmRpc(network, "eth_blockNumber", []);
    return parseInt(hex, 16);
}

/**
 * گرفتن Transfer logs از توکن به مقصد، از بلاک مشخص تا الان
 */
async function evmGetTransferLogs(network, fromBlock) {
    const net = CONFIG.NETWORKS[network];
    const toBlock = await evmGetCurrentBlock(network);

    // اگر بازه خیلی زیاد است، محدود کن (برای RPC های رایگان)
    const MAX_RANGE = 50000;
    const startBlock = Math.max(fromBlock, toBlock - MAX_RANGE);

    // topic[2] = آدرس مقصد (با padding چپ تا 32 بایت)
    const paddedDest =
        "0x" + net.destination.toLowerCase().slice(2).padStart(64, "0");

    const logs = await evmRpc(network, "eth_getLogs", [
        {
            fromBlock: "0x" + startBlock.toString(16),
            toBlock: "0x" + toBlock.toString(16),
            address: net.token.address,
            topics: [TRANSFER_TOPIC, null, paddedDest]
        }
    ]);

    return { logs: logs || [], currentBlock: toBlock };
}

/**
 * تجزیه یک Transfer log به اطلاعات قابل استفاده
 */
function parseEvmTransferLog(log, network) {
    const net = CONFIG.NETWORKS[network];
    try {
        const rawValue = BigInt(log.data);
        const amount = Number(rawValue) / Math.pow(10, net.token.decimals);
        const from = "0x" + log.topics[1].slice(26);
        return {
            from: from,
            to: net.destination,
            amount: amount,
            txHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16)
        };
    } catch (e) {
        return null;
    }
}

// ============================================================
// 5. Blockchain — TRON Adapter
// ============================================================

/**
 * گرفتن تراکنش‌های TRC-20 دریافتی توسط آدرس
 */
async function tronGetIncomingTransfers(network, minTimestampMs) {
    const net = CONFIG.NETWORKS[network];
    const url =
        net.rpc +
        "/v1/accounts/" +
        encodeURIComponent(net.destination) +
        "/transactions/trc20" +
        "?only_to=true&limit=200&min_timestamp=" +
        minTimestampMs;

    const res = await fetch(url, {
        headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error("TronGrid HTTP " + res.status);
    const data = await res.json();
    return data.data || [];
}

/**
 * تجزیه یک تراکنش TRC-20
 */
function parseTronTransfer(tx, network) {
    const net = CONFIG.NETWORKS[network];
    try {
        if (!tx.token_info || !tx.token_info.address) return null;
        if (tx.token_info.address !== net.token.address) return null;

        const decimals = tx.token_info.decimals || 6;
        const amount = Number(tx.value) / Math.pow(10, decimals);

        return {
            from: tx.from,
            to: net.destination,
            amount: amount,
            txHash: tx.transaction_id,
            blockNumber: 0,
            timestamp: tx.block_timestamp
        };
    } catch (e) {
        return null;
    }
}

// ============================================================
// 6. Payment Verification
// ============================================================

/**
 * تلاش برای پیدا کردن تراکنش متناظر با یک payment_request
 * ورودی: payment_request
 * خروجی: null یا { from, amount, txHash }
 */
async function tryVerifyPayment(env, pr) {
    const network = pr.network;
    const net = CONFIG.NETWORKS[network];
    if (!net) return null;

    const requestedAmount = Number(pr.requested_amount);
    const minAcceptable = requestedAmount * (1 - CONFIG.AMOUNT_TOLERANCE);
    const createdMs = toMillis(pr.created_at);

    if (net.isTron) {
        return await tryVerifyTron(env, pr, minAcceptable, createdMs);
    } else {
        return await tryVerifyEvm(env, pr, minAcceptable);
    }
}

/**
 * تأیید پرداخت روی شبکه EVM
 */
async function tryVerifyEvm(env, pr, minAcceptable) {
    const network = pr.network;

    // اگر created_block ذخیره نشده، از یک بازه پیش‌فرض استفاده کن
    let fromBlock = pr.created_block;
    if (!fromBlock) {
        const current = await evmGetCurrentBlock(network);
        fromBlock = Math.max(0, current - 50000);
    }

    const result = await evmGetTransferLogs(network, fromBlock);

    // مرتب‌سازی نزولی بر اساس بلاک (جدیدترین اول)
    const parsed = result.logs
        .map((log) => parseEvmTransferLog(log, network))
        .filter((p) => p !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

    for (const tx of parsed) {
        if (tx.amount < minAcceptable) continue;

        // بررسی تکراری نبودن tx hash
        const used = await isTxHashUsed(env, tx.txHash);
        if (used) continue;

        return {
            from: tx.from,
            amount: tx.amount,
            txHash: tx.txHash
        };
    }

    return null;
}

/**
 * تأیید پرداخت روی شبکه TRON
 */
async function tryVerifyTron(env, pr, minAcceptable, createdMs) {
    const network = pr.network;

    // کمی عقب‌تر برو (تلورانس کلاک)
    const minTs = createdMs - 60000;
    const transfers = await tronGetIncomingTransfers(network, minTs);

    const parsed = transfers
        .map((tx) => parseTronTransfer(tx, network))
        .filter((p) => p !== null)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    for (const tx of parsed) {
        if (tx.amount < minAcceptable) continue;

        const used = await isTxHashUsed(env, tx.txHash);
        if (used) continue;

        return {
            from: tx.from,
            amount: tx.amount,
            txHash: tx.txHash
        };
    }

    return null;
}

// ============================================================
// 7. Route Handlers
// ============================================================

/**
 * GET /api/stats
 */
async function handleStats(env) {
    const total = await getTotalRaised(env);
    const donors = await getTotalDonors(env);
    const days = getDaysSinceLaunch();

    return jsonCors({
        totalRaised: Math.round(total * 100) / 100,
        totalDonors: donors,
        daysSinceLaunch: days
    });
}

/**
 * GET /api/milestones
 */
async function handleMilestones(env) {
    const { results } = await env.DB
        .prepare("SELECT amount, status, reached_at FROM milestones ORDER BY amount ASC")
        .all();

    const list = (results || []).map((row) => ({
        amount: Number(row.amount),
        reached: row.status === "REACHED",
        reachedAt: row.reached_at || null
    }));

    return jsonCors(list);
}

/**
 * GET /api/donations/recent
 */
async function handleRecentDonations(env) {
    const { results } = await env.DB
        .prepare(
            "SELECT id, donor_name, donor_message, amount, network, confirmed_at " +
            "FROM donations WHERE status = 'CONFIRMED' AND public_visibility = 1 " +
            "ORDER BY confirmed_at DESC LIMIT ?"
        )
        .bind(CONFIG.RECENT_LIMIT)
        .all();

    const list = (results || []).map((row) => ({
        id: row.id,
        name: row.donor_name || "Anonymous",
        message: row.donor_message || "",
        amount: Number(row.amount) || 0,
        network: row.network,
        date: row.confirmed_at
    }));

    return jsonCors(list);
}

/**
 * GET /api/donations/leaderboard
 * سه نفر برتر بر اساس مجموع کمک‌های هر کیف پول
 */
async function handleLeaderboard(env) {
    const { results } = await env.DB
        .prepare(
            "SELECT donor_name, SUM(amount) AS total " +
            "FROM donations WHERE status = 'CONFIRMED' AND leaderboard_visibility = 1 " +
            "GROUP BY wallet_address " +
            "ORDER BY total DESC LIMIT ?"
        )
        .bind(CONFIG.LEADERBOARD_LIMIT)
        .all();

    // نکته: ممکن است یک کیف پول با چند نام مختلف کمک کرده باشد.
    // در این حالت، آخرین نام را برمی‌داریم.
    const list = (results || []).map((row) => ({
        name: row.donor_name || "Anonymous",
        total: Math.round((Number(row.total) || 0) * 100) / 100
    }));

    return jsonCors(list);
}

/**
 * GET /api/donations/:id
 */
async function handleDonationById(env, id) {
    if (!id || !/^[a-f0-9]{24}$/.test(id)) {
        return jsonCors({ error: "Invalid ID" }, 400);
    }

    const row = await getDonationById(env, id);
    if (!row || row.status !== "CONFIRMED") {
        return jsonCors({ error: "Not found" }, 404);
    }

    return jsonCors({
        id: row.id,
        name: row.donor_name || "Anonymous",
        message: row.donor_message || "",
        amount: Number(row.amount) || 0,
        network: row.network,
        transactionHash: row.transaction_hash,
        date: row.confirmed_at
    });
}

/**
 * POST /api/payment/create
 * بدنه: { name, message, amount, network, publicName, publicLeaderboard }
 */
async function handlePaymentCreate(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonCors({ error: "Invalid JSON body" }, 400);
    }

    // اعتبارسنجی مبلغ
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount < 1 || amount > 1000000) {
        return jsonCors({ error: "Invalid amount" }, 400);
    }

    // اعتبارسنجی شبکه
    const network = String(body.network || "").toLowerCase();
    const net = CONFIG.NETWORKS[network];
    if (!net) {
        return jsonCors({ error: "Unsupported network" }, 400);
    }

    // اعتبارسنجی آدرس مقصد
    if (
        !net.destination ||
        net.destination.indexOf("REPLACE_ME") === 0 ||
        (net.isTron ? !isValidTronAddress(net.destination) : !isValidEvmAddress(net.destination))
    ) {
        return jsonCors(
            { error: "Destination wallet not configured yet. Contact support." },
            500
        );
    }

    // Sanitize ورودی‌ها
    const donorName = sanitizeText(body.name, 40) || "Anonymous";
    const donorMessage = sanitizeText(body.message, 120);
    const publicVisibility = body.publicName === false ? 0 : 1;
    const leaderboardVisibility = body.publicLeaderboard === false ? 0 : 1;

    // ذخیره شماره بلاک فعلی (برای EVM) برای بررسی سریع‌تر در آینده
    let createdBlock = null;
    if (!net.isTron) {
        try {
            createdBlock = await evmGetCurrentBlock(network);
        } catch (e) {
            // اگر RPC fail شد، مهم نیست — بعداً با بازه پیش‌فرض بررسی می‌کنیم
            createdBlock = null;
        }
    }

    const id = shortId();
    const createdAt = nowIso();
    const expiresAt = new Date(
        Date.now() + CONFIG.PAYMENT_REQUEST_TTL_MINUTES * 60 * 1000
    ).toISOString();

    await env.DB
        .prepare(
            "INSERT INTO payment_requests " +
            "(id, requested_amount, currency, network, destination, status, " +
            " created_block, donor_name, donor_message, public_visibility, " +
            " leaderboard_visibility, created_at, expires_at) " +
            "VALUES (?, ?, ?, ?, ?, 'AWAITING_PAYMENT', ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
            id,
            amount,
            net.token.symbol,
            network,
            net.destination,
            createdBlock,
            donorName,
            donorMessage,
            publicVisibility,
            leaderboardVisibility,
            createdAt,
            expiresAt
        )
        .run();

    return jsonCors({
        requestId: id,
        destination: net.destination,
        amount: amount,
        token: net.token.symbol,
        network: network,
        expiresAt: expiresAt
    });
}

/**
 * GET /api/payment/status/:requestId
 */
async function handlePaymentStatus(env, requestId) {
    if (!requestId || !/^[a-f0-9]{24}$/.test(requestId)) {
        return jsonCors({ error: "Invalid request ID" }, 400);
    }

    const pr = await getPaymentRequestById(env, requestId);
    if (!pr) {
        return jsonCors({ error: "Payment request not found" }, 404);
    }

    // اگر قبلاً تأیید شده
    if (pr.status === "CONFIRMED") {
        return jsonCors({ status: "CONFIRMED", donationId: pr.donation_id });
    }
    if (pr.status === "MANUAL_REVIEW") {
        return jsonCors({ status: "MANUAL_REVIEW" });
    }
    if (pr.status === "EXPIRED") {
        return jsonCors({ status: "EXPIRED" });
    }

    // بررسی انقضا با مهلت اضافی
    const now = Date.now();
    const expiresMs = toMillis(pr.expires_at);
    const graceMs = CONFIG.PAYMENT_GRACE_HOURS * 60 * 60 * 1000;

    if (now > expiresMs + graceMs) {
        await env.DB
            .prepare("UPDATE payment_requests SET status = 'EXPIRED' WHERE id = ?")
            .bind(pr.id)
            .run();
        return jsonCors({ status: "EXPIRED" });
    }

    // تلاش برای تأیید
    try {
        const match = await tryVerifyPayment(env, pr);

        if (match) {
            const donationId = shortId();
            const nowStr = nowIso();

            // تراکنش اتمی: درج donation + به‌روزرسانی payment_request
            await env.DB.batch([
                env.DB
                    .prepare(
                        "INSERT INTO donations " +
                        "(id, payment_request_id, donor_name, donor_message, " +
                        " amount, currency, network, transaction_hash, " +
                        " wallet_address, status, public_visibility, " +
                        " leaderboard_visibility, created_at, confirmed_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)"
                    )
                    .bind(
                        donationId,
                        pr.id,
                        pr.donor_name || "Anonymous",
                        pr.donor_message || "",
                        match.amount,
                        pr.currency,
                        pr.network,
                        match.txHash,
                        match.from,
                        pr.public_visibility,
                        pr.leaderboard_visibility,
                        nowStr,
                        nowStr
                    ),
                env.DB
                    .prepare(
                        "UPDATE payment_requests SET status = 'CONFIRMED', " +
                        "transaction_hash = ?, donation_id = ? WHERE id = ?"
                    )
                    .bind(match.txHash, donationId, pr.id)
            ]);

            // به‌روزرسانی milestones
            const total = await getTotalRaised(env);
            await updateMilestones(env, total);

            return jsonCors({ status: "CONFIRMED", donationId: donationId });
        }
    } catch (err) {
        // خطای RPC یا شبکه — در log ثبت کن و منتظر بمان
        console.error("verify error for " + pr.id + ":", err && err.message);
    }

    return jsonCors({ status: "AWAITING_PAYMENT" });
}

/**
 * GET /api/health
 */
async function handleHealth(env) {
    const checks = {
        db: false,
        timestamp: nowIso()
    };

    try {
        await env.DB.prepare("SELECT 1").first();
        checks.db = true;
    } catch (e) {
        checks.db = false;
    }

    return jsonCors({
        status: checks.db ? "ok" : "degraded",
        checks: checks
    });
}

// ============================================================
// 8. Router & Main Handler
// ============================================================

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // پیش‌پرواز CORS
    if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // بررسی binding دیتابیس
    if (!env || !env.DB) {
        return jsonCors({ error: "Database not configured" }, 500);
    }

    try {
        // ---------- GET endpoints ----------
        if (method === "GET" && path === "/api/health") {
            return await handleHealth(env);
        }
        if (method === "GET" && path === "/api/stats") {
            return await handleStats(env);
        }
        if (method === "GET" && path === "/api/milestones") {
            return await handleMilestones(env);
        }
        if (method === "GET" && path === "/api/donations/recent") {
            return await handleRecentDonations(env);
        }
        if (method === "GET" && path === "/api/donations/leaderboard") {
            return await handleLeaderboard(env);
        }

        // /api/donations/:id  (id = 24 hex)
        const donationMatch = path.match(/^\/api\/donations\/([a-f0-9]{24})$/);
        if (method === "GET" && donationMatch) {
            return await handleDonationById(env, donationMatch[1]);
        }

        // /api/payment/status/:requestId
        const statusMatch = path.match(/^\/api\/payment\/status\/([a-f0-9]{24})$/);
        if (method === "GET" && statusMatch) {
            return await handlePaymentStatus(env, statusMatch[1]);
        }

        // ---------- POST endpoints ----------
        if (method === "POST" && path === "/api/payment/create") {
            return await handlePaymentCreate(request, env);
        }

        // ---------- 404 ----------
        return jsonCors({ error: "Not found", path: path }, 404);
    } catch (err) {
        console.error("Unhandled error:", err && err.stack);
        return jsonCors({ error: "Internal server error" }, 500);
    }
}

export default {
    async fetch(request, env, ctx) {
        return await handleRequest(request, env);
    }
};
