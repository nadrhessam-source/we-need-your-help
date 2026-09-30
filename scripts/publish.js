#!/usr/bin/env node
/* ============================================================
   WE NEED YOUR HELP — Publisher Orchestrator
   همه publisher ها رو صدا می‌زنه و نتیجه رو ذخیره می‌کنه
   اجرا: node scripts/publish.js
   ============================================================ */

// Polyfill برای fetch (Node < 18)
if (typeof fetch === "undefined") {
    const https = require("https");
    const { URL } = require("url");
    global.fetch = function (url, options) {
        return new Promise((resolve, reject) => {
            const u = new URL(url);
            const opts = {
                hostname: u.hostname,
                path: u.pathname + u.search,
                method: (options && options.method) || "GET",
                headers: (options && options.headers) || {}
            };
            const req = https.request(opts, function (res) {
                let data = "";
                res.on("data", function (chunk) { data += chunk; });
                res.on("end", function () {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        text: function () { return Promise.resolve(data); },
                        json: function () { return Promise.resolve(JSON.parse(data)); }
                    });
                });
            });
            req.on("error", reject);
            if (options && options.body) req.write(options.body);
            req.end();
        });
    };
}

const fs = require("fs");
const path = require("path");

const { XPublisher } = require("./publishers/x");

const TMP_DIR = path.join(__dirname, "..", "tmp");
const API_BASE = process.env.WNYH_API_BASE ||
    "https://api.we-need-your-help.xyz";

/**
 * پیدا کردن آخرین فایل post-*.txt
 */
function findLatestPost() {
    if (!fs.existsSync(TMP_DIR)) {
        throw new Error("tmp/ does not exist. Run content-engine first.");
    }
    const files = fs.readdirSync(TMP_DIR)
        .filter(function (f) { return f.startsWith("post-") && f.endsWith(".txt"); })
        .sort();
    if (files.length === 0) {
        throw new Error("No post file found");
    }
    return path.join(TMP_DIR, files[files.length - 1]);
}

/**
 * پیدا کردن آخرین فایل meta-*.json
 */
function findLatestMeta() {
    const files = fs.readdirSync(TMP_DIR)
        .filter(function (f) { return f.startsWith("meta-") && f.endsWith(".json"); })
        .sort();
    if (files.length === 0) return null;
    return path.join(TMP_DIR, files[files.length - 1]);
}

/**
 * ثبت نتیجه در D1 (از طریق worker)
 */
async function recordSocialPost(platform, contentType, content, result) {
    const url = API_BASE.replace(/\/$/, "") + "/api/social/record";
    const body = {
        platform: platform,
        contentType: contentType,
        content: content,
        status: result.success ? "PUBLISHED" : "FAILED",
        externalPostId: result.externalId || null,
        mediaPath: result.url || null,
        errorMessage: result.error || null
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            console.error("[publish] Failed to record in D1: HTTP " + res.status);
        }
    } catch (err) {
        console.error("[publish] Failed to record in D1: " + err.message);
    }
}

/**
 * اجرای همه publisher ها
 */
async function publishAll() {
    const postPath = findLatestPost();
    const postText = fs.readFileSync(postPath, "utf8");
    const metaPath = findLatestMeta();
    const meta = metaPath ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};

    console.log("[publish] Post: " + postPath);
    console.log("[publish] Date: " + (meta.date || "unknown"));
    console.log("[publish] Template: " + (meta.template || "unknown"));
    console.log("[publish] Text length: " + postText.length);

    const content = {
        text: postText,
        mediaPath: null,  // TODO: video
        date: meta.date,
        template: meta.template,
        events: meta.events || []
    };

    // لیست publisher ها
    const publishers = [
        new XPublisher({})
        // بعداً: YouTube، Reddit، Instagram، TikTok
    ];

    // اجرا موازی
    const results = await Promise.all(
        publishers.map(async function (p) {
            console.log("[publish] Publishing to " + p.name);
            const result = await p.publishWithRetry(content);
            console.log("[publish] " + p.name + " result: " +
                (result.success ? "SUCCESS" : "FAILED: " + result.error));

            // ثبت نتیجه در D1
            await recordSocialPost(
                p.name.toLowerCase(),
                meta.template || "daily",
                content.text,
                result
            );

            return { publisher: p.name, result: result };
        })
    );

    // خلاصه
    console.log("");
    console.log("[publish] ===== SUMMARY =====");
    for (const r of results) {
        const status = r.result.success ? "✅" : "❌";
        const detail = r.result.success
            ? (r.result.url || r.result.externalId)
            : r.result.error;
        console.log("[publish] " + status + " " + r.publisher + ": " + detail);
    }

    const successCount = results.filter(function (r) { return r.result.success; }).length;
    console.log("[publish] " + successCount + "/" + results.length + " succeeded");

    // خروجی برای GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            "published=" + successCount + "\n"
        );
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            "total=" + results.length + "\n"
        );
    }

    // خروج موفق اگه حداقل یکی موفق شده (تا workflow fail نشه)
    if (successCount === 0) {
        process.exit(1);
    }
}

publishAll().catch(function (err) {
    console.error("[publish] ERROR: " + err.message);
    if (process.env.DEBUG) {
        console.error(err.stack);
    }
    process.exit(1);
});
