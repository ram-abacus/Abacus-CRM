import prisma from "../config/prisma.js"
import { uploadToCloudinary } from "../config/upload.js"

export const getAllTasks = async (req, res, next) => {
  try {
    const { status, priority, brandId, assignedToId } = req.query

    const where = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (brandId) where.brandId = brandId
    if (assignedToId) where.assignedToId = assignedToId

    // Filter tasks based on user role
    if (!["SUPER_ADMIN", "ADMIN"].includes(req.user.role)) {
      where.OR = [
        { assignedToId: req.user.id },
        { createdById: req.user.id },
        {
          brand: {
            users: {
              some: {
                userId: req.user.id,
              },
            },
          },
        },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json(tasks)
  } catch (error) {
    next(error)
  }
}

export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        brand: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
      },
    })

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json(task)
  } catch (error) {
    next(error)
  }
}

export const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, brandId, assignedToId } = req.body

    if (!title || !brandId) {
      return res.status(400).json({ message: "Title and brand are required" })
    }

    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      })

      if (!assignedUser) {
        return res.status(400).json({ message: "Assigned user does not exist" })
      }
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    })

    if (!brand) {
      return res.status(400).json({ message: "Brand does not exist" })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        brandId,
        assignedToId: assignedToId || null,
        createdById: req.user.id,
      },
      include: {
        brand: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create notification for assigned user
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          title: "New Task Assigned",
          message: `You have been assigned to task: ${title}`,
          userId: assignedToId,
        },
      })

      // Emit socket event
      const io = req.app.get("io")
      io.to(`user-${assignedToId}`).emit("notification", {
        title: "New Task Assigned",
        message: `You have been assigned to task: ${title}`,
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entity: "Task",
        entityId: task.id,
        userId: req.user.id,
        metadata: {
          taskTitle: title,
          brandId,
          assignedToId,
        },
      },
    })

    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
}

export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, status, priority, dueDate, assignedToId } = req.body

    if (assignedToId !== undefined && assignedToId !== null) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      })

      if (!assignedUser) {
        return res.status(400).json({ message: "Assigned user does not exist" })
      }
    }

    const updateData = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entity: "Task",
        entityId: task.id,
        userId: req.user.id,
        metadata: {
          changes: updateData,
        },
      },
    })

    res.json(task)
  } catch (error) {
    next(error)
  }
}

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.task.delete({
      where: { id },
    })

    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entity: "Task",
        entityId: id,
        userId: req.user.id,
        metadata: {
          taskTitle: task?.title,
        },
      },
    })

    res.json({ message: "Task deleted successfully" })
  } catch (error) {
    next(error)
  }
}

export const addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        userId: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Get task to notify relevant users
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        assignedToId: true,
        createdById: true,
      },
    })

    // Notify task owner and assigned user
    const notifyUsers = [task.assignedToId, task.createdById].filter((userId) => userId && userId !== req.user.id)

    const io = req.app.get("io")
    for (const userId of notifyUsers) {
      await prisma.notification.create({
        data: {
          title: "New Comment",
          message: `${req.user.firstName} commented on: ${task.title}`,
          userId,
        },
      })

      io.to(`user-${userId}`).emit("new-comment", {
        taskId,
        comment,
      })
    }

    res.status(201).json(comment)
  } catch (error) {
    next(error)
  }
}

export const getTaskComments = async (req, res, next) => {
  try {
    const { taskId } = req.params

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    res.json(comments)
  } catch (error) {
    next(error)
  }
}

export const uploadAttachment = async (req, res, next) => {
  try {
    const { taskId } = req.params
    const { description } = req.body

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    let fileUrl = ""
    const fileName = req.file.originalname

    // Upload to Cloudinary if configured
    if (process.env.UPLOAD_STORAGE === "cloud" && process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await uploadToCloudinary(req.file)
      fileUrl = result.secure_url
    } else {
      // Use local storage
      fileUrl = `/uploads/${req.file.filename}`
    }

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        fileName,
        fileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        taskId,
        description: description || null,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: "UPLOAD",
        entity: "Attachment",
        entityId: attachment.id,
        userId: req.user.id,
        metadata: {
          taskId,
          fileName,
          fileType: req.file.mimetype,
        },
      },
    })

    // Notify task owner and assigned user
    const notifyUsers = [task.assignedToId, task.createdById].filter((userId) => userId && userId !== req.user.id)

    const io = req.app.get("io")
    for (const userId of notifyUsers) {
      await prisma.notification.create({
        data: {
          title: "New Attachment",
          message: `${req.user.firstName} uploaded a file to: ${task.title}`,
          userId,
        },
      })

      io.to(`user-${userId}`).emit("new-attachment", {
        taskId,
        attachment,
      })
    }

    res.status(201).json(attachment)
  } catch (error) {
    next(error)
  }
}

export const getTaskAttachments = async (req, res, next) => {
  try {
    const { taskId } = req.params

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    })

    res.json(attachments)
  } catch (error) {
    next(error)
  }
}

export const deleteAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" })
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    })

    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entity: "Attachment",
        entityId: attachmentId,
        userId: req.user.id,
        metadata: {
          fileName: attachment.fileName,
          taskId: attachment.taskId,
        },
      },
    })

    res.json({ message: "Attachment deleted successfully" })
  } catch (error) {
    next(error)
  }
}
