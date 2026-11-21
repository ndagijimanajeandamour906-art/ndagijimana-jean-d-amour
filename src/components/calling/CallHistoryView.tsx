import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Clock,
  ShieldCheck,
  Radio,
  Sparkles,
} from 'lucide-react';

export const CallHistoryView: React.FC = () => {
  const { callRecords, startCall } = useTolkflow();
  const [filter, setFilter] = useState<'all' | 'missed' | 'video' | 'voice'>('all');
  const [search, setSearch] = useState('');
  const [apiRecords, setApiRecords] = useState<any[]>([]);

  // Fetch persisted call logs from backend
  useEffect(() => {
    fetch('/api/calls/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.calls && Array.isArray(data.calls)) {
          setApiRecords(data.calls);
        }
      })
      .catch(() => {});
  }, []);

  // Merge state records and api records
  const allMergedRecords = [...callRecords];
  apiRecords.forEach((apiRec) => {
    if (!allMergedRecords.some((r) => r.id === apiRec.id)) {
      allMergedRecords.push({
        id: apiRec.id,
        type: apiRec.type || 'voice',
        direction: apiRec.direction || 'outgoing',
        contact: {
          id: apiRec.recipientId || 'contact',
          name: apiRec.recipientName || 'Contact',
          username: apiRec.recipientId?.replace('user_', '') || 'contact',
          avatar: apiRec.recipientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          email: '',
          phone: '',
          country: 'Global',
          preferredLanguage: 'en',
          status: 'online',
          role: 'user',
          interests: [],
          followersCount: 0,
          followingCount: 0,
          createdAt: '',
        },
        timestamp: apiRec.startedAt ? new Date(apiRec.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
        duration: apiRec.duration || '00:00',
      });
    }
  });

  const filtered = allMergedRecords.filter((rec) => {
    if (filter === 'missed' && rec.direction !== 'missed') return false;
    if (filter === 'video' && rec.type !== 'video') return false;
    if (filter === 'voice' && rec.type !== 'voice') return false;
    if (search.trim()) {
      return (
        rec.contact.name.toLowerCase().includes(search.toLowerCase()) ||
        rec.contact.username.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const totalCalls = allMergedRecords.length;
  const missedCount = allMergedRecords.filter((r) => r.direction === 'missed').length;
  const videoCount = allMergedRecords.filter((r) => r.type === 'video').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,102,255,0.2)]">
              <Phone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Communications & Call History
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logs of peer-to-peer WebRTC HD voice and video calls with real STUN negotiation and live translation.
          </p>
        </div>

        {/* Real-time calling metrics summary */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-semibold text-white">{totalCalls}</span>
            <span className="text-slate-400">Total</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-white">{videoCount}</span>
            <span className="text-slate-400">HD Video</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-2">
            <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-white">{missedCount}</span>
            <span className="text-slate-400">Missed</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search calls by contact name or handle..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-xs text-white placeholder-slate-400 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'All Calls' },
              { id: 'missed', label: 'Missed' },
              { id: 'video', label: 'Video HD' },
              { id: 'voice', label: 'Voice HD' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
                  filter === f.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(0,102,255,0.3)]'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Call records list */}
        <div className="space-y-2.5">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="p-4 rounded-2xl bg-[#0A1124] border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={record.contact.avatar}
                    alt={record.contact.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-700 group-hover:ring-cyan-400/60 transition-all"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
                      record.direction === 'missed'
                        ? 'bg-rose-500 text-white'
                        : record.direction === 'incoming'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {record.direction === 'missed' ? (
                      <PhoneMissed className="w-2.5 h-2.5" />
                    ) : record.direction === 'incoming' ? (
                      <PhoneIncoming className="w-2.5 h-2.5" />
                    ) : (
                      <PhoneOutgoing className="w-2.5 h-2.5" />
                    )}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white truncate">{record.contact.name}</h4>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      @{record.contact.username}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-mono">
                      {record.type === 'video' ? 'HD VIDEO' : 'HD VOICE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> {record.timestamp}
                    </span>
                    <span>•</span>
                    <span
                      className={`font-mono font-medium ${
                        record.direction === 'missed' ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {record.duration}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400/90 text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> WebRTC E2EE
                    </span>
                  </div>
                </div>
              </div>

              {/* Action: Call back */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall(record.contact, 'voice')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-all shadow-sm"
                  title="Make Real-Time Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(record.contact, 'video')}
                  className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(0,102,255,0.2)]"
                  title="Make Real-Time HD Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-slate-900/30 rounded-3xl border border-slate-800/60">
              <Phone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">No Call Records Found</h4>
              <p className="text-xs max-w-sm mx-auto">
                No past calls match this filter. Use the voice or video call button in any chat or profile to initiate a live connection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
