'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriberRecord } from '@/app/actions/get-subscribers';
import { updateUserPlan } from '@/app/actions/update-user-plan';
import { X, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: SubscriberRecord | null;
  onPlanUpdated?: (newPlan: string) => void;
}

const JOBS_PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial', desc: 'Free evaluation tier' },
  { value: 'individual', label: 'Individual', desc: 'Single operator account' },
  { value: 'growth', label: 'Growth', desc: 'Expanding team tier' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Full custom organization tier' },
  { value: 'past_due', label: 'Past Due', desc: 'Payment retry pending' },
  { value: 'cancelled', label: 'Cancelled', desc: 'Inactive / churned' },
];

const FLEET_ROLE_OPTIONS = [
  { value: 'DRIVER', label: 'Driver', desc: 'Mobile route execution access' },
  { value: 'DISPATCHER', label: 'Dispatcher', desc: 'Dispatch & routing operations' },
  { value: 'MANAGER', label: 'Manager', desc: 'Fleet manager administrative controls' },
  { value: 'ADMIN', label: 'Admin', desc: 'Full organization administrator' },
];

const COMMERCE_PLAN_OPTIONS = [
  { value: 'STARTER', label: 'Starter', desc: 'Entry-level merchant catalog' },
  { value: 'STANDARD', label: 'Standard', desc: 'Standard merchant features' },
  { value: 'PRO', label: 'Pro', desc: 'Advanced analytics & multi-store' },
  { value: 'ENTERPRISE', label: 'Enterprise', desc: 'Custom enterprise volume tier' },
];

const ERP_PLAN_OPTIONS = [
  { value: 'standard', label: 'Standard', desc: 'Standard business tier' },
  { value: 'empresarial', label: 'Empresarial', desc: 'Enterprise business tier' },
  { value: 'pro', label: 'Pro', desc: 'Professional ERP tier' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Full administrative role' },
];

export default function ChangePlanModal({
  isOpen,
  onClose,
  subscriber,
  onPlanUpdated,
}: ChangePlanModalProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (subscriber) {
      setSelectedPlan(subscriber.plan || '');
      setError(null);
      setSuccessMsg(null);
    }
  }, [subscriber]);

  if (!isOpen || !subscriber) return null;

  const planOptions =
    subscriber.app === 'Jobs'
      ? JOBS_PLAN_OPTIONS
      : subscriber.app === 'Fleet'
      ? FLEET_ROLE_OPTIONS
      : subscriber.app === 'Commerce'
      ? COMMERCE_PLAN_OPTIONS
      : ERP_PLAN_OPTIONS;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateUserPlan({
      userId: subscriber.id,
      app: subscriber.app,
      newPlan: selectedPlan,
      orgId: subscriber.orgId,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to update user plan.');
    } else {
      setSuccessMsg(res.message || 'Plan updated successfully!');
      if (onPlanUpdated) {
        onPlanUpdated(selectedPlan);
      }
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                subscriber.app === 'Jobs'
                  ? 'bg-emerald-100 text-emerald-700'
                  : subscriber.app === 'Fleet'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-cyan-100 text-cyan-800'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Change Account Plan</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target: {subscriber.app} App • ID: {subscriber.id.substring(0, 18)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* User Meta Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Subscriber Name:</span>
              <span className="font-medium text-slate-900">{subscriber.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email Address:</span>
              <span className="font-medium text-slate-900">{subscriber.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Plan / Role:</span>
              <span className="font-semibold text-slate-800 uppercase bg-slate-200/70 px-2 py-0.5 rounded">
                {subscriber.plan || 'None'}
              </span>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Select Options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Select New {subscriber.app === 'Fleet' ? 'Role' : 'Plan'} Tier
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
              {planOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    selectedPlan === opt.value
                      ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="planOption"
                    value={opt.value}
                    checked={selectedPlan === opt.value}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedPlan === subscriber.plan}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? 'Updating...' : 'Save Plan Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
