# دليل تركيب نسخة جديدة من قالب المتجر (Metallia Template)

الهدف: متجر جديد شغال في أقل من ساعة، بتغيير الإعدادات والبيانات بس.

## 1) مشروع Supabase جديد
1. من supabase.com اعمل مشروع جديد (الخطة المجانية كفاية للبداية).
2. من Project Settings > API انسخ: Project URL والمفتاح anon public.
3. من SQL Editor شغّل ملفات supabase/migrations بالترتيب التاريخي، واحد ورا التاني: أولهم 20260810000000_create_core_tables وآخرهم ملفات الكوبونات.
4. شغّل supabase/seed.sql لزرع تصنيف ومنتجات تجريبية (أو عدّله ببيانات العميل قبل التشغيل).
5. من Storage اعمل باكتين Public: product-images و banner-images، وارفع صور العميل (الأفضل صور مضغوطة أقل من 300KB للصورة، ومتكررش نفس الصورة).

## 2) إعدادات المتجر
عدّل src/config/store.ts: اسم المتجر، العملة، رقم الواتساب، روابط السوشيال، ورسوم الشحن لو مختلفة. لو الشحن اتغير، عدّل نفس الأرقام في دالة create_checkout_order من SQL Editor.

## 3) النشر على Vercel
1. ارفع المشروع على GitHub واستورده في Vercel.
2. في Environment Variables حط: NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY.
3. اعمل Deploy. ملف vercel.json هيشغّل Cron يومي على /api/health عشان مشروع Supabase المجاني مينامش بعد 7 أيام خمول.

## 4) حساب الأدمن
سجّل حساب من صفحة الدخول في الموقع، وبعدين من Supabase > Table Editor > profiles غيّر دور الحساب ده لـ admin. هو ده اللي هيدير المنتجات والطلبات والبانرات.

## 5) اختبار سريع قبل التسليم
- الصفحة الرئيسية بتعرض التصنيفات والمنتجات.
- اعمل طلب تجريبي كزائر واتأكد إنه وصل لجدول orders.
- افتح /api/health واتأكد إن الرد فيه ok: true.
