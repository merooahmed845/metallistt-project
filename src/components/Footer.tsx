import Link from 'next/link'
import { STORE } from '@/config/store'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-900 text-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-lg font-extrabold text-white">{STORE.name} - {STORE.nameAr}</p>
        <p className="text-sm text-slate-400">{STORE.tagline}</p>
        <div className="flex items-center gap-3">
          {STORE.social.facebook ? (
            <a href={STORE.social.facebook} target="_blank" rel="noopener noreferrer" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
              صفحتنا على فيسبوك
            </a>
          ) : null}
          {STORE.whatsappNumber ? (
            <a href={`https://wa.me/${STORE.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
              واتساب
            </a>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} {STORE.name}. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  )
}
