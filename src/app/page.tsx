import type { Metadata } from 'next'
import { getCategories, getProducts } from '@/services/productService'
import { getActiveBanners } from '@/services/bannerService'
import HomepageBanner from '@/components/homepage/HomepageBanner'
import ProductDiscovery from '@/components/homepage/ProductDiscovery'
import Link from 'next/link'
import Image from 'next/image'

type Category = {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

type Product = {
  id: string
  title: string
  description: string | null
  price: number
  sale_price: number | null
  images: string[] | null
}

export const metadata: Metadata = {
  title: 'Metallia - ميتاليا | متجر الإكسسوارات العصري',
  description: 'وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.',
  robots: {
    index: true,
    follow: true,
  },
}
export default async function Home() {
  const categories: Category[] | null = await getCategories()
  const products: Product[] | null = await getProducts()

  if (!categories || !products) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h1 className="mb-3 text-2xl font-extrabold text-slate-900">حدثت مشكلة في تحميل المتجر</h1>
        <p className="mb-6 text-slate-500">نعتذر، المتجر غير متاح لحظياً. من فضلك حاول مرة أخرى بعد قليل.</p>
        <Link href="/" className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-slate-950 hover:bg-amber-400">إعادة المحاولة</Link>
      </div>
    )
  }
  let banners: Awaited<ReturnType<typeof getActiveBanners>> = []

  try {
    banners = await getActiveBanners()
  } catch (error) {
    console.error('Homepage banners unavailable; using the existing hero fallback.', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {banners.length > 0 ? (
        <HomepageBanner banner={banners[0]} />
      ) : (
        <section className="bg-slate-900 px-4 py-20 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-4xl font-extrabold md:text-6xl">
              أهلاً بك في متجر <span className="text-amber-500">Metallia - ميتاليا</span>
            </h1>
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              وجهتك الأولى لأفضل المنتجات والإكسسوارات العصرية بأعلى جودة وأفضل الأسعار.
            </p>
            <Link
              href="#products"
              className="inline-flex rounded-full bg-amber-500 px-8 py-3 text-lg font-bold text-slate-950 hover:bg-amber-600"
            >
              تصفح المنتجات الآن
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">التصنيفات الرئيسية</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.length ? (
            categories.map((category) => (
              <Link
                href={`/category/${category.slug}`}
                key={category.id}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {category.image_url ? (
                  <div className="relative h-32">
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-amber-50 text-3xl" aria-hidden="true">
                    ✦
                  </div>
                )}
                <h3 className="p-4 text-center text-lg font-semibold">{category.name}</h3>
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">لا توجد تصنيفات مضافة حالياً.</p>
          )}
        </div>
      </section>

      <ProductDiscovery products={products} />
    </div>
  )
}
