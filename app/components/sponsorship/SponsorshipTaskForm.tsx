"use client"

import { useState } from "react"

interface SponsorshipTaskFormProps {
  taskId: string
  sponsorshipTask?: {
    id: string
    currentStage: string
    nextAction?: string | null
    followUpDeadline?: string | null
    statusHistory: any
  }
  onSave: (data: {
    currentStage: string
    nextAction?: string
    followUpDeadline?: string
  }) => Promise<void>
}

export default function SponsorshipTaskForm({
  taskId,
  sponsorshipTask,
  onSave,
}: SponsorshipTaskFormProps) {
  const [currentStage, setCurrentStage] = useState(
    sponsorshipTask?.currentStage || ""
  )
  const [nextAction, setNextAction] = useState(
    sponsorshipTask?.nextAction || ""
  )
  const [followUpDeadline, setFollowUpDeadline] = useState(
    sponsorshipTask?.followUpDeadline
      ? new Date(sponsorshipTask.followUpDeadline).toISOString().slice(0, 16)
      : ""
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!currentStage) return

    setSaving(true)
    try {
      await onSave({
        currentStage,
        nextAction: nextAction || undefined,
        followUpDeadline: followUpDeadline || undefined,
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
          Current Stage
        </label>
        <input
          type="text"
          value={currentStage}
          onChange={(e) => setCurrentStage(e.target.value)}
          placeholder="e.g., Initial Contact, Proposal Sent, Negotiating"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Next Required Action
        </label>
        <input
          type="text"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="What needs to happen next?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        {!nextAction && (
          <p className="mt-1 text-xs text-gray-500">
            If no next action exists, sponsor is considered stalled.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Follow-up Deadline
        </label>
        <input
          type="datetime-local"
          value={followUpDeadline}
          onChange={(e) => setFollowUpDeadline(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {sponsorshipTask?.statusHistory &&
        Array.isArray(sponsorshipTask.statusHistory) &&
        sponsorshipTask.statusHistory.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status History
            </label>
            <div className="space-y-1">
              {sponsorshipTask.statusHistory.map((entry: any, index: number) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 p-2 bg-gray-50 rounded"
                >
                  {entry.stage} - {new Date(entry.timestamp).toLocaleString()}
                </div>
              ))}
            </div>
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

