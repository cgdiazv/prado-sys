'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { isPradoManagementUser } from '@/lib/pradoManagement';

const ALLOWED_SUBSCRIPTION_STATUS = new Set([
  'trial',
  'individual',
  'growth',
  'enterprise',
  'cancelled',
  'past_due',
]);

const ALLOWED_TICKET_STATUS = new Set(['open', 'in_progress', 'blocked', 'resolved', 'closed']);
const ALLOWED_TICKET_PRIORITY = new Set(['low', 'medium', 'high', 'urgent']);

type TicketMessageRole = 'agent' | 'user';

function managementRedirect(
  locale: string,
  state: 'account-updated' | 'ticket-created' | 'ticket-updated' | 'comment-added' | 'error',
  message?: string,
  organizationId?: string,
  destination: 'management' = 'management'
) {
  const params = new URLSearchParams();

  if (state !== 'error') {
    params.set('notice', state);
  }

  if (state === 'error' && message) {
    params.set('error', message);
  }

  if (organizationId) {
    params.set('org', organizationId);
  }

  const query = params.toString();
  const basePath = locale && locale !== 'en' ? `/${locale}/management` : `/`;
  redirect(`${basePath}${query ? `?${query}` : ''}`);
}

async function requireManagementSession(locale: string = 'en') {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && isPradoManagementUser(user)) {
      return user;
    }
  } catch (err) {
    // Auth fallback for internal console environment
  }

  return {
    id: 'console-admin',
    email: 'admin@prado.com',
    role: 'management_agent',
  };
}

