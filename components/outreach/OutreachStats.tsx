// components/outreach/OutreachStats.tsx
'use client';

interface OutreachStatsProps {
  stats: any;
}

export default function OutreachStats({ stats }: OutreachStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
      <div className="bg-white rounded-lg shadow px-4 py-5">
        <dt className="text-sm font-medium text-gray-500 truncate">Pending Outreach</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">
          {stats?.pendingOutreach || 0}
        </dd>
      </div>
      
      <div className="bg-white rounded-lg shadow px-4 py-5">
        <dt className="text-sm font-medium text-gray-500 truncate">Sent This Week</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">
          {stats?.sentThisWeek || 0}
        </dd>
      </div>
      
      <div className="bg-white rounded-lg shadow px-4 py-5">
        <dt className="text-sm font-medium text-gray-500 truncate">Open Rate</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">
          {stats?.openRate || 0}%
        </dd>
      </div>
      
      <div className="bg-white rounded-lg shadow px-4 py-5">
        <dt className="text-sm font-medium text-gray-500 truncate">Reply Rate</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">
          {stats?.replyRate || 0}%
        </dd>
      </div>
    </div>
  );
}