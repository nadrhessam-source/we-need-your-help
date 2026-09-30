# FINAL ACTIONS — اقدامات نهایی قبل از Launch

این فایل لیست کارهایی هست که قبل از launch رسمی یا در آینده در صورت نیاز باید انجام بشن.

---

## اولویت بالا (قبل از Launch)

### ۱. دامنه اختصاصی
- [x] خرید دامنه: `we-need-your-help.xyz`
- [x] اتصال دامنه به Cloudflare
- [x] Nameserver ها به Cloudflare
- [x] Frontend روی `we-need-your-help.xyz` (GitHub Pages)
- [x] Backend روی `api.we-need-your-help.xyz` (Cloudflare Worker)
- [x] SSL/HTTPS فعال (Full mode)
- [x] Cloudflare Proxy فعال (CDN + DDoS protection)
- [x] تست دسترسی از ایران بدون VPN ✅


### ۲. شبکه‌های اجتماعی
- [ ] ساخت حساب X (Twitter) + 2FA
- [ ] ساخت حساب Reddit + 2FA
- [ ] ساخت کانال YouTube + 2FA
- [ ] ساخت حساب Instagram Business + 2FA
- [ ] ساخت حساب TikTok + 2FA
- [ ] ساخت اپ‌های Developer برای هر پلتفرم
- [ ] دریافت API credentials
- [ ] ذخیره در GitHub Secrets
- [ ] پیاده‌سازی publisher ها
- [ ] تست انتشار خودکار

### ۳. ریست دیتابیس قبل از Launch

پاک کردن داده‌های تستی:

    DELETE FROM donations;
    DELETE FROM payment_requests;
    DELETE FROM social_posts;
    DELETE FROM cron_logs;
    UPDATE milestones SET status = 'PENDING', reached_at = NULL;

تنظیم LAUNCH_DATE در worker/worker.js روی تاریخ واقعی و Redeploy Worker.

### ۴. امنیت (فاز ۱۲)
- [ ] بررسی همه secrets
- [ ] بررسی workflow permissions
- [ ] بررسی rate limiting
- [ ] بررسی CORS
- [ ] بررسی logging (بدون افشای secrets)
- [ ] بررسی backup strategy

---

## اولویت متوسط (اختیاری، در آینده)

### ۵. خودکارسازی Deploy Worker

مشکل: الان هر تغییر در worker/worker.js نیاز به کپی-پیست دستی در Cloudflare داره.

راه‌حل: GitHub Action که خودکار deploy کنه.

مراحل:
- [ ] ساخت Cloudflare API Token با scope محدود:
  - Permissions: Account → Workers Scripts → Edit
  - Account Resources: فقط اکانت پروژه
  - Expiration: ۹۰ روز
- [ ] ذخیره در GitHub Secrets با نام CLOUDFLARE_API_TOKEN
- [ ] ساخت فایل .github/workflows/deploy-worker.yml
- [ ] تست
- [ ] rotate توکن هر ۹۰ روز

مزیت: هر push خودکار deploy میشه، دیگه نیازی به کپی-پیست نیست.

### ۶. Environment Variable برای Testnet

مشکل: برای تست Testnet، باید کد Worker رو موقتاً تغییر بدیم.

راه‌حل: یه متغیر محیطی که رفتار worker رو تغییر بده بدون تغییر کد.

مراحل:
- [ ] در worker.js یه بخش TESTNET_CONFIG و MAINNET_CONFIG بسازیم
- [ ] انتخاب بر اساس env.WNYH_MODE
- [ ] در Cloudflare Dashboard، variable WNYH_MODE رو تنظیم کنیم:
  - mainnet → production
  - testnet → تست
- [ ] تغییر بین این دو از طریق Dashboard، نه از طریق کد

مزیت: Testnet تست بدون تغییر کد.

### ۷. Cloudflare Workers Builds

جایگزین برای GitHub Actions:
- Cloudflare Workers Builds می‌تونه مستقیماً به GitHub وصل بشه
- هر push، خودکار deploy میشه
- بدون نیاز به API Token در GitHub

معایب: نیاز به آموزش اولیه

توصیه: اگه GitHub Actions راه‌اندازی شد و کار کرد، نیازی نیست.

---

## اولویت پایین (بلندمدت)

### ۸. Backup استراتژی
- [ ] Backup دوره‌ای D1 (export SQL)
- [ ] Backup seed phrase wallet
- [ ] Backup کلیدهای API

### ۹. Rotate کردن Credentials
- [ ] هر ۹۰ روز: Cloudflare API Token
- [ ] هر ۱۸۰ روز: Social API tokens (اگه ممکن باشه)
- [ ] سالانه: بررسی همه permissions

### ۱۰. Observability
- [ ] Status endpoint پیشرفته‌تر (اگه نیاز شد)
- [ ] Alert روی failure های مکرر (ایمیل)
- [ ] Dashboard ساده (اختیاری)

