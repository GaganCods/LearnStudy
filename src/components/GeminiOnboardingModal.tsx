import React, { useState, useEffect } from "react";
import { 
  Key, Sparkles, Eye, EyeOff, ExternalLink, Loader2, 
  CheckCircle2, AlertTriangle, ShieldCheck, Clipboard, Trash2,
  RefreshCw, Check, ArrowRight, Lock
} from "lucide-react";
import { 
  getGeminiKey, 
  saveGeminiKey, 
  removeGeminiKey, 
  maskApiKey, 
  testGeminiKey, 
  KeyTestResult 
} from "../utils/gemini";

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
  const existingKey = getGeminiKey();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResult | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const key = getGeminiKey();
      if (!key) {
        setIsChangingKey(true);
        setApiKey("");
      } else {
        setIsChangingKey(false);
      }
      setTestResult(null);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (candidateKey?: string) => {
    setTestResult(null);
    const keyToTest = candidateKey !== undefined ? candidateKey.trim() : apiKey.trim();

    if (!keyToTest) {
      setTestResult({
        valid: false,
        errorType: "invalid",
        title: "API key cannot be empty",
        message: "Please paste your Gemini API key from Google AI Studio to enable AI features.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await testGeminiKey(keyToTest);
      setTestResult(result);

      if (result.valid) {
        saveGeminiKey(keyToTest);
        setIsChangingKey(false);
        setApiKey("");
        setTimeout(() => {
          onSuccess();
        }, 800);
      }
    } catch (err: any) {
      setTestResult({
        valid: false,
        errorType: "network",
        title: "Network error",
        message: "LearnStudy couldn't connect to Gemini. Check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestExistingKey = async () => {
    const key = getGeminiKey();
    if (!key) {
      setIsChangingKey(true);
      return;
    }
    setLoading(true);
    setTestResult(null);
    try {
      const result = await testGeminiKey(key);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        valid: false,
        errorType: "network",
        title: "Network error",
        message: "LearnStudy couldn't connect to Gemini. Check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKey = () => {
    removeGeminiKey();
    setApiKey("");
    setIsChangingKey(true);
    setTestResult({
      valid: false,
      errorType: "invalid",
      title: "API key removed",
      message: "Add your Gemini API key to enable AI-powered study features.",
    });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        setTestResult(null);
      }
    } catch (err) {
      console.warn("Could not read clipboard", err);
    }
  };

  const currentSavedKey = getGeminiKey();
  const hasConfiguredKey = !!currentSavedKey && !isChangingKey;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 select-none">
      {/* Blurred background overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={allowClose && onClose ? onClose : undefined}
      />

      {/* Main Container Card */}
      <div 
        id="gemini-onboarding-modal"
        className="relative w-full md:max-w-[540px] bg-white dark:bg-zinc-900 border-t md:border border-slate-200 dark:border-zinc-800 rounded-t-[28px] md:rounded-[28px] shadow-2xl p-6 md:p-8 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[92vh] md:max-h-none animate-in fade-in slide-in-from-bottom-12 duration-300 md:zoom-in-95 text-slate-900 dark:text-zinc-50"
      >
        {/* Ambient Top Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Close Button */}
        {allowClose && onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer z-20"
            title="Close modal"
          >
            ✕
          </button>
        )}

        <div className="overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* Header Title & Graphic */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3 p-3.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                Bring Your Own Key
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">
              Gemini API Key
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
              Add your Google AI Studio API key to use AI-powered features in LearnStudy.
            </p>
          </div>

          {/* STATE 1: API KEY CONFIGURED */}
          {hasConfiguredKey ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Configured Status Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      API key configured ✓
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 mt-0.5">
                      {maskApiKey(currentSavedKey)}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-1 rounded-full">
                  Active
                </span>
              </div>

              {/* Action Buttons: Test Key, Change Key, Remove */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleTestExistingKey}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 px-3 rounded-xl transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Test Key</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsChangingKey(true);
                    setApiKey(currentSavedKey || "");
                    setTestResult(null);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs py-3 px-3 rounded-xl transition border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Change Key</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRemoveKey}
                  className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-xs py-3 px-3 rounded-xl transition border border-red-200 dark:border-red-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              {/* Diagnostic Test Feedback */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    testResult.valid
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs">{testResult.title}</div>
                    <div className="text-[11px] leading-relaxed opacity-95">{testResult.message}</div>
                  </div>
                </div>
              )}

              {/* Ready Continue Button */}
              <button
                type="button"
                onClick={onSuccess}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:opacity-95"
              >
                <span>Use Gemini Features</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* STATE 2: NO API KEY ADDED OR EDITING KEY */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Status banner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {currentSavedKey ? "Update your Gemini API Key" : "No API key added — Add your key to enable AI features."}
                </span>
              </div>

              {/* Key Input Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-slate-400" />
                    Paste your API key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    disabled={loading}
                    className="w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none text-xs pl-3.5 pr-24 py-3.5 rounded-xl font-mono transition"
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 transition"
                      title={showKey ? "Hide API Key" : "Show API Key"}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      title="Paste from Clipboard"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Diagnostic Test Result Banner */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    testResult.valid
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs">{testResult.title}</div>
                    <div className="text-[11px] leading-relaxed opacity-95">{testResult.message}</div>
                  </div>
                </div>
              )}

              {/* Primary Action Button: Test & Save */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTestAndSave()}
                  disabled={loading || !apiKey.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing Key with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Test & Save</span>
                    </>
                  )}
                </button>

                {currentSavedKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingKey(false);
                      setTestResult(null);
                    }}
                    className="w-full border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Local Storage Privacy Notice */}
              <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-3 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                  🔒 Your API key is stored locally in this browser and isn't uploaded to LearnStudy's server.
                </span>
              </div>

              {/* Step by Step Guide: How to get a key */}
              <div className="bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/60 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                  <span>How to get a key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Get API Key ↗
                  </a>
                </div>
                <ol className="text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Google AI Studio</a></li>
                  <li>Click <strong>Create API Key</strong></li>
                  <li>Copy the generated key</li>
                  <li>Paste it above and click <strong>Test & Save</strong></li>
                </ol>
              </div>

              {/* Skip option if allowed */}
              {allowClose && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 py-1 transition cursor-pointer"
                >
                  Skip for now
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
