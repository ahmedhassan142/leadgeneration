// lib/db/models/InboundLead.ts - UPDATED
import mongoose, { Schema, Document } from 'mongoose';

export interface IInboundLead extends Document {
  // Source Information - UPDATED with app store sources
  source: 'reddit' | 'twitter' | 'facebook' | 'job_board' | 'forum' | 'indiehackers' | 
          'google_alert' | 'press_release' | 'wordpress_plugin' | 'hacker_news' |
          'app_store_ios' | 'play_store_android';  // NEW SOURCES ADDED
  
  sourceUrl: string;
  sourceId?: string;
  
  // Content
  title: string;
  content: string;
  author: string;
  authorProfile?: string;
  
  // Requirements
  requirement: string;
  keywords: string[];
  
  // LEAD SCORING (NEW FIELDS)
  leadScore?: number;           // 0-100 score
  leadQuality?: 'hot' | 'warm' | 'cold';  // Classification
  scoreReasons?: string[];      // Why this score
  scoreBreakdown?: {            // Detailed breakdown
    rating: number;
    updateRecency: number;
    popularity: number;
    monetization: number;
    engagement: number;
    total: number;
  };
  
  // APP SPECIFIC DATA (NEW)
  appMetadata?: {
    appId: string;
    platform: 'ios' | 'android';
    rating: number;
    ratingsCount: number;
    lastUpdate: Date;
    price: number;
    isFree: boolean;
    downloads?: number;
    minInstalls?: number;
    maxInstalls?: number;
    developer: string;
    developerEmail?: string;
    developerWebsite?: string;
    categories: string[];
    version?: string;
    contentRating?: string;
    privacyPolicy?: string;
  };
  
  // Timestamps
  postedAt: Date;
  discoveredAt: Date;
  
  // Outreach Status
  status: 'new' | 'contacted' | 'replied' | 'converted' | 'ignored';
  contactedAt?: Date;
  repliedAt?: Date;
  convertedAt?: Date;
  
  // Notes
  notes?: string;
  assignedTo?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const InboundLeadSchema = new Schema<IInboundLead>({
  source: { 
    type: String, 
    required: true,
    enum: ['reddit', 'twitter', 'facebook', 'job_board', 'forum', 'indiehackers', 
           'google_alert', 'press_release', 'wordpress_plugin', 'hacker_news',
           'app_store_ios', 'play_store_android'],  // NEW SOURCES
    index: true 
  },
  sourceUrl: { type: String, required: true },
  sourceId: String,
  
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorProfile: String,
  
  requirement: { type: String, required: true },
  keywords: [String],
  
  // NEW SCORING FIELDS
  leadScore: { type: Number, min: 0, max: 100, index: true },
  leadQuality: { type: String, enum: ['hot', 'warm', 'cold'], index: true },
  scoreReasons: [String],
  scoreBreakdown: {
    rating: Number,
    updateRecency: Number,
    popularity: Number,
    monetization: Number,
    engagement: Number,
    total: Number
  },
  
  // NEW APP METADATA
  appMetadata: {
    appId: String,
    platform: { type: String, enum: ['ios', 'android'] },
    rating: Number,
    ratingsCount: Number,
    lastUpdate: Date,
    price: Number,
    isFree: Boolean,
    downloads: Number,
    minInstalls: Number,
    maxInstalls: Number,
    developer: String,
    developerEmail: String,
    developerWebsite: String,
    categories: [String],
    version: String,
    contentRating: String,
    privacyPolicy: String
  },
  
  postedAt: { type: Date, required: true, index: true },
  discoveredAt: { type: Date, default: Date.now },
  
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'replied', 'converted', 'ignored'],
    default: 'new',
    index: true 
  },
  contactedAt: Date,
  repliedAt: Date,
  convertedAt: Date,
  
  notes: String,
  assignedTo: String,
  
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Indexes
InboundLeadSchema.index({ source: 1, status: 1, postedAt: -1 });
InboundLeadSchema.index({ keywords: 1 });
InboundLeadSchema.index({ leadQuality: 1, leadScore: -1 });  // NEW INDEX
InboundLeadSchema.index({ 'appMetadata.platform': 1, leadQuality: 1 });  // NEW INDEX

export const InboundLead = mongoose.models.InboundLead || mongoose.model<IInboundLead>('InboundLead', InboundLeadSchema);