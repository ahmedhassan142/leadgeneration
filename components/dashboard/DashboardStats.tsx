// components/dashboard/DashboardStats.tsx
'use client';

import { 
  UserGroupIcon, 
  FireIcon, 
  EnvelopeIcon, 
  ChartBarIcon,
  CpuChipIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface StatsProps {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  contactedLeads: number;
  conversionRate: string;
  aiJobsCompleted?: number;
  avgAIScore?: number;
  pendingJobs?: number;
  processingJobs?: number;
}

export default function DashboardStats({ 
  totalLeads, 
  hotLeads,
  warmLeads,
  coldLeads,
  contactedLeads, 
  conversionRate,
  aiJobsCompleted = 0,
  avgAIScore = 0,
  pendingJobs = 0,
  processingJobs = 0
}: StatsProps) {
  
  // Calculate real conversion rate (hot leads / total)
  const hotConversionRate = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;
  
  const stats = [
    {
      name: 'Total Leads',
      value: totalLeads,
      subValue: `${warmLeads} warm • ${coldLeads} cold`,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      change: `${hotConversionRate}% hot`,
      changeType: hotConversionRate > 20 ? 'positive' : 'neutral',
    },
    {
      name: 'Hot Leads',
      value: hotLeads,
      subValue: `${Math.round((hotLeads / (totalLeads || 1)) * 100)}% of total`,
      icon: FireIcon,
      color: 'bg-red-500',
      change: `+${hotLeads} ready`,
      changeType: hotLeads > 0 ? 'positive' : 'neutral',
    },
    {
      name: 'AI Analysis',
      value: aiJobsCompleted,
      subValue: `Avg score: ${avgAIScore.toFixed(1)}/10`,
      icon: CpuChipIcon,
      color: 'bg-purple-500',
      change: `${processingJobs} processing`,
      changeType: processingJobs > 0 ? 'positive' : 'neutral',
    },
    {
      name: 'Queue Status',
      value: pendingJobs,
      subValue: `${processingJobs} active jobs`,
      icon: BoltIcon,
      color: 'bg-yellow-500',
      change: `${pendingJobs} pending`,
      changeType: pendingJobs > 0 ? 'neutral' : 'positive',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6 hover:shadow-lg transition-shadow duration-300"
        >
          <dt>
            <div className={`absolute rounded-md ${stat.color} p-3`}>
              <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex flex-col">
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {stat.change}
              </p>
            </div>
            {stat.subValue && (
              <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
            )}
          </dd>
        </div>
      ))}
    </div>
  );
}