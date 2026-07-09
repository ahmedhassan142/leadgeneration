// types/call.types.ts - If you want separate types
export interface CallStartRequest {
  leadId: string;
}

export interface CallStartResponse {
  success: boolean;
  callSid?: string;
  callLogId?: string;
  message?: string;
  error?: string;
}

export interface CallStatusResponse {
  success: boolean;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  duration?: number;
  recording?: string;
  error?: string;
}