// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import LeadGenerator from '../../components/MobileLeads/LeadGenerator';
import StatsCards from '../../components/MobileLeads/StatsCard';
import LeadTable from '../../components/MobileLeads/LeadsTable';


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('leads');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mobile App Lead Generation System
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Generate, score, and manage mobile app leads automatically
              </p>
            </div>
            <div className="flex space-x-3">
              <LeadGenerator onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
             
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards refreshTrigger={refreshTrigger} />
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('leads')}
              className={`${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Leads
            </button>
            <button
              onClick={() => setActiveTab('hot')}
              className={`${
                activeTab === 'hot'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              🔥 Hot Leads
            </button>
            <button
              onClick={() => setActiveTab('warm')}
              className={`${
                activeTab === 'warm'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              💫 Warm Leads
            </button>
            <button
              onClick={() => setActiveTab('cold')}
              className={`${
                activeTab === 'cold'
                  ? 'border-blue-300 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              ❄️ Cold Leads
            </button>
          </nav>
        </div>
      </div>

      {/* Lead Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadTable 
          quality={activeTab === 'leads' ? undefined : activeTab}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}