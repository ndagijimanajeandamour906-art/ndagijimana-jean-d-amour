import React, { useState } from 'react';
import { Post } from '../../types';
import {
  X,
  Copy,
  Check,
  Share2,
  Globe,
  ExternalLink,
  MessageCircle,
  Send,
  Linkedin,
  Mail,
  Sparkles,
} from 'lucide-react';

interface ViralShareModalProps {
  post: Post;
  onClose: () => void;
}

export const ViralShareModal: React.FC<ViralShareModalProps> = ({ post, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<'twitter' | 'whatsapp' | 'facebook'>('twitter');

  const shareUrl = `https://tolkflow.io/p/${post.id}`;
  const shareText = `Check out this post by @${post.authorUsername} on TOLKFLOW: "${(post.content || '').slice(0, 100)}..."`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareChannels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      url: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      icon: Share2,
      color: 'bg-black hover:bg-slate-900 border border-slate-700 text-white',
      url: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=${(post.hashtags || []).join(',')}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-400 text-white',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Globe,
      color: 'bg-blue-600 hover:bg-blue-500 text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-600 text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'bg-slate-800 hover:bg-slate-700 text-white',
      url: `mailto:?subject=${encodeURIComponent(`Post by ${post.authorName} on TOLKFLOW`)}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  const primaryImage =
    post.mediaUrls?.[0] ||
    post.mediaItems?.[0]?.url ||
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=1000&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Global Viral Share</h2>
              <p className="text-xs text-slate-400">Share worldwide with automatic Open Graph rich preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Direct Shareable URL</span>
            <span className="text-[11px] font-mono text-cyan-400">Permanent Link</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono select-all outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1-Click Viral Channels Grid */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">Instant 1-Click Sharing</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {shareChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 shadow-md ${channel.color}`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-semibold tracking-tight">{channel.name}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* OpenGraph Card Live Preview */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Social Card Preview (Open Graph)
            </span>
            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
              {(['twitter', 'whatsapp', 'facebook'] as const).map((platform) => (
                <button
                  key={platform}
                  onClick={() => setActivePreviewPlatform(platform)}
                  className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${
                    activePreviewPlatform === platform
                      ? 'bg-cyan-500 text-black font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Social Card UI Simulation */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 overflow-hidden shadow-xl text-left">
            {/* Image Preview */}
            <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
              <img
                src={primaryImage}
                alt="OG Preview"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-slate-700">
                tolkflow.io
              </span>
            </div>

            {/* Content Preview */}
            <div className="p-3.5 space-y-1 bg-[#0D1528]">
              <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                {post.category} • Tolkflow Global
              </p>
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {post.authorName} on TOLKFLOW: "{post.content.slice(0, 50)}..."
              </h4>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {post.content}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>By @{post.authorUsername} ({post.authorCountry})</span>
                <span className="text-cyan-400 flex items-center gap-1 font-mono">
                  Read on Tolkflow <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-slate-400 pt-1">
          Tolkflow links shared globally allow recipients to read content in their native language with AI translation.
        </p>
      </div>
    </div>
  );
};
