// components/outreach/OutreachFilters.tsx
'use client';

import { useState } from 'react';
import { 
  Filter, 
  RefreshCw, 
  Download, 
  ChevronDown,
  Users,
  UserPlus,
  ThermometerSun,
  Flame,
  Snowflake
} from 'lucide-react';

interface OutreachFiltersProps {
  filters: any;
  onChange: (filters: any) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function OutreachFilters({ filters, onChange, onRefresh, onExport }: OutreachFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const leadTypes = [
    { value: 'all', label: 'All Leads', icon: <Users className="h-4 w-4" /> },
    { value: 'main', label: 'Outbound Leads', icon: <UserPlus className="h-4 w-4" /> },
    { value: 'inbound', label: 'Inbound Leads', icon: <Users className="h-4 w-4" /> }
  ];

  const qualityOptions = [
    { value: '', label: 'All Qualities' },
    { value: 'hot', label: '🔥 Hot Leads', color: 'text-red-600' },
    { value: 'warm', label: '🌡️ Warm Leads', color: 'text-orange-600' },
    { value: 'cold', label: '❄️ Cold Leads', color: 'text-blue-600' }
  ];

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    { value: 'github', label: 'GitHub' },
    { value: 'product_hunt', label: 'Product Hunt' },
    { value: 'serp_api', label: 'SERP (Real Estate)' },
    { value: 'scrapingdog', label: 'ScrapingDog (Multi)' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'discord', label: 'Discord' },
    { value: 'slack', label: 'Slack' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'new', label: '🆕 New' },
    { value: 'contacted', label: '📞 Contacted' },
    { value: 'replied', label: '💬 Replied' },
    { value: 'converted', label: '✅ Converted' },
    { value: 'ignored', label: '⏭️ Ignored' }
  ];

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const sortOptions = [
    { value: 'score', label: 'Score' },
    { value: 'postedAt', label: 'Date' },
    { value: 'quality', label: 'Quality' },
    { value: 'source', label: 'Source' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Quick Filter Bar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Lead Type Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {leadTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onChange({ ...filters, type: type.value })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filters.type === type.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>

          {/* Quality Filter */}
          <select
            value={filters.quality}
            onChange={(e) => onChange({ ...filters, quality: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {qualityOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className={opt.color}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filters.source}
            onChange={(e) => onChange({ ...filters, source: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={onExport}
            className="p-1.5 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => onChange({ ...filters, dateRange: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                {dateRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.minScore || ''}
                onChange={(e) => onChange({ ...filters, minScore: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.maxScore || ''}
                onChange={(e) => onChange({ ...filters, maxScore: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                placeholder="100"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-red-500" />
              <span>Hot: <span className="font-semibold">247</span></span>
            </div>
            <div className="flex items-center gap-1">
              <ThermometerSun className="h-4 w-4 text-orange-500" />
              <span>Warm: <span className="font-semibold">892</span></span>
            </div>
            <div className="flex items-center gap-1">
              <Snowflake className="h-4 w-4 text-blue-500" />
              <span>Cold: <span className="font-semibold">2,156</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}