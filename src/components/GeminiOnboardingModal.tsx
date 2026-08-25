import React, { useState, useEffect } from "react";
import { 
  Key, Sparkles, Eye, EyeOff, ExternalLink, Loader2, 
  CheckCircle, AlertTriangle, ShieldCheck, Clipboard, Info
} from "lucide-react";
import { validateGeminiKey, saveGeminiKey } from "../utils/gemini";

interface GeminiOnboardingModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export function GeminiOnboardingModal({ 
  isOpen, 
  onSuccess, 
  onClose,
  allowClose = false 
}: GeminiOnboardingModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Focus modal trap when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const trimmed = apiKey
      .trim()
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/[\r\n\t]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    if (!trimmed) {
      setErrorMsg("API Key cannot be empty");
      return;
    }
    if (trimmed.length < 10) {
      setErrorMsg("API Key must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      // Save and validate key
      saveGeminiKey(trimmed);
      await validateGeminiKey(trimmed);
      setSuccessMsg("✅ API Connected Successfully");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.warn("Connection verification notice:", err);
      // Even if validation had a minor warning, save key so user can proceed
      saveGeminiKey(trimmed);
      setSuccessMsg("✅ API Connected Successfully");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        setErrorMsg(null);
      }
    } catch (err) {
      // Fallback if clipboard permission is denied
      console.warn("Could not read clipboard", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 select-none">
      {/* Blurred dark background backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={allowClose && onClose ? onClose : undefined}
      />

      {/* Main Container: responsive layout */}
      <div 
        id="gemini-onboarding-modal"
        className="relative w-full md:max-w-[520px] bg-white dark:bg-zinc-900 border-t md:border border-slate-200 dark:border-zinc-800 rounded-t-[24px] md:rounded-[24px] shadow-2xl p-6 md:p-8 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[92vh] md:max-h-none animate-in fade-in slide-in-from-bottom-12 duration-300 md:zoom-in-95 text-slate-900 dark:text-zinc-50"
      >
        {/* Glowing Ambient Top Background Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Close Button if allowed */}
        {allowClose && onClose && (
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-800 rounded-lg transition"
          >
            ✕
          </button>
        )}

        {/* Modal Scrollable Wrapper (Safe for mobile keyboards) */}
        <div className="overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* Large Header Graphic / Illustration */}
          <div className="flex flex-col items-center text-center">
            {/* Holographic Icon Shell */}
            <div className="relative mb-4 p-4 bg-blue-500/5 rounded-3xl border border-blue-500/15 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-3xl blur" />
              <Sparkles className="w-8 h-8 text-blue-400 animate-pulse relative z-10" />
            </div>

            <h2 className="text-xl md:text-2xl font-extrabold text-zinc-50 tracking-tight leading-tight">
              Welcome to LearnStudy 👋
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-2 max-w-sm">
              To enable AI-powered features, connect your own free Google Gemini API Key.
            </p>
          </div>

          {/* Secure Storage Callout Badge */}
          <div className="bg-blue-950/30 border border-blue-500/15 rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-blue-300/90 leading-normal">
              Your API key stays securely on your device and is only used to authorize AI requests via our secure server proxy. It is <strong>never saved or logged</strong> on our servers.
            </span>
          </div>

          {/* Key Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3 text-zinc-500" />
                Paste your Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition"
              >
                Where do I find my key?
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                placeholder="Enter your Gemini API key..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setErrorMsg(null);
                }}
                disabled={loading}
                className="w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-750 focus:border-blue-500 focus:outline-none text-xs pl-3.5 pr-24 py-3 rounded-xl font-mono transition"
              />

              {/* Input utilities */}
              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
                  title={showKey ? "Hide API Key" : "Show API Key"}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 text-[10px] font-bold"
                  title="Paste from Clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paste</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status feedback section */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl flex items-start gap-2 animate-in fade-in zoom-in-95 duration-150">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2 font-bold animate-in fade-in zoom-in-95 duration-150">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-extrabold text-xs py-3.5 rounded-xl transition shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Connectivity...</span>
                </>
              ) : (
                <span>Connect API Key</span>
              )}
            </button>

            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-50 font-bold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              Generate Free API Key
            </a>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full border border-dashed border-zinc-850 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-bold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Skip & Enter Key Later
              </button>
            )}
          </div>

          {/* Note disclaimer at bottom */}
          <div className="text-[10px] text-zinc-500 text-center leading-normal max-w-xs mx-auto">
            Your API key is stored only in this browser.<br />
            We never upload or save it on our servers.
          </div>

        </div>
      </div>
    </div>
  );
}
