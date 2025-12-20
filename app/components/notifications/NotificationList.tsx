"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  task?: {
    id: string
    title: string
  } | null
}

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
    if (notification.task) {
      router.push(`/events/${notification.task.id}`)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading notifications...</div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No notifications</div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
            !notification.read ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    notification.type === "SYSTEM"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {notification.type}
                </span>
                {!notification.read && (
                  <span className="text-xs text-blue-600 font-medium">New</span>
                )}
              </div>
              <p className="text-sm text-gray-900">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

