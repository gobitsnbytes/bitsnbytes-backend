import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskInsert, TaskUpdate, TaskStatus } from '@/lib/database.types'

// Extended task type with relations for UI display
export type TaskWithRelations = Task & {
  assigner?: {
    id: string
    user_id: string
    role: string
    event_id: string
  }
  assignee?: {
    id: string
    user_id: string
    role: string
    event_id: string
  }
  team?: {
    id: string
    name: string
    description: string | null
  }
}

// Get all non-archived tasks for an event with filters
export function useTasks(eventId: string | null, filters?: {
  status?: TaskStatus | 'all'
  assigneeId?: string
  teamId?: string
  assignerId?: string
}) {
  return useQuery({
    queryKey: ['tasks', eventId, filters],
    queryFn: async () => {
      if (!eventId) return []
      
      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigner:event_members!tasks_assigner_id_fkey(id, user_id, role, event_id),
          assignee:event_members!tasks_assignee_id_fkey(id, user_id, role, event_id),
          team:event_teams(id, name, description)
        `)
        .eq('event_id', eventId)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.assigneeId) {
        query = query.eq('assignee_id', filters.assigneeId)
      }
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId)
      }
      if (filters?.assignerId) {
        query = query.eq('assigner_id', filters.assignerId)
      }

      const { data, error} = await query

      if (error) throw error
      return (data as TaskWithRelations[]) || []
    },
    enabled: !!eventId,
  })
}

// Get archived tasks (done > 1 day ago)
export function useArchivedTasks(eventId: string | null) {
  return useQuery({
    queryKey: ['tasks', eventId, 'archived'],
    queryFn: async () => {
      if (!eventId) return []
      
      const supabase = createClient()
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigner:event_members!tasks_assigner_id_fkey(id, user_id, role, event_id),
          assignee:event_members!tasks_assignee_id_fkey(id, user_id, role, event_id),
          team:event_teams(id, name, description)
        `)
        .eq('event_id', eventId)
        .eq('status', 'done')
        .lt('completed_at', oneDayAgo.toISOString())
        .order('completed_at', { ascending: false })

      if (error) throw error
      return (data as TaskWithRelations[]) || []
    },
    enabled: !!eventId,
  })
}

// Get single task by ID
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigner:event_members!tasks_assigner_id_fkey(id, user_id, role, event_id),
          assignee:event_members!tasks_assignee_id_fkey(id, user_id, role, event_id),
          team:event_teams(id, name, description)
        `)
        .eq('id', taskId)
        .single()

      if (error) throw error
      return data as TaskWithRelations
    },
    enabled: !!taskId,
  })
}

// Create task
export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .insert(task as never)
        .select(`
          *,
          assigner:event_members!tasks_assigner_id_fkey(id, user_id, role, event_id),
          assignee:event_members!tasks_assignee_id_fkey(id, user_id, role, event_id),
          team:event_teams(id, name, description)
        `)
        .single()

      if (error) throw error
      return data as TaskWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.event_id] })
    },
  })
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      ...updates 
    }: { id: string; eventId: string } & TaskUpdate) => {
      const supabase = createClient()
      // If updating status to 'done', set completed_at
      if (updates.status === 'done' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString()
      }
      
      // If updating status away from 'done', clear completed_at
      if (updates.status && updates.status !== 'done') {
        updates.completed_at = null
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as never)
        .eq('id', id)
        .select(`
          *,
          assigner:event_members!tasks_assigner_id_fkey(id, user_id, role, event_id),
          assignee:event_members!tasks_assignee_id_fkey(id, user_id, role, event_id),
          team:event_teams(id, name, description)
        `)
        .single()

      if (error) throw error
      return { ...(data as TaskWithRelations), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['task', data.id] })
    },
  })
}

// Change task status (with special handling for 'done' and 'waiting')
export function useChangeTaskStatus() {
  const updateTask = useUpdateTask()
  
  return useMutation({
    mutationFn: async ({
      id,
      eventId,
      status,
      waitingReason,
    }: {
      id: string
      eventId: string
      status: TaskStatus
      waitingReason?: string
    }) => {
      const updates: TaskUpdate = { status }
      
      // For 'waiting' status, waiting_reason is required
      if (status === 'waiting') {
        if (!waitingReason || waitingReason.trim().length === 0) {
          throw new Error('Waiting reason is required')
        }
        updates.waiting_reason = waitingReason.trim()
      } else {
        // Clear waiting_reason for other statuses
        updates.waiting_reason = null
      }
      
      return updateTask.mutateAsync({ id, eventId, ...updates })
    },
  })
}

// Archive task (only for done tasks, only by admins/owners)
export function useArchiveTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .update({ archived: true } as never)
        .eq('id', id)
        .eq('status', 'done') // Only done tasks can be archived
        .select()
        .single()

      if (error) throw error
      return { ...(data as Task), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId, 'archived'] })
    },
  })
}

// Delete task (only by assigner or event owner)
export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
    },
  })
}

// Get task count by status for an event
export function useTaskStats(eventId: string | null) {
  const { data: tasks = [] } = useTasks(eventId, { status: 'all' })
  
  const stats = {
    inbox: tasks.filter((t: TaskWithRelations) => t.status === 'inbox').length,
    active: tasks.filter((t: TaskWithRelations) => t.status === 'active').length,
    waiting: tasks.filter((t: TaskWithRelations) => t.status === 'waiting').length,
    done: tasks.filter((t: TaskWithRelations) => t.status === 'done').length,
    total: tasks.length,
  }
  
  return stats
}

// Get active task count for a specific user (soft limit warning)
export function useUserActiveTaskCount(eventId: string | null, memberId: string | null) {
  const { data: tasks = [] } = useTasks(eventId, {
    status: 'active',
    assigneeId: memberId || undefined,
  })
  
  return tasks.length
}
