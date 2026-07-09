'use client';

import React, { useState } from 'react';
import { Database, Upload, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ExportStatusProps {
  onExportComplete?: () => void;
}

export default function ExportStatus({ onExportComplete }: ExportStatusProps) {
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/export-to-sandbox');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async (type: string = 'pending') => {
    setExporting(true);
    
    try {
      const res = await fetch('/api/export-to-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, limit: 100 })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchStats();
        onExportComplete?.();
        
        // Show sample data
        if (data.sampleData?.length > 0) {
          console.log('📋 Sample exported data:', data.sampleData);
        }
      } else {
        toast.error(data.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Database size={20} className="mr-2 text-blue-500" />
          CRM Export Status
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* MongoDB Stats */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">📦 MongoDB Database</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Total Leads:</span>
            <span className="ml-2 font-semibold">{stats?.mongodb?.total || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Exported:</span>
            <span className="ml-2 font-semibold text-green-600">{stats?.mongodb?.exported || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Pending:</span>
            <span className="ml-2 font-semibold text-yellow-600">{stats?.mongodb?.pending || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Hot Leads:</span>
            <span className="ml-2 font-semibold text-red-600">{stats?.mongodb?.byQuality?.hot || 0}</span>
          </div>
        </div>
      </div>

      {/* Quality Breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">🎯 Lead Quality</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="w-16 text-xs text-gray-500">Hot</span>
            <div className="flex-1 mx-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ 
                    width: stats?.mongodb?.total ? 
                      `${(stats.mongodb.byQuality.hot / stats.mongodb.total) * 100}%` : '0%' 
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-600">{stats?.mongodb?.byQuality?.hot || 0}</span>
          </div>
          <div className="flex items-center">
            <span className="w-16 text-xs text-gray-500">Warm</span>
            <div className="flex-1 mx-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ 
                    width: stats?.mongodb?.total ? 
                      `${(stats.mongodb.byQuality.warm / stats.mongodb.total) * 100}%` : '0%' 
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-600">{stats?.mongodb?.byQuality?.warm || 0}</span>
          </div>
          <div className="flex items-center">
            <span className="w-16 text-xs text-gray-500">Cold</span>
            <div className="flex-1 mx-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ 
                    width: stats?.mongodb?.total ? 
                      `${(stats.mongodb.byQuality.cold / stats.mongodb.total) * 100}%` : '0%' 
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-600">{stats?.mongodb?.byQuality?.cold || 0}</span>
          </div>
        </div>
      </div>

      {/* SheetSandbox Stats */}
      <div className="mb-4 p-3 bg-green-50 rounded-lg">
        <h4 className="text-sm font-medium text-green-700 mb-2">📊 CRM (SheetSandbox)</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Records:</span>
            <span className="ml-2 font-semibold">{stats?.sheetsandbox?.recordCount || 0}</span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 text-green-600 flex items-center">
              <CheckCircle size={12} className="mr-1" />
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Sample Data Preview */}
      {stats?.sampleCRMData && stats.sampleCRMData.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Recent CRM Entries</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stats.sampleCRMData.map((item: any, i: number) => (
              <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span className="font-medium">{item.leadId}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-white text-[10px] ${
                    item.quality === 'Hot' ? 'bg-red-500' :
                    item.quality === 'Warm' ? 'bg-yellow-500' :
                    item.quality === 'Cold' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {item.quality}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">{item.company}</div>
                <div className="text-gray-400">{item.phone} • {item.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="space-y-2">
        <Button 
          onClick={() => handleExport('pending')}
          disabled={exporting || stats?.mongodb?.pending === 0}
          className="w-full"
        >
          {exporting ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              Export Pending Leads ({stats?.mongodb?.pending || 0})
            </>
          )}
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => handleExport('hot')}
          disabled={exporting || stats?.mongodb?.byQuality?.hot === 0}
          className="w-full"
        >
          <Upload size={16} className="mr-2" />
          Export Hot Leads ({stats?.mongodb?.byQuality?.hot || 0})
        </Button>

        <Button 
          variant="outline"
          onClick={() => window.open('/api/export-to-sandbox', '_blank')}
          className="w-full"
        >
          <Download size={16} className="mr-2" />
          View Export Status
        </Button>
      </div>
    </div>
  );
}