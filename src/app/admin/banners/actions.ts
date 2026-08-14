'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/authorization'
import { BANNER_BUCKET } from '@/services/bannerService'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BANNER_STORAGE_PATH_PATTERN = /^homepage\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(desktop|mobile)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|jpeg|png|webp)$/i

function isBannerStoragePathForBanner(path: string, bannerId: string): boolean {
  if (!UUID_PATTERN.test(bannerId)) return false
  const match = path.match(BANNER_STORAGE_PATH_PATTERN)
  return Boolean(
    match &&
      match[1].toLowerCase() === bannerId.toLowerCase() &&
      UUID_PATTERN.test(match[3]),
  )
}

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

type ParsedBanner = {
  title: string | null
  altText: string
  body: string | null
  ctaLabel: string | null
  ctaHref: string | null
  displayOrder: number
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  desktopFile: File | null
  mobileFile: File | null
  removeMobileImage: boolean
}

function value(formData: FormData, key: string): string {
  const item = formData.get(key)
  return typeof item === 'string' ? item.trim() : ''
}

function optionalValue(formData: FormData, key: string): string | null {
  const item = value(formData, key)
  return item === '' ? null : item
}

function fileValue(formData: FormData, key: string): File | null {
  const item = formData.get(key)
  return item instanceof File && item.size > 0 ? item : null
}

function parseDate(valueToParse: string, label: string): string | null {
  if (!valueToParse) return null
  const date = new Date(valueToParse)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} غير صالح.`)
  }
  return date.toISOString()
}

function validateInternalPath(href: string | null) {
  if (!href) return
  if (/[\u0000-\u001F\u007F]/.test(href) || !href.startsWith('/') || href.startsWith('//') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(href)) {
    throw new Error('رابط CTA يجب أن يكون مسارًا داخليًا يبدأ بـ /.')
  }
}

function validateImage(file: File | null, label: string) {
  if (!file) return
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`${label}: الصيغ المسموحة JPG وPNG وWebP فقط.`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${label}: الحد الأقصى لحجم الصورة 5MB.`)
  }
}

function parseBannerForm(formData: FormData, desktopRequired: boolean): ParsedBanner {
  const altText = value(formData, 'alt_text')
  if (!altText) throw new Error('النص البديل للصورة مطلوب.')

  const displayOrderValue = value(formData, 'display_order') || '0'
  const displayOrder = Number(displayOrderValue)
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    throw new Error('الترتيب يجب أن يكون رقمًا صحيحًا غير سالب.')
  }

  const startsAt = parseDate(value(formData, 'starts_at'), 'تاريخ البداية')
  const endsAt = parseDate(value(formData, 'ends_at'), 'تاريخ النهاية')
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية.')
  }

  const ctaLabel = optionalValue(formData, 'cta_label')
  const ctaHref = optionalValue(formData, 'cta_href')
  if ((ctaLabel && !ctaHref) || (!ctaLabel && ctaHref)) {
    throw new Error('يجب إدخال نص CTA ورابطه معًا.')
  }
  validateInternalPath(ctaHref)

  const desktopFile = fileValue(formData, 'desktop_image')
  const mobileFile = fileValue(formData, 'mobile_image')
  if (desktopRequired && !desktopFile) {
    throw new Error('صورة سطح المكتب مطلوبة عند إنشاء banner.')
  }
  validateImage(desktopFile, 'صورة سطح المكتب')
  validateImage(mobileFile, 'صورة الهاتف')

  return {
    title: optionalValue(formData, 'title'),
    altText,
    body: optionalValue(formData, 'body'),
    ctaLabel,
    ctaHref,
    displayOrder,
    isActive: value(formData, 'is_active') !== 'false',
    startsAt,
    endsAt,
    desktopFile,
    mobileFile,
    removeMobileImage: value(formData, 'remove_mobile_image') === 'true',
  }
}

