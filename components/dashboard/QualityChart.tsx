// components/dashboard/QualityChart.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface QualityChartProps {
  data: Array<{ _id: string; count: number }>;
  aiScores?: Array<{ name: string; score: number }>;
}

const COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};

export default function QualityChart({ data, aiScores = [] }: QualityChartProps) {
  // Filter out null/undefined and map to chart data
  const chartData = data
    .filter(item => item._id && item._id !== 'null' && item._id !== 'undefined')
    .map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      color: COLORS[item._id as keyof typeof COLORS] || '#9ca3af'
    }));

  // If no data, show placeholder
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Quality Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No quality data available</p>
        </div>
      </div>
    );
  }

  // Calculate average AI score
  const avgAIScore = aiScores.length > 0 
    ? (aiScores.reduce((acc, curr) => acc + curr.score, 0) / aiScores.length).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Lead Quality Distribution</h3>
        {avgAIScore && (
          <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
            Avg AI Score: {avgAIScore}/10
          </div>
        )}
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`${value} leads`, 'Count']}
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: 'white' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Quality Breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        {chartData.map((item) => (
          <div key={item.name} className="p-2 rounded-lg bg-gray-50">
            <div className="font-medium" style={{ color: item.color }}>{item.name}</div>
            <div className="text-gray-900 font-bold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}