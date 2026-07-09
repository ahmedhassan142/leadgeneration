// app/inbound/page.tsx - UPDATED WITH TEMPERATURE FILTERING
'use client';

import { useState, useEffect, type ReactElement } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Navbar';
import InboundButtons from '@/components/Inboundbutton';
import { 
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BriefcaseIcon,
  NewspaperIcon,
  BellAlertIcon,
  RssIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  SparklesIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface InboundLead {
  _id: string;
  source: string;
  title: string;
  content: string;
  author: string;
  requirement: string;
  postedAt: string;
  status: 'new' | 'contacted' | 'replied' | 'converted' | 'ignored';
  sourceUrl: string;
  keywords: string[];
  temperature?: 'hot' | 'warm' | 'cold';
}

interface Stats {
  total: number;
  byTemperature: { hot: number; warm: number; cold: number };
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  dailyTrend: Array<{ _id: string; count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function InboundPage() {
  const [leads, setLeads] = useState<InboundLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all'); // 'hot', 'warm', 'cold', 'all'
  const [daysFilter, setDaysFilter] = useState('7'); // '7', '30', '90', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLead, setSelectedLead] = useState<InboundLead | null>(null);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, sourceFilter, temperatureFilter, daysFilter, searchQuery, pagination.page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (temperatureFilter !== 'all') params.append('temperature', temperatureFilter);
      if (daysFilter !== 'all') params.append('days', daysFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/inbound/leads?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setLeads(data.leads || []);
        setStats(data.stats);
        setPagination(data.pagination);
        setAvailableSources(data.filters?.sources || []);
      } else {
        toast.error('Failed to fetch leads');
      }
    } catch (error) {
      toast.error('Failed to fetch inbound leads');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (leadId: string, status: string) => {
    try {
      const res = await fetch('/api/inbound/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status })
      });
      
      if (res.ok) {
        toast.success('Status updated');
        fetchLeads();
      } else {
        toast.error('Update failed');
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const getSourceIcon = (source: string) => {
  const icons: Record<string, { icon: ReactElement, color: string }> = {
    reddit: { icon: <ChatBubbleLeftIcon className="h-4 w-4" />, color: 'text-orange-500' },
    twitter: { 
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/></svg>, 
      color: 'text-blue-400' 
    },
    facebook: { icon: <UserGroupIcon className="h-4 w-4" />, color: 'text-indigo-600' },
    job_board: { icon: <BriefcaseIcon className="h-4 w-4" />, color: 'text-green-600' },
    forum: { icon: <NewspaperIcon className="h-4 w-4" />, color: 'text-purple-600' },
    google_alert: { icon: <BellAlertIcon className="h-4 w-4" />, color: 'text-red-600' },
    rss: { icon: <RssIcon className="h-4 w-4" />, color: 'text-yellow-600' },
    // New sources
    press_release: { icon: <DocumentTextIcon className="h-4 w-4" />, color: 'text-teal-600' },
    wordpress_plugin: { icon: <CodeBracketIcon className="h-4 w-4" />, color: 'text-emerald-600' }
  };
  
  const defaultIcon = { icon: <GlobeAltIcon className="h-4 w-4" />, color: 'text-gray-500' };
  return icons[source] || defaultIcon;
};
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string, color: string }> = {
      new: { text: 'New', color: 'bg-blue-100 text-blue-800' },
      contacted: { text: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
      replied: { text: 'Replied', color: 'bg-green-100 text-green-800' },
      converted: { text: 'Converted', color: 'bg-purple-100 text-purple-800' },
      ignored: { text: 'Ignored', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[status] || badges.new;
  };

  const getTemperatureBadge = (temp: string | undefined) => {
    //@ts-ignore
    const badges: Record<string, { icon: ReactElement, text: string, color: string }> = {
      hot: { 
        icon: <FireIconSolid className="h-3 w-3" />, 
        text: 'Hot', 
        color: 'bg-red-100 text-red-800' 
      },
      warm: { 
        icon: <SparklesIcon className="h-3 w-3" />, 
        text: 'Warm', 
        color: 'bg-orange-100 text-orange-800' 
      },
      cold: { 
        icon: <CloudIcon className="h-3 w-3" />, 
        text: 'Cold', 
        color: 'bg-blue-100 text-blue-800' 
      }
    };
    return badges[temp || 'cold'] || badges.cold;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHrs < 24) {
      return `${diffHrs}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <main className="ml-64 pt-16 p-6">
          <div className="flex items-center justify-center h-64">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
     <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GlobeAltIcon className="h-6 w-6 text-indigo-600" />
                Inbound Leads
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                People actively looking for services
              </p>
            </div>
            <button
              onClick={fetchLeads}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-1">
                <FireIconSolid className="h-4 w-4 text-red-500" />
                <p className="text-sm text-gray-600">Hot Leads</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats?.byTemperature?.hot || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
              <div className="flex items-center gap-2 mb-1">
                <SparklesIcon className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-gray-600">Warm Leads</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats?.byTemperature?.warm || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-300">
              <div className="flex items-center gap-2 mb-1">
                <CloudIcon className="h-4 w-4 text-blue-400" />
                <p className="text-sm text-gray-600">Cold Leads</p>
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats?.byTemperature?.cold || 0}</p>
            </div>
          </div>

          {/* Inbound Scraper Buttons */}
          <div className="mb-6">
            <InboundButtons onComplete={fetchLeads} />
          </div>

          {/* Advanced Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Temperature Filter */}
              <select
                value={temperatureFilter}
                onChange={(e) => setTemperatureFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Temperatures</option>
                <option value="hot">🔥 Hot Only</option>
                <option value="warm">✨ Warm Only</option>
                <option value="cold">☁️ Cold Only</option>
                <option value="hot,warm">🔥 + ✨ Hot & Warm</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="replied">Replied</option>
                <option value="converted">Converted</option>
                <option value="ignored">Ignored</option>
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Sources</option>
                {availableSources.map(source => (
                  <option key={source} value={source}>
                    {source.replace('_', ' ')}
                  </option>
                ))}
              </select>

              {/* Date Range */}
              <select
                value={daysFilter}
                onChange={(e) => setDaysFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title/Requirement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => {
                    const sourceIcon = getSourceIcon(lead.source);
                    const statusBadge = getStatusBadge(lead.status);
                    const tempBadge = getTemperatureBadge(lead.temperature);
                    
                    return (
                      <tr key={lead._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tempBadge.color}`}>
                            {tempBadge.icon}
                            {tempBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-2 ${sourceIcon.color}`}>
                            {sourceIcon.icon}
                            <span className="text-sm text-gray-900 capitalize">
                              {lead.source.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <div className="text-sm font-medium text-gray-900">{lead.title}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{lead.content}</div>
                          {lead.keywords && lead.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lead.keywords.slice(0, 3).map(keyword => (
                                <span key={keyword} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{lead.author}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(lead.postedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatus(lead._id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusBadge.color}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="replied">Replied</option>
                            <option value="converted">Converted</option>
                            <option value="ignored">Ignored</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={lead.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            <EyeIcon className="h-4 w-4" />
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {leads.length === 0 && (
              <div className="text-center py-12">
                <GlobeAltIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inbound leads found</h3>
                <p className="text-gray-500">Try adjusting your filters or run some scrapers above</p>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}