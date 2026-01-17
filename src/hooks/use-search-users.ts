import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface UserResult {
    id: string
    email: string
    display_name: string | null
    avatar_url?: string // If we had avatars
}

export function useSearchUsers(query: string) {
    return useQuery({
        queryKey: ['users-search', query],
        queryFn: async () => {
            if (!query || query.length < 2) return []

            const supabase = createClient()
            const { data, error } = await supabase
                .from('organizers')
                .select('id, email, display_name')
                .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(10)

            if (error) {
                console.error('Error searching users:', error)
                return []
            }

            return data as UserResult[]
        },
        enabled: query.length >= 2,
        staleTime: 60000, // cache for 1 minute
    })
}
