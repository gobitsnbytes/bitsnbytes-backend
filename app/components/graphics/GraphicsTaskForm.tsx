"use client"

import { useState } from "react"
import { GraphicsStatus } from "@/types"

interface GraphicsTaskFormProps {
  taskId: string
  graphicsTask?: {
    id: string
    assetType: string
    formats: any
    status: GraphicsStatus
    finalOutputLink?: string | null
  }
  onSave: (data: {
    assetType: string
    formats: Array<{ format: string; dimensions: string }>
    status?: GraphicsStatus
    finalOutputLink?: string
  }) => Promise<void>
}

const assetTypes = [
  { value: "POSTER", label: "Poster" },
  { value: "STORY", label: "Story" },
  { value: "BANNER", label: "Banner" },
  { value: "STANDEE", label: "Standee" },
]

const statusFlow: GraphicsStatus[] = [
  "REQUESTED",
  "DESIGNING",
  "REVIEW",
  "APPROVED",
  "DELIVERED",
]

const statusLabels: Record<GraphicsStatus, string> = {
  REQUESTED: "Requested",
  DESIGNING: "Designing",
  REVIEW: "Review",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

export default function GraphicsTaskForm({
  taskId,
  graphicsTask,
  onSave,
}: GraphicsTaskFormProps) {
  const [assetType, setAssetType] = useState(
    graphicsTask?.assetType || "POSTER"
  )
  const [formats, setFormats] = useState<
    Array<{ format: string; dimensions: string }>
  >(graphicsTask?.formats || [{ format: "", dimensions: "" }])
  const [status, setStatus] = useState<GraphicsStatus>(
    graphicsTask?.status || "REQUESTED"
  )
  const [finalOutputLink, setFinalOutputLink] = useState(
    graphicsTask?.finalOutputLink || ""
  )
  const [saving, setSaving] = useState(false)

  const addFormat = () => {
    setFormats([...formats, { format: "", dimensions: "" }])
  }

  const removeFormat = (index: number) => {
    setFormats(formats.filter((_, i) => i !== index))
  }

  const updateFormat = (
    index: number,
    field: "format" | "dimensions",
    value: string
  ) => {
    const updated = [...formats]
    updated[index][field] = value
    setFormats(updated)
  }

  const handleSave = async () => {
    if (!assetType || formats.some((f) => !f.format || !f.dimensions)) {
      return
    }

    setSaving(true)
    try {
      await onSave({
        assetType,
        formats: formats.filter((f) => f.format && f.dimensions),
        status,
        finalOutputLink: finalOutputLink || undefined,
      })
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  const currentStatusIndex = statusFlow.indexOf(status)
  const nextStatus =
    currentStatusIndex < statusFlow.length - 1
      ? statusFlow[currentStatusIndex + 1]
      : null

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asset Type
        </label>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {assetTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Required Formats & Dimensions
        </label>
        {formats.map((format, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Format (e.g., PNG, JPG)"
              value={format.format}
              onChange={(e) => updateFormat(index, "format", e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Dimensions (e.g., 1080x1920)"
              value={format.dimensions}
              onChange={(e) =>
                updateFormat(index, "dimensions", e.target.value)
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            {formats.length > 1 && (
              <button
                type="button"
                onClick={() => removeFormat(index)}
                className="px-3 py-2 text-red-600 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addFormat}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          + Add Format
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
            {statusLabels[status]}
          </span>
          {nextStatus && (
            <button
              type="button"
              onClick={() => {
                setStatus(nextStatus)
                handleSave()
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              → {statusLabels[nextStatus]}
            </button>
          )}
        </div>
      </div>

      {status === "DELIVERED" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Output Link
          </label>
          <input
            type="url"
            value={finalOutputLink}
            onChange={(e) => setFinalOutputLink(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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

