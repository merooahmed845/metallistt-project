'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

interface ProfileDrawerProps { isOpen: boolean; onClose: () => void; user: User | null }

export default function ProfileDrawer({ isOpen, onClose, user }: ProfileDrawerProps) {
  const router = useRouter()
  const { totalItems } = useCart()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleLogout = async () => { await supabase.auth.signOut(); onClose(); router.push('/'); router.refresh() }
  if (!isOpen) return null

  return <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
    <div id="profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-drawer-title" className="fixed inset-y-0 right-0 max-w-full flex">
      <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-900 font-black text-xl">{displayName.charAt(0).toUpperCase()}</div><div><h2 id="profile-drawer-title" className="font-black text-lg leading-tight">{displayName}</h2><p className="text-xs text-slate-300 font-medium mt-0.5">{user?.email}</p></div></div>
            <button ref={closeButtonRef} onClick={onClose} aria-label="إغلاق قائمة الحساب" className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer" aria-expanded={isOpen}>✕</button>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <Link href="/cart" onClick={onClose} aria-label={`عربة التسوق، ${totalItems} منتجات`} className="flex items-center justify-between px-4 py-3.5 bg-amber-50 rounded-2xl border border-amber-200 font-bold text-slate-900 hover:bg-amber-100 transition-colors"><div className="flex items-center gap-3"><span aria-hidden="true">🛒</span><span>عربة التسوق</span></div><span className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-black">{totalItems} منتج</span></Link>
            <hr className="my-1 border-gray-100" />
            <Link href="/my-orders" onClick={onClose} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-gray-100 transition-colors"><span aria-hidden="true">📦</span><span>طلباتي</span></Link>
            <Link href="/wishlist" onClick={onClose} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-gray-100 transition-colors"><span aria-hidden="true">❤️</span><span>المفضلة</span></Link>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3.5 px-4 rounded-2xl font-bold hover:bg-red-100 transition-colors cursor-pointer"><span aria-hidden="true">🚪</span><span>تسجيل الخروج</span></button></div>
      </div>
    </div>
  </div>
}
