import prisma from "../config/prisma.js"

export const getAllCalendars = async (req, res, next) => {
  try {
    const { brandId, year, month } = req.query

    const where = {}
    if (brandId) where.brandId = brandId
    if (year) where.year = Number.parseInt(year)
    if (month) where.month = Number.parseInt(month)

    const calendars = await prisma.calendar.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        scopes: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })

    res.json(calendars)
  } catch (error) {
    next(error)
  }
}

export const getCalendarById = async (req, res, next) => {
  try {
    const { id } = req.params

    const calendar = await prisma.calendar.findUnique({
      where: { id },
      include: {
        brand: true,
        scopes: true,
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            _count: {
              select: {
                comments: true,
                attachments: true,
              },
            },
          },
          orderBy: { postingDate: "asc" },
        },
      },
    })

    if (!calendar) {
      return res.status(404).json({ message: "Calendar not found" })
    }

    res.json(calendar)
  } catch (error) {
    next(error)
  }
}

export const createCalendar = async (req, res, next) => {
  try {
    const { brandId, month, year } = req.body

    if (!brandId || !month || !year) {
      return res.status(400).json({ message: "Brand, month, and year are required" })
    }

    // Check if calendar already exists
    const existing = await prisma.calendar.findUnique({
      where: {
        brandId_month_year: {
          brandId,
          month: Number.parseInt(month),
          year: Number.parseInt(year),
        },
      },
    })

    if (existing) {
      return res.status(400).json({ message: "Calendar already exists for this month" })
    }

    const calendar = await prisma.calendar.create({
      data: {
        brandId,
        month: Number.parseInt(month),
        year: Number.parseInt(year),
        createdById: req.user.id,
      },
      include: {
        brand: true,
        scopes: true,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entity: "Calendar",
        entityId: calendar.id,
        userId: req.user.id,
        metadata: {
          brandId,
          month,
          year,
        },
      },
    })

    res.status(201).json(calendar)
  } catch (error) {
    next(error)
  }
}

export const updateCalendar = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const calendar = await prisma.calendar.update({
      where: { id },
      data: { status },
      include: {
        brand: true,
        scopes: true,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entity: "Calendar",
        entityId: calendar.id,
        userId: req.user.id,
        metadata: { status },
      },
    })

    res.json(calendar)
  } catch (error) {
    next(error)
  }
}

export const deleteCalendar = async (req, res, next) => {
  try {
    const { id } = req.params

    await prisma.calendar.delete({
      where: { id },
    })

    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entity: "Calendar",
        entityId: id,
        userId: req.user.id,
        metadata: {},
      },
    })

    res.json({ message: "Calendar deleted successfully" })
  } catch (error) {
    next(error)
  }
}

export const addScope = async (req, res, next) => {
  try {
    const { calendarId } = req.params
    const { contentType, quantity } = req.body

    if (!contentType || !quantity) {
      return res.status(400).json({ message: "Content type and quantity are required" })
    }

    const scope = await prisma.calendarScope.create({
      data: {
        calendarId,
        contentType,
        quantity: Number.parseInt(quantity),
      },
    })

    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entity: "CalendarScope",
        entityId: scope.id,
        userId: req.user.id,
        metadata: {
          calendarId,
          contentType,
          quantity,
        },
      },
    })

    res.status(201).json(scope)
  } catch (error) {
    next(error)
  }
}

export const updateScope = async (req, res, next) => {
  try {
    const { scopeId } = req.params
    const { quantity, completed } = req.body

    const updateData = {}
    if (quantity !== undefined) updateData.quantity = Number.parseInt(quantity)
    if (completed !== undefined) updateData.completed = Number.parseInt(completed)

    const scope = await prisma.calendarScope.update({
      where: { id: scopeId },
      data: updateData,
    })

    res.json(scope)
  } catch (error) {
    next(error)
  }
}

export const deleteScope = async (req, res, next) => {
  try {
    const { scopeId } = req.params

    await prisma.calendarScope.delete({
      where: { id: scopeId },
    })

    res.json({ message: "Scope deleted successfully" })
  } catch (error) {
    next(error)
  }
}

export const generateTasks = async (req, res, next) => {
  try {
    const { calendarId } = req.params
    const { scopes } = req.body // Array of { contentType, quantity, startDate }

    if (!scopes || !Array.isArray(scopes)) {
      return res.status(400).json({ message: "Scopes array is required" })
    }

    const calendar = await prisma.calendar.findUnique({
      where: { id: calendarId },
      include: { brand: true },
    })

    if (!calendar) {
      return res.status(404).json({ message: "Calendar not found" })
    }

    const createdTasks = []

    for (const scopeData of scopes) {
      const { contentType, quantity, startDate } = scopeData

      // Create or update scope
      await prisma.calendarScope.upsert({
        where: {
          calendarId_contentType: {
            calendarId,
            contentType,
          },
        },
        create: {
          calendarId,
          contentType,
          quantity: Number.parseInt(quantity),
        },
        update: {
          quantity: Number.parseInt(quantity),
        },
      })

      // Generate tasks for this content type
      const baseDate = startDate ? new Date(startDate) : new Date(calendar.year, calendar.month - 1, 1)

      for (let i = 0; i < quantity; i++) {
        const postingDate = new Date(baseDate)
        postingDate.setDate(baseDate.getDate() + i * 3) // Space tasks 3 days apart

        const task = await prisma.task.create({
          data: {
            title: `${contentType.replace("_", " ")} #${i + 1}`,
            description: `Create ${contentType.toLowerCase().replace("_", " ")} for ${calendar.brand.name}`,
            status: "TODO",
            priority: "MEDIUM",
            brandId: calendar.brandId,
            calendarId: calendar.id,
            contentType,
            postingDate,
            dueDate: new Date(postingDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before posting
            createdById: req.user.id,
          },
          include: {
            brand: true,
          },
        })

        createdTasks.push(task)
      }
    }

    await prisma.activityLog.create({
      data: {
        action: "GENERATE",
        entity: "CalendarTasks",
        entityId: calendarId,
        userId: req.user.id,
        metadata: {
          tasksCreated: createdTasks.length,
          scopes,
        },
      },
    })

    res.status(201).json({
      message: `Generated ${createdTasks.length} tasks`,
      tasks: createdTasks,
    })
  } catch (error) {
    next(error)
  }
}
