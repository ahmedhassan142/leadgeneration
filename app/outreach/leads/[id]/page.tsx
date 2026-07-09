// app/outreach/leads/[id]/page.tsx - COMPLETE UPDATED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Reply,
  Eye,
  MessageCircle,
  Download,
  User,
  Send
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface LeadDetail {
  _id: string;
  name: string;
  email?: string;
  emails?: string[];
  phone?: string;
  website?: string;
  location?: string;
  niche?: string;
  source: string;
  score: number;
  quality: 'hot' | 'warm' | 'cold';
  status: string;
  outreach?: {
    sequenceId: string;
    sequenceName: string;
    currentStep: number;
    totalSteps: number;
    status: string;
    startedAt: string;
    lastContactedAt?: string;
    nextFollowUpAt?: string;
    completedAt?: string;
    emails: Array<{
      to: string;
      subject: string;
      body: string;
      sentAt: string;
      openedAt?: string;
      repliedAt?: string;
      status: string;
      messageId?: string;
      stepIndex?: number;
    }>;
  };
  ai?: {
    designScore: number;
    issues: string[];
    suggestions: string[];
    analyzedAt: string;
  };
  createdAt: string;
}

interface ReplyMessage {
  leadName: string;
  leadEmail: string;
  step: number;
  stepName: string;
  content: string;
  cleanContent: string;
  fromEmail: string;
  receivedAt: string;
  sequenceName: string;
  originalMessageId?: string;
}

// Helper to extract only the client's reply message
function extractReplyMessage(content: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const cleanLines: string[] = [];
  let inQuotedSection = false;
  
  for (const line of lines) {
    if (line.startsWith('>') || 
        line.match(/^On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+\d+:\d+\s+[AP]M,\s+\w+\s+<.*>\s+wrote:/) ||
        line.includes('wrote:') ||
        line.startsWith('-----Original Message-----') ||
        (line.includes('From:') && line.includes('Sent:') && line.includes('To:')) ||
        line.startsWith('________________________________')) {
      inQuotedSection = true;
      continue;
    }
    
    if (!inQuotedSection && line.trim()) {
      cleanLines.push(line);
    }
    
    if (inQuotedSection && line.trim() === '') {
      break;
    }
  }
  
  if (cleanLines.length === 0) {
    const parts = content.split(/On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+\d+:\d+\s+[AP]M,\s+\w+\s+<.*>\s+wrote:/);
    if (parts.length > 1 && parts[0].trim()) {
      return parts[0].trim();
    }
    
    const firstLine = lines.find(l => !l.startsWith('>') && l.trim());
    if (firstLine) return firstLine.trim();
  }
  
  return cleanLines.join('\n').trim();
}

// Helper to get step name from step number
function getStepName(step: number): string {
  switch(step) {
    case 1: return 'First Email';
    case 2: return 'Follow-up 1';
    case 3: return 'Follow-up 2';
    case 4: return 'Final Email';
    default: return `Step ${step}`;
  }
}

// Helper to get primary email from lead
function getPrimaryEmail(lead: LeadDetail): string | null {
  if (lead.email) return lead.email;
  if (lead.emails && lead.emails.length > 0) return lead.emails[0];
  return null;
}

