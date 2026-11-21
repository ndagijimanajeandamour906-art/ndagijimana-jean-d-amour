import React, { useState, useMemo } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Post, PostCategory, PostMediaItem, PostDraft } from '../../types';
import { getLanguageByCode } from '../../data/languages';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { MediaViewerModal } from './MediaViewerModal';
import { ViralShareModal } from './ViralShareModal';
import { GlobalDiscoverView } from './GlobalDiscoverView';
import { ReportModal } from '../support/ReportModal';
import {
  Globe,
  Plus,
  Flame,
  Users,
  Bookmark,
  User,
  Search,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  TrendingUp,
  Filter,
  CheckCircle2,
  Share2,
} from 'lucide-react';

type FeedTab = 'home' | 'discover' | 'following' | 'popular' | 'saved' | 'my_posts';

const CATEGORY_TABS: { id: 'all' | PostCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Categories', icon: '🌐' },
  { id: 'personal', label: 'Personal', icon: '💬' },
  { id: 'media', label: 'Photos & Videos', icon: '📸' },
  { id: 'news', label: 'News & Announcements', icon: '📢' },
  { id: 'educational', label: 'Educational', icon: '🎓' },
  { id: 'business', label: 'Business Ads', icon: '💼' },
  { id: 'events', label: 'Events', icon: '📅' },
  { id: 'jobs', label: 'Jobs', icon: '⚡' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
];

export const PostFeed: React.FC = () => {
  const { posts, currentUser, followingUserIds, savedPostIds, postDrafts } = useTolkflow();

  // Navigation states
  const [feedTab, setFeedTab] = useState<FeedTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<'all' | PostCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeDraft, setActiveDraft] = useState<PostDraft | null>(null);

  // Lightbox Media Viewer state
  const [viewerMediaItems, setViewerMediaItems] = useState<PostMediaItem[] | null>(null);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Viral Share Modal state
  const [viralSharePost, setViralSharePost] = useState<Post | null>(null);

  // Report Modal state
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const userLang = getLanguageByCode(currentUser.preferredLanguage || 'en');

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    // Filter by tab
    if (feedTab === 'following') {
      list = list.filter((p) => followingUserIds.includes(p.authorId));
    } else if (feedTab === 'saved') {
      list = list.filter((p) => p.savedByMe || savedPostIds.includes(p.id));
    } else if (feedTab === 'my_posts') {
      list = list.filter((p) => p.authorId === currentUser.id);
    } else if (feedTab === 'popular') {
      list.sort(
        (a, b) =>
          b.likesCount + b.sharesCount + (b.repostCount || 0) -
          (a.likesCount + a.sharesCount + (a.repostCount || 0))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Filter by selected hashtag
    if (selectedHashtag) {
      list = list.filter((p) =>
        p.hashtags.some((h) => h.toLowerCase() === selectedHashtag.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorUsername.toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          p.hashtags.some((h) => h.toLowerCase().includes(q))
      );
    }

    return list;
  }, [
    posts,
    feedTab,
    selectedCategory,
    selectedHashtag,
    searchQuery,
    followingUserIds,
    savedPostIds,
    currentUser.id,
  ]);

  const handleOpenMediaViewer = (items: PostMediaItem[], index: number) => {
    setViewerMediaItems(items);
    setViewerInitialIndex(index);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setCreateModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingPost(null);
    setActiveDraft(null);
    setCreateModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & MAIN ACTION BAR */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-[#070D1E]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 z-20">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
                Tolkflow Social & Global Feed
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME AI
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Every story, video, and thought is automatically translated into {userLang.name} ({userLang.nativeName}).
              </p>
            </div>
          </div>
        </div>

        {/* Create Post Main Button */}
        <div className="flex items-center gap-3">
          {postDrafts.length > 0 && (
            <button
              onClick={() => {
                setActiveDraft(postDrafts[0]);
                setCreateModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              Resume Draft ({postDrafts.length})
            </button>
          )}

          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-emerald-300 text-black font-extrabold text-sm shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUB-NAVIGATION TABS (Home, Discover, Following, Popular, Saved, My Posts) */}
      {/* ============================================================== */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-[#0A1124]/60 flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-2 min-w-max">
          {[
            { id: 'home', label: 'Home Feed', icon: Globe },
            { id: 'discover', label: 'Explore & Discover', icon: Sparkles, badge: 'HOT' },
            { id: 'following', label: `Following (${followingUserIds.length})`, icon: Users },
            { id: 'popular', label: 'Popular / Trending', icon: Flame },
            { id: 'saved', label: `Saved (${savedPostIds.length})`, icon: Bookmark },
            { id: 'my_posts', label: 'My Posts', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFeedTab(tab.id as FeedTab);
                  setSelectedHashtag(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  feedTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-rose-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Hashtag Filter indicator if selected */}
        {selectedHashtag && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-300">
            <span>Filter: <b>#{selectedHashtag}</b></span>
            <button
              onClick={() => setSelectedHashtag(null)}
              className="hover:text-rose-400 font-bold ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN CONTENT CONTAINER */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {feedTab === 'discover' ? (
          /* Global Discovery Page */
          <GlobalDiscoverView
            onOpenMediaViewer={handleOpenMediaViewer}
            onOpenViralShare={(p) => setViralSharePost(p)}
            onEditPost={handleEditPost}
            onReportPost={(id) => setReportingPostId(id)}
            onSelectHashtag={(tag) => {
              setSelectedHashtag(tag);
              setFeedTab('home');
            }}
          />
        ) : (
          /* Standard Posts Stream with Category Filters & Quick Compose Bar */
          <>
            {/* Quick-Create Post Banner Widget */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0A1124] to-[#0D1528] border border-slate-800 hover:border-cyan-500/30 transition-all shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-2xl object-cover ring-2 ring-blue-500/40"
                />
                <button
                  onClick={handleCreateNew}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 text-left text-xs text-slate-400 hover:text-slate-200 transition-colors shadow-inner"
                >
                  Share an update, photo, video, or announcement worldwide...
                </button>
              </div>

              {/* Quick media shortcut buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-1.5 hover:text-pink-400 transition-colors py-1"
                  >
                    <ImageIcon className="w-4 h-4 text-pink-400" /> Photo
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors py-1"
                  >
                    <VideoIcon className="w-4 h-4 text-cyan-400" /> Video
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-1.5 hover:text-amber-400 transition-colors py-1"
                  >
                    <Globe className="w-4 h-4 text-amber-400" /> Announcement
                  </button>
                </div>

                <button
                  onClick={handleCreateNew}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Post
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Posts List */}
            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#0A1124] border border-slate-800 text-center space-y-3">
                  <Globe className="w-12 h-12 text-slate-500 mx-auto" />
                  <h3 className="text-base font-bold text-white">No posts in this stream</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Be the first creator to publish content or switch to Home Feed to discover worldwide conversations.
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs"
                  >
                    Publish First Post
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenMediaViewer={handleOpenMediaViewer}
                    onOpenViralShare={(p) => setViralSharePost(p)}
                    onEditPost={handleEditPost}
                    onReportPost={(id) => setReportingPostId(id)}
                    onHashtagClick={(tag) => setSelectedHashtag(tag)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. MODALS & LIGHTBOXES */}
      {/* ============================================================== */}

      {/* Create / Edit Post Modal */}
      {createModalOpen && (
        <CreatePostModal
          initialPost={editingPost}
          initialDraft={activeDraft}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingPost(null);
            setActiveDraft(null);
          }}
        />
      )}

      {/* Full-Screen Media Viewer Lightbox */}
      {viewerMediaItems && (
        <MediaViewerModal
          mediaItems={viewerMediaItems}
          initialIndex={viewerInitialIndex}
          authorName={currentUser.name}
          onClose={() => setViewerMediaItems(null)}
        />
      )}

      {/* Viral Share Modal */}
      {viralSharePost && (
        <ViralShareModal
          post={viralSharePost}
          onClose={() => setViralSharePost(null)}
        />
      )}

      {/* Report Post Modal */}
      {reportingPostId && (
        <ReportModal
          initialReport={{
            targetType: 'post',
            targetId: reportingPostId,
            targetName: `Post ${reportingPostId}`,
            category: 'inappropriate_content',
          }}
          onClose={() => setReportingPostId(null)}
        />
      )}
    </div>
  );
};
