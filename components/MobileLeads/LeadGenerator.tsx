// app/dashboard/components/LeadGenerator.tsx
'use client';

import { useState } from 'react';

interface Props {
  onSuccess: () => void;
}

export default function LeadGenerator({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [config, setConfig] = useState({
    categories: ['finance', 'business', 'health', 'education', 'shopping', 'food'],
    countries: ['us', 'ca', 'gb', 'au'],
    maxAppsPerCategory: 100
  });

  const startGeneration = async () => {
    setLoading(true);
    setStatus('Starting generation...');
    
    try {
      const response = await fetch('/api/mobile-leads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        setStatus('Generation started!');
        checkJobStatus(data.jobId);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error:any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const checkJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/mobile-leads/generate?jobId=${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.job.status === 'completed') {
            setStatus('✅ Generation completed!');
            setLoading(false);
            clearInterval(interval);
            onSuccess();
          } else if (data.job.status === 'failed') {
            setStatus(`❌ Failed: ${data.job.error}`);
            setLoading(false);
            clearInterval(interval);
          } else {
            setStatus(`⏳ Running... (started at ${new Date(data.job.startedAt).toLocaleTimeString()})`);
          }
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Generate New Leads
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Generate Mobile App Leads</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories
                </label>
                <select
                  multiple
                  value={config.categories}
                  onChange={(e) => setConfig({
                    ...config,
                    categories: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2 h-32"
                >
                  <option value="finance">Finance</option>
                  <option value="business">Business</option>
                  <option value="health">Health & Fitness</option>
                  <option value="education">Education</option>
                  <option value="shopping">Shopping</option>
                  <option value="food">Food & Drink</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Countries
                </label>
                <select
                  multiple
                  value={config.countries}
                  onChange={(e) => setConfig({
                    ...config,
                    countries: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2 h-24"
                >
                  <option value="us">United States</option>
                  <option value="ca">Canada</option>
                  <option value="gb">United Kingdom</option>
                  <option value="au">Australia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apps per Category
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={config.maxAppsPerCategory}
                  onChange={(e) => setConfig({
                    ...config,
                    maxAppsPerCategory: parseInt(e.target.value)
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              {status && (
                <div className={`p-3 rounded-lg ${
                  status.includes('✅') ? 'bg-green-50 text-green-800' :
                  status.includes('❌') ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  {status}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startGeneration}
                  disabled={loading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Generating...' : 'Start Generation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}