function extensionFor(file: File): string {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

async function uploadBannerFile(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  file: File,
  bannerId: string,
  slot: 'desktop' | 'mobile',
): Promise<string> {
  const path = `homepage/${bannerId}/${slot}/${crypto.randomUUID()}.${extensionFor(file)}`
  const { error } = await supabase.storage.from(BANNER_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(`تعذر رفع ${slot === 'desktop' ? 'صورة سطح المكتب' : 'صورة الهاتف'}.`)
  return path
}

async function cleanupUploadedFiles(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  paths: string[],
  bannerId: string,
) {
  const safePaths = paths.filter((path) => isBannerStoragePathForBanner(path, bannerId))
  const rejectedPaths = paths.filter((path) => !isBannerStoragePathForBanner(path, bannerId))
  if (rejectedPaths.length > 0) {
    console.error('Refusing to remove banner paths outside the current banner prefix.', {
      bannerId,
      rejectedPaths,
    })
  }
  if (safePaths.length === 0) return
  const { error } = await supabase.storage.from(BANNER_BUCKET).remove(safePaths)
  if (error) console.error('Unable to clean up banner files:', error.message)
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'
}

function refreshBannerRoutes() {
  revalidatePath('/')
  revalidatePath('/admin/banners')
}

export async function createBanner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const uploadedPaths: string[] = []
  const bannerId = crypto.randomUUID()
  try {
    const parsed = parseBannerForm(formData, true)
    const id = bannerId
    const imagePath = await uploadBannerFile(supabase, parsed.desktopFile!, id, 'desktop')
    uploadedPaths.push(imagePath)
    const mobileImagePath = parsed.mobileFile
      ? await uploadBannerFile(supabase, parsed.mobileFile, id, 'mobile')
      : null
    if (mobileImagePath) uploadedPaths.push(mobileImagePath)

    const { error } = await supabase.from('homepage_banners').insert({
      id,
      title: parsed.title,
      alt_text: parsed.altText,
      image_path: imagePath,
      mobile_image_path: mobileImagePath,
      body: parsed.body,
      cta_label: parsed.ctaLabel,
      cta_href: parsed.ctaHref,
      display_order: parsed.displayOrder,
      is_active: parsed.isActive,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
    })
    if (error) throw new Error('تعذر حفظ الـ banner في قاعدة البيانات.')
    refreshBannerRoutes()
    return { ok: true, message: 'تم إنشاء الـ banner بنجاح.' }
  } catch (error) {
    await cleanupUploadedFiles(supabase, uploadedPaths, bannerId)
    return { ok: false, error: messageFor(error) }
  }
}

export async function updateBanner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const id = value(formData, 'id')
  const uploadedPaths: string[] = []
  try {
    if (!id) throw new Error('معرّف الـ banner مطلوب.')

    const { data: existing, error: existingError } = await supabase
      .from('homepage_banners')
      .select('id,image_path,mobile_image_path')
      .eq('id', id)
      .maybeSingle()
    if (existingError || !existing) throw new Error('الـ banner المطلوب غير موجود.')

    const parsed = parseBannerForm(formData, false)
    const imagePath = parsed.desktopFile
      ? await uploadBannerFile(supabase, parsed.desktopFile, id, 'desktop')
      : existing.image_path
    if (parsed.desktopFile) uploadedPaths.push(imagePath)

    let mobileImagePath = existing.mobile_image_path
    if (parsed.mobileFile) {
      mobileImagePath = await uploadBannerFile(supabase, parsed.mobileFile, id, 'mobile')
      uploadedPaths.push(mobileImagePath)
    } else if (parsed.removeMobileImage) {
      mobileImagePath = null
    }

    const { error } = await supabase
      .from('homepage_banners')
      .update({
        title: parsed.title,
        alt_text: parsed.altText,
        image_path: imagePath,
        mobile_image_path: mobileImagePath,
        body: parsed.body,
        cta_label: parsed.ctaLabel,
        cta_href: parsed.ctaHref,
        display_order: parsed.displayOrder,
        is_active: parsed.isActive,
        starts_at: parsed.startsAt,
        ends_at: parsed.endsAt,
      })
      .eq('id', id)
    if (error) throw new Error('تعذر تحديث الـ banner في قاعدة البيانات.')

    const oldPaths = [existing.image_path, existing.mobile_image_path].filter(
      (path): path is string => Boolean(path),
    )
    const newPaths = [imagePath, mobileImagePath].filter(
      (path): path is string => Boolean(path),
    )
    await cleanupUploadedFiles(
      supabase,
      oldPaths.filter((path) => !newPaths.includes(path)),
      id,
    )
    refreshBannerRoutes()
    return { ok: true, message: 'تم تحديث الـ banner بنجاح.' }
  } catch (error) {
    await cleanupUploadedFiles(supabase, uploadedPaths, id)
    return { ok: false, error: messageFor(error) }
  }
}

export async function toggleBanner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  try {
    const id = value(formData, 'id')
    if (!id) throw new Error('معرّف الـ banner مطلوب.')
    const isActive = value(formData, 'is_active') === 'true'
    const { data, error } = await supabase
      .from('homepage_banners')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) throw new Error('تعذر تغيير حالة الـ banner.')
    if (!data) throw new Error('الـ banner المطلوب غير موجود.')
    refreshBannerRoutes()
    return { ok: true, message: isActive ? 'تم تفعيل الـ banner.' : 'تم إيقاف الـ banner.' }
  } catch (error) {
    return { ok: false, error: messageFor(error) }
  }
}

export async function deleteBanner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  try {
    const id = value(formData, 'id')
    if (!id) throw new Error('معرّف الـ banner مطلوب.')
    const { data: existing, error: existingError } = await supabase
      .from('homepage_banners')
      .select('image_path,mobile_image_path')
      .eq('id', id)
      .maybeSingle()
    if (existingError || !existing) throw new Error('الـ banner المطلوب غير موجود.')
    const { error } = await supabase.from('homepage_banners').delete().eq('id', id)
    if (error) throw new Error('تعذر حذف الـ banner.')
    await cleanupUploadedFiles(
      supabase,
      [existing.image_path, existing.mobile_image_path].filter(
        (path): path is string => Boolean(path),
      ),
      id,
    )
    refreshBannerRoutes()
    return { ok: true, message: 'تم حذف الـ banner.' }
  } catch (error) {
    return { ok: false, error: messageFor(error) }
  }
}

export async function reorderBanner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const id = value(formData, 'id')
  const direction = value(formData, 'direction')

  if (!UUID_PATTERN.test(id)) {
    return { ok: false, error: 'معرّف البانر غير صالح.' }
  }
  if (direction !== 'up' && direction !== 'down') {
    return { ok: false, error: 'طلب ترتيب البانر غير صالح.' }
  }

  try {
    const { error } = await supabase.rpc('reorder_homepage_banner', {
      p_banner_id: id,
      p_direction: direction,
    })

    if (error) {
      console.error('Banner reorder RPC failed:', error)
      if (error.message.includes('BANNER_NOT_FOUND')) {
        return { ok: false, error: 'البانر المطلوب غير موجود.' }
      }
      if (error.message.includes('NO_NEIGHBOR')) {
        return { ok: false, error: 'لا يوجد عنصر مجاور للتحريك.' }
      }
      return { ok: false, error: 'تعذر إعادة ترتيب البانر.' }
    }

    refreshBannerRoutes()
    return { ok: true, message: 'تم تحريك البانر.' }
  } catch (error) {
    console.error('Unexpected banner reorder failure:', error)
    return { ok: false, error: 'تعذر إعادة ترتيب البانر.' }
  }
}