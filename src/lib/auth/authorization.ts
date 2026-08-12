import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type ProfileRole = 'customer' | 'admin'

export async function requireUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return { supabase, user }
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role: ProfileRole | null =
    data?.role === 'admin' || data?.role === 'customer'
      ? data.role
      : null

  if (error || role !== 'admin') {
    redirect('/')
  }

  return { supabase, user, role }
}