import { createClient } from '@/utils/supabase/server'

// Returns null on error so callers can show a real error state
// instead of an empty store when the database is unreachable.
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('*')
  if (error) {
    console.error('Error fetching categories:', error.message)
    return null
  }
  return data
}

export async function getProducts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('*, categories(name)')
  if (error) {
    console.error('Error fetching products:', error.message)
    return null
  }
  return data
}
