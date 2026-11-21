import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Post, ReactionType, PostMediaItem } from '../../types';
import { getLanguageByCode } from '../../data/languages';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MapPin,
  Languages,
  Sparkles,
  MoreVertical,
  Repeat2,
  Trash2,
  Edit2,
  Flag,
  UserPlus,
  UserCheck,
  Play,
  ExternalLink,
  Send,
  Pin,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';

interface PostCardProps {
  post: Post;
  onOpenMediaViewer: (items: PostMediaItem[], index: number) => void;
  onOpenViralShare: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  onReportPost?: (postId: string) => void;
  onHashtagClick?: (tag: string) => void;
}

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: 'love', emoji: '❤️', label: 'Love', activeColor: 'text-rose-500 font-bold' },
  { type: 'fire', emoji: '🔥', label: 'Fire', activeColor: 'text-amber-500 font-bold' },
  { type: 'clap', emoji: '👏', label: 'Clap', activeColor: 'text-emerald-400 font-bold' },
  { type: 'laugh', emoji: '😂', label: 'Laugh', activeColor: 'text-yellow-400 font-bold' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', activeColor: 'text-cyan-400 font-bold' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  personal: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-300', icon: '💬' },
  media: { bg: 'bg-pink-500/20 border-pink-500/30', text: 'text-pink-300', icon: '📸' },
  news: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', icon: '📢' },
  educational: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300', icon: '🎓' },
  business: { bg: 'bg-cyan-500/20 border-cyan-500/30', text: 'text-cyan-300', icon: '💼' },
  events: { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300', icon: '📅' },
  jobs: { bg: 'bg-green-500/20 border-green-500/30', text: 'text-green-300', icon: '⚡' },
  entertainment: { bg: 'bg-fuchsia-500/20 border-fuchsia-500/30', text: 'text-fuchsia-300', icon: '🎬' },
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenMediaViewer,
  onOpenViralShare,
  onEditPost,
  onReportPost,
  onHashtagClick,
}) => {
  const {
    currentUser,
    deletePost,
    reactToPost,
    repostPost,
    toggleSavePost,
    toggleFollowUser,
    followingUserIds,
    addCommentToPost,
    projectOwner,
  } = useTolkflow();

  // Local component states
  const [showOriginal, setShowOriginal] = useState(false);
  const [commentingOpen, setCommentingOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isMe = post.authorId === currentUser.id;
  const isFollowing = followingUserIds.includes(post.authorId);
  const isAuthorOwner = isProjectOwnerUser(
    {
      id: post.authorId,
      username: post.authorUsername,
      name: post.authorName,
    },
    projectOwner
  );
  const userLang = getLanguageByCode(currentUser.preferredLanguage || 'en');

  const displayContent = showOriginal
    ? post.originalContent || post.content
    : post.translatedContent || post.content;

  const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.personal;

  // Media items normalization
  const mediaList: PostMediaItem[] =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls.map((url) => ({
          url,
          type: post.mediaType === 'video' ? 'video' : 'image',
          thumbnailUrl: url,
        }))
      : [];

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    addCommentToPost(post.id, commentText.trim(), replyTarget?.id);
    setCommentText('');
    setReplyTarget(null);
  };

  const handleReactionSelect = (reaction: ReactionType) => {
    reactToPost(post.id, reaction);
    setReactionPickerOpen(false);
  };

  return (
    <article className="p-4 sm:p-5 rounded-3xl bg-[#0A1124] border border-slate-800 hover:border-slate-700/80 shadow-2xl space-y-3.5 transition-all relative">
      {/* Pinned Post or Reposted Header */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold pb-1 border-b border-slate-800/60">
          <Pin className="w-3.5 h-3.5 fill-amber-400" />
          <span>Pinned Announcement</span>
        </div>
      )}

      {post.repostedFrom && (
        <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold pb-1 border-b border-slate-800/60">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>Reposted from @{post.repostedFrom.authorUsername}</span>
        </div>
      )}

      {/* Top Author Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/40"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A1124]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-white hover:text-cyan-300 cursor-pointer flex items-center gap-1.5">
                <span>{post.authorName}</span>
                {isAuthorOwner && (
                  <DvOwnerBadge size="xs" withLabel showTooltip tooltipText="Official Tolkflow Project Owner (DAVD)" />
                )}
              </h3>
              <span className="text-[11px] text-cyan-400 font-mono">@{post.authorUsername}</span>

              {/* Follow Button if not me */}
              {!isMe && (
                <button
                  type="button"
                  onClick={() => toggleFollowUser(post.authorId)}
                  className={`ml-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                    isFollowing
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-2.5 h-2.5 text-cyan-400" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-2.5 h-2.5" /> Follow
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{post.authorCountry}</span>
              <span>•</span>
              <span>{post.createdAt}</span>
              {post.isEdited && <span className="text-[10px] italic text-slate-500">(edited)</span>}
              {post.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-cyan-300">
                    <MapPin className="w-3 h-3 text-cyan-400" /> {post.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Badges & More Menu */}
        <div className="flex items-center gap-2">
          {/* Category Badge */}
          <span
            className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border flex items-center gap-1 ${catStyle.bg} ${catStyle.text}`}
          >
            <span>{catStyle.icon}</span>
            <span className="capitalize">{post.category}</span>
          </span>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-20 text-xs space-y-1 animate-in fade-in">
                {isMe && onEditPost && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditPost(post);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Edit Post
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenViralShare(post);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" /> Viral Share Link
                </button>

                {onReportPost && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onReportPost(post.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-amber-300 hover:bg-amber-950/40 transition-colors text-left"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report Post
                  </button>
                )}

                {(isMe || currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      deletePost(post.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Translation Notice Banner */}
      {post.originalContent && (
        <div className="px-3 py-1.5 rounded-xl bg-blue-950/40 border border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            {showOriginal ? (
              <span>Showing original in <b>{post.authorLanguage}</b></span>
            ) : (
              <span>
                Translated from <b>{post.authorLanguage}</b> to <b>{userLang.name}</b>
              </span>
            )}
          </span>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
          >
            <Languages className="w-3 h-3" />
            <span>{showOriginal ? 'View Translated' : 'View Original'}</span>
          </button>
        </div>
      )}

      {/* Post Text Body */}
      <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
        {displayContent}
      </p>

      {/* Media Attachments Gallery */}
      {mediaList.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black">
          {mediaList.length === 1 ? (
            /* Single Media */
            mediaList[0].type === 'video' ? (
              <div
                onClick={() => onOpenMediaViewer(mediaList, 0)}
                className="relative aspect-video bg-black flex items-center justify-center cursor-pointer group"
              >
                <video src={mediaList[0].url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                  <div className="p-3.5 rounded-full bg-cyan-500/90 text-black shadow-lg shadow-cyan-500/50 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-black" />
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onOpenMediaViewer(mediaList, 0)}
                className="max-h-96 overflow-hidden cursor-pointer"
              >
                <img
                  src={mediaList[0].url}
                  alt="post media"
                  className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            )
          ) : mediaList.length === 2 ? (
            /* 2 Media split */
            <div className="grid grid-cols-2 gap-1 max-h-80">
              {mediaList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenMediaViewer(mediaList, idx)}
                  className="relative aspect-square cursor-pointer overflow-hidden group"
                >
                  <img
                    src={item.url}
                    alt={`media-${idx}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 3 or 4+ Media Grid */
            <div className="grid grid-cols-2 gap-1 max-h-96">
              {mediaList.slice(0, 4).map((item, idx) => {
                const isFourthAndMore = idx === 3 && mediaList.length > 4;
                return (
                  <div
                    key={idx}
                    onClick={() => onOpenMediaViewer(mediaList, idx)}
                    className="relative aspect-square cursor-pointer overflow-hidden group"
                  >
                    <img
                      src={item.url}
                      alt={`media-${idx}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isFourthAndMore && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-white text-lg font-bold">
                        +{mediaList.length - 3} more
                      </div>
                    )}
                    {item.type === 'video' && !isFourthAndMore && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* External Link Preview Card */}
      {post.linkPreview && (
        <a
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-slate-700/80 bg-slate-900/60 p-3 hover:border-cyan-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            {post.linkPreview.image && (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                <img
                  src={post.linkPreview.image}
                  alt={post.linkPreview.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                {post.linkPreview.domain} <ExternalLink className="w-3 h-3" />
              </span>
              <h4 className="text-xs font-bold text-white truncate mt-0.5">
                {post.linkPreview.title}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                {post.linkPreview.description}
              </p>
            </div>
          </div>
        </a>
      )}

      {/* Hashtags and Mentions */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {post.hashtags &&
          post.hashtags.map((h, i) => (
            <button
              key={i}
              onClick={() => onHashtagClick && onHashtagClick(h)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
            >
              #{h}
            </button>
          ))}
        {post.tags &&
          post.tags.map((t, i) => (
            <span key={i} className="text-[11px] text-blue-400 font-mono">
              @{t}
            </span>
          ))}
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs text-slate-300 relative">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Reaction Button & Popover */}
          <div className="relative">
            <button
              onClick={() => reactToPost(post.id, post.myReaction || 'love')}
              onMouseEnter={() => setReactionPickerOpen(true)}
              className={`flex items-center gap-1.5 transition-colors ${
                post.likedByMe
                  ? 'text-rose-400 font-bold'
                  : 'hover:text-rose-400'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  post.likedByMe ? 'fill-rose-400 text-rose-400' : ''
                }`}
              />
              <span>{post.likesCount}</span>
            </button>

            {/* Reaction Picker Popover */}
            {reactionPickerOpen && (
              <div
                onMouseLeave={() => setReactionPickerOpen(false)}
                className="absolute -top-12 left-0 flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-2xl z-20 animate-in fade-in"
              >
                {REACTION_CONFIG.map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handleReactionSelect(r.type)}
                    className="p-1.5 rounded-full hover:scale-125 transition-transform text-sm"
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment Trigger */}
          <button
            onClick={() => setCommentingOpen(!commentingOpen)}
            className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount}</span>
          </button>

          {/* Repost Button */}
          <button
            onClick={() => repostPost(post.id)}
            className={`flex items-center gap-1.5 transition-colors ${
              post.repostedByMe ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'
            }`}
            title="Repost worldwide"
          >
            <Repeat2 className="w-4 h-4" />
            <span>{post.repostCount || 0}</span>
          </button>

          {/* Viral Share Button */}
          <button
            onClick={() => onOpenViralShare(post)}
            className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
            title="Viral Share"
          >
            <Share2 className="w-4 h-4" />
            <span>{post.sharesCount}</span>
          </button>
        </div>

        {/* Bookmark / Save Post */}
        <button
          onClick={() => toggleSavePost(post.id)}
          className={`hover:text-amber-400 transition-colors ${
            post.savedByMe ? 'text-amber-400' : ''
          }`}
          title={post.savedByMe ? 'Saved in Bookmarks' : 'Save Post'}
        >
          <Bookmark className={`w-4 h-4 ${post.savedByMe ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Comments Drawer / Section */}
      {commentingOpen && (
        <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
          {/* Reply-to chip */}
          {replyTarget && (
            <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> Replying to <b>{replyTarget.name}</b>
              </span>
              <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-white">
                Cancel
              </button>
            </div>
          )}

          {/* Comment Input */}
          <form onSubmit={handleSendComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write an automatically translated comment..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {post.comments.map((comm) => (
                <div
                  key={comm.id}
                  className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                    comm.replyToId
                      ? 'ml-6 bg-slate-900/40 border-slate-800/60'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={comm.authorAvatar}
                        alt={comm.authorName}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-bold text-white">{comm.authorName}</span>
                      {comm.replyToAuthorName && (
                        <span className="text-[10px] text-cyan-400 font-mono">
                          ▶ @{comm.replyToAuthorName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{comm.createdAt}</span>
                  </div>

                  <p className="text-slate-200">{comm.content}</p>

                  <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setReplyTarget({ id: comm.id, name: comm.authorName })}
                      className="hover:text-cyan-300 font-semibold"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
