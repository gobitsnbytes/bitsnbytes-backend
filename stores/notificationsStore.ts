import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Notification, NotificationType } from '@/lib/schemas'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchNotifications: (userId: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  createNotification: (userId: string, type: NotificationType, message: string, taskId?: string) => Promise<void>
  handleRealtimeUpdate: (payload: { eventType: string; new?: Notification; old?: Notification }) => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    const notifications = data as Notification[]
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      isLoading: false
    })
  },

  markAsRead: async (id) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (error) {
      // Refetch on error
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        get().fetchNotifications(session.user.id)
      }
    }
  },

  markAllAsRead: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }))

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)

    if (error) {
      get().fetchNotifications(session.user.id)
    }
  },

  createNotification: async (userId, type, message, taskId) => {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        task_id: taskId || null
      })
  },

  handleRealtimeUpdate: (payload) => {
    const { eventType, new: newRecord } = payload

    set((state) => {
      switch (eventType) {
        case 'INSERT':
          const notification = newRecord as Notification
          return {
            notifications: [notification, ...state.notifications],
            unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
          }
        case 'UPDATE':
          return {
            notifications: state.notifications.map((n) =>
              n.id === (newRecord as Notification).id ? (newRecord as Notification) : n
            ),
            unreadCount: state.notifications.filter((n) => !n.read).length
          }
        default:
          return state
      }
    })
  }
}))
