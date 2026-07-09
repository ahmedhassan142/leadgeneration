// components/layout/Sidebar.tsx - COMPLETELY FIXED VERSION
'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  EnvelopeIcon, 
  CogIcon, 
  GlobeAltIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface Stats {
  newInbound?: number;
  totalLeads?: number;
  hotLeads?: number;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats>({ newInbound: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/debug/status');
        const data = await response.json();
        
        // Calculate new inbound leads (raw leads without websites)
        const newInbound = data?.leads?.byStatus?.raw || 0;
        
        setStats({ newInbound });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({ newInbound: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Leads', href: '/leads', icon: UserGroupIcon },
    { name: 'Outreach', href: '/outreach', icon: EnvelopeIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
    { 
      name: 'Inbound Leads', 
      href: '/inbound', // Fixed lowercase 'i'
      icon: GlobeAltIcon,
      badge: loading ? null : stats?.newInbound || 0
    },
  ];

  // If not open, don't render anything
  if (!open) return null;

  return (
    <Dialog 
      as="div" 
      className="relative z-50 lg:hidden" 
      onClose={setOpen}
      open={open} // Move open to Dialog directly
    >
      {/* Background overlay */}
      <div className="fixed inset-0 bg-gray-900/80" aria-hidden="true" />

      <div className="fixed inset-0 flex">
        <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition ease-in-out duration-300 data-[closed]:-translate-x-full">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <span className="text-xl font-bold text-blue-600">LeadGen Copilot</span>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name} className="relative">
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                            pathname === item.href
                              ? 'bg-gray-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }`}
                          onClick={() => setOpen(false)}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          <span className="flex-1">{item.name}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-0.5 text-center text-xs font-medium text-white">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}