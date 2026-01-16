'use client'

import { CaretLeft, CaretRight, ArrowsClockwise, GoogleLogo, Check, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore, type CalendarView } from '@/lib/store'
import { navigateDate, formatDateHeader } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'
import { useGoogleConnection, useSyncGoogleCalendar } from '@/hooks/use-google-calendar'

const viewOptions: { value: CalendarView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

interface CalendarHeaderProps {
  eventId?: string
}

export function CalendarHeader({ eventId }: CalendarHeaderProps) {
  const calendarDate = useAppStore((state) => state.calendarDate)
  const calendarView = useAppStore((state) => state.calendarView)
  const setCalendarDate = useAppStore((state) => state.setCalendarDate)
  const setCalendarView = useAppStore((state) => state.setCalendarView)
  const { data: googleConnection } = useGoogleConnection()
  const syncGoogle = useSyncGoogleCalendar()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    setCalendarDate(navigateDate(calendarDate, calendarView, direction))
  }

  const handleSync = async () => {
    if (!eventId) return

    try {
      await syncGoogle.mutateAsync(eventId)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 2000)
    }
  }

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleNavigate('prev')}
          >
            <CaretLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('today')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleNavigate('next')}
          >
            <CaretRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-sm font-semibold">
          {formatDateHeader(calendarDate, calendarView)}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Google Sync Button */}
        {eventId && googleConnection?.connected && (
          <Button
            variant={syncStatus === 'success' ? 'outline' : syncStatus === 'error' ? 'destructive' : 'outline'}
            size="sm"
            onClick={handleSync}
            disabled={syncGoogle.isPending}
            className={cn(
              'gap-2 transition-colors',
              syncStatus === 'success' && 'border-green-500 text-green-600',
              syncStatus === 'error' && 'border-destructive'
            )}
          >
            {syncGoogle.isPending ? (
              <ArrowsClockwise className="size-4 animate-spin" />
            ) : syncStatus === 'success' ? (
              <Check className="size-4" weight="bold" />
            ) : syncStatus === 'error' ? (
              <X className="size-4" weight="bold" />
            ) : (
              <GoogleLogo className="size-4" weight="bold" />
            )}
            {syncGoogle.isPending ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : syncStatus === 'error' ? 'Failed' : 'Sync'}
          </Button>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-none border p-1">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setCalendarView(option.value)}
              aria-label={`Switch to ${option.label} view`}
              aria-pressed={calendarView === option.value}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-none transition-colors',
                calendarView === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

