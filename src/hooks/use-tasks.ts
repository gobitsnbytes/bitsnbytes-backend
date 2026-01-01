import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

type TaskColumn = Tables<'task_columns'>
type TaskColumnInsert = TablesInsert<'task_columns'>
type TaskColumnUpdate = TablesUpdate<'task_columns'>

type Task = Tables<'tasks'>
type TaskInsert = TablesInsert<'tasks'>
type TaskUpdate = TablesUpdate<'tasks'>

// Get all task columns for an event
export function useTaskColumns(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['task-columns', eventId],
    queryFn: async () => {
      if (!eventId) return []
      
      const { data, error } = await supabase
        .from('task_columns')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as TaskColumn[]
    },
    enabled: !!eventId,
  })
}

// Get all tasks for an event with column info
export function useTasks(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['tasks', eventId],
    queryFn: async () => {
      if (!eventId) return []
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
    enabled: !!eventId,
  })
}

// Create task column
export function useCreateTaskColumn() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (column: TaskColumnInsert) => {
      const { data, error } = await supabase
        .from('task_columns')
        .insert(column as never)
        .select()
        .single()

      if (error) throw error
      return data as TaskColumn
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-columns', data.event_id] })
    },
  })
}

// Update task column
export function useUpdateTaskColumn() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      ...updates 
    }: { id: string; eventId: string } & TaskColumnUpdate) => {
      const { data, error } = await supabase
        .from('task_columns')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(data as TaskColumn), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-columns', data.eventId] })
    },
  })
}

// Delete task column (and all its tasks)
export function useDeleteTaskColumn() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase
        .from('task_columns')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-columns', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
    },
  })
}

// Create task
export function useCreateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task as never)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.event_id] })
    },
  })
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      ...updates 
    }: { id: string; eventId: string } & TaskUpdate) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(data as Task), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
    },
  })
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
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

// Batch update task order and column
export function useBatchUpdateTasks() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      tasks, 
      eventId 
    }: { 
      tasks: Array<{ id: string; column_id: string; order_index: number }>
      eventId: string 
    }) => {
      // Update each task individually
      const updates = tasks.map(task =>
        supabase
          .from('tasks')
          .update({ 
            column_id: task.column_id, 
            order_index: task.order_index 
          } as never)
          .eq('id', task.id)
      )

      const results = await Promise.all(updates)
      
      // Check for errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) throw errors[0].error

      return { eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
    },
  })
}
