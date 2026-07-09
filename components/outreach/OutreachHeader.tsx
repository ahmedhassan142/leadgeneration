// components/outreach/OutreachHeader.tsx - WITH EMAIL DROPDOWN
'use client';

import { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Snowflake,
  ThermometerSun,
  Play,
  Loader2,
  ChevronDown,
  Send,
  Users,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

interface Notification {
  id: string;
  type: 'reply' | 'bounce' | 'sequence' | 'task';
  message: string;
  time: Date;
  read: boolean;
}

interface EmailCampaign {
  id: string;
  name: string;
  type: 'cold' | 'warm';
  model: 'outbound' | 'inbound';
  count: number;
}

export default function OutreachHeader({ onMenuClick, title = 'Outreach Dashboard' }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showColdLeadsModal, setShowColdLeadsModal] = useState(false);
  const [showWarmLeadsModal, setShowWarmLeadsModal] = useState(false);
  const [coldLeadsCount, setColdLeadsCount] = useState({ outbound: 0, inbound: 0 });
  const [warmLeadsCount, setWarmLeadsCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([
    { id: 'cold-outbound', name: 'Cold Outbound', type: 'cold', model: 'outbound', count: 0 },
    { id: 'cold-inbound', name: 'Cold Inbound', type: 'cold', model: 'inbound', count: 0 },
    { id: 'warm-outbound', name: 'Warm Outbound', type: 'warm', model: 'outbound', count: 0 }
  ]);
  
  const [coldLeadsSettings, setColdLeadsSettings] = useState({
    source: 'all',
    daysOld: 30,
    limit: 50,
    testMode: false
  });

  const [warmLeadsSettings, setWarmLeadsSettings] = useState({
    source: 'all',
    daysOld: 30,
    limit: 50,
    testMode: false,
    sequence: 'default'
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
    fetchLeadCounts();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/outreach/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // components/outreach/OutreachHeader.tsx - JUST THE fetchLeadCounts function
// components/outreach/OutreachHeader.tsx - Add debug logging
const fetchLeadCounts = async () => {
  try {
    console.log('🔍 Fetching lead counts...');
    
    const coldOutboundRes = await fetch('/api/outreach/outbound/cold-leads?limit=500&daysOld=365');
    const coldOutboundData = await coldOutboundRes.json();
    
    const warmOutboundRes = await fetch('/api/outreach/outbound/warm-leads?limit=500&daysOld=365');
    const warmOutboundData = await warmOutboundRes.json();

    console.log('📊 API Response:', {
      coldTotal: coldOutboundData.pagination?.total,
      coldLeadsCount: coldOutboundData.leads?.length,
      warmTotal: warmOutboundData.pagination?.total,
      warmLeadsCount: warmOutboundData.leads?.length
    });

    setColdLeadsCount({
      outbound: coldOutboundData.pagination?.total || 0,
      inbound: 0 // You need to fix inbound endpoint too
    });
    
    setWarmLeadsCount(warmOutboundData.pagination?.total || 0);

  } catch (error) {
    console.error('Failed to fetch lead counts:', error);
    setColdLeadsCount({ outbound: 0, inbound: 0 });
    setWarmLeadsCount(0);
  }
};

  const handleProcessColdLeads = async (type: 'outbound' | 'inbound') => {
    setProcessing(true);
    const endpoint = type === 'outbound' 
      ? '/api/outreach/outbound/cold-leads' 
      : '/api/outreach/inbound/cold-leads';
    
    const toastId = toast.loading(`Processing ${type} cold leads...`);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coldLeadsSettings)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          <div>
            <p className="font-semibold">✅ {type} cold leads processed!</p>
            <p className="text-xs mt-1">
              Sent: {data.stats.sent} | Failed: {data.stats.failed} | {data.stats.test ? `Test: ${data.stats.test}` : ''}
            </p>
          </div>,
          { id: toastId, duration: 5000 }
        );
        setShowColdLeadsModal(false);
        fetchLeadCounts();
      } else {
        toast.error(`❌ Failed: ${data.error}`, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessWarmLeads = async () => {
    setProcessing(true);
    const toastId = toast.loading('Processing warm leads...');

    try {
      const res = await fetch('/api/outreach/outbound/warm-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warmLeadsSettings)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          <div>
            <p className="font-semibold">✅ Warm leads processed!</p>
            <p className="text-xs mt-1">
              Sent: {data.stats.sent} | Failed: {data.stats.failed}
              {data.stats.byStep && ` | Steps: ${JSON.stringify(data.stats.byStep)}`}
            </p>
          </div>,
          { id: toastId, duration: 5000 }
        );
        setShowWarmLeadsModal(false);
        fetchLeadCounts();
      } else {
        toast.error(`❌ Failed: ${data.error}`, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply': return <Mail className="h-4 w-4 text-green-500" />;
      case 'bounce': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'sequence': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalColdLeads = coldLeadsCount.outbound + coldLeadsCount.inbound;

  return (
    <>
      <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between h-full px-6">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads, emails, sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Email Campaigns Dropdown - NEW */}
            <div className="relative">
              <button
                onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="h-4 w-4" />
                <span className="text-sm font-medium">Email Campaigns</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showEmailDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Email Dropdown Menu */}
              {showEmailDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Email Campaigns</h3>
                    <p className="text-xs text-gray-500">Select a campaign to run</p>
                  </div>

                  {/* Cold Campaigns */}
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">COLD LEADS</p>
                    
                    <button
                      onClick={() => {
                        setShowEmailDropdown(false);
                        setColdLeadsSettings({ ...coldLeadsSettings, testMode: false });
                        setShowColdLeadsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Snowflake className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">Cold Outbound</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {coldLeadsCount.outbound}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowEmailDropdown(false);
                        setColdLeadsSettings({ ...coldLeadsSettings, testMode: false });
                        setShowColdLeadsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-700">Cold Inbound</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {coldLeadsCount.inbound}
                      </span>
                    </button>
                  </div>

                  {/* Warm Campaigns */}
                  <div className="px-3 py-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">WARM LEADS</p>
                    
                    <button
                      onClick={() => {
                        setShowEmailDropdown(false);
                        setShowWarmLeadsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ThermometerSun className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-gray-700">Warm Outbound</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {warmLeadsCount}
                      </span>
                    </button>
                  </div>

                  {/* Test Mode Section */}
                  <div className="px-3 py-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">TEST MODE</p>
                    
                    <button
                      onClick={() => {
                        setShowEmailDropdown(false);
                        setColdLeadsSettings({ ...coldLeadsSettings, testMode: true });
                        setShowColdLeadsModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <span className="text-yellow-600">⚡ Test Cold Emails</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowEmailDropdown(false);
                        setWarmLeadsSettings({ ...warmLeadsSettings, testMode: true });
                        setShowWarmLeadsModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <span className="text-yellow-600">⚡ Test Warm Emails</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Snowflake className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{totalColdLeads}</span>
              <ThermometerSun className="h-4 w-4 text-orange-600 ml-2" />
              <span className="text-sm font-medium">{warmLeadsCount}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                            !notif.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {getNotificationIcon(notif.type)}
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notif.time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2 border-t border-gray-200">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <Link
              href="/outreach/help"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <HelpCircle className="h-5 w-5 text-gray-600" />
            </Link>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">Ahmed Hassan</p>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/outreach/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/outreach/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/outreach/billing"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Billing
                  </Link>
                  <hr className="my-1 border-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Overlay */}
        {searchQuery && (
          <div className="absolute top-16 left-0 right-0 mx-auto max-w-xl bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Searching for "{searchQuery}"...</p>
          </div>
        )}
      </header>

      {/* Cold Leads Modal */}
      {showColdLeadsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {coldLeadsSettings.testMode ? 'Test' : 'Process'} Cold Leads
                </h2>
              </div>
              <button
                onClick={() => setShowColdLeadsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {coldLeadsSettings.testMode 
                ? 'Generate test emails without sending'
                : `Send AI-generated emails to ${coldLeadsCount.outbound + coldLeadsCount.inbound} cold leads`}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={coldLeadsSettings.source}
                  onChange={(e) => setColdLeadsSettings({ ...coldLeadsSettings, source: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sources</option>
                  <option value="github">GitHub</option>
                  <option value="product_hunt">Product Hunt</option>
                  <option value="serp_api">SERP</option>
                  <option value="scrapingdog">ScrapingDog</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Old</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={coldLeadsSettings.daysOld}
                  onChange={(e) => setColdLeadsSettings({ ...coldLeadsSettings, daysOld: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Leads</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={coldLeadsSettings.limit}
                  onChange={(e) => setColdLeadsSettings({ ...coldLeadsSettings, limit: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleProcessColdLeads('outbound')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {coldLeadsSettings.testMode ? 'Test Outbound' : 'Run Outbound'}
                  </>
                )}
              </button>
              <button
                onClick={() => handleProcessColdLeads('inbound')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    {coldLeadsSettings.testMode ? 'Test Inbound' : 'Run Inbound'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warm Leads Modal */}
      {showWarmLeadsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ThermometerSun className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {warmLeadsSettings.testMode ? 'Test' : 'Process'} Warm Leads
                </h2>
              </div>
              <button
                onClick={() => setShowWarmLeadsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {warmLeadsSettings.testMode
                ? 'Generate test warm emails without sending'
                : `Run multi-step sequence for ${warmLeadsCount} warm leads`}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={warmLeadsSettings.source}
                  onChange={(e) => setWarmLeadsSettings({ ...warmLeadsSettings, source: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sources</option>
                  <option value="github">GitHub</option>
                  <option value="product_hunt">Product Hunt</option>
                  <option value="serp_api">SERP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
                <select
                  value={warmLeadsSettings.sequence}
                  onChange={(e) => setWarmLeadsSettings({ ...warmLeadsSettings, sequence: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default (3-step)</option>
                  <option value="aggressive">Aggressive (2-step)</option>
                  <option value="gentle">Gentle (4-step)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Old</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={warmLeadsSettings.daysOld}
                  onChange={(e) => setWarmLeadsSettings({ ...warmLeadsSettings, daysOld: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Leads</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={warmLeadsSettings.limit}
                  onChange={(e) => setWarmLeadsSettings({ ...warmLeadsSettings, limit: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleProcessWarmLeads}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {warmLeadsSettings.testMode ? 'Test Warm' : 'Run Warm Sequence'}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowWarmLeadsModal(false)}
                disabled={processing}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}