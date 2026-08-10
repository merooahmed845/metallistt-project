import { createClient } from '@/utils/supabase/server'

// جلب كل التصنيفات
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('*')
  
  if (error) {
    console.error('Error fetching categories:', error.message)
    return []
  }
  
  return data
}

// جلب كل المنتجات أو المنتجات المميزة
export async function getProducts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('*, categories(name)')
  
  if (error) {
    console.error('Error fetching products:', error.message)
    return []
  }
  
  return data
}