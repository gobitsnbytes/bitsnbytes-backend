import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskStatus } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
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
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Core members can only access their own tasks
    if (
      session.user.role === "CORE_MEMBER" &&
      task.ownerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if task exists and user has permission
    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Core members can only update their own tasks
    if (
      session.user.role === "CORE_MEMBER" &&
      existingTask.ownerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline)
    if (body.status !== undefined) {
      updateData.status = body.status
      // If blocking, require blockerNote
      if (body.status === "BLOCKED" && !body.blockerNote) {
        return NextResponse.json(
          { error: "Blocker note is required when blocking a task" },
          { status: 400 }
        )
      }
      if (body.status === "BLOCKED") {
        updateData.blockerNote = body.blockerNote
      }
    }
    if (body.blockerNote !== undefined) updateData.blockerNote = body.blockerNote
    if (body.ownerId !== undefined) {
      // Only organizers can reassign tasks
      if (session.user.role !== "ORGANIZER") {
        return NextResponse.json(
          { error: "Only organizers can reassign tasks" },
          { status: 403 }
        )
      }
      updateData.ownerId = body.ownerId
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only organizers can delete tasks
    if (session.user.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}

