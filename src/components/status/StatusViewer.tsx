import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { StoryStatus } from '../../types';
import {
  Camera,
  Plus,
  Heart,
  Eye,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  Smile,
  Clock,
  Sparkles,
} from 'lucide-react';

export const StatusViewer: React.FC = () => {
  const { stories, createStory, currentUser, sendMessage, activeConversationId } = useTolkflow();

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [storyProgress, setStoryProgress] = useState(0);

  // Form State
  const [newCaption, setNewCaption] = useState('');
  const [newMediaType, setNewMediaType] = useState<'text' | 'image'>('text');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(
    'from-blue-600 via-indigo-700 to-cyan-500'
  );

  const gradients = [
    'from-blue-600 via-indigo-700 to-cyan-500',
    'from-cyan-500 via-teal-600 to-blue-700',
    'from-purple-600 via-pink-600 to-blue-600',
    'from-emerald-500 via-cyan-600 to-indigo-800',
    'from-rose-600 via-purple-700 to-blue-900',
  ];

  // Auto-progress active story
  useEffect(() => {
    if (activeStoryIdx === null) {
      setStoryProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIdx < stories.length - 1) {
            setActiveStoryIdx((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
            setActiveStoryIdx(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIdx, stories.length]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStory({
      mediaType: newImageUrl ? 'image' : 'text',
      mediaUrl: newImageUrl.trim() || undefined,
      caption: newCaption.trim(),
      gradient: selectedGradient,
    });
    setNewCaption('');
    setNewImageUrl('');
    setCreateModalOpen(false);
  };

  const handleReplyToStory = (story: StoryStatus) => {
    if (!replyInput.trim()) return;
    if (activeConversationId) {
      sendMessage(activeConversationId, `Replied to your status: "${replyInput.trim()}"`, 'text');
    }
    setReplyInput('');
    setActiveStoryIdx(null);
  };

  const currentStory = activeStoryIdx !== null ? stories[activeStoryIdx] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Camera className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              Status & Stories
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Temporary visual status updates that automatically disappear after 24 hours.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_20px_rgba(0,102,255,0.4)] flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Add Status
        </button>
      </div>

      {/* Stories Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Add My Status Tile */}
          <div
            onClick={() => setCreateModalOpen(true)}
            className="h-72 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-cyan-400 flex flex-col items-center justify-center p-4 text-center cursor-pointer group transition-all"
          >
            <div className="relative mb-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold text-xs shadow-md">
                +
              </span>
            </div>
            <span className="text-sm font-bold text-white">My Status</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Share with contacts</span>
          </div>

          {/* Stories from contacts */}
          {stories.map((story, idx) => (
            <div
              key={story.id}
              onClick={() => {
                setActiveStoryIdx(idx);
                setStoryProgress(0);
              }}
              className={`h-72 rounded-3xl relative overflow-hidden cursor-pointer group shadow-xl border border-slate-800 hover:border-cyan-400 transition-all ${
                story.mediaType === 'image'
                  ? 'bg-black'
                  : `bg-gradient-to-br ${story.gradient || 'from-blue-600 to-cyan-500'}`
              }`}
            >
              {story.mediaType === 'image' && story.mediaUrl && (
                <img
                  src={story.mediaUrl}
                  alt="story"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <img
                  src={story.userAvatar}
                  alt={story.userName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-400"
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate drop-shadow-md">
                    {story.userName}
                  </p>
                  <p className="text-[10px] text-cyan-200">{story.createdAt}</p>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs text-white line-clamp-2 font-medium mb-2 drop-shadow-md">
                  {story.caption}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> {story.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> {story.viewersCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Story Viewer */}
      {currentStory && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-sm h-[75vh] max-h-[640px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 border border-cyan-500/30">
            {currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
              <img
                src={currentStory.mediaUrl}
                alt="status media"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  currentStory.gradient || 'from-blue-600 via-indigo-700 to-cyan-500'
                }`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

            {/* Top Progress & User Info */}
            <div className="relative z-10 space-y-3">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  style={{ width: `${storyProgress}%` }}
                  className="h-full bg-cyan-400 transition-all duration-100"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={currentStory.userAvatar}
                    alt={currentStory.userName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {currentStory.userName}
                    </span>
                    <span className="text-[10px] text-cyan-200">{currentStory.createdAt}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveStoryIdx(null)}
                  className="p-1.5 text-white/80 hover:text-white rounded-full bg-black/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Nav */}
            <div className="relative z-10 flex-1 flex items-center justify-between">
              <button
                onClick={() => {
                  if (activeStoryIdx !== null && activeStoryIdx > 0) {
                    setActiveStoryIdx(activeStoryIdx - 1);
                    setStoryProgress(0);
                  }
                }}
                className="p-2 text-white/40 hover:text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  if (activeStoryIdx !== null && activeStoryIdx < stories.length - 1) {
                    setActiveStoryIdx(activeStoryIdx + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryIdx(null);
                  }
                }}
                className="p-2 text-white/40 hover:text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Caption & Reply Bar */}
            <div className="relative z-10 space-y-3">
              <p className="text-sm font-semibold text-white drop-shadow-md">
                {currentStory.caption}
              </p>

              {/* Reply Input Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReplyToStory(currentStory)}
                  placeholder={`Reply to ${currentStory.userName}...`}
                  className="flex-1 bg-black/60 border border-white/20 px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/60 outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleReplyToStory(currentStory)}
                  className="p-2 rounded-xl bg-cyan-400 text-black font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create 24h Status</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Ambient Gradient
                </label>
                <div className="flex items-center gap-2">
                  {gradients.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedGradient(grad);
                        setNewImageUrl('');
                      }}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} transition-all ${
                        selectedGradient === grad && !newImageUrl
                          ? 'ring-2 ring-cyan-400 scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Or Photo Image URL
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Status Text
                </label>
                <textarea
                  required
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="What are you up to today?"
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.6)]"
                >
                  Post Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
