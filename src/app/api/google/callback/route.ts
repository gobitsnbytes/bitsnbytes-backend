import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Get authorization code from Google callback
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User ID passed from auth route
    const error = searchParams.get('error')

    // Get the current event page URL from referer, or default to home
    const eventUrl = searchParams.get('redirect') || '/'

    if (error) {
        console.error('Google OAuth error:', error)
        return NextResponse.redirect(
            new URL(`/?google_error=${encodeURIComponent('Google authorization was denied')}`, request.url)
        )
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL('/?google_error=Invalid callback parameters', request.url)
        )
    }

    // Verify user is authenticated and matches state
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== state) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/google/callback`

    console.log('Google OAuth callback - exchanging code for tokens...')
    console.log('Redirect URI:', redirectUri)
    console.log('Client ID:', clientId?.substring(0, 20) + '...')

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(
            new URL('/?google_error=Google OAuth not configured', request.url)
        )
    }

    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        })

        const responseText = await tokenResponse.text()

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', responseText)
            return NextResponse.redirect(
                new URL(`/?google_error=${encodeURIComponent('Failed to get access token: ' + responseText)}`, request.url)
            )
        }

        const tokens = JSON.parse(responseText)
        console.log('Token exchange successful!')

        // Calculate token expiry
        const tokenExpiry = new Date()
        tokenExpiry.setSeconds(tokenExpiry.getSeconds() + tokens.expires_in)

        // Get user's primary calendar ID
        const calendarResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        )

        let calendarId = 'primary'
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json()
            calendarId = calendarData.id || 'primary'
        }

        // Upsert credentials in database
        const { error: dbError } = await (supabase as any)
            .from('google_credentials')
            .upsert({
                user_id: user.id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expiry: tokenExpiry.toISOString(),
                calendar_id: calendarId,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            })

        if (dbError) {
            console.error('Database error saving credentials:', dbError)
            return NextResponse.redirect(
                new URL('/?google_error=Failed to save credentials', request.url)
            )
        }

        console.log('Google Calendar connected successfully for user:', user.id)
        return NextResponse.redirect(
            new URL('/?google_success=Google Calendar connected!', request.url)
        )
    } catch (err) {
        console.error('Google OAuth callback error:', err)
        return NextResponse.redirect(
            new URL('/?google_error=An error occurred during authorization', request.url)
        )
    }
}
