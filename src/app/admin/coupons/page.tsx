import { requireAdmin } from '@/lib/auth/authorization'
import CouponManager from './CouponManager'

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('coupons')
    .select('id,code,discount_type,applies_to,discount_value,is_active,starts_at,ends_at,usage_limit,usage_count,minimum_order_amount,created_at,updated_at,deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Admin coupons unavailable.', error)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" dir="rtl">
        <h1 className="text-xl font-extrabold">تعذر تحميل الكوبونات</h1>
        <p className="mt-2 text-sm leading-7">تحقق من قاعدة البيانات أو الإعدادات ثم أعد المحاولة.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <p className="text-sm font-bold text-amber-600">إدارة المحتوى</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">الكوبونات</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          أنشئ كوبونات الخصم وعدّل حالتها وتابع استخدامها مع الحفاظ على سجل الطلبات.
        </p>
      </div>
      <CouponManager initialCoupons={data ?? []} />
    </div>
  )
}
