import type { MetadataRoute } from 'next'
import { getGeneratedSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getGeneratedSiteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/cart',
        '/checkout',
        '/my-orders',
        '/login',
        '/register',
        '/order',
        '/wishlist',
      ],
    },
    ...(siteUrl ? { sitemap: new URL('/sitemap.xml', siteUrl).toString() } : {}),
  }
}
