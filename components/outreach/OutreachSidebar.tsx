// components/outreach/OutreachSidebar.tsx - WITH DETAILED LOGGING
'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  Clock,
  Users,
  Settings,
  BarChart3,
  Layers,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Home,
  PlayCircle,
  Activity
} from 'lucide-react';
import RepliesDialog from './RepliesDialogue';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onFilterChange?: (filterType: string, value: string) => void;
  activeFilter?: {
    type: string;
    value: string;
  };
}

interface Stats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  contacted: number;
  pending: number;
  replied: number;
  converted: number;
  activeSequences: number;
  pendingFollowups: number;
}

interface Sequence {
  id: string;
  name: string;
  isActive: boolean;
  totalSteps: number;
  leadsCount: number;
}

interface Reply {
  leadName: string;
  leadEmail: string;
  step: number;
  stepName: string;
  content: string;
  fromEmail: string;
  receivedAt: string;
  sequenceName?: string;
}

export default function OutreachSidebar({ 
  isCollapsed = false, 
  onToggle,
  onFilterChange,
  activeFilter 
}: SidebarProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    contacted: 0,
    pending: 0,
    replied: 0,
    converted: 0,
    activeSequences: 0,
    pendingFollowups: 0
  });

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [recentReplies, setRecentReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(true);
  const [showRepliesDialog, setShowRepliesDialog] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    fetchSequences();
    fetchRepliesFromSequenceStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📊 [DEBUG] Fetching stats...');
      const res = await fetch('/api/outreach/stats');
      const data = await res.json();
      
      if (data.success) {
        console.log('📊 [DEBUG] Stats received:', {
          totalReplies: data.outreach?.replied,
          activeSequences: data.sequences?.active,
          pendingFollowups: data.sequences?.pending
        });
        
        setStats({
          total: data.leads?.outbound?.total + data.leads?.inbound?.total || 0,
          hot: data.leads?.outbound?.hot + data.leads?.inbound?.hot || 0,
          warm: data.leads?.outbound?.warm + data.leads?.inbound?.warm || 0,
          cold: data.leads?.outbound?.cold + data.leads?.inbound?.cold || 0,
          contacted: data.outreach?.active || 0,
          pending: data.outreach?.total - (data.outreach?.active + data.outreach?.completed) || 0,
          replied: data.outreach?.replied || 0,
          converted: data.outreach?.completed || 0,
          activeSequences: data.sequences?.active || 0,
          pendingFollowups: data.sequences?.pending || 0
        });
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to fetch stats:', error);
    }
  };

  const fetchSequences = async () => {
    try {
      console.log('📊 [DEBUG] Fetching sequences...');
      const res = await fetch('/api/outreach/sequence');
      const data = await res.json();
      if (data.success) {
        console.log(`📊 [DEBUG] Found ${data.sequences.length} sequences`);
        setSequences(data.sequences);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to fetch sequences:', error);
    }
  };

  const fetchRepliesFromSequenceStats = async () => {
    try {
      console.log('🔍 [DEBUG] ========== STARTING REPLY DETECTION ==========');
      console.log('🔍 [DEBUG] Fetching sequence stats from /api/outreach/sequence/stats...');
      
      const res = await fetch('/api/outreach/sequence/stats');
      const data = await res.json();
      
      console.log('📊 [DEBUG] API Response Status:', data.success ? '✅ Success' : '❌ Failed');
      console.log('📊 [DEBUG] Full API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.stats) {
        console.log(`📊 [DEBUG] Found ${data.stats.length} sequences`);
        
        const allReplies: Reply[] = [];
        let totalRepliesFound = 0;
        
        for (const seq of data.stats) {
          console.log(`\n📊 [DEBUG] Checking sequence: "${seq.name}"`);
          console.log(`   - ID: ${seq.sequenceId}`);
          console.log(`   - Total Replied: ${seq.totalReplies}`);
          console.log(`   - Latest Replies Count: ${seq.latestReplies?.length || 0}`);
          
          if (seq.latestReplies && seq.latestReplies.length > 0) {
            console.log(`✅ [DEBUG] Found ${seq.latestReplies.length} reply(ies) in sequence "${seq.name}"`);
            
            seq.latestReplies.forEach((reply: any, idx: number) => {
              console.log(`\n   📝 Reply #${idx + 1}:`);
              console.log(`      - Lead: ${reply.leadName}`);
              console.log(`      - From: ${reply.fromEmail}`);
              console.log(`      - Step: ${reply.step}`);
              console.log(`      - Received: ${reply.receivedAt}`);
              console.log(`      - Content Preview: ${reply.content?.substring(0, 100)}...`);
              console.log(`      - Full Content Length: ${reply.content?.length || 0} chars`);
              
              const replyWithSeqName = {
                leadName: reply.leadName,
                leadEmail: reply.leadEmail,
                step: reply.step,
                stepName: reply.step === 1 ? 'First Email' : reply.step === 2 ? 'Follow-up 1' : reply.step === 3 ? 'Follow-up 2' : 'Final Email',
                content: reply.content,
                fromEmail: reply.fromEmail,
                receivedAt: reply.receivedAt,
                sequenceName: seq.name
              };
              allReplies.push(replyWithSeqName);
              totalRepliesFound++;
            });
          } else {
            console.log(`   ❌ No replies found in sequence "${seq.name}"`);
          }
        }
        
        console.log(`\n📊 [DEBUG] TOTAL REPLIES FOUND ACROSS ALL SEQUENCES: ${totalRepliesFound}`);
        
        const sortedReplies = allReplies
          .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          .slice(0, 10);
        
        console.log(`\n📊 [DEBUG] Sorted replies (newest first): ${sortedReplies.length} replies`);
        
        if (sortedReplies.length > 0) {
          console.log(`\n✅✅✅ [DEBUG] SUCCESS! Found ${sortedReplies.length} reply(es) to display!`);
          console.log('📝 [DEBUG] First reply details:');
          console.log(`   - Lead: ${sortedReplies[0].leadName}`);
          console.log(`   - Reply: ${sortedReplies[0].content?.substring(0, 150)}...`);
          console.log(`   - From: ${sortedReplies[0].fromEmail}`);
          console.log(`   - Step: ${sortedReplies[0].stepName}`);
        } else {
          console.log(`\n⚠️ [DEBUG] WARNING: No replies found! Check if any replies exist in the database.`);
        }
        
        console.log('\n🔍 [DEBUG] ========== REPLY DETECTION COMPLETE ==========\n');
        
        setRecentReplies(sortedReplies);
        setDebugInfo({
          totalSequences: data.stats.length,
          totalRepliesFound,
          sequencesWithReplies: data.stats.filter((s: any) => s.latestReplies?.length > 0).length,
          latestReply: sortedReplies[0] || null
        });
      } else {
        console.error('❌ [DEBUG] API returned unsuccessful response:', data);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to fetch replies from sequence stats:', error);
    }
  };

  const handleFilterClick = (type: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(type, value);
    }
  };

  const isActive = (type: string, value: string) => {
    return activeFilter?.type === type && activeFilter?.value === value;
  };

  const getStepBadgeColor = (step: number) => {
    switch(step) {
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepName = (step: number) => {
    switch(step) {
      case 1: return 'First Email';
      case 2: return 'Follow-up 1';
      case 3: return 'Follow-up 2';
      case 4: return 'Final Email';
      default: return `Step ${step}`;
    }
  };

  const navItems: {
    section: string;
    items: {
      name: string;
      icon: any;
      onClick: () => void;
      active: boolean;
      badge?: number;
      color?: string;
      bgColor?: string;
    }[];
  }[] = [
    {
      section: 'Main',
      items: [
        { 
          name: 'Dashboard', 
          icon: Home,
          onClick: () => handleFilterClick('view', 'dashboard'),
          active: isActive('view', 'dashboard')
        },
        { 
          name: 'All Leads', 
          icon: Users,
          onClick: () => handleFilterClick('view', 'all'),
          badge: stats.total,
          active: isActive('view', 'all')
        },
      ]
    },
    {
      section: 'Outreach Status',
      items: [
        { 
          name: 'Pending', 
          icon: Clock,
          onClick: () => handleFilterClick('status', 'pending'),
          badge: stats.pending,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          active: isActive('status', 'pending')
        },
        { 
          name: 'Contacted', 
          icon: Send,
          onClick: () => handleFilterClick('status', 'contacted'),
          badge: stats.contacted,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          active: isActive('status', 'contacted')
        },
        { 
          name: 'Replied', 
          icon: MessageCircle,
          onClick: () => handleFilterClick('status', 'replied'),
          badge: stats.replied,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          active: isActive('status', 'replied')
        },
        { 
          name: 'Converted', 
          icon: CheckCircle,
          onClick: () => handleFilterClick('status', 'converted'),
          badge: stats.converted,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50',
          active: isActive('status', 'converted')
        },
      ]
    },
    {
      section: 'Sequences',
      items: [
        { 
          name: 'Active Sequences', 
          icon: PlayCircle,
          onClick: () => handleFilterClick('view', 'active-sequences'),
          badge: stats.activeSequences,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          active: isActive('view', 'active-sequences')
        },
        { 
          name: 'Sequence Stats',
          icon: BarChart3,
          onClick: () => handleFilterClick('view', 'sequence-stats'),
          color: 'text-purple-500',
          bgColor: 'bg-purple-50',
          active: isActive('view', 'sequence-stats')
        },
        { 
          name: 'Pending Follow-ups', 
          icon: Activity,
          onClick: () => handleFilterClick('status', 'followup'),
          badge: stats.pendingFollowups,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          active: isActive('status', 'followup')
        },
        { 
          name: 'Sequence Templates', 
          icon: Layers,
          onClick: () => handleFilterClick('view', 'templates'),
          active: isActive('view', 'templates')
        },
        {
          name: 'View All Replies',
          icon: MessageCircle,
          onClick: () => setShowRepliesDialog(true),
          badge: stats.replied,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          active: isActive('view', 'replies')
        },
      ]
    },
    {
      section: 'Settings',
      items: [
        { 
          name: 'Settings', 
          icon: Settings,
          onClick: () => handleFilterClick('view', 'settings'),
          active: isActive('view', 'settings')
        },
      ]
    }
  ];

  const customSequences = sequences.filter(s => !s.id.includes('default'));

  return (
    <>
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          {!isCollapsed ? (
            <span className="text-xl font-bold text-blue-600">Outreach</span>
          ) : (
            <Mail className="h-6 w-6 text-blue-600 mx-auto" />
          )}
          
          {/* Toggle Button */}
          <button
            onClick={onToggle}
            className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.section}
                </h3>
              )}
              
              <ul className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <button
                      onClick={item.onClick}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors relative group ${
                        item.active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className={`h-5 w-5 flex-shrink-0 ${
                        item.color || (item.active ? 'text-blue-600' : 'text-gray-500')
                      }`} />
                      
                      {!isCollapsed && (
                        <>
                          <span className="ml-3 flex-1 text-sm font-medium text-left">{item.name}</span>
                        
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.bgColor || 'bg-gray-100'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed mode */}
                      {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Custom Sequences */}
              {!isCollapsed && section.section === 'Sequences' && customSequences.length > 0 && (
                <div className="mt-2 ml-8 space-y-1">
                  {customSequences.map((seq) => (
                    <button
                      key={seq.id}
                      onClick={() => handleFilterClick('sequence', seq.id)}
                      className={`w-full flex items-center px-3 py-1.5 text-sm rounded-lg ${
                        activeFilter?.type === 'sequence' && activeFilter?.value === seq.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{seq.name}</span>
                      <span className="ml-auto text-xs text-gray-400">{seq.leadsCount || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Debug Info Section */}
          {!isCollapsed && debugInfo && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Debug Info
              </div>
              <div className="bg-gray-100 rounded-lg p-2 text-xs">
                <p>Total Sequences: {debugInfo.totalSequences}</p>
                <p>Total Replies Found: {debugInfo.totalRepliesFound}</p>
                <p>Sequences with Replies: {debugInfo.sequencesWithReplies}</p>
                {debugInfo.latestReply && (
                  <div className="mt-1 pt-1 border-t border-gray-300">
                    <p className="font-semibold">Latest Reply:</p>
                    <p>Lead: {debugInfo.latestReply.leadName}</p>
                    <p>Step: {debugInfo.latestReply.stepName}</p>
                    <p className="truncate">Content: {debugInfo.latestReply.content?.substring(0, 50)}...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Replies Section */}
          {!isCollapsed && recentReplies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700"
              >
                <span>Recent Replies ({recentReplies.length})</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showReplies ? 'rotate-90' : ''}`} />
              </button>
              
              {showReplies && (
                <div className="space-y-3 mt-2">
                  {recentReplies.map((reply, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => {
                        setShowRepliesDialog(true);
                        handleFilterClick('lead', reply.leadName);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-800 truncate max-w-[120px]">
                          {reply.leadName}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStepBadgeColor(reply.step)}`}>
                          {reply.stepName || getStepName(reply.step)}
                        </span>
                      </div>
                      <p className="text-xs text-green-700 line-clamp-2 mt-1">
                        {reply.content?.substring(0, 80)}...
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-green-500">
                          {new Date(reply.receivedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-green-400 truncate max-w-[120px]">
                          {reply.fromEmail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Show message if no replies */}
          {!isCollapsed && recentReplies.length === 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center py-2">
                No replies yet
              </div>
            </div>
          )}
        </nav>

        {/* Quick Stats Footer */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.hot}</p>
                <p className="text-xs text-gray-500">Hot Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.contacted}</p>
                <p className="text-xs text-gray-500">Contacted</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
              <div className="text-center">
                <p className="text-lg font-semibold text-purple-600">{stats.converted}</p>
                <p className="text-xs text-gray-500">Converted</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-orange-600">{stats.pendingFollowups}</p>
                <p className="text-xs text-gray-500">Follow-ups</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Replies Dialog */}
      <RepliesDialog
        isOpen={showRepliesDialog}
        onClose={() => setShowRepliesDialog(false)}
        replies={recentReplies}
        onReply={(reply) => {
          window.location.href = `mailto:${reply.fromEmail}?subject=Re: ${reply.stepName} Email`;
        }}
      />
    </>
  );
}