'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createCoupon,
  softDeleteCoupon,
  toggleCoupon,
  updateCoupon,
  type CouponActionResult,
} from './actions'

type CouponRecord = {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed_amount'
  applies_to: 'products' | 'shipping' | 'order_total'
  discount_value: number | string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  usage_count: number
  minimum_order_amount: number | string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type CouponForm = {
  code: string
  discountType: CouponRecord['discount_type']
  appliesTo: CouponRecord['applies_to']
  discountValue: string
  minimumOrderAmount: string
  usageLimit: string
  startsAt: string
  endsAt: string
  isActive: boolean
}

const emptyForm: CouponForm = {
  code: '',
  discountType: 'percentage',
  appliesTo: 'products',
  discountValue: '',
  minimumOrderAmount: '0',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
}

const discountTypeLabels: Record<CouponRecord['discount_type'], string> = {
  percentage: 'نسبة مئوية',
  fixed_amount: 'مبلغ ثابت',
}

const appliesToLabels: Record<CouponRecord['applies_to'], string> = {
  products: 'المنتجات',
  shipping: 'الشحن',
  order_total: 'إجمالي الطلب',
}

function dateInputValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

function statusFor(coupon: CouponRecord): { label: string; className: string } {
  const now = Date.now()
  if (!coupon.is_active) return { label: 'غير نشط', className: 'bg-slate-100 text-slate-700' }
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return { label: 'مستنفد', className: 'bg-rose-100 text-rose-700' }
  }
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { label: 'مجدول', className: 'bg-blue-100 text-blue-700' }
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() <= now) {
    return { label: 'منتهي', className: 'bg-amber-100 text-amber-800' }
  }
  return { label: 'نشط', className: 'bg-emerald-100 text-emerald-700' }
}

function formFromCoupon(coupon: CouponRecord): CouponForm {
  return {
    code: coupon.code,
    discountType: coupon.discount_type,
    appliesTo: coupon.applies_to,
    discountValue: String(coupon.discount_value),
    minimumOrderAmount: String(coupon.minimum_order_amount),
    usageLimit: coupon.usage_limit === null ? '' : String(coupon.usage_limit),
    startsAt: dateInputValue(coupon.starts_at),
    endsAt: dateInputValue(coupon.ends_at),
    isActive: coupon.is_active,
  }
}

export default function CouponManager({ initialCoupons }: { initialCoupons: CouponRecord[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const coupons = initialCoupons
  const [editing, setEditing] = useState<CouponRecord | null>(null)
  const [form, setForm] = useState<CouponForm>(emptyForm)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const applyResult = (result: CouponActionResult) => {
    if (result.ok) {
      setNotice(result.message)
      setError('')
      router.refresh()
    } else {
      setError(result.error)
      setNotice('')
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (editing) formData.set('id', editing.id)
    startTransition(async () => {
      const result = editing ? await updateCoupon(formData) : await createCoupon(formData)
      applyResult(result)
      if (result.ok) resetForm()
    })
  }

  const handleEdit = (coupon: CouponRecord) => {
    setEditing(coupon)
    setForm(formFromCoupon(coupon))
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggle = (coupon: CouponRecord) => {
    const formData = new FormData()
    formData.set('id', coupon.id)
    formData.set('isActive', String(!coupon.is_active))
    startTransition(async () => {
      applyResult(await toggleCoupon(formData))
    })
  }

  const handleDelete = (coupon: CouponRecord) => {
    if (!window.confirm('سيتم إخفاء الكوبون ' + coupon.code + ' مع الحفاظ على سجل الاستخدام. هل تريد المتابعة؟')) return
    const formData = new FormData()
    formData.set('id', coupon.id)
    startTransition(async () => {
      const result = await softDeleteCoupon(formData)
      applyResult(result)
      if (result.ok && editing?.id === coupon.id) resetForm()
    })
  }

  const updateField = (name: keyof CouponForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              {editing ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">لا يمكن تعديل عداد الاستخدام من هذه الواجهة.</p>
          </div>
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              إلغاء التعديل
            </button>
          )}
        </div>

        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p>}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            الكود
            <input name="code" required value={form.code} onChange={(event) => updateField('code', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-amber-500" placeholder="WELCOME10" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            نوع الخصم
            <select name="discountType" value={form.discountType} onChange={(event) => updateField('discountType', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500">
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed_amount">مبلغ ثابت</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            يطبق على
            <select name="appliesTo" value={form.appliesTo} onChange={(event) => updateField('appliesTo', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500">
              <option value="products">المنتجات</option>
              <option value="shipping">الشحن</option>
              <option value="order_total">إجمالي الطلب</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            قيمة الخصم
            <input name="discountValue" required type="number" min="0.01" step="0.01" value={form.discountValue} onChange={(event) => updateField('discountValue', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            الحد الأدنى للطلب
            <input name="minimumOrderAmount" required type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={(event) => updateField('minimumOrderAmount', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            حد الاستخدام
            <input name="usageLimit" type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => updateField('usageLimit', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" placeholder="غير محدود" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            يبدأ في
            <input name="startsAt" type="datetime-local" value={form.startsAt} onChange={(event) => updateField('startsAt', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            ينتهي في
            <input name="endsAt" type="datetime-local" value={form.endsAt} onChange={(event) => updateField('endsAt', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" />
          </label>
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700 md:col-span-2">
            <input name="isActive" type="checkbox" value="true" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} className="h-5 w-5 accent-amber-600" />
            الكوبون نشط
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء الكوبون'}
            </button>
            {editing && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">تفريغ النموذج</button>}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-slate-950">قائمة الكوبونات</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{coupons.length} كوبون</span>
        </div>
        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">لا توجد كوبونات محفوظة حاليًا.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {coupons.map((coupon) => {
              const status = statusFor(coupon)
              return (
                <article key={coupon.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-extrabold tracking-wide text-slate-950">{coupon.code}</p>
                      <p className="mt-1 text-sm text-slate-500">{discountTypeLabels[coupon.discount_type]} · {appliesToLabels[coupon.applies_to]}</p>
                    </div>
                    <span className={'rounded-full px-3 py-1 text-xs font-extrabold ' + status.className}>{status.label}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">قيمة الخصم</p><p className="mt-1 font-extrabold text-slate-900">{String(coupon.discount_value)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">الاستخدام</p><p className="mt-1 font-extrabold text-slate-900">{coupon.usage_count} / {coupon.usage_limit === null ? 'غير محدود' : coupon.usage_limit}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">الحد الأدنى</p><p className="mt-1 font-extrabold text-slate-900">{String(coupon.minimum_order_amount)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">الفترة</p><p className="mt-1 font-extrabold text-slate-900">{coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString('ar-EG') : 'من الآن'} — {coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString('ar-EG') : 'مفتوحة'}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleEdit(coupon)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">تعديل</button>
                    <button type="button" onClick={() => handleToggle(coupon)} disabled={isPending} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50">{coupon.is_active ? 'تعطيل' : 'تفعيل'}</button>
                    <button type="button" onClick={() => handleDelete(coupon)} disabled={isPending} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">حذف أرشيفي</button>
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
