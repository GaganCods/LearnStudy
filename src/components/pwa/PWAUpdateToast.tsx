import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAUpdateToastProps {
  needRefresh: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateToast: React.FC<PWAUpdateToastProps> = ({
  needRefresh,
  onUpdate,
  onDismiss,
}) => {
  if (!needRefresh) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-white dark:bg-zinc-900 border border-blue-500/30 p-3 shadow-2xl dark:shadow-black/60 max-w-sm font-sans"
      >
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900 dark:text-white">
            Update Available
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
            A new version of LearnStudy is ready.
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUpdate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Update</span>
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
