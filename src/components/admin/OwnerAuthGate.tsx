import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Server,
  Mail,
  Send,
  HelpCircle,
  UserPlus,
  LogIn,
  Phone,
  Sparkles,
} from 'lucide-react';
import { OwnerRegistrationForm } from './OwnerRegistrationForm';
import { DvOwnerBadge } from '../common/DvOwnerBadge';

export const OwnerAuthGate: React.FC = () => {
  const {
    loginAsOwner,
    setWorkspace,
    setOwnerAuthModalOpen,
    isOwnerRegistered,
    projectOwner,
    checkOwnerStatus,
  } = useTolkflow();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('ndagijimanajeandamour906@gmail.com');
  const [password, setPassword] = useState('tolkflow2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpCode, setOtpCode] = useState(['7', '4', '2', '8', '9', '1']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  // Recovery dialog
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('ndagijimanajeandamour906@gmail.com');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);

  // If not registered yet, default tab to register
  useEffect(() => {
    checkOwnerStatus();
    if (!isOwnerRegistered) {
      setActiveTab('register');
    }
  }, [isOwnerRegistered]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tolkflow_davd_remembered_id');
      if (saved) setIdentifier(saved);
      else if (projectOwner?.email) setIdentifier(projectOwner.email);
    }
  }, [projectOwner]);

  const handleOtpInput = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newCode = [...otpCode];
    newCode[index] = val;
    setOtpCode(newCode);

    if (val && index < 5) {
      const nextInput = document.getElementById(`owner-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const otp = otpCode.join('');
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
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Access Denied: Insufficient Owner clearance or invalid credentials.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      await fetch('/api/auth/owner-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
    } finally {
      setRecoveryLoading(false);
      setRecoveryDone(true);
    }
  };

  const selectPersona = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setOtpCode(['7', '4', '2', '8', '9', '1']);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#040814] text-slate-100 select-none relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl rounded-3xl bg-[#091124] border border-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Top Security Banner with DAVD Emblem & DV Crescent Moon */}
        <div className="p-6 border-b border-slate-800 bg-[#070D1E]/95 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* The DV Half-Moon Badge */}
            <DvOwnerBadge size="lg" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-display font-bold tracking-wider text-white">
                  TOLKFLOW
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <span>PROJECT OWNER</span>
                  <span className="text-cyan-300">★ DV</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exclusive Company Owner Entrance & Executive Management
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setOwnerAuthModalOpen(false);
              setWorkspace('user');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>User Workspace</span>
          </button>
        </div>

        {/* Tab Switcher: Login vs First-Time Registration */}
        {!authSuccess && !recoveryMode && (
          <div className="grid grid-cols-2 p-2 bg-[#070D1E] border-b border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'login'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Owner Login</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'register'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>First-Time Registration</span>
              {!isOwnerRegistered && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          </div>
        )}

        {authSuccess ? (
          <div className="p-10 text-center space-y-4">
            <div className="flex justify-center">
              <DvOwnerBadge size="xl" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              DAVD Owner Security Clearance Granted
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Company Owner session verified. Profile loaded from permanent storage. Provisioning Executive Dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono pt-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Launching verified workspace...</span>
            </div>
          </div>
        ) : recoveryMode ? (
          /* Password Recovery View */
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Owner Password Recovery</h3>
            </div>
            {recoveryDone ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-300">
                  A password reset link and emergency token have been dispatched to {recoveryEmail}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode(false);
                    setRecoveryDone(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Return to Owner Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter your registered Project Owner email or phone to receive a recovery token.
                </p>
                <input
                  type="text"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="ndagijimanajeandamour906@gmail.com or +250 788 123 456"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryMode(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    {recoveryLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : activeTab === 'register' ? (
          /* First-Time Owner Registration Form */
          <OwnerRegistrationForm
            onSwitchToLogin={() => setActiveTab('login')}
            onSuccess={() => {
              setOwnerAuthModalOpen(false);
              setWorkspace('owner');
            }}
          />
        ) : (
          /* Dedicated Owner Login Form */
          <form onSubmit={handleOwnerLogin} className="p-6 sm:p-8 space-y-5">
            {/* Registered Owner Profile Preview Banner if available */}
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
                        VERIFIED
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
                  Use Saved
                </button>
              </div>
            )}

            {/* Quick Master Identity Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Quick Credentials:</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">DAVD MASTER ACCESS</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectPersona('ndagijimanajeandamour906@gmail.com', 'tolkflow2026')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    identifier === 'ndagijimanajeandamour906@gmail.com'
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">Email Login</p>
                  <p className="text-[10px] text-amber-300 font-mono">damour906@gmail.com</p>
                  <p className="text-[10px] text-slate-400 truncate">Password: tolkflow2026</p>
                </button>

                <button
                  type="button"
                  onClick={() => selectPersona('+250 788 123 456', 'tolkflow2026')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    identifier === '+250 788 123 456'
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">Phone Number Login</p>
                  <p className="text-[10px] text-cyan-400 font-mono">+250 788 123 456</p>
                  <p className="text-[10px] text-slate-400 truncate">Password: tolkflow2026</p>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email OR Phone Number Input */}
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
                  onClick={() => setRecoveryMode(true)}
                  className="text-xs text-amber-400 hover:underline cursor-pointer"
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
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                />
                <span>Remember Me on this device</span>
              </label>

              <span className="text-[10px] font-mono text-amber-400">2FA TOTP ACTIVE</span>
            </div>

            {/* Two-Factor Authentication TOTP Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                  <span>Two-Factor Authentication (TOTP 6-Digit PIN)</span>
                </label>
                <span className="text-[10px] font-mono text-emerald-400">PIN: 742891</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`owner-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpInput(idx, e.target.value)}
                    className="w-11 h-12 rounded-xl bg-slate-900 border border-amber-400/40 text-center font-mono text-lg font-bold text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
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
          </form>
        )}
      </div>
    </div>
  );
};

