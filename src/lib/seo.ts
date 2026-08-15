export function getConfiguredSiteUrl(): URL | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) return null
  try {
    return new URL(configured)
  } catch {
    return null
  }
}

export function getGeneratedSiteUrl(): URL | null {
  const configured = getConfiguredSiteUrl()
  if (configured) return configured
  if (process.env.NODE_ENV !== 'production') return new URL('http://localhost:3000')
  return null
}

export function getAbsoluteSiteUrl(pathname: string): string | undefined {
  const base = getConfiguredSiteUrl()
  return base ? new URL(pathname, base).toString() : undefined
}
