import { NextRequest, NextResponse } from "next/server"
import {
  checkAndCreateOverdueNotifications,
  checkAndCreateBlockedNotifications,
  checkAndCreateApproachingDeadlineNotifications,
} from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by a cron job or scheduled task
    // For MVP, we'll call it manually or on-demand

    await checkAndCreateOverdueNotifications()
    await checkAndCreateBlockedNotifications(24) // 24 hour threshold
    await checkAndCreateApproachingDeadlineNotifications()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error checking notifications:", error)
    return NextResponse.json(
      { error: "Failed to check notifications" },
      { status: 500 }
    )
  }
}

