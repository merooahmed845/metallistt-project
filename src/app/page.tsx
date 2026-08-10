import { getCategories, getProducts } from '@/services/productService'
import Link from 'next/link'
import Image from 'next/image'
import AddToCartButton from './product/[id]/AddToCartButton' // أو المسار الصحيح للمكون عندك
// تعريف واجهات البيانات (Interfaces) لتجنب استخدام any نهائياً
interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  price: number
  sale_price: number | null
  images: string[] | null
}

export default async function Home() {
  const categories: Category[] = await getCategories()
  const products: Product[] = await getProducts()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            أهلاً بك في متجر <span className="text-amber-500">Metallia</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8">
            وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.
          </p>
          <Link
            href="#products"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-8 py-3 rounded-full text-lg transition-all shadow-lg"
          >
            تصفح المنتجات الآن
          </Link>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-right">التصنيفات الرئيسية</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.length > 0 ? (
            categories.map((cat) => (
              <div key={cat.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
                <h3 className="font-semibold text-lg">{cat.name}</h3>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center">لا توجد تصنيفات مضافة حالياً.</p>
          )}
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-right">أحدث المنتجات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col">
  {/* صورة المنتج */}
  <Link href={`/product/${product.id}`} className="h-48 bg-gray-200 relative flex items-center justify-center text-gray-400">
    {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
<Image 
  src={product.images[0]} 
  alt={product.title} 
  fill 
  priority
  sizes="(max-width: 768px) 100vw, 33vw"
  className="object-cover" 
/>
    ) : (
      <span>صورة المنتج</span>
    )}
  </Link>

  <div className="p-4 flex flex-col flex-grow">
    {/* عنوان المنتج مع اللينك لصفحة التفاصيل */}
    <Link href={`/product/${product.id}`}>
      <h3 className="font-bold text-lg mb-2 hover:text-amber-600 transition-colors">{product.title}</h3>
    </Link>
    
    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description || 'لا يوجد وصف متاح.'}</p>
    
    <div className="mt-auto flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-amber-600 font-bold text-lg">
          {product.sale_price ? product.sale_price : product.price} ج.م
        </span>
        {product.sale_price && (
          <span className="text-gray-400 text-sm line-through">
            {product.price} ج.م
          </span>
        )}
      </div>
        <AddToCartButton product={product} />
    </div>
  </div>
</div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center">لا توجد منتجات مضافة حالياً في قاعدة البيانات.</p>
          )}
        </div>
      </section>
    </div>
  )
}