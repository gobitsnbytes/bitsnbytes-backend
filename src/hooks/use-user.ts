import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Organizer } from '@/lib/database.types'

export function useCurrentUser() {
    return useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            // Try to get organizer profile
            const { data, error } = await supabase
                .from('organizers')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user profile:', error)
            }

            // If no organizer profile, return basic auth info structure
            if (!data) {
                return {
                    id: 'temp',
                    auth_user_id: user.id,
                    email: user.email!,
                    display_name: user.user_metadata?.full_name || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as Organizer
            }

            return data as Organizer
        },
    })
}
