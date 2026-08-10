'use client'

import { useCart } from '@/context/CartContext'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { cart, removeFromCart, clearCart, totalPrice } = useCart()
  
  // استخدام دالة لتعيين الحالة مرة واحدة بدون استخدام useEffect نهائياً لتجنب تحذيرات الـ Linter
  const [isClient] = useState(() => true)

  if (!isClient) {
    return null
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-gray-900">
        <h1 className="text-3xl font-extrabold mb-4">عربة التسوق فارغة</h1>
        <p className="text-gray-600 mb-6">لم تقم بإضافة أي منتجات إلى عربة التسوق بعد.</p>
        <Link
          href="/"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer inline-block"
        >
          العودة للتسوق الآن
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold">عربة التسوق</h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            إفراغ السلة
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-6 border-b border-gray-100 last:border-none">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400">بدون صورة</div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-amber-600 font-semibold">{item.price} ج.م</p>
                  <p className="text-gray-500 text-sm mt-1">الكمية: {item.quantity}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <span className="font-bold text-lg">{item.price * item.quantity} ج.م</span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2 cursor-pointer"
                  title="حذف المنتج"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-gray-600 text-sm">الإجمالي الكلي:</span>
            <div className="text-3xl font-extrabold text-amber-600">{totalPrice} ج.م</div>
          </div>
          <Link
            href="/checkout"
            className="w-full md:w-auto bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg text-center cursor-pointer inline-block"
          >
            إتمام الطلب
          </Link>
        </div>
      </div>
    </div>
  )
}