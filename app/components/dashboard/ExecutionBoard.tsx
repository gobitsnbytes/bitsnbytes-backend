"use client"

import { TaskCategory, TaskStatus } from "@/types"
import { useState } from "react"
import TaskCard from "./TaskCard"

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

interface ExecutionBoardProps {
  tasks: Task[]
  onStatusUpdate: (taskId: string, status: TaskStatus, blockerNote?: string) => Promise<void>
  onCreateTask: (category: TaskCategory, title: string, deadline: string) => Promise<void>
}

const categories: { value: TaskCategory; label: string }[] = [
  { value: "EVENT_SETUP", label: "Event Setup" },
  { value: "SPONSORSHIP", label: "Sponsorship" },
  { value: "TECH", label: "Tech" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "GRAPHICS", label: "Graphics" },
  { value: "OUTREACH", label: "Outreach" },
]

export default function ExecutionBoard({
  tasks,
  onStatusUpdate,
  onCreateTask,
}: ExecutionBoardProps) {
  const [creatingTask, setCreatingTask] = useState<TaskCategory | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDeadline, setNewTaskDeadline] = useState("")

  const handleCreateTask = async (category: TaskCategory) => {
    if (!newTaskTitle.trim() || !newTaskDeadline) return

    try {
      await onCreateTask(category, newTaskTitle, newTaskDeadline)
      setNewTaskTitle("")
      setNewTaskDeadline("")
      setCreatingTask(null)
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {categories.map((category) => {
        const categoryTasks = tasks.filter((task) => task.category === category.value)

        return (
          <div key={category.value} className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">{category.label}</h3>
              <div className="text-sm text-gray-500 mb-3">
                {categoryTasks.length} task{categoryTasks.length !== 1 ? "s" : ""}
              </div>

              {creatingTask === category.value ? (
                <div className="space-y-2 mb-4">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    autoFocus
                  />
                  <input
                    type="datetime-local"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateTask(category.value)}
                      disabled={!newTaskTitle.trim() || !newTaskDeadline}
                      className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingTask(null)
                        setNewTaskTitle("")
                        setNewTaskDeadline("")
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingTask(category.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  + Add Task
                </button>
              )}
            </div>

            <div className="space-y-3">
              {categoryTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusUpdate={onStatusUpdate}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

