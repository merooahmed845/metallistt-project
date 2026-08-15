'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/authorization'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,64}$/
const ALLOWED_DISCOUNT_TYPES = new Set(['percentage', 'fixed_amount'])
const ALLOWED_APPLIES_TO = new Set(['products', 'shipping', 'order_total'])

export type CouponActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

type ParsedCoupon = {
  code: string
  discount_type: 'percentage' | 'fixed_amount'
  applies_to: 'products' | 'shipping' | 'order_total'
  discount_value: number
  minimum_order_amount: number
  usage_limit: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function parseMoney(value: string, label: string, minimum: number): number {
  if (value === '') throw new Error(label)
  const parsed = Number(value)
  const rounded = Number(parsed.toFixed(2))
  if (!Number.isFinite(parsed) || !Number.isFinite(rounded) || parsed < minimum || rounded < minimum) {
    throw new Error(label)
  }
  return rounded
}

function parseDate(value: string, label: string): string | null {
  if (value === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error(label)
  return parsed.toISOString()
}

function parseCouponForm(formData: FormData): ParsedCoupon {
  const code = field(formData, 'code').toUpperCase()
  if (!COUPON_CODE_PATTERN.test(code)) {
    throw new Error('كود الكوبون يجب أن يكون من 3 إلى 64 حرفًا أو رقمًا.')
  }

  const discountType = field(formData, 'discountType')
  if (!ALLOWED_DISCOUNT_TYPES.has(discountType)) {
    throw new Error('نوع الخصم غير صالح.')
  }

  const appliesTo = field(formData, 'appliesTo')
  if (!ALLOWED_APPLIES_TO.has(appliesTo)) {
    throw new Error('نطاق تطبيق الخصم غير صالح.')
  }

  const discountValue = parseMoney(
    field(formData, 'discountValue'),
    'قيمة الخصم يجب أن تكون أكبر من صفر.',
    Number.EPSILON,
  )
  if (discountType === 'percentage' && discountValue > 100) {
    throw new Error('نسبة الخصم لا يمكن أن تتجاوز 100%.')
  }

  const minimumOrderAmount = parseMoney(
    field(formData, 'minimumOrderAmount'),
    'الحد الأدنى للطلب يجب أن يكون صفرًا أو أكبر.',
    0,
  )

  const usageLimitValue = field(formData, 'usageLimit')
  let usageLimit: number | null = null
  if (usageLimitValue !== '') {
    const parsedLimit = Number(usageLimitValue)
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new Error('حد الاستخدام يجب أن يكون عددًا صحيحًا أكبر من صفر.')
    }
    usageLimit = parsedLimit
  }

  const startsAt = parseDate(field(formData, 'startsAt'), 'تاريخ البداية غير صالح.')
  const endsAt = parseDate(field(formData, 'endsAt'), 'تاريخ النهاية غير صالح.')
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new Error('يجب أن يكون تاريخ النهاية بعد تاريخ البداية.')
  }

  return {
    code,
    discount_type: discountType as ParsedCoupon['discount_type'],
    applies_to: appliesTo as ParsedCoupon['applies_to'],
    discount_value: discountValue,
    minimum_order_amount: minimumOrderAmount,
    usage_limit: usageLimit,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: field(formData, 'isActive') === 'true',
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : ''
  if (message.includes('23505') || message.toLowerCase().includes('duplicate')) {
    return 'كود الكوبون مستخدم بالفعل.'
  }
  if (message.includes('23514') || message.toLowerCase().includes('check constraint')) {
    return 'بيانات الكوبون لا تطابق القيود المطلوبة.'
  }
  console.error('Coupon admin action failed:', error)
  return fallback
}

function validId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export async function createCoupon(formData: FormData): Promise<CouponActionResult> {
  const { supabase, user } = await requireAdmin()
  try {
    const parsed = parseCouponForm(formData)
    const { error } = await supabase.from('coupons').insert({
      ...parsed,
      usage_count: 0,
      created_by: user.id,
    })
    if (error) throw error
    revalidatePath('/admin/coupons')
    return { ok: true, message: 'تم إنشاء الكوبون بنجاح.' }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'تعذر إنشاء الكوبون.') }
  }
}

export async function updateCoupon(formData: FormData): Promise<CouponActionResult> {
  const { supabase } = await requireAdmin()
  const id = field(formData, 'id')
  if (!validId(id)) return { ok: false, error: 'معرّف الكوبون غير صالح.' }

  try {
    const parsed = parseCouponForm(formData)
    const { data, error } = await supabase
      .from('coupons')
      .update(parsed)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return { ok: false, error: 'الكوبون المطلوب غير موجود.' }
    revalidatePath('/admin/coupons')
    return { ok: true, message: 'تم تحديث الكوبون بنجاح.' }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'تعذر تحديث الكوبون.') }
  }
}

export async function toggleCoupon(formData: FormData): Promise<CouponActionResult> {
  const { supabase } = await requireAdmin()
  const id = field(formData, 'id')
  const activeValue = field(formData, 'isActive')
  if (!validId(id) || !['true', 'false'].includes(activeValue)) {
    return { ok: false, error: 'بيانات حالة الكوبون غير صالحة.' }
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: activeValue === 'true' })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return { ok: false, error: 'الكوبون المطلوب غير موجود.' }
    revalidatePath('/admin/coupons')
    return { ok: true, message: 'تم تحديث حالة الكوبون.' }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'تعذر تحديث حالة الكوبون.') }
  }
}

export async function softDeleteCoupon(formData: FormData): Promise<CouponActionResult> {
  const { supabase } = await requireAdmin()
  const id = field(formData, 'id')
  if (!validId(id)) return { ok: false, error: 'معرّف الكوبون غير صالح.' }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return { ok: false, error: 'الكوبون المطلوب غير موجود.' }
    revalidatePath('/admin/coupons')
    return { ok: true, message: 'تم حذف الكوبون أرشيفيًا مع الحفاظ على سجل الاستخدام.' }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'تعذر حذف الكوبون.') }
  }
}
