"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  User,
  Briefcase,
  AlertCircle,
  Edit2,
  Trash2,
  Send,
  Upload,
  Download,
  X,
} from "lucide-react"
import { tasksAPI } from "../services/api"
import { useAuth } from "../contexts/AuthContext"
import { useSocket } from "../contexts/SocketContext"
import { format } from "date-fns"
import EditTaskModal from "../components/EditTaskModal"

const statusColors = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  COMPLETED: "bg-purple-100 text-purple-800",
}

const priorityColors = {
  LOW: "text-gray-600",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileDescription, setFileDescription] = useState("")
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    loadTask()

    if (socket) {
      socket.on("new-comment", ({ taskId, comment }) => {
        if (taskId === id) {
          setTask((prev) => ({
            ...prev,
            comments: [...(prev.comments || []), comment],
          }))
        }
      })

      socket.on("new-attachment", ({ taskId, attachment }) => {
        if (taskId === id) {
          setTask((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), attachment],
          }))
        }
      })

      return () => {
        socket.off("new-comment")
        socket.off("new-attachment")
      }
    }
  }, [id, socket])

  const loadTask = async () => {
    try {
      const data = await tasksAPI.getById(id)
      setTask(data)
    } catch (error) {
      console.error("Failed to load task:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      await tasksAPI.delete(id)
      navigate("/dashboard/tasks")
    } catch (error) {
      console.error("Failed to delete task:", error)
      alert("Failed to delete task")
    }
  }

  const handleTaskUpdated = (updatedTask) => {
    setTask(updatedTask)
    setShowEditModal(false)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      const comment = await tasksAPI.addComment(id, newComment)
      setTask((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), comment],
      }))
      setNewComment("")
    } catch (error) {
      console.error("Failed to add comment:", error)
      alert("Failed to add comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile) return

    setUploadingFile(true)
    try {
      const attachment = await tasksAPI.uploadAttachment(id, selectedFile, fileDescription)
      setTask((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), attachment],
      }))
      setSelectedFile(null)
      setFileDescription("")
      // Reset file input
      document.getElementById("file-input").value = ""
    } catch (error) {
      console.error("Failed to upload file:", error)
      alert("Failed to upload file")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return

    try {
      await tasksAPI.deleteAttachment(attachmentId)
      setTask((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attachmentId),
      }))
    } catch (error) {
      console.error("Failed to delete attachment:", error)
      alert("Failed to delete attachment")
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return "🖼️"
    if (fileType.startsWith("video/")) return "🎥"
    if (fileType.startsWith("audio/")) return "🎵"
    if (fileType.includes("pdf")) return "📄"
    return "📎"
  }

  if (loading) {
    return <div className="text-center py-12">Loading task...</div>
  }

  if (!task) {
    return <div className="text-center py-12">Task not found</div>
  }

  const canEdit =
    ["SUPER_ADMIN", "ADMIN", "ACCOUNT_MANAGER"].includes(user.role) ||
    task.createdById === user.id ||
    task.assignedToId === user.id

  const canUploadFiles = ["SUPER_ADMIN", "ADMIN", "ACCOUNT_MANAGER", "DESIGNER", "WRITER"].includes(user.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard/tasks")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Tasks
        </button>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            {["SUPER_ADMIN", "ADMIN"].includes(user.role) && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3">{task.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[task.status]}`}>
                {task.status.replace("_", " ")}
              </span>
              <span className={`flex items-center gap-1 text-sm font-medium ${priorityColors[task.priority]}`}>
                <AlertCircle className="w-4 h-4" />
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Briefcase className="w-5 h-5" />
              <div>
                <p className="text-xs">Brand</p>
                <p className="text-gray-900 font-medium">{task.brand?.name}</p>
              </div>
            </div>

            {task.assignedTo && (
              <div className="flex items-center gap-3 text-gray-600">
                <User className="w-5 h-5" />
                <div>
                  <p className="text-xs">Assigned To</p>
                  <p className="text-gray-900 font-medium">
                    {task.assignedTo.firstName} {task.assignedTo.lastName}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {task.dueDate && (
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5" />
                <div>
                  <p className="text-xs">Due Date</p>
                  <p className="text-gray-900 font-medium">{format(new Date(task.dueDate), "MMMM d, yyyy")}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-gray-600">
              <User className="w-5 h-5" />
              <div>
                <p className="text-xs">Created By</p>
                <p className="text-gray-900 font-medium">
                  {task.createdBy?.firstName} {task.createdBy?.lastName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {task.description && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{task.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Attachments ({task.attachments?.length || 0})</h3>

        {canUploadFiles && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileSelect}
                  className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      document.getElementById("file-input").value = ""
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {selectedFile && (
                <>
                  {user.role === "WRITER" && (
                    <input
                      type="text"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Add description (optional for writers)"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <button
                    onClick={handleUploadFile}
                    disabled={uploadingFile}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingFile ? "Uploading..." : "Upload File"}
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {user.role === "DESIGNER"
                ? "You can upload images, videos, links, and files"
                : user.role === "WRITER"
                  ? "You can upload files and add text descriptions"
                  : "Supported: Images, Videos, Documents, Audio (Max 10MB)"}
            </p>
          </div>
        )}

        {task.attachments && task.attachments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(attachment.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                    {attachment.description && <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`http://localhost:5000${attachment.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No attachments yet</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Comments ({task.comments?.length || 0})</h3>

        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </form>

        {task.comments && task.comments.length > 0 ? (
          <div className="space-y-4">
            {task.comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    {comment.user.firstName} {comment.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
                <p className="text-gray-600">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No comments yet</p>
        )}
      </div>

      {showEditModal && (
        <EditTaskModal task={task} onClose={() => setShowEditModal(false)} onTaskUpdated={handleTaskUpdated} />
      )}
    </div>
  )
}
