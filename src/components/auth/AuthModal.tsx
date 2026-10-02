import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, AlertCircle, CheckCircle2, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useAuth } from "../../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title = "Sign In to LearnStudy",
  subtitle = "Log in with your Google account to automatically synchronize all your playlists, video progress, notes, timestamps, and flashcards across all your phones, tablets, and computers."
}) => {
  const { currentUser, error, errorHint, clearError, syncStatus, lastSyncedAt } = useAuth();
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  const handleCopyHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            clearError();
            onClose();
          }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden z-10"
        >
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

          {/* Close button */}
          <button
            onClick={() => {
              clearError();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-4">
              <img src="/favicon.svg" alt="LearnStudy Logo" className="w-8 h-8 object-contain" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-850 rounded-2xl p-4 mb-6 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Real-time Multi-Device Cloud Synchronization</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Continue lectures on any device from exact second</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Timestamped notes, bookmarks & AI study decks</span>
            </div>
          </div>

          {/* Error Banner with helpful actionable hints */}
          {error && (
            <div className="p-4 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2 text-xs text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 font-semibold leading-relaxed">{error}</div>
              </div>

              {errorHint && (
                <div className="pt-2 border-t border-red-200/60 dark:border-red-900/50 text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed space-y-2">
                  <p>{errorHint}</p>
                  
                  {currentHost && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-red-200 dark:border-red-900/40">
                      <span className="font-mono text-[10px] text-slate-800 dark:text-zinc-200 truncate">{currentHost}</span>
                      <button
                        onClick={handleCopyHost}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0 hover:bg-blue-100 transition"
                      >
                        {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDomain ? "Copied" : "Copy Domain"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="space-y-3">
            <GoogleSignInButton
              variant="modal"
              onSuccess={onClose}
              label="Continue with Google"
            />
          </div>

          {/* Footer & Privacy notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-850 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Fast, secure authentication powered by Google Identity</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
