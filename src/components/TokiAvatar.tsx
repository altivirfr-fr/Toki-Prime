import React from 'react';

interface TokiAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'chat' | 'call' | 'ghost';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-32 h-32',
};

/**
 * Toki Prime Mascot — Minimalist Executive Chrono-Bot Character
 */
export const TokiAvatar: React.FC<TokiAvatarProps> = ({
  size = 'md',
  variant = 'chat',
  className = '',
}) => {
  const dimClass = SIZE_MAP[size];

  if (variant === 'ghost') {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`${dimClass} ${className}`}
        aria-label="Toki Prime"
      >
        {/* Top Prime antenna */}
        <line x1="32" y1="9" x2="32" y2="17" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="32" cy="8" r="3" fill="currentColor" />
        {/* Ear communicator pods */}
        <rect x="8" y="27" width="6" height="14" rx="3" stroke="currentColor" strokeWidth="3" />
        <rect x="50" y="27" width="6" height="14" rx="3" stroke="currentColor" strokeWidth="3" />
        {/* Head capsule */}
        <rect x="14" y="17" width="36" height="33" rx="12" stroke="currentColor" strokeWidth="3.5" />
        {/* Expressive eyes */}
        <rect x="23" y="28" width="5" height="7" rx="2.5" fill="currentColor" />
        <rect x="36" y="28" width="5" height="7" rx="2.5" fill="currentColor" />
        {/* Gentle smile */}
        <path d="M27 41 Q32 44.5 37 41" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'call') {
    return (
      <div
        className={`${dimClass} rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-2 border-sky-400/40 flex items-center justify-center shadow-2xl overflow-hidden ${className}`}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-[82%] h-[82%]" aria-label="Toki Prime">
          {/* Prime Antenna */}
          <line x1="50" y1="12" x2="50" y2="23" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="50" cy="11" r="5" fill="#38bdf8" />
          {/* Side Headset Pods */}
          <rect x="13" y="42" width="9" height="22" rx="4.5" fill="#38bdf8" />
          <rect x="78" y="42" width="9" height="22" rx="4.5" fill="#38bdf8" />
          {/* Main Metallic White Head */}
          <rect x="21" y="23" width="58" height="52" rx="18" fill="#f8fafc" />
          {/* Dark Glass Visor */}
          <rect x="28" y="33" width="44" height="26" rx="11" fill="#0f172a" />
          {/* Glowing Cyan Eyes */}
          <rect x="37" y="40" width="7.5" height="12" rx="3.75" fill="#38bdf8" />
          <rect x="55.5" y="40" width="7.5" height="12" rx="3.75" fill="#38bdf8" />
          {/* Subtle Eye Spark */}
          <circle cx="39.5" cy="43" r="1.6" fill="#e0f2fe" />
          <circle cx="58" cy="43" r="1.6" fill="#e0f2fe" />
          {/* Friendly Smile */}
          <path d="M43 65 Q50 70 57 65" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default 'chat' variant — Sleek Executive Chrono-Bot on calm deep sky/slate medallion
  return (
    <div
      className={`${dimClass} rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-sky-400/35 flex items-center justify-center overflow-hidden shadow-md shrink-0 ${className}`}
    >
      <svg viewBox="0 0 80 80" fill="none" className="w-[86%] h-[86%]" aria-label="Toki Prime">
        {/* Soft upper rim glow */}
        <circle cx="40" cy="40" r="36" fill="#38bdf8" opacity="0.08" />
        {/* Prime Antenna */}
        <line x1="40" y1="9" x2="40" y2="19" stroke="#38bdf8" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="40" cy="8.5" r="4" fill="#38bdf8" />
        {/* Side Ear Communicators */}
        <rect x="10" y="34" width="7.5" height="18" rx="3.75" fill="#38bdf8" />
        <rect x="62.5" y="34" width="7.5" height="18" rx="3.75" fill="#38bdf8" />
        {/* Bot Head Capsule */}
        <rect x="17" y="19" width="46" height="43" rx="15" fill="#f8fafc" />
        {/* Visor */}
        <rect x="23" y="27" width="34" height="21" rx="9" fill="#0f172a" />
        {/* Happy Glowing Eyes */}
        <rect x="30" y="33" width="6" height="9.5" rx="3" fill="#38bdf8" />
        <rect x="44" y="33" width="6" height="9.5" rx="3" fill="#38bdf8" />
        <circle cx="32" cy="35.2" r="1.3" fill="#ffffff" />
        <circle cx="46" cy="35.2" r="1.3" fill="#ffffff" />
        {/* Subtle Mouth */}
        <path d="M35 54 Q40 57.5 45 54" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
};
