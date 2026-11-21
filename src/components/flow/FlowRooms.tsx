import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { FlowRoom } from '../../types';
import {
  Radio,
  Users,
  Plus,
  Lock,
  Globe,
  Mic,
  MicOff,
  Hand,
  Volume2,
  X,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const FlowRooms: React.FC = () => {
  const { flowRooms, activeRoom, setActiveRoom, createFlowRoom, toggleRoomStage, currentUser } =
    useTolkflow();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<FlowRoom['category']>('Tech & AI');
  const [isPrivate, setIsPrivate] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // In-room live chat
  const [roomChatMessages, setRoomChatMessages] = useState<
    { sender: string; text: string; time: string }[]
  >([
    { sender: 'Marcus Brody', text: 'Welcome everyone! Latency test is underway.', time: '10:02' },
    { sender: 'Elena Rostova', text: 'Can everyone hear the cryptographic test stream?', time: '10:04' },
  ]);
  const [roomInput, setRoomInput] = useState('');

  const filteredRooms = flowRooms.filter((r) =>
    categoryFilter === 'All' ? true : r.category === categoryFilter
  );

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createFlowRoom({
      title: newTitle.trim(),
      topic: newTopic.trim() || 'Collaborative discussion lounge',
      category: newCategory,
      isPrivate,
    });

    setNewTitle('');
    setNewTopic('');
    setCreateModalOpen(false);
  };

  const handleSendRoomChat = () => {
    if (!roomInput.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRoomChatMessages((prev) => [
      ...prev,
      { sender: currentUser.name, text: roomInput.trim(), time: now },
    ]);
    setRoomInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-[#0A1124]/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Flow Rooms
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time public & encrypted technical lounges with live audio stages and chat.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_20px_rgba(0,102,255,0.4)] flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Create Flow Room
        </button>
      </div>

      {/* Main Content: If a room is active, show the live stage! */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Audio Stage */}
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            {/* Room Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold animate-pulse">
                    LIVE STAGE
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{activeRoom.category}</span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">{activeRoom.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeRoom.topic}</p>
              </div>

              <button
                onClick={() => setActiveRoom(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Leave Room
              </button>
            </div>

            {/* Speakers Grid */}
            <div className="flex-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-cyan-400 block mb-3">
                Active Speakers ({activeRoom.activeSpeakerIds.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activeRoom.activeSpeakerIds.map((speakerId) => {
                  const isCurrent = speakerId === currentUser.id;
                  const name = isCurrent ? currentUser.name : 'Participant Host';
                  const avatar = isCurrent
                    ? currentUser.avatar
                    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';

                  return (
                    <div
                      key={speakerId}
                      className="p-4 rounded-2xl bg-gradient-to-b from-[#0F1A36] to-[#0A1124] border border-cyan-500/30 flex flex-col items-center text-center relative group shadow-lg"
                    >
                      <div className="relative mb-3">
                        {/* Audio Pulse Ring */}
                        <div className="absolute -inset-1 rounded-full bg-cyan-400/40 animate-ping" />
                        <img
                          src={avatar}
                          alt={name}
                          className="relative w-16 h-16 rounded-full object-cover ring-2 ring-cyan-400"
                        />
                        <span className="absolute bottom-0 right-0 p-1 rounded-full bg-blue-600 text-white">
                          <Mic className="w-3 h-3 text-cyan-300" />
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white truncate max-w-full">
                        {name}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono mt-0.5">Speaking...</span>
                    </div>
                  );
                })}
              </div>

              {/* Audience section */}
              <div className="mt-8">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-3">
                  Listeners in Audience ({activeRoom.participantsCount})
                </span>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300"
                    >
                      U{i}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Stage Controls */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleRoomStage(activeRoom.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeRoom.activeSpeakerIds.includes(currentUser.id)
                      ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {activeRoom.activeSpeakerIds.includes(currentUser.id)
                    ? 'Mute Stage'
                    : 'Join Speaker Stage'}
                </button>

                <button
                  onClick={() => setHandRaised(!handRaised)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                    handRaised
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{activeRoom.participantsCount} connected</span>
              </div>
            </div>
          </div>

          {/* Room Live Chat Panel */}
          <div className="w-full lg:w-80 h-72 lg:h-full bg-[#0A1124] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col">
            <div className="p-3 border-b border-slate-800 text-xs font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Room Live Stream Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {roomChatMessages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-cyan-300">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-slate-200 mt-0.5">{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRoomChat()}
                placeholder="Message stage..."
                className="flex-1 bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-white placeholder-slate-400 outline-none border border-slate-800 focus:border-cyan-400"
              />
              <button
                onClick={handleSendRoomChat}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Rooms Directory View */
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['All', 'Tech & AI', 'Cyber Security', 'Design & UX', 'General Lounge'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#0A1124] to-[#070D1E] border border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_4px_25px_rgba(0,229,255,0.15)] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-500/30">
                      {room.category}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>{room.participantsCount} online</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                    {room.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {room.topic}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {room.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Host Info & Join */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <img
                      src={room.hostAvatar}
                      alt={room.hostName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs text-slate-300 truncate">Host: {room.hostName}</span>
                  </div>

                  <span className="text-xs text-cyan-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Enter Room →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Create New Flow Room</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Room Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Quantum AI & Distributed Mesh"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Topic / Agenda</label>
                <textarea
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="What is this lounge discussing?"
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value="Tech & AI">Tech & AI</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Design & UX">Design & UX</option>
                  <option value="Crypto & DeFi">Crypto & DeFi</option>
                  <option value="General Lounge">General Lounge</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-300">Private Encrypted Room</span>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-xs font-bold text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.6)]"
                >
                  Launch Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
