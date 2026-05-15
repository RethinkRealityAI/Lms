import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  const cookieStore = await cookies()
  const institutionSlug = cookieStore.get('institution_slug')?.value ?? 'gansid'
  redirect(`/${institutionSlug}/login`)
}
