'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminAuthCheck({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const ALLOWED_ADMIN_UIDS = [
        '268e585e-8c9d-4ff4-bbbd-57039020b0f6',
        '36db1ac6-7a44-42f0-aea2-eba29625fd7c'
      ]

      if (!user || !ALLOWED_ADMIN_UIDS.includes(user.id)) {
        alert('غير مسموح لك بالدخول، هذه الصفحة للمدير فقط.')
        router.push('/')
      } else {
        setAuthorized(true)
      }
    }

    verifyAdmin()
  }, [router])

  if (!authorized) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">جاري التحقق من صلاحيات المدير...</div>
  }

  return <>{children}</>
}