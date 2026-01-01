'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { 
  CalendarDots, 
  Plus, 
  Gear, 
  SignOut,
  CaretUpDown,
  Check,
  Sparkle,
  SquaresFour,
  House,
  CheckCircle,
  UsersThree
} from '@phosphor-icons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEvents } from '@/hooks/use-events'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/database.types'

interface AppSidebarProps {
  onOpenSettings: () => void
  onCreateEvent: () => void
}

export function AppSidebar({ onOpenSettings, onCreateEvent }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: events, isLoading } = useEvents()
  const currentEventId = useAppStore((state) => state.currentEventId)
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  const { isMobile, setOpenMobile } = useSidebar()

  const currentEvent = events?.find(e => e.id === currentEventId)

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

  const handleEventSelect = (event: Event) => {
    setCurrentEventId(event.id)
    if (isMobile) {
      setOpenMobile(false)
    }
    router.push(`/events/${event.id}`)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-none text-lg">
                    {currentEvent?.icon || '🎉'}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {currentEvent?.name || 'Select Event'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {currentEvent ? (formatEventDates(currentEvent) || currentEvent.venue || 'No dates set') : 'No event selected'}
                    </span>
                  </div>
                  <CaretUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-none"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {isLoading ? (
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : events && events.length > 0 ? (
                  events.map((event) => (
                    <DropdownMenuItem
                      key={event.id}
                      onClick={() => handleEventSelect(event)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-none border text-sm">
                        {event.icon || '🎉'}
                      </div>
                      <span className="flex-1 truncate">{event.name}</span>
                      {event.id === currentEventId && (
                        <Check className="size-4" />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No events yet
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateEvent} className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-none border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <span className="font-medium">Create Event</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {currentEventId ? (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes('/dashboard')}
                    tooltip="Dashboard"
                  >
                    <Link href={`/events/${currentEventId}/dashboard`}>
                      <House className="size-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    disabled
                    tooltip="Dashboard"
                    className="opacity-50 cursor-not-allowed"
                  >
                    <House className="size-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {currentEventId ? (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes('/tasks')}
                    tooltip="Tasks"
                  >
                    <Link href={`/events/${currentEventId}/tasks`}>
                      <CheckCircle className="size-4" />
                      <span>Tasks</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    disabled
                    tooltip="Tasks"
                    className="opacity-50 cursor-not-allowed"
                  >
                    <CheckCircle className="size-4" />
                    <span>Tasks</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {currentEventId ? (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes('/team')}
                    tooltip="Team"
                  >
                    <Link href={`/events/${currentEventId}/team`}>
                      <UsersThree className="size-4" />
                      <span>Team</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    disabled
                    tooltip="Team"
                    className="opacity-50 cursor-not-allowed"
                  >
                    <UsersThree className="size-4" />
                    <span>Team</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {currentEventId ? (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes('/calendar')}
                    tooltip="Calendar"
                  >
                    <Link href={`/events/${currentEventId}/calendar`}>
                      <CalendarDots className="size-4" />
                      <span>Calendar</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    disabled
                    tooltip="Calendar"
                    className="opacity-50 cursor-not-allowed"
                  >
                    <CalendarDots className="size-4" />
                    <span>Calendar</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Events">
              <Link href="/">
                <SquaresFour className="size-4" />
                <span>Events</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onOpenSettings}
              tooltip="Settings"
              className="cursor-pointer"
            >
              <Gear className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              tooltip="Sign out"
              className="cursor-pointer"
            >
              <SignOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
