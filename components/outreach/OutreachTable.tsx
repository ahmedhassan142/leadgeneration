// components/outreach/OutreachTable.tsx - FIXED EMAIL DISPLAY
'use client';

import { useState, Fragment, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Linkedin, 
  Twitter,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Flame,
  ThermometerSun,
  Snowflake,
  ExternalLink,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Reply,
  Inbox,
  Send,
  ArrowLeft,
  ArrowRight,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OutreachTableProps {
  leads: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalMain: number;
    totalInbound: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onSendEmail: (lead: any) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

// Helper to get primary email from lead
function getPrimaryEmail(lead: any): string | null {
  if (lead.email) return lead.email;
  if (lead.emails && lead.emails.length > 0) return lead.emails[0];
  if (lead.contactInfo?.email) return lead.contactInfo.email;
  return null;
}

// Helper to extract only the client's reply message (remove quoted original email)
function extractReplyMessage(content: string): string {
  if (!content) return '';
  
  // Look for common reply patterns
  const lines = content.split('\n');
  const cleanLines: string[] = [];
  
  let inQuotedSection = false;
  
  for (const line of lines) {
    // Check if this is a quoted line (starts with > or On... wrote:)
    if (line.startsWith('>') || 
        line.match(/^On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+\d+:\d+\s+[AP]M,\s+\w+\s+<.*>\s+wrote:/) ||
        line.includes('wrote:') ||
        line.startsWith('-----Original Message-----') ||
        (line.includes('From:') && line.includes('Sent:') && line.includes('To:')) ||
        line.startsWith('________________________________')) {
      inQuotedSection = true;
      continue;
    }
    
    // If we're not in quoted section, add the line
    if (!inQuotedSection && line.trim()) {
      cleanLines.push(line);
    }
    
    // If we hit an empty line after quoted section, break
    if (inQuotedSection && line.trim() === '') {
      break;
    }
  }
  
  // If we didn't find any clean lines, try to get the first non-quoted block
  if (cleanLines.length === 0) {
    // Split by "On ... wrote:" pattern
    const parts = content.split(/On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+\d+:\d+\s+[AP]M,\s+\w+\s+<.*>\s+wrote:/);
    if (parts.length > 1 && parts[0].trim()) {
      return parts[0].trim();
    }
    
    // Also try splitting by ">"
    const firstLine = lines.find(l => !l.startsWith('>') && l.trim());
    if (firstLine) return firstLine.trim();
  }
  
  return cleanLines.join('\n').trim();
}

// Helper to fetch all replies from sequence stats API
async function fetchAllReplies() {
  try {
    const res = await fetch('/api/outreach/sequence/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const allReplies: any[] = [];
      for (const seq of data.stats) {
        if (seq.latestReplies && seq.latestReplies.length > 0) {
          const repliesWithSeq = seq.latestReplies.map((reply: any) => ({
            ...reply,
            sequenceId: seq.sequenceId,
            sequenceName: seq.name,
            cleanContent: extractReplyMessage(reply.content)
          }));
          allReplies.push(...repliesWithSeq);
        }
      }
      return allReplies;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch replies:', error);
    return [];
  }
}

export default function OutreachTable({ 
  leads, 
  pagination, 
  onSendEmail, 
  onRefresh, 
  onPageChange,
  onLimitChange 
}: OutreachTableProps) {
  const router = useRouter();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [repliesMap, setRepliesMap] = useState<Map<string, any[]>>(new Map());
  const [allReplies, setAllReplies] = useState<any[]>([]);

  // Fetch all replies once on component mount
  useEffect(() => {
    fetchAllReplies().then(replies => {
      setAllReplies(replies);
      // Group replies by lead name
      const grouped = new Map<string, any[]>();
      replies.forEach(reply => {
        const leadKey = reply.leadName;
        if (!grouped.has(leadKey)) {
          grouped.set(leadKey, []);
        }
        grouped.get(leadKey)!.push(reply);
      });
      setRepliesMap(grouped);
    });
  }, []);

  // Get client reply messages for a lead
  const getClientReplies = (lead: any) => {
    const leadName = lead.name || lead.author || '';
    return repliesMap.get(leadName) || [];
  };

  // Check if lead has client reply
  const hasClientReply = (lead: any) => {
    return getClientReplies(lead).length > 0;
  };

  // Get sender messages (your emails)
  const getSenderMessages = (lead: any) => {
    if (!lead.outreach?.emails) return [];
    return lead.outreach.emails.filter((e: any) => 
      e.status !== 'replied' && !e.repliedAt
    );
  };

  // Status badge
  const getStatusBadge = (lead: any) => {
    if (hasClientReply(lead)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <Reply className="h-3 w-3" />
          Client Replied
        </span>
      );
    }

    if (lead.outreach?.emails?.length > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <Send className="h-3 w-3" />
          Contacted
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        <Clock className="h-3 w-3" />
        New
      </span>
    );
  };

  const getQualityBadge = (quality: string, score: number) => {
    if (quality === 'hot' || score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <Flame className="h-3 w-3" />
          HOT ({score})
        </span>
      );
    } else if (quality === 'warm' || (score >= 40 && score < 70)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
          <ThermometerSun className="h-3 w-3" />
          WARM ({score})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <Snowflake className="h-3 w-3" />
          COLD ({score})
        </span>
      );
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(lead => lead._id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLimitChange(parseInt(e.target.value));
  };

  const goToLeadDetail = (leadId: string) => {
    router.push(`/outreach/leads/${leadId}`);
  };

  // Format reply preview (first line only)
  const getReplyPreview = (content: string) => {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            <strong>{selectedLeads.length}</strong> leads selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Send Email
            </button>
            <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Add to Sequence
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead) => {
              const clientReplies = getClientReplies(lead);
              const senderMessages = getSenderMessages(lead);
              const hasReply = clientReplies.length > 0;
              const primaryEmail = getPrimaryEmail(lead);
              
              return (
                <Fragment key={lead._id}>
                  {/* Main Row */}
                  <tr 
                    className={`hover:bg-gray-50 cursor-pointer ${
                      lead.quality === 'hot' ? 'bg-red-50/30' : 
                      lead.quality === 'warm' ? 'bg-orange-50/30' : ''
                    } ${hasReply ? 'border-l-4 border-l-green-500' : ''}`}
                    onClick={() => setExpandedLead(expandedLead === lead._id ? null : lead._id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => handleSelectLead(lead._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {lead.name || lead.author || 'Unknown'}
                          {hasReply && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              New Reply
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {primaryEmail || 'No email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getQualityBadge(lead.quality, lead.score)}</td>
                    <td className="px-4 py-3">{getStatusBadge(lead)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {lead.outreach?.lastContactedAt 
                        ? new Date(lead.outreach.lastContactedAt).toLocaleDateString()
                        : new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSendEmail(lead)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                          disabled={!primaryEmail}
                          title={!primaryEmail ? 'No email address' : 'Reply'}
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => goToLeadDetail(lead._id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row - Show Conversation Thread */}
                  {expandedLead === lead._id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* Conversation Thread */}
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Conversation Thread
                            </h4>
                            
                            <div className="space-y-4">
                              {/* Sender Messages (Your emails) */}
                              {senderMessages.map((email, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <User className="h-4 w-4 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-blue-700">You</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(email.sentAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{email.body}</p>
                                    {email.openedAt && (
                                      <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        Opened {new Date(email.openedAt).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Client Replies - Show only the reply message, not the quoted email */}
                              {clientReplies.map((reply, idx) => (
                                <div key={idx} className="flex gap-3 flex-row-reverse">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                      <Reply className="h-4 w-4 text-green-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-green-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-green-700">
                                        {lead.name || 'Client'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(reply.receivedAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                      {reply.cleanContent || reply.content}
                                    </p>
                                    {reply.stepName && (
                                      <div className="mt-2 pt-1 text-xs text-green-600 flex items-center gap-1 border-t border-green-200">
                                        <Reply className="h-3 w-3" />
                                        Replied to {reply.stepName} email
                                      </div>
                                    )}
                                    {reply.sequenceName && (
                                      <div className="text-xs text-green-500">
                                        Sequence: {reply.sequenceName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {senderMessages.length === 0 && clientReplies.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  No conversation history yet
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Follow-up Info */}
                          {lead.outreach?.nextFollowUpAt && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-sm text-blue-800">
                                  Next follow-up scheduled for:{' '}
                                  <span className="font-medium">
                                    {new Date(lead.outreach.nextFollowUpAt).toLocaleString()}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}

                          {/* View Full Details Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => goToLeadDetail(lead._id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                            >
                              View Full Details
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pagination.limit}
            onChange={handlePageSizeChange}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={!pagination.hasPrevPage}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="px-3 py-1 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}