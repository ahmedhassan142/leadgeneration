// components/outreach/SequenceStats.tsx
'use client';

import { 
  BarChart3, 
  TrendingUp, 
  Mail, 
  Eye, 
  MessageCircle, 
  CheckCircle,
  RefreshCw 
} from 'lucide-react';

interface SequenceStat {
  sequenceId: string;
  name: string;
  total: number;
  completed: number;
  active: number;
  totalOpens: number;
  totalReplies: number;
  conversionRate: string;
}

interface SequenceStatsProps {
  stats: SequenceStat[];
  onRefresh: () => void;
}

export default function SequenceStats({ stats, onRefresh }: SequenceStatsProps) {
  const totalLeads = stats.reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
  const totalOpens = stats.reduce((sum, s) => sum + s.totalOpens, 0);
  const totalReplies = stats.reduce((sum, s) => sum + s.totalReplies, 0);
  const avgConversion = totalLeads > 0 ? ((totalCompleted / totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total in Sequences</p>
              <p className="text-2xl font-semibold text-gray-900">{totalLeads}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-green-600">{totalCompleted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Opens</p>
              <p className="text-2xl font-semibold text-blue-600">{totalOpens}</p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Replies</p>
              <p className="text-2xl font-semibold text-purple-600">{totalReplies}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion</p>
              <p className="text-2xl font-semibold text-orange-600">{avgConversion}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Sequence Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Sequence Performance</h3>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sequence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Replies</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.map((stat) => (
                <tr key={stat.sequenceId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{stat.name}</td>
                  <td className="px-4 py-3">{stat.total}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      {stat.active}
                    </span>
                  </td>
                  <td className="px-4 py-3">{stat.completed}</td>
                  <td className="px-4 py-3">{stat.totalOpens}</td>
                  <td className="px-4 py-3">{stat.totalReplies}</td>
                  <td className="px-4 py-3 font-semibold text-purple-600">{stat.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}