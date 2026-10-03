# FINAL ACTIONS — اقدامات نهایی قبل از Launch

این فایل لیست کارهایی هست که قبل از launch رسمی یا در آینده در صورت نیاز باید انجام بشن.

---

## ✅ انجام شده

### زیرساخت
- [x] خرید دامنه: `we-need-your-help.xyz`
- [x] اتصال دامنه به Cloudflare
- [x] Nameserver ها به Cloudflare
- [x] Frontend روی `we-need-your-help.xyz` (GitHub Pages)
- [x] Backend روی `api.we-need-your-help.xyz` (Cloudflare Worker)
- [x] SSL/HTTPS فعال (Full mode)
- [x] Cloudflare Proxy فعال (CDN + DDoS protection)
- [x] تست دسترسی از ایران بدون VPN ✅

### Backend + Database
- [x] Cloudflare Worker با ۴ شبکه (Polygon, Base, Ethereum, TRON)
- [x] D1 Database با ۶ جدول
- [x] صف مبلغ یکتا (Unique Amount)
- [x] Endpoint `/api/payment/submit-tx` (تأیید دستی با tx hash)
- [x] Endpoint `/api/social/record` (ثبت نتیجه انتشار)
- [x] Rate Limiting با D1 (60 req/min)
- [x] CORS whitelist (فقط دامنه‌های مجاز)

### Content + Video Engine
- [x] Content Engine با ۹ template
- [x] Video Engine با FFmpeg
- [x] GitHub Actions روزانه (ساعت 9 UTC)
- [x] ۷ event جدید (donor_milestone, network_first, repeat_donor, week_anniversary, lucky_amount, big_day, huge_day)

### Social Publishers (کد)
- [x] X Publisher
- [x] Reddit Publisher
- [x] YouTube Publisher
- [x] Instagram Publisher
- [x] TikTok Publisher
- [x] Workflow با ۵ publisher

### خودکارسازی
- [x] GitHub Actions برای Frontend deploy
- [x] GitHub Actions برای Worker deploy (خودکار با push)

### امنیت (Phase 12)
- [x] همه secrets از env vars خونده میشن (نه hardcoded)
- [x] هیچ secret در git history نیست
- [x] CORS whitelist
- [x] Rate Limiting با D1
- [x] Input sanitization (`sanitizeText`)
- [x] SQL Injection prevention (prepared statements)
- [x] XSS prevention (`escapeHtml` در frontend)

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

**زمان:** قبل از launch رسمی
**نیاز:** $1 از یک دوست

**مراحل:**
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

**نکته:** این تنها بخشی از پروژه هست که بدون تراکنش واقعی قابل تست نیست.

### ۳. ریست دیتابیس قبل از Launch

پاک کردن داده‌های تستی:

    DELETE FROM donations;
    DELETE FROM payment_requests;
    DELETE FROM social_posts;
    DELETE FROM cron_logs;
    DELETE FROM rate_limits;
    UPDATE milestones SET status = 'PENDING', reached_at = NULL;

تنظیم `LAUNCH_DATE` در `worker/worker.js` روی تاریخ واقعی و Redeploy Worker.

---

## 🟡 اولویت متوسط (اختیاری، در آینده)

### ۴. Environment Variable برای Testnet

**مشکل:** برای تست Testnet، باید کد Worker رو موقتاً تغییر بدیم.

**راه‌حل:** یه متغیر محیطی که رفتار worker رو تغییر بده بدون تغییر کد.

**مراحل:**
- [ ] در `worker.js` دو بخش `TESTNET_CONFIG` و `MAINNET_CONFIG` بسازیم
- [ ] انتخاب بر اساس `env.WNYH_MODE`
- [ ] در Cloudflare Dashboard، variable `WNYH_MODE` رو تنظیم کنیم
- [ ] تغییر بین این دو از طریق Dashboard، نه از طریق کد

**مزیت:** Testnet تست بدون تغییر کد.

### ۵. Cloudflare Workers Builds

**جایگزین برای GitHub Actions:**
- Cloudflare Workers Builds می‌تونه مستقیماً به GitHub وصل بشه
- هر push، خودکار deploy میشه
- بدون نیاز به API Token در GitHub

**توصیه:** اگه GitHub Actions کار کرد، نیازی نیست.

---

## 🟢 اولویت پایین (بلندمدت)

