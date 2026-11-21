export type UserRole = 'user' | 'moderator' | 'superadmin';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: 'African' | 'European' | 'Asian' | 'Americas' | 'Middle Eastern';
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  preferredLanguage: string; // Language code, e.g. 'rw', 'zh-CN', 'en', 'fr', 'es'
  avatar: string;
  bio: string;
  status: 'online' | 'in_flow' | 'busy' | 'offline';
  statusText?: string;
  lastSeen?: string;
  verified: boolean;
  isVerified?: boolean;
  accountStatus?: 'unverified' | 'verified' | 'suspended';
  verifiedAt?: string | null;
  role: UserRole;
  interests: string[];
  followersCount: number;
  followingCount: number;
  twoFactorEnabled: boolean;
  createdAt: string;
  isBlocked?: boolean;
  isProjectOwner?: boolean;
  readReceiptsEnabled?: boolean;
  plan?: SubscriptionPlanType;
}

export interface VerificationStats {
  totalUsers: number;
  verifiedCount: number;
  unverifiedCount: number;
  suspendedCount: number;
  verificationRatePercent: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MessageReply {
  id: string;
  text: string;
  senderName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  // Database compatibility aliases
  message_id?: string;
  sender_id?: string;
  receiver_id?: string;
  conversation_id?: string;
  message_status?: 'sending' | 'sent' | 'delivered' | 'read';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  senderName: string;
  senderAvatar: string;
  text: string; // The primary display text
  originalText?: string; // Untranslated source text
  translatedText?: string; // Translated target text
  detectedLanguage?: string; // Language detected on input
  targetLanguage?: string; // Recipient's language
  showOriginal?: boolean; // Toggle state in UI
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'voice' | 'image' | 'video' | 'file' | 'system';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  mediaDuration?: number; // In seconds
  thumbnailUrl?: string; // Progressive load micro-preview
  uploadProgress?: number; // 0-100% live upload progress indicator
  dimensions?: { width: number; height: number };
  compressionRatio?: number; // e.g. 74%
  videoResolution?: string;
  tempId?: string;
  reactions: MessageReaction[];
  replyTo?: MessageReply;
  isEdited?: boolean;
  isPinned?: boolean;
  isEncrypted?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string;
  participantIds: string[];
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isEncrypted?: boolean;
  createdAt: string;
  description?: string;
  adminIds?: string[];
  autoTranslate?: boolean;
}

export type PostCategory =
  | 'personal'
  | 'media'
  | 'news'
  | 'educational'
  | 'business'
  | 'events'
  | 'jobs'
  | 'entertainment';

export type ReactionType = 'love' | 'fire' | 'clap' | 'laugh' | 'insightful';

export interface PostMediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  duration?: number; // for videos in seconds
}

export interface PostLinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  originalContent?: string;
  translatedContent?: string;
  showOriginal?: boolean;
  createdAt: string;
  likesCount: number;
  likedByMe?: boolean;
  replyToId?: string;
  replyToAuthorName?: string;
  reactions?: Partial<Record<ReactionType, number>>;
  myReaction?: ReactionType;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorCountry: string;
  authorLanguage: string;
  category: PostCategory;
  content: string;
  originalContent?: string;
  translatedContent?: string;
  showOriginal?: boolean;
  mediaUrls?: string[];
  mediaType: 'image' | 'video' | 'none';
  mediaItems?: PostMediaItem[];
  linkPreview?: PostLinkPreview;
  location?: string;
  hashtags: string[];
  tags: string[];
  visibility: 'public' | 'followers' | 'private';
  likesCount: number;
  reactions: Record<ReactionType, number>;
  myReaction?: ReactionType;
  commentsCount: number;
  sharesCount: number;
  repostCount: number;
  repostedByMe?: boolean;
  repostedFrom?: {
    authorName: string;
    authorUsername: string;
    postId: string;
    authorAvatar?: string;
  };
  savedByMe?: boolean;
  likedByMe?: boolean;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  pinned?: boolean;
  reportsCount?: number;
  hidden?: boolean;
  comments: PostComment[];
}

export interface PostDraft {
  id: string;
  content: string;
  category: PostCategory;
  mediaItems: PostMediaItem[];
  hashtags: string[];
  tags: string[];
  location?: string;
  linkUrl?: string;
  visibility: 'public' | 'followers' | 'private';
  updatedAt: string;
}

export interface StoryStatus {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  caption?: string;
  gradient?: string;
  createdAt: string;
  expiresAt: string;
  viewersCount: number;
  likesCount: number;
}

