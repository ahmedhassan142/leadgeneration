// components/leads/LeadFilters.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface LeadFiltersProps {
  filters: {
    quality: string;
    niche: string;
    search: string;
  };
  onFilterChange: (filters: any) => void;
}

const niches = [
  'real estate agents',
  'plumbers',
  'electricians',
  'dentists',
  'roofers',
  'landscapers',
  'contractors',
  'photographers'
];

export default function LeadFilters({ filters, onFilterChange }: LeadFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        {/* Quality Filter */}
        <select
          value={filters.quality}
          onChange={(e) => onFilterChange({ ...filters, quality: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Qualities</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>

        {/* Niche Filter */}
        <select
          value={filters.niche}
          onChange={(e) => onFilterChange({ ...filters, niche: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Niches</option>
          {niches.map(niche => (
            <option key={niche} value={niche}>{niche}</option>
          ))}
        </select>

        {/* Clear Filters */}
        <button
          onClick={() => onFilterChange({ quality: '', niche: '', search: '' })}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}