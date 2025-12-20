"use client"

import { useState } from "react"
import { OutreachStatus } from "@/types"

interface OutreachTaskFormProps {
  taskId: string
  outreachTask?: {
    id: string
    channel: string
    contentLink?: string | null
    scheduledTime?: string | null
    status: OutreachStatus
    outcomeNote?: string | null
  }
  onSave: (data: {
    channel: string
    contentLink?: string
    scheduledTime?: string
    status?: OutreachStatus
    outcomeNote?: string
  }) => Promise<void>
}

const channels = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "PARTNER", label: "Partner" },
]

const statusLabels: Record<OutreachStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  FAILED: "Failed",
}

export default function OutreachTaskForm({
  taskId,
  outreachTask,
  onSave,
}: OutreachTaskFormProps) {
  const [channel, setChannel] = useState(outreachTask?.channel || "INSTAGRAM")
  const [contentLink, setContentLink] = useState(
    outreachTask?.contentLink || ""
  )
  const [scheduledTime, setScheduledTime] = useState(
    outreachTask?.scheduledTime
      ? new Date(outreachTask.scheduledTime).toISOString().slice(0, 16)
      : ""
  )
  const [status, setStatus] = useState<OutreachStatus>(
    outreachTask?.status || "PENDING"
  )
  const [outcomeNote, setOutcomeNote] = useState(
    outreachTask?.outcomeNote || ""
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!channel) return

    setSaving(true)
    try {
      await onSave({
        channel,
        contentLink: contentLink || undefined,
        scheduledTime: scheduledTime || undefined,
        status,
        outcomeNote: outcomeNote || undefined,
      })
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
          Channel
        </label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {channels.map((ch) => (
            <option key={ch.value} value={ch.value}>
              {ch.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content Link (Graphics Output)
        </label>
        <input
          type="url"
          value={contentLink}
          onChange={(e) => setContentLink(e.target.value)}
          placeholder="Link to graphics asset"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scheduled Time
        </label>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OutreachStatus)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {(status === "PUBLISHED" || status === "FAILED") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Outcome Note
          </label>
          <textarea
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder="Posted / Delayed / Cancelled / etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={2}
          />
        </div>
      )}

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

