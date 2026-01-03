import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        'Supabase environment variables are missing. Please check .env.local'
      )
    }
    // Return a dummy client or throw in production depending on preference.
    // Throwing is safer to catch config issues early, but might break static build if called.
    // Given the user feedback, throwing a clear error is good.
    throw new Error(
      'Supabase environment variables are missing. Check your Vercel project settings.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
