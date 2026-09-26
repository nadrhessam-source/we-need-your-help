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
    PAYMENT_REQUEST_TTL_MINUTES: 30,

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
            rpcFallbacks: [
                "https://polygon.llamarpc.com",
                "https://polygon-bor-rpc.publicnode.com",
                "https://polygon.drpc.org"
            ],
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
            rpcFallbacks: [
                "https://base.llamarpc.com",
                "https://base-rpc.publicnode.com",
                "https://base.drpc.org"
            ],
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
            rpcFallbacks: [
                "https://ethereum-rpc.publicnode.com",
                "https://eth.drpc.org",
                "https://rpc.ankr.com/eth"
            ],
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
        },
        "polygon-amoy": {
            name: "Polygon Amoy (Testnet)",
            chainId: 80002,
            rpc: "https://rpc-amoy.polygon.technology",
            rpcFallbacks: [
                "https://polygon-amoy-bor-rpc.publicnode.com",
                "https://polygon-amoy.drpc.org"
            ],
            explorer: "https://amoy.polygonscan.com",
            token: {
                symbol: "USDC",
                address: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
                decimals: 6
            },
            destination: "0xf80C6b072AF48331Bd03E3a9355C305aab02146A",
            confirmations: 5,
            isTestnet: true
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

    // لیست RPC ها: اولی اصلی، بقیه fallback
    const rpcs = [net.rpc].concat(net.rpcFallbacks || []);
    let lastError = null;

    for (let i = 0; i < rpcs.length; i++) {
        const rpcUrl = rpcs[i];
        try {
            const res = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                lastError = new Error("RPC " + net.name + " HTTP " + res.status);
                continue;
            }

            let data;
            try {
                data = await res.json();
            } catch (e) {
                lastError = new Error("RPC " + net.name + " invalid JSON");
                continue;
            }

            if (data.error) {
                lastError = new Error(
                    "RPC " + net.name + ": " + (data.error.message || "unknown")
                );
                continue;
            }

            // موفق شد
            return data.result;
        } catch (e) {
            lastError = e;
            continue;
        }
    }

    // هیچ RPC کار نکرد
    throw lastError || new Error("All RPCs failed for " + network);
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
 * تولید مبلغ یکتا با استفاده از صف
 * - offset 0 = baseAmount (بدون اعشار اضافه)
 * - offset 1-99 = baseAmount + 0.01 تا + 0.99
 * - اگه همه اشغال باشن → error
 */
async function generateUniqueAmount(env, baseAmount, network) {
    const now = nowIso();

    // همه درخواست‌های فعال با همین base amount و network
    const { results } = await env.DB
        .prepare(
            "SELECT requested_amount FROM payment_requests " +
            "WHERE network = ? AND status = 'AWAITING_PAYMENT' " +
            "AND expires_at > ? " +
            "AND requested_amount >= ? AND requested_amount < ? " +
            "ORDER BY requested_amount ASC"
        )
        .bind(network, now, baseAmount, baseAmount + 1)
        .all();

    // جمع‌آوری offset های اشغال‌شده
    const usedOffsets = {};
    for (const row of results || []) {
        const amt = Number(row.requested_amount);
        const offset = Math.round((amt - baseAmount) * 100);
        if (offset >= 0 && offset <= 99) {
            usedOffsets[offset] = true;
        }
    }

    // پیدا کردن کوچک‌ترین offset آزاد
    for (let offset = 0; offset <= 99; offset++) {
        if (!usedOffsets[offset]) {
            return {
                amount: baseAmount + offset / 100,
                offset: offset
            };
        }
    }

    throw new Error("Too many active requests for this amount. Please try a different amount or wait a minute.");
}


/**
 * تأیید تراکنش EVM با استفاده از tx hash مستقیم
 */
