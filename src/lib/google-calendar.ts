/**
 * Google Calendar API Helper Library
 * 
 * This module provides functions for:
 * - Creating, updating, and deleting Google Calendar events
 * - Two-way sync between local calendar_events and Google Calendar
 * - Google Meet link generation
 */

import { createClient } from '@/lib/supabase/client'

// Types for Google Calendar API
export interface GoogleCalendarEvent {
    id: string
    summary: string
    description?: string
    location?: string
    start: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    end: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    conferenceData?: {
        createRequest?: {
            requestId: string
            conferenceSolutionKey: {
                type: string
            }
        }
        entryPoints?: Array<{
            entryPointType: string
            uri: string
            label?: string
        }>
    }
    updated?: string
}

export interface GoogleCredentials {
    access_token: string
    refresh_token: string
    token_expiry: string
    calendar_id: string | null
}

// Refresh access token if expired
async function refreshAccessToken(
    userId: string,
    credentials: GoogleCredentials
): Promise<string | null> {
    const expiry = new Date(credentials.token_expiry)
    const now = new Date()

    // Add 5 minute buffer before expiry
    if (now < new Date(expiry.getTime() - 5 * 60 * 1000)) {
        return credentials.access_token
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('Google OAuth credentials not configured')
        return null
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: credentials.refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        if (!response.ok) {
            console.error('Failed to refresh token:', await response.text())
            return null
        }

        const tokens = await response.json()
        const newExpiry = new Date()
        newExpiry.setSeconds(newExpiry.getSeconds() + tokens.expires_in)

        // Update token in database
        const supabase = createClient()
        await (supabase as any)
            .from('google_credentials')
            .update({
                access_token: tokens.access_token,
                token_expiry: newExpiry.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

        return tokens.access_token
    } catch (error) {
        console.error('Error refreshing token:', error)
        return null
    }
}

// Get Google credentials for a user
export async function getGoogleCredentials(userId: string, supabaseClient?: any): Promise<GoogleCredentials | null> {
    const db = supabaseClient || createClient()
    const { data, error } = await (db as any)
        .from('google_credentials')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error || !data) {
        console.log('getGoogleCredentials error:', error?.message || 'No data found')
        return null
    }

    return data as GoogleCredentials
}

// Create a Google Calendar event with optional Meet link
export async function createGoogleCalendarEvent(
    userId: string,
    event: {
        title: string
        description?: string
        location?: string
        start_time: string
        end_time: string
        is_all_day?: boolean
        add_meet_link?: boolean
    },
    supabaseClient?: any
): Promise<GoogleCalendarEvent | null> {
    const credentials = await getGoogleCredentials(userId, supabaseClient)
    if (!credentials) {
        console.error('No Google credentials found for user')
        return null
    }

    const accessToken = await refreshAccessToken(userId, credentials)
    if (!accessToken) {
        return null
    }

    const calendarId = credentials.calendar_id || 'primary'

    const startDate = new Date(event.start_time)
    const endDate = new Date(event.end_time)

    const googleEvent: Partial<GoogleCalendarEvent> = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.is_all_day
            ? { date: startDate.toISOString().split('T')[0] }
            : { dateTime: startDate.toISOString() },
        end: event.is_all_day
            ? { date: endDate.toISOString().split('T')[0] }
            : { dateTime: endDate.toISOString() },
    }

    // Add Google Meet conference data if requested
    if (event.add_meet_link) {
        googleEvent.conferenceData = {
            createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                },
            },
        }
    }

    try {
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
        if (event.add_meet_link) {
            url.searchParams.set('conferenceDataVersion', '1')
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(googleEvent),
        })

        if (!response.ok) {
            console.error('Failed to create Google event:', await response.text())
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Error creating Google Calendar event:', error)
        return null
    }
}

// Update a Google Calendar event
export async function updateGoogleCalendarEvent(
    userId: string,
    googleEventId: string,
    updates: {
        title?: string
        description?: string
        location?: string
        start_time?: string
        end_time?: string
        is_all_day?: boolean
    }
): Promise<GoogleCalendarEvent | null> {
    const credentials = await getGoogleCredentials(userId)
    if (!credentials) return null

    const accessToken = await refreshAccessToken(userId, credentials)
    if (!accessToken) return null

    const calendarId = credentials.calendar_id || 'primary'

    const patchData: Partial<GoogleCalendarEvent> = {}

    if (updates.title) patchData.summary = updates.title
    if (updates.description !== undefined) patchData.description = updates.description
    if (updates.location !== undefined) patchData.location = updates.location

    if (updates.start_time) {
        const startDate = new Date(updates.start_time)
        patchData.start = updates.is_all_day
            ? { date: startDate.toISOString().split('T')[0] }
            : { dateTime: startDate.toISOString() }
    }

    if (updates.end_time) {
        const endDate = new Date(updates.end_time)
        patchData.end = updates.is_all_day
            ? { date: endDate.toISOString().split('T')[0] }
            : { dateTime: endDate.toISOString() }
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patchData),
            }
        )

        if (!response.ok) {
            console.error('Failed to update Google event:', await response.text())
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Error updating Google Calendar event:', error)
        return null
    }
}

