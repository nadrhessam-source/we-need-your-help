# FINAL ACTIONS — اقدامات نهایی قبل از Launch

این فایل لیست کارهایی هست که قبل از launch رسمی یا در آینده در صورت نیاز باید انجام بشن.

---

## اولویت بالا (قبل از Launch)

### ۱. دامنه اختصاصی
- [ ] خرید دامنه (~10-15 دلار در سال)
- [ ] اتصال به Cloudflare
- [ ] تنظیم DNS records
- [ ] اتصال api.yourdomain.com به Worker (Custom Domain)
- [ ] اتصال yourdomain.com به GitHub Pages (Custom Domain)
- [ ] فعال‌سازی HTTPS (Full Strict)
- [ ] تست دسترسی از ایران (بدون VPN)

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

## یادآوری

این فایل رو در انتهای پروژه یک بار مرور کن.
موارد اولویت بالا رو قبل از Launch حتماً انجام بده.
بقیه رو فقط در صورت نیاز.
