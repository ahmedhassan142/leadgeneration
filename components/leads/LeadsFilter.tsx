'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeadFiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
}

export default function LeadFilters({ filters, setFilters }: LeadFiltersProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    status: '',
    niche: '',
    minScore: '',
    maxScore: '',
    dateFrom: '',
    dateTo: '',
  });

  const statuses = ['new', 'contacted', 'hot', 'cold', 'converted', 'lost'];
  const niches = ['Real Estate', 'Automotive', 'Healthcare', 'Education', 'Technology', 'Finance', 'Retail', 'Other'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search });
  };

  const clearSearch = () => {
    setSearch('');
    setFilters({ ...filters, search: '' });
  };

  const applyFilters = () => {
    const cleanedFilters = Object.fromEntries(
      Object.entries(tempFilters).filter(([_, v]) => v !== '')
    );
    setFilters({ ...filters, ...cleanedFilters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({
      status: '',
      niche: '',
      minScore: '',
      maxScore: '',
      dateFrom: '',
      dateTo: '',
    });
    setFilters({});
    setShowFilters(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search leads by name, phone, email, or niche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} className="mr-2" />
          Filters
        </Button>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={tempFilters.status}
                onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Niche Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niche/Industry</label>
              <select
                value={tempFilters.niche}
                onChange={(e) => setTempFilters({ ...tempFilters, niche: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Niches</option>
                {niches.map((niche) => (
                  <option key={niche} value={niche}>{niche}</option>
                ))}
              </select>
            </div>

            {/* AI Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Score Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={tempFilters.minScore}
                  onChange={(e) => setTempFilters({ ...tempFilters, minScore: e.target.value })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={tempFilters.maxScore}
                  onChange={(e) => setTempFilters({ ...tempFilters, maxScore: e.target.value })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={tempFilters.dateFrom}
                onChange={(e) => setTempFilters({ ...tempFilters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={tempFilters.dateTo}
                onChange={(e) => setTempFilters({ ...tempFilters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>

          {/* Active Filters Display */}
          {Object.keys(filters).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {
              (Object.entries(filters) as [string, any][]).map(([key, value]) => (
                value && (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {key}: {String(value)}
                    <button
                      onClick={() => {
                        const newFilters = { ...filters };
                        delete newFilters[key];
                        setFilters(newFilters);
                      }}
                      className="ml-2 hover:text-blue-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}