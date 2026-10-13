import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

// Read lazily: ESM imports run before dotenv.config() in server.ts
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new Error('JWT_SECRET is not set in backend/.env.')
  }
  return secret
}

export interface JwtPayload {
  id: string
}

/**
 * Signs a JWT for a user id (7 day expiry)
 */
export function signToken(userId: string): string {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' })
}

/**
 * Express middleware: verifies the Bearer token and attaches the user document
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Not authenticated. No token provided.' })
      return
    }

    const token = header.slice(7).trim()
    let decoded: JwtPayload
    try {
      decoded = jwt.verify(token, getJwtSecret()) as JwtPayload
    } catch {
      res.status(401).json({ success: false, error: 'Session expired or invalid. Please log in again.' })
      return
    }

    const user = await User.findById(decoded.id)
    if (!user) {
      res.status(401).json({ success: false, error: 'The user belonging to this token no longer exists.' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    console.error('[Auth Middleware] Error:', error)
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' })
  }
}
