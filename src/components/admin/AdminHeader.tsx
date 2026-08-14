'use client'

import Link from 'next/link'

export default function AdminHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            لوحة التحكم
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            إدارة متجر Metallia - ميتاليا
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 lg:inline-flex"
          >
            العودة إلى المتجر
          </Link>
        </div>
      </div>
    </header>
  )
}