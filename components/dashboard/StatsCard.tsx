'use client';

import React from 'react';
import { Users, Phone, TrendingUp, Star } from 'lucide-react';

interface StatsCardsProps {
  stats: any;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      change: '+12%',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Calls Today',
      value: stats.callsToday,
      change: stats.callsToday > 0 ? `+${stats.callsToday} today` : 'No calls yet',
      icon: Phone,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Hot Leads',
      value: stats.hotLeads,
      change: `${((stats.hotLeads / stats.totalLeads) * 100).toFixed(1)}% of total`,
      icon: TrendingUp,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Avg AI Score',
      value: stats.avgScore.toFixed(1),
      change: 'Out of 100',
      icon: Star,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <Icon className="text-white" size={24} />
              </div>
              <span className="text-sm text-gray-500">{card.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
            <p className="text-sm text-gray-600">{card.title}</p>
          </div>
        );
      })}
    </div>
  );
}