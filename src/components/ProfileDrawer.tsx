'use client'

import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

export default function ProfileDrawer({ isOpen, onClose, user }: ProfileDrawerProps) {
  const router = useRouter()
  const { cart } = useCart()

  // حساب إجمالي عدد المنتجات في السلة
  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
    router.push('/')
    router.refresh()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* خلفية معتمة */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* الجزء العلوي: بيانات الحساب */}
          <div>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-900 font-black text-xl shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-black text-lg leading-tight">{displayName}</h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* خيارات القائمة الجانبية */}
            <div className="p-4 flex flex-col gap-2">
              {/* خيار السلة في رأس الخيارات */}
              <Link 
                href="/cart"
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 bg-amber-50 rounded-2xl border border-amber-200 font-bold text-slate-900 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛒</span>
                  <span>عربة التسوق</span>
                </div>
                <span className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-black">
                  {totalItemsInCart} منتج
                </span>
              </Link>

              <hr className="my-1 border-gray-100" />

              <Link 
                href="/my-orders" 
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-gray-100 hover:text-slate-900 transition-colors"
              >
                <span>📦</span>
                <span>طلباتي</span>
              </Link>

              <Link 
                href="/track-order" 
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-gray-100 hover:text-slate-900 transition-colors"
              >
                <span>🚚</span>
                <span>تتبع الشحنة</span>
              </Link>

              <Link 
                href="/wishlist" 
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-gray-100 hover:text-slate-900 transition-colors"
              >
                <span>❤️</span>
                <span>المفضلة</span>
              </Link>
            </div>
          </div>

          {/* الجزء السفلي: تسجيل الخروج */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3.5 px-4 rounded-2xl font-bold hover:bg-red-100 transition-colors cursor-pointer"
            >
              <span>🚪</span>
              <span>تسجيل خروج</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
