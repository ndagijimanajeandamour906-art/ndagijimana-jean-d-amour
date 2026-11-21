import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Mail,
  Phone,
  KeyRound,
  Globe,
  Camera,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Upload,
} from 'lucide-react';
import { DvOwnerBadge } from '../common/DvOwnerBadge';

interface OwnerRegistrationFormProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
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

export const OwnerRegistrationForm: React.FC<OwnerRegistrationFormProps> = ({
  onSwitchToLogin,
  onSuccess,
}) => {
  const { registerProjectOwner, isOwnerRegistered, projectOwner } = useTolkflow();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('Rwanda');
  const [profilePicture, setProfilePicture] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showOwnerCode, setShowOwnerCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pre-fill with Damour demo if empty helper
  const handleFillTemplate = () => {
    setFullName('Jean Damour Ndagijimana (DAVD)');
    setPhoneNumber('+250 788 123 456');
    setEmail('ndagijimanajeandamour906@gmail.com');
    setOwnerCode('DAVD-2026-TOLKFLOW-SECURE');
    setPassword('tolkflow2026');
    setConfirmPassword('tolkflow2026');
    setCountry('Rwanda');
    setErrorMessage('');
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfilePicture(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isOwnerRegistered && projectOwner) {
      setErrorMessage(
        'Project Owner is already registered in the system. First-time registration is locked. Please log in.'
      );
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Phone Number is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid Email Address is required.');
      return;
    }
    if (!ownerCode.trim() || ownerCode.length < 6) {
      setErrorMessage('Secret Owner Code must be at least 6 characters.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await registerProjectOwner({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      ownerCode: ownerCode.trim(),
      password,
      country,
      profilePicture,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Owner account registered successfully! Initializing Executive Dashboard...');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Failed to complete registration.');
    }
  };

  // If already registered, display informative locked state
  if (isOwnerRegistered && projectOwner) {
    return (
      <div className="p-6 text-center space-y-4 animate-in fade-in">
        <div className="flex justify-center">
          <DvOwnerBadge size="xl" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
            <span>First-Time Setup Completed</span>
            <DvOwnerBadge size="xs" />
          </h3>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            The permanent Project Owner account is already registered in the database for:
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-amber-400/30 text-amber-300 text-xs font-semibold my-2">
            <span>{projectOwner.fullName}</span>
            <DvOwnerBadge size="xs" />
            <span className="text-slate-400">•</span>
            <span>{projectOwner.email}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            To prevent hostile takeover or duplicate registries, only the verified Project Owner with the DV Crescent Moon insignia may sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span>Proceed to Owner Login</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Informative Header Banner with DV Moon Emblem */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#070D1E] via-[#0C1630] to-[#081024] border border-amber-400/40 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <DvOwnerBadge size="md" />
          <div className="text-xs space-y-0.5 text-slate-300">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white">Project Owner Permanent Registration</p>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30">
                DV CRESCENT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Registers the master owner account and assigns the exclusive DV Crescent Moon identity badge.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Picture Upload & Preview */}
      <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative group flex-shrink-0">
          <img
            src={profilePicture}
            alt="Profile Preview"
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400/40"
          />
          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer">
            <Camera className="w-5 h-5 text-white" />
            <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-white mb-0.5">Profile Picture (Optional)</label>
          <p className="text-[11px] text-slate-400 mb-2">Upload photo or click to replace</p>
          <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer transition-colors border border-slate-700">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Choose Image</span>
            <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* 1. Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          1. Full Name <span className="text-amber-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jean Damour Ndagijimana (DAVD)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* 2. Phone Number & Country Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            2. Phone Number <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+250 788 123 456"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            6. Country <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name} className="bg-slate-900 text-white">
                  {c.flag} {c.name} ({c.dial})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Email Address */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          3. Email Address <span className="text-amber-400">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ndagijimanajeandamour906@gmail.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* 4. Owner Code */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-300">
            4. Owner Code (Secret System Key) <span className="text-amber-400">*</span>
          </label>
          <span className="text-[10px] text-amber-400 font-mono">Kept secret & hashed</span>
        </div>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
          <input
            type={showOwnerCode ? 'text' : 'password'}
            required
            value={ownerCode}
            onChange={(e) => setOwnerCode(e.target.value)}
            placeholder="e.g. DAVD-2026-TOLKFLOW-SECURE"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-amber-400/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-amber-200 placeholder-slate-500 font-mono outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowOwnerCode(!showOwnerCode)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showOwnerCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          This secret code confirms your permanent master ownership. It is never shown to ordinary users.
        </p>
      </div>

      {/* 5. Password & Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            5. Password <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Confirm Password <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Auto-fill Helper for Quick Testing */}
      <div className="flex justify-between items-center pt-1 text-xs">
        <button
          type="button"
          onClick={handleFillTemplate}
          className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          <span>Quick Autofill DAVD Credentials</span>
        </button>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2"
        >
          Already registered? Sign In
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <span>Saving to Database & Authorizing...</span>
        ) : (
          <>
            <span>Complete Permanent Owner Registration</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
