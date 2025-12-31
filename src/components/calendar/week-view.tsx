'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  getWeekDays,
  getHoursOfDay,
  formatHour,
  format,
  isToday,
  isSameDay,
  getTimeFromPosition,
  parseCalendarEventTime,
  setHours,
  setMinutes,
  calculateOverlappingPositions,
  getEventOverlapStyle,
  formatTime,
  categorizeEvents,
  calculateMultiDayEventPositions,
  eventOccursOnDay,
  getEventTimesForDay,
  isMultiDayEvent,
  startOfDay,
  type EventWithPosition,
  type MultiDayEventPosition,
} from '@/lib/calendar-utils'
import type { CalendarEvent, Calendar } from '@/lib/database.types'
import { CalendarEntry } from './calendar-entry'

interface WeekViewProps {
  date: Date
  events: CalendarEvent[]
  calendars: Calendar[]
  onSlotClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onCreateEvent?: (start: Date, end: Date) => void
  popoverOpen?: boolean
}

// Snap to 15 minute intervals
const SNAP_MINUTES = 15
const HOUR_HEIGHT = 64 // pixels per hour
const ALL_DAY_ROW_HEIGHT = 24 // pixels per all-day event row

function snapToGrid(y: number): number {
  const minutesPerPixel = 60 / HOUR_HEIGHT
  const minutes = y * minutesPerPixel
  const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return (snappedMinutes / 60) * HOUR_HEIGHT
}

