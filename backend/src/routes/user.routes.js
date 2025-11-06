import express from "express"
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from "../controllers/user.controller.js"
import { authenticate, authorize } from "../middleware/auth.middleware.js"

const router = express.Router()

router.use(authenticate)

router.get("/", authorize("SUPER_ADMIN", "ADMIN"), getAllUsers)
router.get("/:id", getUserById)
router.post("/", authorize("SUPER_ADMIN"), createUser)
router.put("/:id", authorize("SUPER_ADMIN", "ADMIN"), updateUser)
router.delete("/:id", authorize("SUPER_ADMIN"), deleteUser)

export default router
