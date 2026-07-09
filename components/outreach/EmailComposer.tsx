// components/outreach/EmailComposer.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface EmailComposerProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export default function EmailComposer({ lead, isOpen, onClose, onSent }: EmailComposerProps) {
  const [subject, setSubject] = useState(lead?.outreach?.subject || '');
  const [message, setMessage] = useState(lead?.outreach?.message || '');
  const [sending, setSending] = useState(false);
  
  const handleSend = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/leads/${lead._id}/outreach`, {
        method: 'PATCH',
      });
      
      if (!response.ok) throw new Error('Failed to send');
      
      toast.success('Email sent successfully!');
      onSent();
      onClose();
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Compose Email to {lead?.name}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="email"
                value={lead?.emails?.[0] || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Lead Score: {lead?.score}</h4>
              <p className="text-sm text-blue-600">
                Issues: {lead?.ai?.issues?.join(', ') || 'No issues detected'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}