import React, { useState, useEffect, useRef } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { Logo } from '../common/Logo';
import {
  X,
  Mail,
  Lock,
  Phone,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Users,
  AlertCircle,
  Clock,
  Edit3,
  ArrowLeft,
  Loader2,
  AtSign,
} from 'lucide-react';
import { User as UserType } from '../../types';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    currentUser,
    setCurrentUser,
    allUsers,
    pendingVerification,
    setPendingVerification,
    registerAccount,
    verifyAccountOtp,
    resendAccountOtp,
    changePendingVerificationEmail,
    loginAccount,
  } = useTolkflow();

  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'change-email' | 'recovery'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up pending close timer
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Automatically enter OTP screen when pendingVerification is triggered (e.g. unverified login gate)
  useEffect(() => {
    if (pendingVerification && mode !== 'change-email') {
      setMode('otp');
      setResendCooldown(pendingVerification.resendCooldownSeconds ?? 60);
    }
  }, [pendingVerification]);

  // Countdown timer for Resend Code (60 seconds)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isVisible = authModalOpen || Boolean(pendingVerification);
  if (!isVisible) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleOtpInput = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      const next = [...otpCode];
      next[index] = '';
      setOtpCode(next);
      return;
    }

    // Handle multi-digit paste cleanly across boxes
    if (digitsOnly.length > 1) {
      const pasted = digitsOnly.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      setOtpCode(next);
      const focusIdx = Math.min(pasted.length, 5);
      otpInputsRef.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpCode];
    next[index] = digitsOnly;
    setOtpCode(next);
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpCode[index] && index > 0) {
        const next = [...otpCode];
        next[index - 1] = '';
        setOtpCode(next);
        otpInputsRef.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedDigits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedDigits) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedDigits.length; i++) {
      next[i] = pastedDigits[i];
    }
    setOtpCode(next);
    const focusIdx = Math.min(pastedDigits.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    const res = await loginAccount({
      identifier: identifier.trim(),
      password,
      rememberDevice: rememberMe,
    });
    setLoading(false);

    if (res.requiresVerification) {
      setOtpCode(['', '', '', '', '', '']);
      setResendCooldown(0);
      setMode('otp');
      setErrorMsg(res.error || 'Please verify your email address before logging in.');
      return;
    }

    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Check your credentials.');
      return;
    }

    setSuccessMsg('Signed in successfully! Redirecting to TOLKFLOW...');
    closeTimerRef.current = setTimeout(() => {
      setAuthModalOpen(false);
      resetMessages();
      setPassword('');
    }, 600);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      setErrorMsg('Username must be 3–30 characters using letters, numbers, or underscores.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg('Password must be at least 8 characters with letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password must match.');
      return;
    }

    setLoading(true);
    const res = await registerAccount({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      confirmPassword,
      preferredLanguage: currentUser?.preferredLanguage || 'en',
    });
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Unable to register account.');
      return;
    }

    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(res.pendingVerification?.resendCooldownSeconds ?? 60);
    setMode('otp');
    setSuccessMsg('Verification code sent! Check your email inbox.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const entered = otpCode.join('');
    if (entered.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    const res = await verifyAccountOtp(entered);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Verification failed. Please check the code and try again.');
      return;
    }

    setSuccessMsg('Account verified! Redirecting to your TOLKFLOW dashboard...');
    closeTimerRef.current = setTimeout(() => {
      setAuthModalOpen(false);
      setMode('login');
      setOtpCode(['', '', '', '', '', '']);
      setPassword('');
      setConfirmPassword('');
      resetMessages();
    }, 900);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    resetMessages();
    setLoading(true);
    const res = await resendAccountOtp();
    setLoading(false);

    if (!res.success) {
      if (typeof res.retryAfterSeconds === 'number') {
        setResendCooldown(res.retryAfterSeconds);
      }
      setErrorMsg(res.error || 'Unable to resend verification code.');
      return;
    }

    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(60);
    setSuccessMsg('A new 6-digit verification code has been sent to your email.');
    otpInputsRef.current[0]?.focus();
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const cleanEmail = newEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await changePendingVerificationEmail(cleanEmail);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Could not update email address.');
      return;
    }

    setEmail(cleanEmail);
    setNewEmailInput('');
    setOtpCode(['', '', '', '', '', '']);
    setResendCooldown(60);
    setMode('otp');
    setSuccessMsg(`Email updated. A new verification code was sent to ${cleanEmail}.`);
  };

  const handleQuickSwitchUser = (user: UserType) => {
    resetMessages();
    setPendingVerification(null);
    setCurrentUser(user);
    setSuccessMsg(`Switched to verified workspace profile: ${user.name}`);
    closeTimerRef.current = setTimeout(() => {
      setAuthModalOpen(false);
      resetMessages();
    }, 650);
  };

  const handlePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setSuccessMsg('If an account exists for that email, recovery guidance has been queued.');
    closeTimerRef.current = setTimeout(() => {
      setMode('login');
      resetMessages();
    }, 1800);
  };

  const handleCloseModal = () => {
    // Allow closing unless locked on unverified session guard, or clear pending state cleanly if user explicitly cancels back to workspace
    if (pendingVerification && !currentUser?.verified) {
      return;
    }
    setPendingVerification(null);
    setAuthModalOpen(false);
    resetMessages();
  };

  const passwordStrength =
    password.length === 0
      ? 0
      : (password.length >= 8 ? 1 : 0) +
        (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
        (/\d/.test(password) ? 1 : 0) +
        (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tolkflow-auth-title"
    >
      <div className="w-full max-w-md bg-white text-slate-900 border border-blue-200 rounded-3xl shadow-[0_24px_70px_rgba(15,23,42,0.45)] overflow-hidden relative max-h-[94vh] flex flex-col">
        {/* Top Modern Blue Header Strip */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1D4ED8] to-[#0284C7] px-6 py-5 text-white relative flex-shrink-0">
          {!(pendingVerification && !currentUser?.verified) && (
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Close authentication modal"
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col items-center text-center space-y-2">
            <Logo size="md" className="justify-center" />
            <h2 id="tolkflow-auth-title" className="text-xl font-display font-bold tracking-tight text-white">
              {mode === 'login' && 'Sign in to TOLKFLOW'}
              {mode === 'signup' && 'Create Your Tolkflow Account'}
              {mode === 'otp' && 'Verify Your Tolkflow Account'}
              {mode === 'change-email' && 'Update Verification Email'}
              {mode === 'recovery' && 'Account Password Recovery'}
            </h2>
            <p className="text-xs text-blue-100 max-w-xs leading-relaxed">
              {mode === 'login' && 'Secure global messaging, real-time translation & HD calling.'}
              {mode === 'signup' && 'Register with email verification to unlock all platform features.'}
              {mode === 'otp' && 'We have sent a 6-digit verification code to your email address.'}
              {mode === 'change-email' && 'Enter a new email address to receive a fresh 6-digit verification code.'}
              {mode === 'recovery' && 'Enter your verified email or username for recovery instructions.'}
            </p>
          </div>
        </div>

        {/* Scrollable White Card Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-identifier" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@domain.com or username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setMode('recovery');
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Keep me signed in on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{loading ? 'Authenticating...' : 'Sign In Securely'}</span>
              </button>

              {/* Workspace Quick Persona Switcher (Preserved existing feature) */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2 font-semibold">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Workspace Verified Personas:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {allUsers.filter((u) => u.verified && !u.isBlocked).slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSwitchUser(u)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-colors cursor-pointer ${
                        currentUser.id === u.id
                          ? 'bg-blue-50 border-blue-500 text-blue-900'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="font-semibold truncate text-[11px] text-slate-900">{u.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{u.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-600">
                  New to TOLKFLOW?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setMode('signup');
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* MODE 2: USER REGISTRATION */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div>
                <label htmlFor="reg-fullname" className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Aline Mukamana"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-username" className="text-xs font-semibold text-slate-700 block mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="aline_rw"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-phone" className="text-xs font-semibold text-slate-700 block mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 788 000 000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-password" className="text-xs font-semibold text-slate-700 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 chars with letters & numbers"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? passwordStrength >= 3
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] font-medium text-slate-500 ml-1">
                      {passwordStrength <= 1 ? 'Weak' : passwordStrength === 2 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-700 block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>{loading ? 'Sending Verification Code...' : 'Create Account & Send OTP'}</span>
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setMode('login');
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* MODE 3: EMAIL OTP VERIFICATION (6 SEPARATE BOXES + COUNTDOWN + RESEND + CHANGE EMAIL) */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* Target Email Display */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-600 text-white flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">
                      Verification Email Sent To
                    </p>
                    <p className="text-xs font-bold text-blue-700 truncate">
                      {pendingVerification?.maskedEmail || email || 'your email address'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setNewEmailInput(pendingVerification?.email || email || '');
                    setMode('change-email');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Change Email</span>
                </button>
              </div>

              {/* Six Separate Accessible OTP Boxes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block text-center mb-2.5">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputsRef.current[i] = el;
                      }}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      aria-label={`Verification digit ${i + 1} of 6`}
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold rounded-xl bg-slate-50 border-2 border-slate-200 text-blue-700 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* 5-Min Expiry Info & Security Notice */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Code expires in 5 minutes &bull; Single-use only</span>
              </div>

              {/* Verify Account Primary Button */}
              <button
                type="submit"
                disabled={loading || otpCode.join('').length !== 6}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{loading ? 'Verifying Code...' : 'Verify Account'}</span>
              </button>

              {/* Resend Code & Countdown Timer + Change Email Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendCode}
                  className={`flex items-center gap-1.5 font-semibold transition-colors ${
                    resendCooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-800 cursor-pointer'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setPendingVerification(null);
                    setMode('login');
                  }}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Use another account
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: CHANGE EMAIL BEFORE VERIFICATION */}
          {mode === 'change-email' && (
            <form onSubmit={handleChangeEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="change-email-input" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  New Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="change-email-input"
                    type="email"
                    required
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="correct-email@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Updating your email invalidates any previously issued verification codes and sends a new 6-digit code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>{loading ? 'Updating & Sending...' : 'Update Email & Send Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('otp');
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to OTP verification</span>
              </button>
            </form>
          )}

          {/* MODE 5: PASSWORD RECOVERY */}
          {mode === 'recovery' && (
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div>
                <label htmlFor="recovery-email" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Verified Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="recovery-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@tolkflow.io"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                Request Recovery Guidance
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Return to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