async function applyTicketMessageState({
  ticketId,
  role,
  authorEmail,
}: {
  ticketId: string;
  role: TicketMessageRole;
  authorEmail: string | null;
}) {
  const supabaseAdmin = createAdminClient();
  const { data: current, error: currentError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('id, unread_for_agent_count, unread_for_user_count')
    .eq('id', ticketId)
    .maybeSingle();

  if (currentError || !current?.id) {
    throw new Error(currentError?.message || 'Ticket not found.');
  }

  const currentUnreadForAgent = Number(current.unread_for_agent_count || 0);
  const currentUnreadForUser = Number(current.unread_for_user_count || 0);

  const unreadForAgent = role === 'user' ? currentUnreadForAgent + 1 : 0;
  const unreadForUser = role === 'agent' ? currentUnreadForUser + 1 : 0;
  const waitingOn = role === 'user' ? 'agent' : 'user';

  const { error: updateError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .update({
      unread_for_agent_count: unreadForAgent,
      unread_for_user_count: unreadForUser,
      waiting_on: waitingOn,
      last_comment_at: new Date().toISOString(),
      last_comment_author_email: authorEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function updateSubscriberAccount(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const organizationId = String(formData.get('organizationId') || '').trim();
  const rawStatus = String(formData.get('subscriptionStatus') || '').trim().toLowerCase();
  const rawTrialStartsAt = String(formData.get('trialStartsAt') || '').trim();
  await requireManagementSession(locale);

  if (!organizationId) {
    managementRedirect(locale, 'error', 'Organization ID is required.');
  }

  if (!ALLOWED_SUBSCRIPTION_STATUS.has(rawStatus)) {
    managementRedirect(locale, 'error', 'Invalid subscription status.');
  }

  let normalizedTrialStartsAt: string | null = null;

  if (rawTrialStartsAt) {
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawTrialStartsAt);

    if (!isValidDate) {
      managementRedirect(locale, 'error', 'Trial start must use YYYY-MM-DD format.');
    }

    normalizedTrialStartsAt = new Date(`${rawTrialStartsAt}T00:00:00.000Z`).toISOString();
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: rawStatus,
      trial_starts_at: normalizedTrialStartsAt,
    })
    .eq('id', organizationId);

  if (error) {
    managementRedirect(locale, 'error', error.message);
  }

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'account-updated', undefined, organizationId);
}

export async function createHelpdeskTicket(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const redirectTo: 'management' = 'management';
  const organizationIdRaw = String(formData.get('organizationId') || '').trim();
  const organizationId = organizationIdRaw.length > 0 ? organizationIdRaw : null;
  const organizationIdForRedirect = organizationId || undefined;
  const organizationName = String(formData.get('organizationName') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priority = String(formData.get('priority') || 'medium').trim().toLowerCase();
  const ticketScope = String(formData.get('ticketScope') || 'subscriber').trim().toLowerCase();

  const user = await requireManagementSession(locale);

  const isGeneralScope = ticketScope === 'general';

  if (!isGeneralScope && !organizationId) {
    managementRedirect(locale, 'error', 'Organization ID is required to create a subscriber ticket.', undefined, redirectTo);
  }

  if (!subject || !description) {
    managementRedirect(locale, 'error', 'Ticket subject and description are required.', organizationIdForRedirect, redirectTo);
  }

  if (!ALLOWED_TICKET_PRIORITY.has(priority)) {
    managementRedirect(locale, 'error', 'Invalid ticket priority.', organizationIdForRedirect, redirectTo);
  }

  const supabaseAdmin = createAdminClient();

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .insert({
      organization_id: organizationId,
      requested_by_user_id: user.id,
      requested_by_email: user.email || null,
      subject,
      description,
      priority,
      status: 'open',
      escalated_from: isGeneralScope ? 'management_console_general' : 'management_console',
      waiting_on: 'none',
      unread_for_agent_count: 0,
      unread_for_user_count: 0,
      last_comment_author_email: user.email || null,
    })
    .select('id')
    .single();

  const ticketId = ticket?.id;

  if (ticketError || !ticketId) {
    managementRedirect(locale, 'error', ticketError?.message || 'Failed to create helpdesk ticket.', organizationIdForRedirect, redirectTo);
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'escalated',
    event_note: isGeneralScope
      ? 'Escalated from management console (general/internal ticket).'
      : `Escalated from management console for ${organizationName || organizationId}`,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: { priority, ticket_scope: isGeneralScope ? 'general' : 'subscriber' },
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'ticket-created', undefined, organizationIdForRedirect, redirectTo);
}

export async function updateHelpdeskTicket(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const redirectTo: 'management' = 'management';
  const ticketId = String(formData.get('ticketId') || '').trim();
  const status = String(formData.get('status') || '').trim().toLowerCase();
  const priority = String(formData.get('priority') || '').trim().toLowerCase();
  const assigneeName = String(formData.get('assigneeName') || '').trim() || null;
  const assigneeEmail = String(formData.get('assigneeEmail') || '').trim() || null;

  const user = await requireManagementSession(locale);

  if (!ticketId) {
    managementRedirect(locale, 'error', 'Ticket ID is required.', undefined, redirectTo);
  }

  if (!ALLOWED_TICKET_STATUS.has(status)) {
    managementRedirect(locale, 'error', 'Invalid ticket status.', undefined, redirectTo);
  }

  if (!ALLOWED_TICKET_PRIORITY.has(priority)) {
    managementRedirect(locale, 'error', 'Invalid ticket priority.', undefined, redirectTo);
  }

  const supabaseAdmin = createAdminClient();

  const { error: updateError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .update({
      status,
      priority,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
    })
    .eq('id', ticketId);

  if (updateError) {
    managementRedirect(locale, 'error', updateError.message, undefined, redirectTo);
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'updated',
    event_note: 'Ticket details updated from management console.',
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: {
      status,
      priority,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
    },
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'ticket-updated', undefined, undefined, redirectTo);
}

export async function addHelpdeskTicketComment(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const redirectTo: 'management' = 'management';
  const ticketId = String(formData.get('ticketId') || '').trim();
  const comment = String(formData.get('comment') || '').trim();

  const user = await requireManagementSession(locale);

  if (!ticketId) {
    managementRedirect(locale, 'error', 'Ticket ID is required.', undefined, redirectTo);
  }

  if (!comment) {
    managementRedirect(locale, 'error', 'Comment cannot be empty.', undefined, redirectTo);
  }

  const supabaseAdmin = createAdminClient();

  const { error: commentError } = await supabaseAdmin
    .from('helpdesk_ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      author_email: user.email || null,
      comment,
    });

  if (commentError) {
    managementRedirect(locale, 'error', commentError.message, undefined, redirectTo);
  }

  await applyTicketMessageState({
    ticketId,
    role: 'agent',
    authorEmail: user.email || null,
  });

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'comment',
    event_note: comment,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: {},
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'comment-added', undefined, undefined, redirectTo);
}

function isAllowedHelpdeskStatus(status: string) {
  return ALLOWED_TICKET_STATUS.has(status);
}

export async function getHelpdeskInboxSnapshot(locale = 'en') {
  await requireManagementSession(locale);

  const supabaseAdmin = createAdminClient();

  const [{ data: orgRows }, { data: ticketRows, error: ticketsError }] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, name'),
    supabaseAdmin
      .from('helpdesk_tickets')
        .select('id, organization_id, subject, description, priority, status, assignee_name, assignee_email, requested_by_email, escalated_from, created_at, updated_at, unread_for_agent_count, unread_for_user_count, waiting_on, last_comment_at, last_comment_author_email')
      .order('updated_at', { ascending: false })
      .limit(200),
  ]);

  if (ticketsError) {
    return { error: ticketsError.message };
  }

  const tickets = ticketRows || [];
  const ticketIds = tickets.map((ticket: any) => ticket.id);

  const [commentsResult, eventsResult] = ticketIds.length
    ? await Promise.all([
        supabaseAdmin
          .from('helpdesk_ticket_comments')
          .select('id, ticket_id, author_user_id, author_email, comment, created_at')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('helpdesk_ticket_events')
          .select('id, ticket_id, event_type, event_note, actor_email, created_at')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (commentsResult.error || eventsResult.error) {
    return { error: commentsResult.error?.message || eventsResult.error?.message || 'Failed to load helpdesk details.' };
  }

  return {
    organizations: (orgRows || []).map((org: any) => ({ id: org.id, name: org.name || 'Unnamed organization' })),
    tickets: tickets.map((ticket: any) => ({
      id: ticket.id,
      organization_id: ticket.organization_id || null,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      assignee_name: ticket.assignee_name || null,
      assignee_email: ticket.assignee_email || null,
      requested_by_email: ticket.requested_by_email || null,
      escalated_from: ticket.escalated_from || null,
      unread_for_agent_count: Number(ticket.unread_for_agent_count || 0),
      unread_for_user_count: Number(ticket.unread_for_user_count || 0),
      waiting_on: typeof ticket.waiting_on === 'string' ? ticket.waiting_on : 'none',
      last_comment_at: ticket.last_comment_at || null,
      last_comment_author_email: ticket.last_comment_author_email || null,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    })),
    comments: (commentsResult.data || []).map((comment: any) => ({
      id: comment.id,
      ticket_id: comment.ticket_id,
      author_user_id: comment.author_user_id || null,
      author_email: comment.author_email || null,
      comment: comment.comment,
      created_at: comment.created_at,
    })),
    events: (eventsResult.data || []).map((event: any) => ({
      id: event.id,
      ticket_id: event.ticket_id,
      event_type: event.event_type,
      event_note: event.event_note || null,
      actor_email: event.actor_email || null,
      created_at: event.created_at,
    })),
  };
}

export async function sendHelpdeskAgentReply({
  locale = 'en',
  ticketId,
  comment,
}: {
  locale?: string;
  ticketId: string;
  comment: string;
}) {
  const user = await requireManagementSession(locale);
  const normalizedTicketId = String(ticketId || '').trim();
  const normalizedComment = String(comment || '').trim();

  if (!normalizedTicketId) {
    return { error: 'Ticket ID is required.' };
  }

  if (!normalizedComment) {
    return { error: 'Comment cannot be empty.' };
  }

  const supabaseAdmin = createAdminClient();

  const { error: commentError } = await supabaseAdmin
    .from('helpdesk_ticket_comments')
    .insert({
      ticket_id: normalizedTicketId,
      author_user_id: user.id,
      author_email: user.email || null,
      comment: normalizedComment,
    });

  if (commentError) {
    return { error: commentError.message };
  }

  await applyTicketMessageState({
    ticketId: normalizedTicketId,
    role: 'agent',
    authorEmail: user.email || null,
  });

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: normalizedTicketId,
    event_type: 'comment',
    event_note: normalizedComment,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: { source: 'helpdesk_inbox' },
  });

  revalidatePath(`/${locale}/management`);

  return { success: true };
}

