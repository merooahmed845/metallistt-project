'use client'

import { useCart } from '@/context/CartContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCheckoutOrder } from './actions'

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
const [isSubmitting, setIsSubmitting] = useState(false)
const [orderSuccess, setOrderSuccess] = useState(false)

const [orderResult, setOrderResult] = useState<{
orderId: string
total: number
shippingFee: number
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

if (cart.length === 0) return

setIsSubmitting(true)

try {
  const result = await createCheckoutOrder({
    items: cart.map(({ id, quantity }) => ({
      productId: id,
      quantity,
    })),
    ...formData,
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  setOrderResult({
    orderId: result.orderId,
    total: result.total,
    shippingFee: result.shippingFee,
  })

  clearCart()
  setOrderSuccess(true)
} catch (error) {
  console.error('خطأ أثناء إرسال الطلب:', error)

  const errorMessage =
    error instanceof Error
      ? error.message
      : 'برجاء المحاولة مرة أخرى'

  alert(
    `حدث خطأ أثناء إرسال الطلب: ${errorMessage}`
  )
} finally {
  setIsSubmitting(false)
}

}

const checkoutPreviewTotal = totalPrice + shippingFee

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
            01118111648
          </div>

          <p className="text-xs text-amber-700">
            وباقي ثمن المنتجات يتم دفعه كاش عند الاستلام.
          </p>
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
          disabled={isSubmitting || shippingFee === 0}
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
            <span>إجمالي المنتجات:</span>

            <span className="font-bold">
              {totalPrice} ج.م
            </span>
          </div>

          <div className="flex justify-between">
            <span>رسوم الشحن:</span>

            <span className="font-bold text-amber-600">
              {shippingFee} ج.م
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-lg font-bold">
          <span>
            الإجمالي الكلي (شامل الشحن):
          </span>

          <span className="text-amber-600 text-2xl">
            {checkoutPreviewTotal} ج.م
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