// Delete a Google Calendar event
export async function deleteGoogleCalendarEvent(
    userId: string,
    googleEventId: string,
    supabaseClient?: any
): Promise<boolean> {
    const credentials = await getGoogleCredentials(userId, supabaseClient)
    if (!credentials) return false

    const accessToken = await refreshAccessToken(userId, credentials)
    if (!accessToken) return false

    const calendarId = credentials.calendar_id || 'primary'

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        )

        return response.ok || response.status === 404 // 404 means already deleted
    } catch (error) {
        console.error('Error deleting Google Calendar event:', error)
        return false
    }
}

// Fetch events from Google Calendar for sync
export async function fetchGoogleCalendarEvents(
    userId: string,
    options?: {
        timeMin?: string
        timeMax?: string
        maxResults?: number
    },
    supabaseClient?: any
): Promise<GoogleCalendarEvent[]> {
    const credentials = await getGoogleCredentials(userId, supabaseClient)
    if (!credentials) return []

    const accessToken = await refreshAccessToken(userId, credentials)
    if (!accessToken) return []

    const calendarId = credentials.calendar_id || 'primary'

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')

    if (options?.timeMin) url.searchParams.set('timeMin', options.timeMin)
    if (options?.timeMax) url.searchParams.set('timeMax', options.timeMax)
    if (options?.maxResults) url.searchParams.set('maxResults', options.maxResults.toString())

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            console.error('Failed to fetch Google events:', await response.text())
            return []
        }

        const data = await response.json()
        return data.items || []
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error)
        return []
    }
}

// Extract Meet link from Google Calendar event
export function extractMeetLink(event: GoogleCalendarEvent): string | null {
    if (!event.conferenceData?.entryPoints) return null

    const videoEntry = event.conferenceData.entryPoints.find(
        (e) => e.entryPointType === 'video'
    )

    return videoEntry?.uri || null
}

// Bi-directional sync: returns summary of changes made
export interface SyncResult {
    pushedToGoogle: number
    pulledFromGoogle: number
    conflicts: number
    errors: string[]
}