### ۶. Backup استراتژی
- [ ] Backup دوره‌ای D1 (export SQL)
- [ ] Backup seed phrase wallet
- [ ] Backup کلیدهای API

### ۷. Rotate کردن Credentials
- [ ] هر ۹۰ روز: Cloudflare API Token
- [ ] هر ۱۸۰ روز: Social API tokens
- [ ] سالانه: بررسی همه permissions

### ۸. Observability
- [ ] Status endpoint پیشرفته‌تر
- [ ] Alert روی failure های مکرر
- [ ] Dashboard ساده (اختیاری)

### ۹. بهبود Video
- [ ] اضافه کردن موسیقی royalty-free (اختیاری)
- [ ] انیمیشن‌های پیشرفته‌تر
- [ ] Template های متنوع‌تر

### ۱۰. V2 (فقط اگه واقعاً نیاز شد)
- [ ] Smart Contract (اگه حجم تراکنش‌ها زیاد شد)
- [ ] Solana support
- [ ] دیتابیس Postgres (اگه D1 کافی نبود)

---

## 📌 راه‌اندازی API Keys برای Social Publishers

**زمان:** بعد از ساخت حساب‌های Social (نیاز به VPN)

### X (Twitter)
- [ ] برو به https://developer.x.com
- [ ] یک Project + App بساز
- [ ] در تنظیمات App: "User authentication settings" → "OAuth 1.0a"
- [ ] Permissions: Read and Write
- [ ] Callback URL: هر URL
- [ ] از Keys and tokens tab:
  - API Key → `X_API_KEY`
  - API Secret → `X_API_SECRET`
  - Access Token → `X_ACCESS_TOKEN`
  - Access Token Secret → `X_ACCESS_SECRET`

### Reddit
- [ ] برو به https://www.reddit.com/prefs/apps
- [ ] "Create another app" → نوع: **script**
- [ ] redirect uri: `http://localhost:8080`
- [ ] client_id → `REDDIT_CLIENT_ID`
- [ ] secret → `REDDIT_CLIENT_SECRET`
- [ ] یوزرنیم: `REDDIT_USERNAME`
- [ ] پسورد: `REDDIT_PASSWORD`
- [ ] Subreddit مقصد: `REDDIT_SUBREDDIT`

### YouTube
- [ ] برو به https://console.cloud.google.com
- [ ] Project جدید بساز
- [ ] YouTube Data API v3 رو فعال کن
- [ ] OAuth consent screen (External، Testing)
- [ ] OAuth 2.0 Client ID (نوع: Desktop app)
- [ ] Client ID → `YOUTUBE_CLIENT_ID`
- [ ] Client Secret → `YOUTUBE_CLIENT_SECRET`
- [ ] با OAuth Playground (https://developers.google.com/oauthplayground):
  - Authorize: `https://www.googleapis.com/auth/youtube.upload`
  - Refresh Token → `YOUTUBE_REFRESH_TOKEN`

### Instagram
- [ ] نیاز به Facebook Business Account
- [ ] برو به https://developers.facebook.com
- [ ] App بساز → نوع: Business
- [ ] Instagram Graph API
- [ ] OAuth flow
- [ ] Long-lived Access Token → `INSTAGRAM_ACCESS_TOKEN`
- [ ] Instagram Business User ID → `INSTAGRAM_USER_ID`
- ⚠️ نیاز به App Review برای publish عمومی

### TikTok
- [ ] برو به https://developers.tiktok.com
- [ ] App بساز → Content Posting API
- [ ] OAuth flow
- [ ] Client Key → `TIKTOK_CLIENT_KEY`
- [ ] Client Secret → `TIKTOK_CLIENT_SECRET`
- [ ] Access Token → `TIKTOK_ACCESS_TOKEN`
- [ ] Refresh Token → `TIKTOK_REFRESH_TOKEN`
- ⚠️ App Approval اجباری (2-6 هفته)

### ذخیره در GitHub Secrets

بعد از گرفتن همه کلیدها:
- [ ] برو به repo → Settings → Secrets and variables → Actions
- [ ] **New repository secret** برای هرکدوم
- [ ] اسم‌ها دقیقاً مطابق بالا

---

## یادآوری

این فایل رو در انتهای پروژه یک بار مرور کن.
موارد اولویت بالا رو قبل از Launch حتماً انجام بده.
بقیه رو فقط در صورت نیاز.