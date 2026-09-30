/* ============================================================
   X (Twitter) Publisher
   استفاده از X API v2 برای انتشار توییت
   Auth: OAuth 1.0a User Context
   ============================================================ */

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const { URL } = require("url");
const { BasePublisher } = require("./base");

class XPublisher extends BasePublisher {
    constructor(config) {
        super("X", config);

        // این‌ها از env vars میان (در GitHub Secrets)
        this.apiKey = config.apiKey || process.env.X_API_KEY || "";
        this.apiSecret = config.apiSecret || process.env.X_API_SECRET || "";
        this.accessToken = config.accessToken || process.env.X_ACCESS_TOKEN || "";
        this.accessSecret = config.accessSecret || process.env.X_ACCESS_SECRET || "";
    }

    isConfigured() {
        return !!(
            this.apiKey &&
            this.apiSecret &&
            this.accessToken &&
            this.accessSecret
        );
    }

    /**
     * percent encode برای OAuth
     */
    percentEncode(str) {
        return encodeURIComponent(str)
            .replace(/!/g, "%21")
            .replace(/\*/g, "%2A")
            .replace(/'/g, "%27")
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29");
    }

    /**
     * ساخت Authorization header برای OAuth 1.0a
     */
    buildOAuthHeader(method, url, bodyParams) {
        const oauthParams = {
            oauth_consumer_key: this.apiKey,
            oauth_nonce: crypto.randomBytes(16).toString("hex"),
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: this.accessToken,
            oauth_version: "1.0"
        };

        // جمع‌آوری همه پارامترها برای signature
        const allParams = Object.assign({}, oauthParams, bodyParams || {});
        const sortedKeys = Object.keys(allParams).sort();

        const paramString = sortedKeys.map((k) => {
            return this.percentEncode(k) + "=" + this.percentEncode(allParams[k]);
        }).join("&");

        const baseString = [
            method.toUpperCase(),
            this.percentEncode(url),
            this.percentEncode(paramString)
        ].join("&");

        const signingKey =
            this.percentEncode(this.apiSecret) + "&" +
            this.percentEncode(this.accessSecret);

        const signature = crypto
            .createHmac("sha1", signingKey)
            .update(baseString)
            .digest("base64");

        oauthParams.oauth_signature = signature;

        // ساخت header
        const headerParts = Object.keys(oauthParams).map((k) => {
            return this.percentEncode(k) + '="' + this.percentEncode(oauthParams[k]) + '"';
        });

        return "OAuth " + headerParts.join(", ");
    }

    /**
     * درخواست HTTPS
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
                        headers: res.headers,
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
     * انتشار متن
     */
    async postTweet(text) {
        const url = "https://api.x.com/2/tweets";
        const body = JSON.stringify({ text: text });
        const bodyParams = {}; // برای JSON body، پارامترهای OAuth فقط

        const authHeader = this.buildOAuthHeader("POST", url, bodyParams);

        const res = await this.httpsRequest("POST", url, {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
        }, body);

        if (res.statusCode >= 200 && res.statusCode < 300) {
            return {
                success: true,
                externalId: res.body && res.body.data && res.body.data.id,
                url: res.body && res.body.data && res.body.data.id
                    ? "https://x.com/i/status/" + res.body.data.id
                    : null
            };
        }

        return {
            success: false,
            error: "X HTTP " + res.statusCode + ": " + res.raw
        };
    }

    /**
     * publish اصلی
     */
    async publish(content) {
        // فعلاً فقط متن (بدون media) — برای سادگی
        // TODO: upload media with v1.1 API
        let text = content.text;

        // X سقف 280 کاراکتر داره
        if (text.length > 280) {
            text = text.slice(0, 277) + "...";
        }

        return await this.postTweet(text);
    }
}

module.exports = { XPublisher };
