import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password })
    return data
  },
  register: async (userData) => {
    const { data } = await api.post("/auth/register", userData)
    return data
  },
  forgotPassword: async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email })
    return data
  },
  resetPassword: async (token, password) => {
    const { data } = await api.post("/auth/reset-password", { token, password })
    return data
  },
  getMe: async () => {
    const { data } = await api.get("/auth/me")
    return data
  },
  updateProfile: async (profileData) => {
    const { data } = await api.put("/auth/profile", profileData)
    return data
  },
  changePassword: async (passwordData) => {
    const { data } = await api.put("/auth/change-password", passwordData)
    return data
  },
}

// Users API
export const usersAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/users", { params })
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/users/${id}`)
    return data
  },
  create: async (userData) => {
    const { data } = await api.post("/users", userData)
    return data
  },
  update: async (id, userData) => {
    const { data } = await api.put(`/users/${id}`, userData)
    return data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/users/${id}`)
    return data
  },
}

// Brands API
export const brandsAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/brands", { params })
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/brands/${id}`)
    return data
  },
  create: async (brandData) => {
    const { data } = await api.post("/brands", brandData)
    return data
  },
  update: async (id, brandData) => {
    const { data } = await api.put(`/brands/${id}`, brandData)
    return data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/brands/${id}`)
    return data
  },
  assignUser: async (brandId, userId) => {
    const { data } = await api.post(`/brands/${brandId}/users`, { userId })
    return data
  },
  removeUser: async (brandId, userId) => {
    const { data } = await api.delete(`/brands/${brandId}/users/${userId}`)
    return data
  },
}

// Tasks API
export const tasksAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/tasks", { params })
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/tasks/${id}`)
    return data
  },
  create: async (taskData) => {
    const { data } = await api.post("/tasks", taskData)
    return data
  },
  update: async (id, taskData) => {
    const { data } = await api.put(`/tasks/${id}`, taskData)
    return data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/tasks/${id}`)
    return data
  },
  getComments: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/comments`)
    return data
  },
  addComment: async (taskId, content) => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { content })
    return data
  },
  getAttachments: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/attachments`)
    return data
  },
  uploadAttachment: async (taskId, file, description) => {
    const formData = new FormData()
    formData.append("file", file)
    if (description) {
      formData.append("description", description)
    }
    const { data } = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return data
  },
  deleteAttachment: async (attachmentId) => {
    const { data } = await api.delete(`/tasks/attachments/${attachmentId}`)
    return data
  },
}

// Notifications API
export const notificationsAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/notifications", { params })
    return data
  },
  markAsRead: async (id) => {
    const { data } = await api.put(`/notifications/${id}/read`)
    return data
  },
  markAllAsRead: async () => {
    const { data } = await api.put("/notifications/read-all")
    return data
  },
}

// Activity Logs API
export const activityAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/activity", { params })
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/activity/${id}`)
    return data
  },
}

// Calendar API
export const calendarsAPI = {
  getAll: async (params) => {
    const { data } = await api.get("/calendars", { params })
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/calendars/${id}`)
    return data
  },
  create: async (calendarData) => {
    const { data } = await api.post("/calendars", calendarData)
    return data
  },
  update: async (id, calendarData) => {
    const { data } = await api.put(`/calendars/${id}`, calendarData)
    return data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/calendars/${id}`)
    return data
  },
  addScope: async (calendarId, scopeData) => {
    const { data } = await api.post(`/calendars/${calendarId}/scopes`, scopeData)
    return data
  },
  updateScope: async (scopeId, scopeData) => {
    const { data } = await api.put(`/calendars/scopes/${scopeId}`, scopeData)
    return data
  },
  deleteScope: async (scopeId) => {
    const { data } = await api.delete(`/calendars/scopes/${scopeId}`)
    return data
  },
  generateTasks: async (calendarId, scopesData) => {
    const { data } = await api.post(`/calendars/${calendarId}/generate-tasks`, scopesData)
    return data
  },
}

export default api
