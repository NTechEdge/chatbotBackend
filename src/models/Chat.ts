import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IAttachment {
  name: string
  size: number
  type: string
  url?: string
}

export interface IMessage {
  sender: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: IAttachment[]
}

export interface IChat extends Document {
  user: Types.ObjectId
  conversationId: string
  title: string
  messages: IMessage[]
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    attachments: [
      {
        name: { type: String },
        size: { type: Number },
        type: { type: String },
        url: { type: String },
      },
    ],
  },
  { _id: false }
)

const ChatSchema = new Schema<IChat>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
)

// A conversation id is unique per user (not globally)
ChatSchema.index({ user: 1, conversationId: 1 }, { unique: true })

export const Chat = mongoose.model<IChat>('Chat', ChatSchema)
