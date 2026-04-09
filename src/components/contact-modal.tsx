'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleClose = () => {
    if (status !== 'submitting') {
      setStatus('idle');
      setErrorMsg('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-2xl font-black text-slate-900">Contact Support</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <p className="px-6 pt-2 text-sm text-slate-500 font-medium">
          Have a question or need help? Send us a message and we&apos;ll get back to you.
        </p>

        {status === 'success' ? (
          <div className="p-6 pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Message Sent!</h3>
            <p className="text-slate-500 font-medium mb-6">
              Thank you for reaching out. We&apos;ll get back to you as soon as possible.
            </p>
            <Button onClick={handleClose} className="rounded-2xl px-8 font-bold bg-[#1E3A5F] hover:bg-[#0F172A]">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-bold text-slate-700 mb-1.5">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099CA] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-sm font-bold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099CA] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="contact-subject" className="block text-sm font-bold text-slate-700 mb-1.5">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099CA] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-sm font-bold text-slate-700 mb-1.5">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099CA] focus:border-transparent transition-all resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
                <p className="text-sm font-medium text-[#DC2626]">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full h-12 rounded-2xl font-bold text-base bg-[#DC2626] hover:bg-[#991B1B] disabled:opacity-50 shadow-lg shadow-red-200 transition-all"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
