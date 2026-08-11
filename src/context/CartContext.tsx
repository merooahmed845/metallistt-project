'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface CartItem {
  id: string
  title: string
  price: number
  image?: string
  quantity: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Omit<CartItem, 'quantity'>) => void
  decreaseQuantity: (productId: string) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = 'metallia_cart'
export const MAX_CART_QUANTITY = 1000

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    typeof item.title === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (item.image === undefined || typeof item.image === 'string')
  )
}

function readCartFromStorage(value: string | null): CartItem[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const cartByProductId = new Map<string, CartItem>()
    for (const item of parsed.filter(isValidCartItem)) {
      const existingItem = cartByProductId.get(item.id)
      cartByProductId.set(item.id, {
        ...item,
        quantity: Math.min(
          MAX_CART_QUANTITY,
          (existingItem?.quantity ?? 0) + item.quantity
        ),
      })
    }

    return Array.from(cartByProductId.values())
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // قراءة الـ localStorage مباشرة في الـ useState كقيم أولية (Lazy Initialization) بدون useEffect للقرأة
  const [cart, setCart] = useState<CartItem[]>([])
  const [hasLoadedCart, setHasLoadedCart] = useState(false)

  useEffect(() => {
    setCart(readCartFromStorage(localStorage.getItem(CART_STORAGE_KEY)))
    setHasLoadedCart(true)
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        setCart(readCartFromStorage(event.newValue))
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // حفظ السلة في الـ localStorage فقط عند أي تحديث يحدث على الـ cart
  useEffect(() => {
    if (!hasLoadedCart) return
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart, hasLoadedCart])

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === product.id)
      if (existingIndex > -1) {
        if (prevCart[existingIndex].quantity >= MAX_CART_QUANTITY) return prevCart

        const newCart = [...prevCart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: Math.min(MAX_CART_QUANTITY, newCart[existingIndex].quantity + 1),
        }
        return newCart
      } else {
        return [...prevCart, { ...product, quantity: 1 }]
      }
    })
  }

  const decreaseQuantity = (productId: string) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === productId) {
            return { ...item, quantity: item.quantity - 1 }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
