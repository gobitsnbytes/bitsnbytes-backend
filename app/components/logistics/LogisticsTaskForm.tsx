"use client"

import { useState } from "react"
import { LogisticsStatus } from "@/types"

interface LogisticsTaskFormProps {
  taskId: string
  logisticsTask?: {
    id: string
    status: LogisticsStatus
  }
  onSave: (data: { status: LogisticsStatus }) => Promise<void>
}

const statusOptions: LogisticsStatus[] = ["NOT_READY", "READY", "ISSUE"]

const statusLabels: Record<LogisticsStatus, string> = {
  NOT_READY: "Not Ready",
  READY: "Ready",
  ISSUE: "Issue",
}

export default function LogisticsTaskForm({
  taskId,
  logisticsTask,
  onSave,
}: LogisticsTaskFormProps) {
  const [status, setStatus] = useState<LogisticsStatus>(
    logisticsTask?.status || "NOT_READY"
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ status })
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <div className="space-y-2">
          {statusOptions.map((option) => (
            <label
              key={option}
              className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="logistics-status"
                value={option}
                checked={status === option}
                onChange={(e) => setStatus(e.target.value as LogisticsStatus)}
                className="mr-3"
              />
              <span className="text-sm font-medium">{statusLabels[option]}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  )
}

