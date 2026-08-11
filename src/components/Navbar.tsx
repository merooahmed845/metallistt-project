'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import ProfileDrawer from './ProfileDrawer'

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const updateUser = async (nextUser: User | null) => {
      if (!isMounted) return

      setUser(nextUser)

      if (!nextUser) {
        setIsAdmin(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', nextUser.id)
        .maybeSingle()

      if (isMounted) {
        setIsAdmin(data?.role === 'admin')
      }
    }

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await updateUser(user)
    }

    void checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      void updateUser(currentUser)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-xs" dir="rtl">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-black text-xl text-slate-900">Metallitt</Link>
          
          {isAdmin && (
            <div className="flex items-center gap-4 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-xs font-bold text-amber-800">لوحة التحكم:</span>
              <Link href="/admin/products" className="text-sm font-bold text-slate-800 hover:text-amber-600 transition-colors">إضافة وإدارة المنتجات</Link>
              <Link href="/admin/orders" className="text-sm font-bold text-slate-800 hover:text-amber-600 transition-colors">لوحة تحكم الطلبات</Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800 hidden sm:inline">{displayName}</span>
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <span>حسابي</span>
                <span className="text-xs">☰</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-bold text-slate-700 px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors">دخول</Link>
              <Link href="/register" className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-2xs">حساب جديد</Link>
            </div>
          )}
        </div>
      </nav>

      {/* المكون الخاص بالقائمة الجانبية */}
      <ProfileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        user={user} 
      />
    </>
  )
}
