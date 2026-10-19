'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  ShieldAlert,
  Send,
  Filter,
  UserCheck,
  RefreshCw,
  Sparkles,
  Search,
  Check,
  CornerDownLeft,
} from 'lucide-react';
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

interface PresetMessage {
  id: string;
  category: 'greetings' | 'in_progress' | 'resolution' | 'closure';
  categoryLabel: string;
  title: string;
  text: string;
}

const PRESET_MESSAGES: PresetMessage[] = [
  // Greetings / Saludos
  {
    id: 'greet-standard',
    category: 'greetings',
    categoryLabel: 'Saludo',
    title: 'Saludo formal',
    text: 'Hola, gracias por comunicarte con el equipo de soporte de Prado Systems. ¿En qué podemos ayudarte hoy?',
  },
  {
    id: 'greet-personal',
    category: 'greetings',
    categoryLabel: 'Saludo',
    title: 'Presentación agente',
    text: 'Hola, mi nombre es Carlos del equipo de soporte. ¿Cómo te puedo ayudar?',
  },
  {
    id: 'greet-welcome',
    category: 'greetings',
    categoryLabel: 'Saludo',
    title: 'Bienvenida',
    text: '¡Hola! Bienvenido a Prado Systems. Estamos atentos a tus consultas para brindarte la mejor asistencia.',
  },

  // In-progress & Follow-up / Seguimiento
  {
    id: 'prog-review',
    category: 'in_progress',
    categoryLabel: 'Seguimiento',
    title: 'En revisión',
    text: 'Estamos revisando tu caso en este momento. Te daremos una actualización en unos minutos, por favor permanece en línea.',
  },
  {
    id: 'prog-screenshot',
    category: 'in_progress',
    categoryLabel: 'Seguimiento',
    title: 'Solicitar captura',
    text: '¿Podrías por favor compartirnos una captura de pantalla o más detalles del mensaje que visualizas en pantalla?',
  },
  {
    id: 'prog-db-check',
    category: 'in_progress',
    categoryLabel: 'Seguimiento',
    title: 'Verificando en sistema',
    text: 'Estamos consultando los registros en la base de datos de Prado para verificar tu configuración. Danos un momento por favor.',
  },
  {
    id: 'prog-escalate',
    category: 'in_progress',
    categoryLabel: 'Seguimiento',
    title: 'Escalamiento técnico',
    text: 'Hemos derivado tu consulta a nuestro equipo técnico especializado. Te contactaremos por este medio en cuanto tengamos novedades.',
  },

  // Resolution / Solución
  {
    id: 'res-fixed',
    category: 'resolution',
    categoryLabel: 'Solución',
    title: 'Problema solucionado',
    text: 'El inconveniente ha sido resuelto exitosamente. ¿Podrías confirmar si ya puedes ingresar y operar con normalidad?',
  },
  {
    id: 'res-plan-applied',
    category: 'resolution',
    categoryLabel: 'Solución',
    title: 'Cambio de plan aplicado',
    text: 'Hemos aplicado los cambios a tu suscripción y plan en Prado Systems. Por favor refresca tu sesión para verificarlo.',
  },
  {
    id: 'res-cache',
    category: 'resolution',
    categoryLabel: 'Solución',
    title: 'Recargar sesión / caché',
    text: 'Por favor intenta recargar la página (Ctrl + F5 o Cmd + Shift + R) o cerrar y volver a iniciar sesión para actualizar los cambios.',
  },

  // Closure / Cierre
  {
    id: 'close-goodbye',
    category: 'closure',
    categoryLabel: 'Cierre',
    title: 'Cierre cordial',
    text: 'Nos alegra haberte ayudado. Damos por concluido este ticket de soporte. ¡Que tengas un excelente día!',
  },
  {
    id: 'close-anything-else',
    category: 'closure',
    categoryLabel: 'Cierre',
    title: '¿Algo adicional?',
    text: '¿Hay alguna otra consulta o requerimiento en el que te podamos colaborar antes de cerrar este ticket?',
  },
  {
    id: 'close-feedback',
    category: 'closure',
    categoryLabel: 'Cierre',
    title: 'Agradecimiento final',
    text: 'Gracias por comunicarte con Prado Systems. Estamos a tu disposición siempre que lo necesites. ¡Hasta pronto!',
  },
];

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

  // Presets state
  const [presetCategory, setPresetCategory] = useState<string>('all');
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

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

  // Filter presets
  const filteredPresets = PRESET_MESSAGES.filter((p) => {
    const matchesCategory = presetCategory === 'all' || p.category === presetCategory;
    const matchesSearch =
      !presetSearch.trim() ||
      p.title.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.text.toLowerCase().includes(presetSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const submitCommentText = async (textToSend: string) => {
    if (!activeTicket || !textToSend.trim() || isSubmitting) return;

    const messageText = textToSend.trim();
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCommentText(newComment);
  };

  const handleInsertPreset = (preset: PresetMessage) => {
    setNewComment((prev) => (prev.trim() ? `${prev.trim()}\n${preset.text}` : preset.text));
    setLastInsertedId(preset.id);
    setTimeout(() => {
      setLastInsertedId((curr) => (curr === preset.id ? null : curr));
    }, 1800);
    commentInputRef.current?.focus();
  };

  const handleSendPresetDirectly = async (preset: PresetMessage) => {
    if (!activeTicket) {
      alert('Por favor selecciona un ticket primero.');
      return;
    }
    await submitCommentText(preset.text);
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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[520px]">
      {/* Sidebar List - Tickets */}
      <div className="w-full md:w-64 lg:w-72 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
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
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[150px]">
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

      {/* Presets / Quick Replies Column */}
      <div className="w-full md:w-64 lg:w-72 border-r border-slate-200 flex flex-col bg-slate-50/40 shrink-0">
        <div className="p-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-800">Presets</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                {filteredPresets.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Clic para insertar</span>
          </div>

          {/* Search Presets */}
          <div className="relative mb-2">
            <Search className="h-3 w-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              placeholder="Buscar preset..."
              className="w-full text-xs pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'greetings', label: 'Saludos' },
              { id: 'in_progress', label: 'Seguimiento' },
              { id: 'resolution', label: 'Solución' },
              { id: 'closure', label: 'Cierre' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setPresetCategory(cat.id)}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition cursor-pointer ${
                  presetCategory === cat.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Presets List */}
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[550px] flex-1 p-2 space-y-2">
          {filteredPresets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay respuestas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isRecentlyInserted = lastInsertedId === preset.id;

              const badgeStyle =
                preset.category === 'greetings'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : preset.category === 'in_progress'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : preset.category === 'resolution'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              return (
                <div
                  key={preset.id}
                  className={`group relative p-2.5 rounded-lg border transition bg-white shadow-xs hover:border-slate-300 hover:shadow-sm flex flex-col gap-1.5 ${
                    isRecentlyInserted ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-900 group-hover:text-sky-700 transition">
                      {preset.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${badgeStyle}`}>
                      {preset.categoryLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {preset.text}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-0.5">
                    <button
                      type="button"
                      onClick={() => handleInsertPreset(preset)}
                      className={`text-[10px] font-medium flex items-center gap-1 transition cursor-pointer px-1.5 py-0.5 rounded ${
                        isRecentlyInserted
                          ? 'text-emerald-700 bg-emerald-50 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Insertar en la caja de texto"
                    >
                      {isRecentlyInserted ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>¡Insertado!</span>
                        </>
                      ) : (
                        <>
                          <CornerDownLeft className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                          <span>Insertar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendPresetDirectly(preset)}
                      disabled={isSubmitting || !activeTicket}
                      className="text-[10px] font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-1.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title="Enviar directamente al cliente"
                    >
                      <Send className="h-2.5 w-2.5" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Details & Chat Panel */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
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
                ref={commentInputRef}
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

