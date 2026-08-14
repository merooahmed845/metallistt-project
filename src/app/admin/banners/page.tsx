import { requireAdmin } from '@/lib/auth/authorization'
import { getAllBanners } from '@/services/bannerService'
import BannerManager from './BannerManager'

export const dynamic = 'force-dynamic'

export default async function AdminBannersPage() {
  await requireAdmin()
  let banners: Awaited<ReturnType<typeof getAllBanners>> = []
  let loadError = false
  try {
    banners = await getAllBanners()
  } catch (error) {
    console.error('Admin banners unavailable.', error)
    loadError = true
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" dir="rtl">
        <h1 className="text-xl font-extrabold">تعذر تحميل البانرات</h1>
        <p className="mt-2 text-sm leading-7">تحقق من قاعدة البيانات أو الإعدادات ثم أعد المحاولة.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <p className="text-sm font-bold text-amber-600">إدارة المحتوى</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">البانرات</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          أنشئ عروضًا تسويقية متجاوبة مع جدولة اختيارية، صورة للهاتف، ورابط داخلي آمن.
        </p>
      </div>
      <BannerManager initialBanners={banners} />
    </div>
  )
}