# Metallia — متجر إلكتروني (Next.js + Supabase)

متجر كوالين وإكسسوارات: منتجات، تصنيفات، سلة، طلبات (دفع بالمحفظة / InstaPay + تأكيد واتساب)، كوبونات، بانرات رئيسية، لوحة تحكم أدمن.

## التشغيل المحلي
1. انسخ `.env.example` إلى `.env.local` واملأ القيم من Supabase: Project Settings > API
2. `npm install`
3. `npm run dev`

## المتغيرات المطلوبة
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

نفس القيم تتحط في Vercel: Project Settings > Environment Variables.

## الداتا بيز
- مشروع Supabase جديد: شغّل ملفات `supabase/migrations` بالترتيب التاريخي (تبدأ بـ 20260810000000_create_core_tables).
- بعده شغّل `supabase/seed.sql` لزرع بيانات البداية.
- باكيتات الستوريدج: `product-images` و `banner-images` (Public).

## ملاحظات تشغيل
- خطة Supabase المجانية توقف المشروع بعد 7 أيام خمول — `vercel.json` فيه Cron يومي على `/api/health` لمنع الوقوف، وفيه GitHub Action احتياطي كل 3 أيام.
- أسعار الشحن (60/70/80 ج حسب مجموعة المحافظات) معرفة داخل دالة `create_checkout_order` في الداتا بيز.
