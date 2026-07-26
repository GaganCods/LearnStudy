import React, { useEffect } from "react";
import { usePomodoro } from "./PomodoroContext";
import { Play, Pause, RotateCcw, SkipForward, Plus, Minus, Minimize2, Flame, Award, HelpCircle } from "lucide-react";

export function FullScreenTimer() {
  const {
    settings,
    activeState,
    isFullScreen,
    setFullScreen,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    addMinute,
    subMinute,
    activeVideoInfo,
  } = usePomodoro();

  // Listen to Escape key to exit fullscreen mode
  useEffect(() => {
    if (!isFullScreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullScreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, setFullScreen]);

  if (!isFullScreen) return null;

  const remainingSeconds = Math.ceil(activeState.remainingMs / 1000);
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, "0");

  const progressRatio = activeState.durationMs > 0 
    ? (activeState.durationMs - activeState.remainingMs) / activeState.durationMs 
    : 0;

  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const displayTime = hrs > 0 
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 select-none" id="fullscreen-study-overlay">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-slate-400">
            {activeState.mode === "focus" 
              ? `Focus Session (${activeState.sessionIndex}/${settings.sessionsBeforeLongBreak})`
              : activeState.mode === "shortBreak" ? "Short Break" : "Long Break"
            }
          </span>
        </div>

        <button
          onClick={() => setFullScreen(false)}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Exit Fullscreen</span>
          <span className="opacity-40 text-[9px] font-mono hidden sm:inline">ESC</span>
        </button>
      </div>

      {/* Large Center Countdown */}
      <div className="flex flex-col items-center justify-center my-auto py-2 sm:py-4">
        <div className="relative group cursor-pointer" onClick={activeState.isPaused ? startTimer : pauseTimer}>
          <svg viewBox="0 0 360 360" className="w-60 h-60 xs:w-72 xs:h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="180"
              cy="180"
              r={radius}
              className="stroke-zinc-900"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Front Ring */}
            <circle
              cx="180"
              cy="180"
              r={radius}
              className={`transition-all duration-300 ease-linear ${
                activeState.mode === "focus" ? "stroke-orange-500" : "stroke-emerald-500"
              }`}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Core Digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl xs:text-5xl sm:text-6xl font-black tracking-tighter text-white font-mono">
              {displayTime}
            </span>
            <span className="text-[9px] sm:text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 sm:mt-2">
              {activeState.isPaused ? "Timer Paused" : "Stay Immersed"}
            </span>
          </div>
        </div>

        {/* Increment / Decrement Time */}
        <div className="flex items-center gap-4 mt-6 sm:mt-8">
          <button
            onClick={subMinute}
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 transition"
            title="Subtract 1 Minute"
          >
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="text-[11px] sm:text-xs font-bold text-slate-400">Time Buffer</span>
          <button
            onClick={addMinute}
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 transition"
            title="Add 1 Minute"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto border-t border-white/5 pt-6">
        
        {/* Playback itemstudied */}
        {activeVideoInfo && (
          <div className="text-xs text-slate-400 text-center max-w-lg truncate">
            Immersive study session active for: <span className="font-semibold text-white">{activeVideoInfo.lectureTitle}</span>
          </div>
        )}

        {/* Master buttons */}
        <div className="flex items-center gap-6">
          <button
            onClick={resetTimer}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={activeState.isPaused ? startTimer : pauseTimer}
            className={`w-20 h-20 flex items-center justify-center rounded-full text-white shadow-xl active:scale-95 transition-all ${
              activeState.isPaused ? "bg-blue-600 hover:bg-blue-500" : "bg-amber-500 hover:bg-amber-400"
            }`}
            title={activeState.isPaused ? "Resume Session" : "Pause Session"}
          >
            {activeState.isPaused ? <Play className="w-8 h-8 fill-current ml-1" /> : <Pause className="w-8 h-8 fill-current" />}
          </button>

          <button
            onClick={skipSession}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Skip Session"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Rotating Study Quotes */}
        <p className="text-[11px] text-slate-500 font-medium italic text-center max-w-md">
          "Focus is a muscle. The more you train it, the stronger it becomes. Stay immersed in the process."
        </p>
      </div>

    </div>
  );
}
