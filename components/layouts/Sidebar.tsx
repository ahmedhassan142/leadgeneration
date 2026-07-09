'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Phone,
  BarChart2,
  Settings,
} from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/call-agent/dashboard' },
  { icon: Users, label: 'Leads', href: '/call-agent/dashboard/leads' },
  { icon: Phone, label: 'Calls', href: '/call-agent/calls' },
  { icon: BarChart2, label: 'Analytics', href: '/call-agent/analytics' },
  { icon: Settings, label: 'Settings', href: '/call-agent/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white shadow-sm transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-20'
    }`}>
      <div className="p-4">
        <h1 className={`font-bold text-xl mb-8 ${!isOpen && 'text-center'}`}>
          {isOpen ? 'AI Call Agent' : 'AICA'}
        </h1>

        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon size={20} />
                    {isOpen && (
                      <span className="ml-3 text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}