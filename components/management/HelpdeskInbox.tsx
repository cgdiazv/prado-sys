'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, AlertCircle, Clock, CheckCircle, ShieldAlert, Send, Filter, UserCheck, RefreshCw } from 'lucide-react';
import { addHelpdeskTicketComment, updateHelpdeskTicketState, getHelpdeskInboxSnapshot } from '@/app/management/actions';

export interface HelpdeskTicket {
  id: string;
  organization_id?: string | null;
  subject: string;
  description?: string | null;
  priority: string;
  status: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  requested_by_email?: string | null;
  escalated_from?: string | null;
  unread_for_agent_count?: number | null;
  unread_for_user_count?: number | null;
  waiting_on?: string | null;
  last_comment_at?: string | null;
  last_comment_author_email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_user_id?: string | null;
  author_email?: string | null;
  comment: string;
  created_at?: string | null;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  event_note?: string | null;
  actor_email?: string | null;
  created_at?: string | null;
}

interface HelpdeskInboxProps {
  tickets?: HelpdeskTicket[];
  comments?: TicketComment[];
  events?: TicketEvent[];
  initialData?: {
    organizations?: { id: string; name: string }[];
    tickets?: HelpdeskTicket[];
    comments?: TicketComment[];
    events?: TicketEvent[];
  };
  locale?: string;
}

export default function HelpdeskInbox({ tickets: directTickets, comments: directComments, events: directEvents, initialData }: HelpdeskInboxProps) {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(directTickets || initialData?.tickets || []);
  const [comments, setComments] = useState<TicketComment[]>(directComments || initialData?.comments || []);
  const [events, setEvents] = useState<TicketEvent[]>(directEvents || initialData?.events || []);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    (directTickets || initialData?.tickets || [])[0]?.id || null
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Sync with prop updates if server re-renders
  useEffect(() => {
    if (directTickets && directTickets.length > 0) setTickets(directTickets);
  }, [directTickets]);

  useEffect(() => {
    if (directComments && directComments.length > 0) setComments(directComments);
  }, [directComments]);

  useEffect(() => {
    if (directEvents && directEvents.length > 0) setEvents(directEvents);
  }, [directEvents]);

  // If no ticket selected yet, select first available
  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  // Periodic fast auto-refresh (every 2.5s) to guarantee real-time arrival of customer chats from prado-erp
  useEffect(() => {
    let isMounted = true;
    let inProgress = false;

    const syncInbox = async () => {
      if (inProgress || (typeof document !== 'undefined' && document.hidden)) return;
      inProgress = true;
      try {
        const snapshot = await getHelpdeskInboxSnapshot('en');
        if (isMounted && snapshot && !('error' in snapshot)) {
          if (Array.isArray(snapshot.tickets)) {
            setTickets(snapshot.tickets as any);
          }
          if (Array.isArray(snapshot.comments)) {
            setComments(snapshot.comments as any);
          }
          if (Array.isArray(snapshot.events)) {
            setEvents(snapshot.events as any);
          }
        }
      } catch (err) {
        // silent sync error
      } finally {
        inProgress = false;
      }
    };

    const intervalId = setInterval(syncInbox, 2500);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return (t.status || 'open').toLowerCase() === statusFilter.toLowerCase();
  });

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || filteredTickets[0];
  const activeComments = activeTicket ? comments.filter((c) => c.ticket_id === activeTicket.id) : [];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeComments.length, selectedTicketId]);

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    try {
      const snapshot = await getHelpdeskInboxSnapshot('en');
      if (snapshot && !('error' in snapshot)) {
        if (Array.isArray(snapshot.tickets)) setTickets(snapshot.tickets as any);
        if (Array.isArray(snapshot.comments)) setComments(snapshot.comments as any);
        if (Array.isArray(snapshot.events)) setEvents(snapshot.events as any);
      }
    } catch (err) {
      console.error('Manual refresh failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newComment.trim() || isSubmitting) return;

    const messageText = newComment.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: TicketComment = {
      id: tempId,
      ticket_id: activeTicket.id,
      author_email: 'support@pradojob.com',
      comment: messageText,
      created_at: new Date().toISOString(),
    };

    // Optimistically add comment to UI immediately (zero latency)
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('ticketId', activeTicket.id);
      formData.append('comment', messageText);
      formData.append('role', 'agent');

      const result = await addHelpdeskTicketComment(formData);
      if (result && 'error' in result && result.error) {
        // Rollback on error
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setNewComment(messageText);
        alert(`Error al enviar mensaje: ${result.error}`);
      } else if (result && result.comment) {
        // Replace temp comment with confirmed db comment
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? (result.comment as any) : c))
        );
      }
    } catch (err) {
      console.error('Failed to add comment', err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setNewComment(messageText);
      alert('Error al enviar mensaje. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === activeTicket.id ? { ...t, status: newStatus } : t))
    );
    try {
      const formData = new FormData();
      formData.append('ticketId', activeTicket.id);
      formData.append('status', newStatus);
      await updateHelpdeskTicketState(formData);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Tickets</span>
            <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">
              {tickets.length}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleManualRefresh}
              title="Actualizar chats"
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
            </button>
            <Filter className="h-3.5 w-3.5 text-slate-400 ml-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 overflow-y-auto max-h-[550px] flex-1">
          {filteredTickets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No tickets found for status "{statusFilter}".
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = ticket.id === activeTicket?.id;
              const unreadCount = Number(ticket.unread_for_agent_count || 0);

              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 ${
                    isSelected ? 'bg-sky-50/80 border-l-4 border-sky-600' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[170px]">
                      {ticket.subject}
                    </span>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-sky-600 text-white animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          ticket.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : ticket.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    {ticket.requested_by_email || 'System user'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                    {ticket.last_comment_at ? (
                      <span>{new Date(ticket.last_comment_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    ) : ticket.created_at ? (
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Details & Chat Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {activeTicket ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requested by: <span className="font-mono text-slate-700">{activeTicket.requested_by_email || 'N/A'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Status:</label>
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Description & Comment Stream */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[420px]">
              {activeTicket.description && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                  <span className="font-semibold block text-slate-900 mb-1">Issue Description:</span>
                  {activeTicket.description}
                </div>
              )}

              <div className="space-y-3">
                {activeComments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No comments yet on this ticket.</p>
                ) : (
                  activeComments.map((c) => {
                    const isAgent =
                      c.author_email?.includes('agent') ||
                      c.author_email?.includes('prado') ||
                      c.author_email === 'support@pradojob.com';

                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border text-xs ${
                          isAgent
                            ? 'bg-sky-50 border-sky-200 text-sky-950 ml-6'
                            : 'bg-white border-slate-200 text-slate-800 mr-6'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">
                            {isAgent ? 'Support Agent' : c.author_email || 'User'}
                          </span>
                          {c.created_at && (
                            <span>{new Date(c.created_at).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {/* Response Input */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe tu respuesta o comentario..."
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="px-3 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? 'Enviando...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="h-8 w-8 mb-2 stroke-1" />
            <p className="text-xs">No active helpdesk ticket selected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
