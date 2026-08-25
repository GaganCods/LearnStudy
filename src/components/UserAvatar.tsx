import React, { useState } from "react";
import { Sparkles, Edit2 } from "lucide-react";
import { getEffectiveAvatarUrl } from "../utils/doodleAvatar";

interface UserAvatarProps {
  userName?: string;
  customAvatarUrl?: string;
  customSeed?: string;
  customStyle?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showStatusIndicator?: boolean;
  showLevelBadge?: boolean;
  level?: number;
  onClick?: () => void;
  className?: string;
  editable?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userName = "Scholar",
  customAvatarUrl,
  customSeed,
  customStyle,
  size = "md",
  showStatusIndicator = true,
  showLevelBadge = false,
  level = 1,
  onClick,
  className = "",
  editable = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const avatarUrl = getEffectiveAvatarUrl(userName, customAvatarUrl, customSeed, customStyle);

  const dimensions = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 md:w-28 md:h-28 text-2xl",
  };

  const statusDotSizes = {
    xs: "w-2 h-2 bottom-0 right-0 border",
    sm: "w-2.5 h-2.5 bottom-0 right-0 border-2",
    md: "w-3 h-3 bottom-0 right-0 border-2",
    lg: "w-4 h-4 bottom-0.5 right-0.5 border-2",
    xl: "w-5 h-5 bottom-1 right-1 border-3",
  };

  // Extract first letter for fallback
  const initials = (userName || "S").charAt(0).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 ${dimensions[size]} rounded-full select-none flex items-center justify-center group ${
        onClick || editable ? "cursor-pointer" : ""
      } ${className}`}
      title={editable ? "Click to customize Doodle Art Profile Picture" : `${userName}'s Profile`}
    >
      {/* Outer Glow Ring */}
      <div className="absolute -inset-0.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-30 group-hover:opacity-75 blur-xs transition-opacity duration-300 pointer-events-none" />

      {/* Avatar Image Container */}
      <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 shadow-sm transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
        {!imgError ? (
          <img
            src={avatarUrl}
            alt={`${userName}'s Doodle Profile`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover select-none bg-indigo-50/50 dark:bg-zinc-900"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black flex items-center justify-center shadow-inner">
            {initials}
          </div>
        )}

        {/* Hover edit overlay */}
        {editable && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white gap-0.5">
            <Edit2 className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] font-black uppercase tracking-wider">Edit</span>
          </div>
        )}
      </div>

      {/* Real-time Online Indicator */}
      {showStatusIndicator && (
        <div
          className={`absolute ${statusDotSizes[size]} bg-emerald-500 border-white dark:border-zinc-950 rounded-full shadow-sm z-20 animate-pulse`}
          title="Online"
        />
      )}
    </div>
  );
};
