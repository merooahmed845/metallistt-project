'use client'

import { useCart } from '@/context/CartContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCheckoutOrder, quoteCheckoutWithCoupon } from './actions'
import { supabase } from '@/utils/supabase/client'

const EGYPT_GOVERNORATES = [
{ name: 'القاهرة', fee: 60 },
{ name: 'الجيزة', fee: 60 },
{ name: 'الإسكندرية', fee: 70 },
{ name: 'الدقهلية', fee: 70 },
{ name: 'الشرقية', fee: 70 },
{ name: 'المنوفية', fee: 70 },
{ name: 'الغربية', fee: 70 },
{ name: 'البحيرة', fee: 70 },
{ name: 'كفر الشيخ', fee: 70 },
{ name: 'دمياط', fee: 70 },
{ name: 'بورسعيد', fee: 70 },
{ name: 'الإسماعيلية', fee: 70 },
{ name: 'السويس', fee: 70 },
{ name: 'مطروح', fee: 70 },
{ name: 'الفيوم', fee: 80 },
{ name: 'بني سويف', fee: 80 },
{ name: 'المنيا', fee: 80 },
{ name: 'أسيوط', fee: 80 },
{ name: 'سوهاج', fee: 80 },
{ name: 'قنا', fee: 80 },
{ name: 'الأقصر', fee: 80 },
{ name: 'أسوان', fee: 80 },
{ name: 'البحر الأحمر', fee: 80 },
{ name: 'الوادي الجديد', fee: 80 },
{ name: 'شمال سيناء', fee: 80 },
{ name: 'جنوب سيناء', fee: 80 },
]

export default function CheckoutPage() {
const { cart, totalPrice, clearCart } = useCart()
const router = useRouter()

const [formData, setFormData] = useState({
fullName: '',
phone: '',
governorate: '',
address: '',
notes: '',
transferRef: '',
})

const [shippingFee, setShippingFee] = useState(0)
const [couponCode, setCouponCode] = useState('')
const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
const [couponQuote, setCouponQuote] = useState<{
  subtotal: number
  shippingFee: number
  discountAmount: number
  total: number
  couponCode: string | null
} | null>(null)
const [couponStatus, setCouponStatus] = useState<'idle' | 'applying' | 'applied' | 'invalid' | 'removing'>('idle')
const [couponError, setCouponError] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)
const [checkoutError, setCheckoutError] = useState('')
const [orderSuccess, setOrderSuccess] = useState(false)

const [orderResult, setOrderResult] = useState<{
orderId: string
subtotal?: number
discountAmount: number
total: number
shippingFee: number
couponCode: string | null
} | null>(null)

const handleGovernorateChange = (
e: React.ChangeEvent<HTMLSelectElement>
) => {
const selectedGovName = e.target.value
const gov = EGYPT_GOVERNORATES.find(
(g) => g.name === selectedGovName
)

setFormData({
  ...formData,
  governorate: selectedGovName,
})

setShippingFee(gov ? gov.fee : 0)
setCouponQuote(null)
setAppliedCouponCode(null)
setCouponStatus('idle')
setCouponError('')

}

