/* ============================================================
   Base Publisher
   کلاس پایه برای همه publisher ها
   ============================================================ */

/**
 * نتیجه انتشار
 * @typedef {Object} PublishResult
 * @property {boolean} success
 * @property {string} [externalId] - ID پست در پلتفرم
 * @property {string} [url] - لینک به پست
 * @property {string} [error] - پیام خطا (اگه موفق نبود)
 */

class BasePublisher {
    constructor(name, config) {
        this.name = name;
        this.config = config || {};
        this.maxRetries = config.maxRetries || 3;
    }

    /**
     * اعتبارسنجی که credentials هستن
     * @returns {boolean}
     */
    isConfigured() {
        throw new Error("isConfigured() باید پیاده‌سازی بشه");
    }

    /**
     * انتشار پست
     * @param {Object} content - { text, mediaPath, date, template, events }
     * @returns {Promise<PublishResult>}
     */
    async publish(content) {
        throw new Error("publish() باید پیاده‌سازی بشه");
    }

    /**
     * retry wrapper برای publish
     */
    async publishWithRetry(content) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: this.name + " is not configured (missing credentials)"
            };
        }

        let lastError = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log("[" + this.name + "] Attempt " + attempt + "/" + this.maxRetries);
                const result = await this.publish(content);
                if (result.success) {
                    console.log("[" + this.name + "] Success: " + (result.url || result.externalId));
                    return result;
                }
                // اگه نتیجه ناموفق بود ولی خطا نداد (مثلاً rate limit)
                if (result.error && !this.isRetryable(result.error)) {
                    console.log("[" + this.name + "] Non-retryable error: " + result.error);
                    return result;
                }
                lastError = result.error || "Unknown failure";
            } catch (err) {
                lastError = err.message || String(err);
                console.log("[" + this.name + "] Exception: " + lastError);
                if (!this.isRetryable(lastError)) {
                    break;
                }
            }

            // backoff قبل از تلاش بعدی
            if (attempt < this.maxRetries) {
                const waitMs = Math.pow(2, attempt) * 1000;
                console.log("[" + this.name + "] Waiting " + waitMs + "ms before retry");
                await this.sleep(waitMs);
            }
        }

        return {
            success: false,
            error: "Failed after " + this.maxRetries + " attempts: " + lastError
        };
    }

    /**
     * خطاهای retryable
     */
    isRetryable(errorMsg) {
        if (!errorMsg) return false;
        const msg = String(errorMsg).toLowerCase();
        // rate limits و خطاهای شبکه و خطاهای 5xx
        return (
            msg.indexOf("rate limit") !== -1 ||
            msg.indexOf("timeout") !== -1 ||
            msg.indexOf("network") !== -1 ||
            msg.indexOf("econnreset") !== -1 ||
            msg.indexOf("502") !== -1 ||
            msg.indexOf("503") !== -1 ||
            msg.indexOf("504") !== -1 ||
            msg.indexOf("429") !== -1
        );
    }

    /**
     * sleep helper
     */
    sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }
}

module.exports = { BasePublisher };
