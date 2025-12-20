import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from '@/lib/schemas'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email, password) => {
    set({ isLoading: true })
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      set({ isLoading: false })
      return { error: error.message }
    }

    // Fetch user profile
    if (data.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        set({ isLoading: false })
        return { error: 'Failed to fetch user profile' }
      }

      set({
        user: userData as User,
        isAuthenticated: true,
        isLoading: false
      })
    }

    return { error: null }
  },

  signUp: async (email, password, name, role) => {
    set({ isLoading: true })

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    })

    if (error) {
      set({ isLoading: false })
      return { error: error.message }
    }

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          name,
          role
        })

      if (profileError) {
        set({ isLoading: false })
        return { error: 'Failed to create user profile' }
      }

      const userData: User = {
        id: data.user.id,
        email,
        name,
        role
      }

      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false
      })
    }

    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })
  },

  checkAuth: async () => {
    set({ isLoading: true })

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        set({
          user: userData as User,
          isAuthenticated: true,
          isLoading: false
        })
        return
      }
    }

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user
    })
  }
}))
