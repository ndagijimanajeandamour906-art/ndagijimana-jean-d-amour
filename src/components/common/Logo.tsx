import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSlogan = false, className = '' }) => {
  const iconSize = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Original TOLKFLOW Emblem */}
      <div className={`relative ${iconSize} flex-shrink-0 flex items-center justify-center`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 rounded-xl blur-[8px] opacity-70 group-hover:opacity-100 transition-opacity" />
        
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_0_12px_rgba(0,229,255,0.7)]"
        >
          <rect width="64" height="64" rx="16" fill="#0A1124" />
          <rect width="64" height="64" rx="16" stroke="url(#border_grad)" strokeWidth="1.5" />

          {/* Flow waves */}
          <path
            d="M16 24C22 18 28 30 36 24C44 18 50 26 48 34C46 42 38 48 32 44C26 40 20 50 16 46"
            stroke="url(#flow_grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Intersecting Pulse Node */}
          <circle cx="36" cy="24" r="4" fill="#00E5FF" className="animate-pulse" />
          <circle cx="28" cy="38" r="3.5" fill="#1D72FE" />
          <circle cx="44" cy="38" r="2.5" fill="#38BDF8" />

          <defs>
            <linearGradient id="flow_grad" x1="16" y1="20" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00E5FF" />
              <stop offset="0.5" stopColor="#0066FF" />
              <stop offset="1" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="border_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00E5FF" stopOpacity="0.8" />
              <stop offset="0.6" stopColor="#0066FF" stopOpacity="0.3" />
              <stop offset="1" stopColor="#0A1124" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-display font-extrabold tracking-wider text-white ${textSize}`}>
            TOLK<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">FLOW</span>
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>
        {showSlogan && (
          <span className="text-[10px] tracking-widest uppercase font-medium text-cyan-400/80 mt-1">
            Connect Beyond Conversations
          </span>
        )}
      </div>
    </div>
  );
};
