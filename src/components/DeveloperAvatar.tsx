import React, { useState } from "react";

interface DeveloperAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  showStatusIndicator?: boolean;
}

export function DeveloperAvatar({ size = "md", showStatusIndicator = true }: DeveloperAvatarProps) {
  const [imgError, setImgError] = useState(false);
  
  // Try loading from Gravatar of gagan52526@gmail.com first, then fallback to local image path
  // If both fail, fallback to a beautiful, stylized gradient with "GP" initials.
  const avatarUrl = "https://secure.gravatar.com/avatar/402daa865b21eacc6c74950b716cbfe2?s=200&d=404";
  const localAvatarUrl = "/gagan_avatar.png"; // Let's also check if user puts it in public folder

  const dimensions = {
    sm: "w-9 h-9 text-[11px]",
    md: "w-11 h-11 text-xs",
    lg: "w-24 h-24 md:w-28 md:h-28 text-2xl md:text-3xl",
    xl: "w-16 h-16 text-xl"
  };

  const statusDotSizes = {
    sm: "w-2 h-2 bottom-0.5 right-0.5 border",
    md: "w-2.5 h-2.5 bottom-0 right-0 border-2",
    lg: "w-4.5 h-4.5 bottom-1.5 right-1.5 border-3",
    xl: "w-3 h-3 bottom-0.5 right-0.5 border-2"
  };

  return (
    <div className={`relative shrink-0 ${dimensions[size]} rounded-full select-none flex items-center justify-center`}>
      {/* If image hasn't errored, try to render it with beautiful transitions */}
      {!imgError ? (
        <div className="w-full h-full rounded-full overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-md">
          <img
            src={imgError ? localAvatarUrl : avatarUrl}
            alt="Gagan Pratap"
            referrerPolicy="no-referrer"
            onError={() => {
              if (avatarUrl && !imgError) {
                // If Gravatar fails (e.g. offline or 404), fallback to local path or then to initials
                setImgError(true);
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        </div>
      ) : (
        /* Dynamic premium gradient background with glowing effect */
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-md border border-white/15 dark:border-white/10 flex items-center justify-center font-black text-white tracking-widest relative overflow-hidden group">
          <span className="relative z-10 select-none">GP</span>
          
          {/* Subtle noise pattern or flare */}
          <div className="absolute inset-0 bg-white/5 mix-blend-overlay opacity-50 pointer-events-none" />
          <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>
      )}

      {/* Real-time online status indicator (Green dot) */}
      {showStatusIndicator && (
        <div className={`absolute ${statusDotSizes[size]} bg-emerald-500 border-white dark:border-zinc-950 rounded-full shadow-sm animate-pulse z-20`} />
      )}
    </div>
  );
}
