import { prisma } from "./prisma"

export async function createSystemNotification(
  userId: string,
  message: string,
  taskId?: string
) {
  return await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      message,
      taskId: taskId || null,
    },
  })
}

export async function createHumanNotification(
  userId: string,
  message: string,
  taskId?: string
) {
  return await prisma.notification.create({
    data: {
      userId,
      type: "HUMAN",
      message,
      taskId: taskId || null,
    },
  })
}

export async function checkAndCreateOverdueNotifications() {
  const now = new Date()
  const overdueTasks = await prisma.task.findMany({
    where: {
      deadline: {
        lt: now,
      },
      status: {
        not: "DONE",
      },
    },
    include: {
      owner: true,
    },
  })

  for (const task of overdueTasks) {
    // Check if notification already exists for this task
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.ownerId,
        taskId: task.id,
        message: {
          contains: "overdue",
        },
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    })

    if (!existingNotification) {
      await createSystemNotification(
        task.ownerId,
        `Task "${task.title}" is overdue`,
        task.id
      )
    }
  }
}

export async function checkAndCreateBlockedNotifications(thresholdHours: number = 24) {
  const threshold = new Date()
  threshold.setHours(threshold.getHours() - thresholdHours)

  const blockedTasks = await prisma.task.findMany({
    where: {
      status: "BLOCKED",
      updatedAt: {
        lte: threshold,
      },
    },
    include: {
      owner: true,
    },
  })

  for (const task of blockedTasks) {
    // Check if notification already exists for this task
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.ownerId,
        taskId: task.id,
        message: {
          contains: "blocked",
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    })

    if (!existingNotification) {
      await createSystemNotification(
        task.ownerId,
        `Task "${task.title}" has been blocked for more than ${thresholdHours} hours`,
        task.id
      )
    }
  }
}

export async function checkAndCreateApproachingDeadlineNotifications() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const approachingTasks = await prisma.task.findMany({
    where: {
      deadline: {
        gte: now,
        lte: tomorrow,
      },
      status: {
        not: "DONE",
      },
    },
    include: {
      owner: true,
    },
  })

  for (const task of approachingTasks) {
    // Check if notification already exists for this task
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.ownerId,
        taskId: task.id,
        message: {
          contains: "deadline approaching",
        },
        createdAt: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000), // Last 12 hours
        },
      },
    })

    if (!existingNotification) {
      await createSystemNotification(
        task.ownerId,
        `Task "${task.title}" deadline is approaching (due tomorrow)`,
        task.id
      )
    }
  }
}

