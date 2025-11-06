import express from "express"
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getTaskComments,
  uploadAttachment,
  getTaskAttachments,
  deleteAttachment,
} from "../controllers/task.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"
import { upload } from "../config/upload.js"

const router = express.Router()

router.use(authenticate)

router.get("/", getAllTasks)
router.get("/:id", getTaskById)
router.post("/", createTask)
router.put("/:id", updateTask)
router.delete("/:id", deleteTask)
router.post("/:taskId/comments", addComment)
router.get("/:taskId/comments", getTaskComments)

router.post("/:taskId/attachments", upload.single("file"), uploadAttachment)
router.get("/:taskId/attachments", getTaskAttachments)
router.delete("/attachments/:attachmentId", deleteAttachment)

export default router
