// app/blocked-sites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ShieldExclamationIcon, ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function BlockedSitesPage() {
  const [blockedSites, setBlockedSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchBlockedSites = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/debug/blocked-sites');
      const data = await res.json();
      setBlockedSites(data.leads || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch blocked sites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBlockedSites();
    const interval = setInterval(fetchBlockedSites, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const markForManualReview = async (leadId: string) => {
    try {
      const res = await fetch('/api/leads/manual-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      
      if (res.ok) {
        // Refresh the list
        fetchBlockedSites();
      }
    } catch (error) {
      console.error('Failed to mark for review:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <ShieldExclamationIcon className="h-8 w-8 text-yellow-500" />
            <h1 className="text-2xl font-bold">Blocked Sites Monitor</h1>
          </div>
          <button
            onClick={fetchBlockedSites}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <div className="text-sm text-red-400">Total Blocked</div>
              <div className="text-3xl font-bold">{stats.totalBlocked}</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <div className="text-sm text-yellow-400">Rate Limited</div>
              <div className="text-3xl font-bold">{stats.rateLimited || 0}</div>
            </div>
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <div className="text-sm text-purple-400">Captcha Required</div>
              <div className="text-3xl font-bold">{stats.captchaRequired || 0}</div>
            </div>
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="text-sm text-blue-400">Need Review</div>
              <div className="text-3xl font-bold">{blockedSites.length}</div>
            </div>
          </div>
        )}

        {/* Blocked Sites Table */}
        {blockedSites.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <ShieldExclamationIcon className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No Blocked Sites</h3>
            <p className="text-gray-500">All websites are accessible</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Block Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Detected At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {blockedSites.map((site) => (
                  <tr key={site._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{site.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={site.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 truncate block max-w-xs"
                      >
                        {site.website}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        site.blockReason?.includes('429') ? 'bg-yellow-900 text-yellow-200' :
                        site.blockReason?.includes('captcha') ? 'bg-purple-900 text-purple-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {site.blockReason || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(site.detectedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => window.open(site.website, '_blank')}
                        className="text-blue-400 hover:text-blue-300 mr-3"
                        title="Open website"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => markForManualReview(site._id)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title="Mark for manual review"
                      >
                        <ShieldExclamationIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 bg-blue-900/30 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Tips for Blocked Sites</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Try visiting these sites manually to collect contact information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Check if the site has a contact form instead of email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Look for social media profiles (Facebook, LinkedIn) as alternatives</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Consider using a different proxy or VPN for these sites</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}