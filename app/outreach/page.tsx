// app/outreach/page.tsx - UPDATED WITH SEQUENCE STATS AND PROCESSING
'use client';

import { useState, useEffect } from 'react';
import OutreachSidebar from '@/components/outreach/OutreachSidebar';
import OutreachHeader from '@/components/outreach/OutreachHeader';
import OutreachFilters from '@/components/outreach/OutreachFilters';
import OutreachStats from '@/components/outreach/OutreachStats';
import OutreachTable from '@/components/outreach/OutreachTable';
import OutreachComposer from '@/components/outreach/OutreachComposer';
import SequenceManager from '@/components/outreach/SequenceManager';
import SequenceStats from '@/components/SequenceStats';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Play, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface OutreachFilters {
  type: string;
  quality: string;
  status: string;
  source: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
  tags: string[];
  minScore?: number;
  maxScore?: number;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  targetQualities: string[];
  totalSteps: number;
  totalDays: number;
  isActive: boolean;
  isDefault: boolean;
  leadsCount: number;
  steps?: any[];
}

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

export default function OutreachPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [sequenceStats, setSequenceStats] = useState<SequenceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingFollowups, setProcessingFollowups] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showSequenceManager, setShowSequenceManager] = useState(false);
  const [showSequenceStats, setShowSequenceStats] = useState(false);
  const [activeFilter, setActiveFilter] = useState({
    type: 'view',
    value: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalMain: 0,
    totalInbound: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState<OutreachFilters>({
    type: 'all',
    quality: '',
    status: '',
    source: '',
    dateRange: 'week',
    sortBy: 'score',
    sortOrder: 'desc',
    search: '',
    tags: []
  });

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchSequences();
    fetchSequenceStats();
  }, [filters, pagination.page, pagination.limit, activeFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        leadType: filters.type,
        quality: filters.quality,
        status: activeFilter.type === 'status' ? activeFilter.value : filters.status,
        source: filters.source,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        minScore: filters.minScore?.toString() || '',
        maxScore: filters.maxScore?.toString() || '',
        view: activeFilter.type === 'view' ? activeFilter.value : 'all'
      });
      
      const res = await fetch(`/api/outreach/leads?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setLeads(data.leads || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/outreach/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/outreach/sequence');
      const data = await res.json();
      if (data.success) {
        setSequences(data.sequences);
      }
    } catch (error) {
      console.error('Failed to fetch sequences:', error);
    }
  };

  const fetchSequenceStats = async () => {
    try {
      const res = await fetch('/api/outreach/sequence/stats');
      const data = await res.json();
      if (data.success) {
        setSequenceStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch sequence stats:', error);
    }
  };

  const handleProcessFollowups = async () => {
    setProcessingFollowups(true);
    const toastId = toast.loading('Processing pending follow-ups...');

    try {
      const res = await fetch('/api/outreach/sequence/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
        }
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          <div>
            <p className="font-semibold">✅ Follow-ups processed!</p>
            <p className="text-xs mt-1">Processed: {data.processed} leads</p>
          </div>,
          { id: toastId, duration: 5000 }
        );
        // Refresh data
        fetchStats();
        fetchSequenceStats();
      } else {
        toast.error(`❌ Failed: ${data.error}`, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`, { id: toastId });
    } finally {
      setProcessingFollowups(false);
    }
  };

// app/outreach/page.tsx - UPDATE FILTER HANDLER
const handleFilterChange = (type: string, value: string) => {
  setActiveFilter({ type, value });
  setPagination(prev => ({ ...prev, page: 1 }));
  
  if (type === 'status') {
    // 👇 This now works for 'replied' status
    setFilters(prev => ({ ...prev, status: value }));
  } else if (type === 'view' && value === 'active-sequences') {
    setShowSequenceManager(true);
    setShowSequenceStats(false);
  } else if (type === 'view' && value === 'sequence-stats') {
    setShowSequenceStats(true);
    setShowSequenceManager(false);
  } else {
    setShowSequenceManager(false);
    setShowSequenceStats(false);
  }
  
  if (type === 'sequence') {
    setFilters(prev => ({ ...prev, sequence: value }));
  }
};

  const handleSendEmail = (lead: any) => {
    setSelectedLead(lead);
    setShowComposer(true);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(leads, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `outreach-leads-page-${pagination.page}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSequenceSelect = (sequenceId: string) => {
    setActiveFilter({ type: 'sequence', value: sequenceId });
    setShowSequenceManager(false);
    setShowSequenceStats(false);
  };

  const handleSequenceToggle = async (sequenceId: string) => {
    try {
      const res = await fetch(`/api/outreach/sequence/${sequenceId}/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Failed to toggle sequence:', error);
    }
  };

  const handleSequenceCreate = () => {
    // Navigate to sequence creation page or open modal
    console.log('Create new sequence');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OutreachSidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onFilterChange={handleFilterChange}
        activeFilter={activeFilter}
      />
      
      <OutreachHeader 
        onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Outreach Dashboard"
      />
      
      <main className={`pt-16 transition-all duration-300 ${
        sidebarCollapsed ? 'pl-20' : 'pl-64'
      }`}>
        <div className="p-6">
          {/* Stats Section */}
          {stats && <OutreachStats stats={stats} />}
          
          {/* Manual Follow-up Button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleProcessFollowups}
              disabled={processingFollowups}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {processingFollowups ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {processingFollowups ? 'Processing...' : 'Process Pending Follow-ups'}
            </button>
          </div>

          {/* Sequence Stats View */}
          {showSequenceStats && (
            <div className="mb-6">
              <SequenceStats stats={sequenceStats} onRefresh={fetchSequenceStats} />
            </div>
          )}
          
          {/* Conditionally show either Sequence Manager or regular content */}
          {showSequenceManager ? (
            <SequenceManager
              sequences={sequences}
              onSelect={handleSequenceSelect}
              onCreate={handleSequenceCreate}
              onToggle={handleSequenceToggle}
            />
          ) : !showSequenceStats && (
            <>
              {/* Filters Section */}
              <OutreachFilters 
                filters={filters}
                onChange={setFilters}
                onRefresh={fetchLeads}
                onExport={handleExport}
              />
              
              {/* Active Filter Indicator */}
              {activeFilter.type === 'status' && (
                <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  Showing leads with status: <strong>{activeFilter.value}</strong>
                  <button 
                    onClick={() => handleFilterChange('view', 'all')}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              {activeFilter.type === 'sequence' && (
                <div className="mb-4 p-2 bg-purple-50 text-purple-700 rounded-lg text-sm">
                  Showing leads in sequence: <strong>{sequences.find(s => s.id === activeFilter.value)?.name}</strong>
                  <button 
                    onClick={() => handleFilterChange('view', 'all')}
                    className="ml-2 text-purple-600 hover:text-purple-800 underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              
              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                </div>
              ) : (
                /* Leads Table with Pagination */
                <OutreachTable 
                  leads={leads}
                  pagination={pagination}
                  onSendEmail={handleSendEmail}
                  onRefresh={fetchLeads}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Email Composer Modal */}
      {showComposer && (
        <OutreachComposer
          lead={selectedLead}
          onClose={() => {
            setShowComposer(false);
            setSelectedLead(null);
          }}
          onSent={() => {
            fetchLeads();
            fetchStats();
            fetchSequenceStats();
          }}
        />
      )}
    </div>
  );
}