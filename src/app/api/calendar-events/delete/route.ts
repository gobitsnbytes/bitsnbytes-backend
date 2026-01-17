import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { deleteGoogleCalendarEvent, getGoogleCredentials } from '@/lib/google-calendar'

export async function DELETE(request: NextRequest) {
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

        // Get the calendar event
        const { data: event, error: fetchError } = await supabase
            .from('calendar_events')
            .select('*, calendar:calendars!calendar_events_calendar_id_fkey(event_id)')
            .eq('id', calendarEventId)
            .single()

        if (fetchError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Check user has access to this event
        const { data: member } = await supabase
            .from('event_members')
            .select('role')
            .eq('event_id', event.event_id)
            .eq('user_id', user.id)
            .single()

        if (!member) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // If event has Google ID, delete from Google Calendar too
        if (event.google_event_id) {
            console.log('Deleting from Google Calendar:', event.google_event_id)
            const deleted = await deleteGoogleCalendarEvent(user.id, event.google_event_id, supabase)
            if (!deleted) {
                console.warn('Failed to delete from Google, continuing with local delete')
            }
        }

        // Delete locally
        const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', calendarEventId)

        if (deleteError) {
            console.error('Failed to delete calendar event:', deleteError)
            return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            deletedFromGoogle: !!event.google_event_id,
        })
    } catch (err) {
        console.error('Delete calendar event error:', err)
        return NextResponse.json(
            { error: 'An error occurred during deletion' },
            { status: 500 }
        )
    }
}
