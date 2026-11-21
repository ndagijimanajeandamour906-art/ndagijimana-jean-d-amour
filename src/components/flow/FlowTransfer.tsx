import React, { useState, useRef } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  ArrowUpRight,
  UploadCloud,
  File,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Cpu,
  Share2,
  Download,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ActiveTransfer {
  id: string;
  fileName: string;
  fileSize: string;
  progress: number;
  speed: string;
  status: 'transferring' | 'completed';
  hash: string;
}

export const FlowTransfer: React.FC = () => {
  const [transfers, setTransfers] = useState<ActiveTransfer[]>([
    {
      id: 'tf_1',
      fileName: 'TOLKFLOW-v2.0-Production-Release.iso',
      fileSize: '1.42 GB',
      progress: 100,
      speed: '48.2 MB/s',
      status: 'completed',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'tf_2',
      fileName: 'Quantum-Circuit-Simulations.parquet',
      fileSize: '348 MB',
      progress: 100,
      speed: '52.1 MB/s',
      status: 'completed',
      hash: '7d5a99f603f2c1a029930a9c73fc9a32c668b479b130f0c78ac1f30982849da1',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartTransfer = (file: File) => {
    const id = `tf_${Date.now()}`;
    const sizeStr = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    const randomHash = Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newTransfer: ActiveTransfer = {
      id,
      fileName: file.name,
      fileSize: sizeStr,
      progress: 0,
      speed: '44.8 MB/s',
      status: 'transferring',
      hash: `${randomHash}f89...`,
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    // Simulate chunked high-speed upload
    const interval = setInterval(() => {
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = t.progress + 15;
          if (next >= 100) {
            clearInterval(interval);
            return { ...t, progress: 100, status: 'completed' };
          }
          return { ...t, progress: next };
        })
      );
    }, 250);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Flow Transfer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ultra-fast direct P2P chunk transfer pipeline for massive media and system archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            ⚡ P2P Direct Tunnel Active
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full">
        {/* Upload Drop Zone */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleStartTransfer(file);
          }}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-10 rounded-3xl bg-gradient-to-b from-[#0A1124] to-[#070D1E] border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xl transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            Drag & Drop Large Files or Click to Browse
          </h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
            Supports multi-gigabyte files with chunked WebRTC data channels, automatic deduplication and SHA-256 validation.
          </p>

          <span className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.6)]">
            Select Files for Direct Transfer
          </span>
        </div>

        {/* Transfer Metrics Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Current Throughput</span>
              <p className="text-sm font-bold text-white font-mono">48.2 MB/s</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Transferred</span>
              <p className="text-sm font-bold text-white font-mono">1.76 GB</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Integrity Status</span>
              <p className="text-sm font-bold text-emerald-400 font-mono">100% Verified</p>
            </div>
          </div>
        </div>

        {/* Transfers List */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Transfers & Shared Archives</h3>
          <div className="space-y-3">
            {transfers.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-[#0A1124] border border-slate-800 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <File className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.fileName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{t.fileSize}</span>
                        <span>•</span>
                        <span>{t.speed}</span>
                        <span>•</span>
                        <span className="truncate">SHA: {t.hash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {t.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono">
                        <CheckCircle2 className="w-4 h-4" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-cyan-400 text-xs font-bold font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${t.progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
