import { createClient } from '@/utils/supabase/server'

export const BANNER_BUCKET = 'banner-images'

export class BannerServiceError extends Error {
  constructor() {
    super('Homepage banners are unavailable')
    this.name = 'BannerServiceError'
  }
}

const BANNER_FIELDS = `
  id,
  title,
  alt_text,
  image_path,
  mobile_image_path,
  body,
  cta_label,
  cta_href,
  display_order,
  is_active,
  starts_at,
  ends_at,
  created_at,
  updated_at
`

export type BannerRecord = {
  id: string
  title: string | null
  alt_text: string
  image_path: string
  mobile_image_path: string | null
  body: string | null
  cta_label: string | null
  cta_href: string | null
  display_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export type BannerView = BannerRecord & {
  image_url: string
  mobile_image_url: string | null
}

function withPublicUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  banners: BannerRecord[],
): BannerView[] {
  return banners.map((banner) => ({
    ...banner,
    image_url: supabase.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(banner.image_path).data.publicUrl,
    mobile_image_url: banner.mobile_image_path
      ? supabase.storage
          .from(BANNER_BUCKET)
          .getPublicUrl(banner.mobile_image_path).data.publicUrl
      : null,
  }))
}

export async function getActiveBanners(): Promise<BannerView[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('homepage_banners')
    .select(BANNER_FIELDS)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching active homepage banners:', error)
    throw new BannerServiceError()
  }

  return withPublicUrls(supabase, (data ?? []) as BannerRecord[])
}

export async function getAllBanners(): Promise<BannerView[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('homepage_banners')
    .select(BANNER_FIELDS)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching homepage banners:', error)
    throw new BannerServiceError()
  }

  return withPublicUrls(supabase, (data ?? []) as BannerRecord[])
}