'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import ProfileDrawer from './ProfileDrawer'
import { useCart } from '@/context/CartContext'

export default function Navbar() {
  const { totalItems } = useCart()
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const updateUser = async (nextUser: User | null) => {
      if (!isMounted) return
      setUser(nextUser)
      if (!nextUser) { setIsAdmin(false); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', nextUser.id).maybeSingle()
      if (isMounted) setIsAdmin(data?.role === 'admin')
    }
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      await updateUser(user)
    }
    void checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void updateUser(session?.user ?? null)
    })
    return () => { isMounted = false; subscription.unsubscribe() }
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-2.5 sm:px-6 py-3 flex items-center justify-between gap-1.5 shadow-xs w-full overflow-hidden" dir="rtl">
        
        {/* Brand & Admin Link */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 font-black text-sm sm:text-xl text-slate-900 whitespace-nowrap">
            <Image src="/logo.png" alt="Metallia" width={60} height={60} className="h-7 w-auto sm:h-9" />
            <span>Metallia - ميتاليا</span>
          </Link>

          {isAdmin && (
            <Link 
              href="/admin" 
              className="flex items-center gap-1 bg-amber-50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-amber-200 text-[11px] sm:text-sm font-bold text-amber-800 hover:bg-amber-100 transition-colors shrink-0"
            >
              <span aria-hidden="true">⚙️</span>
              <span className="hidden sm:inline">إدارة الموقع</span>
              <span className="sm:hidden">الإدارة</span>
            </Link>
          )}
        </div>

        {/* Actions & Navigation */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Cart Button */}
          <Link 
            href="/cart" 
            aria-label={`السلة، ${totalItems} منتجات`} 
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 sm:px-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <span aria-hidden="true" className="text-sm sm:text-base">🛒</span>
            <span className="hidden md:inline">السلة</span>
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[11px] sm:text-xs font-extrabold text-white">{totalItems}</span>
          </Link>
          
          {/* User Auth / Account */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 hidden md:inline max-w-[100px] truncate">{displayName}</span>
              <button 
                onClick={() => setIsDrawerOpen(true)} 
                aria-expanded={isDrawerOpen} 
                aria-controls="profile-drawer" 
                aria-label="فتح قائمة الحساب" 
                className="bg-slate-900 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>حسابي</span>
                <span className="text-[10px] sm:text-xs" aria-hidden="true">☰</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/login" className="text-[11px] sm:text-sm font-bold text-slate-700 px-1.5 sm:px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap">
                دخول
              </Link>
              <Link href="/register" className="text-[11px] sm:text-sm font-bold bg-slate-900 text-white px-2 sm:px-3.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs whitespace-nowrap">
                حساب جديد
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} isAdmin={isAdmin} />
    </>
  )
}