import { createBrowserClient } from '@supabase/ssr'
import { AUTH_COOKIE_OPTIONS } from './cookie-options'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // SameSite=None;Secure so the auth cookie survives a cross-origin iframe embed.
    { cookieOptions: AUTH_COOKIE_OPTIONS }
  )
}
