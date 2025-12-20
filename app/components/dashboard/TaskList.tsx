"use client"

import TaskCard from "./TaskCard"
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

interface TaskListProps {
  tasks: Task[]
  onStatusUpdate: (taskId: string, status: TaskStatus, blockerNote?: string) => Promise<void>
  title: string
  emptyMessage?: string
}

export default function TaskList({
  tasks,
  onStatusUpdate,
  title,
  emptyMessage = "No tasks",
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusUpdate={onStatusUpdate} />
        ))}
      </div>
    </div>
  )
}

