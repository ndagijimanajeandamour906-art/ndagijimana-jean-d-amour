import React, { useState, useRef } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Upload,
  Plus,
  Key,
  Smartphone,
  Save,
  UserCheck,
} from 'lucide-react';
import { DvOwnerBadge, isProjectOwnerUser } from '../common/DvOwnerBadge';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { currentUser, updateUserProfile, toggleUserTwoFactor, verifyIdentity, projectOwner } = useTolkflow();

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [interests, setInterests] = useState<string[]>(currentUser.interests);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      username,
      bio,
      statusText,
      avatar,
      interests,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const addInterest = () => {
    if (newInterestInput.trim() && !interests.includes(newInterestInput.trim())) {
      setInterests([...interests, newInterestInput.trim()]);
      setNewInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-display font-bold text-white">Edit Your Profile</h3>
            {isProjectOwnerUser(currentUser, projectOwner) && (
              <DvOwnerBadge size="xs" withLabel />
            )}
            {currentUser.verified && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Verified
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Picker */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => avatarFileRef.current?.click()}>
              <img
                src={avatar}
                alt={name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-400 group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                type="file"
                ref={avatarFileRef}
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
              />
              <label className="text-xs text-slate-300 font-medium block">
                Profile Photo (Paste URL or Upload)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Status Message</label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="e.g., In the Flow ⚡ | Auditing smart contracts"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Biography</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Interests Tags */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Skills & Technical Interests
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {interests.map((it, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                >
                  <span>{it}</span>
                  <button
                    type="button"
                    onClick={() => removeInterest(it)}
                    className="hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="Add skill (e.g., Rust, Zero-Knowledge)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={addInterest}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-cyan-300 hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Security & KYC verification toggles */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Two-Factor Authentication (2FA)
                </span>
                <span className="text-[11px] text-slate-400">
                  Hardware token or TOTP authenticator required
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentUser.twoFactorEnabled}
                onChange={toggleUserTwoFactor}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Online Identity Verification (KYC)
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentUser.verified
                    ? 'Verified cryptographic digital sovereign badge'
                    : 'Unverified identity'}
                </span>
              </div>
              {!currentUser.verified && (
                <button
                  type="button"
                  onClick={verifyIdentity}
                  className="px-3 py-1 rounded-lg bg-cyan-400 text-black text-xs font-bold"
                >
                  Verify Now
                </button>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Changes saved!
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(0,102,255,0.4)]"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
