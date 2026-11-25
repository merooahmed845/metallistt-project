import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Keep-alive endpoint: a tiny real query to Supabase so the Free project
// counts as active and is not paused after 7 days of inactivity.
// Called daily by Vercel Cron (see vercel.json).
export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').select('id').limit(1)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, time: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
