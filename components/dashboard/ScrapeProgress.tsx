// components/dashboard/ScrapeProgress.tsx - UPDATED with real-time updates
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  BoltIcon, 
  ClockIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  CpuChipIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function ScrapeProgress() {
  const [stats, setStats] = useState<any>(null);
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processorAction, setProcessorAction] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // ✅ Use ref for interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    
    // ✅ Update every 5 seconds for real-time progress
    intervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchStats();
      }
    }, 5000);
    
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const [statusRes, pipelineRes] = await Promise.all([
        fetch('/api/debug/status'),
        fetch('/api/debug/pipeline-status')
      ]);
      
      const statusData = await statusRes.json();
      const pipelineData = await pipelineRes.json();
      
      if (isMounted.current) {
        setStats(statusData);
        setPipelineStats(pipelineData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const controlProcessor = async (action: 'start' | 'stop' | 'restart') => {
    setProcessorAction(action);
    try {
      const res = await fetch('/api/queue/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(fetchStats, 1000);
      }
    } catch (error) {
      console.error(`Failed to ${action} processor:`, error);
    } finally {
      setProcessorAction(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading pipeline stats...</p>
        </div>
      </div>
    );
  }

  // Get data from pipeline stats
  const jobCounts = pipelineStats?.jobs || {};
  const processorRunning = pipelineStats?.processor?.running || false;
  const currentWave = pipelineStats?.currentWave;
  const summary = pipelineStats?.summary || {};
  const leads = stats?.leads || { byQuality: { hot: 0, warm: 0, cold: 0 } };

  // Calculate total jobs in wave
  const totalWaveLeads = currentWave?.totalLeads || 0;
  const analyzeDone = currentWave?.progress?.analyze || 0;
  const emailDone = currentWave?.progress?.email || 0;
  const scoreDone = currentWave?.progress?.score || 0;
  const waveProgressPercent = currentWave?.overallProgress || 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <CpuChipIcon className="h-5 w-5 text-blue-600" />
          Pipeline Control Center
        </h2>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            processorRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${processorRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {processorRunning ? 'Processor Active' : 'Processor Stopped'}
            </span>
          </div>
          
          {/* Control Buttons */}
          {processorRunning ? (
            <button
              onClick={() => controlProcessor('stop')}
              disabled={!!processorAction}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm"
            >
              {processorAction === 'stop' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <StopIcon className="h-4 w-4" />
              )}
              Stop
            </button>
          ) : (
            <button
              onClick={() => controlProcessor('start')}
              disabled={!!processorAction}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg text-sm"
            >
              {processorAction === 'start' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              Start
            </button>
          )}
        </div>
      </div>

      {/* Processor Message */}
      {pipelineStats?.processor?.message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${
          processorRunning ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
        }`}>
          {pipelineStats.processor.message}
        </div>
      )}

      {/* Pipeline Flow - 4 Stages (NO AI) */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline Progress</h3>
        <div className="grid grid-cols-4 gap-2">
          {/* Analyze Stage */}
          <div className="text-center">
            <div className={`p-2 rounded-t-lg ${jobCounts.analyze?.processing > 0 ? 'bg-purple-500 animate-pulse' : 'bg-purple-100'}`}>
              <ChartBarIcon className={`h-5 w-5 mx-auto ${jobCounts.analyze?.processing > 0 ? 'text-white' : 'text-purple-600'}`} />
            </div>
            <div className="bg-white border-x border-b p-2 rounded-b-lg text-xs">
              <div className="font-medium">ANALYZE</div>
              <div className="text-gray-600">P:{jobCounts.analyze?.pending || 0}</div>
              <div className="text-yellow-600">R:{jobCounts.analyze?.processing || 0}</div>
              <div className="text-green-600">✅:{jobCounts.analyze?.completed || 0}</div>
              <div className="text-xs text-purple-600 mt-1">
                {totalWaveLeads > 0 ? Math.round((analyzeDone / totalWaveLeads) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Email Stage */}
          <div className="text-center">
            <div className={`p-2 rounded-t-lg ${jobCounts.email?.processing > 0 ? 'bg-green-500 animate-pulse' : 'bg-green-100'}`}>
              <EnvelopeIcon className={`h-5 w-5 mx-auto ${jobCounts.email?.processing > 0 ? 'text-white' : 'text-green-600'}`} />
            </div>
            <div className="bg-white border-x border-b p-2 rounded-b-lg text-xs">
              <div className="font-medium">EMAIL</div>
              <div className="text-gray-600">P:{jobCounts.email?.pending || 0}</div>
              <div className="text-yellow-600">R:{jobCounts.email?.processing || 0}</div>
              <div className="text-green-600">✅:{jobCounts.email?.completed || 0}</div>
              <div className="text-xs text-green-600 mt-1">
                {totalWaveLeads > 0 ? Math.round((emailDone / totalWaveLeads) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Score Stage */}
          <div className="text-center">
            <div className={`p-2 rounded-t-lg ${jobCounts.score?.processing > 0 ? 'bg-red-500 animate-pulse' : 'bg-red-100'}`}>
              <BoltIcon className={`h-5 w-5 mx-auto ${jobCounts.score?.processing > 0 ? 'text-white' : 'text-red-600'}`} />
            </div>
            <div className="bg-white border-x border-b p-2 rounded-b-lg text-xs">
              <div className="font-medium">SCORE</div>
              <div className="text-gray-600">P:{jobCounts.score?.pending || 0}</div>
              <div className="text-yellow-600">R:{jobCounts.score?.processing || 0}</div>
              <div className="text-green-600">✅:{jobCounts.score?.completed || 0}</div>
              <div className="text-xs text-red-600 mt-1">
                {totalWaveLeads > 0 ? Math.round((scoreDone / totalWaveLeads) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Results Stage */}
          <div className="text-center">
            <div className="p-2 rounded-t-lg bg-emerald-100">
              <UserGroupIcon className="h-5 w-5 mx-auto text-emerald-600" />
            </div>
            <div className="bg-white border-x border-b p-2 rounded-b-lg text-xs">
              <div className="font-medium">RESULTS</div>
              <div className="text-blue-600">🔥 {leads.byQuality?.hot || 0}</div>
              <div className="text-yellow-600">🟡 {leads.byQuality?.warm || 0}</div>
              <div className="text-gray-600">🔵 {leads.byQuality?.cold || 0}</div>
              <div className="text-xs text-emerald-600 mt-1">
                {leads.total || 0} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Progress Bar */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <BoltIcon className="h-4 w-4 text-blue-600" />
            Wave {currentWave?.waveNumber || 1} Progress
          </span>
          <span className="text-sm text-gray-600">
            {scoreDone || 0}/{totalWaveLeads || 0} leads scored
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium z-10"
          >
            {waveProgressPercent > 0 && `${waveProgressPercent}%`}
          </div>
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-1000"
            style={{ width: `${waveProgressPercent}%` }}
          />
        </div>
        
        {/* Stage Indicators */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className={`${analyzeDone === totalWaveLeads && totalWaveLeads > 0 ? 'text-green-600 font-medium' : ''}`}>
            📊 Analyze: {analyzeDone}/{totalWaveLeads}
          </span>
          <span className={`${emailDone === totalWaveLeads && totalWaveLeads > 0 ? 'text-green-600 font-medium' : ''}`}>
            📧 Email: {emailDone}/{totalWaveLeads}
          </span>
          <span className={`${scoreDone === totalWaveLeads && totalWaveLeads > 0 ? 'text-green-600 font-medium' : ''}`}>
            📊 Score: {scoreDone}/{totalWaveLeads}
          </span>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="mb-6">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-yellow-600" />
          Currently Processing ({summary.processingJobs || 0} jobs)
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {stats?.recentJobs
            ?.filter((job: any) => job.status === 'processing')
            .map((job: any) => (
              <div key={job.id} className="flex items-center justify-between text-sm bg-yellow-50 p-2 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="capitalize font-medium">{job.type}</span>
                  {job.data?.website && (
                    <span className="text-xs text-gray-600 truncate max-w-[200px]">
                      {job.data.website}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(job.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          {stats?.recentJobs?.filter((j: any) => j.status === 'processing').length === 0 && (
            <div className="text-sm text-gray-500 italic">No jobs currently processing</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-gray-400" />
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stats?.recentJobs?.slice(0, 10).map((job: any) => (
            <div key={job.id} className="flex items-center justify-between text-sm border-b pb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-500' :
                  job.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  job.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className={`px-2 py-0.5 rounded text-xs ${
                  job.type === 'scrape' ? 'bg-blue-100 text-blue-800' :
                  job.type === 'analyze' ? 'bg-purple-100 text-purple-800' :
                  job.type === 'email' ? 'bg-green-100 text-green-800' :
                  job.type === 'score' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.type}
                </span>
                {job.data?.website && (
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    {job.data.website}
                  </span>
                )}
                {job.status === 'completed' && job.data?.quality && (
                  <span className={`text-xs font-medium ${
                    job.data.quality === 'hot' ? 'text-red-600' :
                    job.data.quality === 'warm' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {job.data.quality === 'hot' ? '🔥' :
                     job.data.quality === 'warm' ? '🟡' :
                     '🔵'} {job.data.quality}
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-xs">
                {new Date(job.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Update */}
      <div className="mt-4 pt-3 border-t text-xs text-gray-400 text-right">
        Last updated: {lastUpdate.toLocaleTimeString()}
        <button 
          onClick={fetchStats}
          className="ml-2 text-blue-600 hover:text-blue-800"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}