import React, { useState } from "react";
import { Wrench, Clock, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { MaintenanceConfig } from "../types";
import { useAuth } from "../context/AuthContext";

export const MaintenanceScreen: React.FC<{
  config?: MaintenanceConfig;
  onAdminBypass?: () => void;
}> = ({ config, onAdminBypass }) => {
  const { currentUser, signInWithGoogle } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleBypass = () => {
    if (onAdminBypass) {
      onAdminBypass();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Wrench className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-3">
          {config?.title || "Scheduled Maintenance in Progress"}
        </h1>

        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          {config?.message || "LearnStudy is currently undergoing critical performance improvements and database indexing. We will be back online shortly. Your local study notes and progress are safe."}
        </p>

        {config?.estimatedEndTime && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-700/80 text-xs font-semibold text-slate-200 border border-slate-600 mb-6">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Estimated Recovery: {config.estimatedEndTime}</span>
          </div>
        )}

        <div className="pt-6 border-t border-slate-700 flex flex-col gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Live Status
          </button>

          {config?.allowAdminBypass && (
            <button
              onClick={handleBypass}
              className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Administrator Bypass Access
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-6 font-mono">
        LearnStudy Platform Infrastructure • Service Status 503
      </p>
    </div>
  );
};
