import { getSubscribers } from './actions/get-subscribers';
import { Users, Shield, Radio, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const subscribers = await getSubscribers();

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
          <button className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            Export Records
          </button>
          <button className="px-4 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800">
            Create System Notice
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-8">
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">Total Accounts</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{subscribers.length}</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">Prado Jobs</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">
            {subscribers.filter((s) => s.app === 'Jobs').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">Prado Fleet</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {subscribers.filter((s) => s.app === 'Fleet').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">Prado Commerce</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {subscribers.filter((s) => s.app === 'Commerce').length}
          </div>
        </div>
      </section>

      {/* Subscriber Management Table */}
      <section className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UUID or email..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">User / UUID</th>
                <th className="p-4">App Target</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {subscribers.map((user) => (
                <tr key={`${user.app}-${user.id}`} className="hover:bg-slate-50/75">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{user.email || 'No email provided'}</div>
                    <div className="text-xs text-slate-400 font-mono">{user.id}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.app === 'Jobs'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : user.app === 'Fleet'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                    >
                      {user.app}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'active'
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
                    <button className="text-sm font-medium text-slate-600 hover:text-slate-900">
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No subscribers found across connected Supabase databases.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}