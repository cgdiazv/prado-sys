import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import HelpdeskHowToAssistant from '@/components/management/HelpdeskHowToAssistant';
import HelpdeskInbox from '@/components/management/HelpdeskInbox';
import GeneralInternalTicketModal from '@/components/management/GeneralInternalTicketModal';
import {
  createHelpdeskTicket,
  updateSubscriberAccount,
} from './actions';

type OrganizationRow = {
  id: string;
  name: string | null;
  owner_id: string | null;
  subscription_status: string | null;
  trial_starts_at: string | null;
  created_at: string | null;
};

type OwnerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

const STATUS_OPTIONS = ['trial', 'individual', 'growth', 'enterprise', 'cancelled', 'past_due'];
const TICKET_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US');
}

function normalizeStatus(status: string | null) {
  const normalized = (status || '').trim().toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : 'trial';
}

function toDateInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function PradoManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ q?: string; status?: string; notice?: string; error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';

  await requirePradoManagementUser(locale);

  const q = (resolvedSearchParams.q || '').trim().toLowerCase();
  const statusFilter = (resolvedSearchParams.status || '').trim().toLowerCase();
  const notice = (resolvedSearchParams.notice || '').trim();
  const hasError = (resolvedSearchParams.error || '').trim();

  const supabaseAdmin = createAdminClient();

  const { data: organizations, error: organizationsError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, owner_id, subscription_status, trial_starts_at, created_at')
    .order('created_at', { ascending: false });

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  const [ticketsResult, commentsResult, eventsResult] = await Promise.all([
    supabaseAdmin
      .from('helpdesk_tickets')
      .select('id, organization_id, subject, description, priority, status, assignee_name, assignee_email, requested_by_email, escalated_from, unread_for_agent_count, unread_for_user_count, waiting_on, last_comment_at, last_comment_author_email, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('helpdesk_ticket_comments')
      .select('id, ticket_id, author_user_id, author_email, comment, created_at')
      .order('created_at', { ascending: true })
      .limit(2000),
    supabaseAdmin
      .from('helpdesk_ticket_events')
      .select('id, ticket_id, event_type, event_note, actor_email, created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  if (ticketsResult.error) {
    throw new Error(ticketsResult.error.message);
  }

  if (commentsResult.error) {
    throw new Error(commentsResult.error.message);
  }

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const rows = (organizations || []) as OrganizationRow[];
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_id).filter(Boolean))) as string[];

  const { data: ownerProfiles } = ownerIds.length
    ? await supabaseAdmin
        .from('user_profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', ownerIds)
    : { data: [] };

  const ownerProfileByUserId = new Map<string, OwnerProfile>();
  for (const profile of (ownerProfiles || []) as OwnerProfile[]) {
    ownerProfileByUserId.set(profile.user_id, profile);
  }

  const ownerEmailEntries = await Promise.all(
    ownerIds.map(async (ownerId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(ownerId);
      return [ownerId, data?.user?.email || null] as const;
    })
  );

  const ownerEmailByUserId = new Map<string, string | null>(ownerEmailEntries);
  const filteredRows = rows.filter((row) => {
    const normalizedStatus = (row.subscription_status || '').toLowerCase();
    if (statusFilter && normalizedStatus !== statusFilter) return false;

    if (!q) return true;

    const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) || '' : '';
    const ownerProfile = row.owner_id ? ownerProfileByUserId.get(row.owner_id) : null;
    const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim();

    return [row.name || '', row.id, ownerEmail, ownerName]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prado Management Console</h1>
            <p className="text-sm text-slate-500 mt-2">Manage subscriber account status, trial lifecycle, and support/helpdesk operations.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <GeneralInternalTicketModal locale={locale} createTicketAction={createHelpdeskTicket} />
            <a
              href="mailto:support@pradojob.com?subject=Prado%20Helpdesk%20Escalation"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Email Helpdesk (Fallback)
            </a>
            <form action={`/${locale}/auth/signout`} method="POST">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-1.5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                {locale.toLowerCase().startsWith('es') ? 'Cerrar sesión' : 'Sign Out'}
              </button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <HelpdeskHowToAssistant locale={locale} />

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  name="q"
                  defaultValue={resolvedSearchParams.q || ''}
                  placeholder="Search by org name, owner name, owner email, or org id"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                >
                  Apply filters
                </button>
              </form>

              {notice ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {notice === 'account-updated' ? 'Subscriber account updated successfully.' : null}
                  {notice === 'ticket-created' ? 'Helpdesk ticket created and escalation recorded.' : null}
                  {notice === 'ticket-updated' ? 'Helpdesk ticket updated.' : null}
                  {notice === 'comment-added' ? 'Helpdesk ticket comment added.' : null}
                </p>
              ) : null}

              {hasError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {hasError}
                </p>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 text-left font-semibold">Subscriber</th>
                      <th className="py-2 pr-3 text-left font-semibold">Account Controls</th>
                      <th className="py-2 pr-3 text-left font-semibold">Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) : null;

                      return (
                        <tr key={row.id} className="border-b border-slate-100 align-top">
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-slate-900">{row.name || 'Unnamed organization'}</p>
                            <p className="text-xs text-slate-500">Org ID: {row.id}</p>
                            <p className="text-xs text-slate-500">Created: {formatDate(row.created_at)}</p>
                          </td>

                          <td className="py-3 pr-3">
                            <form action={updateSubscriberAccount} className="space-y-2 min-w-[260px]">
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="organizationId" value={row.id} />

                              <label className="block text-xs text-slate-600 font-medium">
                                Subscription status
                                <select
                                  name="subscriptionStatus"
                                  defaultValue={normalizeStatus(row.subscription_status)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                >
                                  {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block text-xs text-slate-600 font-medium">
                                Trial starts at
                                <input
                                  type="date"
                                  name="trialStartsAt"
                                  defaultValue={toDateInputValue(row.trial_starts_at)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-xs font-semibold hover:bg-emerald-500"
                              >
                                Save account
                              </button>
                            </form>
                          </td>

                          <td className="py-3 pr-3">
                            <div className="flex flex-col gap-2 min-w-[240px]">
                              <form action={createHelpdeskTicket} className="space-y-2 rounded-lg border border-slate-200 p-3">
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="organizationId" value={row.id} />
                                <input type="hidden" name="organizationName" value={row.name || row.id} />
                                <label className="block text-xs text-slate-600 font-medium">
                                  Escalation subject
                                  <input
                                    type="text"
                                    name="subject"
                                    defaultValue={`Helpdesk escalation - ${row.name || row.id}`}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                                    required
                                  />
                                </label>
                                <label className="block text-xs text-slate-600 font-medium">
                                  Issue summary
                                  <textarea
                                    name="description"
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                                    placeholder="Describe the issue, impact, and requested action."
                                    required
                                  />
                                </label>
                                <label className="block text-xs text-slate-600 font-medium">
                                  Priority
                                  <select
                                    name="priority"
                                    defaultValue="high"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                                  >
                                    {TICKET_PRIORITY_OPTIONS.map((priority) => (
                                      <option key={priority} value={priority}>
                                        {priority}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  type="submit"
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-white text-xs font-semibold hover:bg-slate-800"
                                >
                                  Create helpdesk ticket
                                </button>
                              </form>
                              {ownerEmail ? (
                                <a
                                  href={`mailto:${ownerEmail}?subject=Prado%20Account%20Update%20-%20${encodeURIComponent(row.name || row.id)}`}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                                >
                                  Email subscriber owner
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRows.length === 0 ? (
                <p className="text-sm text-slate-500">No subscribers match the current filters.</p>
              ) : null}
            </section>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Helpdesk Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Real-time agent inbox for subscriber support conversations.</p>
            </div>

            <HelpdeskInbox
              locale={locale}
              initialData={{
                organizations: rows.map((row) => ({ id: row.id, name: row.name || 'Unnamed organization' })),
                tickets: (ticketsResult.data || []) as any,
                comments: (commentsResult.data || []) as any,
                events: (eventsResult.data || []) as any,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
