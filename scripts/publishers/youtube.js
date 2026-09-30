/* ============================================================
   YouTube Publisher
   استفاده از YouTube Data API v3 برای آپلود ویدیو
   Auth: OAuth 2.0 با Refresh Token
   ============================================================ */

const fs = require("fs");
const https = require("https");
const { URL } = require("url");
const { BasePublisher } = require("./base");

class YouTubePublisher extends BasePublisher {
    constructor(config) {
        super("YouTube", config);

        this.clientId = config.clientId || process.env.YOUTUBE_CLIENT_ID || "";
        this.clientSecret = config.clientSecret || process.env.YOUTUBE_CLIENT_SECRET || "";
        this.refreshToken = config.refreshToken || process.env.YOUTUBE_REFRESH_TOKEN || "";

        // پیش‌فرض: unlisted. بعداً می‌تونه public بشه
        this.privacyStatus = config.privacyStatus ||
            process.env.YOUTUBE_PRIVACY ||
            "unlisted";

        this.categoryId = config.categoryId || "24"; // 24 = Entertainment

        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    isConfigured() {
        return !!(
            this.clientId &&
            this.clientSecret &&
            this.refreshToken
        );
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
     * گرفتن access token از refresh token
     */
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: "refresh_token"
        }).toString();

        const res = await this.httpsRequest(
            "POST",
            "https://oauth2.googleapis.com/token",
            {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body)
            },
            body
        );

        if (res.statusCode !== 200 || !res.body || !res.body.access_token) {
            throw new Error("YouTube auth failed: HTTP " + res.statusCode + " " + res.raw);
        }

        this.accessToken = res.body.access_token;
        this.tokenExpiry = Date.now() + ((res.body.expires_in || 3600) - 300) * 1000;
        return this.accessToken;
    }

    /**
     * آپلود ویدیو با multipart upload
     */
    async uploadVideo(videoPath, title, description, tags) {
        const token = await this.getAccessToken();

        if (!fs.existsSync(videoPath)) {
            return { success: false, error: "Video file not found: " + videoPath };
        }

        const videoData = fs.readFileSync(videoPath);
        const fileSize = videoData.length;

        const metadata = {
            snippet: {
                title: title,
                description: description,
                tags: tags || [],
                categoryId: this.categoryId
            },
            status: {
                privacyStatus: this.privacyStatus,
                selfDeclaredMadeForKids: false
            }
        };

        const boundary = "----WNYHBoundary" + Date.now();
        const metadataJson = JSON.stringify(metadata);

        // ساخت multipart body
        const part1 =
            "--" + boundary + "\r\n" +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            metadataJson + "\r\n" +
            "--" + boundary + "\r\n" +
            "Content-Type: video/mp4\r\n\r\n";

        const part2 = "\r\n--" + boundary + "--\r\n";

        const bodyBuffer = Buffer.concat([
            Buffer.from(part1, "utf8"),
            videoData,
            Buffer.from(part2, "utf8")
        ]);

        const uploadUrl =
            "https://www.googleapis.com/upload/youtube/v3/videos" +
            "?uploadType=multipart&part=snippet,status";

        return await new Promise((resolve) => {
            const u = new URL(uploadUrl);
            const options = {
                hostname: u.hostname,
                path: u.pathname + u.search,
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "multipart/related; boundary=" + boundary,
                    "Content-Length": bodyBuffer.length
                }
            };

            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsed = null;
                    try {
                        parsed = JSON.parse(data);
                    } catch (_) {}
                    if (res.statusCode >= 200 && res.statusCode < 300 && parsed) {
                        resolve({
                            success: true,
                            externalId: parsed.id,
                            url: "https://youtube.com/watch?v=" + parsed.id
                        });
                    } else {
                        resolve({
                            success: false,
                            error: "YouTube HTTP " + res.statusCode + ": " + data.slice(0, 500)
                        });
                    }
                });
            });

            req.on("error", (err) => {
                resolve({ success: false, error: "YouTube upload error: " + err.message });
            });

            req.write(bodyBuffer);
            req.end();
        });
    }

    /**
     * publish اصلی
     */
    async publish(content) {
        if (!content.mediaPath) {
            return {
                success: false,
                error: "No video file provided (content.mediaPath is null)"
            };
        }

        const lines = content.text.split("\n").filter(function (l) { return l.trim(); });
        let title = lines[0] || "WE NEED YOUR HELP";
        // سقف 100 کاراکتر برای YouTube title
        if (title.length > 100) {
            title = title.slice(0, 97) + "...";
        }

        const description = content.text;
        const tags = ["we need your help", "internet experiment", "crypto", "donation"];

        return await this.uploadVideo(content.mediaPath, title, description, tags);
    }
}

module.exports = { YouTubePublisher };
