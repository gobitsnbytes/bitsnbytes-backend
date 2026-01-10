import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Test API route to verify Prisma integration with Supabase
 * GET /api/test-prisma - Tests database connection and queries
 */
export async function GET(request: NextRequest) {
  try {
    // Test 1: Count organizers
    const organizerCount = await prisma.organizers.count()

    // Test 2: Count events
    const eventCount = await prisma.events.count()

    // Test 3: Get recent events with relations
    const recentEvents = await prisma.events.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        organizers: {
          select: {
            email: true,
            display_name: true,
          },
        },
        calendars: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // Test 4: Database raw query test
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`

    return NextResponse.json({
      success: true,
      message: 'Prisma integration working successfully!',
      data: {
        organizerCount,
        eventCount,
        recentEvents,
        databaseInfo: result,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Prisma test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute Prisma queries',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
