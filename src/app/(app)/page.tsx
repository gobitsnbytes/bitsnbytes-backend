'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserSettings } from '@/hooks/use-settings'
import { usePlatformRole, useCities } from '@/hooks/use-rbac'
import {
  useTemplateEvents,
  usePendingEvents,
  useAcceptedEvents,
  useIgnoredEvents,
  usePushEventToCities,
  useAcceptEvent,
  useIgnoreEvent,
  useRestoreIgnoredEvent,
} from '@/hooks/use-event-distribution'
import { useAppStore } from '@/lib/store'
import {
  Plus,
  ArrowRight,
  Gear,
  SignOut,
  PaperPlaneTilt,
  Check,
  X,
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  Buildings,
  Envelope,
  CheckCircle,
  UsersThree,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { CreateEventDialog } from '@/components/create-event-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { AdminPanelDialog } from '@/components/admin-panel-dialog'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { Event } from '@/lib/database.types'

export default function HomePage() {
  const router = useRouter()
  const { data: platformRole, isLoading: isLoadingRole } = usePlatformRole()

  // Load user settings on mount
  useUserSettings()

  const isSudo = platformRole?.role === 'sudo'
  const isAdmin = platformRole?.role === 'admin'

  if (isLoadingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isSudo) {
    return <SudoDashboard />
  }

  if (isAdmin) {
    return <CityAdminDashboard />
  }

  // Regular user or no platform role
  return <RegularUserView />
}

// ============================================
// SUDO DASHBOARD
// ============================================
function SudoDashboard() {
  const router = useRouter()
  const { data: events, isLoading } = useTemplateEvents()
  const { data: cities } = useCities()
  const pushToCities = usePushEventToCities()
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  const handleEventSelect = (event: Event) => {
    setCurrentEventId(event.id)
    router.push(`/events/${event.id}`)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleOpenPushDialog = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEventId(eventId)
    setSelectedCities([])
    setPushDialogOpen(true)
  }

  const handlePush = async () => {
    if (!selectedEventId || selectedCities.length === 0) return
    try {
      await pushToCities.mutateAsync({
        eventId: selectedEventId,
        cityIds: selectedCities,
      })
      setPushDialogOpen(false)
      setSelectedEventId(null)
      setSelectedCities([])
    } catch (error) {
      console.error('Failed to push event:', error)
      // TODO: Show error toast
    }
  }

  const toggleCity = (cityId: string) => {
    setSelectedCities(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    )
  }

  const formatEventDates = (event: Event) => {
    if (!event.start_date && !event.end_date) return null
    if (event.start_date && event.end_date) {
      return `${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d, yyyy')}`
    }
    if (event.start_date) {
      return `Starts ${format(new Date(event.start_date), 'MMM d, yyyy')}`
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Event Manager</span>
            <Badge variant="secondary">Sudo</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdminPanelOpen(true)} className="gap-2">
              <UsersThree className="size-4" />
              Manage
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Gear className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <SignOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Event Templates</h1>
            <p className="text-muted-foreground">Create events and push them to city leads</p>
          </div>
          <Button onClick={() => setCreateEventOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Create Event
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-none border border-dashed py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
              🎉
            </div>
            <h2 className="mt-4 text-xl font-semibold">No events yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first event template to push to cities.
            </p>
            <Button onClick={() => setCreateEventOpen(true)} className="mt-4 gap-2">
              <Plus className="size-4" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="group cursor-pointer transition-colors hover:bg-muted/50 rounded-none"
                onClick={() => handleEventSelect(event)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-none border bg-muted text-xl">
                        {event.icon || '🎉'}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {formatEventDates(event) && (
                          <CardDescription>{formatEventDates(event)}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={(e) => handleOpenPushDialog(event.id, e)}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <PaperPlaneTilt className="size-4" />
                      </Button>
                      <ArrowRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateEventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AdminPanelDialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen} />

      {/* Push to Cities Dialog */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Event to Cities</DialogTitle>
            <DialogDescription>
              Select which cities should receive this event.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
            {cities?.map((city) => (
              <label
                key={city.id}
                className="flex items-center gap-3 p-3 border rounded-none cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedCities.includes(city.id)}
                  onCheckedChange={() => toggleCity(city.id)}
                />
                <Buildings className="size-4 text-muted-foreground" />
                <span className="font-medium">{city.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPushDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePush}
              disabled={selectedCities.length === 0 || pushToCities.isPending}
              className="gap-2"
            >
              <PaperPlaneTilt className="size-4" />
              {pushToCities.isPending ? 'Pushing...' : `Push to ${selectedCities.length} cities`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// CITY ADMIN DASHBOARD
// ============================================
function CityAdminDashboard() {
  const router = useRouter()
  const { data: platformRole } = usePlatformRole()
  const { data: pendingEvents, isLoading: loadingPending } = usePendingEvents()
  const { data: acceptedEvents, isLoading: loadingAccepted } = useAcceptedEvents()
  const { data: ignoredEvents } = useIgnoredEvents()
  const acceptEvent = useAcceptEvent()
  const ignoreEvent = useIgnoreEvent()
  const restoreEvent = useRestoreIgnoredEvent()
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)

  const handleEventSelect = (event: Event) => {
    setCurrentEventId(event.id)
    router.push(`/events/${event.id}`)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAccept = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await acceptEvent.mutateAsync(eventId)
  }

  const handleIgnore = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await ignoreEvent.mutateAsync(eventId)
  }

  const handleRestore = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await restoreEvent.mutateAsync(eventId)
  }

  const formatEventDates = (event: Event) => {
    if (!event.start_date && !event.end_date) return null
    if (event.start_date && event.end_date) {
      return `${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d, yyyy')}`
    }
    if (event.start_date) {
      return `Starts ${format(new Date(event.start_date), 'MMM d, yyyy')}`
    }
    return null
  }

  const isLoading = loadingPending || loadingAccepted

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Event Manager</span>
            <Badge variant="outline">{platformRole?.city?.name || 'Admin'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Gear className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <SignOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Pending Event Invites */}
        {pendingEvents && pendingEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Envelope className="size-5" />
              <h2 className="text-xl font-bold">Pending Invites</h2>
              <Badge>{pendingEvents.length}</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingEvents.map((event) => (
                <Card key={event.id} className="rounded-none border-primary/30 border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-none border bg-muted text-xl">
                        {event.icon || '🎉'}
                      </div>
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {formatEventDates(event) && (
                          <CardDescription>{formatEventDates(event)}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      onClick={(e) => handleAccept(event.id, e)}
                      disabled={acceptEvent.isPending}
                      className="flex-1 gap-2"
                    >
                      <Check className="size-4" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={(e) => handleIgnore(event.id, e)}
                      disabled={ignoreEvent.isPending}
                      className="flex-1 gap-2"
                    >
                      <X className="size-4" />
                      Ignore
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* My Events (Accepted) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="size-5" />
            <h2 className="text-xl font-bold">My Events</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !acceptedEvents || acceptedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-none border border-dashed py-12">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-2xl">
                📭
              </div>
              <h3 className="mt-4 font-semibold">No events yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Accept event invites to start managing them here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {acceptedEvents.map((event) => (
                <Card
                  key={event.id}
                  className="group cursor-pointer transition-colors hover:bg-muted/50 rounded-none"
                  onClick={() => handleEventSelect(event)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-none border bg-muted text-xl">
                          {event.icon || '🎉'}
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{event.name}</CardTitle>
                          {formatEventDates(event) && (
                            <CardDescription>{formatEventDates(event)}</CardDescription>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Ignored Events */}
        {ignoredEvents && ignoredEvents.length > 0 && (
          <section>
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              {showIgnored ? <CaretUp className="size-4" /> : <CaretDown className="size-4" />}
              <span className="text-sm font-medium">
                Ignored Events ({ignoredEvents.length})
              </span>
            </button>

            {showIgnored && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ignoredEvents.map((event) => (
                  <Card key={event.id} className="rounded-none opacity-60 hover:opacity-100 transition-opacity">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-none border bg-muted text-xl grayscale">
                            {event.icon || '🎉'}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{event.name}</CardTitle>
                            {formatEventDates(event) && (
                              <CardDescription>{formatEventDates(event)}</CardDescription>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={(e) => handleRestore(event.id, e)}
                          disabled={restoreEvent.isPending}
                        >
                          <ArrowCounterClockwise className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

// ============================================
// REGULAR USER VIEW (no platform role)
// ============================================
function RegularUserView() {
  const router = useRouter()
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="text-lg font-semibold">Event Manager</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Gear className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <SignOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
            👋
          </div>
          <h1 className="mt-4 text-xl font-semibold">Welcome to Event Manager</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            You don't have a platform role assigned yet.
            Contact your organization admin to get access.
          </p>
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
