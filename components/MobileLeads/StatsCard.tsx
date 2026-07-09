// app/dashboard/components/StatsCards.tsx
'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totals: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    ios: number;
    android: number;
    contacted: number;
    replied: number;
    converted: number;
  };
  percentages: {
    hot: number;
    warm: number;
    cold: number;
    ios: number;
    android: number;
  };
  averageScore: number;
}

interface Props {
  refreshTrigger: number;
}

export default function StatsCards({ refreshTrigger }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mobile-leads/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Leads',
      value: stats.totals.total,
      icon: '📊',
      color: 'bg-blue-50 text-blue-600',
      subtitle: `${stats.totals.ios} iOS · ${stats.totals.android} Android`
    },
    {
      title: 'Hot Leads',
      value: stats.totals.hot,
      percentage: stats.percentages.hot,
      icon: '🔥',
      color: 'bg-red-50 text-red-600',
      subtitle: `${stats.percentages.hot}% of total`
    },
    {
      title: 'Warm Leads',
      value: stats.totals.warm,
      percentage: stats.percentages.warm,
      icon: '💫',
      color: 'bg-yellow-50 text-yellow-600',
      subtitle: `${stats.percentages.warm}% of total`
    },
    {
      title: 'Avg Score',
      value: stats.averageScore,
      icon: '📈',
      color: 'bg-green-50 text-green-600',
      subtitle: 'out of 100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{card.icon}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.color}`}>
              {card.subtitle}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{card.title}</h3>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          {card.percentage && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Target</span>
                <span>{card.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${
                    card.title === 'Hot Leads' ? 'bg-red-500' :
                    card.title === 'Warm Leads' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${card.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}