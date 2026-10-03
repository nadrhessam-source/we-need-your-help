# FINAL ACTIONS — کارهای باقی‌مونده قبل از Launch

---

## 🔴 اولویت بالا (قبل از Launch)

### ۱. شبکه‌های اجتماعی (نیاز به VPN)

- [ ] ساخت حساب X (Twitter) + 2FA
- [ ] ساخت حساب Reddit + 2FA
- [ ] ساخت کانال YouTube + 2FA
- [ ] ساخت حساب Instagram Business + 2FA
- [ ] ساخت حساب TikTok + 2FA
- [ ] ساخت اپ‌های Developer برای هر پلتفرم
- [ ] دریافت API credentials
- [ ] ذخیره در GitHub Secrets
- [ ] تست انتشار خودکار

### ۲. تست کامل Verification پرداخت

**نیاز:** $1 از یک دوست

- [ ] از سایت، فرم donation رو پر کن (مبلغ $1)
- [ ] مبلغ دقیق و آدرس مقصد رو از پنل پرداخت بگیر
- [ ] به دوستت بگو **دقیقاً همون مبلغ** رو به اون آدرس بفرسته
- [ ] از دوستت **tx hash** رو بگیر
- [ ] در سایت، tx hash رو در فیلد paste کن و **Verify** بزن
- [ ] بررسی که:
  - [ ] پیام "Confirmed!" نمایش داده میشه
  - [ ] انتقال به صفحه تشکر انجام میشه
  - [ ] donation در Recent Helpers ظاهر میشه
  - [ ] Total Raised آپدیت میشه
  - [ ] Milestone $10 فعال میشه (اگه کل از $10 رد شد)
- [ ] اگه verification fail شد، debug و fix کن

### ۳. ریست دیتابیس قبل از Launch

پاک کردن داده‌های تستی:

    DELETE FROM donations;
    DELETE FROM payment_requests;
    DELETE FROM social_posts;
    DELETE FROM cron_logs;
    DELETE FROM rate_limits;
    UPDATE milestones SET status = 'PENDING', reached_at = NULL;

- [ ] تنظیم `LAUNCH_DATE` در `worker/worker.js` روی تاریخ واقعی
- [ ] Redeploy Worker

---

## 🟡 اولویت متوسط (اختیاری)

### ۴. Environment Variable برای Testnet

- [ ] در `worker.js` دو بخش `TESTNET_CONFIG` و `MAINNET_CONFIG` بسازیم
- [ ] انتخاب بر اساس `env.WNYH_MODE`
- [ ] در Cloudflare Dashboard، variable `WNYH_MODE` رو تنظیم کنیم

### ۵. Cloudflare Workers Builds

جایگزین برای GitHub Actions (اگه GitHub Actions مشکلی داشت).

---

## 🟢 اولویت پایین (بلندمدت)

### ۶. Backup دستی
- [ ] Backup seed phrase wallet
- [ ] Backup کلیدهای API

### ۷. Rotate کردن Credentials
- [ ] هر ۹۰ روز: Cloudflare API Token
- [ ] هر ۱۸۰ روز: Social API tokens

### ۸. Observability
- [ ] Alert روی failure های مکرر
- [ ] Dashboard ساده (اختیاری)

### ۹. V2 (فقط اگه نیاز شد)
- [ ] Smart Contract
- [ ] Solana support
- [ ] دیتابیس Postgres

---

## 📌 راه‌اندازی API Keys

### X (Twitter)
- [ ] برو به https://developer.x.com
- [ ] Project + App بساز
- [ ] "User authentication settings" → "OAuth 1.0a"
- [ ] Permissions: Read and Write
- [ ] از Keys and tokens:
  - `X_API_KEY`
  - `X_API_SECRET`
  - `X_ACCESS_TOKEN`
  - `X_ACCESS_SECRET`

### Reddit
- [ ] برو به https://www.reddit.com/prefs/apps
- [ ] "Create another app" → نوع: **script**
- [ ] redirect uri: `http://localhost:8080`
- [ ] `REDDIT_CLIENT_ID`
- [ ] `REDDIT_CLIENT_SECRET`
- [ ] `REDDIT_USERNAME`
- [ ] `REDDIT_PASSWORD`
- [ ] `REDDIT_SUBREDDIT`

### YouTube
- [ ] برو به https://console.cloud.google.com
- [ ] Project جدید + YouTube Data API v3
- [ ] OAuth consent screen
- [ ] OAuth 2.0 Client ID (Desktop app)
- [ ] `YOUTUBE_CLIENT_ID`
- [ ] `YOUTUBE_CLIENT_SECRET`
- [ ] با OAuth Playground: Refresh Token → `YOUTUBE_REFRESH_TOKEN`

### Instagram
- [ ] نیاز به Facebook Business Account
- [ ] https://developers.facebook.com
- [ ] App → Business
- [ ] Instagram Graph API
- [ ] `INSTAGRAM_ACCESS_TOKEN`
- [ ] `INSTAGRAM_USER_ID`
- ⚠️ نیاز به App Review

### TikTok
- [ ] https://developers.tiktok.com
- [ ] App → Content Posting API
- [ ] `TIKTOK_CLIENT_KEY`
- [ ] `TIKTOK_CLIENT_SECRET`
- [ ] `TIKTOK_ACCESS_TOKEN`
- [ ] `TIKTOK_REFRESH_TOKEN`
- ⚠️ App Approval (2-6 هفته)

### ذخیره در GitHub Secrets
- [ ] repo → Settings → Secrets and variables → Actions
- [ ] New repository secret برای هرکدوم