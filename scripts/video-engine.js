#!/usr/bin/env node
/* ============================================================
   WE NEED YOUR HELP — Video Engine
   تولید ویدیوی عمودی از آمار
   اجرا: node scripts/video-engine.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT_DIR = path.join(__dirname, "..", "tmp");

// ---------- تنظیمات ----------
const WIDTH = 1080;
const HEIGHT = 1920;
const DURATION = 14;       // ثانیه
const BG_COLOR = "0x0d0d0f";     // پس‌زمینه مشکی
const ACCENT = "0xff4d4d";       // قرمز
const TEXT_COLOR = "0xffffff";   // سفید
const MUTED = "0x8a8a96";        // خاکستری
const SUCCESS = "0x4dff88";      // سبز

// فونت پیش‌فرض روی ubuntu-latest
const FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_PATH_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

// ---------- ابزارها ----------

function findLatestReport() {
    if (!fs.existsSync(OUT_DIR)) {
        throw new Error("tmp/ does not exist. Run content-engine first.");
    }
    const files = fs.readdirSync(OUT_DIR)
        .filter(function (f) { return f.startsWith("report-") && f.endsWith(".json"); })
        .sort();
    if (files.length === 0) {
        throw new Error("No report JSON found in tmp/");
    }
    return path.join(OUT_DIR, files[files.length - 1]);
}

function escDrawtext(text) {
    // escape برای drawtext
    return String(text)
        .replace(/\\/g, "\\\\\\\\")
        .replace(/:/g, "\\\\:")
        .replace(/'/g, "\u2019")     // apostrophe جایگزین با right single quote
        .replace(/%/g, "\\\\%");
}

function formatMoney(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * نوشتن متن در فایل موقت (برای drawtext با textfile)
 */
function writeTextFile(idx, text) {
    const p = path.join(OUT_DIR, "dt-" + idx + ".txt");
    fs.writeFileSync(p, text, "utf8");
    return p;
}

/**
 * ساخت drawtext filter برای یک خط
 */
function drawtext(opts) {
    // opts: { idx, text, fontsize, color, y, start, end, font }
    const textFile = writeTextFile(opts.idx, opts.text);
    const font = opts.font || FONT_PATH;
    const start = opts.start;
    const end = opts.end;
    const fadeIn = 0.4;

    const alphaExpr =
        "if(lt(t," + start + "),0,if(lt(t," + (start + fadeIn) + "),(t-" + start + ")/" + fadeIn + ",1))";

    return [
        "drawtext=fontfile=" + font,
        "textfile=" + textFile,
        "fontsize=" + opts.fontsize,
        "fontcolor=" + opts.color,
        "x=(w-text_w)/2",
        "y=" + opts.y,
        "alpha='" + alphaExpr + "'",
        "enable='between(t," + start + "," + end + ")'"
    ].join(":");
}

// ---------- ساخت دستور FFmpeg ----------

function buildVideo(report) {
    const day = report.allTime.daysSinceLaunch;
    const total = report.allTime.totalRaised;
    const donors = report.allTime.totalDonors;

    // لیست خطوط
    const lines = [
        {
            text: "DAY " + day,
            size: 130,
            color: TEXT_COLOR,
            y: 380,
            start: 0.3,
            end: DURATION,
            font: FONT_PATH
        },
        {
            text: "Total raised",
            size: 42,
            color: MUTED,
            y: 700,
            start: 1.0,
            end: DURATION,
            font: FONT_PATH_REGULAR
        },
        {
            text: formatMoney(total),
            size: 110,
            color: SUCCESS,
            y: 770,
            start: 1.0,
            end: DURATION,
            font: FONT_PATH
        },
        {
            text: "People who helped",
            size: 42,
            color: MUTED,
            y: 1010,
            start: 1.8,
            end: DURATION,
            font: FONT_PATH_REGULAR
        },
        {
            text: String(donors),
            size: 90,
            color: TEXT_COLOR,
            y: 1080,
            start: 1.8,
            end: DURATION,
            font: FONT_PATH
        },
        {
            text: "We still don\u2019t know why.",
            size: 46,
            color: MUTED,
            y: 1360,
            start: 2.6,
            end: DURATION,
            font: FONT_PATH_REGULAR
        },
        {
            text: "Please help us.",
            size: 46,
            color: TEXT_COLOR,
            y: 1440,
            start: 3.2,
            end: DURATION,
            font: FONT_PATH
        },
        {
            text: "WE NEED YOUR HELP",
            size: 52,
            color: ACCENT,
            y: 1740,
            start: 3.8,
            end: DURATION,
            font: FONT_PATH
        }
    ];

    const filters = lines.map(function (l, i) {
        return drawtext({
            idx: i,
            text: l.text,
            fontsize: l.size,
            color: l.color,
            y: l.y,
            start: l.start,
            end: l.end,
            font: l.font
        });
    }).join(",");

    const outPath = path.join(OUT_DIR, "video-" + report.todayDate + ".mp4");

    const cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "color=c=" + BG_COLOR + ":s=" + WIDTH + "x" + HEIGHT + ":d=" + DURATION + ":r=30",
        "-vf", filters,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-t", String(DURATION),
        outPath
    ];

    console.log("[video-engine] Running ffmpeg...");
    console.log("[video-engine] Output: " + outPath);

    try {
        execSync(cmd.map(function (a) { return JSON.stringify(a); }).join(" "), {
            stdio: "inherit"
        });
    } catch (e) {
        throw new Error("ffmpeg failed");
    }

    // پاک کردن فایل‌های موقت drawtext
    lines.forEach(function (_, i) {
        const p = path.join(OUT_DIR, "dt-" + i + ".txt");
        if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    return outPath;
}

// ---------- Main ----------

function main() {
    const reportPath = findLatestReport();
    console.log("[video-engine] Reading: " + reportPath);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    // بررسی وجود فونت
    if (!fs.existsSync(FONT_PATH)) {
        throw new Error("Font not found: " + FONT_PATH);
    }

    // بررسی ffmpeg
    try {
        execSync("ffmpeg -version", { stdio: "ignore" });
    } catch (e) {
        throw new Error("ffmpeg is not installed");
    }

    const out = buildVideo(report);

    const stats = fs.statSync(out);
    console.log("[video-engine] Done. Size: " + Math.round(stats.size / 1024) + " KB");

    // خروجی برای GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            "video_path=" + out + "\n"
        );
    }
}

try {
    main();
    process.exit(0);
} catch (err) {
    console.error("[video-engine] ERROR: " + err.message);
    process.exit(1);
}
