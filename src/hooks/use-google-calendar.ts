/**
 * React Query hooks for Google Calendar integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Check if user has Google Calendar connected
export function useGoogleConnection() {
    return useQuery({
        queryKey: ['google-connection'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await (supabase as any)
                .from('google_credentials')
                .select('id, calendar_id, updated_at')
                .eq('user_id', user.id)
                .single()

            if (error || !data) return null

            return {
                connected: true,
                calendarId: data.calendar_id,
                lastUpdated: data.updated_at,
            }
        },
    })
}

// Disconnect Google account
export function useDisconnectGoogle() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/google/disconnect', {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to disconnect')
            }

            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['google-connection'] })
        },
    })
}

// Sync calendar events with Google
export function useSyncGoogleCalendar() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const response = await fetch('/api/google/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to sync')
            }

            return response.json()
        },
        onSuccess: (_, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events', eventId] })
        },
    })
}

// Add Meet link to a calendar event
export function useAddMeetLink() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ calendarEventId, eventId }: { calendarEventId: string; eventId: string }) => {
            const response = await fetch('/api/google/meet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ calendarEventId }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to add Meet link')
            }

            return response.json()
        },
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events', eventId] })
        },
    })
}
