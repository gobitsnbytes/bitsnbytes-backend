import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventInsert, Organizer, EventWithArchive } from '@/lib/database.types'

// Get current organizer
export function useOrganizer() {
  return useQuery({
    queryKey: ['organizer'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as Organizer
    },
  })
}

// Get all active (non-archived) events
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('archived_at', null) // Only get non-archived events
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as EventWithArchive[]
    },
  })
}

// Get all archived events (for sudo/admin only)
export function useArchivedEvents() {
  return useQuery({
    queryKey: ['events', 'archived'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('archived_at', 'is', null) // Only get archived events
        .order('archived_at', { ascending: false })

      if (error) throw error
      return data as EventWithArchive[]
    },
  })
}

// Get single event
export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()

      if (error) throw error
      return data as EventWithArchive
    },
    enabled: !!eventId,
  })
}

// Create event
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (event: Omit<EventInsert, 'organizer_id'>) => {
      const supabase = createClient()
      // Get organizer id first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let { data: organizer, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (organizerError) throw new Error(`Failed to fetch organizer: ${organizerError.message}`)

      // Create organizer if it doesn't exist (fallback for users who signed up before callback was added)
      if (!organizer) {
        // First, check if an organizer exists with this email (could be from a previous auth account)
        const { data: existingByEmail, error: emailError } = await supabase
          .from('organizers')
          .select('id, auth_user_id')
          .eq('email', user.email!)
          .maybeSingle()

        if (emailError) throw new Error(`Failed to check existing organizer by email: ${emailError.message}`)

        if (existingByEmail) {
          // If the email exists but with a different auth_user_id, update it to link to the current user
          if (existingByEmail.auth_user_id !== user.id) {
            const { data: updatedOrganizer, error: updateError } = await supabase
              .from('organizers')
              .update({ auth_user_id: user.id })
              .eq('id', existingByEmail.id)
              .select('id')
              .maybeSingle()

            if (updateError) throw new Error(`Failed to update organizer: ${updateError.message}`)
            organizer = updatedOrganizer
          } else {
            organizer = existingByEmail
          }
        } else {
          // No existing organizer with this email, create a new one
          const { data: newOrganizer, error: createError } = await supabase
            .from('organizers')
            .insert({
              auth_user_id: user.id,
              email: user.email!,
            })
            .select('id')
            .single()

          if (createError) throw new Error(`Failed to create organizer: ${createError.message}`)
          organizer = newOrganizer
        }
      }

      if (!organizer) throw new Error('Organizer not found and could not be created')

      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, organizer_id: organizer.id })
        .select()
        .single()

      if (error) throw new Error(`Failed to create event: ${error.message}`)

      // Note: Default calendar is automatically created by database trigger

      // If event has start_date and/or end_date, create a calendar event on the Primary calendar
      if (data && (event.start_date || event.end_date)) {
        // Wait a bit for the trigger to create the default calendar
        await new Promise(resolve => setTimeout(resolve, 100))

        // Get the Primary calendar for this event
        const { data: calendars } = await supabase
          .from('calendars')
          .select('id')
          .eq('event_id', data.id)
          .eq('is_default', true)
          .maybeSingle()

        if (calendars) {
          // Create start and end times for the all-day event
          const startDate = event.start_date ? new Date(event.start_date) : new Date(event.end_date!)
          startDate.setHours(0, 0, 0, 0)

          const endDate = event.end_date ? new Date(event.end_date) : new Date(event.start_date!)
          endDate.setHours(23, 59, 59, 999)

          // Create the calendar event
          await supabase
            .from('calendar_events')
            .insert({
              event_id: data.id,
              calendar_id: calendars.id,
              title: event.name,
              start_time: startDate.toISOString(),
              end_time: endDate.toISOString(),
              is_all_day: true,
              description: `Event: ${event.name}`,
            })
        }
      }

      return data as Event
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['calendars', data.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.id] })
    },
  })
}

// Update event
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Event>) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data as Event
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', data.id] })
    },
  })
}

// Archive event (soft delete) - sets archived_at timestamp
export function useArchiveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single()

      if (error) throw error
      return data as EventWithArchive
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', 'archived'] })
    },
  })
}

// Restore archived event - clears archived_at timestamp
export function useRestoreEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .update({ archived_at: null })
        .eq('id', eventId)
        .select()
        .single()

      if (error) throw error
      return data as EventWithArchive
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', 'archived'] })
    },
  })
}

// Permanent delete event (hard delete) - sudo only
export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      return eventId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', 'archived'] })
    },
  })
}

