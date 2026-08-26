'use client';

import React, { useState, useActionState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { loginConsoleUser } from '@/app/actions/auth-actions';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [state, formAction, isPending] = useActionState(loginConsoleUser, null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/50 to-blue-50/40 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Glows matching logo colors */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphism White Card */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-blue-950/10 relative z-10 space-y-6">
        
        {/* Logo Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <Image
              src="/logo.jpg"
              alt="Prado Logo"
              width={64}
              height={64}
              className="h-16 w-16 object-contain rounded-xl"
              priority
            />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Prado Management Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to manage subscribers, lifecycle status & helpdesk queue.
            </p>
          </div>
        </div>



        {/* Error Feedback */}
        {state?.error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in zoom-in-95">
            <span className="font-semibold block">Authentication Error:</span>
            <span>{state.error}</span>
          </div>
        )}

        {/* Login Form */}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Console Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/60 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 via-sky-600 to-blue-700 hover:from-teal-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-600/20 hover:shadow-sky-600/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Sign In to Console
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
