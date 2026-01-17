import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CalendarEvent, CalendarEventInsert, CalendarEventUpdate } from '@/lib/database.types'

// Get calendar events for a specific event
export function useCalendarEvents(eventId: string | null) {
  return useQuery({
    queryKey: ['calendar-events', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) throw error
      return data as CalendarEvent[]
    },
    enabled: !!eventId,
    refetchInterval: 60000, // Poll every 60 seconds
  })
}

// Get calendar events for a date range
export function useCalendarEventsInRange(
  eventId: string | null,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['calendar-events', eventId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!eventId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('event_id', eventId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error
      return data as CalendarEvent[]
    },
    enabled: !!eventId,
  })
}

// Create calendar event
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (calendarEvent: CalendarEventInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(calendarEvent)
        .select()
        .single()

      if (error) throw error
      return data as CalendarEvent
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.event_id] })
    },
  })
}

// Update calendar event
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      eventId,
      ...updates
    }: { id: string; eventId: string } & CalendarEventUpdate) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, eventId } as CalendarEvent & { eventId: string }
    },
    onMutate: async ({ id, eventId, ...updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['calendar-events', eventId] })

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(['calendar-events', eventId])

      // Optimistically update
      queryClient.setQueryData(['calendar-events', eventId], (old: CalendarEvent[] | undefined) => {
        if (!old) return old
        return old.map(event =>
          event.id === id ? { ...event, ...updates } : event
        )
      })

      return { previousEvents, eventId }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['calendar-events', context.eventId], context.previousEvents)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', variables.eventId] })
    },
  })
}

// Delete calendar event (also deletes from Google if synced)
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      // Use API to delete so it also removes from Google Calendar
      const response = await fetch('/api/calendar-events/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarEventId: id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete event')
      }

      return { id, eventId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', variables.eventId] })
    },
  })
}
