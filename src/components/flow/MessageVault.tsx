import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { VaultItem } from '../../types';
import {
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  FileCode,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';

export const MessageVault: React.FC = () => {
  const {
    vaultItems,
    isVaultUnlocked,
    unlockVault,
    lockVault,
    addVaultItem,
    deleteVaultItem,
  } = useTolkflow();

  const [passcodeInput, setPasscodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New item modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Credentials');
  const [newType, setNewType] = useState<VaultItem['type']>('secret');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const success = await unlockVault(passcodeInput);
    if (!success) {
      setErrorMsg('Invalid Master Passcode. (Default demo: tolkflow123)');
    } else {
      setPasscodeInput('');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    await addVaultItem(newTitle.trim(), newContent.trim(), newType, newCategory);
    setNewTitle('');
    setNewContent('');
    setAddModalOpen(false);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Message Vault
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-knowledge client-side AES-GCM-256 encrypted locker for confidential notes, keys, and documents.
          </p>
        </div>

        {isVaultUnlocked && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" /> Store Secret
            </button>
            <button
              onClick={lockVault}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-4 h-4 text-emerald-400" /> Lock Vault
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      {!isVaultUnlocked ? (
        /* Locked Screen */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md p-8 rounded-3xl bg-[#0A1124] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,102,255,0.2)] text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,229,255,0.4)]">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Vault is Encrypted & Locked</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Enter your master decryption passphrase to decrypt stored secrets in-memory.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3.5">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter master passcode (demo: tolkflow123)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-center text-sm text-white placeholder-slate-400 outline-none"
                autoFocus
              />

              {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all"
              >
                Unlock Safe Vault
              </button>
            </form>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Keys are never transmitted to any external server.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Unlocked Items Grid */
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaultItems.map((item) => {
              const isRevealed = revealedIds.includes(item.id);
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-gradient-to-b from-[#0A1124] to-[#070D1E] border border-slate-800 hover:border-cyan-500/40 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.encryptedDate}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>

                    {/* Cipher / Plain content */}
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 mb-3 font-mono text-xs break-all">
                      {isRevealed ? (
                        <p className="text-cyan-300">{item.content}</p>
                      ) : (
                        <p className="text-slate-400 select-none">
                          ••••••••••••••••••••••••••••••••••••••••
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions bottom */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono">{item.size}</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleReveal(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => copyContent(item.id, item.content)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => deleteVaultItem(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">
                Store Encrypted Secret
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., API Secret or Cold Storage Phrase"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value="Credentials">Credentials</option>
                  <option value="Seed Phrases">Seed Phrases</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Private Keys">Private Keys</option>
                  <option value="Personal Note">Personal Note</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Secret Content
                </label>
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste or write the sensitive data here..."
                  rows={4}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 resize-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                >
                  Encrypt & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
