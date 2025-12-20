"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import ExecutionBoard from "@/app/components/dashboard/ExecutionBoard"
import { TaskCategory, TaskStatus } from "@/types"

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

interface Event {
  id: string
  name: string
  date: string
  status: string
}

export default function EventExecutionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchEvent()
      fetchTasks()
    }
  }, [status, router, eventId])

  const fetchEvent = async () => {
    try {
      const response = await fetch("/api/events")
      if (response.ok) {
        const events = await response.json()
        const foundEvent = events.find((e: Event) => e.id === eventId)
        if (foundEvent) {
          setEvent(foundEvent)
        }
      }
    } catch (error) {
      console.error("Failed to fetch event:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?eventId=${eventId}`)
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
        await fetchTasks()
      } else {
        throw new Error("Failed to update task")
      }
    } catch (error) {
      console.error("Failed to update task status:", error)
      throw error
    }
  }

  const handleCreateTask = async (
    category: TaskCategory,
    title: string,
    deadline: string
  ) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          category,
          title,
          deadline,
        }),
      })

      if (response.ok) {
        await fetchTasks()
      } else {
        throw new Error("Failed to create task")
      }
    } catch (error) {
      console.error("Failed to create task:", error)
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

  if (!session || !event) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-2 text-gray-600">
            Event Date: {new Date(event.date).toLocaleDateString()}
          </p>
        </div>

        <ExecutionBoard
          tasks={tasks}
          onStatusUpdate={handleStatusUpdate}
          onCreateTask={handleCreateTask}
        />
      </div>
    </div>
  )
}

