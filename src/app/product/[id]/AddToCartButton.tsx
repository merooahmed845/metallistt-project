'use client'

import { useCart } from '@/context/CartContext'

interface Product {
  id: string
  title: string
  price: number
  sale_price: number | null
  images: string[] | null
}

export default function AddToCartButton({ product }: { product: Product }) {
  const { cart, addToCart, decreaseQuantity } = useCart()

  // البحث عن المنتج في السلة
  const cartItem = cart.find((item) => item.id === product.id)
  const quantity = cartItem ? cartItem.quantity : 0

  const handleAdd = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.sale_price ?? product.price,
      image: product.images?.[0] || '',
    })
  }

  const handleDecrease = () => {
    decreaseQuantity(product.id)
  }

  // لو المنتج مش في السلة، اعرض زر الإضافة
  if (quantity === 0) {
    return (
      <button
        onClick={handleAdd}
        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-sm cursor-pointer active:scale-95"
      >
        إضافة للسلة
      </button>
    )
  }

  // لو المنتج موجود، اعرض العداد الشيك (+ و -)
  return (
    <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-xl border border-gray-200">
      <button
        onClick={handleDecrease}
        className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-slate-900 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        title="تقليل الكمية"
      >
        -
      </button>

      <span className="w-6 text-center font-extrabold text-sm text-slate-900">
        {quantity}
      </span>

      <button
        onClick={handleAdd}
        className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-slate-900 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
        title="زيادة الكمية"
      >
        +
      </button>
    </div>
  )
}