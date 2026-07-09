import mongoose, { Schema, Document, Types } from 'mongoose';

export type CallStage = 
  | 'introduction' 
  | 'qualification' 
  | 'value_proposition' 
  | 'needs_analysis' 
  | 'solution_presentation' 
  | 'objection_handling' 
  | 'close' 
  | 'end';

export type CallOutcome = 
  | 'meeting_scheduled'
  | 'callback_requested'
  | 'not_interested'
  | 'voicemail'
  | 'no_answer'
  | 'completed'
  | 'transferred_to_human'
  | 'follow_up_needed';

export type CallStatus = 'initiated' | 'in_progress' | 'ended' | 'failed';

export interface IConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ISalesCall extends Document {
  leadId: Types.ObjectId;
  status: CallStatus;
  stage: number;
  conversation: IConversationMessage[];
  outcome?: CallOutcome;
  notes?: string;
  initiatedAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  metadata: {
    source: string;
    quality: string;
    initiatedAt: Date;
    endedAt?: Date;
    callProvider?: string;
    recordingUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const SalesCallSchema = new Schema<ISalesCall>({
  leadId: {
    type: Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['initiated', 'in_progress', 'ended', 'failed'],
    default: 'initiated',
    index: true
  },
  stage: {
    type: Number,
    min: 1,
    max: 8,
    default: 1
  },
  conversation: [ConversationMessageSchema],
  outcome: {
    type: String,
    enum: [
      'meeting_scheduled',
      'callback_requested',
      'not_interested',
      'voicemail',
      'no_answer',
      'completed',
      'transferred_to_human',
      'follow_up_needed'
    ]
  },
  notes: {
    type: String
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number
  },
  metadata: {
    source: {
      type: String,
      default: 'ai_sales_agent'
    },
    quality: {
      type: String,
      enum: ['cold', 'warm', 'hot'],
      required: true
    },
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    callProvider: {
      type: String
    },
    recordingUrl: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Indexes for common queries
SalesCallSchema.index({ leadId: 1, status: 1 });
SalesCallSchema.index({ status: 1, createdAt: -1 });
SalesCallSchema.index({ outcome: 1 });
SalesCallSchema.index({ 'metadata.quality': 1 });

// Virtual for call duration
SalesCallSchema.virtual('calculatedDuration').get(function() {
  if (this.endedAt && this.initiatedAt) {
    return Math.round((this.endedAt.getTime() - this.initiatedAt.getTime()) / 1000);
  }
  return this.duration || 0;
});

// Pre-save hook to calculate duration
// SalesCallSchema.pre('save', function(next) {
//   if (this.endedAt && this.initiatedAt && !this.duration) {
//     this.duration = Math.round((this.endedAt.getTime() - this.initiatedAt.getTime()) / 1000);
//   }
//   if (this.endedAt) {
//     this.metadata.endedAt = this.endedAt;
//   }
//   next();
// });

// Static methods
SalesCallSchema.statics.getStats = async function(leadId?: string) {
  const matchStage: any = {};
  if (leadId) {
    matchStage.leadId = new mongoose.Types.ObjectId(leadId);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        meetingsScheduled: {
          $sum: { $cond: [{ $eq: ['$outcome', 'meeting_scheduled'] }, 1, 0] }
        },
        notInterested: {
          $sum: { $cond: [{ $eq: ['$outcome', 'not_interested'] }, 1, 0] }
        },
        callbacks: {
          $sum: { $cond: [{ $eq: ['$outcome', 'callback_requested'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalCalls: 0,
    avgDuration: 0,
    meetingsScheduled: 0,
    notInterested: 0,
    callbacks: 0
  };
};

export const SalesCall = mongoose.model<ISalesCall>('SalesCall', SalesCallSchema);
export default SalesCall;
