'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, HelpCircle } from 'lucide-react';
import { getHowToPlaybooks, HowToPlaybook } from '@/lib/helpdeskHowTo';

interface HelpdeskHowToAssistantProps {
  locale?: string;
}

export default function HelpdeskHowToAssistant({ locale = 'en' }: HelpdeskHowToAssistantProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const playbooks: HowToPlaybook[] = getHowToPlaybooks(locale);

  const filteredPlaybooks = playbooks.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Management & Support Playbooks</h3>
          <p className="text-xs text-slate-500">Quick how-to guides and ready-to-send responses for subscriber support.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search playbooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredPlaybooks.map((playbook) => (
          <div
            key={playbook.slug}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {playbook.audience}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 mt-2">{playbook.title}</h4>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{playbook.summary}</p>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">{playbook.steps.length} steps</span>
              <Link
                href={`/management/how-to/${playbook.slug}`}
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Open Guide
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