const handleChange = (
e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
setFormData({
...formData,
[e.target.name]: e.target.value,
})
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (isSubmitting || couponStatus === 'applying' || couponStatus === 'removing') return
  if (cart.length === 0) return

  setIsSubmitting(true)
  setCheckoutError('')
  try {
    const result = await createCheckoutOrder({
      items: cart.map(({ id, quantity }) => ({
        productId: id,
        quantity,
      })),
      ...formData,
      couponCode: appliedCouponCode ?? undefined,
    })

    if (!result.success) {
      setCheckoutError(result.error)
      return
    }

    setOrderResult({
      orderId: result.orderId,
      subtotal: result.subtotal,
      discountAmount: result.discountAmount,
      total: result.total,
      shippingFee: result.shippingFee,
      couponCode: result.couponCode,
    })
    clearCart()

    let authenticatedUserId: string | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      authenticatedUserId = user?.id ?? null
    } catch {
      // If the optional auth lookup fails, retain the existing immediate confirmation.
    }

    if (authenticatedUserId) {
      router.push(`/order/${result.orderId}`)
      return
    }

    setOrderSuccess(true)
  } catch (error) {
    console.error('Checkout submission failed:', error)
    setCheckoutError('حدث خطأ أثناء إرسال الطلب. يمكنك المحاولة مرة أخرى.')
  } finally {
    setIsSubmitting(false)
  }
}
const handleApplyCoupon = async () => {
  if (isSubmitting || couponStatus === 'applying' || couponStatus === 'removing') return

  const normalizedCode = couponCode.trim()
  if (!normalizedCode) {
    setCouponStatus('invalid')
    setCouponError('أدخل كود الخصم أولاً.')
    setCouponQuote(null)
    setAppliedCouponCode(null)
    return
  }
  if (cart.length === 0) {
    setCouponStatus('invalid')
    setCouponError('لا توجد منتجات لتطبيق الكود عليها.')
    return
  }
  if (!formData.governorate) {
    setCouponStatus('invalid')
    setCouponError('اختر المحافظة أولاً لتقييم الكود.')
    return
  }

  setCouponStatus('applying')
  setCouponError('')
  try {
    const result = await quoteCheckoutWithCoupon({
      items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
      governorate: formData.governorate,
      couponCode: normalizedCode,
    })
    if (!result.success) {
      setCouponQuote(null)
      setAppliedCouponCode(null)
      setCouponStatus('invalid')
      setCouponError(result.error)
      return
    }
    setCouponCode(result.couponCode ?? normalizedCode)
    setAppliedCouponCode(result.couponCode ?? normalizedCode)
    setCouponQuote(result)
    setCouponStatus('applied')
    setCouponError('')
  } catch {
    setCouponQuote(null)
    setAppliedCouponCode(null)
    setCouponStatus('invalid')
    setCouponError('تعذر تطبيق كود الخصم حاليًا.')
  }
}

const handleRemoveCoupon = async () => {
  if (isSubmitting || couponStatus === 'applying' || couponStatus === 'removing') return
  if (!formData.governorate || cart.length === 0) {
    setCouponCode('')
    setAppliedCouponCode(null)
    setCouponQuote(null)
    setCouponStatus('idle')
    setCouponError('')
    return
  }

  setCouponStatus('removing')
  setCouponError('')
  try {
    const result = await quoteCheckoutWithCoupon({
      items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
      governorate: formData.governorate,
      couponCode: undefined,
    })
    if (!result.success) {
      setCouponQuote(null)
      setCouponStatus('invalid')
      setCouponError('تعذر إزالة كود الخصم حاليًا.')
      return
    }
    setCouponCode('')
    setAppliedCouponCode(null)
    setCouponQuote(result)
    setCouponStatus('idle')
    setCouponError('')
  } catch {
    setCouponCode('')
    setAppliedCouponCode(null)
    setCouponQuote(null)
    setCouponStatus('invalid')
    setCouponError('تعذر إزالة كود الخصم حاليًا.')
  }
}

const handleCouponInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setCouponCode(e.target.value)
  if (couponStatus === 'applied') {
    setAppliedCouponCode(null)
    setCouponQuote(null)
    setCouponStatus('idle')
  }
  setCouponError('')
}

const displayedSubtotal = couponQuote?.subtotal ?? totalPrice
const displayedShippingFee = couponQuote?.shippingFee ?? shippingFee
const displayedDiscount = couponQuote?.discountAmount ?? 0
const displayedTotal = couponQuote?.total ?? totalPrice + shippingFee
const couponBusy = couponStatus === 'applying' || couponStatus === 'removing'


