// lib/db/models/Outreach.ts - FULLY UPDATED
import mongoose, { Schema, Document } from 'mongoose';

export interface IOutreach extends Document {
  // References
  leadId?: string;
  inboundLeadId?: string;
  leadType: 'main' | 'inbound';
  
  // Lead Snapshot
  leadSnapshot: {
    name: string;
    website?: string;
    email: string;
    phone?: string;
    niche?: string;
    location?: string;
    quality?: 'hot' | 'warm' | 'cold';
    score?: number;
    source?: string;
    ai?: {
      issues: string[];
      designScore?: number;
    };
  };
  
  // Sequence Info
  sequenceId: string;
  sequenceName: string;
  totalSteps: number;
  currentStep: number;
  
  // Status
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  completedReason?: string;
  
  // Timeline
  startedAt: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  completedAt?: Date;
  
  // Email Tracking (CRITICAL for follow-up timing)
  lastEmailSentAt?: Date;        // When last email was sent
  lastEmailStep?: number;         // Which step was last sent
  lastEmailType?: string;         // Type of last email
  
  // Emails History
  emails: Array<{
    to: string;
    subject: string;
    body: string;
    sentAt: Date;
    openedAt?: Date;
    clickedAt?: Date;
    repliedAt?: Date;
    replyContent?: string;
    replyFrom?: string;
    replySubject?: string;
    status: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced';
    messageId?: string;
    templateName: string;
    stepIndex: number;
    error?: string;
  }>;
  
  // Reply Summary
  lastReply?: {
    at: Date;
    from: string;
    content: string;
    stepIndex: number;
    emailType: string;
  };
  
  // Follow-up Tracking
  followUpCount: number;          // How many follow-ups sent
  maxFollowUps: number;           // Maximum follow-ups allowed
  followUpSchedule: number[];     // Days after which to send follow-ups
  
  // Notes & Tags
  notes?: string;
  tags: string[];
  
  // Google Sheets Sync
  exportedToSheets: boolean;
  sheetRow?: number;
  sheetId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const OutreachSchema = new Schema<IOutreach>({
  leadId: { type: String, index: true },
  inboundLeadId: { type: String, index: true },
  leadType: { type: String, enum: ['main', 'inbound'], required: true },
  
  leadSnapshot: {
    name: { type: String, required: true },
    website: String,
    email: { type: String, required: true },
    phone: String,
    niche: String,
    location: String,
    quality: { type: String, enum: ['hot', 'warm', 'cold'] },
    score: Number,
    source: String,
    ai: {
      issues: [String],
      designScore: Number
    }
  },
  
  sequenceId: { type: String, required: true, index: true },
  sequenceName: String,
  totalSteps: { type: Number, required: true },
  currentStep: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ['pending', 'active', 'paused', 'completed', 'failed'],
    default: 'pending',
    index: true 
  },
  completedReason: String,
  
  startedAt: { type: Date, default: Date.now, index: true },
  lastContactedAt: Date,
  nextFollowUpAt: { type: Date, index: true },
  completedAt: Date,
  
  // Email Tracking Fields
  lastEmailSentAt: Date,
  lastEmailStep: Number,
  lastEmailType: String,
  
  emails: [{
    to: { type: String, required: true },
    subject: String,
    body: String,
    sentAt: { type: Date, default: Date.now },
    openedAt: Date,
    clickedAt: Date,
    repliedAt: Date,
    replyContent: String,
    replyFrom: String,
    replySubject: String,
    status: { 
      type: String, 
      enum: ['sent', 'opened', 'clicked', 'replied', 'bounced'],
      default: 'sent'
    },
    messageId: String,
    templateName: String,
    stepIndex: Number,
    error: String
  }],
  
  lastReply: {
    at: Date,
    from: String,
    content: String,
    stepIndex: Number,
    emailType: String
  },
  
  // Follow-up Tracking
  followUpCount: { type: Number, default: 0 },
  maxFollowUps: { type: Number, default: 3 },
  followUpSchedule: { type: [Number], default: [3, 4, 5] }, // Days after previous email
  
  notes: String,
  tags: [String],
  
  exportedToSheets: { type: Boolean, default: false, index: true },
  sheetRow: Number,
  sheetId: String,
  
}, { timestamps: true });

// Indexes for faster queries
OutreachSchema.index({ status: 1, nextFollowUpAt: 1 });
OutreachSchema.index({ leadId: 1, inboundLeadId: 1 });
OutreachSchema.index({ 'emails.repliedAt': -1 });
OutreachSchema.index({ 'lastReply.at': -1 });
OutreachSchema.index({ status: 1, lastEmailSentAt: 1 }); // NEW index for follow-up timing
OutreachSchema.index({ leadId: 1, status: 1, currentStep: 1 }); // NEW composite index

// Pre-save hook to update lastEmailSentAt
// OutreachSchema.pre('save', function(next) {
//   if (this.emails && this.emails.length > 0) {
//     const lastEmail = this.emails[this.emails.length - 1];
//     this.lastEmailSentAt = lastEmail.sentAt;
//     this.lastEmailStep = lastEmail.stepIndex;
//     this.lastEmailType = lastEmail.templateName;
//     this.lastContactedAt = lastEmail.sentAt;
//   }
  
// });

export const Outreach = mongoose.models.Outreach || mongoose.model<IOutreach>('Outreach', OutreachSchema);