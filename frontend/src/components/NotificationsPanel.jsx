"use client"

import { useState, useEffect } from "react"
import { X, Check, CheckCheck } from "lucide-react"
import { notificationsAPI } from "../services/api"
import { useSocket } from "../contexts/SocketContext"
import { format } from "date-fns"

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()

  useEffect(() => {
    loadNotifications()

    if (socket) {
      socket.on("notification", (notification) => {
        setNotifications((prev) => [notification, ...prev])
      })

      return () => {
        socket.off("notification")
      }
    }
  }, [socket])

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll()
      setNotifications(data)
    } catch (error) {
      console.error("[v0] Failed to load notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (error) {
      console.error("[v0] Failed to mark notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (error) {
      console.error("[v0] Failed to mark all as read:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-start sm:justify-end z-50">
      <div className="bg-background w-full sm:w-96 h-[80vh] sm:h-screen sm:max-h-screen flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Notifications</h2>
            {unreadCount > 0 && <p className="text-sm text-text-secondary">{unreadCount} unread</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {unreadCount > 0 && (
          <div className="p-4 border-b border-border">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-text-secondary">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">No notifications yet</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-surface transition-colors ${!notification.isRead ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{notification.title}</h3>
                      <p className="text-sm text-text-secondary mb-2">{notification.message}</p>
                      <p className="text-xs text-text-secondary">
                        {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 hover:bg-surface rounded transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-primary" />
                      </button>
                    )}
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