if (cart.length === 0 && !orderSuccess) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-gray-900" dir="rtl">
      <h1 className="text-3xl font-extrabold mb-4">السلة فارغة</h1>
      <p className="text-gray-600 mb-6">أضف منتجات إلى السلة قبل إتمام الطلب.</p>
      <Link href="/" className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">العودة للتسوق</Link>
    </div>
  )
}

if (orderSuccess && orderResult) {
return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-gray-900" dir="rtl" >
<div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center">
<div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold shadow-inner">
✓
</div>

      <h1 className="text-2xl font-extrabold mb-2 text-slate-900">
        تم تسجيل طلبك بنجاح!
      </h1>

      <p className="text-gray-600 text-sm mb-6 leading-relaxed">
        شكراً لك يا{' '}
        <span className="font-bold text-slate-900">
          {formData.fullName}
        </span>
        . تم حفظ طلبك ومراجعة رقم التحويل، وسنقوم بالتواصل معك قريباً لشحن المنتجات.
      </p>

      <div className="bg-gray-50 p-4 rounded-2xl mb-6 text-right text-xs text-gray-600 space-y-2">
        <p>
          <span className="font-bold">رقم الطلب:</span>{' '}
          {orderResult.orderId}
        </p>

        <p>
          <span className="font-bold">رقم الهاتف:</span>{' '}
          {formData.phone}
        </p>

        <p>
          <span className="font-bold">العنوان:</span>{' '}
          {formData.governorate}، {formData.address}
        </p>

        <p>
          <span className="font-bold">رسوم الشحن:</span>{' '}
          {orderResult.shippingFee} ج.م
        </p>

        <p>
          <span className="font-bold">الإجمالي الكلي:</span>{' '}
          {orderResult.total} ج.م
        </p>
      </div>

            <a
        href={`https://wa.me/201153079807?text=${encodeURIComponent(`طلب تحويل — Metallia
رقم الطلب: ${orderResult.orderId}
الاسم: ${formData.fullName}
الهاتف: ${formData.phone}
المحافظة: ${formData.governorate}
العنوان: ${formData.address}
رسوم الشحن: ${orderResult.shippingFee} ج.م
الإجمالي الكلي: ${orderResult.total} ج.م

سأرسل إسكرين التحويل في هذه المحادثة.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 block w-full rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700"
      >
        إرسال إسكرين التحويل عبر الواتساب
      </a>
      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center font-bold text-amber-900">
        الشحن خلال 5 أيام
      </p>
      <button
        onClick={() => {
          router.push('/my-orders')
          router.refresh()
        }}
        className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-lg block text-center cursor-pointer mb-3"
      >
        متابعة طلباتي
      </button>

      <Link
        href="/"
        className="w-full bg-gray-100 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors block text-center"
      >
        العودة للرئيسية
      </Link>
    </div>
  </div>
)

}

