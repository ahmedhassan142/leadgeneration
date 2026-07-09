'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, BarChart, MapPin, TrendingUp, Building2, Target, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface SerpApiStats {
  searchesToday: number;
  dailyLimit: number;
  remainingToday: number;
  date: string;
}

const NICHES = [
  { value: "real-estate", label: "Real Estate" },
  { value: "salon-spa", label: "Salon & Spa" },
  { value: "restaurant-cafe", label: "Restaurant" },
  { value: "retail-store", label: "Retail" },
  { value: "fitness-gym", label: "Fitness" },
];

const LOCATIONS = [
  "Austin, TX", "Dallas, TX", "Houston, TX", "Miami, FL", 
  "Los Angeles, CA", "New York, NY", "Chicago, IL", "Seattle, WA",
  "Denver, CO", "Phoenix, AZ", "Las Vegas, NV", "Atlanta, GA"
];

const RESULT_OPTIONS = [20, 40, 60, 80, 100];

export default function SerpButton() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SerpApiStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState('real-estate');
  const [selectedLocation, setSelectedLocation] = useState('Austin, TX');
  const [maxResults, setMaxResults] = useState(60);
  const [isNicheOpen, setIsNicheOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  
  // ✅ Use ref to prevent auto-scrape
  const hasAutoScraped = useRef(false);
  const isMounted = useRef(true);
  const isScraping = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    // ✅ ONLY fetch stats, NEVER auto-scrape
    fetchStats();
    
    // ✅ Check if processor is running and stop it
    checkAndStopProcessor();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkAndStopProcessor = async () => {
    try {
      const res = await fetch('/api/queue/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      const data = await res.json();
      if (data.success) {
        console.log('✅ Processor stopped on page load');
      }
    } catch (error) {
      console.error('Error stopping processor:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/scrape/serp');
      const data = await res.json();
      if (isMounted.current && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleScrape = async () => {
    // ✅ Prevent multiple clicks
    if (isScraping.current || loading) {
      //@ts-ignore
      toast.warning('Scrape already in progress');
      return;
    }
    
    // ✅ Check rate limit
    if (stats?.remainingToday === 0) {
      toast.error('Daily limit reached. Please try tomorrow.');
      return;
    }
    
    // ✅ Set loading state
    isScraping.current = true;
    setLoading(true);
    setIsDisabled(true);
    
    // ✅ Show initial toast
    const toastId = toast.loading('🚀 Starting scrape...');
    
    try {
      console.log('🔍 Starting SERP scrape for:', { 
        niche: selectedNiche, 
        location: selectedLocation, 
        maxResults 
      });
      
      const res = await fetch('/api/scrape/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          niche: selectedNiche, 
          location: selectedLocation, 
          maxResults 
        })
      });
      
      const data = await res.json();
      
      // ✅ Update toast based on response
      if (data.success) {
        toast.success(`✅ Found ${data.leadsFound} leads!`, { id: toastId });
         //@ts-ignore
        toast.info('🔄 Processor will stop automatically in 15 seconds', { duration: 3000 });
        // Refresh stats
        await fetchStats();
      } else {
        toast.error(`❌ ${data.error || 'Scrape failed'}`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Scrape error:', error);
      toast.error(`❌ ${error.message || 'Scrape failed'}`, { id: toastId });
    } finally {
      // ✅ Reset loading state
      if (isMounted.current) {
        setLoading(false);
        setIsDisabled(false);
      }
      isScraping.current = false;
    }
  };

  const getSelectedNiche = () => NICHES.find(n => n.value === selectedNiche);
  const niche = getSelectedNiche();

  // ✅ Button disabled states
  const isButtonDisabled = loading || isDisabled || (stats?.remainingToday === 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center text-gray-800">
          <Search className="h-4 w-4 mr-1.5 text-blue-600" />
          SERP Scraper
        </h2>
        <button 
          onClick={() => setShowStats(!showStats)} 
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Statistics"
          disabled={loading}
        >
          <BarChart className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats */}
      {stats && showStats && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-xs mb-1">
            <span>Today: {stats.searchesToday}/{stats.dailyLimit}</span>
            <span className={stats.remainingToday === 0 ? 'text-red-500 font-medium' : 'text-gray-500'}>
              {stats.remainingToday} left
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="h-1 rounded-full bg-blue-500" 
              style={{ width: `${(stats.searchesToday / stats.dailyLimit) * 100}%` }} 
            />
          </div>
          {stats.remainingToday === 0 && (
            <p className="text-xs text-red-500 mt-1">⚠️ Daily limit reached</p>
          )}
        </div>
      )}

      {/* Main Form */}
      <div className="space-y-2.5">
        {/* Business Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Business Type</label>
          <div className="relative">
            <button
              onClick={() => !loading && setIsNicheOpen(!isNicheOpen)}
              disabled={loading}
              className="w-full p-1.5 border border-gray-300 rounded text-sm text-left flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{niche?.label || 'Select business type'}</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isNicheOpen ? 'rotate-180' : ''}`} />
            </button>
            {isNicheOpen && !loading && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {NICHES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSelectedNiche(item.value);
                      setIsNicheOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors ${
                      selectedNiche === item.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={loading}
            className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Number of Leads</label>
          <div className="relative">
            <button
              onClick={() => !loading && setIsResultsOpen(!isResultsOpen)}
              disabled={loading}
              className="w-full p-1.5 border border-gray-300 rounded text-sm text-left flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{maxResults} leads</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isResultsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isResultsOpen && !loading && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                {RESULT_OPTIONS.map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setMaxResults(num);
                      setIsResultsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors ${
                      maxResults === num ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {num} leads
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleScrape}
          disabled={isButtonDisabled}
          className={`w-full mt-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            isButtonDisabled
              ? stats?.remainingToday === 0
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-400 text-white cursor-wait'
              : loading
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Scraping...
            </>
          ) : stats?.remainingToday === 0 ? (
            '🔒 Limit Reached'
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              Get {niche?.label || 'Leads'} in {selectedLocation}
            </>
          )}
        </button>
        
        {loading && (
          <p className="text-xs text-center text-blue-600 mt-1 animate-pulse">
            ⏳ Processing... This may take a few moments
          </p>
        )}
        
        {/* ✅ Show status if processor is running */}
        {stats && showStats && stats.remainingToday > 0 && !loading && (
          <p className="text-xs text-center text-gray-400 mt-1">
            Click to start scraping
          </p>
        )}
      </div>
    </div>
  );
}