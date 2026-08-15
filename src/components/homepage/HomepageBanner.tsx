import Image from 'next/image'
import Link from 'next/link'
import type { BannerView } from '@/services/bannerService'

type HomepageBannerProps = {
  banner: BannerView
}

export default function HomepageBanner({ banner }: HomepageBannerProps) {
  const desktopClass = banner.mobile_image_url ? 'hidden sm:block' : 'block'

  return (
    <section
      aria-label={banner.title ?? 'عرض ترويجي'}
      className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6"
    >
      <div className="relative isolate aspect-[16/10] sm:aspect-[16/6] min-h-[160px] sm:min-h-[260px] overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 shadow-xl">
        {banner.mobile_image_url ? (
          <Image
            src={banner.mobile_image_url}
            alt={banner.alt_text}
            fill
            sizes="100vw"
            className="object-cover sm:hidden"
          />
        ) : null}
        <Image
          src={banner.image_url}
          alt={banner.alt_text}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
          className={`${desktopClass} object-cover`}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-slate-950/80 via-slate-950/35 to-transparent" />
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center p-4 sm:p-10 lg:p-14 text-white">
          {banner.title ? (
            <h1 className="text-lg font-extrabold leading-tight sm:text-4xl lg:text-5xl drop-shadow-md">
              {banner.title}
            </h1>
          ) : null}
          {banner.body ? (
            <p className="mt-1.5 sm:mt-4 max-w-lg text-xs sm:text-base leading-snug sm:leading-7 text-slate-100 line-clamp-2">
              {banner.body}
            </p>
          ) : null}
          {banner.cta_label && banner.cta_href ? (
            <Link
              href={banner.cta_href}
              className="mt-3 sm:mt-6 inline-flex min-h-8 sm:min-h-11 w-fit items-center justify-center rounded-full bg-amber-500 px-4 py-1.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md"
            >
              {banner.cta_label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}