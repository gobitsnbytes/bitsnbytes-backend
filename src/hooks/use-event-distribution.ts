'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/database.types'

// Types for event distribution
export type EventInstance = Event & {
    city?: {
        id: string
        name: string
    } | null
}

// ============================================
// SUDO: Get template events (created by sudo)
// ============================================
export function useTemplateEvents() {
    return useQuery({
        queryKey: ['template-events'],
        queryFn: async () => {
            const supabase = createClient()

            try {
                // Try with is_template filter
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('is_template', true)
                    .is('archived_at', null)
                    .order('created_at', { ascending: false })

                if (error) throw error
                return data as Event[]
            } catch (err) {
                console.error('useTemplateEvents error, falling back:', err)
                // Fallback: just get all non-archived events
                const { data } = await supabase
                    .from('events')
                    .select('*')
                    .is('archived_at', null)
                    .order('created_at', { ascending: false })
                return (data || []) as Event[]
            }
        },
    })
}

// ============================================
// SUDO: Get all instances of a template event
// ============================================
export function useEventInstances(templateEventId: string) {
    return useQuery({
        queryKey: ['event-instances', templateEventId],
        queryFn: async () => {
            const supabase = createClient()

            // Get instances
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .eq('parent_event_id', templateEventId)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Get cities for these events
            const cityIds = events?.map(e => e.city_id).filter(Boolean) as string[]
            let cities: { id: string; name: string }[] = []

            if (cityIds.length > 0) {
                const { data: cityData } = await supabase
                    .from('cities')
                    .select('id, name')
                    .in('id', cityIds)
                cities = cityData || []
            }

            // Merge city data
            return events?.map(event => ({
                ...event,
                city: cities.find(c => c.id === event.city_id) || null,
            })) as EventInstance[]
        },
        enabled: !!templateEventId,
    })
}

// ============================================
// SUDO: Push event to cities
// ============================================
export function usePushEventToCities() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            eventId,
            cityIds,
        }: {
            eventId: string
            cityIds: string[]
        }) => {
            const supabase = createClient()

            console.log('Calling push_event_to_cities with:', { eventId, cityIds })

            // Call the database function to push event to cities
            const { data, error } = await (supabase.rpc as any)('push_event_to_cities', {
                template_event_id: eventId,
                target_city_ids: cityIds,
            })

            if (error) {
                console.error('RPC error details:', JSON.stringify(error, null, 2))
                throw error
            }
            console.log('Push result:', data)
            return data as Event[]
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['template-events'] })
            queryClient.invalidateQueries({ queryKey: ['event-instances', variables.eventId] })
            queryClient.invalidateQueries({ queryKey: ['pending-events'] })
        },
    })
}

// ============================================
// CITY ADMIN: Get pending event invites
// ============================================
export function usePendingEvents() {
    return useQuery({
        queryKey: ['pending-events'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .eq('instance_status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Get cities for these events
            const cityIds = events?.map(e => e.city_id).filter(Boolean) as string[]
            let cities: { id: string; name: string }[] = []

            if (cityIds.length > 0) {
                const { data: cityData } = await supabase
                    .from('cities')
                    .select('id, name')
                    .in('id', cityIds)
                cities = cityData || []
            }

            // Merge city data
            return events?.map(event => ({
                ...event,
                city: cities.find(c => c.id === event.city_id) || null,
            })) as EventInstance[]
        },
    })
}

// ============================================
// CITY ADMIN: Get accepted events
// ============================================
export function useAcceptedEvents() {
    return useQuery({
        queryKey: ['accepted-events'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .eq('instance_status', 'accepted')
                .is('archived_at', null)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Get cities
            const cityIds = events?.map(e => e.city_id).filter(Boolean) as string[]
            let cities: { id: string; name: string }[] = []

            if (cityIds.length > 0) {
                const { data: cityData } = await supabase
                    .from('cities')
                    .select('id, name')
                    .in('id', cityIds)
                cities = cityData || []
            }

            return events?.map(event => ({
                ...event,
                city: cities.find(c => c.id === event.city_id) || null,
            })) as EventInstance[]
        },
    })
}

// ============================================
// CITY ADMIN: Get ignored events (restorable)
// ============================================
export function useIgnoredEvents() {
    return useQuery({
        queryKey: ['ignored-events'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .eq('instance_status', 'ignored')
                .order('created_at', { ascending: false })

            if (error) throw error

            const cityIds = events?.map(e => e.city_id).filter(Boolean) as string[]
            let cities: { id: string; name: string }[] = []

            if (cityIds.length > 0) {
                const { data: cityData } = await supabase
                    .from('cities')
                    .select('id, name')
                    .in('id', cityIds)
                cities = cityData || []
            }

            return events?.map(event => ({
                ...event,
                city: cities.find(c => c.id === event.city_id) || null,
            })) as EventInstance[]
        },
    })
}

// ============================================
// CITY ADMIN: Accept an event invite
// ============================================
export function useAcceptEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const supabase = createClient()

            const { data, error } = await (supabase.rpc as any)('accept_event_instance', {
                event_id: eventId,
            })

            if (error) throw error
            return data as Event
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-events'] })
            queryClient.invalidateQueries({ queryKey: ['accepted-events'] })
            queryClient.invalidateQueries({ queryKey: ['events'] })
        },
    })
}

// ============================================
// CITY ADMIN: Ignore an event invite
// ============================================
export function useIgnoreEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const supabase = createClient()

            const { data, error } = await (supabase.rpc as any)('ignore_event_instance', {
                event_id: eventId,
            })

            if (error) throw error
            return data as Event
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-events'] })
            queryClient.invalidateQueries({ queryKey: ['ignored-events'] })
        },
    })
}

// ============================================
// CITY ADMIN: Restore ignored event to pending
// ============================================
export function useRestoreIgnoredEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const supabase = createClient()

            const { data, error } = await (supabase.rpc as any)('restore_ignored_event', {
                event_id: eventId,
            })

            if (error) throw error
            return data as Event
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-events'] })
            queryClient.invalidateQueries({ queryKey: ['ignored-events'] })
        },
    })
}
