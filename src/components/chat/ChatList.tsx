import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Search,
  Plus,
  Users,
  Lock,
  Pin,
  Check,
  CheckCheck,
  Volume2,
  Image as ImageIcon,
  FileText,
  UserPlus,
  Archive,
  BellOff,
  MoreVertical,
  Trash2,
  MailCheck,
} from 'lucide-react';

interface ChatListProps {
  onNewGroup: () => void;
  onNewChat: () => void;
  onSelectChat?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ onNewGroup, onNewChat, onSelectChat }) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    currentUser,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
    markConversationUnread,
    peerTypingStatus,
  } = useTolkflow();

  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'unread' | 'archived'>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((conv) => {
    // Search match
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      const matchName = conv.name.toLowerCase().includes(q);
      const matchMsg = conv.lastMessage?.text?.toLowerCase().includes(q);
      const matchParticipants = conv.participants.some(
        (p) => p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
      );
      if (!matchName && !matchMsg && !matchParticipants) return false;
    }

    // Filter tab
    if (filter === 'archived') return Boolean(conv.isArchived);
    // Otherwise exclude archived conversations from standard tabs
    if (conv.isArchived) return false;

    if (filter === 'direct') return conv.type === 'direct';
    if (filter === 'group') return conv.type === 'group';
    if (filter === 'unread') return (conv.unreadCount || 0) > 0;
    return true;
  });

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const otherConversations = filteredConversations.filter((c) => !c.isPinned);

  const renderConversationItem = (conv: typeof conversations[0]) => {
    const isSelected = conv.id === activeConversationId;
    const isDirect = conv.type === 'direct';
    const otherUser = isDirect
      ? conv.participants.find((p) => p.id !== currentUser.id)
      : null;
    const displayName = isDirect && otherUser ? otherUser.name : conv.name;
    const displayAvatar = isDirect && otherUser ? otherUser.avatar : conv.avatar;
    const isOnline = otherUser?.status === 'online';
    const isTyping = Boolean(peerTypingStatus[conv.id]);

    return (
      <div
        key={conv.id}
        onClick={() => {
          setActiveConversationId(conv.id);
          setActiveMenuId(null);
          onSelectChat?.();
        }}
        className={`relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group ${
          isSelected
            ? 'bg-blue-600/20 border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,102,255,0.2)]'
            : 'hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        {/* Avatar with Status Ring */}
        <div className="relative flex-shrink-0">
          <img
            src={displayAvatar}
            alt={displayName}
            className={`w-12 h-12 rounded-2xl object-cover ${
              isSelected ? 'ring-2 ring-cyan-400' : 'ring-1 ring-slate-700'
            }`}
          />
          {isDirect && (
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0A1124] ${
                isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
              }`}
            />
          )}
          {conv.type === 'group' && (
            <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-blue-600 border-2 border-[#0A1124] text-white">
              <Users className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Content details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <h4
                className={`text-sm font-semibold truncate ${
                  isSelected ? 'text-cyan-300' : 'text-slate-100'
                }`}
              >
                {displayName}
              </h4>
              {conv.isEncrypted && (
                <span title="E2EE Encrypted" className="inline-flex flex-shrink-0">
                  <Lock className="w-3 h-3 text-cyan-400" />
                </span>
              )}
              {conv.isMuted && (
                <span title="Notifications Muted" className="inline-flex flex-shrink-0">
                  <BellOff className="w-3 h-3 text-slate-500" />
                </span>
              )}
            </div>
            {conv.lastMessage && (
              <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2 font-mono">
                {conv.lastMessage.timestamp}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs truncate">
              {isTyping ? (
                <span className="text-cyan-400 font-medium flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span>typing...</span>
                </span>
              ) : (
                <>
                  {conv.lastMessage?.senderId === currentUser.id && (
                    <span className="text-cyan-400 flex-shrink-0">
                      {conv.lastMessage.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                      ) : conv.lastMessage.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                  )}

                  {/* Message preview type */}
                  {conv.lastMessage?.type === 'voice' && (
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Volume2 className="w-3 h-3" /> Voice Note ({conv.lastMessage.mediaDuration}s)
                    </span>
                  )}
                  {conv.lastMessage?.type === 'image' && (
                    <span className="flex items-center gap-1 text-pink-300">
                      <ImageIcon className="w-3 h-3" /> Photo
                    </span>
                  )}
                  {conv.lastMessage?.type === 'file' && (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <FileText className="w-3 h-3" /> Document
                    </span>
                  )}
                  {(!conv.lastMessage?.type || conv.lastMessage?.type === 'text') && (
                    <p className="truncate text-slate-400">{conv.lastMessage?.text || 'No messages yet'}</p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {conv.isPinned && <Pin className="w-3 h-3 text-cyan-400 rotate-45" />}
              {conv.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-[10px]">
                  {conv.unreadCount}
                </span>
              )}

              {/* 3-dots Context Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all"
                  title="Conversation options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu */}
                {activeMenuId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-7 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-30 text-xs space-y-1 animate-in fade-in"
                  >
                    <button
                      onClick={() => {
                        pinConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                    >
                      <Pin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{conv.isPinned ? 'Unpin Chat' : 'Pin to Top'}</span>
                    </button>

                    <button
                      onClick={() => {
                        muteConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                    >
                      <BellOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>{conv.isMuted ? 'Unmute Chat' : 'Mute Notifications'}</span>
                    </button>

                    <button
                      onClick={() => {
                        archiveConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                    >
                      <Archive className="w-3.5 h-3.5 text-blue-400" />
                      <span>{conv.isArchived ? 'Unarchive' : 'Archive Chat'}</span>
                    </button>

                    <button
                      onClick={() => {
                        markConversationUnread(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                    >
                      <MailCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mark as Unread</span>
                    </button>

                    <div className="h-px bg-slate-800 my-1" />

                    <button
                      onClick={() => {
                        deleteConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Chat</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full md:w-80 lg:w-96 h-full bg-[#0A1124] border-r border-slate-800/80 flex-shrink-0 select-none">
      {/* Search & Actions Header */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-white tracking-wide">
              Conversations
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-cyan-300 font-mono">
              {filteredConversations.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 transition-colors"
              title="New Direct Message"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={onNewGroup}
              className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_2px_12px_rgba(0,102,255,0.4)] transition-all"
              title="Create New Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search messages, people or groups..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 text-xs text-white placeholder-slate-400 outline-none transition-all"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Direct' },
            { id: 'group', label: 'Groups' },
            { id: 'unread', label: 'Unread' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {pinnedConversations.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/70">
              <Pin className="w-3 h-3" /> Pinned
            </div>
            <div className="space-y-1">{pinnedConversations.map(renderConversationItem)}</div>
          </div>
        )}

        {otherConversations.length > 0 ? (
          <div>
            {pinnedConversations.length > 0 && (
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {filter === 'archived' ? 'Archived Conversations' : 'Recent'}
              </div>
            )}
            <div className="space-y-1">{otherConversations.map(renderConversationItem)}</div>
          </div>
        ) : (
          filteredConversations.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-sm">No conversations found.</p>
              <button
                onClick={onNewChat}
                className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Start a conversation
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
