import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';

export default function Header() {
  const { toggle } = useSidebar();

  return (
    <header className="fixed top-0 right-0 left-64 bg-white shadow-sm z-10 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        <button
          onClick={toggle}
          className="p-2 rounded-md hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1" />

        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-md hover:bg-gray-100 relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}