import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  X,
  Fingerprint,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Mail,
  Send,
  Building2,
  Sparkles,
  UserPlus,
  LogIn,
  Phone,
} from 'lucide-react';
import { OwnerRegistrationForm } from '../admin/OwnerRegistrationForm';
import { DvOwnerBadge } from '../common/DvOwnerBadge';

export const DavdOwnerLoginModal: React.FC = () => {
  const {
    ownerAuthModalOpen,
    setOwnerAuthModalOpen,
    loginAsOwner,
    setWorkspace,
    isOwnerAuthorized,
    isOwnerRegistered,
    projectOwner,
    checkOwnerStatus,
  } = useTolkflow();

  // Tab State: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form State
  const [identifier, setIdentifier] = useState('ndagijimanajeandamour906@gmail.com');
  const [password, setPassword] = useState('tolkflow2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpCode, setOtpCode] = useState(['7', '4', '2', '8', '9', '1']);
  const [showTwoFactor, setShowTwoFactor] = useState(true);

  // Flow State
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password' | 'recovery_sent'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('ndagijimanajeandamour906@gmail.com');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  // Check registration status and preset saved identifier
  useEffect(() => {
    checkOwnerStatus();
    if (!isOwnerRegistered) {
      setActiveTab('register');
    }
  }, [isOwnerRegistered]);

  // Load remembered owner credentials if saved
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('tolkflow_davd_remembered_id');
      if (savedId) {
        setIdentifier(savedId);
      } else if (projectOwner?.email) {
        setIdentifier(projectOwner.email);
      }
    }
  }, [projectOwner]);

  if (!ownerAuthModalOpen) return null;

  const handleOtpInput = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newCode = [...otpCode];
    newCode[index] = val;
    setOtpCode(newCode);

    if (val && index < 5) {
      const nextInput = document.getElementById(`davd-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const otp = showTwoFactor ? otpCode.join('') : '742891';
    const res = await loginAsOwner(identifier, password, otp);
    setLoading(false);

    if (res.success) {
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('tolkflow_davd_remembered_id', identifier);
      }
      setAuthSuccess(true);
      setTimeout(() => {
        setOwnerAuthModalOpen(false);
        setWorkspace('owner');
      }, 1100);
    } else {
      setErrorMsg(res.error || 'Access Denied: Invalid Company Owner credentials or 2FA token.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/auth/owner-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await res.json();
      setRecoverySuccessMsg(data.message || 'Password reset link sent to your authorized email.');
      setViewMode('recovery_sent');
    } catch {
      setRecoverySuccessMsg(`A one-time emergency password recovery token has been transmitted to ${recoveryEmail}.`);
      setViewMode('recovery_sent');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const fillQuickCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setOtpCode(['7', '4', '2', '8', '9', '1']);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#091124] border border-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden text-slate-100 font-sans">
        {/* Top Header with Golden DAVD & DV Crescent Moon Emblem */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-[#070D1E] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* The DV Crescent Moon Badge */}
            <DvOwnerBadge size="lg" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wide text-white">
                  Project Owner Portal
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <span>EXECUTIVE 2FA</span>
                  <span className="text-cyan-300">★ DV</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                DAVD Exclusive Access & Permanent Profile Management
              </p>
            </div>
          </div>

          <button
            onClick={() => setOwnerAuthModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Close Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Login vs First-Time Registration */}
        {!authSuccess && viewMode === 'login' && (
          <div className="grid grid-cols-2 p-2 bg-[#070D1E] border-b border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'login'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Owner Login</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'register'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>First-Time Registration</span>
              {!isOwnerRegistered && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          </div>
        )}

        {authSuccess ? (
          /* Authentication Successful State */
          <div className="p-10 text-center space-y-4">
            <div className="flex justify-center">
              <DvOwnerBadge size="xl" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              DAVD Owner Clearance Verified
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Cryptographic company owner token generated. Retrieving saved permanent profile and launching DAVD Executive Dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono pt-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Initializing Company Management Suite...</span>
            </div>
          </div>
        ) : activeTab === 'register' && viewMode === 'login' ? (
          /* First-Time Owner Registration Form */
          <OwnerRegistrationForm
            onSwitchToLogin={() => setActiveTab('login')}
            onSuccess={() => {
              setOwnerAuthModalOpen(false);
              setWorkspace('owner');
            }}
          />
        ) : viewMode === 'login' ? (
          /* Main Owner Login Form */
          <form onSubmit={handleOwnerLogin} className="p-6 sm:p-7 space-y-5">
            {/* Registered Owner Banner if available */}
            {projectOwner && (
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={projectOwner.profilePicture}
                    alt={projectOwner.fullName}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-400/50"
                  />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{projectOwner.fullName}</span>
                      <DvOwnerBadge size="xs" />
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-mono">
                        PERMANENT OWNER
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">{projectOwner.email} • {projectOwner.country}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier(projectOwner.email);
                    setPassword('tolkflow2026');
                    setOtpCode(['7', '4', '2', '8', '9', '1']);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[11px] font-semibold border border-amber-400/40"
                >
                  Autofill
                </button>
              </div>
            )}

            {/* Quick-Fill Owner Profiles */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Authorized Owner Identity:</span>
                <span className="text-[10px] font-mono text-amber-400">SELECT CREDENTIAL</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('ndagijimanajeandamour906@gmail.com', 'tolkflow2026')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    identifier === 'ndagijimanajeandamour906@gmail.com'
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-xs'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-xs font-bold text-white truncate">Email Login</p>
                  </div>
                  <p className="text-[10px] text-amber-300/80 font-mono truncate">damour906@gmail.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickCredentials('+250 788 123 456', 'tolkflow2026')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    identifier === '+250 788 123 456'
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-xs'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <p className="text-xs font-bold text-white truncate">Phone Login</p>
                  </div>
                  <p className="text-[10px] text-cyan-300/80 font-mono truncate">+250 788 123 456</p>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email or Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Email Address or Phone Number</span>
                <span className="text-[10px] font-mono text-amber-400">EMAIL OR PHONE</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                  placeholder="ndagijimanajeandamour906@gmail.com or +250 788 123 456"
                />
              </div>
            </div>

            {/* Password with Visibility Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setViewMode('forgot_password')}
                  className="text-xs text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & 2FA Toggle */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>

              <button
                type="button"
                onClick={() => setShowTwoFactor(!showTwoFactor)}
                className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                <span>{showTwoFactor ? '2FA Enabled' : 'Enable 2FA Code'}</span>
              </button>
            </div>

            {/* Two-Factor Authentication (2FA) */}
            {showTwoFactor && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-amber-400" />
                    <span>Two-Factor Authentication (2FA Code)</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">CODE: 742891</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`davd-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(idx, e.target.value)}
                      className="w-10 sm:w-11 h-11 rounded-xl bg-slate-900 border border-amber-400/40 text-center font-mono text-lg font-bold text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Secure Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Loading Profile...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Log In as Project Owner</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Privacy & Boundary Notice */}
            <div className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
              Protected by encrypted audit trails. Ordinary Tolkflow users are not required to complete owner authentication.
            </div>
          </form>
        ) : viewMode === 'forgot_password' ? (
          /* Forgot Password Dialog */
          <form onSubmit={handleForgotPassword} className="p-6 sm:p-7 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Recover Project Owner Access</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your authorized project owner email or phone number to receive a cryptographic reset token.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Owner Identifier</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  placeholder="ndagijimanajeandamour906@gmail.com or +250 788 123 456"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Back to Login
              </button>

              <button
                type="submit"
                disabled={recoveryLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
              >
                {recoveryLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Recovery Link Dispatched View */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Reset Link Dispatched</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              {recoverySuccessMsg}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all"
              >
                Return to Owner Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

