import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Task, TaskWithRelations, CreateTask, UpdateTask, TaskStatus, TaskCategory } from '@/lib/schemas'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface TasksState {
  tasks: TaskWithRelations[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTasks: (eventId?: string) => Promise<void>
  fetchUserTasks: (userId: string) => Promise<void>
  createTask: (data: CreateTask) => Promise<{ error: string | null; task?: Task }>
  updateTask: (id: string, data: UpdateTask) => Promise<{ error: string | null }>
  updateTaskStatus: (id: string, status: TaskStatus, blockerNote?: string) => Promise<{ error: string | null }>
  deleteTask: (id: string) => Promise<{ error: string | null }>
  
  // Filtering helpers
  getTasksByCategory: (category: TaskCategory) => TaskWithRelations[]
  getTasksByStatus: (status: TaskStatus) => TaskWithRelations[]
  getOverdueTasks: () => TaskWithRelations[]
  getDueTodayTasks: () => TaskWithRelations[]
  getBlockedTasks: () => TaskWithRelations[]
  
  // Realtime
  handleRealtimeUpdate: (payload: RealtimePostgresChangesPayload<Task>) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (eventId) => {
    set({ isLoading: true, error: null })

    let query = supabase
      .from('tasks')
      .select(`
        *,
        owner:users!owner_id(id, name, email),
        event:events!event_id(id, name, event_date)
      `)
      .order('deadline', { ascending: true })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    set({ tasks: data as TaskWithRelations[], isLoading: false })
  },

  fetchUserTasks: async (userId) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        owner:users!owner_id(id, name, email),
        event:events!event_id(id, name, event_date)
      `)
      .eq('owner_id', userId)
      .order('deadline', { ascending: true })

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    set({ tasks: data as TaskWithRelations[], isLoading: false })
  },

  createTask: async (data) => {
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert(data)
      .select(`
        *,
        owner:users!owner_id(id, name, email),
        event:events!event_id(id, name, event_date)
      `)
      .single()

    if (error) {
      return { error: error.message }
    }

    set((state) => ({
      tasks: [...state.tasks, newTask as TaskWithRelations]
    }))

    return { error: null, task: newTask as Task }
  },

  updateTask: async (id, data) => {
    // Optimistic update
    const previousTasks = get().tasks
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...data, updated_at: new Date().toISOString() } : task
      )
    }))

    const { error } = await supabase
      .from('tasks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      // Rollback on error
      set({ tasks: previousTasks })
      return { error: error.message }
    }

    return { error: null }
  },

  updateTaskStatus: async (id, status, blockerNote) => {
    const updateData: UpdateTask = { status }
    if (status === 'blocked' && blockerNote) {
      updateData.blocker_note = blockerNote
    } else if (status !== 'blocked') {
      updateData.blocker_note = null
    }

    return get().updateTask(id, updateData)
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id)
    }))

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      set({ tasks: previousTasks })
      return { error: error.message }
    }

    return { error: null }
  },

  getTasksByCategory: (category) => {
    return get().tasks.filter((task) => task.category === category)
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status)
  },

  getOverdueTasks: () => {
    const now = new Date()
    return get().tasks.filter(
      (task) => new Date(task.deadline) < now && task.status !== 'done'
    )
  },

  getDueTodayTasks: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return get().tasks.filter((task) => {
      const deadline = new Date(task.deadline)
      return deadline >= today && deadline < tomorrow && task.status !== 'done'
    })
  },

  getBlockedTasks: () => {
    return get().tasks.filter((task) => task.status === 'blocked')
  },

  handleRealtimeUpdate: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    set((state) => {
      switch (eventType) {
        case 'INSERT':
          // Fetch full task with relations
          get().fetchTasks()
          return state
        case 'UPDATE':
          return {
            tasks: state.tasks.map((task) =>
              task.id === (newRecord as Task).id
                ? { ...task, ...(newRecord as Task) }
                : task
            )
          }
        case 'DELETE':
          return {
            tasks: state.tasks.filter((task) => task.id !== (oldRecord as Task).id)
          }
        default:
          return state
      }
    })
  }
}))
