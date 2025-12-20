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
    const { taskId, currentStage, nextAction, followUpDeadline, ownerId } = body

    if (!taskId || !currentStage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const sponsorshipTask = await prisma.sponsorshipTask.create({
      data: {
        taskId,
        ownerId: ownerId || session.user.id,
        currentStage,
        nextAction: nextAction || null,
        followUpDeadline: followUpDeadline ? new Date(followUpDeadline) : null,
        statusHistory: [],
      },
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(sponsorshipTask, { status: 201 })
  } catch (error) {
    console.error("Error creating sponsorship task:", error)
    return NextResponse.json(
      { error: "Failed to create sponsorship task" },
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
    const { id, currentStage, nextAction, followUpDeadline, statusHistory } = body

    if (!id) {
      return NextResponse.json(
        { error: "Missing task ID" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (currentStage !== undefined) updateData.currentStage = currentStage
    if (nextAction !== undefined) updateData.nextAction = nextAction
    if (followUpDeadline !== undefined)
      updateData.followUpDeadline = followUpDeadline
        ? new Date(followUpDeadline)
        : null
    if (statusHistory !== undefined) updateData.statusHistory = statusHistory

    const sponsorshipTask = await prisma.sponsorshipTask.update({
      where: { id },
      data: updateData,
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(sponsorshipTask)
  } catch (error) {
    console.error("Error updating sponsorship task:", error)
    return NextResponse.json(
      { error: "Failed to update sponsorship task" },
      { status: 500 }
    )
  }
}

