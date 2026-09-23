#!/usr/bin/env node
// polyfill برای Node < 18
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
            const req = https.request(opts, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        text: () => Promise.resolve(data),
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });
            req.on("error", reject);
            if (options && options.body) req.write(options.body);
            req.end();
        });
    };
}
/* ============================================================
   WE NEED YOUR HELP — Content Engine
   تولید متن پست روزانه از آمار واقعی
   اجرا: node scripts/content-engine.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { selectTemplate } = require("./templates");

const API_BASE = process.env.WNYH_API_BASE ||
    "https://we-need-your-help-api.nadrhessam.workers.dev";

const WEBSITE_URL = process.env.WNYH_WEBSITE ||
    "https://nadrhessam-source.github.io/we-need-your-help/";

const OUT_DIR = path.join(__dirname, "..", "tmp");

async function fetchReport() {
    const url = API_BASE.replace(/\/$/, "") + "/api/report";
    console.log("[content-engine] Fetching: " + url);

    const res = await fetch(url, {
        headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
        throw new Error("API returned HTTP " + res.status);
    }

    return await res.json();
}

function replacePlaceholders(text) {
    return text.replace(/\[WEBSITE\]/g, WEBSITE_URL);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function saveOutput(report, result) {
    ensureDir(OUT_DIR);

    const date = report.todayDate;
    const textPath = path.join(OUT_DIR, "post-" + date + ".txt");
    const reportPath = path.join(OUT_DIR, "report-" + date + ".json");
    const metaPath = path.join(OUT_DIR, "meta-" + date + ".json");

    fs.writeFileSync(textPath, result.text, "utf8");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    const meta = {
        date: date,
        template: result.name,
        events: report.events,
        generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

    console.log("[content-engine] Saved:");
    console.log("  - " + textPath);
    console.log("  - " + reportPath);
    console.log("  - " + metaPath);
}

async function main() {
    try {
        const report = await fetchReport();
        console.log("[content-engine] Report received.");
        console.log("  Day: " + report.allTime.daysSinceLaunch);
        console.log("  Total: $" + report.allTime.totalRaised);
        console.log("  Events: " + (report.events.length ? report.events.join(", ") : "none"));

        const result = selectTemplate(report);
        if (!result) {
            throw new Error("No template matched (this should not happen)");
        }

        console.log("[content-engine] Template: " + result.name);

        result.text = replacePlaceholders(result.text);

        console.log("[content-engine] Generated text:");
        console.log("--------");
        console.log(result.text);
        console.log("--------");

        saveOutput(report, result);

        // خروجی اضافه برای GitHub Actions
        if (process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(
                process.env.GITHUB_OUTPUT,
                "template=" + result.name + "\n"
            );
            fs.appendFileSync(
                process.env.GITHUB_OUTPUT,
                "date=" + report.todayDate + "\n"
            );
        }

        process.exit(0);
    } catch (err) {
        console.error("[content-engine] ERROR: " + err.message);
        if (process.env.DEBUG) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}

main();