return (
<div className="min-h-screen bg-gray-50 py-12 px-4 text-gray-900" dir="rtl" >
<div className="max-w-4xl mx-auto">
<h1 className="text-3xl font-extrabold mb-8">
إتمام الطلب والشحن
</h1>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {checkoutError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"
        >
          <p>{checkoutError}</p>
          <p className="mt-1 font-medium">يمكنك المحاولة مرة أخرى.</p>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4"
      >
        <h2 className="text-xl font-bold mb-2">
          بيانات العميل والشحن
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الاسم الكامل
          </label>

          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم الهاتف (للتواصل)
          </label>

          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="01xxxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            المحافظة
          </label>

          <select
            name="governorate"
            required
            value={formData.governorate}
            onChange={handleGovernorateChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">اختر المحافظة...</option>

            {EGYPT_GOVERNORATES.map((gov) => (
              <option key={gov.name} value={gov.name}>
                {gov.name} (
                {gov.fee === 60
                  ? 'القاهرة والجيزة'
                  : gov.fee === 70
                    ? 'بحري'
                    : 'قبلي'}{' '}
                - {gov.fee} ج.م)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            العنوان التفصيلي
          </label>

          <textarea
            name="address"
            required
            rows={2}
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="المدينة، الشارع، رقم الشقة..."
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
          <p className="font-bold text-amber-900 mb-1">
            ⚠️ تنبيه هام لتأكيد الطلب:
          </p>

          <p className="text-amber-800 mb-2">
            برجاء تحويل رسوم الشحن (
            <span className="font-extrabold">
              {shippingFee > 0
                ? `${shippingFee} ج.م`
                : 'حدد المحافظة أولاً'}
            </span>
            ) مسبقاً عبر المحفظة أو إنستا باي على الرقم التالي:
          </p>

          <div className="bg-white px-3 py-2 rounded-lg font-mono font-bold text-center text-slate-900 border border-amber-300 text-lg mb-2">
            <span className="font-bold">InstaPay / حساب بنكي:</span> <span className="font-mono font-bold">01118111648</span><br /><span className="font-bold">Vodafone Cash:</span> <span className="font-mono font-bold">01038993379</span>
          </div>

          <p className="text-xs text-amber-700">
            وباقي ثمن المنتجات يتم دفعه كاش عند الاستلام.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label htmlFor="couponCode" className="block text-sm font-medium text-amber-950 mb-2">
            كود الخصم
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="couponCode"
              type="text"
              value={couponCode}
              onChange={handleCouponInputChange}
              disabled={isSubmitting || couponBusy}
              autoComplete="off"
              placeholder="أدخل كود الخصم"
              className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
            />
            {couponStatus === 'applied' || couponStatus === 'removing' ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                disabled={isSubmitting || couponBusy}
                className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponStatus === 'removing' ? 'جارٍ الإزالة...' : 'إزالة'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isSubmitting || couponBusy}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponStatus === 'applying' ? 'جارٍ التطبيق...' : 'تطبيق'}
              </button>
            )}
          </div>
          {couponStatus === 'applied' && appliedCouponCode && (
            <p role="status" className="mt-2 text-sm font-bold text-emerald-700">
              تم تطبيق الكود: {appliedCouponCode}
            </p>
          )}
          {couponError && (
            <p role="alert" className="mt-2 text-sm font-bold text-rose-700">
              {couponError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم عملية التحويل أو مرجع الدفع
          </label>

          <input
            type="text"
            name="transferRef"
            required
            value={formData.transferRef}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="أدخل رقم تحويل المحفظة أو InstaPay"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || couponBusy || shippingFee === 0}
          className="mt-2 w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-lg cursor-pointer disabled:opacity-50"
        >
          {isSubmitting
            ? 'جاري حفظ الطلب...'
            : 'تأكيد وإرسال الطلب'}
        </button>
      </form>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-xl font-bold mb-4">
          ملخص الفاتورة
        </h2>

        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto mb-4 border-b border-gray-100 pb-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-sm"
            >
              <div>
                <span className="font-semibold">
                  {item.title}
                </span>

                <span className="text-gray-500 text-xs block">
                  الكمية: {item.quantity}
                </span>
              </div>

              <span className="font-bold">
                {item.price * item.quantity} ج.م
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-700 mb-4 border-b border-gray-100 pb-4">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>

            <span className="font-bold">
              {displayedSubtotal} ج.م
            </span>
          </div>

          <div className="flex justify-between">
            <span>رسوم الشحن:</span>

            <span className="font-bold text-amber-600">
              {displayedShippingFee} ج.م
            </span>
          </div>
        </div>

        {couponQuote && (
          <div className="flex justify-between">
            <span>الخصم:</span>
            <span className="font-bold text-emerald-700">
              {displayedDiscount > 0 ? '-' : ''}{displayedDiscount} ج.م
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-lg font-bold">
          <span>
            الإجمالي النهائي (شامل الشحن):
          </span>

          <span className="text-amber-600 text-2xl">
            {displayedTotal} ج.م
          </span>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          * رسوم الشحن تُدفع مقدماً، وباقي الحساب عند الاستلام.
        </p>
      </div>
    </div>
  </div>
</div>

)
}
