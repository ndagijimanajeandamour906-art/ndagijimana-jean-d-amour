import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  AlertTriangle,
  X,
  Flag,
  ShieldCheck,
  CheckCircle2,
  Send,
  MessageSquare,
  User,
  Radio,
  FileText,
} from 'lucide-react';
import { ReportTicket } from '../../types';

export const ReportModal: React.FC = () => {
  const {
    reportModalOpen,
    setReportModalOpen,
    reportingTarget,
    submitReport,
  } = useTolkflow();

  const [category, setCategory] = useState<ReportTicket['category']>('spam');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!reportModalOpen) return null;

  const targetName = reportingTarget?.name || 'Content / User';
  const targetType = reportingTarget?.type || 'post';

  const categoryOptions: { id: ReportTicket['category']; label: string; desc: string }[] = [
    {
      id: 'spam',
      label: 'Spam or Automated Bot',
      desc: 'Unsolicited promotional messages, bulk broadcasts, or bot behavior',
    },
    {
      id: 'harassment',
      label: 'Harassment or Hate Speech',
      desc: 'Bullying, targeted abuse, aggressive behavior, or threats',
    },
    {
      id: 'misinformation',
      label: 'Misinformation & Fraud',
      desc: 'Deceptive financial schemes, scams, or false claims',
    },
    {
      id: 'inappropriate_media',
      label: 'Inappropriate or Illegal Media',
      desc: 'Explicit imagery, violent content, or copyright infringement',
    },
    {
      id: 'security_breach',
      label: 'Security or Impersonation',
      desc: 'Posing as an administrator or attempting unauthorized access',
    },
    {
      id: 'other',
      label: 'Other Concern',
      desc: 'Translation inaccuracies, privacy concern, or general violation',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    await submitReport({
      targetType,
      targetId: reportingTarget?.id || `target_${Date.now()}`,
      targetName,
      reason,
      category,
      details,
    });
    setSubmitting(false);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setReason('');
      setDetails('');
      setReportModalOpen(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B132B] border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#070D1E]/80">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Flag className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Report & Support Center
              </h2>
              <p className="text-xs text-slate-400">
                Help keep the TOLKFLOW ecosystem safe and respectful
              </p>
            </div>
          </div>
          <button
            onClick={() => setReportModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-scale-up">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Report Successfully Submitted</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Your ticket has been logged and forwarded directly to the Project Owner Control Center for review. Thank you for protecting our community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Target Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                {targetType === 'user' && <User className="w-4 h-4" />}
                {targetType === 'post' && <FileText className="w-4 h-4" />}
                {targetType === 'message' && <MessageSquare className="w-4 h-4" />}
                {targetType === 'room' && <Radio className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Target of Report ({targetType})
                </span>
                <p className="text-sm font-semibold text-white truncate">{targetName}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/30">
                PENDING REVIEW
              </span>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Select Violation Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      category === opt.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Reason Summary <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="E.g. Sending automated phishing links in live room"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Additional Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Additional Context & Evidence (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Describe what occurred, message timestamps, or affected users..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting Ticket...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
