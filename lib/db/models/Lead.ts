// lib/db/models/Lead.ts - FULLY UPDATED with Email Tracking Fields
import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  // Basic Info
  name: string;
  website: string;
  phone?: string;
  address?: string;
  niche: 'real-estate' | 'restaurant' | 'financial';
  location: string;
  source: 'google_maps' | 'yellowpages' | 'linkedin' | 'manual'|'scrapingdog';
  
  // Contact Info
  emails: string[];
  
  // 🌐 WEBSITE STATUS
  websiteExists: boolean;
  websiteCheckDate?: Date;
  websiteError?: string;
  statusCode?: number;
  
  // Analysis Data
  analysis: {
    hasSEO: boolean;
    speedScore: number;
    cms: string;
    mobileFriendly: boolean;
    title?: string;
    description?: string;
    hasH1: boolean;
    hasAltTags: boolean;
    loadTime?: number;
  };
  
  // AI Data
  ai: {
    designScore: number;
    issues: string[];
    suggestions?: string[];
    analyzedAt?: Date;
  };
  
  // 📞 CALL TRACKING
  callNeeded: boolean;
  callStatus: 'pending' | 'called' | 'no_answer' | 'followup' | 'completed' | 'not_needed';
  callPriority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  callLogs: Array<{
    date: Date;
    notes: string;
    status: string;
    nextCallDate?: Date;
    duration?: number;
  }>;
  lastCallDate?: Date;
  nextCallDate?: Date;
  
  // 📧 EMAIL OUTREACH TRACKING (NEW - CRITICAL FOR PREVENTING DUPLICATES)
  lastEmailSentAt?: Date;           // When was the last email sent
  lastEmailType?: string;           // 'first', 'followup', 'followup-2', 'final'
  lastEmailSubject?: string;        // Last email subject
  totalEmailsSent: number;          // Total emails sent to this lead
  lastEmailStep?: number;           // Which step (1,2,3,4)
  currentSequenceId?: string;       // Active sequence ID
  emailSequenceStatus: 'not_started' | 'active' | 'completed' | 'replied' | 'converted';
  lastEmailMessageId?: string;      // Last email message ID for tracking replies
  
  // 🔥 LEAD SCORING
  score: number;
  quality: 'cold' | 'warm' | 'hot';
  leadScoreReason: string[];
  autoHotLead: boolean;
  
  // Hot Lead Reasons
  hotLeadReason?: string[];
  
  // Pipeline Status
  status: 'raw' | 'analyzed' | 'scored' | 'contacted' | 'converted' | 'lost';
  
  // 📤 ESTUARY EXPORT FIELDS
  exportedToSheets: boolean;
  exportedAt?: Date;
  estuarySyncStatus: 'pending' | 'synced' | 'failed';
  estuarySyncMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>({
  name: { type: String, required: true, index: true },
  website: { type: String, required: true },
  phone: String,
  address: String,
  niche: { 
    type: String, 
    required: true, 
    enum: ['real-estate', 'restaurant', 'financial'],
    index: true 
  },
  location: { type: String, required: true, index: true },
  source: { 
    type: String, 
    enum: ['google_maps', 'yellowpages', 'linkedin', 'manual','scrapingdog'],
    default: 'manual'
  },
  emails: [String],
  
  // 🌐 Website Status Fields
  websiteExists: { type: Boolean, default: true, index: true },
  websiteCheckDate: Date,
  websiteError: String,
  statusCode: Number,
  
  analysis: {
    hasSEO: Boolean,
    speedScore: Number,
    cms: String,
    mobileFriendly: Boolean,
    title: String,
    description: String,
    hasH1: Boolean,
    hasAltTags: Boolean,
    loadTime: Number,
  },
  
  ai: {
    designScore: Number,
    issues: [String],
    suggestions: [String],
    analyzedAt: Date,
  },
  
  // 📞 Call Tracking Fields
  callNeeded: { type: Boolean, default: false, index: true },
  callStatus: { 
    type: String, 
    enum: ['pending', 'called', 'no_answer', 'followup', 'completed', 'not_needed'],
    default: 'pending'
  },
  callPriority: { 
    type: String, 
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  assignedTo: String,
  callLogs: [{
    date: { type: Date, default: Date.now },
    notes: String,
    status: String,
    nextCallDate: Date,
    duration: Number
  }],
  lastCallDate: Date,
  nextCallDate: Date,
  
  // 📧 Email Outreach Tracking Fields (NEW)
  lastEmailSentAt: { type: Date, index: true },
  lastEmailType: String,
  lastEmailSubject: String,
  totalEmailsSent: { type: Number, default: 0 },
  lastEmailStep: Number,
  currentSequenceId: { type: String, index: true },
  emailSequenceStatus: { 
    type: String, 
    enum: ['not_started', 'active', 'completed', 'replied', 'converted'],
    default: 'not_started',
    index: true 
  },
  lastEmailMessageId: String,
  
  // 🔥 Scoring Fields
  score: { type: Number, default: 0, index: true },
  quality: { 
    type: String, 
    enum: ['cold', 'warm', 'hot'],
    default: 'cold',
    index: true 
  },
  leadScoreReason: [String],
  autoHotLead: { type: Boolean, default: false },
  hotLeadReason: [String],
  
  status: { 
    type: String, 
    enum: ['raw', 'analyzed', 'scored', 'contacted', 'converted', 'lost'],
    default: 'raw',
    index: true 
  },
  
  // 📤 Estuary Export Fields
  exportedToSheets: { type: Boolean, default: false, index: true },
  exportedAt: Date,
  estuarySyncStatus: { 
    type: String, 
    enum: ['pending', 'synced', 'failed'],
    default: 'pending'
  },
  estuarySyncMessage: String,
  
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Indexes for faster queries
LeadSchema.index({ websiteExists: 1, quality: 1 });
LeadSchema.index({ callNeeded: 1, callPriority: 1, callStatus: 1 });
LeadSchema.index({ exportedToSheets: 1, estuarySyncStatus: 1 });
LeadSchema.index({ quality: 1, score: -1 });
LeadSchema.index({ emailSequenceStatus: 1, lastEmailSentAt: 1 }); // NEW index for email tracking
LeadSchema.index({ currentSequenceId: 1, emailSequenceStatus: 1 }); // NEW index for sequence queries

export const Lead = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);