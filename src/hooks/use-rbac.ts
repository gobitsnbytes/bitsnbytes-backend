import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
    PlatformUser,
    PlatformUserInsert,
    PlatformUserWithCity,
    City,
    CityInsert,
    EventPermissions,
    PlatformRole,
    EventRole,
} from '@/lib/database.types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// Impersonation Store (Sudo only)
// ============================================

interface ImpersonationState {
    isImpersonating: boolean
    impersonatedRole: PlatformRole | EventRole | null
    impersonatedCityId: string | null
    startImpersonation: (role: PlatformRole | EventRole, cityId?: string | null) => void
    stopImpersonation: () => void
}

export const useImpersonationStore = create<ImpersonationState>()(
    persist(
        (set) => ({
            isImpersonating: false,
            impersonatedRole: null,
            impersonatedCityId: null,
            startImpersonation: (role, cityId = null) => set({
                isImpersonating: true,
                impersonatedRole: role,
                impersonatedCityId: cityId,
            }),
            stopImpersonation: () => set({
                isImpersonating: false,
                impersonatedRole: null,
                impersonatedCityId: null,
            }),
        }),
        {
            name: 'impersonation-store',
        }
    )
)

// ============================================
// Platform Role Hooks
// ============================================

// Get current user's platform role (sudo/admin or null)
export function usePlatformRole() {
    return useQuery({
        queryKey: ['platform-role'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('platform_users')
                .select('*, city:cities(*)')
                .eq('user_id', user.id)
                .maybeSingle()

            if (error) throw error
            return data as PlatformUserWithCity | null
        },
    })
}

// Check if current user is sudo
export function useIsSudo() {
    const { data: platformRole } = usePlatformRole()
    const { isImpersonating, impersonatedRole } = useImpersonationStore()

    // If impersonating, check impersonated role
    if (isImpersonating) {
        return impersonatedRole === 'sudo'
    }

    return platformRole?.role === 'sudo'
}

// Check if current user is platform admin (sudo or city admin)
export function useIsPlatformAdmin() {
    const { data: platformRole } = usePlatformRole()
    const { isImpersonating, impersonatedRole } = useImpersonationStore()

    if (isImpersonating) {
        return impersonatedRole === 'sudo' || impersonatedRole === 'admin'
    }

    return platformRole?.role === 'sudo' || platformRole?.role === 'admin'
}

// Get the effective role (considering impersonation)
export function useEffectiveRole() {
    const { data: platformRole } = usePlatformRole()
    const { isImpersonating, impersonatedRole, impersonatedCityId } = useImpersonationStore()

    if (isImpersonating && impersonatedRole) {
        return {
            role: impersonatedRole,
            cityId: impersonatedCityId,
            isImpersonating: true,
        }
    }

    return {
        role: platformRole?.role || null,
        cityId: platformRole?.city_id || null,
        isImpersonating: false,
    }
}

// ============================================
// Event Permissions Hook
// ============================================

export function useEventPermissions(eventId: string | null): EventPermissions {
    const { data: platformRole } = usePlatformRole()
    const { isImpersonating, impersonatedRole } = useImpersonationStore()

    // Get event member role for this event
    const { data: eventMember } = useQuery({
        queryKey: ['event-member', eventId],
        queryFn: async () => {
            if (!eventId) return null

            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('event_members')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (error) throw error
            return data
        },
        enabled: !!eventId,
    })

    // Determine effective role
    const effectiveRole = isImpersonating ? impersonatedRole : platformRole?.role

    // Sudo has all permissions
    if (effectiveRole === 'sudo') {
        return {
            canView: true,
            canEdit: true,
            canManageMembers: true,
            canArchive: true,
            canDelete: true,
            role: 'sudo',
        }
    }

    // City admin has most permissions for their city events
    if (effectiveRole === 'admin') {
        return {
            canView: true,
            canEdit: true,
            canManageMembers: true,
            canArchive: true,
            canDelete: false, // Only sudo can delete
            role: 'admin',
        }
    }

    // Event-level roles
    const eventRole = eventMember?.role as EventRole | 'owner' | null

    if (eventRole === 'owner') {
        return {
            canView: true,
            canEdit: true,
            canManageMembers: true,
            canArchive: true,
            canDelete: false,
            role: 'owner',
        }
    }

    if (eventRole === 'editor') {
        return {
            canView: true,
            canEdit: true,
            canManageMembers: false,
            canArchive: false,
            canDelete: false,
            role: 'editor',
        }
    }

    if (eventRole === 'commentator') {
        return {
            canView: true,
            canEdit: false,
            canManageMembers: false,
            canArchive: false,
            canDelete: false,
            role: 'commentator',
        }
    }

    if (eventRole === 'viewer') {
        return {
            canView: true,
            canEdit: false,
            canManageMembers: false,
            canArchive: false,
            canDelete: false,
            role: 'viewer',
        }
    }

    // No permission
    return {
        canView: false,
        canEdit: false,
        canManageMembers: false,
        canArchive: false,
        canDelete: false,
        role: null,
    }
}

// ============================================
// Cities Management (Sudo only)
// ============================================

export function useCities() {
    return useQuery({
        queryKey: ['cities'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('cities')
                .select('*')
                .order('name')

            if (error) throw error
            return data as City[]
        },
    })
}

export function useCreateCity() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (city: CityInsert) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('cities')
                .insert(city)
                .select()
                .single()

            if (error) throw error
            return data as City
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cities'] })
        },
    })
}

export function useDeleteCity() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (cityId: string) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('cities')
                .delete()
                .eq('id', cityId)

            if (error) throw error
            return cityId
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cities'] })
        },
    })
}

// ============================================
// Platform Users Management (Sudo only)
// ============================================

export function usePlatformUsers() {
    return useQuery({
        queryKey: ['platform-users'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('platform_users')
                .select('*, city:cities(*)')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as PlatformUserWithCity[]
        },
    })
}

export function useCreatePlatformUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (user: PlatformUserInsert) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('platform_users')
                .insert(user)
                .select('*, city:cities(*)')
                .single()

            if (error) throw error
            return data as PlatformUserWithCity
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-users'] })
        },
    })
}

export function useUpdatePlatformUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; role?: PlatformRole; city_id?: string | null }) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('platform_users')
                .update(updates)
                .eq('id', id)
                .select('*, city:cities(*)')
                .single()

            if (error) throw error
            return data as PlatformUserWithCity
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-users'] })
        },
    })
}

export function useDeletePlatformUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (userId: string) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('platform_users')
                .delete()
                .eq('id', userId)

            if (error) throw error
            return userId
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-users'] })
        },
    })
}

// ============================================
// Archive Permission Check
// ============================================

export function useCanArchiveEvent(eventId: string | null) {
    const permissions = useEventPermissions(eventId)
    return permissions.canArchive
}

export function useCanManageEvent(eventId: string | null) {
    const permissions = useEventPermissions(eventId)
    return permissions.canEdit
}
