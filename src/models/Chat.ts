import mongoose, { Document, Model, Schema } from 'mongoose';

/*----------
 * نموذج المحادثة (Chat): يحفظ المحادثات الكاملة بين المستخدم والذكاء الاصطناعي.
 * كل محادثة تحتوي على عنوان، رسائل متعددة، والنموذج المستخدم.
----------*/
export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface IChat extends Omit<Document, 'model'> {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  model?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSchema: Schema<IChat> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'محادثة جديدة',
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
    model: {
      type: String,
      default: 'Omni',
    },
  },
  {
    timestamps: true,
  }
);

const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;
