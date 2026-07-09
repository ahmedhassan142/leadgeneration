// components/outreach/RepliesDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, User, Calendar, Mail, ChevronRight } from 'lucide-react';

interface Reply {
  leadName: string;
  leadEmail: string;
  step: number;
  stepName: string;
  content: string;
  fromEmail: string;
  receivedAt: string;
  sequenceName?: string;
}

interface RepliesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  replies: Reply[];
  onReply?: (reply: Reply) => void;
}

export default function RepliesDialog({ isOpen, onClose, replies, onReply }: RepliesDialogProps) {
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);

  useEffect(() => {
    if (replies.length > 0 && !selectedReply) {
      setSelectedReply(replies[0]);
    }
  }, [replies]);

  if (!isOpen) return null;

  const getStepBadgeColor = (step: number) => {
    switch(step) {
      case 1: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 4: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepIcon = (step: number) => {
    switch(step) {
      case 1: return '📧';
      case 2: return '🔄';
      case 3: return '⚡';
      case 4: return '🏁';
      default: return '💬';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Client Replies</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Replies List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <div className="p-2">
              {replies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No replies yet
                </div>
              ) : (
                replies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedReply(reply)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                      selectedReply === reply
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {reply.leadName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStepBadgeColor(reply.step)}`}>
                          {getStepIcon(reply.step)} {reply.stepName}
                        </span>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${
                        selectedReply === reply ? 'translate-x-1' : ''
                      }`} />
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {reply.content?.substring(0, 80)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{new Date(reply.receivedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="truncate">{reply.fromEmail}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Reply Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedReply ? (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{selectedReply.leadName}</div>
                        <div className="text-sm text-gray-500">{selectedReply.leadEmail}</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStepBadgeColor(selectedReply.step)}`}>
                      {getStepIcon(selectedReply.step)} {selectedReply.stepName}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{selectedReply.fromEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(selectedReply.receivedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {selectedReply.sequenceName && (
                    <div className="mt-2 text-xs text-gray-500">
                      Sequence: {selectedReply.sequenceName}
                    </div>
                  )}
                </div>

                {/* Reply Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <h3 className="font-medium text-gray-900">Reply Message</h3>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {selectedReply.content}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (onReply) onReply(selectedReply);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Reply to Client
                  </button>
                  <button
                    onClick={() => window.open(`mailto:${selectedReply.fromEmail}`)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Open in Email
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a reply to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}