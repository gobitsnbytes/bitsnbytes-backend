import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Delete Google credentials for this user
        const { error: dbError } = await (supabase as any)
            .from('google_credentials')
            .delete()
            .eq('user_id', user.id)

        if (dbError) {
            console.error('Database error removing credentials:', dbError)
            return NextResponse.json(
                { error: 'Failed to disconnect Google account' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Google disconnect error:', err)
        return NextResponse.json(
            { error: 'An error occurred while disconnecting' },
            { status: 500 }
        )
    }
}
