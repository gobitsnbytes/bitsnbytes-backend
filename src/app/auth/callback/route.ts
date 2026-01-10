import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if organizer record exists by auth_user_id
      let { data: organizer } = await supabase
        .from('organizers')
        .select('id, auth_user_id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      // If not found by auth_user_id, check by email
      if (!organizer && data.user.email) {
        const { data: existingByEmail } = await supabase
          .from('organizers')
          .select('id, auth_user_id')
          .eq('email', data.user.email)
          .maybeSingle()

        if (existingByEmail) {
          // Update existing organizer to point to new auth_user_id
          const { data: updated, error: updateError } = await supabase
            .from('organizers')
            .update({ auth_user_id: data.user.id })
            .eq('id', existingByEmail.id)
            .select('id, auth_user_id')
            .maybeSingle()

          if (!updateError) {
            organizer = updated
          } else {
            console.error('Failed to link existing organizer:', updateError)
          }
        }
      }

      // Create organizer record if still not found
      if (!organizer) {
        const displayName = data.user.user_metadata?.display_name || null

        const { error: organizerError } = await supabase
          .from('organizers')
          .insert({
            auth_user_id: data.user.id,
            email: data.user.email!,
            display_name: displayName,
          })

        if (organizerError) {
          console.error('Failed to create organizer:', organizerError)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
