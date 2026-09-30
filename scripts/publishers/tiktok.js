/* ============================================================
   TikTok Publisher
   استفاده از TikTok Content Posting API
   Auth: OAuth 2.0
   ============================================================ */

const https = require("https");
const { URL } = require("url");
const { BasePublisher } = require("./base");

class TikTokPublisher extends BasePublisher {
    constructor(config) {
        super("TikTok", config);

        this.clientKey = config.clientKey ||
            process.env.TIKTOK_CLIENT_KEY || "";
        this.clientSecret = config.clientSecret ||
            process.env.TIKTOK_CLIENT_SECRET || "";
        this.accessToken = config.accessToken ||
            process.env.TIKTOK_ACCESS_TOKEN || "";
        this.refreshToken = config.refreshToken ||
            process.env.TIKTOK_REFRESH_TOKEN || "";
    }

    isConfigured() {
        return !!(this.clientKey && this.clientSecret && this.accessToken);
    }

    httpsRequest(method, urlString, headers, body) {
        return new Promise((resolve, reject) => {
            const u = new URL(urlString);
            const options = {
                hostname: u.hostname,
                path: u.pathname + u.search,
                method: method,
                headers: headers || {}
            };

            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsed = null;
                    try {
                        parsed = JSON.parse(data);
                    } catch (_) {}
                    resolve({
                        statusCode: res.statusCode,
                        body: parsed,
                        raw: data
                    });
                });
            });

            req.on("error", reject);
            if (body) req.write(body);
            req.end();
        });
    }

    /**
     * publish اصلی
     * TikTok Content Posting API فعلاً نیاز به تأیید اپلیکیشن داره
     */
    async publish(content) {
        if (!content.mediaPath) {
            return {
                success: false,
                error: "TikTok requires video. content.mediaPath is null."
            };
        }

        // TikTok API پیچیده‌ست:
        // 1. فایل ویدیو رو chunk به chunk آپلود می‌کنی
        // 2. یا از PULL_FROM_URL استفاده می‌کنی (نیاز به URL عمومی)
        // 3. بعد یه "publish_id" می‌گیری
        // 4. بعد با یه endpoint دیگه منتشر می‌کنی

        return {
            success: false,
            error: "TikTok Content Posting API requires app approval and " +
                "media hosting. Implementation will be added after app approval."
        };
    }
}

module.exports = { TikTokPublisher };
