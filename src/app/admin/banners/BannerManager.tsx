'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BannerView } from '@/services/bannerService'
import {
  createBanner,
  deleteBanner,
  reorderBanner,
  toggleBanner,
  updateBanner,
} from './actions'

type BannerFormState = {
  id: string | null
  title: string
  altText: string
  body: string
  ctaLabel: string
  ctaHref: string
  displayOrder: string
  isActive: boolean
  startsAt: string
  endsAt: string
  existingImageUrl: string | null
  existingMobileImageUrl: string | null
  removeMobileImage: boolean
}

function emptyForm(): BannerFormState {
  return {
    id: null,
    title: '',
    altText: '',
    body: '',
    ctaLabel: '',
    ctaHref: '',
    displayOrder: '0',
    isActive: true,
    startsAt: '',
    endsAt: '',
    existingImageUrl: null,
    existingMobileImageUrl: null,
    removeMobileImage: false,
  }
}

function toLocalDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function formFromBanner(banner: BannerView): BannerFormState {
  return {
    id: banner.id,
    title: banner.title ?? '',
    altText: banner.alt_text,
    body: banner.body ?? '',
    ctaLabel: banner.cta_label ?? '',
    ctaHref: banner.cta_href ?? '',
    displayOrder: String(banner.display_order),
    isActive: banner.is_active,
    startsAt: toLocalDateTime(banner.starts_at),
    endsAt: toLocalDateTime(banner.ends_at),
    existingImageUrl: banner.image_url,
    existingMobileImageUrl: banner.mobile_image_url,
    removeMobileImage: false,
  }
}

function statusFor(banner: BannerView): { label: string; className: string } {
  if (!banner.is_active) return { label: 'غير نشط', className: 'bg-slate-100 text-slate-700' }
  const now = Date.now()
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) {
    return { label: 'مجدول', className: 'bg-blue-100 text-blue-700' }
  }
  if (banner.ends_at && new Date(banner.ends_at).getTime() <= now) {
    return { label: 'منتهي', className: 'bg-rose-100 text-rose-700' }
  }
  return { label: 'نشط', className: 'bg-emerald-100 text-emerald-700' }
}

