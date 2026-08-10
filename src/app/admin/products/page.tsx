'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import Image from 'next/image'
import AdminAuthCheck from '@/components/AdminAuthCheck'

interface Product {
  id: string
  title: string
  price: number
  sale_price: number | null
  description: string | null
  images: string[] | null
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched]  = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    sale_price: '',
    description: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      setProducts(data || [])
      setFetched(true)
    } catch (error: unknown) {
      console.error('خطأ في جلب المنتجات:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!fetched && !loading) {
    fetchProducts()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]+/g, '') + '-' + Date.now().toString().slice(-4)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let imageUrl = ''

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      const { error } = await supabase.from('products').insert([
        {
          title: formData.title,
          slug: generateSlug(formData.title),
          price: parseFloat(formData.price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          description: formData.description,
          images: imageUrl ? [imageUrl] : [],
        },
      ])

      if (error) throw error

      alert('تم إضافة المنتج بنجاح!')
      setFormData({ title: '', price: '', sale_price: '', description: '' })
      setImageFile(null)
      fetchProducts()
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('تفاصيل خطأ Supabase الكاملة:', error.message)
        alert(`خطأ: ${error.message}`)
      } else {
        console.error('خطأ غير معروف:', error)
        alert('حدث خطأ غير معروف أثناء إضافة المنتج.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error

      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (error: unknown) {
      console.error('خطأ أثناء الحذف:', error)
      alert('فشل حذف المنتج.')
    }
  }

  return (
    <AdminAuthCheck>
      <div className="min-h-screen bg-gray-100 py-10 px-4 text-gray-900" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-8">إدارة منتجات المتجر (Admin)</h1>

          <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-800">إضافة منتج جديد مع صورة من جهازك</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="مثال: ساعة يد فاخرة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأساسي (ج.م)</label>
                <input
                  type="number"
                  name="price"
                  required
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="1500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر العرض (اختياري)</label>
                <input
                  type="number"
                  name="sale_price"
                  value={formData.sale_price}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="1200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اختر صورة من جهازك</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-gray-50 file:ml-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف المنتج</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                placeholder="تفاصيل المنتج..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50 w-fit"
            >
              {isSubmitting ? 'جاري رفع الصورة والإضافة...' : 'رفع المنتج وإضافته'}
            </button>
          </form>

          <h2 className="text-xl font-bold text-slate-800 mb-4">المنتجات الحالية ({products.length})</h2>
          
          {loading ? (
            <div className="text-center py-10 font-semibold text-gray-600">جاري تحميل المنتجات...</div>
          ) : products.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-200">
              <p className="text-gray-500">لا توجد منتجات مسجلة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="relative h-40 bg-gray-100 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
                      {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
                        <Image 
                          src={product.images[0]} 
                          alt={product.title} 
                          fill 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover" 
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">بدون صورة</span>
                      )}
                    </div>
                    <h3 className="font-bold text-base mb-1 text-slate-900">{product.title}</h3>
                    <p className="text-sm font-semibold text-amber-600 mb-2">
                      {product.sale_price ? product.sale_price : product.price} ج.م
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="mt-4 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    حذف المنتج
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminAuthCheck>
  )
}