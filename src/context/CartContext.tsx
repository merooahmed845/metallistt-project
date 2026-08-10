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

export function CartProvider({ children }: { children: React.ReactNode }) {
  // قراءة الـ localStorage مباشرة في الـ useState كقيم أولية (Lazy Initialization) بدون useEffect للقرأة
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    const savedCart = localStorage.getItem('metallia_cart')
    if (savedCart) {
      try {
        return JSON.parse(savedCart)
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e)
      }
    }
    return []
  })

  // حفظ السلة في الـ localStorage فقط عند أي تحديث يحدث على الـ cart
  useEffect(() => {
    localStorage.setItem('metallia_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === product.id)
      if (existingIndex > -1) {
        const newCart = [...prevCart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1,
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