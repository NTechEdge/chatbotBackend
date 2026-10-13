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

// Helper to strip quotes, trailing slashes, and whitespace
function normalizeOrigin(url: string): string {
  return url.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '')
}

const defaultOrigins = [
  'https://nixa-chat-bot.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean)

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]))

const corsOptions: cors.CorsOptions = {
  origin: (requestOrigin, callback) => {
    // Allow server-to-server, curl, Postman, health checks (no origin header)
    if (!requestOrigin) {
      return callback(null, true)
    }

    const normalized = normalizeOrigin(requestOrigin)

    // Allow explicitly defined origins or Vercel preview deployments for nixa-chat-bot
    const isAllowed =
      allowedOrigins.includes(normalized) ||
      /^https:\/\/nixa-chat-bot(-[a-z0-9-]+)?\.vercel\.app$/i.test(normalized)

    if (isAllowed) {
      callback(null, true)
    } else {
      console.warn(`[CORS Blocked] Request origin "${requestOrigin}" is not allowed.`)
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
}

// Middlewares
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
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
