// components/outreach/OutreachComposer.tsx
'use client';

import { useState } from 'react';
import { X, Send, Clock, AlertCircle } from 'lucide-react';

const TEMPLATES = [
  { id: 'intro', name: 'Intro Email' },
  { id: 'followup-1', name: 'First Follow-up' },
  { id: 'followup-2', name: 'Second Follow-up' },
  { id: 'final', name: 'Final Email' }
];
//@ts-ignore
export default function OutreachComposer({ lead, onClose, onSent }) {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('intro');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [startSequence, setStartSequence] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          leadType: lead.source ? 'inbound' : 'main',
          template: selectedTemplate,
          customMessage: message || undefined
        })
      });

      if (res.ok) {
        if (startSequence) {
          await fetch('/api/outreach/sequence/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead._id,
              leadType: lead.source ? 'inbound' : 'main',
              sequenceType: 'standard'
            })
          });
        }
        onSent();
        onClose();
      }
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Send Email to {lead.name || lead.title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Lead Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">To:</span> {lead.emails?.[0] || lead.authorProfile || 'No email'}
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Write your message here..."
              className="w-full p-2 border rounded-lg font-mono text-sm"
            />
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="startSequence"
              checked={startSequence}
              onChange={(e) => setStartSequence(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="startSequence" className="text-sm text-gray-700">
              Start follow-up sequence after this email
            </label>
          </div>

          {/* Warning for no email */}
          {!lead.emails?.[0] && !lead.authorProfile?.includes('@') && (
            <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                No email found for this lead. The outreach will be logged but email won't be sent.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || (!lead.emails?.[0] && !lead.authorProfile?.includes('@'))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}