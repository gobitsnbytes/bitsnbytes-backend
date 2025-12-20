"use client"

import { TaskStatus } from "@/types"
import { useState } from "react"

interface TaskCardProps {
  task: {
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
  onStatusUpdate: (taskId: string, status: TaskStatus, blockerNote?: string) => Promise<void>
}

const statusColors: Record<TaskStatus, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  BLOCKED: "bg-red-100 text-red-800",
  DONE: "bg-green-100 text-green-800",
}

const statusLabels: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
}

export default function TaskCard({ task, onStatusUpdate }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showBlockerForm, setShowBlockerForm] = useState(false)
  const [blockerNote, setBlockerNote] = useState("")

  const handleStatusClick = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) return

    setIsUpdating(true)
    try {
      if (newStatus === "BLOCKED") {
        setShowBlockerForm(true)
        return
      }
      await onStatusUpdate(task.id, newStatus)
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBlock = async () => {
    if (!blockerNote.trim()) return

    setIsUpdating(true)
    try {
      await onStatusUpdate(task.id, "BLOCKED", blockerNote)
      setShowBlockerForm(false)
      setBlockerNote("")
    } catch (error) {
      console.error("Failed to block task:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const isOverdue = new Date(task.deadline) < new Date() && task.status !== "DONE"
  const deadlineDate = new Date(task.deadline)
  const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: deadlineDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })

  return (
    <div
      className={`border rounded-lg p-4 ${
        isOverdue ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {task.event.name} • {task.category.replace("_", " ")}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${statusColors[task.status]}`}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            Due: {formattedDeadline}
          </span>
          {isOverdue && <span className="ml-2 text-red-600">(Overdue)</span>}
        </div>
        <div className="text-xs text-gray-500">Owner: {task.owner.name}</div>
      </div>

      {task.blockerNote && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Blocker:</strong> {task.blockerNote}
        </div>
      )}

      {showBlockerForm ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={blockerNote}
            onChange={(e) => setBlockerNote(e.target.value)}
            placeholder="What's blocking this task?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleBlock}
              disabled={!blockerNote.trim() || isUpdating}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              Block Task
            </button>
            <button
              onClick={() => {
                setShowBlockerForm(false)
                setBlockerNote("")
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2 flex-wrap">
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => handleStatusClick(status as TaskStatus)}
              disabled={isUpdating || status === task.status}
              className={`px-3 py-1 text-xs rounded ${
                status === task.status
                  ? statusColors[status] + " font-medium"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

