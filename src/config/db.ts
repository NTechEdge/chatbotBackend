import mongoose from 'mongoose'
import dns from 'node:dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nixachatbot'

  try {
    const conn = await mongoose.connect(uri)
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('[Database] MongoDB connection error:', (error as Error).message)
    console.warn('[Database] Running in fallback mode. Ensure MongoDB is running to persist chats.')
  }
}
