// components/dashboard/MicroBatchIndicator.tsx
'use client';

import { BoltIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface MicroBatchIndicatorProps {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  pipelineProgress: {
    scrape: number;
    analyze: number;
    email: number;
    ai: number;
    score: number;
  };
}

export default function MicroBatchIndicator({ 
  pendingJobs, 
  processingJobs, 
  completedJobs,
  pipelineProgress 
}: MicroBatchIndicatorProps) {
  
  // Calculate current wave (20 jobs per wave)
  const currentWave = Math.floor(completedJobs / 20) + 1;
  const waveProgress = completedJobs % 20;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-500" />
          <span className="font-medium">Micro-batch Mode</span>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          Wave {currentWave}
        </span>
      </div>
      
      {/* Wave Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">Wave {currentWave} Progress</span>
          <span className="text-gray-900 font-medium">{waveProgress}/20 jobs</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${(waveProgress / 20) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Pipeline Status */}
      <div className="grid grid-cols-5 gap-1 text-xs">
        <div className="text-center">
          <div className="font-medium text-blue-600">S</div>
          <div className="text-gray-600">{pipelineProgress.scrape}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-purple-600">A</div>
          <div className="text-gray-600">{pipelineProgress.analyze}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-green-600">E</div>
          <div className="text-gray-600">{pipelineProgress.email}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-orange-600">AI</div>
          <div className="text-gray-600">{pipelineProgress.ai}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-red-600">Sc</div>
          <div className="text-gray-600">{pipelineProgress.score}</div>
        </div>
      </div>
      
      {/* Status Icons */}
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3 text-blue-500" />
          <span>{pendingJobs} pending</span>
        </div>
        <div className="flex items-center gap-1">
          <BoltIcon className="h-3 w-3 text-yellow-500" />
          <span>{processingJobs} active</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircleIcon className="h-3 w-3 text-green-500" />
          <span>{completedJobs} done</span>
        </div>
      </div>
    </div>
  );
}