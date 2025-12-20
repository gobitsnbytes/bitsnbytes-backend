"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { TaskStatus } from "@/types"

interface Task {
  id: string
  title: string
  category: string
  status: TaskStatus
  deadline: string
  blockerNote?: string | null
  event: {
    id: string
    name: string
  }
  owner: {
    id: string
    name: string
    email: string
  }
}

interface ExecutionHealth {
  totalTasks: number
  pending: number
  inProgress: number
  blocked: number
  done: number
  overdue: number
  upcomingDeadlines: number
}

export default function OrganizerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [health, setHealth] = useState<ExecutionHealth | null>(null)
  const [blockedTasks, setBlockedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "ORGANIZER") {
        router.push("/dashboard")
        return
      }
      fetchData()
    }
  }, [status, router, session])

  const fetchData = async () => {
    try {
      const [tasksResponse, eventsResponse] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/events"),
      ])

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData)

        // Calculate health metrics
        const now = new Date()
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)

        const healthData: ExecutionHealth = {
          totalTasks: tasksData.length,
          pending: tasksData.filter((t: Task) => t.status === "PENDING").length,
          inProgress: tasksData.filter((t: Task) => t.status === "IN_PROGRESS")
            .length,
          blocked: tasksData.filter((t: Task) => t.status === "BLOCKED").length,
          done: tasksData.filter((t: Task) => t.status === "DONE").length,
          overdue: tasksData.filter(
            (t: Task) => new Date(t.deadline) < now && t.status !== "DONE"
          ).length,
          upcomingDeadlines: tasksData.filter(
            (t: Task) =>
              new Date(t.deadline) > now &&
              new Date(t.deadline) <= nextWeek &&
              t.status !== "DONE"
          ).length,
        }

        setHealth(healthData)

        // Get blocked tasks
        const blocked = tasksData.filter((t: Task) => t.status === "BLOCKED")
        setBlockedTasks(blocked)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (taskId: string) => {
    // For MVP, we'll just mark it as acknowledged by updating the task
    // In a full implementation, you might have an acknowledgment system
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Could add an acknowledged field or just leave as is
        }),
      })
      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Failed to acknowledge:", error)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session || session.user?.role !== "ORGANIZER") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Live execution health and oversight
          </p>
        </div>

        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Tasks</div>
              <div className="text-3xl font-bold text-gray-900">
                {health.totalTasks}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Blocked</div>
              <div className="text-3xl font-bold text-red-600">
                {health.blocked}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Overdue</div>
              <div className="text-3xl font-bold text-red-600">
                {health.overdue}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Upcoming (7d)</div>
              <div className="text-3xl font-bold text-blue-600">
                {health.upcomingDeadlines}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Task Status Breakdown
            </h2>
            {health && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-gray-900">
                    {health.pending}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="text-sm font-medium text-blue-600">
                    {health.inProgress}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Blocked</span>
                  <span className="text-sm font-medium text-red-600">
                    {health.blocked}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Done</span>
                  <span className="text-sm font-medium text-green-600">
                    {health.done}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm text-center"
              >
                View All Tasks
              </Link>
              <button
                onClick={() => fetch("/api/notifications/check", { method: "POST" })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                Check System Notifications
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Blockers Needing Approval
          </h2>
          {blockedTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No blocked tasks</p>
          ) : (
            <div className="space-y-4">
              {blockedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-red-200 bg-red-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.event.name} • {task.category.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-600">
                        Owner: {task.owner.name} ({task.owner.email})
                      </p>
                      {task.blockerNote && (
                        <div className="mt-2 p-2 bg-white border border-red-200 rounded text-sm text-red-700">
                          <strong>Blocker:</strong> {task.blockerNote}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Link
                        href={`/events/${task.event.id}`}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleAcknowledge(task.id)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

