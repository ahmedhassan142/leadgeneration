// lib/db/models/Settings.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  user: mongoose.Types.ObjectId;
  scraping: {
    sources: string[];
    maxConcurrent: number;
    delayBetweenRequests: number;
    userAgents: string[];
    proxyList?: string[];
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    analyzeScreenshots: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromName: string;
    fromEmail: string;
    signature?: string;
  };
  notifications: {
    emailOnNewHotLead: boolean;
    emailOnScrapeComplete: boolean;
    dailyReport: boolean;
  };
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  scraping: {
    sources: { type: [String], default: ['google'] },
    maxConcurrent: { type: Number, default: 5 },
    delayBetweenRequests: { type: Number, default: 2000 },
    userAgents: { type: [String], default: [] },
    proxyList: [String]
  },
  ai: {
    model: { type: String, default: 'gemini-pro' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 1000 },
    analyzeScreenshots: { type: Boolean, default: true }
  },
  email: {
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPassword: String,
    fromName: String,
    fromEmail: String,
    signature: String
  },
  notifications: {
    emailOnNewHotLead: { type: Boolean, default: true },
    emailOnScrapeComplete: { type: Boolean, default: true },
    dailyReport: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);