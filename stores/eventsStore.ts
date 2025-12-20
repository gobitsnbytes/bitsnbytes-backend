import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Event, CreateEvent } from '@/lib/schemas'

interface EventsState {
  events: Event[]
  currentEvent: Event | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchEvents: () => Promise<void>
  fetchEventById: (id: string) => Promise<void>
  createEvent: (data: CreateEvent) => Promise<{ error: string | null }>
  updateEvent: (id: string, data: Partial<Event>) => Promise<{ error: string | null }>
  deleteEvent: (id: string) => Promise<{ error: string | null }>
  setCurrentEvent: (event: Event | null) => void
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    set({ events: data as Event[], isLoading: false })
  },

  fetchEventById: async (id) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    set({ currentEvent: data as Event, isLoading: false })
  },

  createEvent: async (data) => {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.user) {
      return { error: 'Not authenticated' }
    }

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        ...data,
        organizer_id: sessionData.session.user.id
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    set((state) => ({
      events: [...state.events, newEvent as Event]
    }))

    return { error: null }
  },

  updateEvent: async (id, data) => {
    // Optimistic update
    const previousEvents = get().events
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...data } : event
      )
    }))

    const { error } = await supabase
      .from('events')
      .update(data)
      .eq('id', id)

    if (error) {
      // Rollback
      set({ events: previousEvents })
      return { error: error.message }
    }

    return { error: null }
  },

  deleteEvent: async (id) => {
    const previousEvents = get().events
    set((state) => ({
      events: state.events.filter((event) => event.id !== id)
    }))

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      set({ events: previousEvents })
      return { error: error.message }
    }

    return { error: null }
  },

  setCurrentEvent: (event) => {
    set({ currentEvent: event })
  }
}))
