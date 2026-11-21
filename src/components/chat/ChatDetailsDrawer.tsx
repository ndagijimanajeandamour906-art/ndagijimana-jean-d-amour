import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { CryptoVaultService } from '../../services/cryptoVault';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Bell,
  BellOff,
  UserX,
  Check,
  ChevronRight,
  Phone,
  Video,
} from 'lucide-react';

interface ChatDetailsDrawerProps {
  onClose: () => void;
}

export const ChatDetailsDrawer: React.FC<ChatDetailsDrawerProps> = ({ onClose }) => {
  const {
    activeConversation,
    currentUser,
    allUsers,
    messages,
    toggleBlockUser,
    blockedUserIds,
    muteConversation,
    startCall,
  } = useTolkflow();

  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'security'>('info');
  const [safetyNumbers, setSafetyNumbers] = useState<string[]>([]);
  const [verifiedKey, setVerifiedKey] = useState(false);

  const isDirect = activeConversation?.type === 'direct';
  const rawOtherContact = isDirect
    ? activeConversation?.participants.find((p) => p.id !== currentUser.id)
    : null;
  const otherContact = rawOtherContact
    ? allUsers.find((u) => u.id === rawOtherContact.id) || rawOtherContact
    : null;

  useEffect(() => {
    if (otherContact?.id && currentUser?.id) {
      CryptoVaultService.generateSafetyFingerprint(currentUser.id, otherContact.id).then(
        (blocks) => setSafetyNumbers(blocks)
      );
    }
  }, [otherContact?.id, currentUser?.id]);

  if (!activeConversation) return null;

  const convMessages = messages[activeConversation.id] || [];
  const mediaMessages = convMessages.filter((m) => m.type === 'image' || m.type === 'video');
  const docMessages = convMessages.filter((m) => m.type === 'file');

  const isBlocked = otherContact ? blockedUserIds.includes(otherContact.id) : false;
  const displayName = isDirect && otherContact ? otherContact.name : activeConversation.name;
  const displayAvatar = isDirect && otherContact ? otherContact.avatar : activeConversation.avatar;

  return (
    <div className="w-80 lg:w-88 h-full bg-[#0A1124] border-l border-slate-800/80 flex flex-col select-none z-20">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Details & Security</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="p-5 flex flex-col items-center text-center border-b border-slate-800/80">
        <div className="relative mb-3">
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-cyan-500/50 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
          />
          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 text-white">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        </div>

        <h4 className="text-base font-bold text-white mb-0.5">{displayName}</h4>
        {isDirect && otherContact && (
          <p className="text-xs text-cyan-400 mb-2">@{otherContact.username}</p>
        )}
        <p className="text-xs text-slate-400 max-w-xs">
          {activeConversation.description || otherContact?.bio || 'TOLKFLOW Encrypted Session'}
        </p>

        {/* Real-time Call Actions */}
        <div className="flex items-center gap-2 w-full mt-3.5">
          <button
            onClick={() => startCall(otherContact || activeConversation, 'voice')}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audio Call</span>
          </button>
          <button
            onClick={() => startCall(otherContact || activeConversation, 'video')}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,102,255,0.4)]"
          >
            <Video className="w-3.5 h-3.5 fill-white" />
            <span>Video Call</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex w-full mt-4 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'info' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'media' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Media ({mediaMessages.length + docMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'security' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Encryption
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Direct contact info or group members */}
            {isDirect && otherContact ? (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Contact Information
                </span>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Email</span>
                    <span className="text-slate-200">{otherContact.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone</span>
                    <span className="text-slate-200">{otherContact.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Interests</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {otherContact.interests.map((it, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 text-[10px]"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Participants ({activeConversation.participants.length})
                </span>
                <div className="space-y-1.5">
                  {activeConversation.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-cyan-400 truncate">@{p.username}</p>
                        </div>
                      </div>
                      {activeConversation.adminIds?.includes(p.id) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          ADMIN
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => muteConversation(activeConversation.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activeConversation.isMuted ? (
                    <>
                      <Bell className="w-4 h-4 text-emerald-400" /> Unmute Notifications
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 text-amber-400" /> Mute Notifications
                    </>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {isDirect && otherContact && (
                <button
                  onClick={() => toggleBlockUser(otherContact.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    isBlocked
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-rose-400" />
                    {isBlocked ? 'Unblock Contact' : 'Block Contact'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media Gallery Tab */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            {mediaMessages.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                  Photos & Videos
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaMessages.map((m, i) =>
                    m.type === 'video' ? (
                      <div key={m.id || i} className="relative w-full h-20 rounded-lg overflow-hidden bg-black">
                        {m.thumbnailUrl ? (
                          <img src={m.thumbnailUrl} alt="video thumbnail" className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <video src={m.mediaUrl} className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-[9px] text-cyan-300 font-mono">
                          VID
                        </span>
                      </div>
                    ) : (
                      <img
                        key={m.id || i}
                        src={m.mediaUrl}
                        alt="media"
                        className="w-full h-20 rounded-lg object-cover hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {docMessages.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                  Shared Documents
                </span>
                <div className="space-y-1.5">
                  {docMessages.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{m.mediaName}</p>
                        <p className="text-[10px] text-slate-400">{m.mediaSize || 'File'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mediaMessages.length === 0 && docMessages.length === 0 && (
              <p className="text-center text-slate-400 py-6">No shared media yet.</p>
            )}
          </div>
        )}

        {/* Cryptographic Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-950/40 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Verified Cryptographic Session</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Messages in this channel are encrypted using AES-GCM-256 forward secrecy. To verify that neither messages nor calls are being intercepted, compare the safety number below with your peer.
              </p>
            </div>

            {/* Safety Numbers */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-cyan-400 tracking-widest block mb-2">
                Safety Fingerprint
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm font-bold text-white tracking-wider">
                {safetyNumbers.map((block, i) => (
                  <div key={i} className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    {block}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setVerifiedKey(!verifiedKey)}
                className={`mt-4 w-full py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  verifiedKey
                    ? 'bg-emerald-500 text-black'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {verifiedKey ? (
                  <>
                    <Check className="w-4 h-4" /> Cryptographically Verified
                  </>
                ) : (
                  'Mark as Verified'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
