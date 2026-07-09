// types/lead.ts
export interface Lead {
  _id: string;
  name: string;
  website: string;
  phone?: string;
  niche: string;
  location: string;
  emails: string[];
  socialLinks?: string[];
  analysis?: {
    hasSEO: boolean;
    speedScore: number;
    cms: string;
    mobileFriendly: boolean;
    title?: string;
    description?: string;
    hasH1: boolean;
    hasAltTags: boolean;
    loadTime?: number;
    status?: number;
    error?: string;
  };
  ai?: {
    designScore: number;
    issues: string[];
    suggestions?: string[];
    screenshot?: string;
    analyzedAt: Date;
  };
  score: number;
  quality: 'cold' | 'warm' | 'hot';
  scoringReasons?: string[];
  outreach?: {
    subject: string;
    message: string;
    sent: boolean;
    sentAt?: Date;
    opened?: boolean;
    replied?: boolean;
  };
  status: 'raw' | 'analyzed' | 'scored' | 'contacted';
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  quality?: string;
  niche?: string;
  location?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  hasEmail?: boolean;
  contacted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}