export function WeekView({ 
  date, 
  events, 
  calendars,
  onSlotClick, 
  onEventClick,
  onEventDrop,
  onCreateEvent,
  popoverOpen,
}: WeekViewProps) {
  const days = getWeekDays(date)
  const hours = getHoursOfDay()
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Create a map of calendar IDs to calendar objects for easy lookup
  const calendarMap = calendars.reduce((acc, calendar) => {
    acc[calendar.id] = calendar
    return acc
  }, {} as Record<string, Calendar>)
  
  // Drag state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dragPreview, setDragPreview] = useState<{ day: number; top: number; height: number } | null>(null)
  const [dragOffset, setDragOffset] = useState<number>(0) // Offset from top of event where user clicked
  
  // Resize state
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null)
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null)
  const [resizePreview, setResizePreview] = useState<{ top: number; height: number } | null>(null)
  
  // Drag-to-create state
  const [isCreating, setIsCreating] = useState(false)
  const [createStart, setCreateStart] = useState<{ day: Date; y: number } | null>(null)
  const [createPreview, setCreatePreview] = useState<{ day: Date; top: number; height: number } | null>(null)

  // Categorize events into regular and multi-day
  const { regularEvents, multiDayEvents } = useMemo(() => 
    categorizeEvents(events), [events]
  )

  // Calculate multi-day event positions for the all-day section
  const multiDayPositions = useMemo(() => 
    calculateMultiDayEventPositions(multiDayEvents, days), [multiDayEvents, days]
  )

  // Calculate the height of the all-day section based on number of rows
  const allDayRowCount = useMemo(() => {
    if (multiDayPositions.length === 0) return 0
    return Math.max(...multiDayPositions.map(p => p.row)) + 1
  }, [multiDayPositions])

  // Memoized calculation of events per day with overlap positions (regular events only)
  const eventsPerDay = useMemo(() => {
    const result = new Map<string, EventWithPosition[]>()
    
    for (const day of days) {
      const dayKey = day.toISOString()
      // Include regular events that start on this day
      // AND multi-day event segments for this day (shown in time grid with clamped times)
      const dayRegularEvents = regularEvents.filter(event => {
        const eventStart = parseCalendarEventTime(event.start_time)
        return isSameDay(eventStart, day)
      })
      
      const positionedEvents = calculateOverlappingPositions(dayRegularEvents)
      result.set(dayKey, positionedEvents)
    }
    
    return result
  }, [regularEvents, days])

  // Handle drag start for moving events
  const handleDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggedEvent(event)
    
    // Calculate offset from the top of the event where user clicked
    if (!isMultiDayEvent(event) && gridRef.current) {
      const eventStart = parseCalendarEventTime(event.start_time)
      const eventTopMinutes = eventStart.getHours() * 60 + eventStart.getMinutes()
      const eventTopPx = (eventTopMinutes / 60) * HOUR_HEIGHT
      
      const gridRect = gridRef.current.getBoundingClientRect()
      const clickY = e.clientY - gridRect.top + gridRef.current.scrollTop
      const offset = clickY - eventTopPx
      setDragOffset(offset)
    } else {
      setDragOffset(0)
    }
  }, [])

  // Handle resize start
  const handleResizeStart = useCallback((event: CalendarEvent, e: React.MouseEvent, edge: 'top' | 'bottom') => {
    e.stopPropagation()
    e.preventDefault()
    setResizingEvent(event)
    setResizeEdge(edge)
  }, [])

  // Handle drag-to-create start
  const handleCreateStart = useCallback((day: Date, e: React.MouseEvent) => {
    if (draggedEvent || resizingEvent || popoverOpen) return
    if (!gridRef.current) return
    
    // Use grid rect for consistent coordinate calculation with handleMouseMove
    const gridRect = gridRef.current.getBoundingClientRect()
    const y = e.clientY - gridRect.top + gridRef.current.scrollTop
    const snappedY = snapToGrid(y)
    
    setIsCreating(true)
    setCreateStart({ day, y: snappedY })
    setCreatePreview({ day, top: snappedY, height: HOUR_HEIGHT / 2 }) // Default 30 min
  }, [draggedEvent, resizingEvent, popoverOpen])

  // Handle mouse move for all drag operations
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // For all-day event dragging, we can calculate day index from the event target
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    // Calculate day width (account for time column width of 60px)
    const timeColumnWidth = 60
    const effectiveWidth = rect.width - timeColumnWidth
    const dayWidth = effectiveWidth / 7
    const x = e.clientX - rect.left - timeColumnWidth
    const dayIndex = Math.max(0, Math.min(6, Math.floor(x / dayWidth)))

    // Handle event dragging
    if (draggedEvent) {
      // Check if dragged event is a multi-day/all-day event
      if (isMultiDayEvent(draggedEvent)) {
        // For multi-day events, just show which day it would move to
        setDragPreview({ day: dayIndex, top: 0, height: ALL_DAY_ROW_HEIGHT })
        return
      } else if (gridRef.current) {
        const gridRect = gridRef.current.getBoundingClientRect()
        const gridX = e.clientX - gridRect.left - timeColumnWidth
        const gridDayWidth = (gridRect.width - timeColumnWidth) / 7
        const gridDayIndex = Math.max(0, Math.min(6, Math.floor(gridX / gridDayWidth)))
        const y = e.clientY - gridRect.top + gridRef.current.scrollTop
        
        // Subtract the offset so the preview stays where user grabbed it
        const adjustedY = y - dragOffset
        const snappedY = snapToGrid(adjustedY)
        
        const eventStart = parseCalendarEventTime(draggedEvent.start_time)
        const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
        const duration = eventEnd.getTime() - eventStart.getTime()
        const heightPx = (duration / (1000 * 60 * 60)) * HOUR_HEIGHT
        
        setDragPreview({ day: gridDayIndex, top: snappedY, height: heightPx })
        return
      }
    }

    // For operations that need gridRef, return early if not available
    if (!gridRef.current) return
    
    const gridRect = gridRef.current.getBoundingClientRect()
    const y = e.clientY - gridRect.top + gridRef.current.scrollTop

    // Handle resizing
    if (resizingEvent && resizeEdge) {
      const eventStart = parseCalendarEventTime(resizingEvent.start_time)
      const eventEnd = parseCalendarEventTime(resizingEvent.end_time)
      const eventDay = new Date(eventStart)
      eventDay.setHours(0, 0, 0, 0)
      
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes()
      const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes()
      const startTop = (startMinutes / 60) * HOUR_HEIGHT
      const endTop = (endMinutes / 60) * HOUR_HEIGHT
      
      const snappedY = snapToGrid(y)
      
      if (resizeEdge === 'top') {
        const newTop = Math.min(snappedY, endTop - HOUR_HEIGHT / 4) // Min 15 min
        const newHeight = endTop - newTop
        setResizePreview({ top: newTop, height: newHeight })
      } else {
        const newBottom = Math.max(snappedY, startTop + HOUR_HEIGHT / 4) // Min 15 min
        const newHeight = newBottom - startTop
        setResizePreview({ top: startTop, height: newHeight })
      }
    }

    // Handle drag-to-create
    if (isCreating && createStart) {
      const snappedY = snapToGrid(y)
      const startY = createStart.y
      const minHeight = HOUR_HEIGHT / 4 // 15 minutes minimum
      
      if (snappedY >= startY) {
        // Dragging downward: start stays fixed, end extends if needed
        const height = Math.max(snappedY - startY, minHeight)
        setCreatePreview({ day: createStart.day, top: startY, height })
      } else {
        // Dragging upward: end stays at start position, top moves up
        const height = Math.max(startY - snappedY, minHeight)
        const top = startY - height
        setCreatePreview({ day: createStart.day, top, height })
      }
    }
  }, [draggedEvent, resizingEvent, resizeEdge, isCreating, createStart])

  // Handle mouse up for all drag operations
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Handle all-day event drop (doesn't need gridRef)
    if (draggedEvent && dragPreview && isMultiDayEvent(draggedEvent)) {
      const eventStart = parseCalendarEventTime(draggedEvent.start_time)
      const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
      
      // Calculate the day offset
      const originalStartDay = new Date(eventStart)
      originalStartDay.setHours(0, 0, 0, 0)
      const originalDayIndex = days.findIndex(d => isSameDay(d, originalStartDay))
      const dayOffset = dragPreview.day - originalDayIndex
      
      // Move the event by the day offset
      const newStart = new Date(eventStart)
      newStart.setDate(newStart.getDate() + dayOffset)
      const newEnd = new Date(eventEnd)
      newEnd.setDate(newEnd.getDate() + dayOffset)
      
      onEventDrop(draggedEvent, newStart, newEnd)
      
      // Reset states
      setDraggedEvent(null)
      setDragPreview(null)
      setDragOffset(0)
      return
    }
    
    if (!gridRef.current) {
      // Reset states even if no gridRef
      setDraggedEvent(null)
      setDragPreview(null)
      setDragOffset(0)
      setResizingEvent(null)
      setResizeEdge(null)
      setResizePreview(null)
      setIsCreating(false)
      setCreateStart(null)
      setCreatePreview(null)
      return
    }

    const gridRect = gridRef.current.getBoundingClientRect()
    const timeColumnWidth = 60
    const dayWidth = (gridRect.width - timeColumnWidth) / 7
    
    const x = e.clientX - gridRect.left - timeColumnWidth
    const y = e.clientY - gridRect.top + gridRef.current.scrollTop

    // Complete event drag (regular events only now since multi-day handled above)
    if (draggedEvent && dragPreview) {
      const eventStart = parseCalendarEventTime(draggedEvent.start_time)
      const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
      
      // Regular time-based event
      const targetDay = days[dragPreview.day]
      const targetTime = getTimeFromPosition(dragPreview.top, targetDay)
      const duration = eventEnd.getTime() - eventStart.getTime()
      
      const newStart = targetTime
      const newEnd = new Date(newStart.getTime() + duration)
      
      onEventDrop(draggedEvent, newStart, newEnd)
    }

    // Complete resize
    if (resizingEvent && resizePreview && resizeEdge) {
      const eventStart = parseCalendarEventTime(resizingEvent.start_time)
      const eventEnd = parseCalendarEventTime(resizingEvent.end_time)
      const eventDay = new Date(eventStart)
      eventDay.setHours(0, 0, 0, 0)
      
      let newStart = eventStart
      let newEnd = eventEnd
      
      if (resizeEdge === 'top') {
        newStart = getTimeFromPosition(resizePreview.top, eventDay)
      } else {
        newEnd = getTimeFromPosition(resizePreview.top + resizePreview.height, eventDay)
      }
      
      onEventDrop(resizingEvent, newStart, newEnd)
    }

    // Complete drag-to-create
    if (isCreating && createPreview && onCreateEvent) {
      const startTime = getTimeFromPosition(createPreview.top, createPreview.day)
      const endTime = getTimeFromPosition(createPreview.top + createPreview.height, createPreview.day)
      onCreateEvent(startTime, endTime)
    }

    // Reset all states
    setDraggedEvent(null)
    setDragPreview(null)
    setDragOffset(0)
    setResizingEvent(null)
    setResizeEdge(null)
    setResizePreview(null)
    setIsCreating(false)
    setCreateStart(null)
    setCreatePreview(null)
  }, [draggedEvent, dragPreview, resizingEvent, resizePreview, resizeEdge, isCreating, createPreview, onCreateEvent, days, onEventDrop])

  // Cancel on mouse leave
  const handleMouseLeave = useCallback(() => {
    setDraggedEvent(null)
    setDragPreview(null)
    setDragOffset(0)
    setResizingEvent(null)
    setResizeEdge(null)
    setResizePreview(null)
    setIsCreating(false)
    setCreateStart(null)
    setCreatePreview(null)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="flex flex-1 flex-col overflow-hidden"
    >
      {/* Time grid - wrapped in ScrollArea */}
      <ScrollArea className="flex-1 h-full">
        {/* Header with day names */}
        <div className="sticky top-0 z-20 flex border-b bg-background">
          <div className="w-15 shrink-0 border-r" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 border-r py-2 text-center',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div className="text-xs text-muted-foreground">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'text-lg font-semibold',
                isToday(day) && 'text-primary'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* All-day / Multi-day events section */}
        {allDayRowCount > 0 && (
          <div 
            className="sticky top-[57px] z-20 flex border-b bg-background"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className="w-15 shrink-0 border-r flex items-center justify-end pr-2 bg-background">
              <span className="text-[10px] text-muted-foreground">all-day</span>
            </div>
            <div className="flex flex-1 relative" style={{ minHeight: `${allDayRowCount * ALL_DAY_ROW_HEIGHT + 8}px` }}>
              {/* Day column backgrounds - also serve as drop targets for all-day events */}
              {days.map((day, dayIndex) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-1 border-r',
                    isToday(day) && 'bg-primary/5',
                    draggedEvent && isMultiDayEvent(draggedEvent) && dragPreview?.day === dayIndex && 'bg-primary/20'
                  )}
                />
              ))}
              
              {/* Multi-day event bars */}
              {multiDayPositions.map(({ event, startDayIndex, endDayIndex, row }) => {
                const leftPercent = (startDayIndex / 7) * 100
                const widthPercent = ((endDayIndex - startDayIndex + 1) / 7) * 100
                const calendar = event.calendar_id ? calendarMap[event.calendar_id] : undefined
                const isEventStart = startDayIndex === 0 || isSameDay(days[startDayIndex], startOfDay(parseCalendarEventTime(event.start_time)))
                const isEventEnd = endDayIndex === 6 || isSameDay(days[endDayIndex], startOfDay(parseCalendarEventTime(event.end_time)))
                
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    onMouseDown={(e) => handleDragStart(event, e)}
                    className={cn(
                      'absolute flex items-center text-xs font-medium truncate transition-colors overflow-hidden',
                      'cursor-grab hover:brightness-110',
                      isEventStart && isEventEnd && 'rounded-sm',
                      isEventStart && !isEventEnd && 'rounded-l-sm',
                      !isEventStart && isEventEnd && 'rounded-r-sm',
                      !isEventStart && !isEventEnd && 'rounded-none',
                      draggedEvent?.id === event.id && 'opacity-50'
                    )}
                    style={{
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      top: `${row * ALL_DAY_ROW_HEIGHT + 4}px`,
                      height: `${ALL_DAY_ROW_HEIGHT - 4}px`,
                      backgroundColor: calendar?.color ? `${calendar.color}20` : 'hsl(var(--primary) / 0.1)',
                      color: calendar?.color || 'hsl(var(--foreground))',
                    }}
                    title={event.title}
                  >
                    {/* Accent bar on left */}
                    {isEventStart && (
                      <div 
                        className="w-1 h-full shrink-0 rounded-l-sm"
                        style={{ backgroundColor: calendar?.color || 'hsl(var(--primary))' }}
                      />
                    )}
                    <span className="px-2 truncate">{event.title}</span>
                  </button>
                )
              })}
              
              {/* Drag preview for all-day events */}
              {draggedEvent && isMultiDayEvent(draggedEvent) && dragPreview && (() => {
                const eventStart = parseCalendarEventTime(draggedEvent.start_time)
                const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
                const startDay = new Date(eventStart)
                startDay.setHours(0, 0, 0, 0)
                const endDay = new Date(eventEnd)
                endDay.setHours(0, 0, 0, 0)
                const eventDurationDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
                
                // Calculate where the event would be placed
                const previewEndDay = Math.min(dragPreview.day + eventDurationDays - 1, 6)
                const previewStartDay = dragPreview.day
                const widthDays = previewEndDay - previewStartDay + 1
                
                return (
                  <div
                    className="absolute rounded-sm bg-primary/30 border-2 border-primary border-dashed pointer-events-none"
                    style={{
                      left: `calc(${(previewStartDay / 7) * 100}% + 2px)`,
                      width: `calc(${(widthDays / 7) * 100}% - 4px)`,
                      top: '4px',
                      height: `${ALL_DAY_ROW_HEIGHT - 4}px`,
                    }}
                  />
                )
              })()}
            </div>
          </div>
        )}
        
        <div 
          ref={gridRef}
          className="relative flex"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Time column */}
          <div className="sticky left-0 z-10 w-15 shrink-0 border-r bg-background">
            {hours.map((hour, index) => (
              <div
                key={hour.toISOString()}
                className="relative h-16 border-b px-2"
              >
                {index < hours.length - 1 && (
                  <span className="absolute top-0 right-2 text-xs text-muted-foreground">
                    {formatHour(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayKey = day.toISOString()
            const dayEvents = eventsPerDay.get(dayKey) || []
            const dayStart = new Date(day)
          dayStart.setHours(0, 0, 0, 0)
          
          return (
            <div
              key={dayKey}
              className={cn(
                'relative flex-1 border-r',
                isToday(day) && 'bg-primary/5'
              )}
              onMouseDown={(e) => handleCreateStart(day, e)}
            >
              {/* Hour slots */}
              {hours.map((hour) => (
                <div
                  key={hour.toISOString()}
                  className="h-16 border-b"
                />
              ))}

              {/* Drag-to-create preview */}
              {createPreview && isSameDay(createPreview.day, day) && (
                <div
                  className="absolute left-1 right-1 rounded-sm border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-40"
                  style={{
                    top: `${createPreview.top}px`,
                    height: `${createPreview.height}px`,
                  }}
                >
                  <div className="px-1.5 py-0.5 text-xs text-primary font-medium">
                    New Event
                  </div>
                  <div className="px-1.5 text-[10px] text-muted-foreground">
                    {formatTime(getTimeFromPosition(createPreview.top, day))} - {formatTime(getTimeFromPosition(createPreview.top + createPreview.height, day))}
                  </div>
                </div>
              )}

              {/* Drag preview for moving events */}
              {dragPreview && dragPreview.day === dayIndex && draggedEvent && (() => {
                const draggedCalendar = draggedEvent.calendar_id ? calendarMap[draggedEvent.calendar_id] : undefined
                const previewColor = draggedCalendar?.color || 'hsl(var(--primary))'
                return (
                  <div
                    className="absolute rounded-sm border-2 border-dashed pointer-events-none z-40 overflow-hidden"
                    style={{
                      top: `${dragPreview.top}px`,
                      height: `${dragPreview.height}px`,
                      left: '2px',
                      width: 'calc(100% - 4px)',
                      borderColor: previewColor,
                      backgroundColor: `${draggedCalendar?.color || 'hsl(var(--primary))'}20`,
                    }}
                  >
                    {/* Accent bar */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: previewColor }}
                    />
                    <div className="pl-2.5 pr-1.5 py-0.5">
                      <div className="text-xs font-medium truncate" style={{ color: previewColor }}>
                        {draggedEvent.title}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Events with overlap handling */}
              {dayEvents.map((event) => {
                const style = getEventOverlapStyle(event, dayStart)
                const isBeingResized = resizingEvent?.id === event.id
                const calendar = event.calendar_id ? calendarMap[event.calendar_id] : undefined

                // Apply resize preview if this event is being resized
                const displayStyle = isBeingResized && resizePreview
                  ? { ...style, top: resizePreview.top, height: resizePreview.height }
                  : style

                return (
                  <CalendarEntry
                    key={event.id}
                    event={event}
                    style={displayStyle}
                    color={calendar?.color}
                    onClick={() => onEventClick(event)}
                    onDragStart={(e) => handleDragStart(event, e)}
                    onResizeStart={(e, edge) => handleResizeStart(event, e, edge)}
                    isDragging={draggedEvent?.id === event.id}
                    isResizing={isBeingResized}
                  />
                )
              })}
            </div>
          )
        })}
        </div>
      </ScrollArea>
    </div>
  )
}
