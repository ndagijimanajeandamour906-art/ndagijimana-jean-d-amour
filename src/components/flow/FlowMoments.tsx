import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { FlowMoment } from '../../types';
import {
  Camera,
  Plus,
  Heart,
  Eye,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

export const FlowMoments: React.FC = () => {
  const { flowMoments, createFlowMoment, likeMoment, currentUser } = useTolkflow();

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [selectedGradient, setSelectedGradient] = useState('from-blue-600 via-indigo-700 to-cyan-500');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [storyProgress, setStoryProgress] = useState(0);

  const gradients = [
    'from-blue-600 via-indigo-700 to-cyan-500',
    'from-cyan-500 via-teal-600 to-blue-700',
    'from-purple-600 via-pink-600 to-blue-600',
    'from-emerald-500 via-cyan-600 to-indigo-800',
    'from-rose-600 via-purple-700 to-blue-900',
  ];

  // Auto-progress active story
  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < flowMoments.length - 1) {
            setActiveStoryIndex((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, flowMoments.length]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createFlowMoment({
      caption: newCaption,
      gradient: selectedGradient,
      mediaType: customPhotoUrl ? 'image' : 'gradient',
      mediaUrl: customPhotoUrl || undefined,
    });
    setNewCaption('');
    setCustomPhotoUrl('');
    setCreateModalOpen(false);
  };

  const currentStory = activeStoryIndex !== null ? flowMoments[activeStoryIndex] : null;

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
              Flow Moments
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            24-hour ephemeral visual status updates and engineering snapshots.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_20px_rgba(0,102,255,0.4)] flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Share Moment
        </button>
      </div>

      {/* Moments Feed */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Create Moment Tile */}
          <div
            onClick={() => setCreateModalOpen(true)}
            className="h-72 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-cyan-400 flex flex-col items-center justify-center p-4 text-center cursor-pointer group transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 shadow-[0_0_15px_rgba(0,102,255,0.5)] transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-white">Create Moment</span>
            <span className="text-[11px] text-slate-400 mt-1">Disappears in 24h</span>
          </div>

          {/* Story Tiles */}
          {flowMoments.map((moment, idx) => (
            <div
              key={moment.id}
              onClick={() => {
                setActiveStoryIndex(idx);
                setStoryProgress(0);
              }}
              className={`h-72 rounded-3xl relative overflow-hidden cursor-pointer group shadow-xl border border-slate-800 hover:border-cyan-400 transition-all ${
                moment.mediaType === 'gradient'
                  ? `bg-gradient-to-br ${moment.gradient || 'from-blue-600 to-cyan-500'}`
                  : 'bg-black'
              }`}
            >
              {moment.mediaType === 'image' && moment.mediaUrl && (
                <img
                  src={moment.mediaUrl}
                  alt="moment"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

              {/* User Avatar & Name */}
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <img
                  src={moment.userAvatar}
                  alt={moment.userName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-400"
                />
                <div className="truncate min-w-0">
                  <p className="text-xs font-bold text-white truncate drop-shadow-md">
                    {moment.userName}
                  </p>
                  <p className="text-[10px] text-cyan-200 drop-shadow-sm">{moment.createdAt}</p>
                </div>
              </div>

              {/* Caption & Stats bottom */}
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs text-white line-clamp-2 font-medium mb-2 drop-shadow-md">
                  {moment.caption}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> {moment.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> {moment.viewsCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-Screen Story Viewer Modal */}
      {currentStory && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-sm h-[75vh] max-h-[640px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 border border-cyan-500/30">
            {/* Background Media */}
            {currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
              <img
                src={currentStory.mediaUrl}
                alt="story"
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

            {/* Top Bar with Progress Bar & User Info */}
            <div className="relative z-10 space-y-3">
              {/* Progress Bar */}
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
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 text-white/80 hover:text-white rounded-full bg-black/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Nav touch triggers */}
            <div className="relative z-10 flex-1 flex items-center justify-between">
              <button
                onClick={() => {
                  if (activeStoryIndex !== null && activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                    setStoryProgress(0);
                  }
                }}
                className="p-2 text-white/40 hover:text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  if (activeStoryIndex !== null && activeStoryIndex < flowMoments.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryIndex(null);
                  }
                }}
                className="p-2 text-white/40 hover:text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Caption & Reaction */}
            <div className="relative z-10 space-y-3">
              <p className="text-sm font-semibold text-white drop-shadow-md">
                {currentStory.caption}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <span className="text-xs text-white/70 font-mono">
                  {currentStory.expiresAt}
                </span>

                <button
                  onClick={() => likeMoment(currentStory.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-rose-500/40 text-white text-xs font-bold transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <span>{currentStory.likesCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Moment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Share a Flow Moment</h3>
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
                  Choose Ambient Gradient
                </label>
                <div className="flex items-center gap-2">
                  {gradients.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedGradient(grad);
                        setCustomPhotoUrl('');
                      }}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} transition-all ${
                        selectedGradient === grad && !customPhotoUrl
                          ? 'ring-2 ring-cyan-400 scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Or Paste Photo Image URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Moment Caption / Reflection
                </label>
                <textarea
                  required
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="What's happening right now?"
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
                  Publish Moment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
