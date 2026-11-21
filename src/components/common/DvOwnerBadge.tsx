import React from 'react';
import { ProjectOwner, User } from '../../types';

export interface DvOwnerBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withLabel?: boolean;
  labelPosition?: 'right' | 'bottom';
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
}

/**
 * Validates whether a given user represents the official Project Owner.
 * Strict check: Normal users and other admins DO NOT receive this badge.
 */
export const isProjectOwnerUser = (
  user?: Partial<User> | { id?: string; email?: string; phone?: string; username?: string; role?: string; isProjectOwner?: boolean } | null,
  owner?: ProjectOwner | null
): boolean => {
  if (!user) return false;

  // Direct boolean flag
  if ('isProjectOwner' in user && Boolean((user as any).isProjectOwner)) return true;

  // Match against persistent Project Owner stored in DB
  if (owner) {
    if (user.id && owner.id && user.id === owner.id) return true;
    if (user.email && owner.email && user.email.toLowerCase() === owner.email.toLowerCase()) return true;
    if (user.phone && owner.phoneNumber && user.phone === owner.phoneNumber) return true;
  }

  // Master initial owner credentials
  if (user.email && user.email.toLowerCase() === 'ndagijimanajeandamour906@gmail.com') return true;
  if (user.username && user.username.toLowerCase() === 'davd') return true;

  return false;
};

/**
 * Premium DV Half-Moon Project Owner Badge
 * Elegant gold crescent moon with capital letters "DV" on dark-blue styling.
 */
export const DvOwnerBadge: React.FC<DvOwnerBadgeProps> = ({
  size = 'md',
  withLabel = false,
  labelPosition = 'right',
  className = '',
  showTooltip = true,
  tooltipText = 'Official Tolkflow Project Owner (DAVD)',
}) => {
  // Size mappings for SVG and container
  const sizeMap = {
    xs: {
      box: 'w-4 h-4',
      px: 16,
      labelClass: 'text-[9px] px-1 py-0.2',
      gap: 'gap-1',
    },
    sm: {
      box: 'w-5 h-5',
      px: 20,
      labelClass: 'text-[10px] px-1.5 py-0.5',
      gap: 'gap-1.5',
    },
    md: {
      box: 'w-8 h-8',
      px: 32,
      labelClass: 'text-xs px-2 py-0.5',
      gap: 'gap-2',
    },
    lg: {
      box: 'w-12 h-12',
      px: 48,
      labelClass: 'text-xs px-2.5 py-1',
      gap: 'gap-2.5',
    },
    xl: {
      box: 'w-16 h-16',
      px: 64,
      labelClass: 'text-sm px-3 py-1 font-bold',
      gap: 'gap-3',
    },
  };

  const { box, labelClass, gap } = sizeMap[size];

  const svgContent = (
    <svg
      viewBox="0 0 100 100"
      className={`${box} flex-shrink-0 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)] transition-transform duration-300 hover:scale-105`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DAVD Project Owner Crescent Moon Badge"
    >
      <defs>
        {/* Dark Blue Base Gradient */}
        <radialGradient id="dvDarkBlueBg" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="45%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#030712" />
        </radialGradient>

        {/* Polished Gold Crescent Gradient */}
        <linearGradient id="dvGoldCrescent" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FCD34D" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Gold Lettering Gradient */}
        <linearGradient id="dvGoldLetters" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FEF08A" />
          <stop offset="80%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Border Gold Ring */}
        <linearGradient id="dvGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Subtle Star Sparkle Glow */}
        <filter id="dvGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark Blue Circular Shield with Gold Bevel */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="url(#dvDarkBlueBg)"
        stroke="url(#dvGoldBorder)"
        strokeWidth="2.5"
      />

      {/* Inner Subtle Ring */}
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="#FCD34D"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      {/* The Crescent Half-Moon (Sweeping gracefully from top-right down along the left to bottom) */}
      <path
        d="M 52 14 
           C 28 14, 13 32, 13 51 
           C 13 70, 29 86, 52 86 
           C 40 77, 31 65, 31 50 
           C 31 35, 41 23, 52 14 Z"
        fill="url(#dvGoldCrescent)"
        filter="url(#dvGlow)"
      />

      {/* Subtle Moon Highlights */}
      <path
        d="M 50 16 
           C 30 17, 18 33, 18 51 
           C 18 64, 25 76, 38 82 
           C 32 74, 28 63, 28 50 
           C 28 36, 38 24, 50 16 Z"
        fill="#FFFFFF"
        fillOpacity="0.35"
      />

      {/* Mini Celestial Diamond Sparkle on top tip */}
      <polygon
        points="52,10 54,14 58,14 55,17 56,21 52,18 48,21 49,17 46,14 50,14"
        fill="#FFFBEB"
      />

      {/* Secondary accent star near right curve */}
      <circle cx="78" cy="28" r="1.8" fill="#FDE68A" />
      <circle cx="83" cy="42" r="1.2" fill="#FCD34D" opacity="0.8" />

      {/* The Capital Letters "DV" Positioned Distinctly inside/embraced by the Moon */}
      <text
        x="61"
        y="58"
        textAnchor="middle"
        dominantBaseline="central"
        fill="url(#dvGoldLetters)"
        fontWeight="900"
        fontSize="31"
        letterSpacing="0.8"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        style={{
          textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(245,158,11,0.5)',
        }}
      >
        DV
      </text>

      {/* Underline arc beneath DV */}
      <path
        d="M 45 74 Q 61 77 77 72"
        stroke="url(#dvGoldCrescent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );

  if (!withLabel) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        title={showTooltip ? tooltipText : undefined}
      >
        {svgContent}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center ${gap} ${
        labelPosition === 'bottom' ? 'flex-col text-center' : 'flex-row'
      } ${className}`}
      title={showTooltip ? tooltipText : undefined}
    >
      {svgContent}
      <span
        className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider rounded-lg border border-amber-400/40 bg-gradient-to-r from-[#0B1528] via-[#0D1D3A] to-[#070D1E] text-amber-300 shadow-sm ${labelClass}`}
      >
        <span>Project Owner</span>
        <span className="text-[10px] text-amber-400 font-mono">DV</span>
      </span>
    </div>
  );
};
