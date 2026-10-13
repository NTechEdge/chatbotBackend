import { Router } from 'express'
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// CREATE
router.post('/register', register)

// READ
router.post('/login', login)
router.get('/me', protect, getMe)

// UPDATE
router.put('/me', protect, updateProfile)
router.put('/password', protect, changePassword)

// DELETE
router.delete('/me', protect, deleteAccount)

// Session end (stateless)
router.post('/logout', protect, logout)

export default router
