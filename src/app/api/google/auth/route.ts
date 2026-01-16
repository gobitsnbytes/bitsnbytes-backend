import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Google OAuth scopes needed for Calendar access and Meet link creation
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
]

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/google/callback`

    if (!clientId) {
        return NextResponse.json(
            { error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID.' },
            { status: 500 }
        )
    }

    // Build Google OAuth URL
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent', // Force consent to get refresh token
        state: user.id, // Pass user ID to callback for verification
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(authUrl)
}
