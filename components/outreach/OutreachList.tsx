// components/outreach/OutreachList.tsx
'use client';

import { useState } from 'react';
import { 
  EnvelopeIcon, 
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import EmailComposer from './EmailComposer';
import toast from 'react-hot-toast';

interface OutreachListProps {
  title: string;
  leads: any[];
  type: 'pending' | 'sent' | 'all';
  onUpdate?: () => void;
}

export default function OutreachList({ title, leads, type, onUpdate }: OutreachListProps) {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leads based on quality and search
  const filteredLeads = leads.filter(lead => {
    const matchesQuality = filter === 'all' || lead.quality === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesQuality && matchesSearch;
  });

  const handleSendEmail = async (leadId: string) => {
    setSendingId(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}/outreach`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to send');

      toast.success('Email sent successfully!');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSendingId(null);
    }
  };

  const handleGenerateEmail = async (lead: any) => {
    setSelectedLead(lead);
    setComposerOpen(true);
  };

  const handleBulkGenerate = async () => {
    const pendingLeads = filteredLeads.filter(l => !l.outreach?.sent);
    
    if (pendingLeads.length === 0) {
      toast.error('No pending leads to generate emails for');
      return;
    }

    toast.loading(`Generating emails for ${pendingLeads.length} leads...`);
    
    try {
      const response = await fetch('/api/outreach/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: pendingLeads.map(l => l._id) })
      });

      if (!response.ok) throw new Error('Bulk generation failed');

      toast.success(`Generated emails for ${pendingLeads.length} leads`);
      onUpdate?.();
    } catch (error) {
      toast.error('Bulk generation failed');
    }
  };

  const getStatusIcon = (lead: any) => {
    if (type === 'sent') {
      if (lead.outreach?.opened) {
        return <EyeIcon className="h-5 w-5 text-green-500" title="Opened" />;
      }
      if (lead.outreach?.replied) {
        return <ChatBubbleLeftIcon className="h-5 w-5 text-blue-500" title="Replied" />;
      }
      return <CheckCircleIcon className="h-5 w-5 text-gray-400" title="Sent" />;
    }
    
    if (lead.outreach) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-yellow-500" title="Draft ready" />;
    }
    
    return <ClockIcon className="h-5 w-5 text-gray-300" title="Pending" />;
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[quality as keyof typeof colors] || colors.cold}`}>
        {quality}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
              {filteredLeads.length}
            </span>
          </div>
          
          {type === 'pending' && filteredLeads.length > 0 && (
            <button
              onClick={handleBulkGenerate}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Generate All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Qualities</option>
            <option value="hot">Hot Only</option>
            <option value="warm">Warm Only</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {type === 'pending' 
                ? 'No pending leads to contact at the moment.'
                : 'No sent emails yet.'}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(lead)}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {lead.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">{lead.website}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{lead.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview */}
                  {lead.outreach && (
                    <div className="mt-2 ml-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Subject: {lead.outreach.subject}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {lead.outreach.message}
                      </p>
                    </div>
                  )}

                  {/* Tags & Meta */}
                  <div className="mt-2 ml-8 flex flex-wrap items-center gap-2">
                    {getQualityBadge(lead.quality)}
                    
                    <span className="text-xs text-gray-500">
                      Score: {lead.score}
                    </span>
                    
                    {lead.emails && lead.emails.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {lead.emails[0]}
                      </span>
                    )}

                    {type === 'sent' && lead.outreach?.sentAt && (
                      <span className="text-xs text-gray-400">
                        Sent {formatDistanceToNow(new Date(lead.outreach.sentAt))} ago
                      </span>
                    )}

                    {type === 'pending' && lead.outreach && (
                      <span className="text-xs text-yellow-600">
                        Draft ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 flex-shrink-0 flex space-x-2">
                  {type === 'pending' && (
                    <>
                      <button
                        onClick={() => handleGenerateEmail(lead)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        {lead.outreach ? 'Edit' : 'Generate'}
                      </button>
                      
                      {lead.outreach && (
                        <button
                          onClick={() => handleSendEmail(lead._id)}
                          disabled={sendingId === lead._id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {sendingId === lead._id ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                              Send
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {type === 'sent' && (
                    <div className="flex space-x-1">
                      {lead.outreach?.opened && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs">
                          <EyeIcon className="h-3 w-3 mr-1" />
                          Opened
                        </span>
                      )}
                      {lead.outreach?.replied && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                          <ChatBubbleLeftIcon className="h-3 w-3 mr-1" />
                          Replied
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Issues */}
              {lead.ai?.issues && lead.ai.issues.length > 0 && (
                <div className="mt-2 ml-8">
                  <div className="flex flex-wrap gap-1">
                    {lead.ai.issues.slice(0, 2).map((issue: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                      >
                        <XCircleIcon className="h-3 w-3 mr-1 text-gray-400" />
                        {issue}
                      </span>
                    ))}
                    {lead.ai.issues.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{lead.ai.issues.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
              <span>Pending: {leads.filter(l => !l.outreach?.sent).length}</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-400" />
              <span>Sent: {leads.filter(l => l.outreach?.sent).length}</span>
            </div>
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1 text-blue-400" />
              <span>Opened: {leads.filter(l => l.outreach?.opened).length}</span>
            </div>
            <div className="flex items-center">
              <ChatBubbleLeftIcon className="h-4 w-4 mr-1 text-purple-400" />
              <span>Replied: {leads.filter(l => l.outreach?.replied).length}</span>
            </div>
          </div>
          
          <div>
            <span className="font-medium">{filteredLeads.length}</span> of{' '}
            <span className="font-medium">{leads.length}</span> shown
          </div>
        </div>
      </div>

      {/* Email Composer Modal */}
      {selectedLead && (
        <EmailComposer
          lead={selectedLead}
          isOpen={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setSelectedLead(null);
          }}
          onSent={() => {
            onUpdate?.();
            setComposerOpen(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}