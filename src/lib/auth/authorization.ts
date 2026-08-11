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

  console.log('[AUTH DEBUG] user.id:', user.id)

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  console.log('[AUTH DEBUG] profile data:', data)
  console.log('[AUTH DEBUG] profile error:', error)

  const role: ProfileRole | null =
    data?.role === 'admin' || data?.role === 'customer'
      ? data.role
      : null

  console.log('[AUTH DEBUG] normalized role:', role)

  if (error || role !== 'admin') {
    console.log('[AUTH DEBUG] DENIED → redirect /')
    redirect('/')
  }

  console.log('[AUTH DEBUG] ADMIN ACCESS GRANTED')

  return { supabase, user, role }
}