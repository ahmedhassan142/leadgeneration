// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// API Request types
export interface ScrapeRequest {
  niche: string;
  location: string;
  source?: 'google' | 'yelp';
  limit?: number;
}

export interface OutreachRequest {
  leadId: string;
  template?: string;
  sendNow?: boolean;
}

export interface BulkActionRequest {
  action: 'generate-outreach' | 'mark-contacted' | 'export-csv' | 'delete';
  leadIds: string[];
  options?: any;
}