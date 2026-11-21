import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { User } from '../../types';
import { X, Search, Users, UserPlus, Check, Lock } from 'lucide-react';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';

interface NewChatModalProps {
  initialMode: 'direct' | 'group';
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ initialMode, onClose }) => {
  const { allUsers, currentUser, createConversation, createGroupConversation, projectOwner } = useTolkflow();

  const [mode, setMode] = useState<'direct' | 'group'>(initialMode);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const candidateUsers = allUsers.filter((u) => u.id !== currentUser.id);

  const filteredUsers = candidateUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleStartDirect = (user: User) => {
    createConversation(user);
    onClose();
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    createGroupConversation(groupName.trim(), selectedUserIds, groupDesc.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              {mode === 'direct' ? 'Start Direct Chat' : 'Create Encrypted Group'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs flex-shrink-0">
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'direct' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'group' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Group Chat
          </button>
        </div>

        {/* Direct Mode */}
        {mode === 'direct' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contact name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleStartDirect(user)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1">
                        <span>{user.name}</span>
                        {isProjectOwnerUser(user, projectOwner) && <DvOwnerBadge size="xs" />}
                      </h4>
                      <p className="text-[10px] text-cyan-400">@{user.username}</p>
                    </div>
                  </div>

                  <span className="text-xs text-cyan-400 font-semibold">Message →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Mode */}
        {mode === 'group' && (
          <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="space-y-2 flex-shrink-0">
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group Name (e.g. Distributed Consensus Lab)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Group Description (Optional)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex-shrink-0">
              Select Participants ({selectedUserIds.length} selected)
            </span>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {candidateUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleSelectUser(user.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/30 border border-cyan-400/50'
                        : 'bg-slate-900/50 hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{user.name}</span>
                          {isProjectOwnerUser(user, projectOwner) && <DvOwnerBadge size="xs" />}
                        </h4>
                        <p className="text-[10px] text-cyan-400">@{user.username}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-cyan-400 text-black' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!groupName.trim() || selectedUserIds.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(0,102,255,0.4)] disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
