import React from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const GoogleLogoIcon = ({ className = "w-4 h-4 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface GoogleSignInButtonProps {
  variant?: "primary" | "compact" | "header" | "modal" | "outline";
  className?: string;
  onSuccess?: () => void;
  label?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  variant = "primary",
  className = "",
  onSuccess,
  label = "Continue with Google"
}) => {
  const { signInWithGoogle, isSigningIn, isLoading } = useAuth();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSigningIn || isLoading) return;
    const success = await signInWithGoogle();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        disabled={isSigningIn || isLoading}
        className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98] ${
          isSigningIn
            ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-wait opacity-80"
            : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-800 dark:text-zinc-100 border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
        } ${className}`}
        title="Sign in with your Google account"
      >
        {isSigningIn ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
        ) : (
          <GoogleLogoIcon className="w-4 h-4" />
        )}
        <span className="hidden xs:inline">Sign In</span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        disabled={isSigningIn || isLoading}
        className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
          isSigningIn
            ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-wait"
            : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 hover:border-blue-500/40 shadow-xs"
        } ${className}`}
      >
        {isSigningIn ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <GoogleLogoIcon className="w-3.5 h-3.5" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  // Primary / Modal full-width button
  return (
    <button
      onClick={handleClick}
      disabled={isSigningIn || isLoading}
      className={`relative group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
        isSigningIn
          ? "bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 cursor-wait"
          : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-900 dark:text-white border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md hover:scale-[1.01]"
      } ${className}`}
    >
      {isSigningIn ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleLogoIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
