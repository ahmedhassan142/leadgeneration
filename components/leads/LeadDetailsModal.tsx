// components/leads/LeadDetailsModal.tsx
'use client';

import { Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LeadScoreBadge from './LeadScoreBadge';

interface LeadDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose, onUpdate }: LeadDetailsModalProps) {
  if (!lead) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Lead Details
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <Tab.Group>
                  <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/10 p-1">
                    <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ui-selected:bg-white ui-selected:shadow">
                      Overview
                    </Tab>
                    <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ui-selected:bg-white ui-selected:shadow">
                      Analysis
                    </Tab>
                    <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ui-selected:bg-white ui-selected:shadow">
                      Outreach
                    </Tab>
                  </Tab.List>
                  
                  <Tab.Panels className="mt-4">
                    {/* Overview Tab */}
                    <Tab.Panel>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Business Name</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Website</label>
                            <p className="mt-1 text-sm text-blue-600">
                              <a href={lead.website} target="_blank" rel="noopener noreferrer">
                                {lead.website}
                              </a>
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Niche</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.niche}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Location</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.location}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Phone</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Score</label>
                            <div className="mt-1">
                              <LeadScoreBadge score={lead.score || 0} />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emails Found</label>
                          <div className="mt-1 space-y-1">
                            {lead.emails?.map((email: string) => (
                              <p key={email} className="text-sm text-gray-900">{email}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Tab.Panel>

                    {/* Analysis Tab */}
                    <Tab.Panel>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">SEO Optimized</label>
                            <p className="mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                lead.analysis?.hasSEO ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {lead.analysis?.hasSEO ? 'Yes' : 'No'}
                              </span>
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Speed Score</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.analysis?.speedScore || 0}/100</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">CMS</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.analysis?.cms || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Mobile Friendly</label>
                            <p className="mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                lead.analysis?.mobileFriendly ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {lead.analysis?.mobileFriendly ? 'Yes' : 'No'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">AI Analysis</label>
                          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Design Score</span>
                              <span className="text-lg font-bold text-blue-600">
                                {lead.ai?.designScore || 0}/10
                              </span>
                            </div>
                            {lead.ai?.issues && (
                              <>
                                <label className="text-sm font-medium text-gray-500 mt-2 block">Issues Found</label>
                                <ul className="mt-1 list-disc list-inside">
                                  {lead.ai.issues.map((issue: string, i: number) => (
                                    <li key={i} className="text-sm text-gray-600">{issue}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Tab.Panel>

                    {/* Outreach Tab */}
                    <Tab.Panel>
                      {lead.outreach ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Subject</label>
                            <p className="mt-1 text-sm text-gray-900">{lead.outreach.subject}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Message</label>
                            <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                {lead.outreach.message}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <p className="mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                lead.outreach.sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {lead.outreach.sent ? `Sent on ${new Date(lead.outreach.sentAt).toLocaleDateString()}` : 'Not sent'}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No outreach content generated yet</p>
                      )}
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}