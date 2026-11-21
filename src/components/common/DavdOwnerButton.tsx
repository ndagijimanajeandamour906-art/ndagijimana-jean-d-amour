import React from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { DvOwnerBadge } from './DvOwnerBadge';

interface DavdOwnerButtonProps {
  className?: string;
}

export const DavdOwnerButton: React.FC<DavdOwnerButtonProps> = ({ className = '' }) => {
  const { workspace, setWorkspace, isOwnerAuthorized, setOwnerAuthModalOpen } = useTolkflow();

  const handleClick = () => {
    if (workspace === 'owner') {
      // If already in owner workspace, stay or refresh
      return;
    }

    if (isOwnerAuthorized) {
      // Direct access if already logged in / authorized
      setWorkspace('owner');
    } else {
      // Open the dedicated DAVD Company Owner Login Modal
      setOwnerAuthModalOpen(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      title="DAVD – Project Owner Portal (Exclusive DV Crescent Moon Access)"
      aria-label="DAVD Project Owner Access"
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#070D1E] hover:bg-[#0B1528] border border-amber-400/50 hover:border-amber-400 shadow-md shadow-amber-500/15 hover:shadow-amber-500/35 transition-all duration-200 cursor-pointer select-none ${className}`}
    >
      {/* DV Crescent Moon Emblem */}
      <div className="relative flex-shrink-0">
        <DvOwnerBadge size="sm" showTooltip={false} />
        {isOwnerAuthorized && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#070D1E] shadow-[0_0_6px_rgba(52,211,153,1)] animate-pulse" />
        )}
      </div>

      {/* Golden-Yellow Circular / Rounded Squircle DAVD Icon */}
      <div className="relative flex-shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/40 group-hover:scale-105 transition-transform duration-200 border border-amber-200/90">
          <span className="font-extrabold font-sans text-[10px] sm:text-[11px] tracking-wider text-slate-950 select-none">
            DAVD
          </span>
        </div>
      </div>

      {/* Label Details */}
      <div className="flex flex-col items-start text-left leading-none pr-0.5">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-black tracking-wide text-amber-300 group-hover:text-amber-200 transition-colors">
            DAVD
          </span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/90 font-mono mt-0.5">
          Project Owner
        </span>
      </div>

      {/* Status Pill on Larger Screens */}
      <div className="hidden xl:flex items-center gap-1 pl-1 border-l border-amber-500/30 text-[9px] font-mono text-amber-300/80">
        <ShieldCheck className="w-3 h-3 text-amber-400" />
        <span>{isOwnerAuthorized ? 'ACTIVE' : 'PORTAL'}</span>
      </div>
    </button>
  );
};

