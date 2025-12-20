import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client (will throw error if credentials are missing when used)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined'
  }
})

// Database types based on our schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'organizer' | 'core_member'
          name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'organizer' | 'core_member'
          name: string
          created_at?: string
        }
        Update: {
          email?: string
          role?: 'organizer' | 'core_member'
          name?: string
        }
      }
      events: {
        Row: {
          id: string
          name: string
          event_date: string
          organizer_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          event_date: string
          organizer_id: string
          created_at?: string
        }
        Update: {
          name?: string
          event_date?: string
        }
      }
      tasks: {
        Row: {
          id: string
          event_id: string
          category: 'event_setup' | 'sponsorship' | 'tech' | 'logistics' | 'graphics' | 'outreach'
          title: string
          owner_id: string
          deadline: string
          status: 'pending' | 'in_progress' | 'blocked' | 'done'
          blocker_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          category: 'event_setup' | 'sponsorship' | 'tech' | 'logistics' | 'graphics' | 'outreach'
          title: string
          owner_id: string
          deadline: string
          status?: 'pending' | 'in_progress' | 'blocked' | 'done'
          blocker_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: 'event_setup' | 'sponsorship' | 'tech' | 'logistics' | 'graphics' | 'outreach'
          title?: string
          owner_id?: string
          deadline?: string
          status?: 'pending' | 'in_progress' | 'blocked' | 'done'
          blocker_note?: string | null
          updated_at?: string
        }
      }
      graphics_assets: {
        Row: {
          id: string
          task_id: string
          asset_type: 'poster' | 'story' | 'banner' | 'standee' | 'reel'
          formats: string
          status: 'requested' | 'designing' | 'review' | 'approved' | 'delivered'
          output_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          asset_type: 'poster' | 'story' | 'banner' | 'standee' | 'reel'
          formats: string
          status?: 'requested' | 'designing' | 'review' | 'approved' | 'delivered'
          output_url?: string | null
          created_at?: string
        }
        Update: {
          asset_type?: 'poster' | 'story' | 'banner' | 'standee' | 'reel'
          formats?: string
          status?: 'requested' | 'designing' | 'review' | 'approved' | 'delivered'
          output_url?: string | null
        }
      }
      outreach_posts: {
        Row: {
          id: string
          task_id: string
          channel: 'instagram' | 'whatsapp' | 'email' | 'linkedin' | 'partner'
          content_asset_id: string | null
          scheduled_time: string
          status: 'pending' | 'scheduled' | 'published' | 'failed'
          outcome_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          channel: 'instagram' | 'whatsapp' | 'email' | 'linkedin' | 'partner'
          content_asset_id?: string | null
          scheduled_time: string
          status?: 'pending' | 'scheduled' | 'published' | 'failed'
          outcome_note?: string | null
          created_at?: string
        }
        Update: {
          channel?: 'instagram' | 'whatsapp' | 'email' | 'linkedin' | 'partner'
          content_asset_id?: string | null
          scheduled_time?: string
          status?: 'pending' | 'scheduled' | 'published' | 'failed'
          outcome_note?: string | null
        }
      }
      sponsors: {
        Row: {
          id: string
          event_id: string
          company_name: string
          current_stage: 'initial_contact' | 'proposal_sent' | 'negotiation' | 'confirmed' | 'stalled'
          next_action: string
          owner_id: string
          follow_up_deadline: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          company_name: string
          current_stage: 'initial_contact' | 'proposal_sent' | 'negotiation' | 'confirmed' | 'stalled'
          next_action: string
          owner_id: string
          follow_up_deadline: string
          created_at?: string
        }
        Update: {
          company_name?: string
          current_stage?: 'initial_contact' | 'proposal_sent' | 'negotiation' | 'confirmed' | 'stalled'
          next_action?: string
          owner_id?: string
          follow_up_deadline?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          type: 'task_overdue' | 'task_blocked' | 'deadline_approaching' | 'asset_delivered' | 'sponsor_confirmed' | 'logistics_issue'
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          type: 'task_overdue' | 'task_blocked' | 'deadline_approaching' | 'asset_delivered' | 'sponsor_confirmed' | 'logistics_issue'
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
    }
  }
}