export async function syncCalendarEvents(
    userId: string,
    eventId: string,
    supabase?: any  // Optional - if not provided, use client
): Promise<SyncResult> {
    const result: SyncResult = {
        pushedToGoogle: 0,
        pulledFromGoogle: 0,
        conflicts: 0,
        errors: [],
    }

    // Use provided supabase or create client
    const db = supabase || createClient()

    // Get all local calendar events for this event
    const { data: localEvents, error: localError } = await db
        .from('calendar_events')
        .select('*')
        .eq('event_id', eventId)

    console.log('Local events found:', localEvents?.length || 0, localEvents?.map((e: any) => ({ title: e.title, google_event_id: e.google_event_id })))

    if (localError) {
        result.errors.push(`Failed to fetch local events: ${localError.message}`)
        return result
    }

    // Get Google events for sync window (30 days before to 180 days after)
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 180)

    const googleEvents = await fetchGoogleCalendarEvents(userId, {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 250,
    }, db)

    console.log('Google events fetched:', googleEvents.length)

    // Create maps for comparison
    const googleEventMap = new Map<string, GoogleCalendarEvent>()
    googleEvents.forEach((e) => googleEventMap.set(e.id, e))

    // Push local events to Google that don't have a Google ID
    for (const local of localEvents || []) {
        console.log('Processing local event:', local.title, 'google_event_id:', local.google_event_id)
        if (!local.google_event_id) {
            console.log('Attempting to create event in Google Calendar...')
            const created = await createGoogleCalendarEvent(userId, {
                title: local.title,
                description: local.description ?? undefined,
                location: local.location ?? undefined,
                start_time: local.start_time,
                end_time: local.end_time,
                is_all_day: local.is_all_day,
                add_meet_link: true,  // Enable Meet links by default
            }, db)

            if (created) {
                // Update local event with Google ID
                await db
                    .from('calendar_events')
                    .update({
                        google_event_id: created.id,
                        google_meet_link: extractMeetLink(created),
                        synced_at: new Date().toISOString(),
                        google_updated_at: created.updated,
                    })
                    .eq('id', local.id)

                result.pushedToGoogle++
            } else {
                result.errors.push(`Failed to push event: ${local.title}`)
            }
        } else if (googleEventMap.has(local.google_event_id)) {
            // Event exists in both - check for conflicts using last-modified-wins
            const googleEvent = googleEventMap.get(local.google_event_id)!
            const localUpdated = new Date(local.updated_at)
            const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : new Date(0)
            const lastSynced = local.synced_at ? new Date(local.synced_at) : new Date(0)

            if (localUpdated > lastSynced && googleUpdated > lastSynced) {
                // Both updated since last sync - conflict, use last-modified-wins
                result.conflicts++
                if (googleUpdated > localUpdated) {
                    // Google wins - pull changes
                    await db
                        .from('calendar_events')
                        .update({
                            title: googleEvent.summary,
                            description: googleEvent.description || null,
                            location: googleEvent.location || null,
                            start_time: googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`,
                            end_time: googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`,
                            is_all_day: !!googleEvent.start.date,
                            google_meet_link: extractMeetLink(googleEvent),
                            synced_at: new Date().toISOString(),
                            google_updated_at: googleEvent.updated,
                        })
                        .eq('id', local.id)
                    result.pulledFromGoogle++
                } else {
                    // Local wins - push changes
                    const updated = await updateGoogleCalendarEvent(userId, local.google_event_id, {
                        title: local.title,
                        description: local.description ?? undefined,
                        location: local.location ?? undefined,
                        start_time: local.start_time,
                        end_time: local.end_time,
                        is_all_day: local.is_all_day,
                    })
                    if (updated) {
                        await db
                            .from('calendar_events')
                            .update({
                                synced_at: new Date().toISOString(),
                                google_updated_at: updated.updated,
                            })
                            .eq('id', local.id)
                        result.pushedToGoogle++
                    }
                }
            } else if (localUpdated > lastSynced) {
                // Only local updated - push to Google
                const updated = await updateGoogleCalendarEvent(userId, local.google_event_id, {
                    title: local.title,
                    description: local.description ?? undefined,
                    location: local.location ?? undefined,
                    start_time: local.start_time,
                    end_time: local.end_time,
                    is_all_day: local.is_all_day,
                })
                if (updated) {
                    await db
                        .from('calendar_events')
                        .update({
                            synced_at: new Date().toISOString(),
                            google_updated_at: updated.updated,
                        })
                        .eq('id', local.id)
                    result.pushedToGoogle++
                }
            } else if (googleUpdated > lastSynced) {
                // Only Google updated - pull from Google
                await db
                    .from('calendar_events')
                    .update({
                        title: googleEvent.summary,
                        description: googleEvent.description || null,
                        location: googleEvent.location || null,
                        start_time: googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`,
                        end_time: googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`,
                        is_all_day: !!googleEvent.start.date,
                        google_meet_link: extractMeetLink(googleEvent),
                        synced_at: new Date().toISOString(),
                        google_updated_at: googleEvent.updated,
                    })
                    .eq('id', local.id)
                result.pulledFromGoogle++
            }
        }
    }

    // ============================================
    // PULL: Create local events from Google events that don't exist locally
    // ============================================
    const localGoogleIds = new Set((localEvents || []).map((e: any) => e.google_event_id).filter(Boolean))

    for (const googleEvent of googleEvents) {
        if (!localGoogleIds.has(googleEvent.id)) {
            // This Google event doesn't exist locally - create it
            console.log('Pulling new event from Google:', googleEvent.summary)
            const { error: insertError } = await db
                .from('calendar_events')
                .insert({
                    event_id: eventId,
                    title: googleEvent.summary || 'Untitled Event',
                    description: googleEvent.description || null,
                    location: googleEvent.location || null,
                    start_time: googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`,
                    end_time: googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`,
                    is_all_day: !!googleEvent.start.date,
                    google_event_id: googleEvent.id,
                    google_meet_link: extractMeetLink(googleEvent),
                    synced_at: new Date().toISOString(),
                    google_updated_at: googleEvent.updated,
                })

            if (insertError) {
                console.error('Failed to insert Google event locally:', insertError)
                result.errors.push(`Failed to pull event: ${googleEvent.summary}`)
            } else {
                result.pulledFromGoogle++
            }
        }
    }

    return result
}

// Add Google Meet link to an existing local event
export async function addMeetLinkToEvent(
    userId: string,
    calendarEventId: string,
    supabaseClient?: any
): Promise<string | null> {
    const supabase = supabaseClient || createClient()

    // Get the local event
    const { data: event, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', calendarEventId)
        .single()

    if (error || !event) {
        console.error('Failed to get calendar event:', error)
        return null
    }

    if (event.google_event_id) {
        // Event already in Google - we need to update it with Meet link
        // This is complex because we can't just add a Meet to an existing event
        // We'd need to recreate it - for now, create a new one
        console.log('Event already synced with Google, Meet link should be added during creation')
        return event.google_meet_link
    }

    // Create new Google event with Meet link
    const googleEvent = await createGoogleCalendarEvent(userId, {
        title: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        add_meet_link: true,
    }, supabase)

    if (!googleEvent) {
        return null
    }

    const meetLink = extractMeetLink(googleEvent)

    // Update local event
    await supabase
        .from('calendar_events')
        .update({
            google_event_id: googleEvent.id,
            google_meet_link: meetLink,
            synced_at: new Date().toISOString(),
            google_updated_at: googleEvent.updated,
        })
        .eq('id', calendarEventId)

    return meetLink
}
