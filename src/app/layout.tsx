import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import Navbar from '@/components/Navbar'
import { WishlistProvider } from '@/context/WishlistContext'

const cairo = Cairo({ subsets: ['arabic'], weight: ['300', '400', '600', '700', '900'] })

export const metadata: Metadata = {
  title: 'Metallitt - متجر الإكسسوارات العصري',
  description: 'وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className={`${cairo.className} antialiased bg-gray-50 text-gray-900`}>
    <CartProvider><WishlistProvider><Navbar />{children}</WishlistProvider></CartProvider>
  </body></html>
}