async function verifyEvmTxByHash(pr, txHash, net) {
    // دریافت receipt
    const receipt = await evmRpc(pr.network, "eth_getTransactionReceipt", [txHash]);
    if (!receipt) {
        // چک کن tx وجود داره یا نه
        const tx = await evmRpc(pr.network, "eth_getTransactionByHash", [txHash]);
        if (!tx) {
            return {
                invalid: true,
                reason: "Transaction not found on Polygon. Please check the hash and try again."
            };
        }
        // tx در mempool هست ولی هنوز mine نشده
        return { pending: true, reason: "Transaction is in mempool. Waiting for confirmation." };
    }

    if (receipt.status !== "0x1") return { invalid: true, reason: "Transaction failed" };

    // دریافت transaction
    const tx = await evmRpc(pr.network, "eth_getTransactionByHash", [txHash]);
    if (!tx) return { pending: true };

    // چک: آدرس مقصد = token contract
    if (!tx.to || tx.to.toLowerCase() !== net.token.address.toLowerCase()) {
        return { invalid: true, reason: "Not a token transfer" };
    }

    // چک: input data = transfer(address,uint256)
    const input = tx.input || "";
    if (!input.startsWith("0xa9059cbb")) {
        return { invalid: true, reason: "Not a transfer call" };
    }
    if (input.length < 138) {
        return { invalid: true, reason: "Invalid input data" };
    }

    // استخراج آدرس مقصد
    const toAddr = "0x" + input.slice(34, 74);
    if (toAddr.toLowerCase() !== net.destination.toLowerCase()) {
        return { invalid: true, reason: "Wrong destination" };
    }

    // استخراج مقدار
    const amountHex = "0x" + input.slice(74, 138);
    const rawAmount = BigInt(amountHex);
    const amount = Number(rawAmount) / Math.pow(10, net.token.decimals);
    const expected = Number(pr.requested_amount);

    // تلورانس ۱٪
    if (amount < expected * 0.99 || amount > expected * 1.01) {
        return {
            invalid: true,
            reason: "Amount mismatch. Expected " + expected + ", got " + amount
        };
    }

    // چک confirmations
    const currentBlock = await evmGetCurrentBlock(pr.network);
    const txBlock = parseInt(receipt.blockNumber, 16);
    const confirmations = currentBlock - txBlock;
    if (confirmations < net.confirmations) {
        return { pending: true, confirmations: confirmations };
    }

    return {
        from: tx.from,
        amount: amount,
        txHash: txHash
    };
}

/**
 * تأیید تراکنش TRON با استفاده از tx hash مستقیم
 */
