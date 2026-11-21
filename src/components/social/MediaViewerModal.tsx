import React, { useState, useEffect } from 'react';
import { PostMediaItem } from '../../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
} from 'lucide-react';

interface MediaViewerModalProps {
  mediaItems: PostMediaItem[];
  initialIndex?: number;
  authorName?: string;
  postCaption?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaItems,
  initialIndex = 0,
  authorName,
  postCaption,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  const currentMedia = mediaItems[currentIndex] || mediaItems[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, mediaItems.length]);

  const handleNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
    }
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  if (!currentMedia) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10 text-white">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-cyan-300">
            {currentIndex + 1} / {mediaItems.length}
          </span>
          {authorName && (
            <span className="text-sm font-semibold text-slate-200 hidden sm:inline">
              Media by <span className="text-cyan-400 font-bold">{authorName}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {currentMedia.type === 'image' && (
            <>
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={toggleZoom}
                className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-cyan-300 transition-colors"
              >
                {zoomLevel}x
              </button>
            </>
          )}

          <a
            href={currentMedia.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Download Media"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/40 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {/* Navigation Previous Button */}
        {mediaItems.length > 1 && (
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`absolute left-4 z-20 p-3 rounded-2xl bg-black/60 hover:bg-slate-900/90 border border-slate-700/80 text-white transition-all ${
              currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 shadow-lg'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image Display with Pan & Zoom */}
        {currentMedia.type === 'image' && (
          <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
            <img
              src={currentMedia.url}
              alt={currentMedia.caption || 'Full view'}
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s ease-out',
                cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
              }}
              onClick={toggleZoom}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl"
            />
          </div>
        )}

        {/* Video Display with Native & Custom Controls */}
        {currentMedia.type === 'video' && (
          <div className="relative max-h-[82vh] max-w-[90vw] flex flex-col items-center justify-center">
            <video
              src={currentMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] max-w-[90vw] rounded-2xl shadow-2xl border border-slate-800 bg-black"
            />
            {currentMedia.caption && (
              <p className="mt-2 text-xs text-slate-300 font-medium bg-black/60 px-4 py-1.5 rounded-full border border-slate-800">
                {currentMedia.caption}
              </p>
            )}
          </div>
        )}

        {/* Navigation Next Button */}
        {mediaItems.length > 1 && (
          <button
            onClick={handleNext}
            disabled={currentIndex === mediaItems.length - 1}
            className={`absolute right-4 z-20 p-3 rounded-2xl bg-black/60 hover:bg-slate-900/90 border border-slate-700/80 text-white transition-all ${
              currentIndex === mediaItems.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:scale-110 shadow-lg'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails & Caption Strip */}
      <div className="px-6 py-4 bg-gradient-to-t from-black/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="text-xs text-slate-300 max-w-xl truncate">
          {currentMedia.caption || postCaption || 'Tolkflow Media Viewer'}
        </div>

        {/* Thumbnails Carousel */}
        {mediaItems.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-md py-1">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                }}
                className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                  currentIndex === idx
                    ? 'border-cyan-400 ring-2 ring-cyan-500/50 scale-105'
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[9px] text-cyan-300">
                    <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`thumb-${idx}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
