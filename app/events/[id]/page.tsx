'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KanbanBoard } from '@/components/kanban'
import { TaskFormDialog } from '@/components/tasks'
import { useEventsStore } from '@/stores/eventsStore'
import { useTasksStore } from '@/stores/tasksStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { TaskWithRelations } from '@/lib/schemas'
import { format } from 'date-fns'
import { Calendar, Plus, RefreshCw } from 'lucide-react'

export default function EventBoardPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const { currentEvent, fetchEventById, isLoading: eventLoading } = useEventsStore()
  const { tasks, fetchTasks, isLoading: tasksLoading, handleRealtimeUpdate } = useTasksStore()

  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch event and tasks
  useEffect(() => {
    if (eventId && isAuthenticated) {
      fetchEventById(eventId)
      fetchTasks(eventId)
    }
  }, [eventId, isAuthenticated, fetchEventById, fetchTasks])

  // Set up real-time subscription
  useEffect(() => {
    if (!eventId || !isAuthenticated) return

    const channel = supabase
      .channel(`tasks_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          handleRealtimeUpdate(payload as never)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, isAuthenticated, handleRealtimeUpdate])

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await useTasksStore.getState().deleteTask(taskId)
    }
  }

  const handleRefresh = () => {
    fetchTasks(eventId)
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/events">Events</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {eventLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    currentEvent?.name || 'Event'
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-col flex-1">
          {/* Event Header */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-4 md:px-6">
              {eventLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : currentEvent ? (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{currentEvent.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(currentEvent.event_date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button size="sm" onClick={() => setIsAddingTask(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">Event not found</div>
              )}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-hidden bg-slate-50/50">
            {tasksLoading ? (
              <div className="flex gap-4 p-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="w-[320px] h-[400px] rounded-lg" />
                ))}
              </div>
            ) : (
              <KanbanBoard
                eventId={eventId}
                ownerId={user?.id || ''}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            )}
          </div>
        </div>

        {/* Add Task Dialog */}
        <TaskFormDialog
          open={isAddingTask}
          onOpenChange={setIsAddingTask}
          eventId={eventId}
          ownerId={user?.id || ''}
        />

        {/* Edit Task Dialog */}
        {editingTask && (
          <TaskFormDialog
            open={!!editingTask}
            onOpenChange={(open) => !open && setEditingTask(null)}
            eventId={eventId}
            ownerId={user?.id || ''}
            task={editingTask}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
