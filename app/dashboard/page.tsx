'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskCard } from '@/components/tasks'
import { useAuthStore } from '@/stores/authStore'
import { useTasksStore } from '@/stores/tasksStore'
import { useEventsStore } from '@/stores/eventsStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { supabase } from '@/lib/supabase'
import { format, isToday, isTomorrow } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  ChevronRight,
  Bell,
  Zap
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const {
    tasks,
    fetchUserTasks,
    isLoading: tasksLoading,
    getOverdueTasks,
    getDueTodayTasks,
    getBlockedTasks,
    handleRealtimeUpdate
  } = useTasksStore()
  const { events, fetchEvents, isLoading: eventsLoading } = useEventsStore()
  const { fetchNotifications, unreadCount } = useNotificationsStore()

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

  // Fetch data
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchUserTasks(user.id)
      fetchEvents()
      fetchNotifications(user.id)
    }
  }, [user?.id, isAuthenticated, fetchUserTasks, fetchEvents, fetchNotifications])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return

    const tasksChannel = supabase
      .channel('dashboard_tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `owner_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeUpdate(payload as never)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
    }
  }, [user?.id, isAuthenticated, handleRealtimeUpdate])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const overdueTasks = getOverdueTasks()
  const dueTodayTasks = getDueTodayTasks()
  const blockedTasks = getBlockedTasks()
  const completedTasks = tasks.filter((t) => t.status === 'done')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter((e) => {
      const eventDate = new Date(e.event_date)
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return eventDate >= new Date() && eventDate <= weekFromNow
    })
    .slice(0, 3)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-muted-foreground">
                Here&apos;s what needs your attention today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Overdue"
              value={overdueTasks.length}
              description="Tasks past deadline"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              variant={overdueTasks.length > 0 ? 'danger' : 'default'}
            />
            <StatsCard
              title="Due Today"
              value={dueTodayTasks.length}
              description="Tasks to complete today"
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              variant={dueTodayTasks.length > 0 ? 'warning' : 'default'}
            />
            <StatsCard
              title="In Progress"
              value={inProgressTasks.length}
              description="Currently working on"
              icon={<Zap className="h-4 w-4 text-blue-500" />}
            />
            <StatsCard
              title="Completed"
              value={completedTasks.length}
              description="Tasks done"
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tasks Requiring Attention */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Overdue Tasks
                    </CardTitle>
                    <CardDescription className="text-red-600/80">
                      These tasks need immediate attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {overdueTasks.slice(0, 3).map((task) => (
                        <TaskCard key={task.id} task={task} showEvent />
                      ))}
                      {overdueTasks.length > 3 && (
                        <Button variant="ghost" className="w-full text-red-700">
                          View all {overdueTasks.length} overdue tasks
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Blocked Tasks */}
              {blockedTasks.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                      Blocked Tasks
                    </CardTitle>
                    <CardDescription className="text-orange-600/80">
                      Tasks that need blockers resolved
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {blockedTasks.slice(0, 3).map((task) => (
                        <TaskCard key={task.id} task={task} showEvent />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Due Today */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    Due Today
                  </CardTitle>
                  <CardDescription>
                    Tasks to complete by end of day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : dueTodayTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks due today. Great job!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dueTodayTasks.map((task) => (
                        <TaskCard key={task.id} task={task} showEvent />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Events
                    </CardTitle>
                    <Link href="/events">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : upcomingEvents.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No upcoming events</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => {
                        const eventDate = new Date(event.event_date)
                        return (
                          <Link key={event.id} href={`/events/${event.id}`}>
                            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div>
                                <p className="font-medium text-sm">{event.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isToday(eventDate)
                                    ? 'Today'
                                    : isTomorrow(eventDate)
                                    ? 'Tomorrow'
                                    : format(eventDate, 'EEE, MMM d')}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/events">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      View All Events
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <ListTodo className="h-4 w-4 mr-2" />
                    My Tasks
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

interface StatsCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  variant?: 'default' | 'danger' | 'warning'
}

function StatsCard({ title, value, description, icon, variant = 'default' }: StatsCardProps) {
  return (
    <Card
      className={
        variant === 'danger'
          ? 'border-red-200 bg-red-50/50'
          : variant === 'warning'
          ? 'border-yellow-200 bg-yellow-50/50'
          : ''
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
