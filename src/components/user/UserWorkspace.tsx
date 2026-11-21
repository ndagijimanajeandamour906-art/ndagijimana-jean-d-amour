import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Sidebar } from '../navigation/Sidebar';
import { MobileNav } from '../navigation/MobileNav';
import { ChatList } from '../chat/ChatList';
import { ChatWindow } from '../chat/ChatWindow';
import { ChatDetailsDrawer } from '../chat/ChatDetailsDrawer';
import { FlowRooms } from '../flow/FlowRooms';
import { FlowConnect } from '../flow/FlowConnect';
import { SmartAIHub } from '../flow/SmartAIHub';
import { FlowMoments } from '../flow/FlowMoments';
import { LiveFlowStage } from '../flow/LiveFlowStage';
import { MessageVault } from '../flow/MessageVault';
import { FlowTransfer } from '../flow/FlowTransfer';
import { MultiDeviceModal } from '../flow/MultiDeviceModal';
import { SettingsModal } from '../settings/SettingsModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { NotificationsDrawer } from '../notifications/NotificationsDrawer';
import { CallModal } from '../calling/CallModal';
import { IncomingCallBanner } from '../calling/IncomingCallBanner';
import { AuthModal } from '../auth/AuthModal';
import { NewChatModal } from '../chat/NewChatModal';
import { CallHistoryView } from '../calling/CallHistoryView';
import { PostFeed } from '../social/PostFeed';
import { StatusViewer } from '../status/StatusViewer';
import { LanguageSelectorModal } from '../language/LanguageSelectorModal';
import { ReportModal } from '../support/ReportModal';
import { VoiceSettingsModal } from '../voice/VoiceSettingsModal';
import { PricingModal } from '../pricing/PricingModal';
import { SmartNationalNews } from '../news/SmartNationalNews';
import { SmartLegalCompliance } from '../compliance/SmartLegalCompliance';
import { BreakReminderModal } from '../time/BreakReminderModal';
import { TimeReminderPill } from '../time/TimeReminderPill';
import { DavdOwnerButton } from '../common/DavdOwnerButton';
import { DavdOwnerLoginModal } from '../auth/DavdOwnerLoginModal';
import { getLanguageByCode } from '../../data/languages';
import {
  Bell,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Flag,
  Sparkles,
} from 'lucide-react';

