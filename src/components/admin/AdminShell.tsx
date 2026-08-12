'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'

interface AdminShellProps {
  children: React.ReactNode
}

const mobileNavigationItems = [
  {
    label: 'لوحة التحكم',
    href: '/admin',
  },
  {
    label: 'المنتجات',
    href: '/admin/products',
  },
  {
    label: 'الطلبات',
    href: '/admin/orders',
  },
  {
    label: 'التصنيفات',
    href: '/admin/categories',
  },
]

export default function AdminShell({ children }: AdminShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />

          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح قائمة الإدارة"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ☰
              </span>

              <span>القائمة</span>
            </button>
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق قائمة الإدارة"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside
            aria-label="قائمة الإدارة على الهاتف"
            className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div>
                <p className="text-lg font-extrabold text-slate-900">
                  Metallistt
                </p>

                <p className="mt-1 text-xs font-medium text-amber-600">
                  لوحة الإدارة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="إغلاق القائمة"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <nav
              aria-label="التنقل في لوحة الإدارة"
              className="flex-1 space-y-1 p-4"
            >
              {mobileNavigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-slate-200 p-4">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                العودة إلى المتجر
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