export interface FlowRoom {
  id: string;
  title: string;
  topic: string;
  category: 'Tech & AI' | 'Crypto & DeFi' | 'Design & UX' | 'Cyber Security' | 'General Lounge';
  isPrivate: boolean;
  participantsCount: number;
  activeSpeakerIds: string[];
  maxParticipants: number;
  tags: string[];
  hostId: string;
  hostName: string;
  hostAvatar: string;
  isLive: boolean;
}

export interface FlowMoment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaType: 'image' | 'gradient' | 'video';
  mediaUrl?: string;
  gradient?: string;
  caption: string;
  createdAt: string;
  expiresAt: string;
  likesCount: number;
  viewsCount: number;
  hasViewed?: boolean;
}

export interface CallSubtitle {
  id: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
}

export interface CallSession {
  id: string;
  type: 'voice' | 'video';
  status: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'missed';
  caller: User;
  recipient: User | Conversation;
  startedAt: string;
  duration?: number;
  isGroup?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  subtitlesEnabled?: boolean;
  subtitles: CallSubtitle[];
}

export interface CallRecord {
  id: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  contact: User;
  timestamp: string;
  duration: string;
}

export interface VaultItem {
  id: string;
  title: string;
  type: 'note' | 'secret' | 'file' | 'code';
  content: string; // Encrypted string
  category: string;
  encryptedDate: string;
  size?: string;
}

