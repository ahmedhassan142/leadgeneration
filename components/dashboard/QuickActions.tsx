// components/dashboard/QuickActions.tsx
'use client';

import { PlusIcon, DocumentArrowDownIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function QuickActions() {
  const router = useRouter();
  const [scraping, setScraping] = useState(false);

  const startScrape = async () => {
    setScraping(true);
    try {
      const response = await fetch('/api/background/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'real-estate',
          location: 'Austin, TX'
        })
      });
      
      if (!response.ok) throw new Error('Failed to start scrape');
      
      toast.success('Scraping job started!');
      router.refresh();
    } catch (error) {
      toast.error('Failed to start scraping');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={startScrape}
          disabled={scraping}
          className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {scraping ? 'Starting...' : 'New Scrape'}
        </button>
        
        <button
          onClick={() => router.push('/leads?quality=hot')}
          className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          View Hot Leads
        </button>
        
        <button
          onClick={() => router.push('/outreach')}
          className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <EnvelopeIcon className="h-5 w-5 mr-2" />
          Go to Outreach
        </button>
      </div>
    </div>
  );
}