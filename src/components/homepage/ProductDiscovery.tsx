'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AddToCartButton from '@/app/product/[id]/AddToCartButton'
import SearchBar from '@/components/SearchBar'
import WishlistButton from '@/components/WishlistButton'

type Product = {
  id: string
  title: string
  description: string | null
  price: number
  sale_price: number | null
  images: string[] | null
}

type ProductDiscoveryProps = {
  products: Product[]
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase().trim().replace(/\s+/g, ' ')
}

export default function ProductDiscovery({ products }: ProductDiscoveryProps) {
  const [query, setQuery] = useState('')
  const [searchBarKey, setSearchBarKey] = useState(0)
  const normalizedQuery = normalizeSearchText(query)
  const filteredProducts = normalizedQuery
    ? products.filter((product) =>
        [product.title, product.description ?? ''].some((value) =>
          normalizeSearchText(value).includes(normalizedQuery),
        ),
      )
    : products

  const clearSearch = () => {
    setQuery('')
    setSearchBarKey((currentKey) => currentKey + 1)
  }

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">أحدث المنتجات</h2>
          {normalizedQuery ? (
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-slate-600" role="status" aria-live="polite">
                وجدنا {filteredProducts.length} منتجات
              </p>
              <button
                type="button"
                onClick={clearSearch}
                aria-label="مسح البحث"
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                مسح
              </button>
            </div>
          ) : null}
        </div>
        <SearchBar key={searchBarKey} onSearch={setQuery} />
      </div>

      {filteredProducts.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product, index) => {
            const image = product.images?.[0]
            const sale = product.sale_price !== null && product.sale_price !== undefined
            return (
              <article key={product.id} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <Link
                  href={`/product/${product.id}`}
                  className="relative flex aspect-[4/3] items-center justify-center bg-gray-200 text-gray-400"
                >
                  {image?.startsWith('http') ? (
                    <Image
                      src={image}
                      alt={product.title}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain"
                    />
                  ) : (
                    <span>صورة المنتج</span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="text-lg font-bold hover:text-amber-600">{product.title}</h3>
                    </Link>
                    <WishlistButton product={{ ...product, sale_price: product.sale_price }} />
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                    {product.description || 'لا يوجد وصف متاح.'}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-600">
                        {sale ? product.sale_price : product.price} ج.م
                      </span>
                      {sale ? (
                        <span className="mr-2 text-sm text-gray-400 line-through">
                          {product.price} ج.م
                        </span>
                      ) : null}
                    </div>
                    <AddToCartButton product={product} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : normalizedQuery ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-600">لا توجد منتجات تطابق بحثك.</p>
          <button
            type="button"
            onClick={clearSearch}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            مسح البحث
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-500">لا توجد منتجات مضافة حالياً.</p>
      )}
    </section>
  )
}
