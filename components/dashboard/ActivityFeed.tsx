// components/dashboard/ActivityFeed.tsx
'use client';

import { ClockIcon } from '@heroicons/react/24/outline';

interface ActivityFeedProps {
  leads: any[];
}

export default function ActivityFeed({ leads }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="flow-root">
        <ul className="divide-y divide-gray-200">
          {leads.map((lead) => (
            <li key={lead._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    lead.quality === 'hot' ? 'bg-red-100' :
                    lead.quality === 'warm' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <span className="text-sm font-medium">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {lead.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {lead.niche} • {lead.location}
                  </p>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}