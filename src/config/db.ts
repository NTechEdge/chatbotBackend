import mongoose from 'mongoose'
import dns from 'node:dns'

// Only override DNS servers in local development environments if needed
if (!process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4'])
  } catch {
    // Ignore DNS override errors in environments that restrict custom DNS
  }
}

let isConnecting = false

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return
  }

  if (isConnecting) {
    // Wait for in-flight connection attempt to resolve
    let waitCount = 0
    while (isConnecting && waitCount < 25) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      waitCount++
      if ((mongoose.connection.readyState as number) === 1) return
    }
    return
  }

  const uri = process.env.MONGODB_URI

  // In serverless environments, do not attempt to connect to localhost if MONGODB_URI is absent
  if (!uri && process.env.VERCEL) {
    console.warn('[Database] MONGODB_URI is not set on Vercel. Running in memory fallback mode.')
    return
  }

  const connectionUri = uri || 'mongodb://localhost:27017/nixachatbot'

  isConnecting = true
  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s to prevent Vercel 10s function kill
    })
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('[Database] MongoDB connection error:', (error as Error).message)
    console.warn('[Database] Running in fallback mode. Ensure MongoDB is running to persist chats.')
  } finally {
    isConnecting = false
  }
}
