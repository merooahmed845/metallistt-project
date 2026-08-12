'use client'
import { useWishlist } from '@/context/WishlistContext'
interface Product { id: string; title: string; price: number; sale_price: number | null; images: string[] | null }
export default function WishlistButton({ product }: { product: Product }) {
  const { toggleWishlist, isInWishlist } = useWishlist(); const active = isInWishlist(product.id)
  return <button type="button" onClick={() => toggleWishlist(product)} aria-label={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} title={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${active ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-gray-400 border border-gray-100 hover:text-red-500'}`}>{active ? '❤️' : '♡'}</button>
}
