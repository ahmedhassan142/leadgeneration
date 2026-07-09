// types/job.ts
export interface Job {
  _id: string;
  type: 'scrape' | 'analyze' | 'email' | 'ai' | 'score' | 'outreach';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  byType: {
    [key: string]: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };
}