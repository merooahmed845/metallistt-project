import { supabase } from '@/utils/supabase/client'
import Image from 'next/image'
import AddToCartButton from './AddToCartButton'
import Link from 'next/link'

interface ProductPageProps {
  params: Promise<{ id: string }>
}

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params

  // 1. جلب بيانات المنتج المحدد من Supabase
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  // 2. جلب التقييمات الخاصة بهذا المنتج مباشرة من السيرفر
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">عذراً، المنتج غير موجود!</h1>
        <p className="text-gray-500 mb-6">قد يكون تم إزالة هذا المنتج أو الرابط غير صحيح.</p>
        <Link href="/" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  const mainImage = product.images && product.images.length > 0 ? product.images[0] : null
  const reviewsList: Review[] = reviews || []

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 text-gray-900" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* زر العودة */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-slate-900 mb-8 transition-colors">
          ← العودة لتصفح المنتجات
        </Link>

        {/* كارت تفاصيل المنتج */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          
          {/* قسم الصور */}
          <div className="relative h-80 md:h-96 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100">
            {mainImage && mainImage.startsWith('http') ? (
              <Image
                src={mainImage}
                alt={product.title}
                fill
                priority
                className="object-cover"
              />
            ) : (
              <span className="text-gray-400 font-medium">لا توجد صورة للمنتج</span>
            )}
          </div>

          {/* قسم التفاصيل */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3">{product.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-amber-600">
                  {product.sale_price ? product.sale_price : product.price} ج.م
                </span>
                {product.sale_price && (
                  <span className="text-gray-400 text-lg line-through font-medium">
                    {product.price} ج.م
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-b border-gray-100 py-4 text-gray-600 text-sm leading-relaxed">
              <h3 className="font-bold text-slate-900 mb-1">وصف المنتج:</h3>
              <p>{product.description || 'لا يوجد وصف تفصيلي متاح لهذا المنتج حالياً.'}</p>
            </div>

            {/* زر الإضافة للسلة */}
            <div className="flex items-center gap-4 pt-2">
              <div className="w-full">
                <AddToCartButton product={product} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">🛡️ ضمان المتجر والتوصيل:</p>
              <p>• الدفع كاش عند الاستلام لباقي ثمن المنتج.</p>
              <p>• رسوم الشحن تُدفع مقدماً لتأكيد الطلب.</p>
            </div>
          </div>

        </div>

        {/* قسم التقييمات المعروض للجميع بالأسفل */}
        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="font-black text-slate-900 text-xl">
              تقييمات المشتريين <span className="text-sm font-bold text-amber-600">({reviewsList.length})</span>
            </h3>
          </div>

          {reviewsList.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6 font-medium">لا توجد تقييمات لهذا المنتج حتى الآن.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-800">{rev.user_name}</span>
                    <span className="text-amber-400 text-sm font-mono">{"★".repeat(rev.rating)}</span>
                  </div>
                  {rev.comment && <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}