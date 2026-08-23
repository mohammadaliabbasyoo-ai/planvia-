# Planvia

اپ برنامه‌ریزی روزانه — کارها، پومودورو، یادداشت‌ها، تقویم و پس‌انداز هدفمند.
ساخته‌شده با React + Capacitor. توسعه‌دهنده: محمدعلی عباسی — تلگرام: [@ERYSH](https://t.me/ERYSH)

## ساخت APK با Codemagic (بدون نیاز به نصب چیزی روی سیستم)

1. این ریپازیتوری را در GitHub آپلود کنید.
2. وارد [codemagic.io](https://codemagic.io) شوید و با اکانت GitHub وصل شوید.
3. این پروژه را انتخاب کنید؛ فایل `codemagic.yaml` به‌صورت خودکار شناسایی می‌شود.
4. روی Start Build بزنید.
5. بعد از اتمام build، فایل APK از بخش Artifacts قابل دانلود است.

## ساخت APK با GitHub Actions (رایگان، خودکار)

این ریپازیتوری یک ورک‌فلو گیت‌هاب اکشن در مسیر `.github/workflows/build-apk.yml` دارد که به‌صورت خودکار APK می‌سازد.

1. این پروژه را در یک ریپازیتوری در GitHub آپلود/پوش کنید.
2. با هر پوش به شاخه‌ی `main` (یا `master`)، ورک‌فلو خودش اجرا می‌شود؛ یا از تب **Actions** در گیت‌هاب، ورک‌فلوی «Build Android APK» را انتخاب کرده و دکمه‌ی **Run workflow** را بزنید (اجرای دستی).
3. بعد از اتمام اجرا (چند دقیقه طول می‌کشد)، وارد همان اجرای ورک‌فلو در تب Actions شوید.
4. پایین صفحه، بخش **Artifacts** فایل `planvia-debug-apk` را دانلود کنید — یک zip حاوی APK دیباگ است.

> توجه: این APK نسخه‌ی *debug* است (برای تست/نصب مستقیم مناسب است). برای نسخه‌ی release و امضاشده جهت انتشار در Google Play، نیاز به تنظیم کلید امضا (signing key) و ویرایش ورک‌فلو برای اجرای `assembleRelease` دارید.

## ساخت محلی (اختیاری، نیاز به Node.js و Android Studio دارد)

```bash
npm install
npm run build
npx cap add android
npx cap sync
npx cap open android
```

سپس از داخل Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
