// app/debug/page.tsx - ADD 3 FORCE PROCESS BUTTONS
'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  MapPinIcon,
  TagIcon,
  FireIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  BeakerIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  QueueListIcon,
  BoltIcon,
  SignalIcon,
  ChartPieIcon,
  GlobeAltIcon,
  BookOpenIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function DebugDashboard() {
  const [data, setData] = useState<any>(null);
  const [processorStatus, setProcessorStatus] = useState<any>(null);
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Force process states
  const [serpLoading, setSerpLoading] = useState(false);
  const [ypLoading, setYpLoading] = useState(false);
  const [sdLoading, setSdLoading] = useState(false);
  
  const [selectedNiche, setSelectedNiche] = useState('real-estate');
  const [selectedLocation, setSelectedLocation] = useState('Austin, TX');
  const [serpResults, setSerpResults] = useState(100);
  const [ypPages, setYpPages] = useState(5);
  const [sdPages, setSdPages] = useState(3);

  const fetchData = async () => {
    try {
      const [statusRes, pipelineRes] = await Promise.all([
        fetch('/api/debug/status'),
        fetch('/api/debug/force-process')
      ]);
      
      const statusJson = await statusRes.json();
      const pipelineJson = await pipelineRes.json();
      
      setData(statusJson);
      setPipelineStatus(pipelineJson);
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkProcessor = async () => {
    try {
      const res = await fetch('/api/debug/processor-status');
      const json = await res.json();
      setProcessorStatus(json);
    } catch (error) {
      console.error('Failed to check processor:', error);
    }
  };

  useEffect(() => {
    fetchData();
    checkProcessor();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
        checkProcessor();
      }, 5000);
    }
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchData(), checkProcessor()]);
  };

  // 🔥 SERP Force Process
  const handleSerpForce = async () => {
    setSerpLoading(true);
    try {
      const res = await fetch('/api/debug/force-process-serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche,
          location: selectedLocation,
          maxResults: serpResults
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(
          <div>
            <p>✅ SERP: {result.leadsFound} leads found</p>
            <p className="text-xs">{result.stats.after.remainingToday} searches left</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(result.error || 'SERP force process failed');
      }
    } catch (error) {
      toast.error('SERP force process failed');
    } finally {
      setSerpLoading(false);
    }
  };

  // 🔥 YellowPages Force Process
  const handleYpForce = async () => {
    setYpLoading(true);
    try {
      const res = await fetch('/api/debug/force-process-yellowpages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche,
          location: selectedLocation,
          maxPages: ypPages
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(
          <div>
            <p>✅ YellowPages: {result.leadsFound} leads found</p>
            <p className="text-xs">{result.withWebsites} websites, {result.hotLeads} hot</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(result.error || 'YellowPages force process failed');
      }
    } catch (error) {
      toast.error('YellowPages force process failed');
    } finally {
      setYpLoading(false);
    }
  };

  // 🔥 ScrapingDog Force Process
  const handleSdForce = async () => {
    setSdLoading(true);
    try {
      const res = await fetch('/api/debug/force-process-scrapingdog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche,
          location: selectedLocation,
          pages: sdPages
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(
          <div>
            <p>✅ ScrapingDog: {result.leadsFound} leads found</p>
            <p className="text-xs">{result.withWebsites} websites, {result.hotLeads} hot</p>
            {result.stats && (
              <p className="text-xs">{result.stats.after.remainingToday} searches left</p>
            )}
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(result.error || 'ScrapingDog force process failed');
      }
    } catch (error) {
      toast.error('ScrapingDog force process failed');
    } finally {
      setSdLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-900 text-green-300 border-green-700';
      case 'processing': return 'bg-yellow-900 text-yellow-300 border-yellow-700 animate-pulse';
      case 'failed': return 'bg-red-900 text-red-300 border-red-700';
      case 'pending': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-900 text-gray-300 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'processing': return <ArrowPathIcon className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'failed': return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'pending': return <ClockIcon className="h-4 w-4 text-blue-500" />;
      default: return <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-400 mt-4 text-lg">Loading debug dashboard...</p>
        </div>
      </div>
    );
  }

  const totalLeads = data?.leads?.total || 0;
  const hotLeads = data?.leads?.byQuality?.hot || 0;
  const warmLeads = data?.leads?.byQuality?.warm || 0;
  const coldLeads = data?.leads?.byQuality?.cold || 0;
  const pendingJobs = data?.queue?.byStatus?.pending || 0;
  const processingJobs = data?.queue?.byStatus?.processing || 0;
  const completedJobs = data?.queue?.byStatus?.completed || 0;
  const failedJobs = data?.queue?.byStatus?.failed || 0;

  // Micro-batch specific metrics
  const wavesProcessed = pipelineStatus?.summary?.wavesProcessed || 0;
  const jobsProcessed = pipelineStatus?.summary?.jobsProcessed || 0;
  const leadsGenerated = pipelineStatus?.summary?.leadsGenerated || 0;
  const hotLeadsFound = pipelineStatus?.summary?.hotLeadsFound || 0;
  const avgAIScore = pipelineStatus?.pipelineStats?.ai?.scores?.length > 0 
    ? (pipelineStatus.pipelineStats.ai.scores.reduce((a: number, b: number) => a + b, 0) / pipelineStatus.pipelineStats.ai.scores.length).toFixed(1)
    : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <BeakerIcon className="h-10 w-10 text-blue-500" />
              System Debug Console
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-blue-500/30">
                <BoltIcon className="h-4 w-4" />
                Micro-batch Mode
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                autoRefresh 
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 🔥 FORCE PROCESS CONTROLS */}
        <div className="mb-6 bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PlayIcon className="h-5 w-5 text-green-500" />
            Force Process Scrapers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Niche</label>
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="real-estate">Real Estate</option>
                <option value="restaurant">Restaurant</option>
                <option value="financial">Financial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Location</label>
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Austin, TX"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SERP API Button */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <GlobeAltIcon className="h-5 w-5 text-blue-400" />
                <h3 className="font-medium">SERP API</h3>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400">Results</label>
                <select
                  value={serpResults}
                  onChange={(e) => setSerpResults(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
                >
                  <option value="20">20</option>
                  <option value="40">40</option>
                  <option value="60">60</option>
                  <option value="80">80</option>
                  <option value="100">100</option>
                </select>
              </div>
              <button
                onClick={handleSerpForce}
                disabled={serpLoading}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {serpLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    Run SERP Scraper
                  </>
                )}
              </button>
            </div>

            {/* YellowPages Button */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-yellow-800">
              <div className="flex items-center gap-2 mb-3">
                <BookOpenIcon className="h-5 w-5 text-yellow-400" />
                <h3 className="font-medium">YellowPages</h3>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400">Pages (30/page)</label>
                <select
                  value={ypPages}
                  onChange={(e) => setYpPages(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
                >
                  <option value="3">3 pages (~90)</option>
                  <option value="5">5 pages (~150)</option>
                  <option value="7">7 pages (~210)</option>
                  <option value="10">10 pages (~300)</option>
                </select>
              </div>
              <button
                onClick={handleYpForce}
                disabled={ypLoading}
                className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {ypLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    Run YP Scraper
                  </>
                )}
              </button>
            </div>

            {/* ScrapingDog Button */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <SwatchIcon className="h-5 w-5 text-green-400" />
                <h3 className="font-medium">ScrapingDog</h3>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400">Pages (20/page)</label>
                <select
                  value={sdPages}
                  onChange={(e) => setSdPages(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
                >
                  <option value="1">1 page (20)</option>
                  <option value="2">2 pages (40)</option>
                  <option value="3">3 pages (60)</option>
                  <option value="4">4 pages (80)</option>
                  <option value="5">5 pages (100)</option>
                </select>
              </div>
              <button
                onClick={handleSdForce}
                disabled={sdLoading}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sdLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    Run SD Scraper
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rest of your existing debug dashboard... */}
        {/* (Keep all your existing tabs and content) */}
        
      </div>
    </div>
  );
}