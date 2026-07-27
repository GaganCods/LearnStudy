import React from "react";
import { 
  Sparkles, Flame, Clock, BookOpen,
  TrendingUp, Plus, FileText, Timer, ArrowUpRight
} from "lucide-react";
import { Storage } from "../utils/storage";
import { ActiveTab } from "../types";

interface PersonalDashboardProps {
  setActiveTab?: (tab: ActiveTab) => void;
  userName?: string;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ 
  setActiveTab,
  userName
}) => {
  const stats = Storage.getStreakStats();
  const studyLogs = Storage.getStudyLogs();
  
  const totalSeconds = studyLogs.reduce((acc, l) => acc + (l.secondsStudied || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const totalMins = Math.round(totalSeconds / 60);
  const level = Math.floor(totalMins / 120) + 1;

  const plannerTargetHours = Number(localStorage.getItem("studytube_target_hours")) || 3;
  const plans = Storage.getStudyPlans();
  const completedPlans = plans.filter(p => p.completed && !p.skipped).length;
  const totalPlans = plans.filter(p => !p.skipped).length;

  const todayStr = new Date().toLocaleDateString("en-CA");
  const todaySeconds = studyLogs.filter(log => log.date === todayStr).reduce((acc, l) => acc + (l.secondsStudied || 0), 0);
  const todayHours = (todaySeconds / 3600).toFixed(1);
  const todayProgressPercent = plannerTargetHours > 0 ? Math.min(100, Math.round((todaySeconds / 3600) / plannerTargetHours * 100)) : 0;

  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  const daysStudiedThisWeek = stats.datesStudied.filter(dStr => {
    const d = new Date(dStr);
    return d >= oneWeekAgo && d <= now;
  }).length;

  const displayName = userName || "Scholar";

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] rounded-3xl p-6 md:p-8 text-slate-900 dark:text-[#F8F8F8] shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      {/* Soft radial glow with orange lighting */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-[#FF6A00]/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />
      
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-45" />

      {/* Lighting accent border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,106,0,0.2)] to-transparent" />

      <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start lg:items-center">
        {/* Left Section (Heading & Badges) - Col Span 8 */}
        <div className="space-y-4 lg:col-span-8 text-left w-full">
          {/* Workspace badge */}
          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] px-3 py-1 rounded-full text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6A00] fill-[#FF6A00]" />
            <span>LearnStudy Workspace</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8F8F8] leading-tight">
              Welcome back, <span className="text-[#FF6A00] font-black">{displayName}</span> 👋
            </h1>
            <div className="text-sm md:text-base text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
              Ready to continue today's study session?
              <p className="text-slate-500 dark:text-zinc-500 text-xs md:text-sm mt-1">
                Import lectures, review flashcards, track focus hours, and stay consistent.
              </p>
            </div>
          </div>
        </div>

        {/* Right Section Removed per user request */}
      </div>

      {/* 2 compact statistics glass cards with micro-visualizations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {/* Card 1: Streak */}
        <div className="bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 h-[110px] flex flex-col justify-between hover:-translate-y-1 hover:border-[#FF6A00]/40 hover:shadow-[0_4px_20px_rgba(255,106,0,0.08)] transition-all duration-250 group cursor-pointer shadow-xs dark:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Current Streak</span>
            <div className="p-1.5 bg-[#FF6A00]/10 rounded-lg text-[#FF6A00] group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4 fill-[#FF6A00]" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-left">
              <span className="text-2xl font-black text-slate-900 dark:text-[#F8F8F8] tracking-tight">{stats.current} {stats.current === 1 ? "Day" : "Days"}</span>
              <span className="text-[10px] text-[#22C55E] block mt-0.5 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                ↑ {daysStudiedThisWeek} {daysStudiedThisWeek === 1 ? "day" : "days"} this week
              </span>
            </div>
            
            {/* Heatmap Dots visualizer */}
            <div className="flex gap-1 mb-1 bg-white dark:bg-[#09090B]/85 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[rgba(255,255,255,0.03)] shrink-0">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${i < Math.min(stats.current, 7) || i < 4 ? "bg-[#FF6A00] shadow-[0_0_6px_rgba(255,106,0,0.4)]" : "bg-slate-300 dark:bg-zinc-800"}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Focus Hours */}
        <div 
          className="bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 h-[110px] flex flex-col justify-between hover:border-[#FF6A00]/40 transition-all duration-250 group shadow-xs dark:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Focus Hours</span>
            <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between w-full">
            <div className="w-full text-left">
              <div className="flex items-baseline justify-between w-full">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8F8F8] tracking-tight">{todayHours}h <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold">today</span></span>
                <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-extrabold bg-slate-200/70 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-300/50 dark:border-[rgba(255,255,255,0.03)]">Goal: {plannerTargetHours}h</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 block mt-0.5 font-bold flex items-center justify-between">
                <span>{todayProgressPercent}% reached • {totalHours}h total</span>
                {totalPlans > 0 ? (
                  <span className="text-[#FF6A00] font-extrabold text-[9px] uppercase tracking-wider">Tasks: {completedPlans}/{totalPlans}</span>
                ) : (
                  <span className="text-slate-400 dark:text-zinc-600 font-bold text-[9px] uppercase tracking-wider">No plans today</span>
                )}
              </span>
              {/* Mini progress bar */}
              <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-[#FF6A00] h-full rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(255,106,0,0.3)]" 
                  style={{ width: `${todayProgressPercent}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Horizontal Command Quick Actions Menu */}
      <div className="mt-8 border-t border-slate-200 dark:border-[rgba(255,255,255,0.06)] pt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Quick Commands</span>
          <div className="h-px bg-slate-200 dark:bg-[rgba(255,255,255,0.06)] flex-1" />
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              const input = document.getElementById("youtube-url-input");
              if (input) {
                input.focus();
                input.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            className="group relative flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#FF6A00]/40 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(255,106,0,0.12)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Import Playlist</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
          </button>

          <button
            onClick={() => setActiveTab?.("pdf")}
            className="group relative flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#FF6A00]/40 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(255,106,0,0.12)] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Open PDF</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
          </button>

          <button
            onClick={() => setActiveTab?.("library")}
            className="group relative flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#FF6A00]/40 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(255,106,0,0.12)] cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Course Library</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
          </button>

          <button
            onClick={() => setActiveTab?.("planner")}
            className="group relative flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#FF6A00]/40 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(255,106,0,0.12)] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>AI Planner</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
          </button>

          <button
            onClick={() => setActiveTab?.("pomodoro")}
            className="group relative flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#FF6A00]/40 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(255,106,0,0.12)] cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Focus Mode</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
