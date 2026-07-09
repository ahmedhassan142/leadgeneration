// lib/db/models/Sequence.ts - FULLY UPDATED
import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceStep {
  day: number;
  template: string;
  subject: string;
  delay: number;
  maxAttempts: number;
}

export interface ISequence extends Document {
  // Basic Info
  id: string;
  name: string;
  description: string;
  
  // Target Audience
  targetQualities: ('hot' | 'warm' | 'cold')[];
  
  // Steps
  steps: ISequenceStep[];
  
  // Stats
  totalSteps: number;
  totalDays: number;
  
  // Status
  isActive: boolean;
  isDefault: boolean;
  
  // Follow-up Timing Configuration (NEW)
  followUpConfig: {
    step1To2Days: number;     // Days between step 1 and 2
    step2To3Days: number;     // Days between step 2 and 3
    step3To4Days: number;     // Days between step 3 and 4
    maxFollowUps: number;      // Maximum follow-ups allowed
    businessHoursOnly: boolean; // Send only during business hours
    sendTimeHour: number;       // Hour of day to send (0-23)
  };
  
  // Performance Metrics
  stats: {
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalRepliesByStep: {
      step1: number;
      step2: number;
      step3: number;
      step4: number;
    };
    replies: Array<{           // Store full reply details
      leadId: string;
      leadName: string;
      leadEmail: string;
      step: number;
      stepName: string;
      content: string;
      fromEmail: string;
      receivedAt: Date;
      subject: string;
      status: string;
    }>;
    latestReplies: Array<{
      leadName: string;
      leadEmail: string;
      step: number;
      content: string;
      receivedAt: Date;
      fromEmail: string;
    }>;
    conversionRate: number;
    lastUsed: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const SequenceSchema = new Schema<ISequence>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  
  targetQualities: [{
    type: String,
    enum: ['hot', 'warm', 'cold']
  }],
  
  steps: [{
    day: { type: Number, required: true },
    template: { type: String, required: true },
    subject: String,
    delay: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 1 }
  }],
  
  totalSteps: { type: Number, default: 0 },
  totalDays: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  
  // Follow-up Timing Configuration
  followUpConfig: {
    step1To2Days: { type: Number, default: 3 },
    step2To3Days: { type: Number, default: 4 },
    step3To4Days: { type: Number, default: 5 },
    maxFollowUps: { type: Number, default: 3 },
    businessHoursOnly: { type: Boolean, default: true },
    sendTimeHour: { type: Number, default: 10 } // 10 AM
  },
  
  stats: {
    totalSent: { type: Number, default: 0 },
    totalOpened: { type: Number, default: 0 },
    totalReplied: { type: Number, default: 0 },
    totalRepliesByStep: {
      step1: { type: Number, default: 0 },
      step2: { type: Number, default: 0 },
      step3: { type: Number, default: 0 },
      step4: { type: Number, default: 0 }
    },
    replies: [{
      leadId: String,
      leadName: String,
      leadEmail: String,
      step: Number,
      stepName: String,
      content: String,
      fromEmail: String,
      receivedAt: Date,
      subject: String,
      status: { type: String, default: 'received' }
    }],
    latestReplies: [{
      leadName: String,
      leadEmail: String,
      step: Number,
      content: String,
      receivedAt: Date,
      fromEmail: String
    }],
    conversionRate: { type: Number, default: 0 },
    lastUsed: Date
  }
  
}, { timestamps: true });

// Pre-save hook to calculate totals


// Method to get follow-up delay for a step
SequenceSchema.methods.getFollowUpDelay = function(step: number): number {
  if (step === 1) return this.followUpConfig.step1To2Days;
  if (step === 2) return this.followUpConfig.step2To3Days;
  if (step === 3) return this.followUpConfig.step3To4Days;
  return 3;
};

export const Sequence = mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', SequenceSchema);