export default function BannerManager({ initialBanners }: { initialBanners: BannerView[] }) {
  const router = useRouter()
  const banners = initialBanners
  const [form, setForm] = useState<BannerFormState>(emptyForm)
  const [desktopFile, setDesktopFile] = useState<File | null>(null)
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const desktopPreviewRef = useRef<string | null>(null)
  const mobilePreviewRef = useRef<string | null>(null)
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    return () => {
      if (desktopPreviewRef.current) URL.revokeObjectURL(desktopPreviewRef.current)
      if (mobilePreviewRef.current) URL.revokeObjectURL(mobilePreviewRef.current)
    }
  }, [])

  const clearPreviews = () => {
    if (desktopPreviewRef.current) URL.revokeObjectURL(desktopPreviewRef.current)
    if (mobilePreviewRef.current) URL.revokeObjectURL(mobilePreviewRef.current)
    desktopPreviewRef.current = null
    mobilePreviewRef.current = null
    setDesktopPreview(null)
    setMobilePreview(null)
    setDesktopFile(null)
    setMobileFile(null)
  }

  const resetForm = (clearMessages = true) => {
    setForm(emptyForm())
    clearPreviews()
    if (clearMessages) {
      setNotice(null)
      setError(null)
    }
  }

  const beginEdit = (banner: BannerView) => {
    setForm(formFromBanner(banner))
    clearPreviews()
    setNotice(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildFormData = () => {
    const data = new FormData()
    if (form.id) data.set('id', form.id)
    data.set('title', form.title)
    data.set('alt_text', form.altText)
    data.set('body', form.body)
    data.set('cta_label', form.ctaLabel)
    data.set('cta_href', form.ctaHref)
    data.set('display_order', form.displayOrder)
    data.set('is_active', String(form.isActive))
    data.set('starts_at', form.startsAt)
    data.set('ends_at', form.endsAt)
    data.set('remove_mobile_image', String(form.removeMobileImage))
    if (desktopFile) data.set('desktop_image', desktopFile)
    if (mobileFile) data.set('mobile_image', mobileFile)
    return data
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)
    setError(null)
    const data = buildFormData()
    startTransition(async () => {
      try {
        const result = form.id ? await updateBanner(data) : await createBanner(data)
        if (!result.ok) {
          setError(result.error)
          return
        }
        resetForm(false)
        setNotice(result.message)
        router.refresh()
      } catch {
        setError('تعذر تنفيذ العملية. حاول مرة أخرى.')
      }
    })
  }

  const runAction = (action: (data: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>, data: FormData) => {
    setNotice(null)
    setError(null)
    startTransition(async () => {
      try {
        const result = await action(data)
        if (!result.ok) {
          setError(result.error ?? 'تعذر تنفيذ العملية.')
        } else {
          setNotice(result.message ?? 'تم تنفيذ العملية.')
          router.refresh()
        }
      } catch (error) {
        console.error('Banner action failed:', error)
        setError(error instanceof Error && error.message ? error.message : 'تعذر تنفيذ العملية.')
      }
    })
  }

  const handleToggle = (banner: BannerView) => {
    const data = new FormData()
    data.set('id', banner.id)
    data.set('is_active', String(!banner.is_active))
    runAction(toggleBanner, data)
  }

  const handleDelete = (banner: BannerView) => {
    if (!window.confirm(`حذف البانر «${banner.title || banner.alt_text}»؟`)) return
    const data = new FormData()
    data.set('id', banner.id)
    runAction(deleteBanner, data)
  }

  const handleReorder = (banner: BannerView, direction: 'up' | 'down') => {
    const data = new FormData()
    data.set('id', banner.id)
    data.set('direction', direction)
    runAction(reorderBanner, data)
  }

  return (
    <div className="space-y-8" dir="rtl">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">{form.id ? 'تعديل البانر' : 'بانر جديد'}</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">{form.id ? form.title || 'بانر بدون عنوان' : 'إنشاء بانر'}</h2>
          </div>
          {form.id ? (
            <button type="button" onClick={() => resetForm()} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
              إلغاء التعديل
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">العنوان
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-bold text-slate-700">النص البديل للصورة
              <input required value={form.altText} onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
          </div>
          <label className="block text-sm font-bold text-slate-700">النص التسويقي
            <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">نص CTA اختياري
              <input value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-bold text-slate-700">مسار CTA داخلي فقط
              <input placeholder="/products" value={form.ctaHref} onChange={(event) => setForm((current) => ({ ...current, ctaHref: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block text-sm font-bold text-slate-700">الترتيب
              <input type="number" min="0" step="1" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-bold text-slate-700">يبدأ في
              <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-bold text-slate-700">ينتهي في
              <input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">صورة سطح المكتب
              <input required={!form.id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (desktopPreviewRef.current) URL.revokeObjectURL(desktopPreviewRef.current)
                const nextPreview = file ? URL.createObjectURL(file) : null
                desktopPreviewRef.current = nextPreview
                setDesktopFile(file)
                setDesktopPreview(nextPreview)
              }} className="mt-2 block min-h-11 w-full rounded-xl border border-dashed border-slate-300 p-2 text-sm" />
              <span className="mt-2 block text-xs font-normal text-slate-500">JPG و PNG و WebP، بحد أقصى 5MB.</span>
            </label>
            <label className="block text-sm font-bold text-slate-700">صورة الهاتف الاختيارية
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (mobilePreviewRef.current) URL.revokeObjectURL(mobilePreviewRef.current)
                const nextPreview = file ? URL.createObjectURL(file) : null
                mobilePreviewRef.current = nextPreview
                setMobileFile(file)
                setMobilePreview(nextPreview)
              }} className="mt-2 block min-h-11 w-full rounded-xl border border-dashed border-slate-300 p-2 text-sm" />
              <span className="mt-2 block text-xs font-normal text-slate-500">تستخدم على الشاشات الصغيرة وتعود لصورة سطح المكتب عند غيابها.</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PreviewCard label="معاينة سطح المكتب" src={desktopPreview ?? form.existingImageUrl} />
            <PreviewCard label="معاينة الهاتف" src={mobilePreview ?? (form.removeMobileImage ? null : form.existingMobileImageUrl)} />
          </div>
          {form.id && form.existingMobileImageUrl ? (
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.removeMobileImage} onChange={(event) => setForm((current) => ({ ...current, removeMobileImage: event.target.checked }))} className="h-5 w-5 accent-amber-500" />
              إزالة صورة الهاتف الحالية عند الحفظ
            </label>
          ) : null}
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-5 w-5 accent-amber-500" />
            نشط وقابل للظهور وفق الجدولة
          </label>
          <button type="submit" disabled={isPending} className="min-h-12 rounded-xl bg-slate-950 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500">
            {isPending ? 'جاري الحفظ...' : form.id ? 'حفظ التعديلات' : 'إنشاء بانر'}
          </button>
        </form>
      </section>

      {notice ? <p role="status" aria-live="polite" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p> : null}
      {error ? <p role="alert" aria-live="assertive" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">كل البانرات</h2>
            <p className="mt-1 text-sm text-slate-500">تظهر هنا الحالات النشطة وغير النشطة والمجدولة والمنتهية.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{banners.length}</span>
        </div>
        {banners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد بانرات بعد.</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {banners.map((banner, index) => {
              const status = statusFor(banner)
              return (
                <article key={banner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-[16/7] bg-slate-100">
                    <Image src={banner.image_url} alt={banner.alt_text} fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                    <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-950">{banner.title || 'بانر بدون عنوان'}</h3>
                        <p className="mt-1 text-xs text-slate-500">الترتيب: {banner.display_order} · {banner.alt_text}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{banner.is_active ? 'نشط' : 'متوقف'}</span>
                    </div>
                    {banner.body ? <p className="text-sm leading-7 text-slate-600">{banner.body}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => beginEdit(banner)} className="min-h-10 rounded-lg bg-slate-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500">تعديل</button>
                      <button type="button" onClick={() => handleToggle(banner)} disabled={isPending} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500">{banner.is_active ? 'إيقاف' : 'تفعيل'}</button>
                      <button type="button" onClick={() => handleReorder(banner, 'up')} disabled={isPending || index === 0} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500">تحريك لأعلى</button>
                      <button type="button" onClick={() => handleReorder(banner, 'down')} disabled={isPending || index === banners.length - 1} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500">تحريك لأسفل</button>
                      <button type="button" onClick={() => handleDelete(banner)} disabled={isPending} className="min-h-10 rounded-lg border border-rose-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500">حذف</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function PreviewCard({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold text-slate-600">{label}</p>
      <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-slate-100">
        {src ? <Image src={src} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">لا توجد معاينة</div>}
      </div>
    </div>
  )
}