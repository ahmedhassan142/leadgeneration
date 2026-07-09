// lib/db/models/EmailHistory.ts - NEW MODEL
import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailHistory extends Document {
  // References
  leadId: string;
  outreachId: string;
  sequenceId: string;
  
  // Email Details
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  
  // Tracking
  sentAt: Date;
  emailType: 'first' | 'followup' | 'followup-2' | 'final';
  stepNumber: number;
  messageId?: string;
  
  // Status
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed';
  
  // Engagement Tracking
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  bouncedAt?: Date;
  
  // Reply Details (if any)
  replyContent?: string;
  replyFrom?: string;
  replySubject?: string;
  
  // Error Tracking
  error?: string;
  errorCode?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

const EmailHistorySchema = new Schema<IEmailHistory>({
  // References
  leadId: { type: String, required: true, index: true },
  outreachId: { type: String, required: true, index: true },
  sequenceId: { type: String, required: true, index: true },
  
  // Email Details
  to: { type: String, required: true },
  from: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  html: String,
  
  // Tracking
  sentAt: { type: Date, default: Date.now, index: true },
  emailType: { 
    type: String, 
    enum: ['first', 'followup', 'followup-2', 'final'],
    required: true 
  },
  stepNumber: { type: Number, required: true },
  messageId: { type: String, unique: true, sparse: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'],
    default: 'sent',
    index: true 
  },
  
  // Engagement Tracking
  openedAt: Date,
  clickedAt: Date,
  repliedAt: Date,
  bouncedAt: Date,
  
  // Reply Details
  replyContent: String,
  replyFrom: String,
  replySubject: String,
  
  // Error Tracking
  error: String,
  errorCode: String,
  
  // Metadata
  metadata: Schema.Types.Mixed,
  
}, { timestamps: true });

// Compound indexes for common queries
EmailHistorySchema.index({ leadId: 1, sentAt: -1 });
EmailHistorySchema.index({ messageId: 1 });
EmailHistorySchema.index({ status: 1, sentAt: 1 });
EmailHistorySchema.index({ outreachId: 1, stepNumber: 1 });

// Method to check if lead has received email recently
EmailHistorySchema.statics.getLastEmailForLead = async function(leadId: string) {
  return this.findOne({ leadId }).sort({ sentAt: -1 });
};

// Method to check if email was sent in last X hours
EmailHistorySchema.statics.hasRecentEmail = async function(leadId: string, hours: number = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentEmail = await this.findOne({
    leadId,
    sentAt: { $gte: cutoff }
  });
  return !!recentEmail;
};

export const EmailHistory = mongoose.models.EmailHistory || mongoose.model<IEmailHistory>('EmailHistory', EmailHistorySchema);