export const UserWorkspace: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    activeConversationId,
    languageModalOpen,
    setLanguageModalOpen,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    voiceSettingsOpen,
    setVoiceSettingsOpen,
    pricingModalOpen,
    setPricingModalOpen,
    unreadNotificationsCount,
    setWorkspace,
    openReportModal,
    setAuthModalOpen,
    announcements,
    pendingVerification,
  } = useTolkflow();

  // Modals & Drawers state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<'direct' | 'group'>('direct');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const openNewChat = (mode: 'direct' | 'group') => {
    setNewChatMode(mode);
    setNewChatModalOpen(true);
  };

  const currentLang = getLanguageByCode(currentUser.preferredLanguage || 'en');
  const latestAnnouncement = announcements[0];
  const requiresEmailVerificationGate =
    Boolean(pendingVerification) || currentUser?.verified === false || currentUser?.accountStatus === 'unverified';

  if (requiresEmailVerificationGate) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#050B14] text-white p-4">
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-2xl font-display font-bold">Verify Your Tolkflow Account</h1>
          <p className="text-sm text-slate-300">
            Email verification is required before accessing messaging, calls, social posts, or translation services.
          </p>
        </div>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050B14] text-slate-100 font-sans">
      {/* ============================================================== */}
      {/* TOP USER WORKSPACE HEADER & WORKSPACE SWITCHER */}
      {/* ============================================================== */}
      <header className="h-12 bg-[#070D1E] border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="font-display font-bold text-sm tracking-wider text-white">
              TOLKFLOW
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-cyan-300 border border-cyan-500/30">
              USER WORKSPACE
            </span>
          </div>

          {/* Slogan */}
          <span className="hidden lg:inline text-xs text-slate-400 border-l border-slate-800 pl-3">
            Connect the World Without Language Barriers
          </span>
        </div>

        {/* Global Controls & Owner Portal Switcher */}
        <div className="flex items-center gap-2">
          {/* Smart Screen Time Management & Break Reminder Pill */}
          <TimeReminderPill />

          {/* Instant 40+ Language Selector Pill */}
          <button
            onClick={() => setLanguageModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-cyan-500/30 text-xs text-slate-200 transition-all cursor-pointer"
            title="Instant Multi-Language Translation Selector (40+ African, Asian & European languages)"
          >
            <span>{currentLang?.flag || '🌐'}</span>
            <span className="hidden sm:inline font-semibold text-white">{currentLang?.name || 'English'}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono hidden md:inline">
              LIVE TRANSLATE
            </span>
          </button>

          {/* Natural Voice & Speech Settings Button */}
          <button
            onClick={() => setVoiceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-xs text-emerald-300 transition-all cursor-pointer"
            title="Configure Natural AI Voice, Speaking Speed & Auto-Read (Kinyarwanda, English, French, Swahili, etc.)"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-semibold">AI Voice</span>
          </button>

          {/* Affordable Subscription Plans Button */}
          <button
            onClick={() => setPricingModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-900/50 to-emerald-900/50 hover:from-teal-800/60 hover:to-emerald-800/60 border border-teal-500/40 text-xs text-teal-200 transition-all cursor-pointer"
            title="View Affordable Subscriptions (Free, Basic $2.99, Standard $6.99, Business $14.99)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline font-semibold">Plans</span>
          </button>

          {/* Report Content or User */}
          <button
            onClick={() => openReportModal('user', currentUser.id, currentUser.name)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 transition-colors cursor-pointer"
            title="Report violation or submit support inquiry"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Support & Report</span>
          </button>

          {/* Quick Sound FX toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
            title="Toggle Sound FX"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme switch */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse ring-2 ring-[#070D1E]" />
            )}
          </button>

          {/* SPECIAL DAVD COMPANY OWNER ACCESS ICON & BUTTON */}
          <DavdOwnerButton />
        </div>
      </header>

      {/* High-Priority System Broadcast Banner if present */}
      {latestAnnouncement && (
        <div className="bg-gradient-to-r from-blue-900/70 via-indigo-900/70 to-blue-950/70 border-b border-cyan-500/20 px-4 py-1.5 text-xs flex items-center justify-between text-slate-200">
          <div className="flex items-center gap-2 truncate">
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300">
              BROADCAST
            </span>
            <span className="font-semibold text-white">{latestAnnouncement.title}:</span>
            <span className="truncate text-slate-300">{latestAnnouncement.message}</span>
          </div>
          <span className="text-[10px] text-cyan-300/80 font-mono pl-2 hidden sm:inline flex-shrink-0">
            {latestAnnouncement.sentBy}
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN BODY: SIDEBAR + CHATS / SOCIAL / ROOMS */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar (Desktop / Tablet) */}
        <Sidebar
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Chats Tab (WhatsApp-evolution interface) */}
          {activeTab === 'chats' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
              {/* Chat List (hidden on mobile if chat is opened) */}
              <div
                className={`h-full ${
                  mobileChatOpen ? 'hidden md:flex' : 'flex w-full md:w-auto'
                }`}
              >
                <ChatList
                  onNewChat={() => openNewChat('direct')}
                  onNewGroup={() => openNewChat('group')}
                  onSelectChat={() => setMobileChatOpen(true)}
                />
              </div>

              {/* Central Chat Workspace */}
              <div
                className={`flex-1 h-full flex flex-col ${
                  !mobileChatOpen ? 'hidden md:flex' : 'flex w-full'
                }`}
              >
                <ChatWindow
                  onToggleDetails={() => setDetailsDrawerOpen(!detailsDrawerOpen)}
                  onBackMobile={() => setMobileChatOpen(false)}
                />
              </div>

              {/* Right Details Drawer */}
              {detailsDrawerOpen && (
                <ChatDetailsDrawer onClose={() => setDetailsDrawerOpen(false)} />
              )}
            </div>
          )}

          {/* Social Posts Feed */}
          {activeTab === 'posts' && <PostFeed />}

          {/* 24-Hour Stories & Flow Status */}
          {activeTab === 'status' && <StatusViewer />}

          {/* Feature A: Flow Rooms */}
          {activeTab === 'rooms' && <FlowRooms />}

          {/* Feature B: Flow Connect */}
          {activeTab === 'connect' && <FlowConnect />}

          {/* Feature C: Smart AI Hub */}
          {activeTab === 'ai' && <SmartAIHub />}

          {/* Feature D: Flow Moments */}
          {activeTab === 'moments' && <FlowMoments />}

          {/* Feature E: Live Flow Stage */}
          {activeTab === 'live' && <LiveFlowStage />}

          {/* Feature F: Message Vault */}
          {activeTab === 'vault' && <MessageVault />}

          {/* Feature G: Flow Transfer */}
          {activeTab === 'transfer' && <FlowTransfer />}

          {/* Call Records & History */}
          {activeTab === 'calls' && <CallHistoryView />}

          {/* Feature H: Connected Devices */}
          {activeTab === 'devices' && <MultiDeviceModal />}

          {/* Smart National News Portal */}
          {activeTab === 'news' && <SmartNationalNews />}

          {/* Smart National Law Compliance & Equal Justice */}
          {activeTab === 'compliance' && <SmartLegalCompliance />}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="flex-1 flex items-center justify-center p-6 bg-[#050B14]">
              <SettingsModal onClose={() => setActiveTab('chats')} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onOpenMore={() => setSettingsModalOpen(true)} />

      {/* Real WebRTC Call Modal & PiP */}
      <CallModal />

      {/* Incoming Call Ringing Banner */}
      <IncomingCallBanner />

      {/* Smart Screen Time Break & Rest Reminder Modal (1-Hour Continuous Active Rule) */}
      <BreakReminderModal />

      {/* Global Overlays & Modals */}
      <AuthModal />
      <ReportModal />

      {profileModalOpen && (
        <UserProfileModal onClose={() => setProfileModalOpen(false)} />
      )}

      {notificationsOpen && (
        <NotificationsDrawer onClose={() => setNotificationsOpen(false)} />
      )}

      {settingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} />
      )}

      {newChatModalOpen && (
        <NewChatModal
          initialMode={newChatMode}
          onClose={() => setNewChatModalOpen(false)}
        />
      )}

      {languageModalOpen && (
        <LanguageSelectorModal onClose={() => setLanguageModalOpen(false)} />
      )}

      {/* Natural AI Voice & Speech Settings Modal */}
      <VoiceSettingsModal
        isOpen={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
      />

      {/* Affordable Subscription & Monetization Modal */}
      <PricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
      />

      {/* DAVD Company Owner Private Login Modal */}
      <DavdOwnerLoginModal />
    </div>
  );
};
