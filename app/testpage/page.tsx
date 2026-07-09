// app/test-sequence-stats/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function TestSequenceStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/outreach/sequence/stats')
      .then(res => res.json())
      .then(data => {
        console.log('📊 SEQUENCE STATS API RESPONSE:', data);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching sequence stats:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-lg font-semibold">Loading sequence stats...</div>
        <div className="mt-2 text-gray-500">Fetching data from /api/outreach/sequence/stats</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600 font-semibold">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sequence Stats API Test</h1>
      
      <div className="mb-4">
        <div className="font-semibold">API Endpoint:</div>
        <code className="bg-gray-100 p-1 rounded">/api/outreach/sequence/stats</code>
      </div>
      
      <div className="mb-4">
        <div className="font-semibold">Response Status:</div>
        <div className="text-green-600">✅ Success: {data?.success ? 'true' : 'false'}</div>
      </div>
      
      <div className="mb-4">
        <div className="font-semibold">Sequences Found:</div>
        <div>{data?.stats?.length || 0} sequences</div>
      </div>
      
      <div className="mb-4">
        <div className="font-semibold">Total Replies:</div>
        <div>
          {data?.stats?.reduce((total: number, seq: any) => total + (seq.totalReplies || 0), 0)} replies across all sequences
        </div>
      </div>
      
      <div className="mb-4">
        <div className="font-semibold">Replies with Content:</div>
        <div>
          {data?.stats?.reduce((total: number, seq: any) => total + (seq.latestReplies?.length || 0), 0)} replies in latestReplies
        </div>
      </div>
      
      <h2 className="text-xl font-bold mt-6 mb-2">All Sequences</h2>
      {data?.stats?.map((seq: any, idx: number) => (
        <div key={idx} className="mb-6 border rounded-lg p-4 bg-gray-50">
          <div className="font-bold text-lg">{seq.name}</div>
          <div className="text-sm text-gray-600">ID: {seq.sequenceId}</div>
          <div className="mt-2">
            <div>Total Replied: <strong>{seq.totalReplies}</strong></div>
            <div>Replies by Step: {JSON.stringify(seq.repliesByStep)}</div>
            <div className="mt-2">
              <div className="font-semibold">Latest Replies ({seq.latestReplies?.length || 0}):</div>
              {seq.latestReplies?.map((reply: any, ridx: number) => (
                <div key={ridx} className="mt-2 p-2 bg-white rounded border">
                  <div><strong>From:</strong> {reply.fromEmail}</div>
                  <div><strong>Lead:</strong> {reply.leadName}</div>
                  <div><strong>Step:</strong> {reply.stepName} (Step {reply.step})</div>
                  <div><strong>Received:</strong> {new Date(reply.receivedAt).toLocaleString()}</div>
                  <div><strong>Content:</strong></div>
                  <div className="bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap text-sm">
                    {reply.content || '(No content)'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}