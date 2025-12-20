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
    const { taskId, assetType, formats, ownerId } = body

    if (!taskId || !assetType || !formats) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const graphicsTask = await prisma.graphicsTask.create({
      data: {
        taskId,
        ownerId: ownerId || session.user.id,
        assetType,
        formats,
        status: "REQUESTED",
      },
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(graphicsTask, { status: 201 })
  } catch (error) {
    console.error("Error creating graphics task:", error)
    return NextResponse.json(
      { error: "Failed to create graphics task" },
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
    const { id, status, finalOutputLink } = body

    if (!id) {
      return NextResponse.json(
        { error: "Missing task ID" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (finalOutputLink !== undefined) updateData.finalOutputLink = finalOutputLink

    const graphicsTask = await prisma.graphicsTask.update({
      where: { id },
      data: updateData,
      include: {
        task: true,
        owner: true,
      },
    })

    return NextResponse.json(graphicsTask)
  } catch (error) {
    console.error("Error updating graphics task:", error)
    return NextResponse.json(
      { error: "Failed to update graphics task" },
      { status: 500 }
    )
  }
}

