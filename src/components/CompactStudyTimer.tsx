import React from "react";
import { usePomodoro } from "./PomodoroContext";
import { Play, Pause, RotateCcw, SkipForward, Plus, Maximize2 } from "lucide-react";

export function CompactStudyTimer() {
  const {
    settings,
    activeState,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    addMinute,
    setFullScreen,
  } = usePomodoro();

  const remainingSeconds = Math.ceil(activeState.remainingMs / 1000);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, "0");

  const progress = activeState.durationMs > 0 
    ? ((activeState.durationMs - activeState.remainingMs) / activeState.durationMs) * 100 
    : 0;

  return (
    <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/70 dark:border-zinc-800 rounded-3xl p-4.5 shadow-sm space-y-3.5 select-none" id="compact-study-timer-widget">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            activeState.mode === "focus" 
              ? "bg-orange-500 animate-pulse" 
              : activeState.mode === "shortBreak" 
              ? "bg-emerald-500 animate-ping" 
              : "bg-blue-500"
          }`} />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            {activeState.mode === "focus" 
              ? `Focus Mode (${activeState.sessionIndex}/${settings.sessionsBeforeLongBreak})` 
              : "Break Mode"
            }
          </span>
        </div>

        <button
          onClick={() => setFullScreen(true)}
          className="p-1.5 bg-white dark:bg-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 transition"
          title="Fullscreen Focus Timer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Time Text */}
        <div className="font-mono text-3xl font-black text-slate-900 dark:text-zinc-50 tracking-tighter">
          {pad(mins)}:{pad(secs)}
        </div>

        {/* Minimal Control Row */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-1 rounded-xl">
          <button
            onClick={activeState.isPaused ? startTimer : pauseTimer}
            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-950 dark:hover:text-white transition"
            title={activeState.isPaused ? "Start" : "Pause"}
          >
            {activeState.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          </button>
          
          <button
            onClick={addMinute}
            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-950 dark:hover:text-white transition"
            title="Add 1 Minute"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={skipSession}
            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-950 dark:hover:text-white transition"
            title="Skip"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={resetTimer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-850 transition"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-150 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            activeState.mode === "focus" ? "bg-orange-500" : "bg-emerald-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
