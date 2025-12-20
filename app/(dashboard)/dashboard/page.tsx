"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import TaskList from "@/app/components/dashboard/TaskList"
import { TaskStatus } from "@/types"

interface Task {
  id: string
  title: string
  category: string
  status: TaskStatus
  deadline: string
  blockerNote?: string | null
  event: {
    name: string
  }
  owner: {
    name: string
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchTasks()
    }
  }, [status, router])

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (
    taskId: string,
    newStatus: TaskStatus,
    blockerNote?: string
  ) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          blockerNote: blockerNote || undefined,
        }),
      })

      if (response.ok) {
        // Optimistic update
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: newStatus,
                  blockerNote: blockerNote || task.blockerNote,
                }
              : task
          )
        )
        // Refresh to get latest data
        await fetchTasks()
      } else {
        throw new Error("Failed to update task")
      }
    } catch (error) {
      console.error("Failed to update task status:", error)
      throw error
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const tasksDueToday = tasks.filter((task) => {
    const taskDate = new Date(task.deadline)
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
    return taskDay.getTime() === today.getTime() && task.status !== "DONE"
  })

  const overdueTasks = tasks.filter((task) => {
    return new Date(task.deadline) < now && task.status !== "DONE"
  })

  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED")

  const upcomingTasks = tasks.filter((task) => {
    const taskDate = new Date(task.deadline)
    return (
      taskDate > now &&
      taskDate <= nextWeek &&
      task.status !== "DONE" &&
      taskDate.getTime() !== today.getTime()
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Execution Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {session.user?.name}. Here's what needs your attention.
          </p>
        </div>

        <TaskList
          tasks={tasksDueToday}
          onStatusUpdate={handleStatusUpdate}
          title="Due Today"
          emptyMessage="No tasks due today"
        />

        <TaskList
          tasks={overdueTasks}
          onStatusUpdate={handleStatusUpdate}
          title="Overdue"
          emptyMessage="No overdue tasks"
        />

        <TaskList
          tasks={blockedTasks}
          onStatusUpdate={handleStatusUpdate}
          title="Blocked"
          emptyMessage="No blocked tasks"
        />

        <TaskList
          tasks={upcomingTasks}
          onStatusUpdate={handleStatusUpdate}
          title="Upcoming (Next 7 Days)"
          emptyMessage="No upcoming tasks"
        />
      </div>
    </div>
  )
}

