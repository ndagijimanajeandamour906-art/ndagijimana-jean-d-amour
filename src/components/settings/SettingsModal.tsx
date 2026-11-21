import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Shield,
  Lock,
  Smartphone,
  Eye,
  Bell,
  Trash2,
  Download,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    currentUser,
    toggleUserTwoFactor,
    privacySettings,
    updatePrivacySettings,
  } = useTolkflow();

  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'audio' | 'data'>('general');
  const [e2eeDefault, setE2eeDefault] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-display font-bold text-white">Platform Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          {[
            { id: 'general', label: 'General & Appearance' },
            { id: 'privacy', label: 'Privacy & E2EE' },
            { id: 'audio', label: 'Media & Hardware' },
            { id: 'data', label: 'Data & Storage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Theme Mode</span>
                <span className="text-slate-400">Toggle between Cyber Dark and Clean Light</span>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5"
              >
                {theme === 'dark' ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Sound Effects</span>
                <span className="text-slate-400">Synthesized audio cues for messages and call rings</span>
              </div>
              <button
                onClick={toggleSound}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                  soundEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Default End-to-End Encryption</span>
                <span className="text-slate-400">Enforce AES-GCM-256 for all new peer conversations</span>
              </div>
              <input
                type="checkbox"
                checked={e2eeDefault}
                onChange={(e) => setE2eeDefault(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Show Online Status</span>
                <span className="text-slate-400">Allow contacts to see when you are actively online</span>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.showOnlineStatus}
                onChange={(e) => updatePrivacySettings({ showOnlineStatus: e.target.checked })}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Show Last Seen</span>
                <span className="text-slate-400">Who can see when you were last connected</span>
              </div>
              <select
                value={privacySettings.showLastSeen}
                onChange={(e) => updatePrivacySettings({ showLastSeen: e.target.value as any })}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 outline-none text-xs"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">Contacts Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Read Receipts (✓✓)</span>
                <span className="text-slate-400">Send blue double check marks when messages are viewed</span>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.allowReadReceipts}
                onChange={(e) => updatePrivacySettings({ allowReadReceipts: e.target.checked })}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Live Typing Presence</span>
                <span className="text-slate-400">Broadcast "typing..." when you compose a message</span>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.allowTypingIndicators}
                onChange={(e) => updatePrivacySettings({ allowTypingIndicators: e.target.checked })}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-white block">Microphone Input Device</span>
              <select className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 outline-none">
                <option>Default System Microphone (Core Audio)</option>
                <option>Noise-Cancelling Studio Array (48kHz)</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-white block">Camera Video Device</span>
              <select className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 outline-none">
                <option>FaceTime HD Camera (1080p 60fps)</option>
                <option>Virtual Holographic Test Feed</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Export Encrypted Backup</span>
                <span className="text-slate-400">Download offline cipher backup of messages and vault keys</span>
              </div>
              <button className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
              <div>
                <span className="font-semibold text-rose-300 block">Clear Local Session & Cache</span>
                <span className="text-slate-400">Flushes local browser cache and decrypted session keys</span>
              </div>
              <button className="px-3.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-semibold flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Purge Cache
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.5)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
