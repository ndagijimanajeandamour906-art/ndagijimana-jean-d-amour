import React, { useState } from 'react';
import { useTolkflow, MainNavTab } from '../../context/TolkflowContext';
import { Logo } from '../common/Logo';
import {
  MessageSquare,
  Radio,
  Sparkles,
  Compass,
  Camera,
  Mic2,
  Lock,
  ArrowUpRight,
  Smartphone,
  ShieldAlert,
  Settings,
  Bell,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  LogOut,
  Phone,
  Globe,
  Languages,
  Flag,
  Newspaper,
  Scale,
} from 'lucide-react';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';
import { getLanguageByCode } from '../../data/languages';

interface SidebarProps {
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenProfile, onOpenNotifications }) => {
  const {
    currentUser,
    allUsers,
    setCurrentUser,
    activeTab,
    setActiveTab,
    conversations,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    voiceSettingsOpen,
    setVoiceSettingsOpen,
    pricingModalOpen,
    setPricingModalOpen,
    unreadNotificationsCount,
    setAuthModalOpen,
    setLanguageModalOpen,
    setWorkspace,
    openReportModal,
    isOwnerAuthorized,
    setOwnerAuthModalOpen,
    projectOwner,
    authSessionToken,
    logoutAccount,
  } = useTolkflow();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const currentLang = getLanguageByCode(currentUser.preferredLanguage || 'en');

  const navItems: { id: MainNavTab; label: string; icon: any; badge?: string | number; color?: string }[] = [
    {
      id: 'chats',
      label: 'Flow Chats',
      icon: MessageSquare,
      badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined,
    },
    {
      id: 'posts',
      label: 'Social Posts',
      icon: Globe,
      badge: 'FEED',
      color: 'text-emerald-400',
    },
    {
      id: 'status',
      label: 'Flow Status',
      icon: Camera,
      color: 'text-amber-400',
    },
    {
      id: 'rooms',
      label: 'Flow Rooms',
      icon: Radio,
      badge: 'LIVE',
      color: 'text-cyan-400',
    },
    {
      id: 'connect',
      label: 'Flow Connect',
      icon: Compass,
    },
    {
      id: 'ai',
      label: 'Smart AI Hub',
      icon: Sparkles,
      color: 'text-indigo-400',
    },
    {
      id: 'moments',
      label: 'Flow Moments',
      icon: Sparkles,
    },
    {
      id: 'live',
      label: 'Live Flow Stage',
      icon: Mic2,
    },
    {
      id: 'vault',
      label: 'Message Vault',
      icon: Lock,
      color: 'text-emerald-400',
    },
    {
      id: 'transfer',
      label: 'Flow Transfer',
      icon: ArrowUpRight,
    },
    {
      id: 'calls',
      label: 'Call Records',
      icon: Phone,
    },
    {
      id: 'devices',
      label: 'Connected Devices',
      icon: Smartphone,
    },
    {
      id: 'news',
      label: 'Smart National News',
      icon: Newspaper,
      badge: 'LIVE',
      color: 'text-amber-400',
    },
    {
      id: 'compliance',
      label: 'Legal Compliance',
      icon: Scale,
      color: 'text-emerald-400',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen bg-[#070D1E] border-r border-slate-800/80 select-none z-30 transition-all flex-shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <Logo size="md" showSlogan={true} />
        <div className="flex items-center gap-1">
          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse ring-2 ring-[#070D1E]" />
            )}
          </button>
        </div>
      </div>

      {/* Switch User Persona Bar (Convenient quick-testing & role preview) */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/60">
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 text-xs text-slate-300 border border-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="truncate">Active: <b className="text-white">{currentUser.name}</b></span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>

          {userDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0A1124] border border-cyan-500/30 rounded-xl shadow-2xl p-1 z-50 backdrop-blur-xl">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Switch Identity Persona
              </div>
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setUserDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    u.id === currentUser.id
                      ? 'bg-blue-600/30 text-cyan-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate flex-1 text-left">{u.name}</span>
                  {u.role === 'admin' && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      ADMIN
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)]'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-300' : item.color || 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    item.badge === 'LIVE'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : isActive
                      ? 'bg-cyan-400 text-black font-extrabold'
                      : 'bg-blue-600/40 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Workspace Portal to DAVD Company Owner Control Center */}
      <div className="p-3 bg-[#060B18] border-t border-slate-800/80 space-y-2">
        <button
          onClick={() => {
            if (isOwnerAuthorized) {
              setWorkspace('owner');
            } else {
              setOwnerAuthModalOpen(true);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-300 text-xs font-bold border border-amber-400/40 shadow-lg shadow-amber-500/10 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
              DAVD
            </div>
            <span>DAVD Owner Portal</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 font-mono text-amber-200">
            {isOwnerAuthorized ? 'ACTIVE' : 'LOGIN'}
          </span>
        </button>

        <button
          onClick={() => openReportModal('user', currentUser.id, currentUser.name)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Report / Support Desk</span>
          </div>
          <span className="text-[10px] text-slate-500">24/7</span>
        </button>
      </div>

      {/* Bottom Profile & System Controls */}
      <div className="p-3 bg-[#0A1124] border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
              title="Sound FX"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Account / OTP</span>
            </button>
            {authSessionToken && (
              <button
                onClick={() => logoutAccount()}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Sign out of session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Multilingual Status & Selector Pill */}
        <button
          onClick={() => setLanguageModalOpen(true)}
          className="w-full mb-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-cyan-500/30 text-xs text-slate-200 transition-all group"
          title="Change Preferred Translation Language"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{currentLang?.flag || '🌐'}</span>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-semibold text-white truncate text-[11px]">
                {currentLang?.name || 'English'}
              </span>
              <span className="text-[9px] text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Auto-Translate Active
              </span>
            </div>
          </div>
          <Languages className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
        </button>

        {/* Quick Voice Settings & Affordable Plans Actions */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            onClick={() => setVoiceSettingsOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-[11px] text-emerald-300 transition-all font-medium"
            title="Configure Natural AI Voice Output"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Voice</span>
          </button>

          <button
            onClick={() => setPricingModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-gradient-to-r from-teal-900/40 to-blue-900/40 hover:from-teal-800/50 hover:to-blue-800/50 border border-teal-500/30 text-[11px] text-teal-200 transition-all font-medium"
            title="View Affordable Subscription Plans ($0 - $14.99/mo)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Plans</span>
          </button>
        </div>

        {/* User Card & Identity Switcher */}
        <div className="relative">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-colors group">
            <div onClick={onOpenProfile} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/40 group-hover:ring-cyan-400 transition-all"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A1124]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">{currentUser.name}</span>
                  {isProjectOwnerUser(currentUser, projectOwner) && (
                    <DvOwnerBadge size="xs" showTooltip tooltipText="Verified Tolkflow Project Owner (DAVD)" />
                  )}
                  {currentUser.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-cyan-400/80 truncate">@{currentUser.username}</p>
              </div>
            </div>

            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Switch Active User Profile (For Multi-User Call Testing)"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${userDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* User Switcher Dropdown */}
          {userDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-[#0A1124] border border-cyan-500/40 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center justify-between">
                <span>Switch Active User</span>
                <span className="text-slate-400 font-normal">P2P Testing</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allUsers.map((u) => {
                  const isUserOwner = isProjectOwnerUser(u, projectOwner);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-colors ${
                        u.id === currentUser.id
                          ? 'bg-blue-600/30 text-cyan-300 border border-cyan-500/40'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate flex items-center gap-1">
                          <span>{u.name}</span>
                          {isUserOwner && <DvOwnerBadge size="xs" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">@{u.username} ({u.country})</div>
                      </div>
                      {u.id === currentUser.id && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
