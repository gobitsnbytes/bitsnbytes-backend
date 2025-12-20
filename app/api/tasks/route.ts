import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskCategory, TaskStatus } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const ownerId = searchParams.get("ownerId")
    const category = searchParams.get("category") as TaskCategory | null
    const status = searchParams.get("status") as TaskStatus | null

    const where: any = {}
    if (eventId) where.eventId = eventId
    if (ownerId) where.ownerId = ownerId
    if (category) where.category = category
    if (status) where.status = status

    // Core members can only see their own tasks, organizers can see all
    if (session.user.role === "CORE_MEMBER") {
      where.ownerId = session.user.id
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        graphicsTask: true,
        outreachTask: true,
        sponsorshipTask: true,
        logisticsTask: true,
      },
      orderBy: {
        deadline: "asc",
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, category, title, deadline, ownerId } = body

    if (!eventId || !category || !title || !deadline) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Use provided ownerId or default to current user
    const taskOwnerId = ownerId || session.user.id

    const task = await prisma.task.create({
      data: {
        eventId,
        category,
        title,
        deadline: new Date(deadline),
        ownerId: taskOwnerId,
        status: "PENDING",
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}