async function verifyTronTxByHash(pr, txHash, net) {
    // از TronGrid: لیست تراکنش‌های TRC20 دریافتی
    const url = net.rpc +
        "/v1/accounts/" + encodeURIComponent(net.destination) +
        "/transactions/trc20?only_to=true&limit=200&min_timestamp=0";

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { pending: true };

    const data = await res.json();
    if (!data.data) return { pending: true };

    // پیدا کردن تراکنش ما
    const ourTx = data.data.find(function (t) {
        return t.transaction_id === txHash;
    });

    if (!ourTx) {
        return {
            invalid: true,
            reason: "Transaction not found on TRON. Please check the hash and try again."
        };
    }

    // چک token
    if (!ourTx.token_info || ourTx.token_info.address !== net.token.address) {
        return { invalid: true, reason: "Wrong token" };
    }

    // چک amount
    const decimals = ourTx.token_info.decimals || 6;
    const amount = Number(ourTx.value) / Math.pow(10, decimals);
    const expected = Number(pr.requested_amount);

    if (amount < expected * 0.99 || amount > expected * 1.01) {
        return {
            invalid: true,
            reason: "Amount mismatch. Expected " + expected + ", got " + amount
        };
    }

    // چک confirmations (TRON هر ۳ ثانیه بلاک می‌سازه)
    const txTime = ourTx.block_timestamp;
    const now = Date.now();
    const confirmations = Math.floor((now - txTime) / 3000);
    if (confirmations < net.confirmations) {
        return { pending: true, confirmations: confirmations };
    }

    return {
        from: ourTx.from,
        amount: amount,
        txHash: txHash
    };
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
    const baseAmount = Number(body.amount);
    if (!isFinite(baseAmount) || baseAmount < 1 || baseAmount > 1000000) {
        return jsonCors({ error: "Invalid amount" }, 400);
    }

    // گرد کردن به ۲ رقم اعشار
    const roundedBase = Math.round(baseAmount * 100) / 100;

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

        // تولید مبلغ یکتا
    let uniqueAmount;
    try {
        const result = await generateUniqueAmount(env, roundedBase, network);
        uniqueAmount = result.amount;
    } catch (err) {
        return jsonCors({ error: err.message }, 503);
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
            uniqueAmount,
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
        amount: uniqueAmount,     // ← مبلغ یکتا
        baseAmount: roundedBase,  // ← مبلغ اصلی برای نمایش
        hasUniqueAmount: uniqueAmount !== roundedBase,  // ← آیا اعشار داره؟
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
 * POST /api/payment/submit-tx
 * کاربر tx hash رو دستی ارسال می‌کنه
 */
async function handleSubmitTx(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonCors({ error: "Invalid JSON" }, 400);
    }

    const requestId = String(body.requestId || "").trim();
    const txHash = String(body.txHash || "").trim();

    // اعتبارسنجی
    if (!/^[a-f0-9]{24}$/.test(requestId)) {
        return jsonCors({ error: "Invalid request ID" }, 400);
    }

    const isEvmTx = /^0x[a-fA-F0-9]{64}$/.test(txHash);
    const isTronTx = /^[a-fA-F0-9]{64}$/.test(txHash);
    if (!isEvmTx && !isTronTx) {
        return jsonCors({ error: "Invalid transaction hash format" }, 400);
    }

    // دریافت درخواست
    const pr = await getPaymentRequestById(env, requestId);
    if (!pr) {
        return jsonCors({ error: "Payment request not found" }, 404);
    }

    if (pr.status === "CONFIRMED") {
        return jsonCors({
            status: "CONFIRMED",
            donationId: pr.donation_id,
            alreadyConfirmed: true
        });
    }

    if (pr.status === "EXPIRED") {
        return jsonCors({ error: "Payment request has expired" }, 400);
    }

    // چک تکراری نبودن tx hash
    const used = await isTxHashUsed(env, txHash);
    if (used) {
        return jsonCors({ error: "This transaction is already registered" }, 400);
    }

    // تأیید از بلاکچین
    const net = CONFIG.NETWORKS[pr.network];
    if (!net) {
        return jsonCors({ error: "Unsupported network" }, 500);
    }

    let verified;
    try {
        if (net.isTron) {
            verified = await verifyTronTxByHash(pr, txHash, net);
        } else {
            verified = await verifyEvmTxByHash(pr, txHash, net);
        }
    } catch (err) {
        const errMsg = (err && err.message) || "Unknown error";
        console.error("submit-tx verify error:", errMsg);
        return jsonCors({
            error: "Failed to verify on blockchain",
            detail: errMsg
        }, 502);
    }

    if (!verified || verified.invalid) {
        return jsonCors({
            status: "INVALID",
            error: (verified && verified.reason) || "Transaction does not match"
        }, 400);
    }

    if (verified.pending) {
        return jsonCors({
            status: "PENDING",
            message: "Transaction found but not enough confirmations",
            confirmations: verified.confirmations || 0
        });
    }

    // ثبت donation
    const donationId = shortId();
    const nowStr = nowIso();

    await env.DB.batch([
        env.DB.prepare(
            "INSERT INTO donations " +
            "(id, payment_request_id, donor_name, donor_message, " +
            " amount, currency, network, transaction_hash, " +
            " wallet_address, status, public_visibility, " +
            " leaderboard_visibility, created_at, confirmed_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)"
        ).bind(
            donationId,
            pr.id,
            pr.donor_name || "Anonymous",
            pr.donor_message || "",
            verified.amount,
            pr.currency,
            pr.network,
            txHash,
            verified.from,
            pr.public_visibility,
            pr.leaderboard_visibility,
            nowStr,
            nowStr
        ),
        env.DB.prepare(
            "UPDATE payment_requests SET status = 'CONFIRMED', " +
            "transaction_hash = ?, donation_id = ? WHERE id = ?"
        ).bind(txHash, donationId, pr.id)
    ]);

    // آپدیت milestones
    const total = await getTotalRaised(env);
    await updateMilestones(env, total);

    return jsonCors({
        status: "CONFIRMED",
        donationId: donationId
    });
}


/**
 * GET /api/report
 * گزارش کامل برای content engine
 */
async function handleReport(env) {
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);

    // ابتدای امروز UTC
    const todayStart = todayUtc + "T00:00:00.000Z";
    // ابتدای دیروز UTC
    const yesterdayDate = new Date(now.getTime() - 86400000);
    const yesterdayUtc = yesterdayDate.toISOString().slice(0, 10);
    const yesterdayStart = yesterdayUtc + "T00:00:00.000Z";

    // آمار کل
    const totalRaised = await getTotalRaised(env);
    const totalDonors = await getTotalDonors(env);
    const daysSinceLaunch = getDaysSinceLaunch();

    // آمار دیروز
    const yesterdayStats = await env.DB
        .prepare(
            "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total, " +
            "COALESCE(MAX(amount), 0) AS largest " +
            "FROM donations WHERE status = 'CONFIRMED' " +
            "AND confirmed_at >= ? AND confirmed_at < ?"
        )
        .bind(yesterdayStart, todayStart)
        .first();

    // کمک‌های دیروز
    const yesterdayDonations = await env.DB
        .prepare(
            "SELECT donor_name, amount, network FROM donations " +
            "WHERE status = 'CONFIRMED' AND confirmed_at >= ? AND confirmed_at < ? " +
            "ORDER BY amount DESC"
        )
        .bind(yesterdayStart, todayStart)
        .all();

    // بزرگ‌ترین کمک همه‌وقت
    const largestEver = await env.DB
        .prepare("SELECT MAX(amount) AS max FROM donations WHERE status = 'CONFIRMED'")
        .first();

    // بزرگ‌ترین روز از نظر مجموع
    const bestDay = await env.DB
        .prepare(
            "SELECT substr(confirmed_at, 1, 10) AS day, SUM(amount) AS total " +
            "FROM donations WHERE status = 'CONFIRMED' " +
            "GROUP BY substr(confirmed_at, 1, 10) " +
            "ORDER BY total DESC LIMIT 1"
        )
        .first();

    // Milestones
    const milestones = await env.DB
        .prepare("SELECT amount, status, reached_at FROM milestones ORDER BY amount ASC")
        .all();

    const milestoneList = (milestones.results || []).map((m) => ({
        amount: Number(m.amount),
        reached: m.status === "REACHED",
        reachedAt: m.reached_at
    }));

    // جدیدترین milestone رسیده در 24 ساعت اخیر
    const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
    const newMilestone = milestoneList.find(
        (m) => m.reached && m.reachedAt && m.reachedAt >= oneDayAgo
    );

    // رویدادها
    const events = [];
    const yd = {
        count: Number(yesterdayStats.count) || 0,
        total: Number(yesterdayStats.total) || 0,
        largest: Number(yesterdayStats.largest) || 0
    };

    if (totalDonors === yd.count && totalDonors > 0) {
        events.push("first_donation");
    }
    if (yd.count === 0 && totalDonors > 0) {
        events.push("zero_day");
    }
    if (yd.count > 0 && yd.total < 10) {
        events.push("small_day");
    }
    if (yd.count > 0 && yd.total >= 10 && yd.total < 100) {
        events.push("normal_day");
    }
    if (yd.largest >= 100 && yd.largest < 1000) {
        events.push("big_donation");
    }
    if (yd.largest >= 1000) {
        events.push("huge_donation");
    }
    if (newMilestone) {
        events.push("milestone");
    }
    if (
        bestDay &&
        bestDay.day === yesterdayUtc &&
        yd.total > 0
    ) {
        events.push("record_day");
    }

    return jsonCors({
        generatedAt: now.toISOString(),
        todayDate: todayUtc,
        yesterdayDate: yesterdayUtc,
        allTime: {
            totalRaised: Math.round(totalRaised * 100) / 100,
            totalDonors: totalDonors,
            daysSinceLaunch: daysSinceLaunch
        },
        yesterday: {
            count: yd.count,
            total: Math.round(yd.total * 100) / 100,
            largest: Math.round(yd.largest * 100) / 100,
            donations: (yesterdayDonations.results || []).map((d) => ({
                name: d.donor_name || "Anonymous",
                amount: Number(d.amount),
                network: d.network
            }))
        },
        milestones: milestoneList,
        newMilestone: newMilestone || null,
        bestDay: bestDay ? { date: bestDay.day, total: Number(bestDay.total) } : null,
        largestEver: Number(largestEver.max) || 0,
        events: events
    });
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
        return new Response("", {
            status: 204,
            headers: Object.assign(
                { "Content-Length": "0" },
                corsHeaders()
            )
        });
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
        if (method === "GET" && path === "/api/report") {
            return await handleReport(env);
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

        if (method === "POST" && path === "/api/payment/submit-tx") {
            return await handleSubmitTx(request, env);
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
