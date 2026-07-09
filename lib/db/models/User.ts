// lib/db/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  googleId?: string;
  credits: number;
  settings: {
    emailSignature?: string;
    defaultNiche?: string;
    defaultLocation?: string;
    dailyScrapeLimit: number;
    notificationEmail: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: String,
  googleId: String,
  credits: { type: Number, default: 100 },
  settings: {
    emailSignature: String,
    defaultNiche: String,
    defaultLocation: String,
    dailyScrapeLimit: { type: Number, default: 100 },
    notificationEmail: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);