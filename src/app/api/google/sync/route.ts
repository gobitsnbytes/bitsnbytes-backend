import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { syncCalendarEvents } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { eventId } = await request.json()

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
        }

        // Check user has access to this event
        const { data: member } = await supabase
            .from('event_members')
            .select('role')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single()

        if (!member) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Perform the sync
        console.log(`Starting sync for user ${user.id}, event ${eventId}`)
        const result = await syncCalendarEvents(user.id, eventId, supabase)
        console.log('Sync result:', JSON.stringify(result, null, 2))

        return NextResponse.json({
            success: true,
            ...result,
        })
    } catch (err) {
        console.error('Google sync error:', err)
        return NextResponse.json(
            { error: 'An error occurred during sync' },
            { status: 500 }
        )
    }
}
