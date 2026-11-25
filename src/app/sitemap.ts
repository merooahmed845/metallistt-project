import type { MetadataRoute } from 'next'
import { getCategories, getProducts } from '@/services/productService'
import { getGeneratedSiteUrl } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getGeneratedSiteUrl()
  if (!siteUrl) return []

  const [categoriesRaw, productsRaw] = await Promise.all([
    getCategories(),
    getProducts(),
  ])
  const categories = categoriesRaw ?? []
  const products = productsRaw ?? []

  return [
    { url: new URL('/', siteUrl).toString(), changeFrequency: 'weekly', priority: 1 },
    ...categories
      .filter((category) => typeof category.slug === 'string' && category.slug.length > 0)
      .map((category) => ({
        url: new URL(`/category/${encodeURIComponent(category.slug)}`, siteUrl).toString(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ...products
      .filter((product) => typeof product.id === 'string' && product.id.length > 0)
      .map((product) => ({
        url: new URL(`/product/${encodeURIComponent(product.id)}`, siteUrl).toString(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
  ]
}
