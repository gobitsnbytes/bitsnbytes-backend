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
    const { taskId, status, ownerId } = body

    if (!taskId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const logisticsTask = await prisma.logisticsTask.create({
      data: {
        taskId,
        ownerId: ownerId || session.user.id,
        status,
      },
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(logisticsTask, { status: 201 })
  } catch (error) {
    console.error("Error creating logistics task:", error)
    return NextResponse.json(
      { error: "Failed to create logistics task" },
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
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const logisticsTask = await prisma.logisticsTask.update({
      where: { id },
      data: { status },
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(logisticsTask)
  } catch (error) {
    console.error("Error updating logistics task:", error)
    return NextResponse.json(
      { error: "Failed to update logistics task" },
      { status: 500 }
    )
  }
}

