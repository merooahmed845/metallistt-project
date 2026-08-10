'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // 1. التحقق من طول كلمة المرور
    if (password.length < 8) {
      setErrorMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    // 2. التحقق المباشر من تطابق كلمتي المرور
    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة الكتابة')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      setMessage('تم إرسال رابط التفعيل إلى بريدك الإلكتروني. يرجى التحقق لتفعيل حسابك.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <form onSubmit={handleSignUp} className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">إنشاء حساب جديد</h1>
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {message ? (
          <div className="flex flex-col gap-4">
            <p className="text-green-700 text-sm font-bold bg-green-50 p-4 rounded-xl leading-relaxed border border-green-200">{message}</p>
            <button 
              type="button" 
              onClick={() => router.push('/login')}
              className="bg-slate-900 text-white p-3.5 rounded-xl font-bold cursor-pointer hover:bg-slate-800 text-center shadow-sm"
            >
              الذهاب لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">الاسم بالكامل</label>
              <input 
                type="text" 
                placeholder="مروان أحمد" 
                className="w-full border border-gray-300 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">البريد الإلكتروني</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                className="w-full border border-gray-300 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs" 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">كلمة المرور</label>
              <input 
                type="password" 
                placeholder="8 أحرف على الأقل" 
                className={`w-full border p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs ${
                  confirmPassword && password !== confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">تأكيد كلمة المرور</label>
              <input 
                type="password" 
                placeholder="أعد كتابة كلمة المرور" 
                className={`w-full border p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white font-medium placeholder:text-gray-400 text-sm shadow-xs ${
                  confirmPassword && password !== confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs font-bold text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)} 
              className="bg-slate-900 text-white p-3.5 rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50 text-base shadow-sm"
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
            </button>

            <p className="text-center text-sm font-semibold text-slate-600 mt-2">
              لديك حساب بالفعل؟ <Link href="/login" className="text-amber-600 font-bold hover:underline">سجل دخولك</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}