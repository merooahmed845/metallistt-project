'use client'

import Image from 'next/image'
import { useState } from 'react'

type ProductImageCarouselProps = {
  images: string[] | null
  title: string
}

export default function ProductImageCarousel({
  images,
  title,
}: ProductImageCarouselProps) {
  const validImages =
    images?.filter(
      (image): image is string =>
        typeof image === 'string' && image.startsWith('http'),
    ) ?? []

  const [currentIndex, setCurrentIndex] = useState(0)

  const safeCurrentIndex = Math.min(
    currentIndex,
    Math.max(validImages.length - 1, 0),
  )

  if (validImages.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
        <span className="text-gray-400">لا توجد صورة للمنتج</span>
      </div>
    )
  }

  const currentImage = validImages[safeCurrentIndex]

  const goPrevious = () => {
    setCurrentIndex((index) =>
      index === 0 ? validImages.length - 1 : index - 1,
    )
  }

  const goNext = () => {
    setCurrentIndex((index) =>
      index === validImages.length - 1 ? 0 : index + 1,
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
        <Image
          src={currentImage}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
        />

        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrevious}
              aria-label="السابق"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-bold text-slate-900 shadow-md transition hover:bg-white"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="التالي"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-bold text-slate-900 shadow-md transition hover:bg-white"
            >
              ›
            </button>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`${title} - صورة ${index + 1}`}
              aria-current={index === safeCurrentIndex ? 'true' : undefined}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                index === safeCurrentIndex
                  ? 'border-slate-900'
                  : 'border-gray-200'
              }`}
            >
              <Image
                src={image}
                alt={`${title} - صورة ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
