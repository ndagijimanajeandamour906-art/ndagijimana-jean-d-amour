import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Message } from '../../types';
import { SmartAIService, SmartReplySuggestions } from '../../services/aiService';
import { webrtcService } from '../../services/webrtcService';
import {
  Phone,
  Video,
  Info,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Pin,
  Check,
  CheckCheck,
  Play,
  Pause,
  Download,
  Trash2,
  Edit2,
  Reply,
  Sparkles,
  ArrowLeft,
  Search,
  Lock,
  Volume2,
  X,
  FileText,
  CornerDownRight,
  ShieldCheck,
  Share2,
  Languages,
  Square,
  Zap,
  RotateCcw,
  Palette,
  Clock,
  Loader2,
  Gauge,
  Camera,
  Copy,
  ChevronUp,
  ChevronDown,
  Ban,
  AlertTriangle,
  ArrowDown,
  Type,
  BellOff,
  Bell,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { ForwardModal } from './ForwardModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { getLanguageByCode } from '../../data/languages';
import { speechService } from '../../services/speechService';
import { mediaService } from '../../services/mediaService';
import { networkQuality, NetworkMetrics } from '../../services/networkQuality';
import { PerformanceTestModal } from './PerformanceTestModal';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';

interface ChatWindowProps {
  onToggleDetails: () => void;
  onBackMobile: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onToggleDetails, onBackMobile }) => {
  const {
    activeConversation,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    pinMessage,
    toggleMessageTranslation,
    currentUser,
    startCall,
    setLanguageModalOpen,
    theme,
    setVoiceSettingsOpen,
    setPricingModalOpen,
    chatTheme,
    setChatTheme,
    peerTypingStatus,
    sendTypingStatus,
    markConversationAsRead,
    setPerformanceModalOpen,
    blockedUserIds,
    toggleBlockUser,
    chatTextSize,
    setChatTextSize,
    openReportModal,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
    markConversationUnread,
    projectOwner,
    allUsers,
    switchUser,
  } = useTolkflow();

  // Camera, Toast, Text Size, & Conversation Action States
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [showTextSizeDropdown, setShowTextSizeDropdown] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false);
  const [deleteDialogMsg, setDeleteDialogMsg] = useState<{ id: string; isMe: boolean } | null>(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [earlierLoaded, setEarlierLoaded] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const headerControlsRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Network quality & upload state
  const [netMetrics, setNetMetrics] = useState<NetworkMetrics>(networkQuality.getMetrics());
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Input states
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartReplySuggestions | null>(null);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState<boolean>(true);
  const [suggestionInsertedTone, setSuggestionInsertedTone] = useState<string | null>(null);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [voicePlaybackRate, setVoicePlaybackRate] = useState<number>(1.0);
  const [translatingVoiceId, setTranslatingVoiceId] = useState<string | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const voiceRecorderRef = useRef<{ stop: () => Promise<any> } | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((message: string) => {
    setCopiedToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setCopiedToast(null), 2600);
  }, []);

  const formatDuration = (seconds?: number) => {
    const safeSec = Math.max(0, Math.round(seconds || 0));
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Speech Synthesis (TTS) - Reading message aloud
  const handleSpeakMessage = (msg: Message) => {
    if (speakingMessageId === msg.id && speechService.isSpeaking) {
      speechService.stop();
      setSpeakingMessageId(null);
      return;
    }

    const textToSpeak = msg.showOriginal
      ? msg.originalText || msg.text || ''
      : msg.translatedText || msg.text || '';

    if (!textToSpeak.trim()) {
      showToast('No text content available to read aloud.');
      return;
    }

    const langCode = msg.showOriginal
      ? msg.detectedLanguage || 'en'
      : msg.targetLanguage || currentUser.preferredLanguage || 'en';

    speechService.speak(textToSpeak, langCode, msg.id, {
      rate: speakingRate,
      onStart: () => setSpeakingMessageId(msg.id),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => {
        setSpeakingMessageId(null);
        showToast('Speech synthesis unavailable in this browser.');
      },
    });
  };

  // Cycle speaking speed (1.0x -> 1.25x -> 1.5x -> 2.0x -> 1.0x)
  const cycleSpeakingRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = speakingRate === 1.0 ? 1.25 : speakingRate === 1.25 ? 1.5 : speakingRate === 1.5 ? 2.0 : 1.0;
    setSpeakingRate(nextRate);
  };

  // Cycle voice note playback speed (1.0x -> 1.5x -> 2.0x -> 1.0x)
  const cycleVoicePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = voicePlaybackRate === 1.0 ? 1.5 : voicePlaybackRate === 1.5 ? 2.0 : 1.0;
    setVoicePlaybackRate(nextRate);
  };

  // Handle Playing Voice Note
  const handlePlayVoice = (msg: Message) => {
    if (playingVoiceId === msg.id) {
      speechService.stop();
      setPlayingVoiceId(null);
      return;
    }

    if (msg.mediaUrl && !msg.mediaUrl.startsWith('voice_note_simulated')) {
      speechService.playAudioUrl(msg.mediaUrl, msg.id, voicePlaybackRate, {
        onPlay: () => setPlayingVoiceId(msg.id),
        onPause: () => setPlayingVoiceId(null),
        onEnded: () => setPlayingVoiceId(null),
      });
    } else {
      // If voice note has text transcript or synthetic content, read aloud
      handleSpeakMessage(msg);
    }
  };

  // Handle AI Voice Translation: translate speech/voice note and read aloud immediately
  const handleTranslateVoice = async (msg: Message) => {
    setTranslatingVoiceId(msg.id);
    try {
      const sourceText = msg.text || 'Voice message audio recording';
      const targetLang = currentUser.preferredLanguage || 'en';
      const translation = await SmartAIService.translateMessage(sourceText, targetLang);

      // Speak the translated voice note aloud
      await speechService.speak(translation.translatedText, targetLang, msg.id, {
        rate: speakingRate,
        onStart: () => setSpeakingMessageId(msg.id),
        onEnd: () => {
          setSpeakingMessageId(null);
          setTranslatingVoiceId(null);
        },
        onError: () => {
          setSpeakingMessageId(null);
          setTranslatingVoiceId(null);
        },
      });
    } catch (err) {
      console.error('Failed to translate voice message:', err);
      showToast('Voice translation unavailable right now.');
    } finally {
      setTranslatingVoiceId(null);
    }
  };

  // Search within chat
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convMessages = useMemo(
    () => (activeConversation ? messages[activeConversation.id] || [] : []),
    [activeConversation, messages]
  );
  const pinnedMessage = convMessages.find((m) => m.isPinned);

  // Search match navigation
  const matchingMessageIds = useMemo(
    () =>
      chatSearchQuery.trim()
        ? convMessages
            .filter((m) => (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase()))
            .map((m) => m.id)
        : [],
    [convMessages, chatSearchQuery]
  );

  const handleNextSearchMatch = () => {
    if (matchingMessageIds.length === 0) return;
    const safeIdx = currentMatchIndex >= matchingMessageIds.length ? 0 : currentMatchIndex;
    const nextIdx = (safeIdx + 1) % matchingMessageIds.length;
    setCurrentMatchIndex(nextIdx);
    const targetId = matchingMessageIds[nextIdx];
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePrevSearchMatch = () => {
    if (matchingMessageIds.length === 0) return;
    const safeIdx = currentMatchIndex >= matchingMessageIds.length ? 0 : currentMatchIndex;
    const prevIdx = (safeIdx - 1 + matchingMessageIds.length) % matchingMessageIds.length;
    setCurrentMatchIndex(prevIdx);
    const targetId = matchingMessageIds[prevIdx];
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Highlight search keywords in messages
  const renderMessageContent = (text?: string) => {
    const safeText = text || '';
    if (!chatSearchQuery.trim()) return safeText;
    const query = chatSearchQuery.trim();
    const parts = safeText.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-slate-900 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Copy message to clipboard with toast and iframe fallback
  const handleCopyMessage = async (text?: string) => {
    const safeText = text || '';
    if (!safeText) return;
    try {
      await navigator.clipboard.writeText(safeText);
      showToast('Message copied to clipboard!');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = safeText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Message copied to clipboard!');
      } catch {
        showToast('Unable to access clipboard.');
      }
    }
  };

  // Camera capture callback
  const handleCameraCapture = (dataUrl: string, blob: Blob) => {
    if (!activeConversation) return;
    const msgId = `msg_cam_${Date.now()}`;
    sendMessage(activeConversation.id, 'Photo Snapshot', 'image', {
      id: msgId,
      mediaUrl: dataUrl,
      thumbnailUrl: dataUrl,
      mediaName: `snapshot_${Date.now()}.jpg`,
      mediaSize: `${(blob.size / 1024).toFixed(0)} KB`,
      status: 'sending',
    });
  };

  // Dynamic Chat Text Size Class
  const textSizeClass =
    chatTextSize === 'sm'
      ? 'text-xs'
      : chatTextSize === 'lg'
      ? 'text-base'
      : chatTextSize === 'xl'
      ? 'text-lg font-medium'
      : 'text-sm';

  // Handle scroll detection for floating scroll-to-bottom pill
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom > 160) {
      setIsScrolledUp(true);
    } else {
      setIsScrolledUp(false);
      setNewMessagesCount(0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
    setNewMessagesCount(0);
  };

  // Auto scroll to bottom or count new messages if scrolled up
  const prevMessagesCountRef = useRef(convMessages.length);
  useEffect(() => {
    if (convMessages.length > prevMessagesCountRef.current) {
      if (isScrolledUp) {
        setNewMessagesCount((prev) => prev + (convMessages.length - prevMessagesCountRef.current));
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesCountRef.current = convMessages.length;
  }, [convMessages.length, isScrolledUp]);

  // Close popovers on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (headerControlsRef.current && !headerControlsRef.current.contains(target)) {
        setShowTextSizeDropdown(false);
        setShowAccountSwitcher(false);
        setChatMenuOpen(false);
      }
      if (composerRef.current && !composerRef.current.contains(target)) {
        setShowEmojiPicker(false);
        setShowAIAssist(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowTextSizeDropdown(false);
        setShowAccountSwitcher(false);
        setChatMenuOpen(false);
        setShowEmojiPicker(false);
        setShowAIAssist(false);
        setConfirmDeleteConv(false);
        setDeleteDialogMsg(null);
        setLightboxImage(null);
        setActiveActionMsgId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Unmount cleanup: timers, active audio playback, voice recorder, and created object URLs
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.stop().catch(() => {});
        voiceRecorderRef.current = null;
      }
      speechService.stop();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  // Reset transient UI state & clear typing status when switching conversations
  const activeConvId = activeConversation?.id || null;
  useEffect(() => {
    setSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    setReplyTarget(null);
    setEditingMessageId(null);
    setInputText('');
    setShowEmojiPicker(false);
    setShowAIAssist(false);
    setChatMenuOpen(false);
    setShowTextSizeDropdown(false);
    setShowAccountSwitcher(false);
    setConfirmDeleteConv(false);
    setDeleteDialogMsg(null);
    setActiveActionMsgId(null);
    setIsScrolledUp(false);
    setNewMessagesCount(0);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (activeConvId) {
        sendTypingStatus(activeConvId, false);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.stop().catch(() => {});
        voiceRecorderRef.current = null;
        setIsRecordingVoice(false);
        setRecordingSeconds(0);
      }
    };
  }, [activeConvId]);

  // Subscribe to real-time network latency and quality changes
  useEffect(() => {
    const unsub = networkQuality.subscribe((metrics) => {
      setNetMetrics(metrics);
    });
    return () => unsub();
  }, []);

  // Handle inserting tone suggestion into draft input (never auto-sends!)
  const handleSelectSuggestion = (text: string, tone: string) => {
    setInputText(text);
    setSuggestionInsertedTone(tone);
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(() => setSuggestionInsertedTone(null), 3000);
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Load 4-Tone Categorized Smart Suggestions
  const suggestionsRequestRef = useRef<number>(0);
  const loadSmartSuggestions = useCallback(async () => {
    if (!activeConversation) return;
    const reqId = ++suggestionsRequestRef.current;
    setIsRefreshingSuggestions(true);
    try {
      const recent = convMessages.slice(-4).map((m) => ({ senderName: m.senderName, text: m.text || '' }));
      const chips = await SmartAIService.getCategorizedReplySuggestions(
        recent,
        currentUser.name,
        currentUser.preferredLanguage || 'en'
      );
      if (suggestionsRequestRef.current === reqId) {
        setSmartSuggestions(chips);
      }
    } catch (e) {
      console.warn('Smart suggestions load notice:', e);
    } finally {
      if (suggestionsRequestRef.current === reqId) {
        setIsRefreshingSuggestions(false);
      }
    }
  }, [activeConversation?.id, convMessages, currentUser.name, currentUser.preferredLanguage]);

  // Mark unread incoming messages as read only when needed
  const hasUnreadIncoming = useMemo(() => {
    if (!activeConversation) return false;
    return (
      (activeConversation.unreadCount || 0) > 0 ||
      convMessages.some((m) => m.senderId !== currentUser.id && m.status !== 'read')
    );
  }, [activeConversation?.id, activeConversation?.unreadCount, convMessages, currentUser.id]);

  useEffect(() => {
    if (!activeConversation || !hasUnreadIncoming) return;
    markConversationAsRead(activeConversation.id);
  }, [activeConversation?.id, hasUnreadIncoming, markConversationAsRead]);

  // Refresh Smart Suggestions on conversation switch or new messages
  useEffect(() => {
    if (!activeConversation) return;
    loadSmartSuggestions();
  }, [activeConversation?.id, convMessages.length]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050B14] text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,102,255,0.2)]">
          <Lock className="w-10 h-10 text-cyan-400" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white mb-2">TOLKFLOW Secure Workspace</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Select an encrypted direct conversation or collaborative Flow Room from the sidebar to start connecting.
        </p>
      </div>
    );
  }

  const isDirect = activeConversation.type === 'direct';
  const rawOtherContact = isDirect
    ? activeConversation.participants.find((p) => p.id !== currentUser.id)
    : null;
  const otherContact = rawOtherContact
    ? allUsers.find((u) => u.id === rawOtherContact.id) || rawOtherContact
    : null;
  const isContactBlocked = isDirect && otherContact ? blockedUserIds.includes(otherContact.id) : false;

  // Handle Send Message
  const handleSend = () => {
    if (!inputText.trim() || isContactBlocked) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    sendTypingStatus(activeConversation.id, false);

    if (editingMessageId) {
      editMessage(activeConversation.id, editingMessageId, inputText.trim());
      setEditingMessageId(null);
      showToast('Message updated.');
    } else {
      sendMessage(activeConversation.id, inputText.trim(), 'text', {
        replyTo: replyTarget
          ? { id: replyTarget.id, text: replyTarget.text, senderName: replyTarget.senderName }
          : undefined,
      });
      setReplyTarget(null);
    }

    setInputText('');
  };

  // Handle Voice Recording
  const handleStartVoiceRecord = async () => {
    try {
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      const recorder = await webrtcService.startVoiceRecording();
      voiceRecorderRef.current = recorder;
    } catch (err) {
      console.error('Failed to start voice recorder:', err);
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      showToast('Microphone unavailable. Check browser permissions.');
    }
  };

  const handleStopAndSendVoiceRecord = async () => {
    if (!voiceRecorderRef.current) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      const { url, duration } = await voiceRecorderRef.current.stop();
      sendMessage(activeConversation.id, 'Voice message', 'voice', {
        mediaUrl: url,
        mediaDuration: duration || recordingSeconds || 1,
      });
    } catch (err) {
      console.error('Error stopping voice recorder:', err);
      showToast('Failed to save voice recording.');
    } finally {
      setIsRecordingVoice(false);
      voiceRecorderRef.current = null;
      setRecordingSeconds(0);
    }
  };

  const handleCancelVoiceRecord = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (voiceRecorderRef.current) {
      try {
        await voiceRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingVoice(false);
    voiceRecorderRef.current = null;
    setRecordingSeconds(0);
  };

  // Handle File Upload with Progressive WebP Compression & Resumable Video Slicing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB platform limit
    if (file.size > MAX_FILE_BYTES) {
      showToast('File exceeds the 100 MB maximum limit.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    try {
      if (isImage) {
        const netOpts = networkQuality.getRecommendedImageQuality();
        const result = await mediaService.compressImage(file, {
          quality: netOpts.quality,
          maxWidth: netOpts.maxWidth,
        });
        const msgId = `msg_img_${Date.now()}`;
        sendMessage(activeConversation.id, file.name, 'image', {
          id: msgId,
          mediaUrl: result.dataUrl,
          thumbnailUrl: result.thumbnailDataUrl,
          mediaName: file.name,
          mediaSize: `${Math.max(1, Math.round(result.compressedBlob.size / 1024))} KB (saved ${result.compressionRatio}%)`,
          compressionRatio: result.compressionRatio,
          dimensions: result.dimensions,
          status: 'sending',
        });

        await mediaService.simulateChunkedUpload(result.compressedBlob, 128 * 1024, (prog) => {
          setUploadProgressMap((prev) => ({ ...prev, [msgId]: prog }));
        });
      } else if (isVideo) {
        const videoMeta = await mediaService.extractVideoMetadata(file);
        const msgId = `msg_vid_${Date.now()}`;
        const blobUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(blobUrl);
        sendMessage(activeConversation.id, file.name, 'video', {
          id: msgId,
          mediaUrl: blobUrl,
          thumbnailUrl: videoMeta.thumbnailUrl,
          mediaName: file.name,
          mediaDuration: Math.round(videoMeta.duration),
          mediaSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          videoResolution: videoMeta.resolution,
          status: 'sending',
        });

        await mediaService.simulateChunkedUpload(file, 256 * 1024, (prog) => {
          setUploadProgressMap((prev) => ({ ...prev, [msgId]: prog }));
        });
      } else {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        const sizeStr =
          file.size >= 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`;
        sendMessage(activeConversation.id, file.name, 'file', {
          mediaUrl: url,
          mediaName: file.name,
          mediaSize: sizeStr,
          status: 'sending',
        });
      }
    } catch (err) {
      console.error('File upload processing failed:', err);
      showToast('Failed to process selected file. Please try another file.');
    }
  };

  // Handle Tone Polish
  const handleTonePolish = async (tone: 'cyberpunk' | 'professional' | 'concise') => {
    if (!inputText.trim()) return;
    setAiGenerating(true);
    try {
      const rewritten = await SmartAIService.polishTone(inputText, tone);
      setInputText(rewritten);
      setShowAIAssist(false);
    } catch (err) {
      console.error('Tone polish failed:', err);
      showToast('AI tone refiner unavailable right now.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Filter messages if search is open
  const displayMessages = chatSearchQuery.trim()
    ? convMessages.filter((m) => (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : convMessages;

  const isWhatsApp = chatTheme === 'whatsapp';
  const isLight = theme === 'light';

  return (
    <div
      className={`flex-1 flex flex-col h-full relative select-none transition-colors ${
        isWhatsApp
          ? isLight
            ? 'bg-[#EFEAE2] text-[#111B21]'
            : 'bg-[#0B141A] text-[#E9EDEF]'
          : 'bg-[#050B14] text-slate-100'
      }`}
    >
      {/* Top Header */}
      <div
        className={`h-16 px-4 flex items-center justify-between z-20 transition-colors shadow-sm ${
          isWhatsApp
            ? isLight
              ? 'bg-[#075E54] text-white border-b border-[#054C44]'
              : 'bg-[#202C33] text-white border-b border-[#2A3942]'
            : 'bg-[#0A1124]/90 backdrop-blur-xl border-b border-slate-800/80 text-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={onToggleDetails}>
            <img
              src={isDirect && otherContact ? otherContact.avatar : activeConversation.avatar}
              alt={isDirect && otherContact ? otherContact.name : activeConversation.name}
              className={`w-10 h-10 rounded-full object-cover ring-2 ${
                isWhatsApp ? 'ring-[#25D366]' : 'ring-cyan-500/40'
              }`}
            />
            {isDirect && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  otherContact?.status === 'online' ? 'bg-[#25D366]' : 'bg-slate-400'
                }`}
              />
            )}
          </div>

          <div className="min-w-0 cursor-pointer" onClick={onToggleDetails}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold truncate text-white flex items-center gap-1.5">
                <span>{isDirect && otherContact ? otherContact.name : activeConversation.name}</span>
                {isDirect && otherContact && isProjectOwnerUser(otherContact, projectOwner) && (
                  <DvOwnerBadge size="xs" withLabel />
                )}
              </h3>
              <span title="E2EE Active" className="inline-flex">
                <ShieldCheck className={`w-3.5 h-3.5 ${isWhatsApp ? 'text-emerald-300' : 'text-cyan-400'}`} />
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/80 truncate">
              {peerTypingStatus[activeConversation.id] ? (
                <span className="text-[#25D366] font-semibold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping" />
                  <span>{peerTypingStatus[activeConversation.id]} is typing...</span>
                </span>
              ) : isDirect ? (
                <span>
                  {otherContact?.status === 'online' ? (
                    <span className="text-[#25D366] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      online
                    </span>
                  ) : (
                    <span>
                      {otherContact?.lastSeen
                        ? (() => {
                            try {
                              const diff = Math.floor((Date.now() - new Date(otherContact.lastSeen).getTime()) / 1000);
                              if (diff < 60) return 'last seen just now';
                              if (diff < 3600) return `last seen ${Math.floor(diff / 60)}m ago`;
                              if (diff < 86400) return `last seen today at ${new Date(otherContact.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                              return `last seen ${new Date(otherContact.lastSeen).toLocaleDateString()}`;
                            } catch {
                              return 'last seen recently';
                            }
                          })()
                        : 'offline'}
                    </span>
                  )}
                </span>
              ) : (
                <span>{activeConversation.participants.length} participants</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Language Pill */}
        <div ref={headerControlsRef} className="flex items-center gap-1.5">
          {/* Quick Account Switcher Button (Click-toggled for desktop + touchscreens) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAccountSwitcher((prev) => !prev);
                setShowTextSizeDropdown(false);
                setChatMenuOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600/30 hover:bg-blue-600/50 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-all shadow-sm active:scale-95"
              title="Switch user persona to test real-time two-way messaging"
            >
              <span className="text-[10px] text-slate-300 font-normal">Active:</span>
              <span className="font-bold text-white max-w-[80px] truncate">{currentUser.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-cyan-300 ml-0.5" />
            </button>
            {showAccountSwitcher && (
              <div className="absolute right-0 top-9 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Switch Test Account
                </div>
                {allUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      switchUser(u.id);
                      setShowAccountSwitcher(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      u.id === currentUser.id
                        ? 'bg-blue-600/30 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                    <div className="truncate flex-1">
                      <div className="truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{u.email}</div>
                    </div>
                    {u.id === currentUser.id && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Real-Time Network & Latency Indicator (Click opens Performance Lab) */}
          <button
            onClick={() => setPerformanceModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/40 text-emerald-300 border border-emerald-400/30 text-xs font-mono font-medium transition-all shadow-sm active:scale-95"
            title="Real-time Network Latency & Ultra-Fast Engine Status (Click to open Performance Lab & Stress Test)"
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span className="font-bold">{netMetrics.rttMs}ms</span>
            <span className="hidden sm:inline text-[10px] text-emerald-200/80 uppercase font-semibold">
              {netMetrics.tier === 'ultra' ? 'Ultra' : 'Online'}
            </span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
          </button>
          {/* WhatsApp / Cyber Style Switcher Pill */}
          <button
            onClick={() => setChatTheme(isWhatsApp ? 'cyber' : 'whatsapp')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isWhatsApp
                ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                : 'bg-blue-900/30 text-cyan-300 hover:bg-blue-900/50 border border-cyan-500/30'
            }`}
            title="Toggle between WhatsApp Classic Style (#075E54) and Deep Cyber Mode"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{isWhatsApp ? 'WhatsApp Mode' : 'Cyber Mode'}</span>
          </button>

          {/* Natural Voice & Speech Settings Button */}
          <button
            onClick={() => setVoiceSettingsOpen(true)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            title="Configure Natural AI Voice & Speech Settings"
          >
            <Volume2 className="w-4 h-4 text-[#25D366]" />
          </button>

          {/* Affordable Subscription Plans Button */}
          <button
            onClick={() => setPricingModalOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/40 text-xs font-semibold transition-all"
            title="View Affordable Subscriptions ($0 - $14.99/mo)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-300" />
            <span>Plans</span>
          </button>

          {/* Contact Language & Auto-Translate Indicator */}
          {isDirect && otherContact && (
            <button
              onClick={() => setLanguageModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/30 border border-white/20 text-xs text-white transition-colors"
              title="Click to change your translation target language"
            >
              <span>{getLanguageByCode(otherContact.preferredLanguage || 'en')?.flag}</span>
              <span className="font-semibold text-white text-[11px] truncate max-w-[85px]">
                {getLanguageByCode(otherContact.preferredLanguage || 'en')?.name}
              </span>
              <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                AI
              </span>
            </button>
          )}

          {/* Text Size Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTextSizeDropdown((prev) => !prev);
                setChatMenuOpen(false);
                setShowAccountSwitcher(false);
              }}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors flex items-center gap-1"
              title="Adjust message reading text size"
            >
              <Type className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-mono font-bold uppercase opacity-80">{chatTextSize}</span>
            </button>
            {showTextSizeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-[#0F172A] border border-cyan-500/30 p-2 shadow-2xl z-40 text-xs animate-in fade-in slide-in-from-top-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 block mb-1">
                  Text Reading Size
                </span>
                {[
                  { id: 'sm', label: 'Small (12px)' },
                  { id: 'base', label: 'Default (14px)' },
                  { id: 'lg', label: 'Large (16px)' },
                  { id: 'xl', label: 'Extra Large (18px)' },
                ].map((sizeOpt) => (
                  <button
                    key={sizeOpt.id}
                    type="button"
                    onClick={() => {
                      setChatTextSize(sizeOpt.id as any);
                      setShowTextSizeDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      chatTextSize === sizeOpt.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{sizeOpt.label}</span>
                    {chatTextSize === sizeOpt.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setChatSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-colors ${
              searchOpen ? 'text-[#25D366] bg-black/30' : 'text-white/80 hover:text-white hover:bg-black/20'
            }`}
            title="Search in conversation (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Voice Call */}
          <button
            type="button"
            onClick={() => startCall(otherContact || activeConversation, 'voice')}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            title="HD Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call */}
          <button
            type="button"
            onClick={() => startCall(otherContact || activeConversation, 'video')}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            title="HD Video Conference"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* 3-Dots Conversation Options Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setChatMenuOpen((prev) => !prev);
                setShowTextSizeDropdown(false);
                setShowAccountSwitcher(false);
              }}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors"
              title="Conversation Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {chatMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#0F172A] border border-slate-700 p-1.5 shadow-2xl z-40 text-xs animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    pinConversation(activeConversation.id);
                    setChatMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Pin className="w-4 h-4 text-cyan-400" />
                  <span>{activeConversation.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
                </button>

                <button
                  onClick={() => {
                    muteConversation(activeConversation.id);
                    setChatMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  {activeConversation.isMuted ? (
                    <>
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span>Unmute Notifications</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 text-amber-400" />
                      <span>Mute Notifications</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    archiveConversation(activeConversation.id);
                    setChatMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4 text-blue-400" />
                  <span>{activeConversation.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                </button>

                <button
                  onClick={() => {
                    markConversationUnread(activeConversation.id);
                    setChatMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Mark as Unread</span>
                </button>

                {isDirect && otherContact && (
                  <button
                    onClick={() => {
                      toggleBlockUser(otherContact.id);
                      setChatMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                      isContactBlocked
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>{isContactBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteConv(true);
                    setChatMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Conversation</span>
                </button>
              </div>
            )}
          </div>

          {/* Details toggle */}
          <button
            onClick={onToggleDetails}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            title="Conversation Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upgraded In-Chat Search Bar with Navigation */}
      {searchOpen && (
        <div className="px-4 py-2 bg-slate-900 border-b border-cyan-500/30 flex items-center gap-2 animate-in slide-in-from-top duration-150 text-xs">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => {
              setChatSearchQuery(e.target.value);
              setCurrentMatchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) handlePrevSearchMatch();
                else handleNextSearchMatch();
              } else if (e.key === 'Escape') {
                setSearchOpen(false);
                setChatSearchQuery('');
              }
            }}
            placeholder="Search messages (Enter for next, Shift+Enter for prev)..."
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none"
            autoFocus
          />
          {chatSearchQuery && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[11px] font-mono text-cyan-300">
                {matchingMessageIds.length > 0
                  ? `${currentMatchIndex + 1} of ${matchingMessageIds.length}`
                  : 'No matches'}
              </span>
              <button
                onClick={handlePrevSearchMatch}
                disabled={matchingMessageIds.length === 0}
                className="p-1 hover:text-white disabled:opacity-40"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextSearchMatch}
                disabled={matchingMessageIds.length === 0}
                className="p-1 hover:text-white disabled:opacity-40"
                title="Next match (Enter)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setChatSearchQuery('');
                  setCurrentMatchIndex(0);
                }}
                className="p-1 hover:text-white"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setSearchOpen(false);
              setChatSearchQuery('');
            }}
            className="text-slate-400 hover:text-white p-1"
            title="Close search (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="px-4 py-2 bg-blue-950/40 border-b border-cyan-500/20 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 text-cyan-400 rotate-45 flex-shrink-0" />
            <span className="font-semibold text-cyan-300 flex-shrink-0">Pinned:</span>
            <span className="truncate">{pinnedMessage.text}</span>
          </div>
          <button
            onClick={() => pinMessage(activeConversation.id, pinnedMessage.id)}
            className="text-slate-400 hover:text-slate-200 ml-2"
            title="Unpin message"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages Scroll View */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 relative"
      >
        {/* Load Earlier History / Pagination */}
        {convMessages.length > 5 && (
          <div className="flex justify-center my-1">
            <button
              onClick={() => setEarlierLoaded(true)}
              className="text-[11px] text-slate-400 hover:text-cyan-300 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 px-3.5 py-1 rounded-full transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{earlierLoaded ? 'Showing entire message history' : 'Load earlier messages'}</span>
            </button>
          </div>
        )}

        {/* E2EE System Notice */}
        <div className="flex justify-center my-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/20 text-[11px] text-cyan-300/80 shadow-[0_0_15px_rgba(0,229,255,0.06)]">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Messages are end-to-end encrypted with AES-GCM-256 forward secrecy.</span>
          </div>
        </div>

        {displayMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className="flex justify-center my-2">
                <span className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isActiveSearchMatch =
            chatSearchQuery.trim().length > 0 && matchingMessageIds[currentMatchIndex] === msg.id;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              onClick={() => {
                setActiveActionMsgId((prev) => (prev === msg.id ? null : msg.id));
              }}
              className={`group flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} ${
                isActiveSearchMatch ? 'ring-2 ring-amber-400/70 rounded-2xl p-1 -m-1 bg-amber-500/5' : ''
              }`}
            >
              {/* Contact avatar for incoming messages in groups */}
              {!isMe && (
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mb-1"
                />
              )}

              {/* Message Bubble Container */}
              <div className={`relative max-w-[85%] md:max-w-[70%] space-y-1`}>
                {/* Reply quote banner if attached */}
                {msg.replyTo && (
                  <div className="px-3 py-1.5 rounded-lg bg-black/30 border-l-2 border-cyan-400 text-xs text-slate-300">
                    <span className="font-semibold text-cyan-300 block">
                      {msg.replyTo.senderName}
                    </span>
                    <p className="truncate text-[11px] text-slate-400">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Main Message Bubble */}
                <div
                  className={`p-3.5 relative shadow-md transition-all ${
                    isWhatsApp
                      ? isMe
                        ? isLight
                          ? 'bg-[#D9FDD3] text-[#111B21] rounded-2xl rounded-tr-xs border border-[#C2E8BC] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'
                          : 'bg-[#005C4B] text-[#E9EDEF] rounded-2xl rounded-tr-xs border border-[#02735E] shadow-md'
                        : isLight
                        ? 'bg-[#FFFFFF] text-[#111B21] rounded-2xl rounded-tl-xs border border-slate-200/80 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'
                        : 'bg-[#202C33] text-[#E9EDEF] rounded-2xl rounded-tl-xs border border-[#2B3942] shadow-md'
                      : isMe
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-xs border border-blue-500/40 shadow-[0_4px_16px_rgba(0,102,255,0.25)]'
                      : 'bg-[#0E172F] text-slate-100 rounded-2xl rounded-bl-xs border border-slate-700/60 shadow-lg'
                  }`}
                >
                  {/* Sender Name in group */}
                  {!isMe && activeConversation.type === 'group' && (
                    <span className={`text-xs font-semibold flex items-center gap-1 mb-1 ${isWhatsApp ? 'text-[#128C7E]' : 'text-cyan-400'}`}>
                      <span>{msg.senderName}</span>
                      {isProjectOwnerUser({ id: msg.senderId, name: msg.senderName }, projectOwner) && (
                        <DvOwnerBadge size="xs" />
                      )}
                    </span>
                  )}

                  {/* Message Body rendering */}
                  {msg.type === 'voice' && (
                    <div className="space-y-2 py-1 min-w-[220px] sm:min-w-[270px]">
                      <div className="flex items-center gap-3">
                        {/* Play/Pause Button */}
                        <button
                          onClick={() => handlePlayVoice(msg)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md ${
                            playingVoiceId === msg.id
                              ? 'bg-rose-500 text-white animate-pulse'
                              : isWhatsApp
                              ? 'bg-[#25D366] text-white hover:bg-[#20bd5a]'
                              : 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,229,255,0.6)]'
                          }`}
                          title={playingVoiceId === msg.id ? 'Pause Voice Note' : 'Play Voice Note'}
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Animated Waveform graphic with playback scrubbing feel */}
                        <div className="flex-1 flex items-center gap-0.5 h-7">
                          {[12, 24, 18, 30, 20, 14, 28, 22, 10, 16, 26, 18, 14, 22, 16, 20, 12, 24].map(
                            (h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`w-1 rounded-full transition-all duration-150 ${
                                  playingVoiceId === msg.id
                                    ? i % 2 === 0
                                      ? 'bg-[#25D366] animate-pulse h-full'
                                      : 'bg-cyan-400 animate-pulse'
                                    : isWhatsApp
                                    ? isMe && isLight
                                      ? 'bg-[#075E54]/70'
                                      : 'bg-slate-400'
                                    : isMe
                                    ? 'bg-blue-300/70'
                                    : 'bg-slate-500'
                                }`}
                              />
                            )
                          )}
                        </div>

                        {/* Duration */}
                        <span className="text-[11px] font-mono opacity-80 flex-shrink-0">
                          {msg.mediaDuration ? formatDuration(msg.mediaDuration) : '0:14'}
                        </span>
                      </div>

                      {/* Voice Note Controls Footer: Speed selector, Download, Delete, AI Translate */}
                      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-black/10 dark:border-white/10 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {/* Playback speed toggle */}
                          <button
                            onClick={cycleVoicePlaybackRate}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-colors"
                            title="Playback Speed (1x, 1.5x, 2x)"
                          >
                            {voicePlaybackRate}x
                          </button>

                          {/* AI Voice Translation Button */}
                          <button
                            onClick={() => handleTranslateVoice(msg)}
                            disabled={translatingVoiceId === msg.id}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors font-medium"
                            title="Translate voice note & read aloud in your preferred language"
                          >
                            {translatingVoiceId === msg.id ? (
                              <Sparkles className="w-3 h-3 animate-spin text-emerald-400" />
                            ) : (
                              <Languages className="w-3 h-3 text-emerald-500" />
                            )}
                            <span>{translatingVoiceId === msg.id ? 'Translating...' : 'Translate Voice'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Download Voice File */}
                          {msg.mediaUrl && (
                            <a
                              href={msg.mediaUrl}
                              download={`tolkflow_voice_${msg.id}.webm`}
                              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
                              title="Download voice note file"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          )}

                          {/* Delete my voice note */}
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(activeConversation.id, msg.id, true)}
                              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 text-rose-400 transition-opacity"
                              title="Delete voice message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="relative rounded-xl overflow-hidden mb-2 group/img max-h-72 bg-black/20">
                      {/* Micro-thumbnail Blur Preview for instant perceived loading */}
                      {msg.thumbnailUrl && (
                        <img
                          src={msg.thumbnailUrl}
                          alt="thumbnail blur preview"
                          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105 opacity-70"
                        />
                      )}
                      <img
                        src={msg.mediaUrl}
                        alt="attachment"
                        onClick={() => setLightboxImage(msg.mediaUrl || null)}
                        loading="lazy"
                        className="relative z-10 max-h-72 w-full object-cover rounded-xl hover:scale-[1.02] transition-transform cursor-pointer"
                        title="Click to zoom image"
                      />
                      {msg.compressionRatio && (
                        <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-emerald-300 font-mono border border-emerald-400/30 flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5 text-emerald-400" />
                          <span>-{msg.compressionRatio}% WebP</span>
                        </div>
                      )}
                      {uploadProgressMap[msg.id] !== undefined && uploadProgressMap[msg.id] < 100 && (
                        <div className="absolute bottom-2 left-2 right-2 z-20 bg-black/75 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                          <div className="flex justify-between text-[10px] text-emerald-300 font-mono mb-1">
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                              <span>Instant Ingestion</span>
                            </span>
                            <span>{uploadProgressMap[msg.id]}%</span>
                          </div>
                          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#25D366] h-full transition-all duration-150"
                              style={{ width: `${uploadProgressMap[msg.id]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.type === 'video' && msg.mediaUrl && (
                    <div className="relative rounded-xl overflow-hidden mb-2 bg-black/40 group/vid max-w-sm">
                      <video
                        src={msg.mediaUrl}
                        poster={msg.thumbnailUrl}
                        controls
                        preload="metadata"
                        className="w-full max-h-72 rounded-xl object-contain bg-black"
                      />
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-gray-300 bg-black/60 backdrop-blur-sm">
                        <span className="flex items-center space-x-1.5 font-mono text-[10px]">
                          <Video className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{msg.videoResolution || 'HD Video'}</span>
                        </span>
                        {msg.mediaSize && <span className="text-[10px] text-gray-400">{msg.mediaSize}</span>}
                      </div>
                      {uploadProgressMap[msg.id] !== undefined && uploadProgressMap[msg.id] < 100 && (
                        <div className="p-2 bg-black/80 border-t border-gray-800">
                          <div className="flex justify-between text-[10px] text-cyan-300 font-mono mb-1">
                            <span>Resumable Chunk Upload</span>
                            <span>{uploadProgressMap[msg.id]}%</span>
                          </div>
                          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full transition-all duration-150"
                              style={{ width: `${uploadProgressMap[msg.id]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-black/10 dark:border-white/10 mb-1">
                      <FileText className={`w-6 h-6 ${isWhatsApp ? 'text-[#128C7E]' : 'text-cyan-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{msg.mediaName}</p>
                        <p className="text-[10px] opacity-70">{msg.mediaSize || 'Document'}</p>
                      </div>
                      <a
                        href={msg.mediaUrl}
                        download={msg.mediaName}
                        className="p-1.5 rounded-lg bg-black/15 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Standard Text Message with Speaker Icon Button Beside Every Message */}
                  {(!msg.type || msg.type === 'text') && (
                    <div className="flex items-start justify-between gap-3">
                      <p className={`${textSizeClass} leading-relaxed whitespace-pre-wrap break-words flex-1`}>
                        {renderMessageContent(msg.text)}
                      </p>

                      {/* Natural AI Speech / TTS Reader Button beside every message */}
                      <div className="flex items-center gap-1 flex-shrink-0 self-start mt-0.5">
                        <button
                          onClick={() => handleSpeakMessage(msg)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            speakingMessageId === msg.id
                              ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                              : isWhatsApp && isMe && isLight
                              ? 'text-[#075E54] hover:bg-[#C2E8BC]'
                              : isWhatsApp && isMe
                              ? 'text-emerald-300 hover:bg-emerald-900/40'
                              : isWhatsApp && !isMe && isLight
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-cyan-400 hover:bg-cyan-500/20'
                          }`}
                          title={
                            speakingMessageId === msg.id
                              ? 'Stop reading aloud'
                              : 'Read aloud with Natural AI Voice'
                          }
                        >
                          {speakingMessageId === msg.id ? (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Speaking Speed cycle button when active */}
                        {speakingMessageId === msg.id && (
                          <button
                            onClick={cycleSpeakingRate}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/30 dark:bg-black/50 text-emerald-300 border border-emerald-400/30 hover:bg-black/50 transition-colors"
                            title="Speaking Speed (1x, 1.25x, 1.5x, 2x)"
                          >
                            {speakingRate}x
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Multilingual Translation Toggle Pill */}
                  {msg.originalText && msg.translatedText && msg.originalText !== msg.translatedText && (
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-xs">
                      <button
                        onClick={() => toggleMessageTranslation(activeConversation.id, msg.id)}
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
                          isWhatsApp
                            ? 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/15 text-emerald-700 dark:text-emerald-300 hover:bg-black/10'
                            : 'bg-black/20 hover:bg-black/40 text-cyan-300 border-cyan-400/20'
                        }`}
                        title="Switch between translated and original text"
                      >
                        <Languages className="w-3 h-3 text-[#25D366]" />
                        <span>{msg.showOriginal ? 'Show Translation' : 'View Original'}</span>
                      </button>
                      {msg.detectedLanguage && (
                        <span className="text-[10px] opacity-75 font-mono">
                          {msg.showOriginal
                            ? `Source: ${msg.detectedLanguage}`
                            : `${msg.detectedLanguage} ➔ ${currentUser.preferredLanguage || 'en'}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Timestamp & Delivery status with WhatsApp blue checkmarks */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75">
                    {msg.isEdited && <span className="italic font-mono">(edited)</span>}
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span className="flex items-center">
                        {msg.status === 'read' ? (
                          <span title="Seen / Read (Double Blue Tick)" className="inline-flex">
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          </span>
                        ) : msg.status === 'delivered' ? (
                          <span title="Delivered (Double Tick)" className="inline-flex">
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                        ) : msg.status === 'sent' ? (
                          <span title="Sent (Single Tick)" className="inline-flex">
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                        ) : (
                          <span title="Sending..." className="inline-flex">
                            <Clock className="w-3 h-3 text-slate-400 animate-spin" />
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Reactions Badges */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => addReaction(activeConversation.id, msg.id, r.emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                          r.userIds.includes(currentUser.id)
                            ? 'bg-blue-600/40 border border-cyan-400 text-white'
                            : 'bg-slate-800/80 border border-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-semibold text-[10px]">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Floating Quick Actions Bar on Hover or Tap */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute -top-9 md:top-0 ${
                    isMe ? 'right-0 md:right-auto md:-left-36' : 'left-0 md:left-auto md:-right-36'
                  } ${
                    activeActionMsgId === msg.id ? 'flex' : 'hidden group-hover:flex'
                  } items-center gap-0.5 p-1 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-20`}
                >
                  {/* Quick Reactions */}
                  {['👍', '❤️', '🔥', '🚀'].map((em) => (
                    <button
                      key={em}
                      onClick={() => addReaction(activeConversation.id, msg.id, em)}
                      className="p-1 hover:scale-125 transition-transform text-xs"
                    >
                      {em}
                    </button>
                  ))}

                  {/* Copy Message Text */}
                  <button
                    onClick={() => handleCopyMessage(msg.text)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Copy Text to Clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Translation */}
                  {msg.originalText && msg.translatedText && (
                    <button
                      onClick={() => toggleMessageTranslation(activeConversation.id, msg.id)}
                      className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Toggle Translation"
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Reply */}
                  <button
                    onClick={() => setReplyTarget(msg)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Quote Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  {/* Forward */}
                  <button
                    onClick={() => setForwardTarget(msg)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Forward Message"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Pin */}
                  <button
                    onClick={() => pinMessage(activeConversation.id, msg.id)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Pin Message"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit (if my text message) */}
                  {isMe && msg.type === 'text' && (
                    <button
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setInputText(msg.text);
                        textareaRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-amber-300 transition-colors"
                      title="Edit Message"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete (with modal options) */}
                  <button
                    onClick={() => setDeleteDialogMsg({ id: msg.id, isMe })}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Report Message */}
                  {!isMe && (
                    <button
                      onClick={() =>
                        openReportModal(
                          'message',
                          msg.id,
                          `Message from ${msg.senderName}: "${(msg.text || '').slice(0, 35)}..."`
                        )
                      }
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Report Abusive Message"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Typing Presence Indicator */}
        {peerTypingStatus[activeConversation.id] && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 bg-slate-900/60 px-3.5 py-1.5 rounded-full w-max border border-cyan-500/20">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-medium">{peerTypingStatus[activeConversation.id]} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4-Tone Categorized AI Smart Suggestions Strip (Never sends automatically!) */}
      {showSmartSuggestions && smartSuggestions && !isRecordingVoice && (
        <div
          className={`px-3 sm:px-4 py-2 border-t flex flex-col gap-1.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            isWhatsApp
              ? isLight
                ? 'bg-[#F0F2F5] border-[#E2E8F0] text-[#111B21]'
                : 'bg-[#182229] border-[#222E35] text-[#E9EDEF]'
              : 'bg-[#080E1E]/95 border-slate-800/80 text-slate-100 backdrop-blur-md'
          }`}
        >
          {/* Header row with Title, Hint, Regenerate, Dismiss */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-cyan-400">
              <Sparkles className={`w-3.5 h-3.5 ${isRefreshingSuggestions ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
              <span className="font-semibold text-xs tracking-wide">
                AI Smart Suggestions
              </span>
              <span className="hidden sm:inline text-[10px] text-slate-400">
                • 4 Tone Options (Click to insert & edit before sending)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {suggestionInsertedTone && (
                <span className="text-[10px] text-emerald-400 font-medium animate-pulse flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Check className="w-3 h-3" />
                  <span>Draft inserted! Review or edit before sending.</span>
                </span>
              )}
              <button
                type="button"
                onClick={loadSmartSuggestions}
                disabled={isRefreshingSuggestions}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                title="Generate fresh suggestions"
              >
                <RotateCcw className={`w-3 h-3 ${isRefreshingSuggestions ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline text-[10px]">Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSmartSuggestions(false)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                title="Dismiss suggestions"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Distinct Tone Suggestion Chips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* 1. ⚡ Short Reply */}
            <button
              type="button"
              onClick={() => handleSelectSuggestion(smartSuggestions.short, 'short')}
              className={`p-2.5 rounded-xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group flex flex-col justify-between ${
                isWhatsApp
                  ? isLight
                    ? 'bg-white hover:bg-amber-50/50 border-amber-200/70 shadow-xs'
                    : 'bg-[#202C33] hover:bg-[#2A3942] border-[#2A3942]'
                  : 'bg-[#0E172F]/90 hover:bg-blue-900/30 border-amber-500/30 hover:border-amber-400 shadow-sm'
              }`}
              title="Click to insert Short Reply into draft (never auto-sends!)"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Short</span>
                </span>
                <span className="text-[9px] text-slate-400 group-hover:text-amber-300">Insert ➔</span>
              </div>
              <p className="text-xs truncate font-medium text-slate-200">
                "{smartSuggestions.short}"
              </p>
            </button>

            {/* 2. 😊 Friendly Reply */}
            <button
              type="button"
              onClick={() => handleSelectSuggestion(smartSuggestions.friendly, 'friendly')}
              className={`p-2.5 rounded-xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group flex flex-col justify-between ${
                isWhatsApp
                  ? isLight
                    ? 'bg-white hover:bg-emerald-50/50 border-emerald-200/70 shadow-xs'
                    : 'bg-[#202C33] hover:bg-[#2A3942] border-[#2A3942]'
                  : 'bg-[#0E172F]/90 hover:bg-blue-900/30 border-emerald-500/30 hover:border-emerald-400 shadow-sm'
              }`}
              title="Click to insert Friendly Reply into draft (never auto-sends!)"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <span>😊</span>
                  <span>Friendly</span>
                </span>
                <span className="text-[9px] text-slate-400 group-hover:text-emerald-300">Insert ➔</span>
              </div>
              <p className="text-xs truncate font-medium text-slate-200">
                "{smartSuggestions.friendly}"
              </p>
            </button>

            {/* 3. 💼 Professional Reply */}
            <button
              type="button"
              onClick={() => handleSelectSuggestion(smartSuggestions.professional, 'professional')}
              className={`p-2.5 rounded-xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group flex flex-col justify-between ${
                isWhatsApp
                  ? isLight
                    ? 'bg-white hover:bg-blue-50/50 border-blue-200/70 shadow-xs'
                    : 'bg-[#202C33] hover:bg-[#2A3942] border-[#2A3942]'
                  : 'bg-[#0E172F]/90 hover:bg-blue-900/30 border-cyan-500/30 hover:border-cyan-400 shadow-sm'
              }`}
              title="Click to insert Professional Reply into draft (never auto-sends!)"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <span>💼</span>
                  <span>Professional</span>
                </span>
                <span className="text-[9px] text-slate-400 group-hover:text-cyan-300">Insert ➔</span>
              </div>
              <p className="text-xs truncate font-medium text-slate-200">
                "{smartSuggestions.professional}"
              </p>
            </button>

            {/* 4. 🤝 Polite Reply */}
            <button
              type="button"
              onClick={() => handleSelectSuggestion(smartSuggestions.polite, 'polite')}
              className={`p-2.5 rounded-xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group flex flex-col justify-between ${
                isWhatsApp
                  ? isLight
                    ? 'bg-white hover:bg-purple-50/50 border-purple-200/70 shadow-xs'
                    : 'bg-[#202C33] hover:bg-[#2A3942] border-[#2A3942]'
                  : 'bg-[#0E172F]/90 hover:bg-blue-900/30 border-purple-500/30 hover:border-purple-400 shadow-sm'
              }`}
              title="Click to insert Polite Reply into draft (never auto-sends!)"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <span>🤝</span>
                  <span>Polite</span>
                </span>
                <span className="text-[9px] text-slate-400 group-hover:text-purple-300">Insert ➔</span>
              </div>
              <p className="text-xs truncate font-medium text-slate-200">
                "{smartSuggestions.polite}"
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Reply Banner if Replying to a message */}
      {replyTarget && (
        <div className="px-4 py-2 bg-slate-900 border-t border-cyan-500/30 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-4 h-4 text-cyan-400" />
            <span>
              Replying to <b className="text-cyan-300">{replyTarget.senderName}</b>:
            </span>
            <span className="truncate italic text-slate-400">"{replyTarget.text}"</span>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessageId && (
        <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <span>Editing selected message...</span>
          <button
            onClick={() => {
              setEditingMessageId(null);
              setInputText('');
            }}
            className="text-amber-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      )}

      {/* Voice Recording Bar */}
      {isRecordingVoice ? (
        <div className="p-3 bg-[#0A1124] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-cyan-400 animate-wave-1 rounded-full" />
              <span className="w-1 h-5 bg-cyan-400 animate-wave-2 rounded-full" />
              <span className="w-1 h-2 bg-cyan-400 animate-wave-3 rounded-full" />
              <span className="w-1 h-6 bg-cyan-400 animate-wave-4 rounded-full" />
              <span className="w-1 h-4 bg-cyan-400 animate-wave-5 rounded-full" />
            </div>
            <span className="text-sm font-mono text-white">
              {formatDuration(recordingSeconds)}
            </span>
            <span className="text-xs text-slate-400">Recording voice message...</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelVoiceRecord}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStopAndSendVoiceRecord}
              className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-xs font-bold text-black shadow-[0_0_15px_rgba(0,229,255,0.6)] transition-all"
            >
              Send Voice
            </button>
          </div>
        </div>
      ) : (
        /* Standard Message Input Bar */
        <div ref={composerRef} className="p-3 bg-[#0A1124] border-t border-slate-800/80 relative">
          {/* AI Tone Assistant Popover */}
          {showAIAssist && (
            <div className="absolute bottom-full mb-2 right-4 p-3 rounded-2xl bg-[#0F1A36] border border-cyan-500/30 shadow-2xl space-y-2 z-30 w-72">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI Tone Refiner
                </span>
                <button
                  onClick={() => setShowAIAssist(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Transform your draft message instantly using Gemini 3.8 Flash:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'cyberpunk', label: 'Futuristic Cyberpunk 🌌' },
                  { id: 'professional', label: 'Executive Professional 💼' },
                  { id: 'concise', label: 'Ultra Concise ⚡' },
                ].map((t) => (
                  <button
                    key={t.id}
                    disabled={aiGenerating || !inputText.trim()}
                    onClick={() => handleTonePolish(t.id as any)}
                    className="w-full text-left px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-blue-600/30 text-xs text-slate-200 border border-slate-700/60 transition-colors disabled:opacity-50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji / Sticker Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-4 p-3 rounded-2xl bg-[#0F1A36] border border-slate-700 shadow-2xl z-30 w-72">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">Reactions & Stickers</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2 text-xl">
                {['⚡', '🔥', '🚀', '✨', '💙', '🤖', '🔒', '🛡️', '👍', '🎉', '💯', '👏', '🧠', '🌌', '👀', '🎯', '🌊', '⭐'].map(
                  (em) => (
                    <button
                      key={em}
                      onClick={() => {
                        setInputText((prev) => prev + em);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:bg-slate-800 rounded-lg transition-transform hover:scale-125"
                    >
                      {em}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Blocked Contact Warning Banner */}
          {isContactBlocked && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  You have blocked <b>{otherContact?.name}</b>. You cannot send or receive messages until you unblock them.
                </span>
              </div>
              <button
                type="button"
                onClick={() => otherContact && toggleBlockUser(otherContact.id)}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex-shrink-0"
              >
                Unblock
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isContactBlocked}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
              title="Attach File, Photo or Video"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Camera Upload & Live Snapshot Button */}
            <button
              onClick={() => setCameraModalOpen(true)}
              disabled={isContactBlocked}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
              title="Capture Live Camera Snapshot"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Emoji Trigger */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isContactBlocked}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Toggle AI Smart Suggestions Strip if dismissed */}
            {!showSmartSuggestions && smartSuggestions && (
              <button
                type="button"
                onClick={() => setShowSmartSuggestions(true)}
                className="p-2 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors animate-pulse"
                title="Show AI Smart Reply Suggestions"
              >
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </button>
            )}

            {/* Input Box */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                disabled={isContactBlocked}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (activeConversation) {
                    sendTypingStatus(activeConversation.id, true);
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    typingTimerRef.current = setTimeout(() => {
                      sendTypingStatus(activeConversation.id, false);
                    }, 1800);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (activeConversation) {
                      sendTypingStatus(activeConversation.id, false);
                    }
                    handleSend();
                  } else if (e.key === 'Escape') {
                    if (replyTarget) setReplyTarget(null);
                    if (editingMessageId) {
                      setEditingMessageId(null);
                      setInputText('');
                    }
                  }
                }}
                placeholder={
                  isContactBlocked
                    ? 'Contact is blocked. Unblock them to send a message.'
                    : 'Type a message (Enter to send, Shift+Enter for new line)...'
                }
                rows={1}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-slate-400 outline-none resize-none transition-all disabled:opacity-40"
              />

              {/* AI Polish Button inside input */}
              {inputText.trim().length > 3 && !isContactBlocked && (
                <button
                  onClick={() => setShowAIAssist(!showAIAssist)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Enhance tone with AI"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Voice record trigger or Send Button */}
            {inputText.trim() ? (
              <button
                onClick={() => {
                  if (activeConversation) {
                    sendTypingStatus(activeConversation.id, false);
                  }
                  handleSend();
                }}
                disabled={isContactBlocked}
                className={`p-2.5 rounded-full text-white shadow-md transition-all flex-shrink-0 cursor-pointer disabled:opacity-40 ${
                  isWhatsApp
                    ? 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_2px_8px_rgba(37,211,102,0.4)]'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(0,102,255,0.4)]'
                }`}
                title="Send Message (Enter)"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleStartVoiceRecord}
                disabled={isContactBlocked}
                className={`p-2.5 rounded-full transition-all flex-shrink-0 cursor-pointer disabled:opacity-40 ${
                  isWhatsApp
                    ? 'bg-[#128C7E] hover:bg-[#075E54] text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white'
                }`}
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Jump to Latest Button with New Messages Counter */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-2xl transition-all active:scale-95 animate-bounce"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>
            {newMessagesCount > 0
              ? `${newMessagesCount} New Message${newMessagesCount > 1 ? 's' : ''}`
              : 'Jump to Latest'}
          </span>
        </button>
      )}

      {/* Copy Confirmation Toast */}
      {copiedToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Delete Message Confirmation Dialog */}
      {deleteDialogMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Delete Message?</h4>
                <p className="text-[11px] text-slate-400">Select deletion scope</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {deleteDialogMsg.isMe
                ? 'You can delete this message for everyone in the conversation, or remove it from your device only.'
                : 'This message will be removed from your chat history.'}
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {deleteDialogMsg.isMe && (
                <button
                  onClick={() => {
                    deleteMessage(activeConversation.id, deleteDialogMsg.id, true);
                    setDeleteDialogMsg(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => {
                  deleteMessage(activeConversation.id, deleteDialogMsg.id, false);
                  setDeleteDialogMsg(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Delete for Me Only
              </button>
              <button
                onClick={() => setDeleteDialogMsg(null)}
                className="w-full py-2 px-3 rounded-xl text-slate-400 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Modal (iFrame-safe replacement for window.confirm) */}
      {confirmDeleteConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Delete Conversation?</h4>
                <p className="text-[11px] text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove this conversation and its local message history?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteConv(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConversation(activeConversation.id);
                  setConfirmDeleteConv(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardTarget && (
        <ForwardModal message={forwardTarget} onClose={() => setForwardTarget(null)} />
      )}

      {/* Ultra-Fast Performance Lab & Concurrent Stress Test Modal */}
      <PerformanceTestModal />

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="zoom"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-cyan-500/30"
          />
        </div>
      )}
    </div>
  );
};
