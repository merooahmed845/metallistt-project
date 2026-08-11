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
}

type CheckoutResult =
  | { success: true; orderId: string; total: number; shippingFee: number }
  | { success: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_QUANTITY = 1000

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
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

  const supabase = await createClient()
  const orderId = crypto.randomUUID()
  const { data, error } = await supabase.rpc('create_checkout_order', {
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
  })

  if (error || !data?.[0]) {
    switch (error?.message) {
      case 'INVALID_PRODUCT':
        return { success: false, error: 'يوجد منتج غير صالح في الطلب.' }
      case 'PRODUCT_UNAVAILABLE':
        return { success: false, error: 'أحد المنتجات لم يعد متاحاً.' }
      case 'INVALID_QUANTITY':
        return { success: false, error: 'توجد كمية غير صالحة في الطلب.' }
      case 'INVALID_GOVERNORATE':
        return { success: false, error: 'المحافظة المختارة غير صالحة.' }
      default:
        console.error('Checkout order creation failed:', error)
        return { success: false, error: 'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.' }
    }
  }

  return {
    success: true,
    orderId: data[0].order_id,
    total: Number(data[0].total),
    shippingFee: Number(data[0].shipping_fee),
  }
}