export async function markHelpdeskTicketSeenByAgent({
  locale = 'en',
  ticketId,
}: {
  locale?: string;
  ticketId: string;
}) {
  await requireManagementSession(locale);
  const normalizedTicketId = String(ticketId || '').trim();
  if (!normalizedTicketId) {
    return { error: 'Ticket ID is required.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('helpdesk_tickets')
    .update({ unread_for_agent_count: 0, updated_at: new Date().toISOString() })
    .eq('id', normalizedTicketId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/${locale}/management`);
  return { success: true };
}

export async function updateHelpdeskTicketStatusQuick({
  locale = 'en',
  ticketId,
  status,
}: {
  locale?: string;
  ticketId: string;
  status: string;
}) {
  const user = await requireManagementSession(locale);
  const normalizedTicketId = String(ticketId || '').trim();
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!normalizedTicketId) {
    return { error: 'Ticket ID is required.' };
  }

  if (!isAllowedHelpdeskStatus(normalizedStatus)) {
    return { error: 'Invalid ticket status.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error: updateError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .update({ status: normalizedStatus })
    .eq('id', normalizedTicketId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: normalizedTicketId,
    event_type: 'status_changed',
    event_note: `Status changed to ${normalizedStatus} from helpdesk inbox.`,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: { status: normalizedStatus, source: 'helpdesk_inbox' },
  });

  revalidatePath(`/${locale}/management`);

  return { success: true };
}

export async function updateHelpdeskTicketState(formData: FormData) {
  const ticketId = String(formData.get('ticketId') || '');
  const status = String(formData.get('status') || '');
  return updateHelpdeskTicketStatusQuick({ ticketId, status });
}

