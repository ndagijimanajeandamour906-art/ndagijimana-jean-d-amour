import React, { useState, useMemo } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Post, PostCategory, PostMediaItem } from '../../types';
import { PostCard } from './PostCard';
import {
  Globe,
  TrendingUp,
  Video,
  Image as ImageIcon,
  Users,
  Search,
  Filter,
  Flame,
  Languages,
  Sparkles,
  MapPin,
  Tag,
  ArrowRight,
  UserPlus,
  UserCheck,
} from 'lucide-react';

interface GlobalDiscoverViewProps {
  onOpenMediaViewer: (items: PostMediaItem[], index: number) => void;
  onOpenViralShare: (post: Post) => void;
  onEditPost: (post: Post) => void;
  onReportPost: (postId: string) => void;
  onSelectHashtag: (tag: string) => void;
}

const DISCOVER_COUNTRIES = [
  { code: 'all', name: 'All Nations 🌍' },
  { code: 'rwanda', name: 'Rwanda 🇷🇼' },
  { code: 'china', name: 'China 🇨🇳' },
  { code: 'singapore', name: 'Singapore 🇸🇬' },
  { code: 'united arab emirates', name: 'UAE 🇦🇪' },
  { code: 'nigeria', name: 'Nigeria 🇳🇬' },
  { code: 'united states', name: 'United States 🇺🇸' },
  { code: 'france', name: 'France 🇫🇷' },
  { code: 'kenya', name: 'Kenya 🇰🇪' },
];

const DISCOVER_LANGUAGES = [
  { code: 'all', name: 'All Languages' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'sw', name: 'Swahili (Kiswahili)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'es', name: 'Spanish (Español)' },
];

export const GlobalDiscoverView: React.FC<GlobalDiscoverViewProps> = ({
  onOpenMediaViewer,
  onOpenViralShare,
  onEditPost,
  onReportPost,
  onSelectHashtag,
}) => {
  const { posts, allUsers, toggleFollowUser, followingUserIds, currentUser } = useTolkflow();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [discoverSection, setDiscoverSection] = useState<
    'all' | 'worldwide' | 'my_country' | 'videos' | 'photos' | 'creators'
  >('all');

  // Filtered posts logic
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Country filter
    if (selectedCountry !== 'all') {
      result = result.filter((p) =>
        (p.authorCountry || '').toLowerCase().includes(selectedCountry.toLowerCase())
      );
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      result = result.filter((p) =>
        (p.authorLanguage || '').toLowerCase().includes(selectedLanguage.toLowerCase())
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorUsername.toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          p.hashtags.some((h) => h.toLowerCase().includes(q))
      );
    }

    // Section specific filtering
    if (discoverSection === 'worldwide') {
      result.sort((a, b) => b.likesCount + b.sharesCount - (a.likesCount + a.sharesCount));
    } else if (discoverSection === 'my_country') {
      const myCountryKeyword = (currentUser.country || 'Rwanda').split(' ')[0].toLowerCase();
      result = result.filter((p) =>
        (p.authorCountry || '').toLowerCase().includes(myCountryKeyword)
      );
    } else if (discoverSection === 'videos') {
      result = result.filter((p) => p.mediaType === 'video');
    } else if (discoverSection === 'photos') {
      result = result.filter((p) => p.mediaType === 'image');
    }

    return result;
  }, [posts, selectedCountry, selectedLanguage, searchQuery, discoverSection, currentUser.country]);

  // Trending Hashtags aggregation
  const trendingTags = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) => {
      p.hashtags.forEach((h) => {
        counts[h] = (counts[h] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [posts]);

  return (
    <div className="space-y-6">
      {/* Search & Global Exploration Header */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0A1124] to-[#070D1E] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-cyan-400" />
              Global Content Discovery
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore stories, videos, and discussions across countries and languages with automatic translation.
            </p>
          </div>

          {/* Real-time Search Input */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, hashtag, user, or country..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Multi-Country & Language Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Country:
          </div>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
          >
            {DISCOVER_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
            <Languages className="w-3.5 h-3.5 text-blue-400" /> Language:
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
          >
            {DISCOVER_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Discovery Sub-Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Global Posts', icon: Globe },
          { id: 'worldwide', label: 'Trending Worldwide 🔥', icon: TrendingUp },
          { id: 'my_country', label: `Trending in ${currentUser.country?.split(' ')[0] || 'Rwanda'} 🇷🇼`, icon: MapPin },
          { id: 'videos', label: 'Popular Videos', icon: Video },
          { id: 'photos', label: 'Popular Photos', icon: ImageIcon },
          { id: 'creators', label: 'Recommended Creators', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setDiscoverSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                discoverSection === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recommended Creators Section if selected */}
      {discoverSection === 'creators' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" /> Creators Leading Global Conversations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.map((u) => {
              const isFollowing = followingUserIds.includes(u.id);
              const isMe = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-3xl bg-[#0A1124] border border-slate-800 hover:border-cyan-500/40 shadow-xl space-y-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{u.name}</h4>
                      <p className="text-xs text-cyan-400 font-mono">@{u.username}</p>
                      <p className="text-[11px] text-slate-400">{u.country}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {u.bio || 'Multilingual creator and tech pioneer on TOLKFLOW.'}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Role: <b className="text-slate-200 capitalize">{u.role}</b>
                    </span>
                    {!isMe && (
                      <button
                        onClick={() => toggleFollowUser(u.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          isFollowing
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-md shadow-cyan-500/30'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Posts Stream */}
          <div className="lg:col-span-2 space-y-6">
            {filteredPosts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0A1124] border border-slate-800 text-center space-y-3">
                <Globe className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">No posts match this filter</h4>
                <p className="text-xs text-slate-400">
                  Try switching the country, language, or search query to explore more content.
                </p>
                <button
                  onClick={() => {
                    setSelectedCountry('all');
                    setSelectedLanguage('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Reset Discovery Filters
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpenMediaViewer={onOpenMediaViewer}
                  onOpenViralShare={onOpenViralShare}
                  onEditPost={onEditPost}
                  onReportPost={onReportPost}
                  onHashtagClick={onSelectHashtag}
                />
              ))
            )}
          </div>

          {/* Right Discovery Sidebar */}
          <div className="space-y-6">
            {/* Trending Hashtags Leaderboard */}
            <div className="p-5 rounded-3xl bg-[#0A1124] border border-slate-800 space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Trending Topics & Hashtags
              </h3>
              <div className="space-y-2">
                {trendingTags.map((item, idx) => (
                  <button
                    key={item.tag}
                    onClick={() => onSelectHashtag(item.tag)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs transition-colors group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 text-xs font-bold">#{idx + 1}</span>
                      <span className="font-semibold text-white group-hover:text-cyan-300">
                        #{item.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.count * 120 + 350} posts
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Viral Reach Summary */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-950/60 to-cyan-950/40 border border-cyan-500/30 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Viral Growth Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tolkflow's proprietary neural translation network allows every post to cross linguistic borders with zero friction.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Viral Shares Today</p>
                  <p className="text-base font-bold text-cyan-300">3,240+</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Global Reach</p>
                  <p className="text-base font-bold text-emerald-400">98,420</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
