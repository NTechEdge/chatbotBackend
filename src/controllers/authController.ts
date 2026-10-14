import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { User, type IUser } from '../models/User.js'
import { Chat } from '../models/Chat.js'
import { signToken } from '../middleware/auth.js'

/**
 * The protect middleware attaches `user` to the Express Request
 * (declared in src/types/express.d.ts)
 */
type AuthedRequest = Request & { user?: IUser }

interface AuthRequestBody {
  name?: string
  email?: string
  password?: string
  currentPassword?: string
  newPassword?: string
  avatar?: string
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1
}

function sendDbUnavailable(res: Response): void {
  res.status(503).json({
    success: false,
    error: 'Database connection is unavailable. Please verify MONGODB_URI and MongoDB Atlas network access (0.0.0.0/0).',
  })
}

function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    plan: user.plan,
    createdAt: user.createdAt,
  }
}

function sendAuthResponse(res: Response, user: IUser, statusCode: number, message?: string): void {
  res.status(statusCode).json({
    success: true,
    message,
    token: signToken(user._id.toString()),
    user: publicUser(user),
  })
}

/**
 * 1. CREATE — POST /api/auth/register
 * Body: { name, email, password }
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected()) {
      sendDbUnavailable(res)
      return
    }

    const { name, email, password } = (req.body || {}) as AuthRequestBody

    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required.' })
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, error: 'Please provide a valid email address.' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' })
      return
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() })
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' })
      return
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    })

    sendAuthResponse(res, user, 201, 'Account created successfully.')
  } catch (error: unknown) {
    // Handle duplicate key race (unique index violation)
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' })
      return
    }
    console.error('[AuthController] Error in register:', error)
    res.status(500).json({ success: false, error: 'Internal server error during registration.' })
  }
}

/**
 * 2. READ — POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected()) {
      sendDbUnavailable(res)
      return
    }

    const { email, password } = (req.body || {}) as AuthRequestBody

    if (!email?.trim() || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' })
      return
    }

    // password has select:false, so explicitly include it here
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, error: 'Incorrect email or password.' })
      return
    }

    sendAuthResponse(res, user, 200, 'Logged in successfully.')
  } catch (error) {
    console.error('[AuthController] Error in login:', error)
    res.status(500).json({ success: false, error: 'Internal server error during login.' })
  }
}

/**
 * 3. READ — GET /api/auth/me  (protected)
 */
export const getMe = async (req: AuthedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' })
    return
  }
  res.status(200).json({ success: true, user: publicUser(req.user) })
}

/**
 * 4. UPDATE — PUT /api/auth/me  (protected)
 * Body: { name?, avatar? }
 */
export const updateProfile = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' })
      return
    }

    const { name, avatar } = (req.body || {}) as AuthRequestBody

    if (name !== undefined) {
      if (!name.trim() || name.trim().length < 2 || name.trim().length > 50) {
        res.status(400).json({ success: false, error: 'Name must be between 2 and 50 characters.' })
        return
      }
      req.user.name = name.trim()
    }
    if (avatar !== undefined) {
      req.user.avatar = typeof avatar === 'string' ? avatar : ''
    }

    await req.user.save()
    sendAuthResponse(res, req.user, 200, 'Profile updated successfully.')
  } catch (error) {
    console.error('[AuthController] Error in updateProfile:', error)
    res.status(500).json({ success: false, error: 'Internal server error while updating profile.' })
  }
}

/**
 * 5. UPDATE — PUT /api/auth/password  (protected)
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' })
      return
    }

    const { currentPassword, newPassword } = (req.body || {}) as AuthRequestBody

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current and new passwords are required.' })
      return
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' })
      return
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!user || !(await user.comparePassword(currentPassword))) {
      res.status(401).json({ success: false, error: 'Current password is incorrect.' })
      return
    }

    user.password = newPassword
    await user.save()

    sendAuthResponse(res, user, 200, 'Password changed successfully.')
  } catch (error) {
    console.error('[AuthController] Error in changePassword:', error)
    res.status(500).json({ success: false, error: 'Internal server error while changing password.' })
  }
}

/**
 * 6. DELETE — DELETE /api/auth/me  (protected)
 * Body: { password } — confirmation required; removes user and all their chats
 */
export const deleteAccount = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' })
      return
    }

    const { password } = (req.body || {}) as AuthRequestBody
    if (!password) {
      res.status(400).json({ success: false, error: 'Password confirmation is required to delete your account.' })
      return
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, error: 'Password confirmation failed.' })
      return
    }

    await Chat.deleteMany({ user: req.user._id })
    await User.deleteOne({ _id: req.user._id })

    res.status(200).json({ success: true, message: 'Account and all associated chats deleted.' })
  } catch (error) {
    console.error('[AuthController] Error in deleteAccount:', error)
    res.status(500).json({ success: false, error: 'Internal server error while deleting account.' })
  }
}

/**
 * 7. POST /api/auth/logout (protected) — stateless JWT: client discards the token
 */
export const logout = async (_req: AuthedRequest, res: Response): Promise<void> => {
  res.status(200).json({ success: true, message: 'Logged out.' })
}
