import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Example API route using Prisma to manage events
 * Demonstrates CRUD operations with Prisma Client
 */

// GET /api/events-prisma - List all events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizerId = searchParams.get('organizerId')

    const events = await prisma.events.findMany({
      where: organizerId ? { organizer_id: organizerId } : {},
      include: {
        organizers: {
          select: {
            email: true,
            display_name: true,
          },
        },
        calendars: true,
        event_members: {
          include: {
            users: {
              select: {
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            calendar_events: true,
            tasks: true,
            event_teams: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/events-prisma - Create a new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizer_id, name, description, venue, start_date, end_date, icon } = body

    // Validate required fields
    if (!organizer_id || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'organizer_id and name are required',
        },
        { status: 400 }
      )
    }

    // Create event with Prisma
    const event = await prisma.events.create({
      data: {
        organizer_id,
        name,
        description,
        venue,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        icon: icon || '🎉',
      },
      include: {
        organizers: {
          select: {
            email: true,
            display_name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: event,
        message: 'Event created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
