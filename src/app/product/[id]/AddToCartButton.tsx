'use client'
import { MAX_CART_QUANTITY, useCart } from '@/context/CartContext'
interface Product { id: string; title: string; price: number; sale_price: number | null; images: string[] | null; stock_quantity?: number }
export default function AddToCartButton({ product }: { product: Product }) {
  const { cart, addToCart, decreaseQuantity } = useCart(); const quantity = cart.find((item) => item.id === product.id)?.quantity ?? 0
  const handleAdd = () => addToCart({ id: product.id, title: product.title, price: product.sale_price ?? product.price, image: product.images?.[0] || '', stock_quantity: product.stock_quantity })
  if (!quantity) return <button type="button" onClick={handleAdd} disabled={product.stock_quantity !== undefined && product.stock_quantity <= 0} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">إضافة للسلة</button>
  return <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-100 px-3 py-1.5"><button type="button" onClick={() => decreaseQuantity(product.id)} aria-label="تقليل الكمية" className="h-7 w-7 rounded-lg bg-white font-bold shadow-sm hover:bg-red-50 hover:text-red-600">−</button><span className="w-6 text-center text-sm font-extrabold">{quantity}</span><button type="button" onClick={handleAdd} disabled={quantity >= MAX_CART_QUANTITY || (product.stock_quantity !== undefined && quantity >= product.stock_quantity)} aria-label="زيادة الكمية" className="h-7 w-7 rounded-lg bg-white font-bold shadow-sm hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50">+</button></div>
}
