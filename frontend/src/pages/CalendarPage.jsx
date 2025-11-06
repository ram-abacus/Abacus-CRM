"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, CalendarIcon, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { calendarsAPI } from "../services/api"
import { useAuth } from "../contexts/AuthContext"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns"
import AddScopeModal from "../components/AddScopeModal"

const statusColors = {
  TODO: "bg-gray-100 text-gray-800 border-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  IN_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  COMPLETED: "bg-purple-100 text-purple-800 border-purple-300",
}

const contentTypeLabels = {
  STATIC: "Statics",
  VIDEO: "Videos",
  STORY: "Stories",
  REEL: "Reels",
  CAROUSEL: "Carousels",
  BLOG_POST: "Blog Posts",
}

export default function CalendarPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadCalendar()
  }, [id])

  const loadCalendar = async () => {
    try {
      const data = await calendarsAPI.getById(id)
      setCalendar(data)
      setCurrentMonth(new Date(data.year, data.month - 1))
    } catch (error) {
      console.error("Failed to load calendar:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTasks = async () => {
    if (!calendar.scopes || calendar.scopes.length === 0) {
      alert("Please add scope items first")
      return
    }

    if (!confirm("This will generate tasks based on the scope. Continue?")) return

    try {
      const scopesData = {
        scopes: calendar.scopes.map((scope) => ({
          contentType: scope.contentType,
          quantity: scope.quantity,
          startDate: new Date(calendar.year, calendar.month - 1, 1).toISOString(),
        })),
      }

      await calendarsAPI.generateTasks(id, scopesData)
      loadCalendar()
      alert("Tasks generated successfully!")
    } catch (error) {
      console.error("Failed to generate tasks:", error)
      alert("Failed to generate tasks")
    }
  }

  const handleTaskClick = (taskId) => {
    navigate(`/dashboard/tasks/${taskId}`)
  }

  const getTasksForDate = (date) => {
    if (!calendar?.tasks) return []
    return calendar.tasks.filter((task) => task.postingDate && isSameDay(new Date(task.postingDate), date))
  }

  const calculateProgress = () => {
    if (!calendar?.scopes) return {}
    const progress = {}
    calendar.scopes.forEach((scope) => {
      const completed =
        calendar.tasks?.filter((task) => task.contentType === scope.contentType && task.status === "COMPLETED")
          .length || 0
      progress[scope.contentType] = {
        completed,
        total: scope.quantity,
        percentage: scope.quantity > 0 ? Math.round((completed / scope.quantity) * 100) : 0,
      }
    })
    return progress
  }

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-text-secondary py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const tasksForDay = getTasksForDate(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toString()}
                className={`min-h-24 p-2 border rounded-lg ${
                  isToday ? "border-primary bg-primary/5" : "border-border"
                } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
              >
                <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                <div className="space-y-1">
                  {tasksForDay.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className={`text-xs p-1 rounded cursor-pointer border ${statusColors[task.status]} hover:opacity-80 transition-opacity`}
                      title={task.title}
                    >
                      <div className="truncate font-medium">{task.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12">Loading calendar...</div>
  }

  if (!calendar) {
    return <div className="text-center py-12">Calendar not found</div>
  }

  const progress = calculateProgress()
  const canManage = ["SUPER_ADMIN", "ADMIN", "ACCOUNT_MANAGER"].includes(user.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard/brands")}
          className="flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Brands
        </button>
      </div>

      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {calendar.brand.name} - {format(new Date(calendar.year, calendar.month - 1), "MMMM yyyy")}
            </h1>
            <p className="text-text-secondary">Social Media Calendar & Content Planning</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowScopeModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Scope
              </button>
              <button
                onClick={handleGenerateTasks}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <CalendarIcon className="w-4 h-4" />
                Generate Tasks
              </button>
            </div>
          )}
        </div>

        {calendar.scopes && calendar.scopes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {calendar.scopes.map((scope) => {
              const prog = progress[scope.contentType] || { completed: 0, total: scope.quantity, percentage: 0 }
              return (
                <div key={scope.id} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{contentTypeLabels[scope.contentType]}</h3>
                    <span className="text-xs text-text-secondary">{prog.percentage}%</span>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {prog.completed}/{prog.total}
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">Total Tasks</p>
              <p className="text-2xl font-bold">{calendar.tasks?.length || 0}</p>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-text-secondary">Completed</p>
              <p className="text-2xl font-bold">
                {calendar.tasks?.filter((t) => t.status === "COMPLETED").length || 0}
              </p>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">In Progress</p>
              <p className="text-2xl font-bold">
                {calendar.tasks?.filter((t) => t.status === "IN_PROGRESS").length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {renderCalendar()}

      {showScopeModal && (
        <AddScopeModal
          isOpen={showScopeModal}
          onClose={() => setShowScopeModal(false)}
          onSuccess={loadCalendar}
          calendarId={id}
        />
      )}
    </div>
  )
}
