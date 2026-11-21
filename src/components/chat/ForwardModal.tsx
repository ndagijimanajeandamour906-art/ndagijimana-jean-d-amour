import React, { useState, useRef, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Message } from '../../types';
import { X, Share2, Search, Check, Send } from 'lucide-react';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, onClose }) => {
  const { conversations, sendMessage, currentUser } = useTolkflow();
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const getConvDisplay = (conv: typeof conversations[0]) => {
    if (conv.type === 'direct') {
      const peer = conv.participants.find((p) => p.id !== currentUser.id);
      if (peer) return { name: peer.name, avatar: peer.avatar };
    }
    return { name: conv.name, avatar: conv.avatar };
  };

  const filtered = conversations.filter((c) =>
    getConvDisplay(c).name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (sentSuccess) return;
    setSelectedConvIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    if (selectedConvIds.length === 0 || sentSuccess) return;

    selectedConvIds.forEach((convId) => {
      sendMessage(convId, message.text || '', message.type, {
        mediaUrl: message.mediaUrl,
        mediaName: message.mediaName,
        mediaSize: message.mediaSize,
        mediaDuration: message.mediaDuration,
      });
    });

    setSentSuccess(true);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Forward Message</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-3 rounded-xl bg-slate-900 border-l-2 border-cyan-400 text-xs text-slate-300">
          <span className="font-semibold text-cyan-300 block">{message.senderName}:</span>
          <p className="truncate italic text-slate-400">{message.text || message.mediaName || 'Attachment'}</p>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
          />
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((conv) => {
            const isSelected = selectedConvIds.includes(conv.id);
            const display = getConvDisplay(conv);
            return (
              <div
                key={conv.id}
                onClick={() => toggleSelect(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600/30 border border-cyan-400/50'
                    : 'bg-slate-900/50 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={display.avatar}
                    alt={display.name}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{display.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      {conv.type === 'group' ? `${conv.participants.length} members` : 'Direct'}
                    </p>
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

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-400">
            {sentSuccess
              ? 'Forwarded successfully!'
              : `${selectedConvIds.length} recipient${selectedConvIds.length !== 1 ? 's' : ''} selected`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedConvIds.length === 0 || sentSuccess}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,102,255,0.4)] disabled:opacity-50"
            >
              {sentSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sentSuccess ? 'Sent!' : 'Forward'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
