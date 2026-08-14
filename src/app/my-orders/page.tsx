'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

interface OrderItem {
  id?: string
  product_id?: string
  title?: string
  name?: string
  price: number
  quantity: number
}

interface Order {
  id: string
  total_price: number
  status: string
  created_at: string
  items?: OrderItem[]
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  
  // إدارة حالة التقييمات
  const [activeReviewProduct, setActiveReviewProduct] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchUserOrders = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        if (isMounted) setUser(user)
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('حدث خطأ أثناء جلب الطلبات:', error.message)
        } else if (data && isMounted) {
          setOrders(data)
        }
      }
      if (isMounted) setLoading(false)
    }

    fetchUserOrders()

    return () => {
      isMounted = false
    }
  }, [])

  const handleReviewSubmit = async (productId: string) => {
    if (!user) return
    setSubmitting(true)
    setSuccessMsg('')
    setReviewError('')

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مشتري مؤكد'

    const { error } = await supabase.from('reviews').insert([
      {
        product_id: productId,
        user_id: user.id,
        user_name: userName,
        rating,
        comment,
      }
    ])

    if (error) {
      if (error.code === '23503') {
        setReviewError('عذرًا، لا يمكن إضافة التقييم لأن هذا المنتج لم يعد متاحًا حاليًا.')
      } else {
        setReviewError('حدث خطأ أثناء إضافة التقييم. حاول مرة أخرى.')
      }
    } else {
      setSuccessMsg('تمت إضافة تقييمك بنجاح!')
      setReviewError('')
      setActiveReviewProduct(null)
      setComment('')
      setRating(5)
    }
    setSubmitting(false)
  }

  // التحقق مما إذا كانت حالة الطلب تم التوصيل بأي صيغة كانت
  const isOrderDelivered = (status: string) => {
    if (!status) return false
    const s = status.toLowerCase().trim()
    return s === 'delivered' || s === 'تم التوصيل' || s === 'تم التسليم'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">طلباتي والمشتريات</h1>
            {user?.email && <p className="text-sm text-slate-500 mt-1">حسابك: <span className="font-bold text-slate-700">{user.email}</span></p>}
          </div>
          <Link href="/" className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-2xs">
            العودة للمتجر
          </Link>
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-bold mb-6">
            {successMsg}
          </div>
        )}

        {loading ? (
          <p className="text-center text-slate-500 py-12 font-bold">جاري تحميل طلباتك...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-xs flex flex-col items-center gap-4">
            <p className="text-slate-600 font-bold">ليس لديك أي طلبات مسجلة حتى الآن.</p>
            <Link href="/" className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm">
              ابدأ التسوق الآن
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map((order) => {
              const delivered = isOrderDelivered(order.status)
              return (
                <div key={order.id} className="bg-white p-6 rounded-3xl shadow-xs border border-gray-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">رقم الطلب:</span>
                      <span className="font-mono text-xs text-slate-600 bg-gray-100 px-2.5 py-1 rounded-lg">{order.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                        delivered 
                          ? 'bg-green-50 text-green-800 border-green-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-2">المنتجات المطلوبة:</p>
                    <div className="flex flex-col gap-3">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => {
                          const itemTitle = item.title || item.name || 'منتج'
                          const targetProductId = item.product_id || item.id || `product-${idx}`

                          return (
                            <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                              <div className="flex justify-between items-center text-sm font-medium text-slate-800">
                                <span>{itemTitle} (الكمية: {item.quantity})</span>
                                <span className="font-bold">{item.price * item.quantity} ج.م</span>
                              </div>

                              {delivered && (
                                <div>
                                  {activeReviewProduct === targetProductId ? (
                                    <div className="mt-2 bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-3">
                                      <p className="text-xs font-bold text-slate-700">تقييم المنتج:</p>
                                      
                                      <div className="flex gap-1 cursor-pointer">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button 
                                            key={star} 
                                            type="button" 
                                            onClick={() => setRating(star)}
                                            className={`text-xl ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
                                          >
                                            ★
                                          </button>
                                        ))}
                                      </div>

                                      <textarea 
                                        placeholder="اكتب رأيك في المنتج بكل أمانة..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50 text-slate-800"
                                        rows={2}
                                      />

                                      <div className="flex gap-2 justify-end">
                                        <button 
                                          onClick={() => {
                                            setActiveReviewProduct(null)
                                            setReviewError('')
                                          }}
                                          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-gray-100 rounded-lg"
                                        >
                                          إلغاء
                                        </button>
                                        <button 
                                          disabled={submitting}
                                          onClick={() => handleReviewSubmit(targetProductId)}
                                          className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                                        >
                                          {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
                                        </button>
                                      </div>

                                      {reviewError && (
                                        <div
                                          role="alert"
                                          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium"
                                        >
                                          {reviewError}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setActiveReviewProduct(targetProductId)
                                        setReviewError('')
                                      }}
                                      className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                    >
                                      <span>★</span>
                                      <span>تقييم هذا المنتج</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-slate-500 bg-gray-50 p-3 rounded-xl">تفاصيل الطلب قيد المراجعة.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 font-black text-slate-900">
                    <span className="text-sm text-slate-500">المبلغ الإجمالي (شامل الشحن):</span>
                    <span className="text-amber-600 text-lg">{order.total_price} ج.م</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}