// components/outreach/SequenceManager.tsx
'use client';

import { useState } from 'react';
import {
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Target,
  Users
} from 'lucide-react';

interface Sequence {
  id: string;
  name: string;
  description: string;
  targetQualities: string[];
  totalSteps: number;
  totalDays: number;
  isActive: boolean;
  isDefault: boolean;
  leadsCount: number;
}

interface SequenceManagerProps {
  sequences: Sequence[];
  onSelect: (sequenceId: string) => void;
  onCreate: () => void;
  onToggle: (sequenceId: string) => void;
}

export default function SequenceManager({ sequences, onSelect, onCreate, onToggle }: SequenceManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getQualityBadge = (quality: string) => {
    const colors: Record<string, string> = {
      hot: 'bg-red-100 text-red-700',
      warm: 'bg-orange-100 text-orange-700',
      cold: 'bg-blue-100 text-blue-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[quality]}`}>
        {quality}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sequence Templates</h2>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      {/* Sequences List */}
      <div className="divide-y divide-gray-200">
        {sequences.map((seq) => (
          <div key={seq.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900">{seq.name}</h3>
                  {seq.isDefault && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                      Default
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    seq.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {seq.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{seq.description}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />
                    {seq.totalSteps} steps
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {seq.totalDays} days
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    {seq.leadsCount} leads
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Target className="h-3 w-3" />
                    {seq.targetQualities.map(q => getQualityBadge(q))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggle(seq.id)}
                  className={`p-2 rounded-lg ${
                    seq.isActive 
                      ? 'text-orange-600 hover:bg-orange-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {seq.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onSelect(seq.id)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {expandedId === seq.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Steps */}
            {expandedId === seq.id && (
              <div className="mt-4 pl-4 border-l-2 border-blue-200">
                {seq.steps?.map((step: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 py-2">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{step.template}</p>
                      <p className="text-xs text-gray-500">Day {step.day} • {step.subject}</p>
                    </div>
                    <span className="text-xs text-gray-400">Delay: {step.delay}d</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}