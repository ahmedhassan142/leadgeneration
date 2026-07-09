// lib/db/models/Job.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  type: 'scrape' | 'analyze' | 'email' | 'ai' | 'score' | 'outreach';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'archived';
  data: any;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  type: { 
    type: String, 
    required: true, 
    enum: ['scrape', 'analyze', 'email', 'ai', 'score', 'outreach'],
    index: true 
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'processing', 'completed', 'failed', 'archived'],
    index: true 
  },
  data: { type: Schema.Types.Mixed, required: true },
  result: Schema.Types.Mixed,
  error: String,
  retries: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

// Compound indexes for faster queries
JobSchema.index({ type: 1, status: 1, createdAt: 1 });
JobSchema.index({ status: 1, type: 1 });

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);