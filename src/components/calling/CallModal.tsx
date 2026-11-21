import React, { useState, useEffect, useRef } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { webrtcService } from '../../services/webrtcService';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ShieldCheck,
  Radio,
  Languages,
  RefreshCw,
  Signal,
  Wifi,
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const {
    callSession,
    remoteStream,
    localStream,
    callQuality,
    callDuration,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
    toggleCallSubtitles,
    currentUser,
  } = useTolkflow();

  const [isPiP, setIsPiP] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(35);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Bind local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isPiP, callSession?.isVideoOff]);

  // Bind remote stream to remote video and audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, isPiP]);

  // Audio volume fluctuation for audio wave animation
  useEffect(() => {
    const volInterval = setInterval(() => {
      setAudioVolume(webrtcService.getAudioVolume());
    }, 150);
    return () => clearInterval(volInterval);
  }, []);

  // Speaker mute control
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!callSession) return null;

  // Determine peer info:
  // If currentUser is caller, peer is recipient. If currentUser is receiver, peer is caller.
  const isCaller = callSession.caller.id === currentUser.id;
  const peer = isCaller
    ? ('name' in callSession.recipient ? callSession.recipient : callSession.caller)
    : callSession.caller;

  const contactName = peer.name || 'TOLKFLOW User';
  const contactUsername = (peer as any).username || 'user';
  const contactAvatar =
    peer.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  const isVideoCall = callSession.type === 'video';
  const isConnected = callSession.status === 'connected';

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Picture in Picture compact mode
  if (isPiP) {
    return (
      <div className="fixed bottom-20 right-6 w-80 bg-[#0A1124] border-2 border-cyan-500/50 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3.5 z-50 animate-in slide-in-from-bottom duration-300">
        {/* Hidden audio element for remote audio playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-white truncate">{contactName}</span>
          </div>
          <button
            onClick={() => setIsPiP(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Expand Full Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video feed in PiP */}
        {isVideoCall ? (
          <div className="relative w-full h-40 bg-black rounded-2xl overflow-hidden mb-2.5 border border-slate-800">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-cyan-300 font-mono">
              {remoteStream ? 'Remote Feed' : 'Local Feed'}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex items-center gap-3 mb-2.5">
            <img src={contactAvatar} alt={contactName} className="w-10 h-10 rounded-xl object-cover ring-1 ring-cyan-400" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate block">{contactName}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {isConnected ? formatSeconds(callDuration) : 'Calling...'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-mono text-cyan-400 text-xs font-semibold">
            {isConnected ? formatSeconds(callDuration) : 'Connecting...'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl transition-all ${
                callSession.isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'
              }`}
              title={callSession.isMuted ? 'Unmute' : 'Mute'}
            >
              {callSession.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={endCall}
              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-md"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Screen / Main View
  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 bg-[#050B14]/98 backdrop-blur-3xl z-50 flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-300"
    >
      {/* Hidden audio element for remote audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(0,102,255,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{contactName}</h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-600/40 text-cyan-300 border border-cyan-400/40 font-mono tracking-wider">
                {isVideoCall ? 'HD VIDEO CALL' : 'HD AUDIO CALL'}
              </span>
              <span className="text-xs text-slate-400 font-mono">@{contactUsername}</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span>
                {isConnected
                  ? `Encrypted WebRTC P2P Connection (${formatSeconds(callDuration)})`
                  : 'Ringing encrypted endpoint...'}
              </span>
              <span className="text-cyan-400/80 font-mono flex items-center gap-1 ml-2">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="capitalize">{callQuality} Quality</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speaker Volume Toggle */}
          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isSpeakerMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker Output' : 'Mute Speaker Output'}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Picture in Picture */}
          <button
            onClick={() => setIsPiP(true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Calling Stage */}
      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center my-4 relative overflow-hidden">
        {isVideoCall ? (
          <div className="w-full h-full max-h-[72vh] bg-black/90 rounded-3xl border border-cyan-500/30 overflow-hidden relative shadow-[0_0_60px_rgba(0,102,255,0.25)] flex items-center justify-center">
            {/* Primary Remote Video Stream */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : isConnected ? (
              // Connected but waiting for peer video track
              <div className="flex flex-col items-center text-center p-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-cyan-400 blur-xl opacity-40 animate-pulse" />
                  <img
                    src={contactAvatar}
                    alt={contactName}
                    className="relative w-32 h-32 rounded-full object-cover ring-4 ring-cyan-400 shadow-2xl"
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{contactName}</h3>
                <p className="text-xs text-cyan-300 font-mono animate-pulse">
                  Receiving HD audio feed (Camera paused by peer)
                </p>
              </div>
            ) : (
              // Calling / Ringing Stage
              <div className="flex flex-col items-center text-center p-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 blur-2xl opacity-60 animate-ping" />
                  <img
                    src={contactAvatar}
                    alt={contactName}
                    className="relative w-36 h-36 rounded-full object-cover ring-4 ring-cyan-400 shadow-[0_0_40px_rgba(0,229,255,0.5)]"
                  />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">{contactName}</h3>
                <p className="text-sm text-cyan-300 font-mono animate-pulse flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Waiting for peer to answer...</span>
                </p>
              </div>
            )}

            {/* Picture-in-Picture Local Camera Stream (Self View) */}
            <div className="absolute top-4 right-4 w-44 sm:w-56 h-32 sm:h-38 rounded-2xl bg-[#0A1124] border-2 border-cyan-400/60 overflow-hidden shadow-2xl z-10 group">
              {callSession.isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-2">
                  <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-[10px] text-slate-400 font-medium">Your camera is off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>You ({currentUser.name.split(' ')[0]})</span>
              </div>
            </div>

            {/* Remote Info Badge in Video Mode */}
            {remoteStream && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-2xl bg-[#0A1124]/80 backdrop-blur-md border border-cyan-500/40 text-xs font-semibold text-white flex items-center gap-2 shadow-lg">
                <img src={contactAvatar} alt={contactName} className="w-5 h-5 rounded-full object-cover ring-1 ring-cyan-400" />
                <span className="text-xs font-bold">{contactName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Live HD
                </span>
              </div>
            )}

            {/* Screen sharing watermark */}
            {callSession.isScreenSharing && (
              <div className="absolute top-16 left-4 px-3 py-1 rounded-xl bg-blue-600/90 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-2 shadow-lg">
                <Share2 className="w-3.5 h-3.5" />
                <span>Screen Sharing Active</span>
              </div>
            )}
          </div>
        ) : (
          /* Voice Call Stage */
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              {/* Pulsing audio volume halo */}
              <div
                style={{
                  transform: `scale(${1 + (audioVolume / 100) * 0.45})`,
                  opacity: 0.35 + (audioVolume / 100) * 0.5,
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 blur-2xl transition-transform duration-100"
              />
              <img
                src={contactAvatar}
                alt={contactName}
                className="relative w-40 h-40 rounded-full object-cover ring-4 ring-cyan-400 shadow-[0_0_40px_rgba(0,229,255,0.4)]"
              />
            </div>

            <h2 className="text-3xl font-display font-bold text-white mb-2">{contactName}</h2>
            <p className="text-sm text-cyan-400 font-mono mb-6">
              {isConnected ? formatSeconds(callDuration) : 'Calling encrypted endpoint...'}
            </p>

            {/* Real Audio Waveform Equalizer */}
            <div className="flex items-center gap-1.5 h-14 bg-slate-900/80 px-8 py-3 rounded-3xl border border-slate-800 shadow-xl">
              {[15, 32, 22, 48, 65, 38, 80, 55, 28, 70, 42, 22, 58, 32, 18, 45, 25].map((baseH, i) => {
                const calculatedH = Math.max(8, (baseH * audioVolume) / 65);
                return (
                  <span
                    key={i}
                    style={{ height: `${calculatedH}px` }}
                    className="w-1.5 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full transition-all duration-100"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Real-Time Multilingual Subtitles Overlay */}
        {callSession.subtitlesEnabled !== false && (
          <div className="absolute bottom-4 left-6 right-6 max-w-xl mx-auto z-20 pointer-events-none">
            {callSession.subtitles && callSession.subtitles.length > 0 ? (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {callSession.subtitles.slice(-2).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-2xl bg-black/85 backdrop-blur-md border border-cyan-500/40 shadow-2xl text-left"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-cyan-300">{sub.speakerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Live Subtitles • AI Translated</span>
                    </div>
                    <p className="text-xs text-white font-medium leading-relaxed">
                      {sub.translatedText || sub.originalText}
                    </p>
                    {sub.originalText !== sub.translatedText && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        Original: "{sub.originalText}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-1.5 px-4 rounded-full bg-black/70 backdrop-blur-md border border-slate-700/60 inline-flex items-center gap-2 text-[11px] text-slate-300 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Live Multilingual Subtitles Active (Listening...)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Futuristic Floating Control Dock */}
      <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-3xl bg-[#0A1124]/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-20">
        {/* Mic Toggle */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-all ${
            callSession.isMuted
              ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={callSession.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {callSession.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        {isVideoCall && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-2xl transition-all ${
              callSession.isVideoOff
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={callSession.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {callSession.isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Switch Camera Button (Mobile / Dual Camera) */}
        {isVideoCall && (
          <button
            onClick={switchCamera}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-all"
            title="Switch Camera (Front / Rear)"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`p-4 rounded-2xl transition-all ${
            callSession.isScreenSharing
              ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(0,229,255,0.7)] font-bold'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title="Share Screen"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Live Subtitles / AI Speech Translation Toggle */}
        <button
          onClick={toggleCallSubtitles}
          className={`p-4 rounded-2xl transition-all ${
            callSession.subtitlesEnabled !== false
              ? 'bg-blue-600/40 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
          }`}
          title={callSession.subtitlesEnabled !== false ? 'Hide Subtitles' : 'Show Live Translated Subtitles'}
        >
          <Languages className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="p-4 px-7 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(225,29,72,0.7)] font-bold flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm font-extrabold tracking-wide">End Call</span>
        </button>
      </div>
    </div>
  );
};
