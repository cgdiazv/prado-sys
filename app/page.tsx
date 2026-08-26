import { getSubscribers } from './actions/get-subscribers';
import { getHelpdeskInboxSnapshot } from './management/actions';
import { logoutConsoleUser } from '@/app/actions/auth-actions';
import DashboardTabs from '@/components/management/DashboardTabs';
import GeneralInternalTicketModal from '@/components/management/GeneralInternalTicketModal';
import { LogOut } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const subscribers = await getSubscribers();
  
  let helpdeskData = {
    tickets: [],
    comments: [],
    events: [],
  };

  try {
    const snapshot = await getHelpdeskInboxSnapshot('en');
    if (!('error' in snapshot)) {
      helpdeskData = {
        tickets: (snapshot.tickets as any) || [],
        comments: (snapshot.comments as any) || [],
        events: (snapshot.events as any) || [],
      };
    }
  } catch (err) {
    console.error('Helpdesk snapshot fallback', err);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-10 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Prado Management Console
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
              Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global subscriber operations, status lifecycle, and multi-tenant access control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GeneralInternalTicketModal />
          <form action={logoutConsoleUser}>
            <button
              type="submit"
              className="px-3.5 py-2 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-8">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{subscribers.length}</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prado Jobs</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {subscribers.filter((s) => s.app === 'Jobs').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prado Fleet</div>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {subscribers.filter((s) => s.app === 'Fleet').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prado Commerce</div>
          <div className="text-2xl font-bold text-cyan-600 mt-1">
            {subscribers.filter((s) => s.app === 'Commerce').length}
          </div>
        </div>
      </section>

      {/* Interactive Tabs Section */}
      <DashboardTabs subscribers={subscribers} helpdeskData={helpdeskData} />
    </main>
  );
}