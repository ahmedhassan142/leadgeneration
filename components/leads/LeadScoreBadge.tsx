// components/leads/LeadScoreBadge.tsx
'use client';

import React from 'react';

interface LeadScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  animate?: boolean;
  className?: string;
}

export default function LeadScoreBadge({ 
  score, 
  size = 'md',
  showLabel = false,
  showPercentage = true,
  animate = false,
  className = ''
}: LeadScoreBadgeProps) {
  
  // Determine color based on score
  const getScoreColor = () => {
    if (score >= 70) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  // Determine emoji based on score
  const getScoreEmoji = () => {
    if (score >= 70) return '🔥';
    if (score >= 40) return '⚡';
    return '❄️';
  };

  // Determine label based on score
  const getScoreLabel = () => {
    if (score >= 70) return 'Hot';
    if (score >= 40) return 'Warm';
    return 'Cold';
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  // Animation classes
  const animationClass = animate ? 'transition-all duration-300 hover:scale-105 hover:shadow-md' : '';

  return (
    <div className="flex items-center space-x-2">
      {/* Score Badge */}
      <div
        className={`
          inline-flex items-center font-medium rounded-full border
          ${sizeClasses[size]}
          ${getScoreColor()}
          ${animationClass}
          ${className}
        `}
      >
        {/* Emoji indicator */}
        <span className="mr-1" role="img" aria-label={getScoreLabel()}>
          {getScoreEmoji()}
        </span>
        
        {/* Score value */}
        {showPercentage ? `${score}%` : score}
      </div>

      {/* Optional text label */}
      {showLabel && (
        <span className="text-sm text-gray-500">
          {getScoreLabel()} Lead
        </span>
      )}
    </div>
  );
}

// Compact version (just the score)
export function CompactScoreBadge({ score, className = '' }: { score: number; className?: string }) {
  const getColor = () => {
    if (score >= 70) return 'bg-red-100 text-red-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getColor()} ${className}`}>
      {score}
    </span>
  );
}

// Score with progress bar
export function ScoreWithProgress({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = () => {
    if (score >= 70) return 'bg-green-600';
    if (score >= 40) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const barHeights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex-1 ${barHeights[size]} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${barHeights[size]} ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-${size === 'lg' ? 'base' : 'sm'} font-medium text-gray-700 min-w-[40px]`}>
        {score}%
      </span>
    </div>
  );
}

// Score circle (radial progress)
export function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="4"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{score}</span>
      </div>
    </div>
  );
}

// Score distribution chart (mini)
export function ScoreDistribution({ scores }: { scores: number[] }) {
  const hot = scores.filter(s => s >= 70).length;
  const warm = scores.filter(s => s >= 40 && s < 70).length;
  const cold = scores.filter(s => s < 40).length;
  const total = scores.length;

  const hotPercent = (hot / total) * 100;
  const warmPercent = (warm / total) * 100;
  const coldPercent = (cold / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden">
        <div className="bg-green-500" style={{ width: `${hotPercent}%` }} />
        <div className="bg-yellow-500" style={{ width: `${warmPercent}%` }} />
        <div className="bg-blue-500" style={{ width: `${coldPercent}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1" />
          <span>Hot ({hot})</span>
        </div>
        <div className="flex items-center">
          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1" />
          <span>Warm ({warm})</span>
        </div>
        <div className="flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
          <span>Cold ({cold})</span>
        </div>
      </div>
    </div>
  );
}

// Score tooltip (for hover details)
export function ScoreTooltip({ score, reasons = [] }: { score: number; reasons?: string[] }) {
  return (
    <div className="group relative">
      <LeadScoreBadge score={score} />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        <div className="font-medium mb-1">Score: {score}%</div>
        {reasons.length > 0 && (
          <ul className="text-gray-300 text-[10px]">
            {reasons.slice(0, 3).map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        )}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

// Score comparison (two scores side by side)
export function ScoreComparison({ score1, score2, label1 = 'Current', label2 = 'Target' }: { 
  score1: number; 
  score2: number;
  label1?: string;
  label2?: string;
}) {
  const difference = score2 - score1;
  const isPositive = difference > 0;

  return (
    <div className="flex items-center space-x-4">
      <div className="text-center">
        <div className="text-sm text-gray-500">{label1}</div>
        <LeadScoreBadge score={score1} size="lg" />
      </div>
      
      <div className="text-center">
        <div className="text-sm text-gray-500">Difference</div>
        <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{difference}%
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-sm text-gray-500">{label2}</div>
        <LeadScoreBadge score={score2} size="lg" />
      </div>
    </div>
  );
}

// export default LeadScoreBadge;