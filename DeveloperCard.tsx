import React, { useState } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut,
  User 
} from "../lib/firebase";
import { X, Mail, Lock, User as UserIcon, LogIn, LogOut, CheckCircle2, ShieldCheck, Sparkles, Cloud, CloudOff } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSyncTrigger?: () => void;
}

export function AuthModal({ isOpen, onClose, currentUser, onSyncTrigger }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      if (onSyncTrigger) onSyncTrigger();
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onSyncTrigger) onSyncTrigger();
      onClose();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* LOGGED IN ACCOUNT VIEW */
          <div className="space-y-6 text-center py-2">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-lg mx-auto overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full text-white border-2 border-white dark:border-zinc-900" title="Cloud Sync Active">
                <Cloud className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                {currentUser.displayName || "LearnStudy Scholar"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{currentUser.email}</p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Cloud Sync Connected</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Your notes, watch progress, flashcards, streaks, and study plans are automatically synchronized across all your devices.
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs py-3 rounded-xl transition"
              >
                Continue Studying
              </button>
            </div>
          </div>
        ) : (
          /* AUTH FORM VIEW */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
                {isSignUp ? "Create LearnStudy Account" : "Sign In to LearnStudy"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {isSignUp ? "Sync progress, flashcards, and notes on any device." : "Welcome back! Access your synced workspace."}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Google OAuth button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 font-bold text-xs py-3 px-4 border border-slate-200 dark:border-zinc-700 rounded-xl transition shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-zinc-800 w-full"></div>
              <span className="bg-white dark:bg-zinc-900 px-3 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider absolute">
                or email
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Gagan"
                      className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {isSignUp ? "Create Account" : "Sign In"}
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
