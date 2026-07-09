// types/outreach.ts
export interface OutreachEmail {
  to: string;
  subject: string;
  body: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced';
  messageId?: string;
  error?: string;
}

export interface FollowUpStep {
  days: number; // Days after previous email
  subject: string;
  template: string;
  sent: boolean;
  sentAt?: Date;
  index: number;
}

export interface OutreachSequence {
  type: 'standard' | 'aggressive' | 'gentle';
  steps: FollowUpStep[];
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'paused' | 'completed';
}

export interface OutreachData {
  enabled: boolean;
  emails: OutreachEmail[];
  sequences: OutreachSequence[];
  currentSequence?: string;
  lastContacted?: Date;
  nextFollowUp?: Date;
  notes?: string;
  tags: string[];
  campaign?: string;
}