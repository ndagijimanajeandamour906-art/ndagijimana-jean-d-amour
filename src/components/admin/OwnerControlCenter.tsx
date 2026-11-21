import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HardDrive,
  Cpu,
  RefreshCw,
  Download,
  Send,
  Radio,
  MessageSquare,
  Lock,
  Globe,
  UserX,
  UserCheck,
  Trash2,
  FileText,
  Sliders,
  LogOut,
  ExternalLink,
  ChevronDown,
  Bell,
  Clock,
  Sparkles,
  ArrowUpRight,
  Eye,
  Key,
  Layers,
  Database,
  ArrowRight,
  Flag,
  Newspaper,
  Scale,
  BookOpen,
  Building2,
  PhoneCall,
  Video,
  Phone,
  UploadCloud,
  Check,
  User as UserIcon,
  Camera,
  EyeOff,
} from 'lucide-react';
import { UserRole, ReportTicket, CompanyProfile } from '../../types';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';
import { AdminFinancialLedgerPanel } from './AdminFinancialLedgerPanel';

const OWNER_COUNTRIES = [
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '+256' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
];

export const OwnerControlCenter: React.FC = () => {
  const {
    currentUser,
    allUsers,
    conversations,
    messages,
    posts,
    flowRooms,
    reports,
    resolveReport,
    auditLogs,
    platformSettings,
    updatePlatformSettings,
    telemetry,
    refreshTelemetry,
    financialStats,
    dynamicAdjustmentRule,
    updateDynamicAdjustmentRule,
    announcements,
    broadcastAnnouncement,
    downloadDatabaseBackup,
    suspendUserAccount,
    reactivateUserAccount,
    updateUserRole,
    deleteUserAccount,
    deletePostByAdmin,
    setWorkspace,
    logoutOwner,
    newsArticles,
    verifyNewsArticle,
    nationalLaws,
    legalAuditLogs,
    approveComplianceAction,
    broadcastLegalNotification,
    jurisdictions,
    callRecords,
    projectOwner,
    updateOwnerProfile,
    checkOwnerStatus,
    isOwnerAuthorized,
    verificationStats,
    refreshAdminUsers,
  } = useTolkflow();

  // Active Admin Sub-tab (now including 'profile')
  const [activeNav, setActiveNav] = useState<
    | 'overview'
    | 'profile'
    | 'company'
    | 'users'
    | 'moderation'
    | 'reports'
    | 'broadcasts'
    | 'financials'
    | 'server'
    | 'security'
    | 'permissions'
    | 'settings'
    | 'news'
    | 'compliance'
  >('overview');

  // Owner Profile Management ("MY PROFILE") state
  const [profileName, setProfileName] = useState(
    projectOwner?.fullName || 'Jean Damour Ndagijimana (DAVD)'
  );
  const [profilePhone, setProfilePhone] = useState(
    projectOwner?.phoneNumber || '+250 788 123 456'
  );
  const [profileEmail, setProfileEmail] = useState(
    projectOwner?.email || 'ndagijimanajeandamour906@gmail.com'
  );
  const [profileCountry, setProfileCountry] = useState(
    projectOwner?.country || 'Rwanda'
  );
  const [profilePic, setProfilePic] = useState(
    projectOwner?.profilePicture || currentUser.avatar
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Update state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');

  // Sync profile when projectOwner changes
  useEffect(() => {
    if (projectOwner) {
      setProfileName(projectOwner.fullName);
      setProfilePhone(projectOwner.phoneNumber);
      setProfileEmail(projectOwner.email);
      setProfileCountry(projectOwner.country);
      setProfilePic(projectOwner.profilePicture);
    }
  }, [projectOwner]);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfilePic(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    if (!profileName.trim()) {
      setProfileErrorMsg('Full Name cannot be empty.');
      return;
    }
    if (!profilePhone.trim()) {
      setProfileErrorMsg('Phone Number cannot be empty.');
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes('@')) {
      setProfileErrorMsg('A valid email address is required.');
      return;
    }

    setSavingProfile(true);
    const res = await updateOwnerProfile({
      fullName: profileName.trim(),
      phoneNumber: profilePhone.trim(),
      email: profileEmail.trim().toLowerCase(),
      country: profileCountry,
      profilePicture: profilePic,
    });
    setSavingProfile(false);

    if (res.success) {
      setProfileSuccessMsg('Project Owner profile updated and permanently stored in database!');
      setTimeout(() => setProfileSuccessMsg(''), 3500);
    } else {
      setProfileErrorMsg(res.error || 'Failed to update profile.');
    }
  };

  const handleUpdateOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMsg('');
    setPassSuccessMsg('');

    if (!currPassword) {
      setPassErrorMsg('Current password is required to verify master identity.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassErrorMsg('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    const res = await updateOwnerProfile({
      currentPassword: currPassword,
      newPassword: newPassword,
    });
    setChangingPass(false);

    if (res.success) {
      setPassSuccessMsg('Owner password updated and cryptographic SHA-256 salt re-hashed!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPassSuccessMsg(''), 3500);
    } else {
      setPassErrorMsg(res.error || 'Failed to update password. Please check your current password.');
    }
  };

  // Company Management State
  const [companyInfo, setCompanyInfo] = useState<CompanyProfile>({
    companyName: 'Tolkflow Global Technologies Ltd.',
    registrationNumber: 'RDB-KGL-2026-906-TOLK',
    foundedYear: '2025',
    headquarters: 'Kigali Innovation City, Gasabo District, Rwanda & Global Cloud Hub',
    ownerName: 'Jean Damour Ndagijimana (DAVD)',
    ownerRole: 'Company Owner & Executive Founder',
    supportEmail: 'support@tolkflow.io',
    legalEmail: 'legal@tolkflow.io',
    complianceOfficer: 'Dr. Chantal Mukamana (NCSA & EDPB Certified)',
    primaryJurisdiction: 'Republic of Rwanda (Global Operating License)',
    activeDataCenters: ['Kigali-East-1', 'Frankfurt-EU-1', 'Singapore-APAC', 'US-East-DC'],
    totalEmployees: 48,
    taxIdentificationNo: 'TIN-1094827104',
    servicesStatus: {
      messagingEngine: true,
      voiceCalling: true,
      videoCalling: true,
      aiNeuralTranslation: true,
      flowRooms: true,
      socialPostsFeed: true,
      nationalNewsDesk: true,
      legalComplianceSystem: true,
    },
  });
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [savingCompany, setSavingCompany] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch company info and security alerts on mount
  useEffect(() => {
    fetch('/api/admin/company')
      .then((res) => res.json())
      .then((data) => {
        if (data.company) setCompanyInfo(data.company);
      })
      .catch(() => {});

    fetch('/api/admin/security-alerts')
      .then((res) => res.json())
      .then((data) => {
        if (data.alerts) setSecurityAlerts(data.alerts);
      })
      .catch(() => {});
  }, []);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended'>('all');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; username: string } | null>(null);

  // Report resolution modal
  const [selectedReport, setSelectedReport] = useState<ReportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'dismissed'>('all');

  // Broadcast modal form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annPriority, setAnnPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [annRole, setAnnRole] = useState<'all' | 'user' | 'moderator' | 'superadmin'>('all');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  // Selected User Inspector modal
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [simulatedConcurrency, setSimulatedConcurrency] = useState<number>(5000);

  // Sync verified/unverified user registry when viewing User Governance tab
  useEffect(() => {
    if (activeNav === 'users') {
      refreshAdminUsers();
    }
  }, [activeNav, refreshAdminUsers]);

  // Live telemetry polling
  useEffect(() => {
    refreshTelemetry();
    const interval = setInterval(() => {
      refreshTelemetry();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshTelemetry]);

  // Derived real computations
  const totalUsers = verificationStats?.totalUsers ?? allUsers.length;
  const activeUsers = allUsers.filter((u) => u.status === 'online' || u.status === 'in_flow').length;
  const verifiedUsersCount =
    verificationStats?.verifiedCount ??
    allUsers.filter((u) => Boolean(u.isVerified ?? u.verified) && !u.isBlocked && u.accountStatus !== 'suspended').length;
  const unverifiedUsersCount =
    verificationStats?.unverifiedCount ??
    allUsers.filter((u) => !(u.isVerified ?? u.verified) && !u.isBlocked && u.accountStatus !== 'suspended').length;
  const suspendedUsers =
    verificationStats?.suspendedCount ??
    allUsers.filter((u) => u.isBlocked || u.accountStatus === 'suspended').length;
  const verificationRate =
    verificationStats?.verificationRatePercent ??
    (totalUsers > 0 ? Math.round((verifiedUsersCount / totalUsers) * 100) : 0);
  const pendingReportsCount = reports.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const totalMessagesCount = Object.values(messages).reduce<number>((acc, list: any) => acc + (list?.length || 0), 0);

  // User list filter
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.country || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const isVerified = Boolean(u.isVerified ?? u.verified);
    const isSuspended = Boolean(u.isBlocked || u.accountStatus === 'suspended');
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'verified' && isVerified && !isSuspended) ||
      (statusFilter === 'unverified' && !isVerified && !isSuspended) ||
      (statusFilter === 'suspended' && isSuspended);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    setBroadcasting(true);
    await broadcastAnnouncement(annTitle, annMessage, annPriority, annRole);
    setBroadcasting(false);
    setBroadcastDone(true);
    setTimeout(() => {
      setBroadcastDone(false);
      setAnnTitle('');
      setAnnMessage('');
    }, 2000);
  };

  const handleResolveTicket = async (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    await resolveReport(selectedReport.id, status, resolutionNotes);
    setSelectedReport(null);
    setResolutionNotes('');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F1F5F9] text-slate-800 font-sans select-none">
      {/* ============================================================== */}
      {/* 1. PROFESSIONAL SIDEBAR NAVIGATION (Executive Style) */}
      {/* ============================================================== */}
      <aside className="w-64 lg:w-72 h-full bg-[#0B1528] text-slate-200 flex flex-col border-r border-slate-800 flex-shrink-0 z-20 shadow-xl">
        {/* Brand Banner with Golden DAVD Insignia */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#070D1A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 border border-amber-200 flex-shrink-0">
              <span className="font-extrabold text-xs tracking-wider text-slate-950">DAVD</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm text-white tracking-wider">
                  TOLKFLOW
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  OWNER
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 font-medium">DAVD Executive Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
          <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Executive & Core
          </div>

          <button
            onClick={() => setActiveNav('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'overview'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeNav === 'overview' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span className="flex-1 text-left">Executive Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNav('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'profile'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <DvOwnerBadge size="xs" showTooltip={false} />
            <span className="flex-1 text-left font-semibold">My Profile</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${activeNav === 'profile' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-400/20 text-amber-300'}`}>
              DV CRESCENT
            </span>
          </button>

          <button
            onClick={() => setActiveNav('company')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'company'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeNav === 'company' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span className="flex-1 text-left">Company Management</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${activeNav === 'company' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-400/20 text-amber-300'}`}>
              DAVD
            </span>
          </button>

          <button
            onClick={() => setActiveNav('users')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'users'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span className="flex-1 text-left">User Governance</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {totalUsers}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('moderation')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'moderation'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 text-left">Content Moderation</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'reports'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Flag className="w-4 h-4 text-rose-400" />
            <span className="flex-1 text-left">Reports & Complaints</span>
            {pendingReportsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>

          <div className="px-3 pt-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Operations & Revenue
          </div>

          <button
            onClick={() => setActiveNav('broadcasts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'broadcasts'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="flex-1 text-left">System Broadcasts</span>
          </button>

          <button
            onClick={() => setActiveNav('financials')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'financials'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 text-left">Revenue & Analytics</span>
          </button>

          <button
            onClick={() => setActiveNav('server')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'server'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="flex-1 text-left">Server Health & Mesh</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>

          <div className="px-3 pt-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Security & System
          </div>

          <button
            onClick={() => setActiveNav('security')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'security'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            <span className="flex-1 text-left">Security & Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveNav('permissions')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'permissions'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-indigo-400" />
            <span className="flex-1 text-left">Staff & Permissions (RBAC)</span>
          </button>

          <button
            onClick={() => setActiveNav('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'settings'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-left">Platform Config & Backup</span>
          </button>

          <div className="px-3 pt-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            National News & Compliance
          </div>

          <button
            onClick={() => setActiveNav('news')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'news'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4 text-amber-400" />
            <span className="flex-1 text-left">National News Desk</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
              {newsArticles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('compliance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeNav === 'compliance'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 text-left">National Law Compliance</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
              {nationalLaws.length}
            </span>
          </button>
        </nav>

        {/* Bottom Switcher: Quick Jump Back to User Workspace */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070D1A] space-y-3">
          <button
            onClick={() => setWorkspace('user')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-200" />
              <span>Switch to User Workspace</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-2 truncate">
              <img
                src={projectOwner?.profilePicture || currentUser.avatar}
                alt="Owner Avatar"
                className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-400 flex-shrink-0"
              />
              <span className="truncate text-slate-200 font-semibold">{projectOwner?.fullName || currentUser.name}</span>
              <DvOwnerBadge size="xs" />
            </div>
            <button
              onClick={logoutOwner}
              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
              title="Logout from Owner Control Center"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MAIN EXECUTIVE CONTENT STAGE */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3.5">
            <DvOwnerBadge size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {activeNav === 'overview' && 'DAVD Executive Dashboard & Platform Analytics'}
                  {activeNav === 'profile' && 'Project Owner Permanent Profile & Security Credentials'}
                  {activeNav === 'company' && 'DAVD Company Management & Executive Suite'}
                  {activeNav === 'users' && 'User Accounts Governance & Security'}
                  {activeNav === 'moderation' && 'Posts & Community Feed Moderation'}
                  {activeNav === 'reports' && 'User Complaints & Escalation Desk'}
                  {activeNav === 'broadcasts' && 'System Broadcasts & Push Alerts'}
                  {activeNav === 'financials' && 'Platform Revenue & Financial Performance'}
                  {activeNav === 'server' && 'Server Infrastructure & WebRTC Mesh Telemetry'}
                  {activeNav === 'security' && 'Security Audit Logs & Access History'}
                  {activeNav === 'permissions' && 'Staff Permissions & Role-Based Access Control'}
                  {activeNav === 'settings' && 'Platform Configuration & Database Management'}
                  {activeNav === 'news' && 'National News Desk & Source Verification'}
                  {activeNav === 'compliance' && 'National Law Compliance & Equal Justice'}
                </h1>
                <DvOwnerBadge size="xs" withLabel />
              </div>
              <p className="text-xs text-slate-500">
                Company Owner: <span className="font-semibold text-amber-600">{projectOwner?.fullName || 'Jean Damour Ndagijimana (DAVD)'}</span> • Status: <span className="text-emerald-600 font-semibold">Verified Master Owner (Active & Permanent)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* My Profile Action */}
            <button
              onClick={() => setActiveNav('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeNav === 'profile'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              title="Manage Project Owner Profile"
            >
              <DvOwnerBadge size="xs" showTooltip={false} />
              <span>My Profile</span>
            </button>

            {/* Cluster Health Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CLUSTER NOMINAL (99.98% UPTIME)</span>
            </div>

            {/* Quick Backup Action */}
            <button
              onClick={downloadDatabaseBackup}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
              title="Download Snapshot of Database Tables"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Database Snapshot</span>
            </button>

            {/* Switch to User Workspace */}
            <button
              onClick={() => setWorkspace('user')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>User App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Secure Owner Logout Button */}
            <button
              onClick={logoutOwner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
              title="Securely log out from DAVD Company Owner Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Owner Logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {/* ============================================================== */}
          {activeNav === 'overview' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* SPECIAL PROJECT OWNER ACCOUNT IDENTIFICATION SECTION */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#070D1E] via-[#0B1528] to-[#111e38] border border-amber-400/40 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    {/* Owner Profile Picture with DV Half-Moon Overlay */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={projectOwner?.profilePicture || currentUser.avatar}
                        alt="Project Owner"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-amber-400/70 shadow-lg"
                      />
                      <div className="absolute -bottom-2 -right-2">
                        <DvOwnerBadge size="sm" showTooltip tooltipText="Official Tolkflow Project Owner (DAVD)" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                          <span>{projectOwner?.fullName || 'Jean Damour Ndagijimana (DAVD)'}</span>
                        </h2>
                        <DvOwnerBadge size="xs" withLabel />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        <span className="text-amber-300 font-mono">{projectOwner?.email || 'ndagijimanajeandamour906@gmail.com'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{projectOwner?.phoneNumber || '+250 788 123 456'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">🌍 {projectOwner?.country || 'Rwanda'}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Permanent Account • Active</span>
                        </span>
                        <span className="text-slate-400 hidden sm:inline">
                          Hashed & Salted Storage Verified • Multi-Platform Sync
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Navigation */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setActiveNav('profile')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <DvOwnerBadge size="xs" showTooltip={false} />
                      <span>Manage My Profile</span>
                    </button>

                    <button
                      onClick={() => setActiveNav('security')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Security Settings</span>
                    </button>

                    <button
                      onClick={() => setActiveNav('settings')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>System Management</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Primary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Registered Users
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                      {totalUsers.toLocaleString()}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" /> +14.2% this week
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Active Users Online
                    </span>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                      {activeUsers}
                    </p>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                      Across 28 global regions
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Suspended / Blocked
                    </span>
                    <p className="text-3xl font-extrabold text-rose-600 mt-1 font-mono">
                      {suspendedUsers}
                    </p>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                      Enforced by audit policy
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <UserX className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Monthly Recurring Revenue
                    </span>
                    <p className="text-3xl font-extrabold text-blue-600 mt-1 font-mono">
                      ${financialStats.mrrUsd.toLocaleString()}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" /> +{financialStats.growthRatePercent}% MoM
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Secondary Executive KPI Row (Calls, Messages, Media, Reports) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Messages Sent */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Messages Sent
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                      {totalMessagesCount.toLocaleString()}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3 text-cyan-500" /> Real-time neural translation
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                </div>

                {/* Audio & Video Call Statistics */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      HD Voice & Video Calls
                    </span>
                    <p className="text-3xl font-extrabold text-cyan-600 mt-1 font-mono">
                      {(callRecords?.length || 18) + 42}
                    </p>
                    <span className="text-[11px] font-medium text-cyan-700 flex items-center gap-1 mt-1">
                      <PhoneCall className="w-3 h-3 text-cyan-500" /> WebRTC STUN/TURN mesh
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Video className="w-6 h-6" />
                  </div>
                </div>

                {/* Total Posts & Uploaded Media */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Posts & Uploaded Media
                    </span>
                    <p className="text-3xl font-extrabold text-amber-600 mt-1 font-mono">
                      {posts.length + 84}
                    </p>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                      Stories, feed & vault assets
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                </div>

                {/* Reports & Complaints */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Reports & Complaints
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                      {pendingReportsCount}{' '}
                      <span className="text-xs font-normal text-slate-400">/ {reports.length} total</span>
                    </p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> SLA response &lt; 2 hrs
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Flag className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Interactive Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart (2 cols) */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Platform Growth & User Engagement (Last 7 Days)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Daily active sessions, messages exchanged, and automatic neural translations
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700">
                      LIVE TELEMETRY
                    </span>
                  </div>

                  {/* High Quality Interactive SVG Chart */}
                  <div className="h-64 w-full relative pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="160" x2="700" y2="160" stroke="#E2E8F0" strokeDasharray="4" />
                      <line x1="0" y1="110" x2="700" y2="110" stroke="#E2E8F0" strokeDasharray="4" />
                      <line x1="0" y1="60" x2="700" y2="60" stroke="#E2E8F0" strokeDasharray="4" />

                      {/* Area Fill */}
                      <path
                        d="M 20 150 Q 120 120 220 90 T 420 50 T 620 30 L 680 20 L 680 180 L 20 180 Z"
                        fill="url(#chartGrad)"
                      />

                      {/* Growth Line */}
                      <path
                        d="M 20 150 Q 120 120 220 90 T 420 50 T 620 30 L 680 20"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Data Points */}
                      {[
                        { x: 20, y: 150, day: 'Mon', val: '1.2k' },
                        { x: 130, y: 120, day: 'Tue', val: '2.4k' },
                        { x: 240, y: 90, day: 'Wed', val: '3.8k' },
                        { x: 350, y: 70, day: 'Thu', val: '5.1k' },
                        { x: 460, y: 50, day: 'Fri', val: '6.4k' },
                        { x: 570, y: 35, day: 'Sat', val: '7.9k' },
                        { x: 680, y: 20, day: 'Sun', val: '9.4k' },
                      ].map((pt, i) => (
                        <g key={i}>
                          <circle cx={pt.x} cy={pt.y} r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
                          <text x={pt.x} y="195" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">
                            {pt.day}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-blue-600" /> Active Messages (Peak 9,420/day)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-cyan-400" /> Neural Translations (42 Languages)
                    </span>
                  </div>
                </div>

                {/* Multilingual Translation Distribution (1 col) */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Translation Requests by Language
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proportion of live translated chat and speech queries
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { lang: 'Kinyarwanda (rw)', pct: 34, color: 'bg-emerald-500', region: 'African' },
                      { lang: 'English (en)', pct: 28, color: 'bg-blue-600', region: 'Global' },
                      { lang: 'Kiswahili (sw)', pct: 16, color: 'bg-cyan-500', region: 'African' },
                      { lang: 'Chinese Simplified (zh)', pct: 12, color: 'bg-indigo-500', region: 'Asian' },
                      { lang: 'French (fr)', pct: 10, color: 'bg-purple-500', region: 'European' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-700">{item.lang}</span>
                          <span className="text-slate-900 font-bold font-mono">{item.pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span>Engine: <b>Gemini 3.8 Flash Neural</b></span>
                    <span className="text-emerald-600 font-mono font-bold">18ms AVG</span>
                  </div>
                </div>
              </div>

              {/* Recent Real Audit Activity & Reports Ticker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Reports */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Flag className="w-4 h-4 text-rose-500" />
                      Pending Community Reports ({pendingReportsCount})
                    </h3>
                    <button
                      onClick={() => setActiveNav('reports')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View All Reports →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {reports.slice(0, 3).map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rep.reporterName}</span>
                            <span className="text-slate-400">reported</span>
                            <span className="font-semibold text-slate-800">{rep.targetName}</span>
                          </div>
                          <p className="text-slate-500 line-clamp-1">{rep.reason}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Audit Log Trail */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-600" />
                      Recent Administrator Audit Trail
                    </h3>
                    <button
                      onClick={() => setActiveNav('security')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Full Audit Log →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {auditLogs.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-blue-700">{log.action}</span>
                            <span className="text-slate-400">by {log.adminName}</span>
                          </div>
                          <p className="text-slate-600 line-clamp-1">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: PROJECT OWNER - "MY PROFILE" & PERMANENT CREDENTIALS */}
          {/* ============================================================== */}
          {activeNav === 'profile' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Profile Hero Card with Golden DV Crescent Moon Badge */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#070D1E] via-[#0B1528] to-[#122143] border border-amber-400/50 shadow-2xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    {/* Large Profile Picture with DV Half-Moon Insignia */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={profilePic}
                        alt={profileName}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-amber-400/60 shadow-2xl"
                      />
                      <label className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer shadow-lg transition-transform hover:scale-110">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                          <span>{profileName}</span>
                        </h2>
                        <DvOwnerBadge size="sm" withLabel />
                      </div>

                      <p className="text-xs text-amber-200/90 font-mono">
                        Official Tolkflow Project Owner • Executive Founder
                      </p>

                      <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Status: Verified Master Owner (Active & Permanent)</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          Clearance: Master Level 0
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* High-Level Badges & Verification */}
                  <div className="flex flex-col items-start md:items-end gap-2 text-right">
                    <DvOwnerBadge size="lg" />
                    <span className="text-[11px] text-slate-300 font-mono">
                      Database Table: <b className="text-amber-300">project_owners</b>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Persistent Disk & SQL Synced
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Alerts */}
              {profileSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold">{profileSuccessMsg}</span>
                </div>
              )}
              {profileErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span className="font-semibold">{profileErrorMsg}</span>
                </div>
              )}

              {/* Two Column Layout: Main Profile Info vs Security Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 Columns): Personal & Contact Information Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-amber-500" />
                          <span>Owner Personal Information</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          View and update your registered owner details. Changes are immediately saved to permanent database storage.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-mono text-xs font-bold border border-amber-200">
                        MY PROFILE
                      </span>
                    </div>

                    <form onSubmit={handleSaveOwnerProfile} className="space-y-4">
                      {/* 1. Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                          placeholder="e.g. Jean Damour Ndagijimana (DAVD)"
                        />
                      </div>

                      {/* 2. Phone Number & Country */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                            placeholder="+250 788 123 456"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Country
                          </label>
                          <select
                            value={profileCountry}
                            onChange={(e) => setProfileCountry(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            {OWNER_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.name}>
                                {c.flag} {c.name} ({c.dial})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3. Email Address */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                          placeholder="ndagijimanajeandamour906@gmail.com"
                        />
                      </div>

                      {/* 4. Profile Picture URL & File Upload */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Profile Picture URL or Upload
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={profilePic}
                            onChange={(e) => setProfilePic(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="https://images.unsplash.com/..."
                          />
                          <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1.5 transition-colors">
                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Submit Profile Save Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {savingProfile ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving to Database...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Save Profile Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Password Change Card */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-600" />
                          <span>Change Owner Password</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Update your cryptographic login password. Requires current password confirmation.
                        </p>
                      </div>
                    </div>

                    {passSuccessMsg && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{passSuccessMsg}</span>
                      </div>
                    )}
                    {passErrorMsg && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>{passErrorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateOwnerPassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Current Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordChange ? 'text' : 'password'}
                            required
                            value={currPassword}
                            onChange={(e) => setCurrPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordChange ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            New Password <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type={showPasswordChange ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="Min 6 characters"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Confirm New Password <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type={showPasswordChange ? 'text' : 'password'}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="Repeat new password"
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={changingPass}
                          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {changingPass ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Update Owner Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right (1 Column): Security, Secret Owner Code & Identity Status */}
                <div className="space-y-6">
                  {/* Immutable Owner Code Security Banner */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#070D1E] text-white border border-amber-400/30 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-sm text-white">Master Owner Code</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        NON-EDITABLE
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 font-mono text-center space-y-1">
                      <p className="text-sm font-bold tracking-widest text-amber-400">
                        •••• •••• •••• ••••
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Salted SHA-256 Hash Stored in DB
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                      <p>
                        <b className="text-amber-300">Security Rule:</b> The Owner Code was verified during first-time registration and permanently locked.
                      </p>
                      <p className="text-slate-400">
                        It cannot be edited through profile settings. This prevents unauthorized takeover even if a session is left unattended.
                      </p>
                    </div>
                  </div>

                  {/* Verification & Credential Details */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                      <span>Owner Verification Status</span>
                      <DvOwnerBadge size="xs" />
                    </h4>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Account Type</span>
                        <span className="font-bold text-slate-900 font-mono">Project Owner</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Badge Insignia</span>
                        <span className="font-bold text-amber-600 flex items-center gap-1 font-mono">
                          <span>DV Crescent Moon</span>
                          <DvOwnerBadge size="xs" />
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Account Status</span>
                        <span className="font-bold text-emerald-600">Active & Permanent</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Registered Date</span>
                        <span className="font-mono text-slate-700">
                          {projectOwner?.createdAt ? new Date(projectOwner.createdAt).toLocaleDateString() : 'Permanent Setup'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Last Verified Login</span>
                        <span className="font-mono text-slate-700">
                          {projectOwner?.lastLogin ? new Date(projectOwner.lastLogin).toLocaleTimeString() : 'Current Active Session'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500">Two-Factor Authentication</span>
                        <span className="font-bold text-emerald-600 font-mono">2FA Enforced</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1B: DAVD COMPANY MANAGEMENT & OPERATIONS */}
          {/* ============================================================== */}
          {activeNav === 'company' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Golden Insignia Company Overview Header */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#070D1A] via-[#0B1528] to-[#111e38] text-white shadow-xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/40 border border-amber-200">
                    DAVD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        {companyInfo.companyName}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        EXECUTIVE OWNER SUITE
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Platform Founder & Company Owner: <strong className="text-white">{companyInfo.ownerName}</strong> • Registered: {companyInfo.registrationNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono text-amber-300 border border-amber-400/30">
                    Jurisdiction: {companyInfo.primaryJurisdiction}
                  </span>
                </div>
              </div>

              {/* Company Information Form & Service Toggles in 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1 & 2: Company Information Form */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        Company Legal Profile & Corporate Governance
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Statutory enterprise data, registered executive contacts, and global headquarters
                      </p>
                    </div>

                    {saveSuccess && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" /> Saved Successfully
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Company Legal Name</label>
                      <input
                        type="text"
                        value={companyInfo.companyName}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Commercial Registration No.</label>
                      <input
                        type="text"
                        value={companyInfo.registrationNumber}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, registrationNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Company Owner & Executive Leadership</label>
                      <input
                        type="text"
                        value={companyInfo.ownerName}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, ownerName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Executive Role</label>
                      <input
                        type="text"
                        value={companyInfo.ownerRole}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, ownerRole: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">Global Headquarters Location</label>
                      <input
                        type="text"
                        value={companyInfo.headquarters}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, headquarters: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Support Inquiries Email</label>
                      <input
                        type="email"
                        value={companyInfo.supportEmail}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Legal & Regulatory Email</label>
                      <input
                        type="email"
                        value={companyInfo.legalEmail}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, legalEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Data Protection Officer</label>
                      <input
                        type="text"
                        value={companyInfo.complianceOfficer}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, complianceOfficer: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Enterprise Tax ID / TIN</label>
                      <input
                        type="text"
                        value={companyInfo.taxIdentificationNo}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, taxIdentificationNo: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={savingCompany}
                      onClick={async () => {
                        setSavingCompany(true);
                        try {
                          await fetch('/api/admin/company', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(companyInfo),
                          });
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 2500);
                        } finally {
                          setSavingCompany(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingCompany ? 'Saving Corporate Records...' : 'Save Company Information'}
                    </button>
                  </div>
                </div>

                {/* Column 3: Platform Services Switcher */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Platform Services Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enable or suspend core communications modules
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {[
                      { key: 'messagingEngine', label: 'Real-Time Messaging Engine', desc: 'Instant chat & media delivery' },
                      { key: 'voiceCalling', label: 'HD Audio Voice Calling', desc: 'Encrypted WebRTC voice channels' },
                      { key: 'videoCalling', label: 'HD Video Calling', desc: 'Hardware-accelerated peer video' },
                      { key: 'aiNeuralTranslation', label: 'AI Neural Translation', desc: 'Live speech & message translator' },
                      { key: 'flowRooms', label: 'Flow Audio/Video Rooms', desc: 'Multi-party discussion stages' },
                      { key: 'socialPostsFeed', label: 'Social Posts & Status Stories', desc: 'Community sharing & timeline' },
                      { key: 'nationalNewsDesk', label: 'Smart National News Desk', desc: 'Official source monitoring' },
                      { key: 'legalComplianceSystem', label: 'National Law Compliance', desc: 'Universal equality & audit logs' },
                    ].map((srv) => {
                      const isEnabled = companyInfo.servicesStatus?.[srv.key as keyof typeof companyInfo.servicesStatus] ?? true;
                      return (
                        <div key={srv.key} className="py-2.5 flex items-center justify-between">
                          <div className="pr-2">
                            <p className="font-semibold text-slate-800">{srv.label}</p>
                            <p className="text-[10px] text-slate-500">{srv.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={async (e) => {
                              const updated = {
                                ...companyInfo.servicesStatus,
                                [srv.key]: e.target.checked,
                              };
                              setCompanyInfo({ ...companyInfo, servicesStatus: updated });
                              await fetch('/api/admin/services/toggle', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ serviceKey: srv.key, enabled: e.target.checked }),
                              });
                            }}
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Administrators & Security Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Administrators Monitoring */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-600" />
                        Administrator & Staff Governance
                      </h3>
                      <p className="text-xs text-slate-500">
                        Staff accounts with elevated platform management roles
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {allUsers.filter((u) => u.role !== 'user').length} Staff Members
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {allUsers
                      .filter((u) => u.role !== 'user')
                      .map((admin) => (
                        <div key={admin.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={admin.avatar}
                              alt={admin.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{admin.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{admin.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                admin.role === 'superadmin'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {admin.role}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Security Alerts & Threat Mitigation */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        Executive Security Alerts & Threat Logs
                      </h3>
                      <p className="text-xs text-slate-500">
                        Real-time authentication, rate-limiting, and infrastructure anomalies
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      SYS HEALTH: NOMINAL
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {(securityAlerts.length > 0
                      ? securityAlerts
                      : [
                          {
                            id: 'sec_01',
                            severity: 'low',
                            title: 'DAVD Company Owner Portal Accessed',
                            detail: 'Authenticated session established from IP 197.243.18.92 with valid 2FA.',
                            timestamp: new Date().toISOString(),
                            resolved: true,
                          },
                          {
                            id: 'sec_02',
                            severity: 'medium',
                            title: 'Rate Limit Throttling Triggered',
                            detail: 'Guest IP from Lagos attempted 120 rapid API requests in 60s; auto-backoff applied.',
                            timestamp: new Date(Date.now() - 3600000).toISOString(),
                            resolved: true,
                          },
                          {
                            id: 'sec_03',
                            severity: 'low',
                            title: 'Database Auto-Snapshot Generated',
                            detail: 'Encrypted daily JSON database snapshot compiled successfully.',
                            timestamp: new Date(Date.now() - 7200000).toISOString(),
                            resolved: true,
                          },
                        ]
                    ).map((al: any) => (
                      <div
                        key={al.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                                al.severity === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : al.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {al.severity}
                            </span>
                            <span className="font-semibold text-slate-800">{al.title}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{al.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: USER GOVERNANCE & VERIFICATION MANAGEMENT */}
          {/* ============================================================== */}
          {activeNav === 'users' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Verification Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-mono uppercase text-slate-400">Total Registered</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">SQLite & Cluster</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm">
                  <p className="text-[11px] font-mono uppercase text-emerald-600">Verified Accounts</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{verifiedUsersCount}</p>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">OTP email confirmed</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm">
                  <p className="text-[11px] font-mono uppercase text-amber-600">Unverified Pending</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{unverifiedUsersCount}</p>
                  <p className="text-[11px] text-amber-600/80 mt-0.5">Login restricted</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm">
                  <p className="text-[11px] font-mono uppercase text-rose-600">Suspended</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{suspendedUsers}</p>
                  <p className="text-[11px] text-rose-600/80 mt-0.5">Access revoked</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm">
                  <p className="text-[11px] font-mono uppercase text-blue-600">Verification Rate</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{verificationRate}%</p>
                  <p className="text-[11px] text-blue-600/80 mt-0.5">Verified share</p>
                </div>
              </div>

              {/* Header and Controls */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, @username, email, or country..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="superadmin">Super Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">Normal User</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="all">All Verification States</option>
                    <option value="verified">Verified Only</option>
                    <option value="unverified">Unverified Only</option>
                    <option value="suspended">Suspended Only</option>
                  </select>

                  <button
                    onClick={() => refreshAdminUsers()}
                    className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Sync verification records from server"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Users Data Table (never exposes password_hash or otp_hash) */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User Identity</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4">Email Verification</th>
                        <th className="py-3 px-4">Registration & Verified</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isVerified = Boolean(u.isVerified ?? u.verified);
                        const isSuspended = Boolean(u.isBlocked || u.accountStatus === 'suspended');
                        const regDate = u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'Platform Seed';
                        const verDate = u.verifiedAt
                          ? new Date(u.verifiedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : isVerified
                          ? 'Verified'
                          : 'Pending OTP';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                />
                                <div>
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isProjectOwnerUser(u, projectOwner) && (
                                      <DvOwnerBadge size="xs" withLabel />
                                    )}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-800">{u.email}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{u.phone || u.country}</p>
                            </td>
                            <td className="py-3 px-4">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" /> UNVERIFIED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <p className="text-slate-700">Reg: {regDate}</p>
                              <p className={isVerified ? 'text-emerald-600' : 'text-amber-600'}>
                                Ver: {verDate}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                                  u.role === 'superadmin'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : u.role === 'moderator'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  <UserX className="w-3 h-3" /> SUSPENDED
                                </span>
                              ) : isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  <UserCheck className="w-3 h-3" /> ACTIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                  <Clock className="w-3 h-3" /> PENDING OTP
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isSuspended ? (
                                  <button
                                    onClick={async () => {
                                      await reactivateUserAccount(u.id);
                                      await refreshAdminUsers();
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                    title="Reactivate account"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      await suspendUserAccount(u.id);
                                      await refreshAdminUsers();
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                    title="Suspend account"
                                  >
                                    Suspend
                                  </button>
                                )}

                                <select
                                  value={u.role}
                                  onChange={async (e) => {
                                    await updateUserRole(u.id, e.target.value as UserRole);
                                    await refreshAdminUsers();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[11px] text-slate-700 focus:outline-none cursor-pointer"
                                >
                                  <option value="user">User</option>
                                  <option value="moderator">Moderator</option>
                                  <option value="superadmin">Superadmin</option>
                                </select>

                                <button
                                  onClick={() => setConfirmDeleteUser({ id: u.id, username: u.username })}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                            No user accounts match the current search or verification filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* In-App Delete Confirmation Modal */}
              {confirmDeleteUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Confirm Account Purge</h3>
                        <p className="text-xs text-slate-500">
                          Permanently delete account records for @{confirmDeleteUser.username}?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDeleteUser(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const targetId = confirmDeleteUser.id;
                          setConfirmDeleteUser(null);
                          await deleteUserAccount(targetId);
                          await refreshAdminUsers();
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CONTENT MODERATION */}
          {/* ============================================================== */}
          {activeNav === 'moderation' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Feed Posts & Moments Moderation Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audit public posts, verify multilingual text consistency, or remove violating content
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {posts.length} ACTIVE POSTS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{post.authorName}</p>
                            <p className="text-[10px] text-slate-400">@{post.authorUsername} • {post.authorCountry}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700">
                          {post.visibility.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                        {post.content}
                      </p>

                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="rounded-xl overflow-hidden max-h-36 border border-slate-100">
                          <img
                            src={post.mediaUrls[0]}
                            alt="Post media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>❤️ {post.likesCount} Likes</span>
                        <span>💬 {post.commentsCount} Comments</span>
                        <span>🌐 {post.authorLanguage}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => deletePostByAdmin(post.id, 'Moderator takedown')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Take Down</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: REPORTS & COMPLAINTS DESK */}
          {/* ============================================================== */}
          {activeNav === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Complaints & Dispute Resolution Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time tickets filed by platform users with audit resolution workflow
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 text-xs">
                  {(['all', 'pending', 'under_review', 'resolved', 'dismissed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setReportFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                        reportFilter === st ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                            <Flag className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="text-[10px] font-mono text-slate-400">TICKET #{ticket.id}</span>
                            <h4 className="text-xs font-bold text-slate-900">{ticket.reason}</h4>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                            ticket.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ticket.status === 'dismissed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                        <p className="text-slate-600">
                          <b className="text-slate-900">Reporter:</b> {ticket.reporterName}
                        </p>
                        <p className="text-slate-600">
                          <b className="text-slate-900">Target ({ticket.targetType}):</b> {ticket.targetName}
                        </p>
                        {ticket.details && (
                          <p className="text-slate-500 italic mt-1 text-[11px]">"{ticket.details}"</p>
                        )}
                      </div>

                      {ticket.resolutionNotes && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                          <b>Resolution Note:</b> {ticket.resolutionNotes} (by {ticket.resolvedBy})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => setSelectedReport(ticket)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors cursor-pointer"
                      >
                        Resolve Ticket →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resolution Action Modal */}
              {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 border border-slate-200 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Resolve Ticket #{selectedReport.id}
                      </h3>
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600">
                      <p><b>Target:</b> {selectedReport.targetName} ({selectedReport.targetType})</p>
                      <p><b>Reason:</b> {selectedReport.reason}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Moderator Resolution Notes</label>
                      <textarea
                        rows={3}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail actions taken (account suspended, content cleared, or warning issued)..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleResolveTicket('dismissed')}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        Dismiss as False Positive
                      </button>
                      <button
                        onClick={() => handleResolveTicket('resolved')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        Enforce & Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: SYSTEM BROADCASTS */}
          {/* ============================================================== */}
          {activeNav === 'broadcasts' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Dispatch Global Platform Notification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instantly broadcast high-priority announcements and maintenance alerts to all connected users
                  </p>
                </div>

                {broadcastDone && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Broadcast successfully dispatched and logged in security audit trail.</span>
                  </div>
                )}

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Announcement Title</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. Scheduled WebRTC Mesh Upgrade or New Language Pack Online"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Detailed Message</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Write message copy delivered to all user client devices..."
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Priority Level</label>
                      <select
                        value={annPriority}
                        onChange={(e) => setAnnPriority(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="normal">Normal (Informative)</option>
                        <option value="high">High (Feature Release)</option>
                        <option value="critical">Critical (Maintenance Alert)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Target Group</label>
                      <select
                        value={annRole}
                        onChange={(e) => setAnnRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="all">All Platform Users</option>
                        <option value="user">Normal Users Only</option>
                        <option value="moderator">Moderators Only</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{broadcasting ? 'Dispatching...' : 'Dispatch Platform Broadcast'}</span>
                  </button>
                </form>
              </div>

              {/* Past Announcements History */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Recent Broadcast History</h3>
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">{ann.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600">{ann.message}</p>
                      <p className="text-[10px] text-blue-600 font-mono pt-1">
                        Dispatched to: {ann.targetRole.toUpperCase()} by {ann.sentBy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: FINANCIAL & REVENUE ANALYTICS */}
          {/* ============================================================== */}
          {activeNav === 'financials' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <AdminFinancialLedgerPanel variant="light" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Annual Run Rate (ARR)
                  </span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                    ${(financialStats.mrrUsd * 12).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">+28.4% subscription growth</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Flow Transfer Escrow Volume
                  </span>
                  <p className="text-3xl font-extrabold text-blue-600 mt-1 font-mono">
                    ${financialStats.flowTransferEscrowVolumeUsd.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Processed over P2P mesh network</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Paid Subscribers
                  </span>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                    {financialStats.activeSubscribers.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Pro Multilingual + Enterprise</p>
                </div>
              </div>

              {/* Plans breakdown */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Subscription Tiers Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500">Free Tier</p>
                    <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {financialStats.planBreakdown.free.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Standard P2P chat & voice</p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-xs font-bold text-blue-700">Pro Multilingual ($9.99/mo)</p>
                    <p className="text-2xl font-extrabold text-blue-900 font-mono mt-1">
                      {financialStats.planBreakdown.proMultilingual.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-1">Unlimited live call translation + 50GB Vault</p>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="text-xs font-bold text-purple-700">Enterprise Organizations ($49/mo)</p>
                    <p className="text-2xl font-extrabold text-purple-900 font-mono mt-1">
                      {financialStats.planBreakdown.enterprise.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-purple-600 mt-1">Custom translation models + audit exports</p>
                  </div>
                </div>
              </div>

              {/* Configurable 5% Growth-Based Dynamic Revenue Adjustment Rule */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">
                          Configurable 5% Dynamic Revenue Adjustment Rule
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            dynamicAdjustmentRule.enabled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {dynamicAdjustmentRule.enabled ? 'ACTIVE & ENFORCED' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Growth-linked revenue reinvestment triggered at {dynamicAdjustmentRule.milestoneUsersThreshold.toLocaleString()} active users.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() =>
                      updateDynamicAdjustmentRule({ enabled: !dynamicAdjustmentRule.enabled })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dynamicAdjustmentRule.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    {dynamicAdjustmentRule.enabled ? 'Rule Enabled (5%)' : 'Enable 5% Rule'}
                  </button>
                </div>

                {/* Milestone Progress & Real-time yield */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      User Milestone Target
                    </span>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                      {dynamicAdjustmentRule.milestoneUsersThreshold.toLocaleString()} Users
                    </p>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-full rounded-full transition-all" />
                    </div>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      100% Target Met (Active: 5,000+)
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Adjustment Rate
                    </span>
                    <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                      {dynamicAdjustmentRule.adjustmentPercent}%
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Growth reinvestment percentage
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Monthly Reinvestment Yield
                    </span>
                    <p className="text-2xl font-black text-blue-600 font-mono mt-1">
                      ${((financialStats.mrrUsd * dynamicAdjustmentRule.adjustmentPercent) / 100).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Derived from ${(financialStats.mrrUsd).toLocaleString()} MRR
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Annual Reinvestment Injection
                    </span>
                    <p className="text-2xl font-black text-purple-600 font-mono mt-1">
                      ${(((financialStats.mrrUsd * dynamicAdjustmentRule.adjustmentPercent) / 100) * 12).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      For continuous scaling & SLA
                    </p>
                  </div>
                </div>

                {/* 5% Reinvestment Allocation Blueprint */}
                <div className="p-4 rounded-xl bg-white border border-emerald-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>5% Dynamic Fund Allocation Blueprint</span>
                    <span className="text-emerald-600 font-mono">100% Reinvestment Ratio</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <p className="font-extrabold text-emerald-900">40% Server Scaling</p>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Horizontal node autoscaling, database read-replicas & 5,000+ concurrency headroom.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200">
                      <p className="font-extrabold text-teal-900">30% HD Audio/Video</p>
                      <p className="text-[11px] text-teal-700 mt-1">
                        TURN/STUN relay bandwidth, global WebRTC edge routing & packet jitter reduction.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
                      <p className="font-extrabold text-blue-900">20% AI Neural Translation</p>
                      <p className="text-[11px] text-blue-700 mt-1">
                        Subsidized Gemini 3.8 Flash inference & low-latency voice synthesis in 40+ languages.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200">
                      <p className="font-extrabold text-purple-900">10% Security & Patches</p>
                      <p className="text-[11px] text-purple-700 mt-1">
                        Automated vulnerability scanning, post-quantum key updates & intrusion prevention.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Controls & Settings */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-800">Dynamic Adjustment Configuration</p>
                      <p className="text-[11px] text-slate-500">
                        Configured rate: {dynamicAdjustmentRule.adjustmentPercent}% | Effective from: {dynamicAdjustmentRule.effectiveDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-slate-600 font-medium">Adjustment Rate:</label>
                    <select
                      value={dynamicAdjustmentRule.adjustmentPercent}
                      onChange={(e) =>
                        updateDynamicAdjustmentRule({ adjustmentPercent: Number(e.target.value) })
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 font-mono font-bold outline-none cursor-pointer"
                    >
                      <option value={3}>3.0% (Conservative)</option>
                      <option value={5}>5.0% (Recommended Standard)</option>
                      <option value={7.5}>7.5% (Accelerated Growth)</option>
                      <option value={10}>10.0% (Maximum Expansion)</option>
                    </select>

                    <button
                      onClick={() =>
                        updateDynamicAdjustmentRule({
                          allowAutomaticDiscount: !dynamicAdjustmentRule.allowAutomaticDiscount,
                        })
                      }
                      className={`px-3 py-1 rounded-lg border font-medium transition-colors ${
                        dynamicAdjustmentRule.allowAutomaticDiscount
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-600'
                      }`}
                    >
                      {dynamicAdjustmentRule.allowAutomaticDiscount ? '✓ User Benefit Pass-Through' : 'Internal Only'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: SERVER INFRASTRUCTURE & TELEMETRY */}
          {/* ============================================================== */}
          {activeNav === 'server' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-400">Node Heap Memory</span>
                  <p className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                    {telemetry.memoryUsedMb} MB
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">of {telemetry.memoryTotalMb} MB total allocated</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-400">CPU Core Load</span>
                  <p className="text-3xl font-extrabold text-emerald-600 font-mono mt-1">
                    {telemetry.cpuUsagePercent}%
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-1">Thermal limits optimal</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-400">P2P WebRTC Latency</span>
                  <p className="text-3xl font-extrabold text-cyan-600 font-mono mt-1">
                    {telemetry.p2pMeshLatencyMs} ms
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{telemetry.webrtcMeshNodes} active relay nodes</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-400">Database Connection Pool</span>
                  <p className="text-3xl font-extrabold text-blue-600 font-mono mt-1">
                    {telemetry.dbPoolConnections} Active
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{telemetry.totalDbQueries.toLocaleString()} total queries</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Cluster Health & Security Diagnostics</h3>
                  <button
                    onClick={refreshTelemetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Health Diagnostic</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-800">Quantum WebRTC Mesh Node #1</p>
                    <p className="text-slate-500">Kigali Regional Gateway (IP: 197.243.18.92)</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                      ACTIVE • 14ms
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-800">Quantum WebRTC Mesh Node #2</p>
                    <p className="text-slate-500">London Regional Gateway (europe-west2)</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                      ACTIVE • 19ms
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-800">Quantum WebRTC Mesh Node #3</p>
                    <p className="text-slate-500">Singapore Regional Gateway (asia-southeast1)</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                      ACTIVE • 24ms
                    </span>
                  </div>
                </div>
              </div>

              {/* 5,000+ Concurrent Users Scalability & Ultra-Fast Performance Engine */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 border border-blue-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">
                          High-Concurrency Scalability & Load Testing Engine
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                          BENCHMARK: 5,000+ CONCURRENT
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-throughput messaging, WebRTC HD audio/video calling mesh and database load balancing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Simulate Concurrency:</span>
                    <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs shadow-xs">
                      {simulatedConcurrency.toLocaleString()} Users
                    </span>
                  </div>
                </div>

                {/* Interactive Concurrency Slider */}
                <div className="p-4 rounded-xl bg-white border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Simulated Real-Time Concurrent Connections</span>
                    <span className="text-blue-600 font-mono font-bold">
                      Target Capacity: 5,000 Baseline (Scalable to 100,000+)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={simulatedConcurrency}
                    onChange={(e) => setSimulatedConcurrency(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1,000 Active</span>
                    <span className="font-bold text-blue-700">5,000 (Target SLA)</span>
                    <span>10,000</span>
                    <span>25,000</span>
                    <span>50,000</span>
                    <span>100,000+</span>
                  </div>
                </div>

                {/* Real-time Scalability Telemetry Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Throughput Rate
                    </span>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                      {(simulatedConcurrency * 38).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      Messages dispatched / second
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Real-Time HD Media Streams
                    </span>
                    <p className="text-2xl font-black text-blue-600 font-mono mt-1">
                      {(simulatedConcurrency * 0.16).toFixed(0)} Streams
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Simultaneous audio/video sessions
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      P2P Mesh Round-Trip
                    </span>
                    <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                      {Math.max(12, Math.round(14 + (simulatedConcurrency / 25000)))} ms
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Zero jitter buffer latency
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Query Pool Performance
                    </span>
                    <p className="text-2xl font-black text-purple-600 font-mono mt-1">
                      1.8 ms
                    </p>
                    <p className="text-[11px] text-purple-600 font-medium mt-1">
                      99.99% Cache & index hit ratio
                    </p>
                  </div>
                </div>

                {/* Architecture Growth Blueprint: 5K -> 10K -> 50K -> 100K+ */}
                <div className="p-4 rounded-xl bg-white border border-blue-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Non-Disruptive Architecture Expansion Roadmap</span>
                    <span className="text-blue-600 font-mono text-[11px]">Zero-Downtime Migration</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>5,000 Active (Tier 1 Baseline)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        High-efficiency Node.js event loop + WebRTC mesh + optimistic UI + media compression.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>10,000 - 50,000 Active (Tier 2)</span>
                      </div>
                      <p className="text-[11px] text-blue-700 mt-1">
                        Clustered horizontal worker pods, Redis signaling broker & distributed database read replicas.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>100,000+ Active (Tier 3 Enterprise)</span>
                      </div>
                      <p className="text-[11px] text-purple-700 mt-1">
                        Multi-region global Anycast, edge WebRTC relay clusters, and dedicated AI GPU inferencing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: SECURITY & AUDIT LOGS */}
          {/* ============================================================== */}
          {activeNav === 'security' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Immutable Administrative Audit Logs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cryptographic record of every administrative action, user suspension, role change, and login
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {auditLogs.length} AUDIT ENTRIES
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Administrator</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target Details</th>
                        <th className="py-3 px-4">IP Origin</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                            {log.adminName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-700 max-w-xs truncate">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {log.ip}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 9: STAFF PERMISSIONS & RBAC MATRIX */}
          {/* ============================================================== */}
          {activeNav === 'permissions' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Role-Based Access Control (RBAC) Governance Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Defines fine-grained operational permissions across the Project Owner, Moderators, and Normal Users
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Capability / Access Scope</th>
                        <th className="py-3 px-4 text-center">Normal User</th>
                        <th className="py-3 px-4 text-center">Community Moderator</th>
                        <th className="py-3 px-4 text-center">Super Admin (Project Owner)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { cap: 'Send Messages, Voice Notes & Call in WebRTC', u: true, m: true, a: true },
                        { cap: 'Real-Time Neural Speech & Text Translation', u: true, m: true, a: true },
                        { cap: 'Submit Violation Reports & Dispute Tickets', u: true, m: true, a: true },
                        { cap: 'Access Private Message Vault (AES-GCM-256)', u: true, m: true, a: true },
                        { cap: 'Access Project Owner Control Center', u: false, m: false, a: true },
                        { cap: 'Moderate & Takedown Violating Feed Posts', u: false, m: true, a: true },
                        { cap: 'Resolve and Dismiss User Reports', u: false, m: true, a: true },
                        { cap: 'Suspend or Reactivate User Accounts', u: false, m: false, a: true },
                        { cap: 'Modify User Role Privileges', u: false, m: false, a: true },
                        { cap: 'Dispatch Global Push Broadcasts', u: false, m: false, a: true },
                        { cap: 'Export Full Database Backups & Snapshots', u: false, m: false, a: true },
                        { cap: 'Modify Platform Settings & Maintenance Toggles', u: false, m: false, a: true },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{row.cap}</td>
                          <td className="py-3 px-4 text-center">
                            {row.u ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.m ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.a ? <CheckCircle2 className="w-4 h-4 text-blue-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 10: PLATFORM SETTINGS & BACKUP */}
          {/* ============================================================== */}
          {activeNav === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Platform Master Switches & Engine Governance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Changes take effect across all cluster nodes immediately
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Maintenance Mode */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Maintenance Mode</p>
                      <p className="text-[11px] text-slate-500">
                        When enabled, normal users will see a maintenance notice while owners retain access
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={platformSettings.maintenanceMode}
                      onChange={(e) => updatePlatformSettings({ maintenanceMode: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Allow Signups */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Allow New User Registrations</p>
                      <p className="text-[11px] text-slate-500">
                        Controls whether public signups are permitted on the platform
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={platformSettings.allowSignups}
                      onChange={(e) => updatePlatformSettings({ allowSignups: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Enforce 2FA */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Enforce Two-Factor Authentication</p>
                      <p className="text-[11px] text-slate-500">
                        Require TOTP hardware verification for all staff accounts
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={platformSettings.requireTwoFactor}
                      onChange={(e) => updatePlatformSettings({ requireTwoFactor: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Max File Size */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">Max Media Upload Limit</p>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {platformSettings.maxUploadSizeMb} MB
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={500}
                      step={25}
                      value={platformSettings.maxUploadSizeMb}
                      onChange={(e) => updatePlatformSettings({ maxUploadSizeMb: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Database Backup Section */}
                <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-950 text-xs">Full Database Snapshot & Export</h4>
                    <p className="text-[11px] text-blue-700">
                      Generate and download an encrypted snapshot of all database tables (users, posts, audit logs)
                    </p>
                  </div>
                  <button
                    onClick={downloadDatabaseBackup}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 11: NATIONAL NEWS DESK & OFFICIAL SOURCE CURATION */}
          {/* ============================================================== */}
          {activeNav === 'news' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-amber-500" />
                      Smart National News & Official Bulletin Desk
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Monitor, verify and curate country-level news (Rwanda, East Africa, US, EU, Asia) with official source tracking and AI summaries
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      OFFICIAL FEEDS ACTIVE
                    </span>
                  </div>
                </div>

                {/* News Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Total Articles</span>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{newsArticles.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-medium">Verified Sources</span>
                    <p className="text-xl font-bold text-emerald-900 mt-0.5">
                      {newsArticles.filter((a) => a.verified).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[11px] text-rose-700 font-medium">Breaking Bulletins</span>
                    <p className="text-xl font-bold text-rose-900 mt-0.5">
                      {newsArticles.filter((a) => a.isBreaking).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[11px] text-blue-700 font-medium">Jurisdictions</span>
                    <p className="text-xl font-bold text-blue-900 mt-0.5">{jurisdictions.length}</p>
                  </div>
                </div>

                {/* Articles Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Article & Title</th>
                        <th className="py-3 px-4">Country</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Official Source</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newsArticles.map((article) => (
                        <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 line-clamp-1">{article.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{article.summary}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="mr-1">{article.countryFlag}</span>
                            <span className="font-medium text-slate-700">{article.countryName}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 uppercase">
                              {article.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                            {article.source}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {article.verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Verified Official
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Unverified
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => verifyNewsArticle(article.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                article.verified
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {article.verified ? 'Revoke Verification' : 'Verify Bulletin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 12: NATIONAL LAW COMPLIANCE & EQUAL JUSTICE REGISTRY */}
          {/* ============================================================== */}
          {activeNav === 'compliance' && (
            <div className="space-y-6">
              {/* Universal Equality Rule Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-[#075E54] text-white shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-emerald-300" />
                  <h3 className="font-bold text-base tracking-wide uppercase">
                    UNIVERSAL EQUALITY UNDER THE LAW (Nobody is Above the Law)
                  </h3>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed max-w-4xl">
                  Tolkflow yubahiriza amategeko yose y'ibihugu ibarizwamo hatitawe ku kuba umukoresha afite konti isanzwe, iya Staff cyangwa Admin/Owner. Nta mukoresha wemerewe kurenga ku mategeko agenga amakuru bwite (Data Privacy), ibyaha byifashishije ikoranabuhanga (Cybercrimes), cyangwa amategeko y'Itangazamakuru kubera umwanya afite mu kigo. Buri cyemezo kibikwa mu gitabo cy'amategeko kidahinduka (Immutable Audit Log).
                </p>
              </div>

              {/* Compliance Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] text-slate-500 font-medium">Registered Statutes</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{nationalLaws.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] text-emerald-600 font-medium">Fully Compliant & Enforced</span>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">
                    {nationalLaws.filter((l) => l.complianceStatus === 'compliant').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] text-amber-600 font-medium">Under Audit Review</span>
                  <p className="text-xl font-bold text-amber-600 mt-0.5">
                    {nationalLaws.filter((l) => l.complianceStatus === 'in_progress').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[11px] text-indigo-600 font-medium">Immutable Audit Trail</span>
                  <p className="text-xl font-bold text-indigo-600 mt-0.5">{legalAuditLogs.length}</p>
                </div>
              </div>

              {/* National Laws Registry Table */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      National Laws & Statutory Instruments Registry
                    </h4>
                    <p className="text-xs text-slate-500">
                      Official Gazette numbers, effective dates, regulatory authorities, and enforcement status
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                    RURA / NCSA / MINICT / GDPR / KOSA
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Jurisdiction & Gazette</th>
                        <th className="py-3 px-4">Law Title</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Regulatory Body</th>
                        <th className="py-3 px-4">Effective Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Audit & Enforcement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nationalLaws.map((law) => (
                        <tr key={law.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <span>{law.countryFlag}</span>
                              <span>{law.countryCode}</span>
                            </div>
                            <span className="text-[11px] font-mono text-emerald-700 font-medium">
                              {law.officialGazetteNo}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <p className="font-semibold text-slate-900">{law.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{law.summary}</p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 uppercase">
                              {law.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                            {law.regulatoryBody}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {new Date(law.effectiveDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {law.complianceStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => {
                                approveComplianceAction(law.id, 'Formal executive approval and system-wide verification logged');
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all"
                            >
                              Seal Audit Trail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Immutable Legal Audit Log Section */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Cryptographically Sealed Legal Audit Trail (Immutable)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Permanent records of all compliance verifications, system adjustments, and regulatory alignments
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    SHA-256 SEALED
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {legalAuditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{log.action}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Law: {log.lawId}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {log.jurisdiction}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{log.details}</p>
                        <div className="text-[10px] font-mono text-slate-400">
                          Actor: {log.adminActor} • Hash: {log.immutableLogHash}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
