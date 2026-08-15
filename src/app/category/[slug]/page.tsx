import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { getAbsoluteSiteUrl, getConfiguredSiteUrl } from '@/lib/seo'
import AddToCartButton from '@/app/product/[id]/AddToCartButton'
import WishlistButton from '@/components/WishlistButton'

const getCategory = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle()
  return category
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) {
    return {
      title: 'التصنيف غير موجود',
      robots: { index: false, follow: false },
    }
  }
  const description = `اكتشف منتجات ${category.name} والإكسسوارات العصرية من Metallia.`
  const canonical = getConfiguredSiteUrl() ? getAbsoluteSiteUrl(`/category/${category.slug}`) : undefined
  return {
    title: `منتجات ${category.name}`,
    description,
    robots: { index: true, follow: true },
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: `منتجات ${category.name}`,
      description,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: 'summary',
      title: `منتجات ${category.name}`,
      description,
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) notFound()
  const supabase = await createClient()
  const { data: products, error } = await supabase.from('products').select('id,title,description,price,sale_price,images,category_id').eq('category_id', category.id).order('created_at', { ascending: false }); if (error) throw error
  return <main dir="rtl" className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900"><div className="mx-auto max-w-7xl"><Link href="/" className="mb-6 inline-flex text-sm font-bold text-gray-600 hover:text-slate-900">العودة للرئيسية</Link><h1 className="mb-8 text-3xl font-black">منتجات {category.name}</h1>{products.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-slate-500">لا توجد منتجات في هذا التصنيف حالياً.</div> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => { const image = product.images?.[0]; const sale = product.sale_price !== null && product.sale_price !== undefined; return <article key={product.id} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"><Link href={`/product/${product.id}`} className="relative flex aspect-[4/3] items-center justify-center bg-gray-200 text-gray-400">{image?.startsWith('http') ? <Image src={image} alt={product.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-contain" /> : <span>صورة المنتج</span>}</Link><div className="flex flex-1 flex-col p-4"><div className="mb-2 flex items-start justify-between gap-2"><Link href={`/product/${product.id}`}><h2 className="font-bold hover:text-amber-600">{product.title}</h2></Link><WishlistButton product={product} /></div><p className="mb-4 line-clamp-2 text-sm text-gray-600">{product.description || 'لا يوجد وصف متاح.'}</p><div className="mt-auto flex items-center justify-between gap-2"><div><span className="font-bold text-amber-600">{sale ? product.sale_price : product.price} ج.م</span>{sale && <span className="mr-2 text-sm text-gray-400 line-through">{product.price} ج.م</span>}</div><AddToCartButton product={product} /></div></div></article> })}</div>}</div></main>
}
