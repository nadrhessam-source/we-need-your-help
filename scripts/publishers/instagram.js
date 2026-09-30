/* ============================================================
   Instagram Publisher
   استفاده از Instagram Graph API
   Auth: Long-lived Access Token (Business Account)
   ============================================================ */

const https = require("https");
const { URL } = require("url");
const { BasePublisher } = require("./base");

class InstagramPublisher extends BasePublisher {
    constructor(config) {
        super("Instagram", config);

        this.accessToken = config.accessToken ||
            process.env.INSTAGRAM_ACCESS_TOKEN || "";
        this.igUserId = config.igUserId ||
            process.env.INSTAGRAM_USER_ID || "";
    }

    isConfigured() {
        return !!(this.accessToken && this.igUserId);
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
     * مرحله ۱: ساخت container
     */
    async createContainer(imageUrl, caption) {
        const body = new URLSearchParams({
            image_url: imageUrl,
            caption: caption,
            access_token: this.accessToken
        }).toString();

        const url = "https://graph.facebook.com/v18.0/" +
            this.igUserId + "/media";

        const res = await this.httpsRequest("POST", url, {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body)
        }, body);

        if (res.statusCode !== 200 || !res.body || !res.body.id) {
            return {
                success: false,
                error: "Instagram create container: HTTP " + res.statusCode + " " + res.raw
            };
        }

        return { success: true, containerId: res.body.id };
    }

    /**
     * مرحله ۲: publish container
     */
    async publishContainer(containerId) {
        const body = new URLSearchParams({
            creation_id: containerId,
            access_token: this.accessToken
        }).toString();

        const url = "https://graph.facebook.com/v18.0/" +
            this.igUserId + "/media_publish";

        const res = await this.httpsRequest("POST", url, {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body)
        }, body);

        if (res.statusCode !== 200 || !res.body || !res.body.id) {
            return {
                success: false,
                error: "Instagram publish: HTTP " + res.statusCode + " " + res.raw
            };
        }

        return {
            success: true,
            externalId: res.body.id,
            url: "https://instagram.com/p/" + res.body.id
        };
    }

    /**
     * publish اصلی
     * توجه: Instagram فقط با تصویر/ویدیو کار می‌کنه، متن تنها کافی نیست
     */
    async publish(content) {
        if (!content.mediaPath) {
            return {
                success: false,
                error: "Instagram requires media (image or video). content.mediaPath is null."
            };
        }

        // TODO: برای Instagram باید فایل ویدیو در یک URL عمومی آپلود بشه
        // چون Graph API فقط URL قبول می‌کنه، نه فایل مستقیم
        return {
            success: false,
            error: "Instagram publishing requires media hosted on a public URL. " +
                "Please implement media hosting (e.g., Cloudflare R2) first."
        };
    }
}

module.exports = { InstagramPublisher };
