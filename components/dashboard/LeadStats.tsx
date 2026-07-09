'use client';

import React from 'react';
import { Users, TrendingUp, Clock, Target } from 'lucide-react';

interface LeadStatsProps {
  stats: {
    total: number;
    new: number;
    contacted: number;
    hot: number;
    cold: number;
    converted: number;
    avgScore: number;
  };
}

export default function LeadStats({ stats }: LeadStatsProps) {
  const cards = [
    {
      title: 'Total Leads',
      value: stats.total,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Hot Leads',
      value: stats.hot,
      icon: TrendingUp,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'New Today',
      value: stats.new,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Conversion Rate',
      value: stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) + '%' : '0%',
      icon: Target,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`h-12 w-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={card.textColor} size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}