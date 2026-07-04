import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, XCircle, AlertTriangle, Info, 
  Loader2, X, RefreshCw, Download, Upload, 
  Bookmark, History, Sparkles, GraduationCap 
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  primary?: boolean;
}

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number; // custom duration in ms
  action?: ToastAction;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toast: {
    success: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => string;
    error: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => string;
    warning: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => string;
    info: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => string;
    loading: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => string;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Web Audio API synthesized subtle chime
const playSubtleChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Very elegant subtle dual-tone synthesizer ping
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.warn("Could not play notification sound:", err);
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("learnstudy_toast_sound") === "true";
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("learnstudy_toast_sound", enabled ? "true" : "false");
  };

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = options.id || Math.random().toString(36).substring(2, 9);
    const type = options.type || "info";

    setToasts((prev) => {
      // Prevent duplicates by checking if identical title and type exists within 1 second
      const now = Date.now();
      const isDuplicate = prev.some(
        (t) => t.title === options.title && t.type === type && now - t.createdAt < 1500
      );
      if (isDuplicate) return prev;

      const newToast: ToastItem = {
        ...options,
        id,
        type,
        createdAt: now,
      };

      // Keep maximum 5 toasts, remove oldest
      const updated = [newToast, ...prev];
      if (updated.length > 5) {
        return updated.slice(0, 5);
      }
      return updated;
    });

    if (soundEnabled) {
      playSubtleChime();
    }

    return id;
  }, [soundEnabled]);

  const toast = {
    success: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => 
      addToast({ title, description, type: "success", ...options }),
    error: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => 
      addToast({ title, description, type: "error", ...options }),
    warning: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => 
      addToast({ title, description, type: "warning", ...options }),
    info: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => 
      addToast({ title, description, type: "info", ...options }),
    loading: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description" | "type">) => 
      addToast({ title, description, type: "loading", ...options }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast, soundEnabled, setSoundEnabled, toast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Internal ToastContainer for rendering
const ToastContainer: React.FC<{ toasts: ToastItem[]; dismissToast: (id: string) => void }> = ({
  toasts,
  dismissToast,
}) => {
  return (
    <div 
      id="learnstudy-toast-container"
      className="fixed z-[9999] pointer-events-none flex flex-col gap-3 max-w-full
        /* Desktop Top Right */
        md:top-6 md:right-6 md:w-[380px] md:max-w-[420px] md:items-end
        /* Mobile Top Center with margin */
        top-4 left-1/2 -translate-x-1/2 w-[95%] sm:w-[400px] items-center"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastCard 
            key={toast.id} 
            toast={toast} 
            index={index} 
            dismiss={() => dismissToast(toast.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual ToastCard Component
const ToastCard: React.FC<{ toast: ToastItem; index: number; dismiss: () => void }> = ({
  toast,
  index,
  dismiss,
}) => {
  const { type, title, description, duration, action } = toast;
  
  // Resolve default durations based on specs
  let autoCloseDuration = duration;
  if (autoCloseDuration === undefined) {
    if (type === "success") autoCloseDuration = 3000;
    else if (type === "info") autoCloseDuration = 4000;
    else if (type === "warning") autoCloseDuration = 5000;
    else if (type === "error") autoCloseDuration = 0; // persistent
    else if (type === "loading") autoCloseDuration = 0; // persistent
  }

  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(autoCloseDuration || 0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoCloseDuration || autoCloseDuration <= 0) return;

    remainingTimeRef.current = autoCloseDuration;
    startTimeRef.current = Date.now();

    const animate = () => {
      if (isPaused) {
        startTimeRef.current = Date.now(); // bump start time to maintain remaining duration
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;

      if (remaining <= 0) {
        setProgress(0);
        dismiss();
      } else {
        setProgress((remaining / autoCloseDuration) * 100);
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [autoCloseDuration, isPaused, dismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (autoCloseDuration && autoCloseDuration > 0) {
      // Save remaining time before pausing
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
  };

  // Icon selector
  const renderIcon = () => {
    const iconClass = "w-5 h-5 shrink-0";
    switch (type) {
      case "success":
        return <CheckCircle className={`${iconClass} text-emerald-400`} />;
      case "error":
        return <XCircle className={`${iconClass} text-rose-500`} />;
      case "warning":
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      case "info":
        return <Info className={`${iconClass} text-blue-400`} />;
      case "loading":
        return <Loader2 className={`${iconClass} text-blue-400 animate-spin`} />;
      default:
        return <Sparkles className={`${iconClass} text-indigo-400`} />;
    }
  };

  // Border and accent bar color classes
  const getAccentColorClass = () => {
    switch (type) {
      case "success": return "bg-emerald-500";
      case "error": return "bg-rose-500";
      case "warning": return "bg-amber-500";
      case "info": return "bg-blue-500";
      case "loading": return "bg-blue-500";
      default: return "bg-indigo-500";
    }
  };

  const getLeftBorderClass = () => {
    switch (type) {
      case "success": return "border-l-[4px] border-l-emerald-500";
      case "error": return "border-l-[4px] border-l-rose-500";
      case "warning": return "border-l-[4px] border-l-amber-500";
      case "info": return "border-l-[4px] border-l-blue-500";
      case "loading": return "border-l-[4px] border-l-blue-400";
      default: return "border-l-[4px] border-l-indigo-500";
    }
  };

  // Timestamp text helper (just formatted mock since it's immediate)
  const [timeAgo, setTimeAgo] = useState("just now");
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - toast.createdAt) / 1000);
      if (seconds < 5) setTimeAgo("just now");
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins}m ago`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [toast.createdAt]);

  // Framer Motion spring configuration for ultra-smooth animations
  const springConfig = { type: "spring", stiffness: 380, damping: 30 };

  return (
    <motion.div
      id={`toast-card-${toast.id}`}
      layout
      initial={{ opacity: 0, y: -15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
      transition={springConfig}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      className={`pointer-events-auto relative w-full md:w-[380px] bg-slate-950/95 dark:bg-zinc-950/95 backdrop-blur-[20px] 
        rounded-[18px] border border-white/8 dark:border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.35)] 
        overflow-hidden transition-all duration-200 select-none ${getLeftBorderClass()}
        hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(0,0,0,0.45)] flex flex-col`}
    >
      <div className="p-4 flex gap-3.5 items-start">
        {/* Left Side Status Icon */}
        <div className="mt-0.5">
          {renderIcon()}
        </div>

        {/* Center Title and Description */}
        <div className="flex-1 space-y-1 min-w-0">
          <h4 className="text-[14px] sm:text-[15px] font-semibold text-white tracking-tight leading-snug">
            {title}
          </h4>
          {description && (
            <p className="text-[12px] sm:text-[13px] text-zinc-400 dark:text-zinc-400 font-medium leading-relaxed break-words">
              {description}
            </p>
          )}

          {/* Optional Action Buttons */}
          {action && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(e);
                  dismiss();
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                  action.primary 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50"
                }`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Right Side Control Buttons & Timestamp */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 min-h-[42px] pl-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition"
            aria-label="Close Notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-zinc-500 font-medium">
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      {autoCloseDuration !== undefined && autoCloseDuration > 0 && (
        <div className="w-full bg-white/5 dark:bg-zinc-900/50 h-[3px] mt-auto">
          <div 
            style={{ width: `${progress}%` }} 
            className={`h-full ${getAccentColorClass()} transition-all duration-75`}
          />
        </div>
      )}
    </motion.div>
  );
};
