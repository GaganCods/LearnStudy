import React from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Laptop, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  onDismiss: () => void;
  hasNativePrompt: boolean;
  isIOS: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  onDismiss,
  hasNativePrompt,
  isIOS,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl dark:bg-[#0f1117] border border-slate-200/80 dark:border-white/10 z-10 overflow-hidden font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon and Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3.5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-2.5 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="LearnStudy Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#0f1117]">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Install LearnStudy
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-w-[260px]">
              Install as a standalone app for faster access, distraction-free studying, and offline support.
            </p>
          </div>

          {/* Dynamic Content based on platform */}
          {isIOS && !hasNativePrompt ? (
            <div className="mt-5 space-y-3 bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs text-slate-700 dark:text-zinc-300">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                <span>How to install on iOS Safari</span>
              </div>
              <ol className="space-y-2 pl-1 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share2 className="w-3 h-3 inline mx-0.5 text-blue-500" /> in Safari's bottom toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3 h-3 inline mx-0.5 text-blue-500" />.
                  </span>
                </li>
              </ol>

              <button
                onClick={onDismiss}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              <button
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install App</span>
              </button>

              <button
                onClick={onDismiss}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Not now
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
