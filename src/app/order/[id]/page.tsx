import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { STORE } from '@/config/store'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type OrderItem = {
  title?: string
  name?: string
  price?: number
  quantity?: number
}

type OrderRecord = {
  id: string
  status: string | null
  full_name: string | null
  phone: string | null
  governorate: string | null
  address: string | null
  shipping_fee: number | null
  total_price: number | null
  items: OrderItem[] | null
  created_at: string | null
}

function UnavailableOrder() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16 text-gray-900" dir="rtl">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-black">تعذر عرض الطلب</h1>
        <p className="mb-6 text-sm leading-7 text-slate-600">
          لا يمكن العثور على هذا الطلب أو لا تملك صلاحية عرضه.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/my-orders" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
            طلباتي
          </Link>
          <Link href="/" className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-gray-200">
            العودة للمتجر
          </Link>
        </div>
      </div>
    </main>
  )
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return <UnavailableOrder />

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <UnavailableOrder />

  const { data: order, error } = await supabase
    .from('orders')
    .select('id,status,full_name,phone,governorate,address,shipping_fee,total_price,items,created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<OrderRecord>()

  if (error || !order) {
    if (error) console.error('Order confirmation lookup failed:', error.message)
    return <UnavailableOrder />
  }

  const items = Array.isArray(order.items) ? order.items : []
  const whatsappText = [
    'طلب تحويل — Metallia',
    `رقم الطلب: ${order.id}`,
    `الاسم: ${order.full_name ?? ''}`,
    `الهاتف: ${order.phone ?? ''}`,
    `المحافظة: ${order.governorate ?? ''}`,
    `العنوان: ${order.address ?? ''}`,
    `رسوم الشحن: ${order.shipping_fee ?? 0} ج.م`,
    `الإجمالي الكلي: ${order.total_price ?? 0} ج.م`,
    'سأرسل إسكرين التحويل في هذه المحادثة.',
  ].join('\n')

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">✓</div>
          <h1 className="text-2xl font-black text-slate-900">تم تسجيل طلبك بنجاح!</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-900">هذه صفحة تأكيد محفوظة ويمكنك الرجوع إليها بعد تحديث الصفحة.</p>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">رقم الطلب</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-slate-700">{order.id}</p>
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">{order.status ?? 'قيد المعالجة'}</div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <p><span className="font-bold">الاسم:</span> {order.full_name ?? '—'}</p>
            <p><span className="font-bold">رقم الهاتف:</span> {order.phone ?? '—'}</p>
            <p className="sm:col-span-2"><span className="font-bold">العنوان:</span> {order.governorate ?? '—'}، {order.address ?? '—'}</p>
            <p><span className="font-bold">رسوم الشحن:</span> {order.shipping_fee ?? 0} ج.م</p>
            <p><span className="font-bold">الإجمالي الكلي:</span> {order.total_price ?? 0} ج.م</p>
          </div>

          {items.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h2 className="mb-3 text-lg font-black">المنتجات</h2>
              <div className="flex flex-col gap-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                    <span className="font-bold text-slate-800">{item.title || item.name || 'منتج'} <span className="font-normal text-slate-500">(الكمية: {item.quantity ?? 0})</span></span>
                    {typeof item.price === 'number' && <span className="shrink-0 font-bold text-slate-700">{item.price * (item.quantity ?? 0)} ج.م</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <a
            href={`https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full rounded-xl bg-green-600 px-6 py-3 text-center font-bold text-white hover:bg-green-700"
          >
            إرسال إسكرين التحويل عبر الواتساب
          </a>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/my-orders" className="flex-1 rounded-xl bg-slate-900 px-6 py-3 text-center font-bold text-white hover:bg-slate-800">متابعة طلباتي</Link>
          <Link href="/" className="flex-1 rounded-xl bg-white px-6 py-3 text-center font-bold text-slate-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">العودة للرئيسية</Link>
        </div>
      </div>
    </main>
  )
}