// Helper to fetch replies for a specific lead from sequence stats
async function fetchRepliesForLead(leadName: string): Promise<ReplyMessage[]> {
  try {
    const res = await fetch('/api/outreach/sequence/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const allReplies: ReplyMessage[] = [];
      for (const seq of data.stats) {
        if (seq.latestReplies && seq.latestReplies.length > 0) {
          const repliesWithSeq = seq.latestReplies
            .filter((reply: any) => reply.leadName === leadName)
            .map((reply: any) => ({
              ...reply,
              sequenceName: seq.name,
              stepName: getStepName(reply.step),
              cleanContent: extractReplyMessage(reply.content)
            }));
          allReplies.push(...repliesWithSeq);
        }
      }
      return allReplies.sort((a, b) => 
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch replies:', error);
    return [];
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [replies, setReplies] = useState<ReplyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversation' | 'details' | 'ai'>('conversation');

  useEffect(() => {
    fetchLead();
  }, [params.id]);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/outreach/leads/${params.id}`);
      const data = await res.json();
      
      if (data.success) {
        setLead(data.lead);
        // Fetch replies for this lead
        const leadReplies = await fetchRepliesForLead(data.lead.name);
        setReplies(leadReplies);
      }
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    const primaryEmail = lead ? getPrimaryEmail(lead) : null;
    if (primaryEmail) {
      window.location.href = `mailto:${primaryEmail}`;
    }
  };

  const handleScheduleFollowup = () => {
    console.log('Schedule follow-up');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(lead, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `lead-${lead?._id}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Create a map of sent emails by timestamp for matching replies
  const getSentEmailsMap = () => {
    const map = new Map<string, { step: number; stepName: string; sentAt: Date; subject: string; body: string }>();
    if (lead?.outreach?.emails) {
      lead.outreach.emails.forEach(email => {
        const timestamp = new Date(email.sentAt).toISOString();
        map.set(timestamp, {
          step: email.stepIndex || 0,
          stepName: getStepName(email.stepIndex || 0),
          sentAt: new Date(email.sentAt),
          subject: email.subject,
          body: email.body
        });
      });
    }
    return map;
  };

  // Combine sent emails and replies into a single conversation thread
  const getConversationThread = () => {
    const sentEmailsMap = getSentEmailsMap();
    const thread: Array<{
      type: 'sent' | 'reply';
      content: string;
      timestamp: Date;
      subject?: string;
      stepName?: string;
      step?: number;
      repliedToStep?: number;
      repliedToStepName?: string;
      openedAt?: Date;
      repliedAt?: Date;
    }> = [];

    // Add sent emails from outreach
    if (lead?.outreach?.emails) {
      lead.outreach.emails.forEach(email => {
        thread.push({
          type: 'sent',
          content: email.body,
          timestamp: new Date(email.sentAt),
          subject: email.subject,
          stepName: getStepName(email.stepIndex || 0),
          step: email.stepIndex || 0,
          openedAt: email.openedAt ? new Date(email.openedAt) : undefined,
          repliedAt: email.repliedAt ? new Date(email.repliedAt) : undefined
        });
      });
    }

    // Add replies and match them to the original email they replied to
    replies.forEach(reply => {
      // Find which sent email this reply likely corresponds to (the last sent email before the reply)
      const sentEmailBeforeReply = thread
        .filter(msg => msg.type === 'sent' && msg.timestamp < new Date(reply.receivedAt))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      thread.push({
        type: 'reply',
        content: reply.cleanContent,
        timestamp: new Date(reply.receivedAt),
        stepName: reply.stepName,
        step: reply.step,
        repliedToStep: sentEmailBeforeReply?.step,
        repliedToStepName: sentEmailBeforeReply?.stepName
      });
    });

    // Sort by timestamp
    return thread.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-500 mb-4">The lead you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/outreach')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Outreach
          </button>
        </div>
      </div>
    );
  }

  const conversationThread = getConversationThread();
  const hasOutreach = lead.outreach?.emails && lead.outreach.emails.length > 0;
  const hasReplies = replies.length > 0;
  const primaryEmail = getPrimaryEmail(lead);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'hot': return 'text-red-600 bg-red-50';
      case 'warm': return 'text-orange-600 bg-orange-50';
      case 'cold': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Lead Details</h1>
            </div>
            <div className="flex items-center gap-2">
              {primaryEmail && (
                <button
                  onClick={handleReply}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4" />
                  Reply
                </button>
              )}
              <button
                onClick={handleScheduleFollowup}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Clock className="h-4 w-4" />
                Schedule Follow-up
              </button>
              <button
                onClick={handleExport}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lead Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                lead.quality === 'hot' ? 'bg-red-100 text-red-600' :
                lead.quality === 'warm' ? 'bg-orange-100 text-orange-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {lead.name?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(lead.quality)}`}>
                    {lead.quality.toUpperCase()} • Score: {lead.score}
                  </span>
                  <span className="text-sm text-gray-500">
                    Source: {lead.source}
                  </span>
                  {hasReplies && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                  )}
                  {hasOutreach && !hasReplies && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {lead.outreach?.emails.length} Email{lead.outreach?.emails.length !== 1 ? 's' : ''} Sent
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Added on</div>
              <div className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Contact Info - Using primaryEmail from emails array */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            {primaryEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <a 
                  href={`mailto:${primaryEmail}`} 
                  className="text-blue-600 hover:underline truncate"
                  title={primaryEmail}
                >
                  {primaryEmail}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <a href={lead.website} target="_blank" className="text-blue-600 hover:underline truncate">
                  {lead.website}
                </a>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">{lead.location}</span>
              </div>
            )}
          </div>

          {/* Show warning if no email found */}
          {!primaryEmail && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No email address available for this lead</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'conversation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Conversation ({conversationThread.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            {lead.ai && (
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                AI Analysis
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'conversation' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversation Thread
              </h3>

              {conversationThread.length > 0 ? (
                <div className="space-y-6">
                  {conversationThread.map((message, idx) => (
                    <div key={idx} className={`flex gap-4 ${message.type === 'reply' ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          message.type === 'reply' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {message.type === 'reply' ? (
                            <Reply className="h-5 w-5 text-green-600" />
                          ) : (
                            <Send className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`flex-1 max-w-[70%] ${message.type === 'reply' ? 'ml-auto' : ''}`}>
                        <div className={`rounded-lg p-4 ${
                          message.type === 'reply' ? 'bg-green-50' : 'bg-blue-50'
                        }`}>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${
                                message.type === 'reply' ? 'text-green-700' : 'text-blue-700'
                              }`}>
                                {message.type === 'reply' ? lead.name : 'You'}
                              </span>
                              
                              {/* Show which email this is (for sent messages) */}
                              {message.type === 'sent' && message.stepName && (
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                  {message.stepName}
                                </span>
                              )}
                              
                              {/* Show which email the reply is for (dynamic based on step) */}
                              {message.type === 'reply' && (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                  Replied to {message.repliedToStepName || message.stepName}
                                </span>
                              )}
                              
                              {message.subject && message.type === 'sent' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                                  {message.subject}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Message Content */}
                          <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Footer with status */}
                          <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                            {message.openedAt && (
                              <span className="text-blue-600 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Opened {message.openedAt.toLocaleString()}
                              </span>
                            )}
                            {message.repliedAt && (
                              <span className="text-green-600 flex items-center gap-1">
                                <Reply className="h-3 w-3" />
                                Replied {message.repliedAt.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Reply Indicator for sent messages */}
                        {message.type === 'sent' && message.repliedAt && (
                          <div className="mt-1 text-right text-xs text-green-600 flex items-center justify-end gap-1">
                            <Reply className="h-3 w-3" />
                            Client replied to this {message.stepName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No conversation history yet</p>
                  {primaryEmail && (
                    <button
                      onClick={handleReply}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send First Email
                    </button>
                  )}
                </div>
              )}

              {/* Follow-up Info */}
              {lead.outreach?.nextFollowUpAt && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        Next follow-up scheduled for:{' '}
                        <span className="font-medium">
                          {new Date(lead.outreach.nextFollowUpAt).toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      Reschedule
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Lead Details</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Name</dt>
                      <dd className="text-sm font-medium text-gray-900">{lead.name}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Email</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {primaryEmail || 'N/A'}
                      </dd>
                    </div>
                    {lead.emails && lead.emails.length > 1 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <dt className="text-sm text-gray-500">Additional Emails</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {lead.emails.slice(1).join(', ')}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Phone</dt>
                      <dd className="text-sm font-medium text-gray-900">{lead.phone || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Website</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" className="text-blue-600 hover:underline">
                            {lead.website}
                          </a>
                        ) : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Location</dt>
                      <dd className="text-sm font-medium text-gray-900">{lead.location || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Niche</dt>
                      <dd className="text-sm font-medium text-gray-900">{lead.niche || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Outreach Status</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Sequence</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.outreach?.sequenceName || 'Not started'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Progress</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.outreach ? `Step ${lead.outreach.currentStep}/${lead.outreach.totalSteps}` : 'Not started'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lead.outreach?.status === 'completed' ? 'bg-green-100 text-green-700' :
                          lead.outreach?.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.outreach?.status || 'pending'}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Emails Sent</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.outreach?.emails?.length || 0}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Last Contact</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.outreach?.lastContactedAt ? new Date(lead.outreach.lastContactedAt).toLocaleString() : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-500">Next Follow-up</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lead.outreach?.nextFollowUpAt ? new Date(lead.outreach.nextFollowUpAt).toLocaleString() : 'None'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Reply Summary */}
              {replies.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-800 mb-3">Reply Summary</h4>
                  <div className="space-y-3">
                    {replies.map((reply, idx) => (
                      <div key={idx} className="border-b border-green-200 last:border-0 pb-2 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-700">
                            Replied to {reply.stepName} on {new Date(reply.receivedAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-green-600">{reply.fromEmail}</span>
                        </div>
                        <p className="text-sm text-green-800">
                          {reply.cleanContent.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && lead.ai && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Design Score</span>
                  <span className={`text-2xl font-bold ${
                    lead.ai.designScore >= 7 ? 'text-green-600' :
                    lead.ai.designScore >= 5 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {lead.ai.designScore}/10
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      lead.ai.designScore >= 7 ? 'bg-green-600' :
                      lead.ai.designScore >= 5 ? 'bg-orange-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${lead.ai.designScore * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Issues Found</h4>
                <ul className="space-y-2">
                  {lead.ai.issues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Suggestions</h4>
                <ul className="space-y-2">
                  {lead.ai.suggestions?.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {lead.ai.analyzedAt && (
                <p className="text-xs text-gray-400 mt-4">
                  Analyzed on {new Date(lead.ai.analyzedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}