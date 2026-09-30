/* ============================================================
   Reddit Publisher
   استفاده از Reddit API برای ارسال پست
   Auth: OAuth 2.0 (script app)
   ============================================================ */

const https = require("https");
const { URL } = require("url");
const { BasePublisher } = require("./base");

class RedditPublisher extends BasePublisher {
    constructor(config) {
        super("Reddit", config);

        this.clientId = config.clientId || process.env.REDDIT_CLIENT_ID || "";
        this.clientSecret = config.clientSecret || process.env.REDDIT_CLIENT_SECRET || "";
        this.username = config.username || process.env.REDDIT_USERNAME || "";
        this.password = config.password || process.env.REDDIT_PASSWORD || "";
        this.userAgent = config.userAgent ||
            process.env.REDDIT_USER_AGENT ||
            "we-need-your-help/1.0";

        // Subreddit پیش‌فرض
        this.subreddit = config.subreddit || process.env.REDDIT_SUBREDDIT || "";

        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    isConfigured() {
        return !!(
            this.clientId &&
            this.clientSecret &&
            this.username &&
            this.password &&
            this.subreddit
        );
    }

    /**
     * درخواست HTTPS عمومی
     */
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
                    } catch (_) {
                        parsed = null;
                    }
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
     * گرفتن access token با password flow
     * (مناسب برای script app با اکانت اختصاصی)
     */
    async getAccessToken() {
        // اگه token قبلی هنوز معتبره، استفاده کن
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const auth = Buffer.from(
            this.clientId + ":" + this.clientSecret
        ).toString("base64");

        const body = new URLSearchParams({
            grant_type: "password",
            username: this.username,
            password: this.password
        }).toString();

        const res = await this.httpsRequest(
            "POST",
            "https://www.reddit.com/api/v1/access_token",
            {
                "Authorization": "Basic " + auth,
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body),
                "User-Agent": this.userAgent
            },
            body
        );

        if (res.statusCode !== 200 || !res.body || !res.body.access_token) {
            throw new Error(
                "Reddit auth failed: HTTP " + res.statusCode + " " + res.raw
            );
        }

        this.accessToken = res.body.access_token;
        // با 5 دقیقه حاشیه امن
        this.tokenExpiry = Date.now() + ((res.body.expires_in || 3600) - 300) * 1000;
        return this.accessToken;
    }

    /**
     * ارسال پست متنی
     */
    async submitTextPost(title, text) {
        const token = await this.getAccessToken();

        const body = new URLSearchParams({
            api_type: "json",
            kind: "self",
            sr: this.subreddit,
            title: title,
            text: text
        }).toString();

        const res = await this.httpsRequest(
            "POST",
            "https://oauth.reddit.com/api/submit",
            {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body),
                "User-Agent": this.userAgent
            },
            body
        );

        if (res.statusCode !== 200) {
            return {
                success: false,
                error: "Reddit HTTP " + res.statusCode + ": " + res.raw
            };
        }

        const json = res.body && res.body.json;
        if (!json) {
            return { success: false, error: "Reddit invalid response" };
        }

        if (json.errors && json.errors.length > 0) {
            return {
                success: false,
                error: "Reddit API error: " + JSON.stringify(json.errors)
            };
        }

        const data = json.data || {};
        const postUrl = data.url || ("https://reddit.com" + (data.id ? "/comments/" + data.id : ""));
        return {
            success: true,
            externalId: data.id || data.name || null,
            url: postUrl
        };
    }

    /**
     * publish اصلی
     */
    async publish(content) {
        // Reddit عنوان و متن جدا می‌خواد
        // خط اول متن رو به عنوان title تبدیل می‌کنیم
        const lines = content.text.split("\n").filter(function (l) { return l.trim(); });
        let title = lines[0] || "WE NEED YOUR HELP";
        // سقف 300 کاراکتر برای title
        if (title.length > 300) {
            title = title.slice(0, 297) + "...";
        }
        // متن کامل به‌عنوان body
        const body = content.text;

        return await this.submitTextPost(title, body);
    }
}

module.exports = { RedditPublisher };
