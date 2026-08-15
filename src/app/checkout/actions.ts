'use server'

import { createClient } from '@/utils/supabase/server'

type CheckoutItemInput = {
  productId: string
  quantity: number
}

type CheckoutInput = {
  items: CheckoutItemInput[]
  fullName: string
  phone: string
  governorate: string
  address: string
  notes: string
  transferRef: string
  couponCode?: string
}

export type CouponQuoteInput = {
  items: CheckoutItemInput[]
  governorate: string
  couponCode?: string
}

type CheckoutResult =
  | {
      success: true
      orderId: string
      subtotal?: number
      discountAmount: number
      total: number
      shippingFee: number
      couponCode: string | null
    }
  | { success: false; error: string }

type CouponQuoteResult =
  | {
      success: true
      subtotal: number
      shippingFee: number
      discountAmount: number
      total: number
      couponCode: string | null
      discountType: string | null
      appliesTo: string | null
    }
  | { success: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_QUANTITY = 1000
const MAX_COUPON_CODE_LENGTH = 64
const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,64}$/
const INVALID_COUPON_MESSAGE = '\u0643\u0648\u062f \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d \u0623\u0648 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u064b\u0627.'
const QUOTE_ERROR_MESSAGE = '\u062a\u0639\u0630\u0631 \u062d\u0633\u0627\u0628 \u0639\u0631\u0636 \u0627\u0644\u0643\u0648\u0628\u0648\u0646. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeCouponCode(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return undefined

  const normalized = value.trim().toUpperCase()
  if (normalized.length === 0) return null
  if (normalized.length > MAX_COUPON_CODE_LENGTH || !COUPON_CODE_PATTERN.test(normalized)) {
    return undefined
  }

  return normalized
}

function isCouponRpcError(message: unknown): boolean {
  return typeof message === 'string' && (
    message === 'COUPON_INVALID'
    || message === 'COUPON_NOT_APPLICABLE'
    || message.includes('COUPON_')
  )
}

export async function createCheckoutOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, error: 'لا توجد منتجات في الطلب.' }
  }

  if (
    !isNonEmptyString(input.fullName) ||
    !isNonEmptyString(input.phone) ||
    !isNonEmptyString(input.governorate) ||
    !isNonEmptyString(input.address) ||
    !isNonEmptyString(input.transferRef)
  ) {
    return { success: false, error: 'يرجى إدخال جميع بيانات الطلب المطلوبة.' }
  }

  if (
    input.items.some(
      (item) =>
        !UUID_PATTERN.test(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_QUANTITY
    )
  ) {
    return { success: false, error: 'يوجد منتج أو كمية غير صالحة في الطلب.' }
  }

  const normalizedCouponCode = normalizeCouponCode(input.couponCode)
  if (normalizedCouponCode === undefined) {
    return { success: false, error: INVALID_COUPON_MESSAGE }
  }

  const supabase = await createClient()
  const orderId = crypto.randomUUID()
  const commonPayload = {
    p_order_id: orderId,
    p_items: input.items.map(({ productId, quantity }) => ({
      product_id: productId,
      quantity,
    })),
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
    p_governorate: input.governorate,
    p_address: input.address.trim(),
    p_notes: input.notes.trim(),
    p_transfer_ref: input.transferRef.trim(),
  }
  const { data, error } = normalizedCouponCode
    ? await supabase.rpc('create_checkout_order_with_coupon', {
        ...commonPayload,
        p_coupon_code: normalizedCouponCode,
      })
    : await supabase.rpc('create_checkout_order', commonPayload)

  if (error || !data?.[0]) {
    if (isCouponRpcError(error?.message)) {
      return { success: false, error: INVALID_COUPON_MESSAGE }
    }

    switch (error?.message) {
      case 'INVALID_PRODUCT':
        return { success: false, error: 'يوجد منتج غير صالح في الطلب.' }
      case 'PRODUCT_UNAVAILABLE':
        return { success: false, error: 'أحد المنتجات لم يعد متاحاً.' }
      case 'INVALID_QUANTITY':
        return { success: false, error: 'توجد كمية غير صالحة في الطلب.' }
      case 'INVALID_GOVERNORATE':
        return { success: false, error: 'المحافظة المختارة غير صالحة.' }
        case 'INSUFFICIENT_STOCK':
  return {
    success: false,
    error: 'الكمية المطلوبة من أحد المنتجات غير متوفرة حالياً.',
  };

case 'DUPLICATE_PRODUCT':
  return {
    success: false,
    error: 'يوجد منتج مكرر في الطلب.',
  };
      default:
        console.error('Checkout order creation failed:', error)
        return { success: false, error: 'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.' }
    }
  }

  return {
    success: true,
    orderId: data[0].order_id,
    subtotal: normalizedCouponCode ? Number(data[0].subtotal) : undefined,
    discountAmount: normalizedCouponCode ? Number(data[0].discount_amount) : 0,
    total: Number(data[0].total),
    shippingFee: Number(data[0].shipping_fee),
    couponCode: normalizedCouponCode,
  }
}

export async function quoteCheckoutWithCoupon(
  input: CouponQuoteInput
): Promise<CouponQuoteResult> {
  if (
    !Array.isArray(input.items)
    || input.items.length === 0
    || input.items.some(
      (item) =>
        !UUID_PATTERN.test(item.productId)
        || !Number.isInteger(item.quantity)
        || item.quantity <= 0
        || item.quantity > MAX_QUANTITY
    )
    || !isNonEmptyString(input.governorate)
  ) {
    return { success: false, error: QUOTE_ERROR_MESSAGE }
  }

  const normalizedCouponCode = normalizeCouponCode(input.couponCode)
  if (normalizedCouponCode === undefined) {
    return { success: false, error: INVALID_COUPON_MESSAGE }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('quote_checkout_with_coupon', {
    p_items: input.items.map(({ productId, quantity }) => ({
      product_id: productId,
      quantity,
    })),
    p_governorate: input.governorate.trim(),
    p_coupon_code: normalizedCouponCode,
  })

  if (error || !data?.[0]) {
    if (isCouponRpcError(error?.message)) {
      return { success: false, error: INVALID_COUPON_MESSAGE }
    }
    console.error('Coupon quote failed:', error)
    return { success: false, error: QUOTE_ERROR_MESSAGE }
  }

  const quote = data[0]
  return {
    success: true,
    subtotal: Number(quote.subtotal),
    shippingFee: Number(quote.shipping_fee),
    discountAmount: Number(quote.discount_amount),
    total: Number(quote.total),
    couponCode: quote.coupon_code ?? null,
    discountType: quote.coupon_discount_type ?? null,
    appliesTo: quote.coupon_applies_to ?? null,
  }
}
