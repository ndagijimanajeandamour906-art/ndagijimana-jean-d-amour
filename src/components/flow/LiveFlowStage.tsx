import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Mic2,
  Mic,
  MicOff,
  Radio,
  Users,
  Hand,
  Volume2,
  Share2,
  MessageSquare,
  Sparkles,
  Heart,
  Flame,
  Rocket,
  Send,
} from 'lucide-react';

export const LiveFlowStage: React.FC = () => {
  const { currentUser } = useTolkflow();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [liveChat, setLiveChat] = useState<{ user: string; text: string }[]>([
    { user: 'Elena Rostova', text: 'Stage acoustics are crystal clear! 🚀' },
    { user: 'Marcus Brody', text: 'Quantum mesh streaming at 60fps.' },
    { user: 'Dr. Kenji Sato', text: 'Great points on topological qubits.' },
  ]);

  const triggerReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    setActiveReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setLiveChat((prev) => [...prev, { user: currentUser.name, text: chatInput.trim() }]);
    setChatInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Mic2 className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Live Flow Stage
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global broadcast stage for live keynotes, engineering townhalls, and collaborative panels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold font-mono animate-pulse">
            <Radio className="w-3.5 h-3.5" /> LIVE ON AIR
          </span>
          <span className="text-xs text-cyan-300 font-mono">148 Listeners</span>
        </div>
      </div>

      {/* Floating Animated Emojis in Stage */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 right-24 text-3xl animate-bounce transition-all duration-1000"
            style={{
              transform: `translateY(-${Math.random() * 200 + 100}px) translateX(${
                (Math.random() - 0.5) * 150
              }px)`,
              opacity: 0,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Stage Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Stage Grid */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="mb-4">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest block">
                Broadcasting Topic
              </span>
              <h2 className="text-xl font-bold text-white">
                TOLKFLOW v2.0 Global Protocol Architecture & Holographic Mesh
              </h2>
            </div>

            {/* Featured Keynote Speaker Tile */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F1A36] via-[#0A1124] to-[#070D1E] border border-cyan-500/40 shadow-2xl relative mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold font-mono">
                  KEYNOTE SPEAKER
                </span>
                <div className="flex items-center gap-1 text-cyan-400">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-mono">Audio 320kbps</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 blur-lg opacity-70 animate-pulse" />
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                    alt="Alex Vance"
                    className="relative w-24 h-24 rounded-full object-cover ring-4 ring-cyan-400"
                  />
                </div>

                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-bold text-white">Alex Vance</h3>
                  <p className="text-xs text-cyan-400">Chief Systems Architect, TOLKFLOW</p>
                  <p className="text-xs text-slate-300 mt-2 max-w-lg leading-relaxed">
                    “We are demonstrating true sub-20ms multi-tab and multi-device WebRTC routing with zero-knowledge post-quantum forward secrecy.”
                  </p>
                </div>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="mt-6 flex items-center justify-center gap-1 h-8">
                {[10, 24, 18, 32, 20, 14, 28, 22, 12, 18, 26, 18, 14, 22, 16, 28, 30, 22, 18, 12].map(
                  (h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1.5 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full animate-wave-2"
                    />
                  )
                )}
              </div>
            </div>

            {/* Co-Hosts & Panelists */}
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Panelist Stage
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { name: 'Elena Rostova', role: 'Security Lead', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
                { name: 'Marcus Brody', role: 'AI Lead', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
                { name: 'Sarah Chen', role: 'Spatial UX', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3"
                >
                  <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-cyan-400 truncate">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Live Controls Dock */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-2xl transition-all ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setRaisedHand(!raisedHand)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
                  raisedHand
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{raisedHand ? 'Hand Raised' : 'Request to Speak'}</span>
              </button>
            </div>

            {/* Quick Live Emoji Reactions */}
            <div className="flex items-center gap-2">
              {['🔥', '🚀', '👏', '❤️', '⚡'].map((em) => (
                <button
                  key={em}
                  onClick={() => triggerReaction(em)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-lg hover:scale-125 transition-transform"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Chat Drawer */}
        <div className="w-full lg:w-80 h-72 lg:h-full bg-[#0A1124] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col">
          <div className="p-3 border-b border-slate-800 text-xs font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Audience Live Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {liveChat.map((m, i) => (
              <div key={i} className="text-xs">
                <span className="font-semibold text-cyan-300 mr-1.5">{m.user}:</span>
                <span className="text-slate-200">{m.text}</span>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Cheer the stage..."
              className="flex-1 bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-white placeholder-slate-400 outline-none border border-slate-800 focus:border-cyan-400"
            />
            <button
              onClick={handleSendChat}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
