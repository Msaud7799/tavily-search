import mongoose, { Document, Model, Schema } from 'mongoose';

/*----------
 * واجهة المستخدم (IUser): تصف شكل بيانات المستخدم المخزنة في قاعدة بيانات MongoDB.
 * تتضمن: الاسم، البريد، كلمة المرور، رابط صورة الأفتار من Google، تاريخ التسجيل،
 * آخر ظهور، حالة الاتصال (أونلاين/أوفلاين)، وآخر إعدادات قام بحفظها المستخدم.
----------*/
export interface IUserSettings {
  theme?: 'dark' | 'light';
  tavilyKey?: string;
  hfKey?: string;
  bio?: string;
  displayName?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  settings: IUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema(
  {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    tavilyKey: { type: String, default: '' },
    hfKey: { type: String, default: '' },
    bio: { type: String, default: '' },
    displayName: { type: String, default: '' },
  },
  { _id: false }
);

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    settings: {
      type: UserSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
