import React, { useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { SUPPORTED_LANGUAGES } from '../../data/languages';
import { Language } from '../../types';
import { Languages, Search, X, Check, Globe } from 'lucide-react';

interface LanguageSelectorModalProps {
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ onClose }) => {
  const { currentUser, updateUserProfile } = useTolkflow();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');

  const regions = ['All', 'African', 'European', 'Asian'];

  const filtered = SUPPORTED_LANGUAGES.filter((lang) => {
    if (selectedRegion !== 'All' && lang.region !== selectedRegion) return false;
    if (search.trim()) {
      const match =
        lang.name.toLowerCase().includes(search.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(search.toLowerCase()) ||
        lang.code.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const handleSelectLanguage = (lang: Language) => {
    updateUserProfile({ preferredLanguage: lang.code });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <Languages className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Select Preferred Language</h3>
              <p className="text-[11px] text-slate-400">
                Messages, social posts, and call subtitles will automatically translate into this language.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language name, native script, or country..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-xs text-white placeholder-slate-400 outline-none"
            autoFocus
          />
        </div>

        {/* Region Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {regions.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedRegion === reg
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {reg === 'All' ? 'All Languages' : `${reg} Region`}
            </button>
          ))}
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((lang) => {
              const isSelected =
                (currentUser.preferredLanguage || 'en').toLowerCase() === lang.code.toLowerCase();

              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-blue-600/30 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                      : 'bg-slate-900/50 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{lang.name}</p>
                      <p className="text-[11px] text-cyan-300 font-medium truncate">
                        {lang.nativeName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {lang.code}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-shrink-0 text-xs text-slate-400">
          <span>{filtered.length} languages supported</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
