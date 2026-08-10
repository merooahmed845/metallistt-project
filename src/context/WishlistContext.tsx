'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Product {
  id: string
  title: string
  price: number
  sale_price: number | null
  images: string[] | null
}

interface WishlistContextType {
  wishlist: Product[]
  toggleWishlist: (product: Product) => void
  isInWishlist: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('metallia_wishlist')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('metallia_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      if (exists) {
        return prev.filter((item) => item.id !== product.id)
      } else {
        return [...prev, product]
      }
    })
  }

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId)
  }

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}