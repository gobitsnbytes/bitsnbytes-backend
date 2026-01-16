import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addMeetLinkToEvent } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { calendarEventId } = await request.json()

        if (!calendarEventId) {
            return NextResponse.json({ error: 'Calendar event ID is required' }, { status: 400 })
        }

        // Get the calendar event to check access
        const { data: calendarEvent } = await supabase
            .from('calendar_events')
            .select('event_id')
            .eq('id', calendarEventId)
            .single()

        if (!calendarEvent) {
            return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 })
        }

        // Check user has access to this event
        const { data: member } = await supabase
            .from('event_members')
            .select('role')
            .eq('event_id', calendarEvent.event_id)
            .eq('user_id', user.id)
            .single()

        if (!member || member.role === 'viewer' || member.role === 'commentator') {
            return NextResponse.json({ error: 'Access denied - requires editor or higher role' }, { status: 403 })
        }

        // Add Meet link
        const meetLink = await addMeetLinkToEvent(user.id, calendarEventId)

        if (!meetLink) {
            return NextResponse.json(
                { error: 'Failed to create Meet link. Make sure Google Calendar is connected.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            meetLink,
        })
    } catch (err) {
        console.error('Meet link creation error:', err)
        return NextResponse.json(
            { error: 'An error occurred while creating Meet link' },
            { status: 500 }
        )
    }
}
