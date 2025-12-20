import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Sponsor, CreateSponsor, SponsorStage } from '@/lib/schemas'

interface SponsorsState {
  sponsors: Sponsor[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchSponsors: (eventId: string) => Promise<void>
  createSponsor: (data: CreateSponsor) => Promise<{ error: string | null }>
  updateSponsor: (id: string, data: Partial<Sponsor>) => Promise<{ error: string | null }>
  updateSponsorStage: (id: string, stage: SponsorStage, nextAction: string) => Promise<{ error: string | null }>
  deleteSponsor: (id: string) => Promise<{ error: string | null }>
  getSponsorsByStage: (stage: SponsorStage) => Sponsor[]
}

export const useSponsorsStore = create<SponsorsState>((set, get) => ({
  sponsors: [],
  isLoading: false,
  error: null,

  fetchSponsors: async (eventId) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('event_id', eventId)
      .order('follow_up_deadline', { ascending: true })

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    set({ sponsors: data as Sponsor[], isLoading: false })
  },

  createSponsor: async (data) => {
    const { data: newSponsor, error } = await supabase
      .from('sponsors')
      .insert(data)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    set((state) => ({
      sponsors: [...state.sponsors, newSponsor as Sponsor]
    }))

    return { error: null }
  },

  updateSponsor: async (id, data) => {
    const previousSponsors = get().sponsors
    set((state) => ({
      sponsors: state.sponsors.map((sponsor) =>
        sponsor.id === id ? { ...sponsor, ...data } : sponsor
      )
    }))

    const { error } = await supabase
      .from('sponsors')
      .update(data)
      .eq('id', id)

    if (error) {
      set({ sponsors: previousSponsors })
      return { error: error.message }
    }

    return { error: null }
  },

  updateSponsorStage: async (id, stage, nextAction) => {
    return get().updateSponsor(id, {
      current_stage: stage,
      next_action: nextAction
    })
  },

  deleteSponsor: async (id) => {
    const previousSponsors = get().sponsors
    set((state) => ({
      sponsors: state.sponsors.filter((sponsor) => sponsor.id !== id)
    }))

    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', id)

    if (error) {
      set({ sponsors: previousSponsors })
      return { error: error.message }
    }

    return { error: null }
  },

  getSponsorsByStage: (stage) => {
    return get().sponsors.filter((sponsor) => sponsor.current_stage === stage)
  }
}))
