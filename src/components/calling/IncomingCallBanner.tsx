import React from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Phone, PhoneOff, Video, ShieldCheck, Radio } from 'lucide-react';

export const IncomingCallBanner: React.FC = () => {
  const { callSession, answerCall, endCall } = useTolkflow();

  if (!callSession || callSession.status !== 'incoming') return null;

  const callerName = callSession.caller?.name || 'TOLKFLOW User';
  const callerUsername = callSession.caller?.username || 'user';
  const callerAvatar =
    callSession.caller?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  const isVideo = callSession.type === 'video';

  return (
    <div className="fixed top-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-[#0A1124]/95 backdrop-blur-2xl border-2 border-cyan-400 rounded-3xl shadow-[0_0_50px_rgba(0,229,255,0.45)] p-4.5 z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3.5 mb-3.5">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-2xl bg-cyan-400 blur-md opacity-60 animate-ping" />
          <img
            src={callerAvatar}
            alt={callerName}
            className="relative w-14 h-14 rounded-2xl object-cover ring-2 ring-cyan-400 shadow-md"
          />
          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-black ring-2 ring-[#0A1124]">
            {isVideo ? <Video className="w-3 h-3 fill-black" /> : <Phone className="w-3 h-3 fill-black" />}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-white truncate">{callerName}</h4>
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" title="End-to-End Encrypted WebRTC" />
          </div>
          <p className="text-[11px] text-cyan-400/90 font-mono truncate">@{callerUsername}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-semibold animate-pulse">
              Incoming {isVideo ? 'HD Video' : 'HD Voice'} Call...
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={endCall}
          className="flex-1 py-3 rounded-2xl bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/40 flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Decline</span>
        </button>

        <button
          onClick={answerCall}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-extrabold text-xs shadow-[0_0_25px_rgba(52,211,153,0.6)] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isVideo ? <Video className="w-4.5 h-4.5 fill-black" /> : <Phone className="w-4.5 h-4.5 fill-black" />}
          <span>Accept Call</span>
        </button>
      </div>
    </div>
  );
};
