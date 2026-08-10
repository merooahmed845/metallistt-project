'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'

interface OrderItem {
  id: string
  title: string
  price: number
  quantity: number
}

interface Order {
  id: string
  full_name: string
  phone: string
  governorate: string
  address: string
  notes: string | null
  transfer_ref: string
  total_price: number
  shipping_fee: number
  created_at: string
  status: string // حالة الطلب الجديدة
  order_items?: OrderItem[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          return {
            ...order,
            status: order.status || 'pending',
            order_items: itemsData || [],
          }
        })
      )

      setOrders(ordersWithItems)
      setFetched(true)
    } catch (error) {
      console.error('خطأ أثناء جلب الطلبات:', error)
    } finally {
      setLoading(false)
    }
  }

  // تحديث حالة الطلب في قاعدة البيانات
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // تحديث الحالة محلياً في الواجهة فوراً
      setOrders((prevOrders) =>
        prevOrders.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      )
    } catch (error) {
      console.error('خطأ أثناء تحديث حالة الطلب:', error)
      alert('فشل تحديث حالة الطلب.')
    }
  }

  if (!fetched && !loading) {
    fetchOrders()
  }

  // دالة لتحديد شكل ولون الـ Badge بناءً على حالة الأوردر
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">⏳ قيد المعالجة</span>
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">🚚 تم الشحن</span>
      case 'delivered':
        return <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">✓ تم التسليم</span>
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">✕ ملغي</span>
      case 'returned':
        return <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">↩ مرتجع</span>
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 text-gray-900" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">لوحة تحكم الطلبات (Admin)</h1>
          <button
            onClick={fetchOrders}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            تحديث القائمة ⟳
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 font-semibold text-gray-600">جاري تحميل الطلبات...</div>
        ) : !fetched ? (
          <div className="text-center py-20">
            <button
              onClick={fetchOrders}
              className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-amber-600 transition-colors"
            >
              عرض الطلبات الآن
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-gray-200">
            <p className="text-gray-500 text-lg">لا توجد طلبات جديدة حتى الآن.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4"
              >
                {/* رأس الطلب (الحالة، التاريخ، ورقم التحويل) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="text-sm font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-800">
                    رقم مرجع التحويل: <span className="text-amber-600 font-mono">{order.transfer_ref}</span>
                  </div>
                </div>

                {/* بيانات العميل والشحن */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                  <div>
                    <p className="mb-1"><span className="font-bold text-gray-700">اسم العميل:</span> {order.full_name}</p>
                    <p className="mb-1"><span className="font-bold text-gray-700">رقم الهاتف:</span> <a href={`tel:${order.phone}`} className="text-blue-600 underline font-mono">{order.phone}</a></p>
                    <p><span className="font-bold text-gray-700">المحافظة:</span> {order.governorate}</p>
                  </div>
                  <div>
                    <p className="mb-1"><span className="font-bold text-gray-700">العنوان التفصيلي:</span> {order.address}</p>
                    {order.notes && <p className="text-gray-600 mt-1"><span className="font-bold">ملاحظات:</span> {order.notes}</p>}
                  </div>
                </div>

                {/* قائمة المنتجات المطلوبة */}
                <div>
                  <h3 className="font-bold text-sm text-gray-700 mb-2">المنتجات المطلوبة:</h3>
                  <div className="space-y-2">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-white border border-gray-100 p-3 rounded-xl">
                        <span className="font-semibold text-slate-800">{item.title} (الكمية: {item.quantity})</span>
                        <span className="font-bold text-slate-900">{item.price * item.quantity} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* التحكم في الحالات وإجمالي الحساب */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100 mt-2 gap-4">
                  {/* أزرار تغيير الحالة المقترحة */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 ml-1">تغيير الحالة:</span>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'shipped')}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      شحن
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      تسليم
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'returned')}
                      className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      مرتجع
                    </button>
                  </div>

                  <div className="text-lg font-extrabold text-slate-900">
                    الإجمالي الكلي: <span className="text-amber-600">{order.total_price + order.shipping_fee} ج.م</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}