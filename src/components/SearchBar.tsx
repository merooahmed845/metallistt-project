'use client'

import { useState } from 'react'

export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nextQuery = event.currentTarget.value
    setSearchQuery(nextQuery)
    onSearch(nextQuery)
  }

  return (
    <div className="mx-auto mb-10 max-w-xl">
      <label htmlFor="product-search" className="sr-only">
        البحث عن منتج
      </label>
      <input
        id="product-search"
        type="search"
        value={searchQuery}
        onInput={handleInput}
        placeholder="ابحث عن منتج..."
        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  )
}
