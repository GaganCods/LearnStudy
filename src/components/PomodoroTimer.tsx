import React, { useState, useMemo } from "react";
import { usePomodoro } from "./PomodoroContext";
import { playPomodoroSound } from "../utils/pomodoroSounds";
import { 
  Play, Pause, RotateCcw, ChevronRight, SkipForward, Plus, Minus,
  Maximize2, Minimize2, Settings, BarChart2, History, Award, 
  Flame, Volume2, Bell, AlertTriangle, Search, Trash2, Download, 
  Sparkles, CheckCircle, Smartphone, ExternalLink, Moon, HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";

export function PomodoroTimer() {
  const {
    settings,
    activeState,
    history,
    stats,
    isFullScreen,
    isFloating,
    setFullScreen,
    setFloating,
    updateSettings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    addMinute,
    subMinute,
    selectPreset,
    updateGoals,
    deleteHistory,
    clearHistory,
    exportHistory,
    activeVideoInfo
  } = usePomodoro();

  const [activeSubTab, setActiveSubTab] = useState<"timer" | "stats" | "history" | "settings">("timer");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "interrupted">("all");

  // Timer values calculation
  const totalDurationSeconds = activeState.durationMs / 1000;
  const remainingSeconds = Math.ceil(activeState.remainingMs / 1000);
  const elapsedSeconds = totalDurationSeconds - remainingSeconds;
  
  // Progress ratio (0 to 1) for the circular indicator
  const progressRatio = totalDurationSeconds > 0 ? elapsedSeconds / totalDurationSeconds : 0;
  // SVG Ring Calculations
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");

    if (settings.countdownFormat === "HH:MM:SS" || hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Recharts past 7 days focus minutes processing
  const focusChartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      const dayName = days[d.getDay()];

      // Filter focus time from history for this date
      const daysHistory = history.filter(h => h.date === dateStr);
      const focusMins = daysHistory.reduce((acc, curr) => acc + curr.focusDuration, 0);
      const breakMins = daysHistory.reduce((acc, curr) => acc + curr.breakDuration, 0);

      result.push({
        day: dayName,
        date: dateStr.substring(5), // MM-DD format
        "Focus Time": focusMins,
        "Break Time": breakMins,
      });
    }
    return result;
  }, [history]);

  // Goal percentage
  const todayGoalPercent = Math.min(
    100,
    stats.dailyGoalMins > 0 ? Math.round((stats.totalFocusToday / stats.dailyGoalMins) * 100) : 0
  );

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = 
        (item.lectureTitle?.toLowerCase() || "").includes(historySearch.toLowerCase()) ||
        (item.playlistTitle?.toLowerCase() || "").includes(historySearch.toLowerCase());
      
      if (historyFilter === "all") return matchesSearch;
      if (historyFilter === "completed") return matchesSearch && item.completed;
      if (historyFilter === "interrupted") return matchesSearch && !item.completed;
      return matchesSearch;
    });
  }, [history, historySearch, historyFilter]);

  // Handle auto-vibrate, test sounds
  const handleTestSound = () => {
    playPomodoroSound(settings.notificationSound, settings.volume);
  };

  // Active video studied reminder
  const currentStudyingString = activeVideoInfo 
    ? `${activeVideoInfo.lectureTitle} (${activeVideoInfo.playlistTitle || "Single Video"})`
    : activeState.lectureTitle 
    ? `${activeState.lectureTitle} (${activeState.playlistTitle || "Offline Video"})`
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6 select-none" id="pomodoro-engine-dashboard">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900/40 dark:to-zinc-900/60 p-5 rounded-3xl border border-slate-200/50 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            Pomodoro Study Station
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Maintain high focus streaks, configure flexible break durations, and study without recommendations.
          </p>
        </div>

        {/* Floating Timer Toggle & Fast Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFloating(!isFloating)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isFloating 
                ? "bg-indigo-600 border-transparent text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Toggle Floating Widget Overlay"
          >
            <Smartphone className="w-3.5 h-3.5" />
            {isFloating ? "Overlay: Active" : "Enable Overlay"}
          </button>

          <button
            onClick={() => setFullScreen(true)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Full Screen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800">
        {[
          { id: "timer", label: "Focus Timer", icon: Flame },
          { id: "stats", label: "Analytics & Goals", icon: BarChart2 },
          { id: "history", label: "Session Log", icon: History },
          { id: "settings", label: "Preferences", icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 -mb-[2px] transition ${
              activeSubTab === tab.id 
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TIMER VIEW */}
      {activeSubTab === "timer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Ring Container */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative min-h-[460px]">
            
            {/* Session indicator */}
            <div className="absolute top-6 flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800 rounded-full">
              <span className={`w-2.5 h-2.5 rounded-full ${activeState.mode === "focus" ? "bg-orange-500 animate-pulse" : activeState.mode === "shortBreak" ? "bg-emerald-500 animate-ping" : "bg-blue-500"}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                {activeState.mode === "focus" 
                  ? `Focus Session (${activeState.sessionIndex}/${settings.sessionsBeforeLongBreak})`
                  : activeState.mode === "shortBreak" ? "Short Break" : "Long Break"
                }
              </span>
            </div>

            {/* Circular SVG Ring */}
            <div className="relative my-8 group cursor-pointer" onClick={activeState.isPaused ? startTimer : pauseTimer}>
              <svg className="w-64 h-64 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-zinc-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className={`transition-all duration-300 ease-linear ${
                    activeState.mode === "focus" 
                      ? "stroke-orange-500" 
                      : activeState.mode === "shortBreak" ? "stroke-emerald-500" : "stroke-blue-500"
                  }`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>

              {/* Time digits */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-zinc-50 ${settings.countdownAnimationStyle === "pulse" && !activeState.isPaused ? "animate-pulse" : ""}`}>
                  {formatTime(remainingSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-widest mt-1">
                  {activeState.isPaused ? "Paused" : "Stay Focused"}
                </span>
              </div>
            </div>

            {/* Micro Minute Adders */}
            <div className="flex items-center gap-3.5 mb-6">
              <button
                onClick={subMinute}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition"
                title="Subtract 1 Minute"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Time Buffer</span>
              <button
                onClick={addMinute}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition"
                title="Add 1 Minute"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Play/Pause Control Deck */}
            <div className="flex items-center gap-4">
              <button
                onClick={resetTimer}
                className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                title="Reset Session Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={activeState.isPaused ? startTimer : pauseTimer}
                className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-md active:scale-95 transition-all ${
                  activeState.isPaused 
                    ? "bg-blue-600 hover:bg-blue-500" 
                    : "bg-amber-500 hover:bg-amber-400"
                }`}
                title={activeState.isPaused ? "Start Session" : "Pause Session"}
              >
                {activeState.isPaused ? (
                  <Play className="w-6 h-6 fill-current ml-1" />
                ) : (
                  <Pause className="w-6 h-6 fill-current" />
                )}
              </button>

              <button
                onClick={skipSession}
                className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                title="Skip Current Session"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Currently studying lecture indicator */}
            {currentStudyingString && (
              <div className="mt-6 text-xs text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800 pt-4 w-full">
                Studying: <span className="font-semibold text-slate-600 dark:text-zinc-300">{currentStudyingString}</span>
              </div>
            )}
          </div>

          {/* Quick presets and daily goal progress cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Presets Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Timer Presets
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "pomodoro", label: "Pomodoro", desc: "25 min focus + 5m break" },
                  { id: "long", label: "Long Study", desc: "50 min focus + 10m break" },
                  { id: "deep", label: "Deep Work", desc: "90 min focus + 20m break" },
                  { id: "quick", label: "Quick Revision", desc: "15 min focus + 3m break" },
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset.id as any)}
                    className="p-3.5 text-left border border-slate-150 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-400/50 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-blue-50/20 dark:hover:bg-zinc-900/60 rounded-2xl transition"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">{preset.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Goals Tally */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm space-y-5">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Daily Goals & Streaks
              </h2>

              <div className="flex items-center gap-4 bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-zinc-800 p-4 rounded-2xl">
                <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
                <div>
                  <div className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">Current Streak: {stats.currentStreak} Days</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 font-medium">Longest Streak: {stats.longestStreak} Days. Keep studying!</div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <span>Today's Focus Goal</span>
                    <span>{stats.totalFocusToday} / {stats.dailyGoalMins} mins ({todayGoalPercent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${todayGoalPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <span>Sessions Completed Today</span>
                    <span>{stats.sessionsCompletedToday} sessions</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold flex gap-1 items-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Focus cycles tracked accurately.
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Helper */}
            <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl">
              <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                Desktop Keyboard Shortcuts
              </div>
              <div className="mt-2.5 space-y-1.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                <div className="flex justify-between"><span>Spacebar</span> <span>Play / Pause</span></div>
                <div className="flex justify-between"><span>S Key</span> <span>Skip Current Session</span></div>
                <div className="flex justify-between"><span>R Key</span> <span>Reset Timer</span></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ANALYTICS & GOALS VIEW */}
      {activeSubTab === "stats" && (
        <div className="space-y-6">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Today's Focus</span>
              <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">{stats.totalFocusToday} <span className="text-xs font-semibold">mins</span></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Today's Break</span>
              <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">{stats.totalBreakToday} <span className="text-xs font-semibold">mins</span></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Streak Status</span>
              <div className="text-2xl font-black text-orange-500 mt-1">{stats.currentStreak} <span className="text-xs font-semibold text-slate-400">Days</span></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Weekly Goal</span>
              <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">{stats.weeklyGoalMins} <span className="text-xs font-semibold">mins</span></div>
            </div>
          </div>

          {/* Bar Chart using Recharts */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-zinc-50">7-Day Study Performance</h2>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Focus and Break minutes distributed over the past week.</p>
            </div>

            <div className="h-64 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={focusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.96)', fontSize: 11, fontWeight: 'bold' }}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Bar dataKey="Focus Time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Break Time" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Goals Tuning panel */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-950 dark:text-zinc-50 mb-4">Update Focus Goals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 dark:text-zinc-500">Daily Focus Goal (mins)</label>
                <input
                  type="number"
                  min={10}
                  max={720}
                  value={stats.dailyGoalMins}
                  onChange={(e) => updateGoals(parseInt(e.target.value) || 120, stats.weeklyGoalMins, stats.monthlyGoalMins)}
                  className="w-full mt-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 dark:text-zinc-500">Weekly Focus Goal (mins)</label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={stats.weeklyGoalMins}
                  onChange={(e) => updateGoals(stats.dailyGoalMins, parseInt(e.target.value) || 600, stats.monthlyGoalMins)}
                  className="w-full mt-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 dark:text-zinc-500">Monthly Focus Goal (mins)</label>
                <input
                  type="number"
                  min={10}
                  max={20000}
                  value={stats.monthlyGoalMins}
                  onChange={(e) => updateGoals(stats.dailyGoalMins, stats.weeklyGoalMins, parseInt(e.target.value) || 2400)}
                  className="w-full mt-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SESSION HISTORY VIEW */}
      {activeSubTab === "history" && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          
          {/* Filters/Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search history by video title or playlist..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs pl-10 pr-4 py-2.5 rounded-xl text-slate-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Logs</option>
                <option value="completed">Completed Only</option>
                <option value="interrupted">Interrupted Only</option>
              </select>

              <button
                onClick={exportHistory}
                className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition text-slate-700 dark:text-zinc-300"
                title="Export History logs as backup JSON"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your entire Pomodoro study log history? This cannot be undone.")) {
                    clearHistory();
                  }
                }}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/30 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition"
                title="Clear all local history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3.5 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-150 dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-zinc-950/40 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        item.completed 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" 
                          : "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                        {item.completed ? "Completed" : "Interrupted"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">{item.date} • {item.startTime} - {item.endTime}</span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate mt-1.5">
                      {item.lectureTitle ? item.lectureTitle : "Self Study Session"}
                    </p>

                    {item.playlistTitle && (
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                        Playlist: {item.playlistTitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {item.focusDuration > 0 && (
                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400">+{item.focusDuration}m focus</div>
                      )}
                      {item.breakDuration > 0 && (
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{item.breakDuration}m break</div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteHistory(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Delete log item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-zinc-950/10 border border-slate-150 dark:border-zinc-850 rounded-2xl">
                <History className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-zinc-400 mt-2">No study history recorded</h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-xs mx-auto">Complete focus sessions using the timer page to populate logs.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* PREFERENCES / CONFIG VIEW */}
      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Durations Setup */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2">Custom Mode Durations</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Focus Interval</span>
                  <span className="text-blue-600 dark:text-blue-400">{settings.focusDuration} mins</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={180}
                  step={5}
                  value={settings.focusDuration}
                  onChange={(e) => updateSettings({ focusDuration: parseInt(e.target.value) })}
                  className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Short Break Interval</span>
                  <span className="text-blue-600 dark:text-blue-400">{settings.shortBreakDuration} mins</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={settings.shortBreakDuration}
                  onChange={(e) => updateSettings({ shortBreakDuration: parseInt(e.target.value) })}
                  className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Long Break Interval</span>
                  <span className="text-blue-600 dark:text-blue-400">{settings.longBreakDuration} mins</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={settings.longBreakDuration}
                  onChange={(e) => updateSettings({ longBreakDuration: parseInt(e.target.value) })}
                  className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Sessions Before Long Break</span>
                  <span className="text-blue-600 dark:text-blue-400">{settings.sessionsBeforeLongBreak} cycles</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={settings.sessionsBeforeLongBreak}
                  onChange={(e) => updateSettings({ sessionsBeforeLongBreak: parseInt(e.target.value) })}
                  className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sound, Autostarts, and Notification parameters */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2">Audio & Notification Setup</h3>

            <div className="space-y-4">
              {/* Sound type */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Notification Sound alert</span>
                  <button onClick={handleTestSound} className="text-[10px] font-black uppercase text-blue-500 dark:text-blue-400 hover:underline">Test Sound</button>
                </label>
                <select
                  value={settings.notificationSound}
                  onChange={(e) => updateSettings({ notificationSound: e.target.value })}
                  className="w-full mt-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="bell">Chime Bell</option>
                  <option value="harp">Zen Harp Melody</option>
                  <option value="digital">Digital Double Beep</option>
                  <option value="alarm">Retro Loud Alarm</option>
                </select>
              </div>

              {/* Volume */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Sound volume</span>
                  <span>{settings.volume}%</span>
                </label>
                <div className="flex items-center gap-3.5 mt-1.5">
                  <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.volume}
                    onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Auto-start Breaks</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Transition automatically to break timer</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ autoStartBreaks: !settings.autoStartBreaks })}
                    className={`w-9 h-5 rounded-full transition relative flex items-center px-1 ${settings.autoStartBreaks ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-all transform ${settings.autoStartBreaks ? "translate-x-3.5" : ""}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Auto-start Next Focus</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Resume focus cycle after break finishes</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ autoStartNextFocus: !settings.autoStartNextFocus })}
                    className={`w-9 h-5 rounded-full transition relative flex items-center px-1 ${settings.autoStartNextFocus ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-all transform ${settings.autoStartNextFocus ? "translate-x-3.5" : ""}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Vibration Feedback</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Vibrate mobile devices on completion</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ enableVibration: !settings.enableVibration })}
                    className={`w-9 h-5 rounded-full transition relative flex items-center px-1 ${settings.enableVibration ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-all transform ${settings.enableVibration ? "translate-x-3.5" : ""}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Browser Notifications</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Receive browser push notification alerts</div>
                  </div>
                  <button
                    onClick={() => {
                      const enabled = !settings.enableBrowserNotifications;
                      if (enabled && "Notification" in window) {
                        Notification.requestPermission();
                      }
                      updateSettings({ enableBrowserNotifications: enabled });
                    }}
                    className={`w-9 h-5 rounded-full transition relative flex items-center px-1 ${settings.enableBrowserNotifications ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-all transform ${settings.enableBrowserNotifications ? "translate-x-3.5" : ""}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Countdown Format</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Toggle hours display or default minutes</div>
                  </div>
                  <select
                    value={settings.countdownFormat}
                    onChange={(e) => updateSettings({ countdownFormat: e.target.value as any })}
                    className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300"
                  >
                    <option value="MM:SS">MM:SS</option>
                    <option value="HH:MM:SS">HH:MM:SS</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Ring Animation Style</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Visual pulse rhythm or standard mode</div>
                  </div>
                  <select
                    value={settings.countdownAnimationStyle}
                    onChange={(e) => updateSettings({ countdownAnimationStyle: e.target.value as any })}
                    className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300"
                  >
                    <option value="none">None</option>
                    <option value="pulse">Pulse effect</option>
                    <option value="smooth">Smooth Ring</option>
                  </select>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
