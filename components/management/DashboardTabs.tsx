'use client';

import React, { useState } from 'react';
import { Users, MessageSquare, BookOpen, Search, ShieldCheck, ArrowRight, Edit3 } from 'lucide-react';
import HelpdeskInbox, { HelpdeskTicket, TicketComment, TicketEvent } from './HelpdeskInbox';
import HelpdeskHowToAssistant from './HelpdeskHowToAssistant';
import GeneralInternalTicketModal from './GeneralInternalTicketModal';
import ChangePlanModal from './ChangePlanModal';
import { SubscriberRecord } from '@/app/actions/get-subscribers';

interface DashboardTabsProps {
  subscribers: SubscriberRecord[];
  helpdeskData: {
    tickets: HelpdeskTicket[];
    comments: TicketComment[];
    events: TicketEvent[];
  };
}

export default function DashboardTabs({ subscribers, helpdeskData }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'helpdesk' | 'how-to'>('subscribers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<SubscriberRecord | null>(null);

  const filteredSubscribers = subscribers.filter(
    (s) =>
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.details && s.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.plan && s.plan.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'subscribers'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          Subscribers Overview
          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono">
            {subscribers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('helpdesk')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'helpdesk'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Helpdesk Inbox
          <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full font-mono">
            {helpdeskData.tickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('how-to')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'how-to'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          How-To Playbooks
        </button>
      </div>

      {/* Tab Content 1: Subscribers Table */}
      {activeTab === 'subscribers' && (
        <section className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, plan, or UUID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredSubscribers.length} of {subscribers.length} accounts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">User / UUID</th>
                  <th className="p-4">App Target</th>
                  <th className="p-4">Plan / Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubscribers.map((user) => (
                  <tr key={`${user.app}-${user.id}`} className="hover:bg-slate-50/75 transition">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{user.name || user.email || 'No email provided'}</div>
                      {user.name && user.email && (
                        <div className="text-xs text-slate-500">{user.email}</div>
                      )}
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{user.id}</div>
                      {user.details && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">{user.details}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.app === 'Jobs'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : user.app === 'Fleet'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        }`}
                      >
                        {user.app}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider">
                        <ShieldCheck className="h-3 w-3 text-slate-500" />
                        {user.plan || 'Standard'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditingSubscriber(user)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                          Change Plan
                        </button>

                        <button
                          onClick={() => setActiveTab('helpdesk')}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        >
                          Create Ticket
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSubscribers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No subscribers match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab Content 2: Helpdesk Inbox */}
      {activeTab === 'helpdesk' && (
        <section className="space-y-4">
          <HelpdeskInbox
            tickets={helpdeskData.tickets}
            comments={helpdeskData.comments}
            events={helpdeskData.events}
          />
        </section>
      )}

      {/* Tab Content 3: How-To Playbooks */}
      {activeTab === 'how-to' && (
        <section className="space-y-4">
          <HelpdeskHowToAssistant locale="en" />
        </section>
      )}

      <GeneralInternalTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <ChangePlanModal
        isOpen={Boolean(editingSubscriber)}
        subscriber={editingSubscriber}
        onClose={() => setEditingSubscriber(null)}
      />
    </div>
  );
}
