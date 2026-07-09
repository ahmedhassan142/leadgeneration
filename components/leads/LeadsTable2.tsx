'use client';

import React from 'react';
import { Phone, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/scraper/utils/helper';
import Link from 'next/link';

interface LeadTableProps {
  leads: any[];
  loading: boolean;
  onDelete: (id: string) => void;
  onCall: (id: string) => void;
}

export default function LeadTable({ leads, loading, onDelete, onCall }: LeadTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">👥</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
        <p className="text-gray-500 mb-4">Get started by adding your first lead</p>
        <Link href="/leads/new">
          <Button>Add New Lead</Button>
        </Link>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lead Info
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Call
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => {
            const lastCall = lead.callHistory?.[lead.callHistory.length - 1];
            
            return (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.niche}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{lead.phone}</div>
                  {lead.email && (
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge>{lead.status}</Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          lead.aiScore >= 70 ? 'bg-green-500' :
                          lead.aiScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${lead.aiScore}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${getScoreColor(lead.aiScore)}`}>
                      {lead.aiScore}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lastCall ? (
                    <div>
                      <div>{formatDate(lastCall.date)}</div>
                      <div className="text-xs text-gray-400">
                        {lastCall.summary?.substring(0, 30)}...
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Never called</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onCall(lead._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Start Call"
                    >
                      <Phone size={18} />
                    </button>
                    <Link href={`/leads/${lead._id}/edit`}>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Edit Lead"
                      >
                        <Edit2 size={18} />
                      </button>
                    </Link>
                    <button
                      onClick={() => onDelete(lead._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Lead"
                    >
                      <Trash2 size={18} />
                    </button>
                    <Link href={`/leads/${lead._id}`}>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}