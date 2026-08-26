'use client';

import React, { useState } from 'react';
import { X, Ticket, AlertCircle, Check } from 'lucide-react';
import { createHelpdeskTicket } from '@/app/management/actions';

interface GeneralInternalTicketModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  locale?: string;
  createTicketAction?: (formData: FormData) => Promise<void>;
}

export default function GeneralInternalTicketModal({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  locale = 'en',
  createTicketAction,
}: GeneralInternalTicketModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [requestedBy, setRequestedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    if (externalOnClose) externalOnClose();
    else setInternalIsOpen(false);
  };

  const handleOpen = () => {
    setInternalIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('priority', priority);
      formData.append('requested_by_email', requestedBy || 'admin@prado.com');

      await createHelpdeskTicket(formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    if (isControlled) return null;
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition"
      >
        Create System Notice / Ticket
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Create Internal Ticket / System Notice</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Ticket Created Successfully</h4>
            <p className="text-xs text-slate-500">The new support ticket has been added to the Helpdesk Inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Issue Title *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Commerce API latency issue or User plan upgrade request"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested By (Email)</label>
                <input
                  type="email"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="admin@prado.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Details</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the issue or subscriber request..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
