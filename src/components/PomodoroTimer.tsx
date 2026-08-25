import React, { useState, useMemo } from "react";
import { usePomodoro } from "./PomodoroContext";

import { playPomodoroSound } from "../utils/pomodoroSounds";
import { PomodoroSettingsPanel } from "./PomodoroSettingsPanel";
import { AlarmClock, 
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
    activeVideoInfo,
    isAlarmRinging,
    stopAlarm,
    snoozeAlarm
  } = usePomodoro();

  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"timer" | "stats" | "history" | "settings">("timer");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "interrupted">("all");

  // Timer values calculation

  const builtinPresets = [
    { id: "25/5", label: "25 / 5 (Classic)" },
    { id: "50/10", label: "50 / 10" },
    { id: "60/15", label: "60 / 15" },
    { id: "90/20", label: "90 / 20" },
    { id: "custom", label: "Custom Mode" }
  ];
  const selectedPresetLabel = builtinPresets.find(p => p.id === settings.selectedPresetId)?.label 
      || settings.customPresets?.find(p => p.id === settings.selectedPresetId)?.name;

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
    <div className="max-w-7xl mx-auto px-4 py-4 select-none" id="pomodoro-engine-dashboard">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900/40 dark:to-zinc-900/60 p-5 rounded-3xl border border-slate-200/50 dark:border-zinc-800 mb-6">
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
            <span className="hidden sm:inline">{isFloating ? "Overlay: Active" : "Enable Overlay"}</span>
          </button>

          <button
            onClick={() => setFullScreen(true)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Full Screen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveSubTab(activeSubTab === "settings" ? "timer" : "settings")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              activeSubTab === "settings"
                ? "bg-indigo-600 border-transparent text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Pomodoro Timer Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Content Area (Timer/Stats/History) */}
        <div className="lg:col-span-12 space-y-6 max-w-4xl mx-auto w-full">
          
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "timer", label: "Timer", icon: AlarmClock },
              { id: "stats", label: "Statistics", icon: BarChart2 },
              { id: "history", label: "History Log", icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition border ${
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

          {activeSubTab === "timer" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative min-h-[460px]">
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
                  <circle cx="128" cy="128" r={radius} className="stroke-slate-100 dark:stroke-zinc-800" strokeWidth="8" fill="none" />
                  {/* Progress Ring */}
                  <circle
                    cx="128" cy="128" r={radius}
                    className={`${
                      activeState.mode === "focus" 
                        ? "stroke-orange-500" 
                        : activeState.mode === "shortBreak" ? "stroke-emerald-500" : "stroke-blue-500"
                    }${activeState.isPaused ? " opacity-50" : ""} transition-all duration-1000 ease-linear`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-5xl font-black tracking-tight font-mono transition-colors ${
                      activeState.mode === "focus" 
                        ? "text-slate-900 dark:text-white" 
                        : activeState.mode === "shortBreak" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                    }`}>
                    {formatTime(remainingSeconds)}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {activeState.isPaused ? "Click to Start" : "Click to Pause"}
                  </div>
                </div>
              </div>

              {/* Controls */}
              {selectedPresetLabel && (
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center justify-center gap-1.5 opacity-60">
                  <AlarmClock className="w-3.5 h-3.5" /> {selectedPresetLabel}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={subMinute}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                  title="-1 Minute"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  onClick={activeState.isPaused ? startTimer : pauseTimer}
                  className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 ${
                    activeState.isPaused
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {activeState.isPaused ? <Play className="w-6 h-6 ml-1" /> : <Pause className="w-6 h-6" />}
                </button>

                <button
                  onClick={addMinute}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                  title="+1 Minute"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={resetTimer}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={skipSession}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  Skip
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

                    {activeSubTab === "settings" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <PomodoroSettingsPanel />
            </div>
          )}

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
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Sessions</span>
                  <div className="text-2xl font-black text-emerald-500 mt-1">{stats.sessionsCompletedToday} <span className="text-xs font-semibold text-slate-400">Done</span></div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-6">Weekly Focus Trend</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-zinc-800" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} className="text-slate-400 dark:text-zinc-500" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} className="text-slate-400 dark:text-zinc-500" />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="Focus Time" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Break Time" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "history" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
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
                    <option value="all">All Sessions</option>
                    <option value="completed">Completed</option>
                    <option value="interrupted">Interrupted</option>
                  </select>
                  <button onClick={exportHistory} className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition" title="Export CSV">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={clearHistory} className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition" title="Clear All">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                {history.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-500">No Pomodoro history yet.</p>
                  </div>
                ) : (
                  history.filter(item => {
                    const matchSearch = (item.lectureTitle?.toLowerCase() || "").includes(historySearch.toLowerCase()) || 
                                        (item.playlistTitle?.toLowerCase() || "").includes(historySearch.toLowerCase());
                    const matchFilter = historyFilter === "all" ? true : (historyFilter === "completed" ? item.completed : !item.completed);
                    return matchSearch && matchFilter;
                  }).map(item => (
                    <div key={item.id} className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${item.completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{item.date} • {item.startTime} - {item.endTime}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">
                          Focus: <span className="font-semibold text-slate-600 dark:text-zinc-400">{item.focusDuration}m</span> | 
                          Break: <span className="font-semibold text-slate-600 dark:text-zinc-400">{item.breakDuration}m</span>
                          {item.lectureTitle && ` | ${item.lectureTitle}`}
                        </div>
                      </div>
                      <button onClick={() => deleteHistory(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Snooze Overlay */}
      {isAlarmRinging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 animate-pulse" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Bell className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50">Session Complete!</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2">
                {selectedPresetLabel ? `Selected Preset: ${selectedPresetLabel}` : 'Time for your next step.'}
              </p>
              
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={() => stopAlarm()} 
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition text-sm"
                >
                  Stop Alarm
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => snoozeAlarm(1)} 
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition text-sm"
                  >
                    Snooze 1 min
                  </button>
                  <button 
                    onClick={() => { stopAlarm(); skipSession(); }} 
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition text-sm"
                  >
                    Skip 
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
