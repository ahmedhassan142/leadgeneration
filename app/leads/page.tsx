// app/leads/page.tsx
'use client';

import { useState, useEffect } from 'react';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadFilters from '@/components/leads/LeadFilters';
import BulkActions from '@/components/leads/BulkActions';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    quality: '',
    niche: '',
    search: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    page: 1
  });
  
  useEffect(() => {
    fetchLeads();
  }, [filters]);
  
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters as any);
      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600 mt-2">
              Manage and analyze your leads
            </p>
          </div>
          <BulkActions selectedLeads={[]} onActionComplete={fetchLeads} />
        </div>
        
        <LeadFilters filters={filters} onFilterChange={setFilters} />
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <LeadsTable 
            leads={leads} 
            pagination={pagination}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        )}
      </div>
    </div>
  );
}