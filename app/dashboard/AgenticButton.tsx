// components/dashboard/AgenticButton.tsx
'use client';

import { useState } from 'react';

export default function AgenticButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');

  const handleStartAgentic = async () => {
    if (!niche || !location) {
      alert('Please enter both niche and location');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agentic/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ niche, location }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
        setModalOpen(false);
        setNiche('');
        setLocation('');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Failed to start Agentic pipeline'}`);
      }
    } catch (error) {
      alert('❌ Failed to connect to Agentic API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
      >
        🤖 Agentic AI
      </button>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Start Agentic AI Pipeline</h3>
            <p className="text-sm text-gray-600 mb-4">
              CrewAI will analyze and generate leads for your specified niche and location.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niche
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., AI startups, Real estate, E-commerce"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco, New York, London"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleStartAgentic}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting...' : 'Start Pipeline'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}