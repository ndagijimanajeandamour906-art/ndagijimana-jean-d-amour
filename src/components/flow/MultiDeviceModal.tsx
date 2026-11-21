import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Smartphone,
  Laptop,
  QrCode,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

export const MultiDeviceModal: React.FC = () => {
  const { deviceSessions, revokeDeviceSession } = useTolkflow();

  const [pairingActive, setPairingActive] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);

  const simulatePairing = () => {
    setPairingActive(true);
    setTimeout(() => {
      setPairingActive(false);
      setPairingSuccess(true);
      setTimeout(() => setPairingSuccess(false), 3000);
    }, 2200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Connected Multi-Device Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Access TOLKFLOW securely across laptops, tablets, and mobile handsets with synced cryptographic keys.
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full">
        {/* Pair New Device Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F1A36] to-[#0A1124] border border-cyan-500/40 shadow-2xl flex flex-col md:flex-row items-center gap-6">
          {/* QR Code Container */}
          <div className="relative p-4 rounded-2xl bg-white flex flex-col items-center justify-center flex-shrink-0 shadow-lg">
            {pairingActive ? (
              <div className="w-36 h-36 flex flex-col items-center justify-center text-center p-2">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-slate-700">Verifying Handshake...</span>
              </div>
            ) : pairingSuccess ? (
              <div className="w-36 h-36 flex flex-col items-center justify-center text-center p-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-emerald-700">Device Linked!</span>
              </div>
            ) : (
              <div className="relative group cursor-pointer" onClick={simulatePairing}>
                {/* Stylized QR Code matrix */}
                <div className="w-36 h-36 bg-slate-900 rounded-lg p-2 grid grid-cols-6 gap-1">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 35
                          ? 'bg-cyan-400'
                          : i % 2 === 0
                          ? 'bg-white'
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 bg-blue-600/30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-extrabold text-white bg-black/80 px-2 py-1 rounded">
                    Click to Scan
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Pair a Secondary Client
            </span>
            <h3 className="text-lg font-bold text-white">Link Device via Instant Cryptographic Handshake</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open TOLKFLOW on your iOS or Android device, tap <b>Settings &gt; Connected Devices &gt; Link Device</b> and scan this QR code. Ratchet encryption keys sync seamlessly without plaintext exposure.
            </p>

            <button
              onClick={simulatePairing}
              disabled={pairingActive}
              className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.6)] flex items-center gap-2 mx-auto md:mx-0 transition-all"
            >
              <QrCode className="w-4 h-4" /> Simulate QR Scan & Link
            </button>
          </div>
        </div>

        {/* Active Connected Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Active Device Sessions ({deviceSessions.length})</h3>
            <span className="text-xs text-slate-400">All sessions protected by 2FA & E2EE</span>
          </div>

          <div className="space-y-3">
            {deviceSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-2xl bg-[#0A1124] border border-slate-800 flex items-center justify-between transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                    {session.deviceName.includes('Mac') || session.deviceName.includes('Linux') ? (
                      <Laptop className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{session.deviceName}</h4>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold font-mono">
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {session.browser} • {session.location}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      IP: {session.ip} • Last active: {session.lastActive}
                    </p>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => revokeDeviceSession(session.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                    title="Revoke session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
