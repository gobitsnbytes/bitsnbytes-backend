import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, channel, contentLink, scheduledTime, ownerId } = body

    if (!taskId || !channel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const outreachTask = await prisma.outreachTask.create({
      data: {
        taskId,
        ownerId: ownerId || session.user.id,
        channel,
        contentLink: contentLink || null,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        status: "PENDING",
      },
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(outreachTask, { status: 201 })
  } catch (error) {
    console.error("Error creating outreach task:", error)
    return NextResponse.json(
      { error: "Failed to create outreach task" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, outcomeNote } = body

    if (!id) {
      return NextResponse.json(
        { error: "Missing task ID" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (outcomeNote !== undefined) updateData.outcomeNote = outcomeNote

    const outreachTask = await prisma.outreachTask.update({
      where: { id },
      data: updateData,
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(outreachTask)
  } catch (error) {
    console.error("Error updating outreach task:", error)
    return NextResponse.json(
      { error: "Failed to update outreach task" },
      { status: 500 }
    )
  }
}

