export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  niche: string;
  status: 'new' | 'contacted' | 'hot' | 'cold' | 'converted' | 'lost';
  aiScore: number;
  callHistory: CallHistory[];
  notes: string;
  nextCallAt?: Date;
  tags: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallHistory {
  _id: string;
  date: Date;
  duration: number;
  summary: string;
  transcript: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  recording?: string;
}

export interface CallLog {
  _id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
  transcript?: string;
  aiScore?: number;
  sentiment?: string;
  recording?: string;
  errorMessage?: string;
  twilioCallSid?: string;
}

export interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  newLeadsToday: number;
  callsToday: number;
  totalCalls: number;
  avgScore: number;
  conversionRate: number;
  leadsByStatus: Array<{ _id: string; count: number }>;
  callsByDay: Array<{ _id: string; count: number; completed: number }>;
  recentCalls: CallLog[];
}