### ۱۱. بهبود Video
- [ ] اضافه کردن موسیقی royalty-free (اختیاری)
- [ ] انیمیشن‌های پیشرفته‌تر
- [ ] Template های متنوع‌تر

### ۱۲. V2 (فقط اگه واقعاً نیاز شد)
- [ ] Smart Contract (اگه حجم تراکنش‌ها زیاد شد)
- [ ] Solana support (اگه واقعاً درخواست بود)
- [ ] دیتابیس Postgres (اگه D1 کافی نبود)

---

### ۱۳. تست کامل Verification پرداخت

**زمان:** قبل از launch رسمی
**نیاز:** $1 از یک دوست

**مراحل:**
- [ ] از سایت، فرم donation رو پر کن (مبلغ $1، هر شبکه‌ای که راحته)
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
- [ ] اگه verification fail شد:
  - [ ] متن خطا رو از Console بگیر
  - [ ] در Worker Logs (Cloudflare) بررسی کن
  - [ ] مشکل رو fix کن و دوباره تست کن

**نکته:** این تنها بخشی از پروژه هست که بدون تراکنش واقعی قابل تست نیست.

---

### ۱۴. راه‌اندازی API Keys برای Social Publishers

**زمان:** بعد از ساخت حساب‌های Social (نیاز به VPN)

#### X (Twitter)
- [ ] برو به https://developer.x.com
- [ ] یک Project + App بساز
- [ ] در تنظیمات App، "User authentication settings" → "OAuth 1.0a" رو فعال کن
- [ ] Permissions: Read and Write
- [ ] Callback URL: هر URL (چون فقط برای گرفتن token یک‌باره)
- [ ] از Keys and tokens tab، اینا رو کپی کن:
  - API Key → `X_API_KEY`
  - API Secret → `X_API_SECRET`
  - Access Token → `X_ACCESS_TOKEN`
  - Access Token Secret → `X_ACCESS_SECRET`

#### Reddit
- [ ] برو به https://www.reddit.com/prefs/apps
- [ ] "Create another app" → نوع: **script**
- [ ] redirect uri: `http://localhost:8080`
- [ ] اینا رو کپی کن:
  - client_id (زیر نام app) → `REDDIT_CLIENT_ID`
  - secret → `REDDIT_CLIENT_SECRET`
- [ ] یوزرنیم اکانت: `REDDIT_USERNAME`
- [ ] پسورد اکانت: `REDDIT_PASSWORD`
- [ ] Subreddit مقصد: `REDDIT_SUBREDDIT` (مثلاً نام subreddit خودت)

#### YouTube
- [ ] برو به https://console.cloud.google.com
- [ ] یک Project جدید بساز
- [ ] YouTube Data API v3 رو فعال کن
- [ ] OAuth consent screen رو تنظیم کن (External، Testing mode)
- [ ] OAuth 2.0 Client ID بساز (نوع: Desktop app)
- [ ] اینا رو کپی کن:
  - Client ID → `YOUTUBE_CLIENT_ID`
  - Client Secret → `YOUTUBE_CLIENT_SECRET`
- [ ] با OAuth Playground، Refresh Token بگیر:
  - برو به https://developers.google.com/oauthplayground
  - تنظیمات → Use your own credentials
  - Authorize: `https://www.googleapis.com/auth/youtube.upload`
  - Exchange authorization code for tokens
  - Refresh Token → `YOUTUBE_REFRESH_TOKEN`

#### Instagram
- [ ] نیاز به Facebook Business Account
- [ ] برو به https://developers.facebook.com
- [ ] App بساز → نوع: Business
- [ ] Instagram Graph API رو اضافه کن
- [ ] OAuth flow رو طی کن (نیاز به Business Account)
- [ ] Long-lived Access Token → `INSTAGRAM_ACCESS_TOKEN`
- [ ] Instagram Business User ID → `INSTAGRAM_USER_ID`
- ⚠️ نیاز به App Review برای publish عمومی

#### TikTok
- [ ] برو به https://developers.tiktok.com
- [ ] App بساز → Content Posting API
- [ ] OAuth flow رو طی کن
- [ ] Client Key → `TIKTOK_CLIENT_KEY`
- [ ] Client Secret → `TIKTOK_CLIENT_SECRET`
- [ ] Access Token → `TIKTOK_ACCESS_TOKEN`
- [ ] Refresh Token → `TIKTOK_REFRESH_TOKEN`
- ⚠️ App Approval اجباری (2-6 هفته)

#### ذخیره در GitHub Secrets

بعد از گرفتن همه کلیدها:
- [ ] برو به repo → Settings → Secrets and variables → Actions
- [ ] **New repository secret** برای هرکدوم
- [ ] اسم‌ها دقیقاً مطابق بالا
---

## یادآوری

این فایل رو در انتهای پروژه یک بار مرور کن.
موارد اولویت بالا رو قبل از Launch حتماً انجام بده.
بقیه رو فقط در صورت نیاز.
