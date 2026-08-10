'use client'

import { useState } from 'react'

export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="max-w-xl mx-auto mb-10">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          onSearch(e.target.value)
        }}
        placeholder="ابحث عن منتجك المفضلة هنا..."
        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
      />
    </div>
  )
}