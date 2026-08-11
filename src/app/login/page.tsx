'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else if (data.user) {
      // توجيه الجميع للصفحة الرئيسية بغض النظر عن الصلاحية
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">تسجيل الدخول</h1>
        
        {/* صندوق الخطأ الأنيق بدلاً من الـ alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1.5">البريد الإلكتروني</label>
          <input 
            type="email" 
            placeholder="name@example.com" 
            className="w-full border border-gray-300 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1.5">كلمة المرور</label>
          <input 
            type="password" 
            placeholder="********" 
            className="w-full border border-gray-300 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs" 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-slate-900 text-white p-3.5 rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50 text-base shadow-sm"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>

        <p className="text-center text-sm font-semibold text-slate-600 mt-2">
          ليس لديك حساب؟ <Link href="/register" className="text-amber-600 font-bold hover:underline">أنشئ حساب جديد</Link>
        </p>
      </form>
    </div>
  )
}
