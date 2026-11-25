import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { WishlistProvider } from '@/context/WishlistContext'

const cairo = Cairo({ subsets: ['arabic'], weight: ['300', '400', '600', '700', '900'] })

export const metadata: Metadata = {
  title: {
    default: 'Metallia - ميتاليا | متجر الإكسسوارات العصري',
    template: '%s | Metallia - ميتاليا',
  },
  description: 'وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.',
  applicationName: 'Metallia',
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'Metallia - ميتاليا',
    title: 'Metallia - ميتاليا | متجر الإكسسوارات العصري',
    description: 'وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Metallia - ميتاليا | متجر الإكسسوارات العصري',
    description: 'وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className={`${cairo.className} antialiased bg-gray-50 text-gray-900`}>
    <CartProvider><WishlistProvider><Navbar />{children}<Footer /></WishlistProvider></CartProvider>
</body></html>
}