export interface ConnectProfile {
  id: string;
  name: string;
  username: string;
  title: string;
  company: string;
  bio: string;
  avatar: string;
  matchScore: number;
  interests: string[];
  mutualConnections: number;
  location: string;
  isConnected?: boolean;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'call' | 'connect' | 'mention' | 'security' | 'system' | 'post' | 'payment';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export type WorkspaceMode = 'user' | 'owner';

export interface ReportTicket {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  targetType: 'post' | 'user' | 'message' | 'room';
  targetId: string;
  targetName: string;
  reason: string;
  category: 'harassment' | 'spam' | 'misinformation' | 'inappropriate_media' | 'security_breach' | 'other';
  details?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: UserRole;
  action:
    | 'USER_SUSPEND'
    | 'USER_REACTIVATE'
    | 'ROLE_CHANGE'
    | 'POST_DELETE'
    | 'POST_APPROVE'
    | 'REPORT_RESOLVE'
    | 'REPORT_DISMISS'
    | 'SYSTEM_BROADCAST'
    | 'SETTINGS_UPDATE'
    | 'DATABASE_BACKUP'
    | 'OWNER_LOGIN';
  targetType: string;
  targetId: string;
  details: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'warning' | 'failed';
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  allowSignups: boolean;
  requireTwoFactor: boolean;
  defaultLanguage: string;
  aiTranslationEngine: string;
  maxUploadSizeMb: number;
  rateLimitPerMinute: number;
  dataRetentionDays: number;
  webrtcEncryption: 'AES-GCM-256' | 'ChaCha20-Poly1305';
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  targetRole: 'all' | 'user' | 'moderator' | 'superadmin';
  createdAt: string;
  sentBy: string;
}

export interface ServerTelemetry {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  uptimeSeconds: number;
  activeWebsockets: number;
  webrtcMeshNodes: number;
  p2pMeshLatencyMs: number;
  dbPoolConnections: number;
  totalDbQueries: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface FinancialStats {
  mrrUsd: number;
  totalRevenueUsd: number;
  activeSubscribers: number;
  flowTransferEscrowVolumeUsd: number;
  platformFeesCollectedUsd: number;
  growthRatePercent: number;
  planBreakdown: {
    free: number;
    proMultilingual: number;
    enterprise: number;
  };
}

export type SubscriptionPlanType = 'free' | 'basic' | 'standard' | 'business';

export interface SubscriptionPlan {
  id: SubscriptionPlanType;
  name: string;
  priceMonthly: number;
  description: string;
  badge?: string;
  features: string[];
  isPopular?: boolean;
}

export interface DynamicRevenueAdjustmentRule {
  enabled: boolean;
  adjustmentPercent: number; // 5%
  milestoneUsersThreshold: number; // 5000
  effectiveDate: string;
  allowAutomaticDiscount: boolean;
  notes: string;
}

// ==============================================================
// 1. SMART NATIONAL NEWS SYSTEM TYPES
// ==============================================================
export type NewsCategory =
  | 'government'
  | 'economy'
  | 'security'
  | 'tech'
  | 'education'
  | 'health'
  | 'general';

export interface NationalNewsArticle {
  id: string;
  title: string;
  titleKinyarwanda?: string;
  summary: string;
  summaryKinyarwanda?: string;
  content: string;
  country: string;
  countryCode: string; // 'RW', 'US', 'FR', 'KE', 'GB', 'CN', 'AE', 'NG', etc.
  category: NewsCategory;
  officialSource: string;
  sourceUrl?: string;
  publishedAt: string;
  publishedDateStr: string;
  verified: boolean;
  verifiedBy?: string;
  isBreaking?: boolean;
  viewersCount: number;
  imageUrl?: string;
  aiAnalysis: {
    summary: string;
    keyTakeaways: string[];
    sentiment: 'positive' | 'neutral' | 'urgent';
    readingTimeMin: number;
    impactLevel: 'national' | 'regional' | 'global';
  };
  tags: string[];
}

// ==============================================================
// 2. SMART NATIONAL LAW COMPLIANCE TYPES
// ==============================================================
export type LawCategory =
  | 'data_privacy'
  | 'cybersecurity'
  | 'telecom'
  | 'ai_governance'
  | 'e_commerce'
  | 'content_safety'
  | 'consumer_protection';

export type LawComplianceStatus =
  | 'compliant'
  | 'requires_action'
  | 'pending_review'
  | 'exempt';

export interface NationalLaw {
  id: string;
  title: string;
  titleKinyarwanda?: string;
  country: string;
  countryCode: string;
  gazetteNumber: string;
  publishedDate: string;
  effectiveDate: string;
  status: LawComplianceStatus;
  category: LawCategory;
  officialSource: string;
  officialSourceUrl: string;
  affectedEntities: string[]; // e.g. ["Digital Platforms", "Telecommunications", "Messaging Providers"]
  summary: string;
  summaryKinyarwanda?: string;
  fullArticlesHighlight: string;
  platformImpactSummary: string;
  platformActionTaken?: string;
  requiresAdminApproval: boolean;
  legalExpertReviewNotes?: string;
  affectedUsersCount: number;
  complianceDeadline?: string;
  auditTrailId?: string;
}

export interface LegalAuditLog {
  id: string;
  lawId: string;
  lawTitle: string;
  country: string;
  countryCode: string;
  actionTaken: string;
  reviewedBy: string;
  reviewerRole: UserRole | 'legal_counsel';
  timestamp: string;
  legalReference: string;
  status: 'approved' | 'enacted' | 'under_review';
  affectedSystemModule: string;
  ipAddress: string;
}

// ==============================================================
// 3. USER TIME MANAGEMENT & BREAK REMINDER TYPES
// ==============================================================
export interface UserTimeSettings {
  enabled: boolean;
  reminderIntervalMinutes: number; // 30, 60, 120, etc.
  notificationSound: boolean;
  language: 'rw' | 'en' | 'auto';
  autoPauseOnInactivity: boolean;
  dailyGoalMinutes: number; // e.g. 180 mins
}

export interface ScreenTimeSession {
  sessionId: string;
  startTime: number;
  activeSeconds: number;
  breaksPrompted: number;
  breaksAccepted: number;
  date: string; // YYYY-MM-DD
}

// ==============================================================
// 4. JURISDICTION & COUNTRY PROFILE
// ==============================================================
export interface JurisdictionProfile {
  countryCode: string;
  countryName: string;
  flag: string;
  primaryLanguage: string;
  dataProtectionAuthority: string;
  emergencyCyberContact: string;
  requiresParentalConsentUnder: number; // e.g. 16 or 18
  encryptionMandate: 'mandatory' | 'permitted' | 'conditional';
  activeLawsCount: number;
}

// ==============================================================
// 5. DAVD COMPANY PROFILE & EXECUTIVE MANAGEMENT
// ==============================================================
export interface CompanyProfile {
  companyName: string;
  registrationNumber: string;
  foundedYear: string;
  headquarters: string;
  ownerName: string;
  ownerRole: string;
  supportEmail: string;
  legalEmail: string;
  complianceOfficer: string;
  primaryJurisdiction: string;
  activeDataCenters: string[];
  totalEmployees: number;
  taxIdentificationNo: string;
  servicesStatus: {
    messagingEngine: boolean;
    voiceCalling: boolean;
    videoCalling: boolean;
    aiNeuralTranslation: boolean;
    flowRooms: boolean;
    socialPostsFeed: boolean;
    nationalNewsDesk: boolean;
    legalComplianceSystem: boolean;
  };
}

// ==============================================================
// 6. SYSTEM HEALTH, AUDIT & AUTOMATIC REPAIR TYPES
// ==============================================================
export type ModuleHealthStatus = 'operational' | 'needs_attention' | 'failed' | 'in_testing';

export interface SystemModuleHealth {
  id: string;
  name: string;
  category: 'core_messaging' | 'webrtc_calling' | 'ai_intelligence' | 'data_storage' | 'security_compliance' | 'social_network';
  status: ModuleHealthStatus;
  latencyMs: number;
  uptimePercent: number;
  testResult: string;
  lastTested: string;
  issuesDetected: string[];
  autoRepairsAvailable: string[];
  lastRepaired: string | null;
}

export interface AutoRepairLog {
  id: string;
  moduleId: string;
  moduleName: string;
  issueDescription: string;
  rootCause: string;
  actionTaken: string;
  repairStatus: 'fixed_and_tested' | 'working_without_changes' | 'partially_working' | 'blocked_by_infrastructure';
  testVerificationResult: string;
  timestamp: string;
  repairedBy: string;
}

export interface SystemAuditSummary {
  totalModules: number;
  operationalCount: number;
  needsAttentionCount: number;
  failedCount: number;
  inTestingCount: number;
  averageApiResponseMs: number;
  databaseHealthStatus: 'optimal' | 'degraded' | 'maintenance';
  dbPoolActiveConnections: number;
  dbPoolMaxConnections: number;
  serverCpuUsagePercent: number;
  serverMemoryUsageMb: number;
  serverMemoryTotalMb: number;
  realtimeConnectedUsers: number;
  websocketThroughputPerSec: number;
  webrtcCallSuccessRatePercent: number;
  translationEngineStatus: 'online' | 'fallback' | 'offline';
  concurrencyTestedCapacity: number;
  lastFullAuditTimestamp: string;
}

// 6. PROJECT OWNER REGISTRATION & PERMANENT PROFILE
// ==============================================================
export interface ProjectOwner {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  country: string;
  profilePicture?: string;
  accountStatus: 'active' | 'suspended' | 'verified';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface ProjectOwnerRegistrationPayload {
  fullName: string;
  phoneNumber: string;
  email: string;
  ownerCode: string;
  password: string;
  country: string;
  profilePicture?: string;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: 'everyone' | 'contacts' | 'nobody';
  allowTypingIndicators: boolean;
  allowReadReceipts: boolean;
}

// ==============================================================
// 7. PAYMENT GATEWAY, MTN MOMO & FINANCIAL LEDGER TYPES
// ==============================================================
export type PaymentProviderCode = 'mtn_momo_rw' | 'stripe_cards' | 'paypal' | 'flutterwave_africa';

export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentProviderInfo {
  code: PaymentProviderCode | string;
  name: string;
  adapterType: string;
  region: string;
  supportedCurrencies: string[];
  supportsCountry: boolean;
  recommended: boolean;
  mode: 'sandbox' | 'production';
  configured: boolean;
  connectionStatus: 'connected' | 'missing_credentials' | string;
  missingEnv: string[];
}

export interface PaymentCurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface PaymentTransactionRecord {
  id: string;
  transactionRef: string;
  idempotencyKey?: string | null;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhoneMasked: string;
  country: string;
  planId: string;
  serviceName: string;
  providerCode: PaymentProviderCode | string;
  paymentMethod: string;
  amount: number;
  currency: string;
  amountUsd: number;
  exchangeRate: number;
  status: PaymentStatus;
  externalReference: string;
  failureReason: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  receiptType: string;
  transactionRef: string;
  externalReference: string;
  providerCode: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhoneMasked: string;
  country: string;
  serviceName: string;
  planId: string;
  amount: number;
  currency: string;
  amountUsd: number;
  exchangeRate: number;
  paidAt: string;
}

export interface PaymentInvoice {
  invoiceNumber: string;
  status: 'issued' | 'paid' | 'void' | 'refunded';
  paidAt: string | null;
  issuedAt?: string;
  receipt: PaymentReceipt | Record<string, any>;
}

export interface PaymentRefundRecord {
  id: string;
  payment_id: string;
  transaction_ref: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  external_refund_id: string;
  initiated_by: string;
  created_at: string;
  completed_at: string;
}

export interface PaymentAuditEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  payment_id: string | null;
  action: string;
  detail: string;
  ip_address: string;
  created_at: string;
}

export interface AdminRevenueSummary {
  totalSuccessfulPayments: number;
  totalRevenueUsd: number;
  todayRevenueUsd: number;
  monthlyRevenueUsd: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  refundsCount: number;
  refundedVolumeUsd: number;
  mtnMomoCount: number;
  mtnMomoVolumeUsd: number;
  internationalCount: number;
  internationalVolumeUsd: number;
  providers: Array<{
    code: string;
    name: string;
    adapterType: string;
    mode: 'sandbox' | 'production';
    configured: boolean;
    connectionStatus: string;
    missingEnv: string[];
  }>;
}



