import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import chatRoutes from './routes/chatRoutes.js'
import authRoutes from './routes/authRoutes.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
const allowedOrigins = CLIENT_URL.split(',').map((url) => url.trim())

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'Nixa Chatbot API', timestamp: new Date() })
})

// Auth API Routes
app.use('/api/auth', authRoutes)

// Chat API Routes (JWT protected)
app.use('/api/chat', chatRoutes)

// Connect to MongoDB and start server
connectDB().finally(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 [Server] Nixa Chatbot API is running on http://localhost:${PORT}`)
    console.log(`📌 [API 1] POST http://localhost:${PORT}/api/chat/message`)
    console.log(`📌 [API 2] GET  http://localhost:${PORT}/api/chat/history`)
  })

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ [Port Conflict] Port ${PORT} is already in use. Please close the process using port ${PORT} or change PORT in backend/.env.`)
    } else {
      console.error('[Server Error]:', err)
    }
  })
})

export default app
