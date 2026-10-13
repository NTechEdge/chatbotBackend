import { Router } from 'express'
import { sendMessage, getChatHistory } from '../controllers/chatController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// All chat routes require a valid JWT
router.use(protect)

// 1. Send message & get AI response
router.post('/message', sendMessage)

// 2. Fetch conversation history
router.get('/history', getChatHistory)

export default router
