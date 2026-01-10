/**
 * Prisma Usage Examples
 * 
 * This file demonstrates how to use Prisma Client in your Next.js application
 * with Supabase PostgreSQL database.
 */

import { prisma } from '@/lib/prisma'

// ============================================
// Example 1: Fetch all events
// ============================================
export async function getAllEvents() {
  const events = await prisma.events.findMany({
    include: {
      organizers: true,
      calendars: true,
      calendar_events: true,
    },
  })
  return events
}

// ============================================
// Example 2: Create a new event
// ============================================
export async function createEvent(organizerId: string, data: {
  name: string
  description?: string
  venue?: string
  start_date?: Date
  end_date?: Date
  icon?: string
}) {
  const event = await prisma.events.create({
    data: {
      organizer_id: organizerId,
      ...data,
    },
  })
  return event
}

// ============================================
// Example 3: Get event with all relations
// ============================================
export async function getEventById(eventId: string) {
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    include: {
      organizers: true,
      calendars: {
        include: {
          calendar_events: true,
        },
      },
      event_members: {
        include: {
          users: true,
        },
      },
      event_teams: {
        include: {
          team_members: true,
        },
      },
      tasks: true,
    },
  })
  return event
}

// ============================================
// Example 4: Get calendar events for a date range
// ============================================
export async function getCalendarEvents(
  eventId: string,
  startDate: Date,
  endDate: Date
) {
  const calendarEvents = await prisma.calendar_events.findMany({
    where: {
      event_id: eventId,
      start_time: {
        gte: startDate,
      },
      end_time: {
        lte: endDate,
      },
    },
    include: {
      calendars: true,
    },
    orderBy: {
      start_time: 'asc',
    },
  })
  return calendarEvents
}

// ============================================
// Example 5: Create a task
// ============================================
export async function createTask(data: {
  event_id: string
  column_id: string
  title: string
  description?: string
  priority?: string
  due_at?: Date
}) {
  const task = await prisma.tasks.create({
    data,
  })
  return task
}

// ============================================
// Example 6: Get team members for an event
// ============================================
export async function getEventTeamMembers(eventId: string) {
  const members = await prisma.event_members.findMany({
    where: {
      event_id: eventId,
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
        },
      },
      team_members: {
        include: {
          event_teams: true,
        },
      },
    },
  })
  return members
}

// ============================================
// Usage in Next.js API Routes or Server Actions
// ============================================

// Server Action example (app directory)
export async function getEventsForOrganizer(organizerId: string) {
  'use server'
  
  const events = await prisma.events.findMany({
    where: {
      organizer_id: organizerId,
    },
    orderBy: {
      created_at: 'desc',
    },
  })
  
  return events
}

// API Route example (app/api/events/route.ts)
// export async function GET() {
//   const events = await prisma.events.findMany()
//   return Response.json(events)
// }
