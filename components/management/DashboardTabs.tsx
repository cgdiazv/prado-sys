'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Users, MessageSquare, BookOpen, Search, ShieldCheck, ArrowRight, Edit3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

type SortField = 'user' | 'app' | 'plan' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function DashboardTabs({ subscribers, helpdeskData }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'helpdesk' | 'how-to'>('subscribers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<SubscriberRecord | null>(null);
  const [selectedApp, setSelectedApp] = useState<'all' | 'Jobs' | 'Fleet' | 'Commerce' | 'ERP'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [subscribersList, setSubscribersList] = useState<SubscriberRecord[]>(subscribers);

  useEffect(() => {
    setSubscribersList(subscribers);
  }, [subscribers]);

  const handlePlanUpdated = (userId: string, app: string, newPlan: string) => {
    setSubscribersList((prev) =>
      prev.map((sub) =>
        sub.id === userId && sub.app === app
          ? {
              ...sub,
              plan: newPlan,
              details: sub.name ? `${sub.name} (${newPlan})` : `Plan: ${newPlan}`,
            }
          : sub
      )
    );
  };

  const appCounts = useMemo(() => {
    return {
      all: subscribersList.length,
      Jobs: subscribersList.filter((s) => s.app === 'Jobs').length,
      Fleet: subscribersList.filter((s) => s.app === 'Fleet').length,
      Commerce: subscribersList.filter((s) => s.app === 'Commerce').length,
      ERP: subscribersList.filter((s) => s.app === 'ERP').length,
    };
  }, [subscribersList]);

  const filteredSubscribers = useMemo(() => {
    return subscribersList.filter((s) => {
      const matchesApp = selectedApp === 'all' || s.app === selectedApp;
      if (!matchesApp) return false;

      const term = searchTerm.toLowerCase();
      if (!term) return true;

      return (
        s.id.toLowerCase().includes(term) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.details && s.details.toLowerCase().includes(term)) ||
        (s.plan && s.plan.toLowerCase().includes(term))
      );
    });
  }, [subscribersList, searchTerm, selectedApp]);

  const sortedSubscribers = useMemo(() => {
    return [...filteredSubscribers].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'user') {
        const aVal = (a.name || a.email || a.id).toLowerCase();
        const bVal = (b.name || b.email || b.id).toLowerCase();
        comparison = aVal.localeCompare(bVal);
      } else if (sortField === 'app') {
        comparison = a.app.localeCompare(b.app);
      } else if (sortField === 'plan') {
        const aPlan = (a.plan || '').toLowerCase();
        const bPlan = (b.plan || '').toLowerCase();
        comparison = aPlan.localeCompare(bPlan);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredSubscribers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-50 group-hover:opacity-100 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
    );
  };

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
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, plan, or UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Selector con las 4 apps */}
              <div className="relative w-full sm:w-56">
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value as any)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-800 cursor-pointer shadow-xs"
                >
                  <option value="all">Todas las apps ({appCounts.all})</option>
                  <option value="Jobs">Prado Jobs ({appCounts.Jobs})</option>
                  <option value="Fleet">Prado Fleet ({appCounts.Fleet})</option>
                  <option value="Commerce">Prado Commerce ({appCounts.Commerce})</option>
                  <option value="ERP">Prado ERP ({appCounts.ERP})</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono whitespace-nowrap">
              Showing {filteredSubscribers.length} of {subscribers.length} accounts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => handleSort('user')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                        sortField === 'user' ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>User / UUID</span>
                      {renderSortIcon('user')}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => handleSort('app')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                        sortField === 'app' ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>App Target</span>
                      {renderSortIcon('app')}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => handleSort('plan')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                        sortField === 'plan' ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Plan / Role</span>
                      {renderSortIcon('plan')}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                        sortField === 'status' ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => handleSort('createdAt')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                        sortField === 'createdAt' ? 'text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Created Date</span>
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedSubscribers.map((user) => (
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
                            : user.app === 'Commerce'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-violet-50 text-violet-700 border border-violet-200'
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
        onPlanUpdated={(newPlan) => {
          if (editingSubscriber) {
            handlePlanUpdated(editingSubscriber.id, editingSubscriber.app, newPlan);
          }
        }}
      />
    </div>
  );
}
