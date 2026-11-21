import React, { useState, useRef, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Post, PostCategory, PostMediaItem, PostLinkPreview, PostDraft } from '../../types';
import { getLanguageByCode } from '../../data/languages';
import { SmartAIService } from '../../services/aiService';
import {
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  MapPin,
  Tag,
  Link as LinkIcon,
  Sparkles,
  Eye,
  Edit3,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  Globe,
  Users,
  Lock,
  Layers,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';

interface CreatePostModalProps {
  initialPost?: Post | null;
  initialDraft?: PostDraft | null;
  onClose: () => void;
}

const CATEGORIES: { id: PostCategory; label: string; icon: string; color: string }[] = [
  { id: 'personal', label: 'Personal Updates', icon: '💬', color: 'from-blue-600 to-indigo-600' },
  { id: 'media', label: 'Photos & Videos', icon: '📸', color: 'from-pink-600 to-rose-600' },
  { id: 'news', label: 'News & Announcements', icon: '📢', color: 'from-amber-600 to-orange-600' },
  { id: 'educational', label: 'Educational Content', icon: '🎓', color: 'from-emerald-600 to-teal-600' },
  { id: 'business', label: 'Business Ads', icon: '💼', color: 'from-cyan-600 to-blue-600' },
  { id: 'events', label: 'Events & Invitations', icon: '📅', color: 'from-purple-600 to-violet-600' },
  { id: 'jobs', label: 'Job Opportunities', icon: '⚡', color: 'from-green-600 to-emerald-600' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: 'from-fuchsia-600 to-pink-600' },
];

const SUGGESTED_HASHTAGS = [
  'TOLKFLOW',
  'RwandaTech',
  'MultilingualAI',
  'GlobalCreators',
  'AfricanInnovation',
  'KigaliSummit',
  'WebRTC',
  'TechJobs',
];

const QUICK_LOCATIONS = [
  'Kigali, Rwanda 🇷🇼',
  'Shanghai, China 🇨🇳',
  'Singapore 🇸🇬',
  'Dubai, UAE 🇦🇪',
  'Nairobi, Kenya 🇰🇪',
  'Lagos, Nigeria 🇳🇬',
  'San Francisco, USA 🇺🇸',
  'Paris, France 🇫🇷',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  initialPost,
  initialDraft,
  onClose,
}) => {
  const {
    currentUser,
    allUsers,
    createPost,
    editPost,
    postDrafts,
    savePostDraft,
    deletePostDraft,
    projectOwner,
  } = useTolkflow();

  // Form states
  const [content, setContent] = useState(initialPost?.content || initialDraft?.content || '');
  const [category, setCategory] = useState<PostCategory>(
    initialPost?.category || initialDraft?.category || 'personal'
  );
  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>(
    initialPost?.mediaItems || initialDraft?.mediaItems || []
  );
  const [location, setLocation] = useState(initialPost?.location || initialDraft?.location || '');
  const [hashtags, setHashtags] = useState<string[]>(
    initialPost?.hashtags || initialDraft?.hashtags || ['TOLKFLOW']
  );
  const [hashtagInput, setHashtagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialPost?.tags || initialDraft?.tags || []);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(
    initialPost?.visibility || initialDraft?.visibility || 'public'
  );
  const [linkUrl, setLinkUrl] = useState(initialPost?.linkPreview?.url || initialDraft?.linkUrl || '');
  const [linkPreview, setLinkPreview] = useState<PostLinkPreview | undefined>(initialPost?.linkPreview);

  // UI state
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showDraftsDrawer, setShowDraftsDrawer] = useState(false);
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false);
  const [aiTranslatedContent, setAiTranslatedContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customMediaUrl, setCustomMediaUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Link Preview automatically when valid URL is entered
  useEffect(() => {
    if (!linkUrl.trim()) {
      setLinkPreview(undefined);
      return;
    }
    try {
      const parsed = new URL(linkUrl);
      setLinkPreview({
        url: linkUrl,
        title: `Official Reference: ${parsed.hostname}`,
        description: `Explore linked content on ${parsed.hostname} shared with the Tolkflow community.`,
        domain: parsed.hostname,
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      });
    } catch {
      // not a full url yet
    }
  }, [linkUrl]);

  // AI translation preview for preview tab
  useEffect(() => {
    if (activeTab === 'preview' && content.trim() && !aiTranslatedContent) {
      setIsTranslatingPreview(true);
      SmartAIService.translateMessage(content, 'rw', 'en')
        .then((res) => {
          setAiTranslatedContent(res.translatedText);
          setIsTranslatingPreview(false);
        })
        .catch(() => setIsTranslatingPreview(false));
    }
  }, [activeTab, content, aiTranslatedContent]);

  // Handle Multi-file Upload (Photos & Videos)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setUploadProgress(15);

    const newItems: PostMediaItem[] = [];

    Array.from(files).forEach((file: File) => {
      // Max 50MB check
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds 50MB maximum allowable limit.`);
        return;
      }

      const isVideo = file.type.startsWith('video/');
      const objectUrl = URL.createObjectURL(file);

      newItems.push({
        url: objectUrl,
        type: isVideo ? 'video' : 'image',
        caption: file.name,
        thumbnailUrl: isVideo
          ? 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80'
          : objectUrl,
        duration: isVideo ? 30 : undefined,
      });
    });

    // Simulate progressive upload & compression
    let current = 25;
    const interval = setInterval(() => {
      current += 25;
      setUploadProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setMediaItems((prev) => [...prev, ...newItems]);
          setUploadProgress(null);
        }, 300);
      }
    }, 150);
  };

  const handleAddMediaUrl = () => {
    if (!customMediaUrl.trim()) return;
    const isVideo =
      customMediaUrl.endsWith('.mp4') ||
      customMediaUrl.endsWith('.webm') ||
      customMediaUrl.includes('video');

    setMediaItems((prev) => [
      ...prev,
      {
        url: customMediaUrl.trim(),
        type: isVideo ? 'video' : 'image',
        thumbnailUrl: isVideo
          ? 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80'
          : customMediaUrl.trim(),
        caption: 'Attached Media',
      },
    ]);
    setCustomMediaUrl('');
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddHashtag = (tagToAdd: string) => {
    const clean = tagToAdd.replace(/^#/, '').trim();
    if (!clean) return;
    if (!hashtags.includes(clean)) {
      setHashtags([...hashtags, clean]);
    }
    setHashtagInput('');
  };

  const handleToggleTagUser = (username: string) => {
    if (tags.includes(username)) {
      setTags(tags.filter((u) => u !== username));
    } else {
      setTags([...tags, username]);
    }
  };

  const handleSaveDraft = () => {
    if (!content.trim() && mediaItems.length === 0) return;
    const draft: PostDraft = {
      id: initialDraft?.id || `draft_${Date.now()}`,
      content: content.trim(),
      category,
      mediaItems,
      hashtags,
      tags,
      location,
      linkUrl,
      visibility,
      updatedAt: 'Just now',
    };
    savePostDraft(draft);
    onClose();
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaItems.length === 0) {
      setErrorMessage('Please add some text or attach media before publishing.');
      return;
    }

    if (initialPost) {
      // Editing existing post
      editPost(initialPost.id, {
        content: content.trim(),
        category,
        mediaItems,
        mediaUrls: mediaItems.map((m) => m.url),
        mediaType: mediaItems.length ? mediaItems[0].type : 'none',
        location: location.trim() || undefined,
        hashtags: hashtags.length ? hashtags : ['TOLKFLOW'],
        tags,
        visibility,
        linkPreview,
      });
    } else {
      // Creating new post
      createPost({
        content: content.trim(),
        category,
        mediaItems,
        mediaUrls: mediaItems.map((m) => m.url),
        mediaType: mediaItems.length ? mediaItems[0].type : 'none',
        location: location.trim() || undefined,
        hashtags: hashtags.length ? hashtags : ['TOLKFLOW', 'Global'],
        tags,
        visibility,
        linkPreview,
      });
      if (initialDraft) {
        deletePostDraft(initialDraft.id);
      }
    }

    onClose();
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const userLang = getLanguageByCode(currentUser.preferredLanguage || 'en');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/30">
              {currentCategoryObj.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {initialPost ? 'Edit Post' : 'Create Global Post'}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentCategoryObj.label}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Instantly translated across 40+ languages via Tolkflow Neural Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Drafts count trigger */}
            {postDrafts.length > 0 && !initialPost && (
              <button
                type="button"
                onClick={() => setShowDraftsDrawer(!showDraftsDrawer)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Drafts ({postDrafts.length})</span>
              </button>
            )}

            {/* Mode Toggle: Edit / Preview */}
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-cyan-500 text-black font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saved Drafts Drawer if toggled */}
        {showDraftsDrawer && (
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
              <span>Saved Post Drafts</span>
              <button onClick={() => setShowDraftsDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {postDrafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setContent(d.content);
                      setCategory(d.category);
                      setMediaItems(d.mediaItems || []);
                      setHashtags(d.hashtags || []);
                      setLocation(d.location || '');
                      setShowDraftsDrawer(false);
                    }}
                    className="flex-1 text-left truncate hover:text-cyan-300 font-medium"
                  >
                    {d.content || 'Untitled Draft with Media'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePostDraft(d.id)}
                    className="p-1 text-rose-400 hover:text-rose-300 ml-2"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Form or Preview Viewport */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'edit' ? (
            <form id="create-post-form" onSubmit={handlePublish} className="space-y-4">
              {/* Category Pills Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Choose Category
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                        category === cat.id
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Textarea */}
              <div className="space-y-1">
                <div className="relative">
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind? Share thoughts, announcements, opportunities, or updates. Write in any language..."
                    className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-400 resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-400">
                    {content.length} / 5,000
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-cyan-400/90 px-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Automatic AI translation enabled across 40+ human languages
                  </span>
                  <span className="text-slate-400 font-mono">Author: {userLang.name}</span>
                </div>
              </div>

              {/* Media Upload & Gallery Section */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Media Attachments (Photos & Videos)
                  </span>
                  <span className="text-[11px] text-slate-400">Max 50MB per file</span>
                </div>

                {/* Upload Progress Bar if active */}
                {uploadProgress !== null && (
                  <div className="space-y-1 py-1">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono">
                      <span>Compressing & Transcoding Media...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Gallery of Attached Items */}
                {mediaItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
                    {mediaItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-700 group"
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                            <video src={item.url} className="w-full h-full object-cover opacity-70" />
                            <Play className="w-6 h-6 text-cyan-400 fill-cyan-400 absolute" />
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={`media-${idx}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 opacity-90 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Media Actions: File Picker & URL input */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Photos / Videos
                  </button>

                  <div className="flex-1 w-full flex items-center gap-2">
                    <input
                      type="url"
                      value={customMediaUrl}
                      onChange={(e) => setCustomMediaUrl(e.target.value)}
                      placeholder="Paste image/video URL (e.g. Unsplash or CDN)..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              </div>

              {/* Location & External Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Kigali Innovation City, Rwanda"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                  {/* Quick location chips */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {QUICK_LOCATIONS.slice(0, 4).map((loc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white border border-slate-800 whitespace-nowrap"
                      >
                        {loc.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400" /> External Website Link
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://company.com or article URL"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Hashtags & User Tagging */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" /> Hashtags & Topic Discovery
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag(hashtagInput))}
                      placeholder="Add tag..."
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 w-28"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddHashtag(hashtagInput)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selected tags */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {hashtags.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1"
                    >
                      #{h}
                      <button
                        type="button"
                        onClick={() => setHashtags(hashtags.filter((t) => t !== h))}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Suggested trending hashtags */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] text-slate-400 pt-0.5">
                  <span className="flex-shrink-0 text-slate-500">Trending:</span>
                  {SUGGESTED_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 whitespace-nowrap"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Users Dropdown / Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> Tag People (@mentions)
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allUsers.map((u) => {
                    const isTagged = tags.includes(u.username);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleTagUser(u.username)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors border ${
                          isTagged
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span>@{u.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility Options */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="font-semibold text-slate-300">Audience Visibility</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      visibility === 'public'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3 h-3" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('followers')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      visibility === 'followers'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3 h-3" /> Followers
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      visibility === 'private'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-3 h-3" /> Only Me
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Live Post Preview Tab */
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Live Preview: Here is how your post will render on Tolkflow for international users!
                </span>
                <span className="font-mono text-[10px] text-cyan-400">100% Responsive</span>
              </div>

              {/* Render simulated post card */}
              <div className="p-5 rounded-3xl bg-[#0A1124] border border-cyan-500/30 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-2xl object-cover ring-2 ring-cyan-500/50"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{currentUser.name}</span>
                          {isProjectOwnerUser(currentUser, projectOwner) && <DvOwnerBadge size="xs" withLabel />}
                        </span>
                        <span className="text-xs text-cyan-400 font-mono">@{currentUser.username}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {currentUser.country} • Just now {location && `• ${location}`}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {category.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {content || 'No text content provided yet.'}
                </p>

                {/* AI Translated Preview Banner */}
                {aiTranslatedContent && (
                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-1">
                    <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Automatic Translation Preview (Kinyarwanda):
                    </div>
                    <p className="text-slate-300 italic">{aiTranslatedContent}</p>
                  </div>
                )}

                {/* Media Preview */}
                {mediaItems.length > 0 && (
                  <div className="rounded-2xl overflow-hidden bg-black max-h-72 border border-slate-800">
                    {mediaItems[0].type === 'video' ? (
                      <video src={mediaItems[0].url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaItems[0].url} alt="media" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                {/* Link Preview Card */}
                {linkPreview && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                      <img src={linkPreview.image} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-cyan-400 font-mono">{linkPreview.domain}</p>
                      <h4 className="text-xs font-bold text-white truncate">{linkPreview.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{linkPreview.description}</p>
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hashtags.map((h, i) => (
                      <span key={i} className="text-xs text-cyan-400 font-medium">
                        #{h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4 text-amber-400" /> Save as Draft
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-post-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-emerald-300 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>{initialPost ? 'Update Post' : 'Publish Worldwide'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
