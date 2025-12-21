'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEventsStore } from '@/stores/eventsStore'
import { useAuthStore } from '@/stores/authStore'
import type { Event } from '@/lib/schemas'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { CalendarIcon, Plus, ChevronRight, Clock, CalendarDays, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

export default function EventsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const { events, fetchEvents, createEvent, isLoading: eventsLoading } = useEventsStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState<Date | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents()
    }
  }, [isAuthenticated, fetchEvents])

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventDate) return

    setIsSubmitting(true)
    const { error } = await createEvent({
      name: newEventName,
      event_date: newEventDate.toISOString()
    })

    if (!error) {
      setIsCreating(false)
      setNewEventName('')
      setNewEventDate(undefined)
    }
    setIsSubmitting(false)
  }

  const upcomingEvents = events.filter((e) => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)))
  const pastEvents = events.filter((e) => isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date)))

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
      <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Events</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
          <div className="p-4 md:p-6 space-y-6 max-w-full">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Events</h1>
                <p className="text-muted-foreground">Manage your event execution boards</p>
              </div>
              {user?.role === 'organizer' && (
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Add a new event to start tracking its execution.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Event Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Annual Tech Conference 2025"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Event Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !newEventDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newEventDate ? format(newEventDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newEventDate}
                            onSelect={setNewEventDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      disabled={!newEventName || !newEventDate || isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </div>

          {/* Upcoming Events */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Events
            </h2>
            {eventsLoading ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <Card className="max-w-full">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming events</p>
                  {user?.role === 'organizer' && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setIsCreating(true)}
                    >
                      Create your first event
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Past Events
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} isPast />
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const eventDate = new Date(event.event_date)
  const isEventToday = isToday(eventDate)

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        className={cn(
          'transition-all hover:shadow-md cursor-pointer',
          isPast && 'opacity-70',
          isEventToday && 'border-primary ring-1 ring-primary'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{event.name}</CardTitle>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          {isEventToday && (
            <div className="mt-2 text-xs font-medium text-primary">
              Event is today!
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
