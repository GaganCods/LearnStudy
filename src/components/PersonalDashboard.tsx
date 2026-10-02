import React, { useState, useEffect } from "react";
import { 
  Sparkles, Flame, Plus, PlusCircle, FilePlus, Layers, Target, ChevronRight, Calendar, Clock, Folder, Play, Send
} from "lucide-react";
import { Storage } from "../utils/storage";
import { ActiveTab, StudySettings } from "../types";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";

interface PersonalDashboardProps {
  setActiveTab?: (tab: ActiveTab) => void;
  userName?: string;
  settings?: StudySettings;
  onResumeSession?: (id: string, type: "playlist" | "video") => void;
  showRecentMaterials?: boolean;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ 
  setActiveTab,
  userName,
  settings,
  onResumeSession,
  showRecentMaterials = false
}) => {
  const [stats, setStats] = useState(() => Storage.getStreakStats());
  const [studyLogs, setStudyLogs] = useState(() => Storage.getStudyLogs());
  const [plans, setPlans] = useState(() => Storage.getStudyPlans());
  const [playlists, setPlaylists] = useState(() => Storage.getPlaylists());
  const [singleVideos, setSingleVideos] = useState(() => Storage.getSingleVideos());
  const [currentSettings, setCurrentSettings] = useState<StudySettings>(() => settings || Storage.getSettings());

  useEffect(() => {
    if (settings) {
      setCurrentSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    const handleUpdate = () => {
      setStats(Storage.getStreakStats());
      setStudyLogs(Storage.getStudyLogs());
      setPlans(Storage.getStudyPlans());
      setPlaylists(Storage.getPlaylists());
      setSingleVideos(Storage.getSingleVideos());
      setCurrentSettings(Storage.getSettings());
    };

    window.addEventListener("studytube_logs_updated", handleUpdate);
    window.addEventListener("studytube_settings_updated", handleUpdate);
    window.addEventListener("studytube_playlists_updated", handleUpdate);
    window.addEventListener("studytube_single_videos_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("studytube_logs_updated", handleUpdate);
      window.removeEventListener("studytube_settings_updated", handleUpdate);
      window.removeEventListener("studytube_playlists_updated", handleUpdate);
      window.removeEventListener("studytube_single_videos_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);
  
  const totalSeconds = studyLogs.reduce((acc, l) => acc + (l.secondsStudied || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const dailyGoalMins = currentSettings?.dailyGoalMinutes || Storage.getSettings().dailyGoalMinutes || 45;
  const targetGoalHours = (dailyGoalMins / 60).toFixed(1).replace(/\.0$/, "");

  const todayStr = new Date().toLocaleDateString("en-CA");
  const todaySeconds = studyLogs.filter(log => log.date === todayStr).reduce((acc, l) => acc + (l.secondsStudied || 0), 0);
  const todayHours = (todaySeconds / 3600).toFixed(1);

  const todayPlans = plans.filter(p => !p.skipped && p.dueDate === todayStr);
  const completedPlans = todayPlans.length > 0 
    ? todayPlans.filter(p => p.completed).length
    : plans.filter(p => p.completed && !p.skipped).length;
  const totalPlans = todayPlans.length > 0 
    ? todayPlans.length
    : plans.filter(p => !p.skipped).length || 1;

  const allVideos = [
    ...singleVideos,
    ...playlists.flatMap(p => p.videos || [])
  ];
  const totalVideosCount = allVideos.length;
  const completedVideosCount = allVideos.filter(v => v.completed || (v.progress && v.progress >= 90)).length;
  const overallCompletionRate = totalVideosCount > 0
    ? Math.min(100, Math.round(allVideos.reduce((acc, v) => acc + (v.progress || 0), 0) / totalVideosCount))
    : 0;

  const todayProgressPercent = dailyGoalMins > 0
    ? Math.min(100, Math.round((todaySeconds / (dailyGoalMins * 60)) * 100))
    : 0;
  const taskPercent = totalPlans > 0 ? Math.min(100, Math.round((completedPlans / totalPlans) * 100)) : 0;

  const { currentUser } = useAuth();

  // Real completion rate calculation: average course progress if courses exist, otherwise today's study goal progress
  const completionRate = totalVideosCount > 0 ? overallCompletionRate : todayProgressPercent;

  const displayName = currentUser?.displayName || userName || currentSettings?.userName || "Scholar";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleImportClick = () => {
    const el = document.getElementById("import-study-container") || document.getElementById("youtube-url-input");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = document.getElementById("youtube-url-input") as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 500);
      }
    } else {
      setActiveTab?.("home");
      setTimeout(() => {
        const el2 = document.getElementById("import-study-container") || document.getElementById("youtube-url-input");
        if (el2) {
          el2.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-[#F8F8F8] animate-in fade-in duration-300 text-left pb-6">
      
      {/* 1. Top Hero Card */}
      <div className="relative overflow-hidden p-5 sm:p-7 rounded-[2rem] bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/40 dark:from-[#13141a]/95 dark:via-[#0e0f14]/95 dark:to-[#161826]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300">
        {/* Subtle Ambient Atmosphere Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-gradient-to-tr from-purple-500/5 to-transparent blur-2xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Avatar + Welcome text */}
          <div className="flex items-center gap-4.5 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                userName={displayName}
                customAvatarUrl={currentUser?.photoURL || currentSettings?.userAvatarUrl}
                customSeed={currentSettings?.userAvatarSeed}
                customStyle={currentSettings?.userAvatarStyle}
                size="lg"
                showStatusIndicator={true}
                onClick={() => setActiveTab?.("settings")}
                className="cursor-pointer hover:scale-105 transition-transform duration-300 ring-4 ring-blue-500/20 dark:ring-blue-400/20 shadow-md"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {getGreeting()},
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                  Learner Pro
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-[27px] font-black tracking-tight uppercase mt-0.5 truncate leading-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 dark:from-orange-400 dark:via-amber-300 dark:to-amber-400 bg-clip-text text-transparent drop-shadow-xs">
                  {displayName}
                </span>
                <span className="text-slate-900 dark:text-white">👋</span>
              </h1>
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>Let's make today productive & distraction-free.</span>
              </p>
            </div>
          </div>

          {/* Hero Stat Cards */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            {/* Current Streak Box */}
            <div 
              onClick={() => setActiveTab?.("stats")}
              className="p-3.5 sm:p-4 bg-white/80 dark:bg-[#181822]/80 hover:bg-white dark:hover:bg-[#1d1d2b] border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group shadow-xs hover:shadow-md active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-200">
                <Flame className="w-5 h-5 fill-amber-500" />
              </div>
              <div className="min-w-0 pr-1">
                <span className="text-base font-black text-slate-900 dark:text-white block leading-tight truncate">
                  {stats.current} {stats.current === 1 ? "Day" : "Days"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight block mt-0.5">
                  Current Streak
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </div>

            {/* Completion Rate Box (Real Data) */}
            <div 
              onClick={() => setActiveTab?.("stats")}
              className="p-3.5 sm:p-4 bg-white/80 dark:bg-[#181822]/80 hover:bg-white dark:hover:bg-[#1d1d2b] border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-emerald-500/40 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group shadow-xs hover:shadow-md active:scale-[0.98]"
            >
              <div className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-zinc-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 dark:text-emerald-400 transition-all duration-500"
                    strokeDasharray={`${completionRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
              <div className="min-w-0 pr-1">
                <span className="text-base font-black text-slate-900 dark:text-white block leading-tight truncate">
                  {completionRate}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight block mt-0.5">
                  Completion Rate
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Import Lectures Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 dark:bg-[#0c1527] border border-blue-200/80 dark:border-blue-800/50 shadow-sm flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 shrink-0 flex items-center justify-center">
            <FilePlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              Import Lectures
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 truncate mt-0.5">
              Add YouTube playlists, audio, or study materials
            </p>
          </div>
        </div>

        <button
          onClick={handleImportClick}
          className="relative group overflow-hidden rounded-full px-5 py-2.5 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-white tracking-wide transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.55)] active:scale-[0.97] hover:scale-[1.02] flex items-center gap-2 shrink-0 border border-white/30 dark:border-white/35 bg-gradient-to-r from-[#2563eb] via-[#6366f1] to-[#a855f7] dark:from-[#3b82f6] dark:via-[#6366f1] dark:to-[#c084fc]"
          aria-label="Get Started with Lecture Import"
        >
          {/* Ambient soft glow highlights inspired by the image */}
          <span className="absolute -top-3 -left-3 w-10 h-10 bg-cyan-300/40 dark:bg-cyan-300/50 rounded-full blur-md group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
          <span className="absolute -bottom-3 -right-3 w-10 h-10 bg-pink-400/40 dark:bg-fuchsia-400/50 rounded-full blur-md group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
          <span className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent rounded-full pointer-events-none" />
          
          <span className="relative z-10 font-bold">Get Started</span>
          <Send className="w-3.5 h-3.5 fill-white text-white relative z-10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* 3. TODAY'S PROGRESS Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-zinc-500 uppercase tracking-widest block">
            TODAY'S PROGRESS
          </div>
          <button 
            onClick={() => setActiveTab?.("stats")}
            className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>View Analytics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Card 1: Focus Hours */}
          <div 
            onClick={() => setActiveTab?.("stats")}
            className="p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#13141c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 flex flex-col justify-between min-h-[125px] sm:min-h-[155px] min-w-0 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-sm font-bold text-slate-700 dark:text-zinc-200 truncate">Focus Hours</span>
              <div className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-0.5 sm:gap-1.5 truncate">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white">{todayHours}h</span>
                <span className="text-[9px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold truncate">/ {targetGoalHours}h</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-1.5 sm:h-2 rounded-full overflow-hidden mt-1 sm:mt-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${todayProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold pt-0.5 sm:pt-1">
              <span className="font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-0.5">
                <span>{todayProgressPercent}%</span>
                <span className="text-[8px] sm:text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-tight">done</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium text-[8px] sm:text-[11px] truncate">{totalHours}h all</span>
            </div>
          </div>

          {/* Card 2: Tasks */}
          <div 
            onClick={() => setActiveTab?.("planner")}
            className="p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#13141c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md hover:border-purple-500/40 dark:hover:border-purple-500/40 flex flex-col justify-between min-h-[125px] sm:min-h-[155px] min-w-0 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-sm font-bold text-slate-700 dark:text-zinc-200 truncate">Tasks</span>
              <div className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-110 transition-transform duration-200">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-0.5 sm:gap-1.5 truncate">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white">{completedPlans}</span>
                <span className="text-[9px] sm:text-xs text-slate-500 dark:text-zinc-400 font-bold truncate">/ {totalPlans}</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-1.5 sm:h-2 rounded-full overflow-hidden mt-1 sm:mt-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${taskPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] sm:text-xs pt-0.5 sm:pt-1">
              <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                <span>{taskPercent}%</span>
                <span className="text-[8px] sm:text-[10px] font-semibold text-purple-500/80 dark:text-purple-300/80 uppercase tracking-tight">done</span>
              </span>
              <span className="text-slate-400 dark:text-zinc-500 text-[8px] sm:text-[11px] truncate">
                {totalPlans - completedPlans} left
              </span>
            </div>
          </div>

          {/* Card 3: Study Streak */}
          <div 
            onClick={() => setActiveTab?.("stats")}
            className="p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#13141c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md hover:border-amber-500/40 dark:hover:border-amber-500/40 flex flex-col justify-between min-h-[125px] sm:min-h-[155px] min-w-0 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-sm font-bold text-slate-700 dark:text-zinc-200 truncate">Streak</span>
              <div className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-500 shrink-0 group-hover:scale-110 transition-transform duration-200">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500" />
              </div>
            </div>

            <div className="my-1 sm:my-2">
              <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-0.5 sm:px-1 mb-1 sm:mb-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="flex items-center justify-between px-0.5 sm:px-1">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const isToday = (new Date().getDay() + 6) % 7 === i;
                  const isActive = isToday || i < stats.current;
                  return (
                    <div 
                      key={i}
                      className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                        isActive 
                          ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] scale-110" 
                          : "bg-slate-200 dark:bg-zinc-800"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 sm:pt-1">
              <span className="text-[10px] sm:text-sm font-black text-amber-500 block leading-tight truncate">
                {stats.current} {stats.current === 1 ? "Day" : "Days"}
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-amber-500/80 dark:text-amber-400/80 uppercase tracking-tight block truncate">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. QUICK ACTIONS Section */}
      <div>
        <div className="text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3 block">
          QUICK ACTIONS
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Add Lecture */}
          <button
            onClick={() => setActiveTab?.("study")}
            className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/[0.07] via-white to-blue-500/[0.02] dark:from-blue-950/30 dark:via-[#111218] dark:to-blue-900/10 border border-blue-200/60 dark:border-blue-500/20 shadow-[0_2px_14px_-2px_rgba(59,130,246,0.06)] dark:shadow-none hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:shadow-md transition-all duration-200 text-center sm:text-left group cursor-pointer active:scale-[0.98] flex flex-col items-center sm:items-start justify-center sm:justify-between min-h-[100px] sm:min-h-[110px]"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs">
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Add Lecture
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-2">
              Import content to study
            </p>
          </button>

          {/* Card 2: Flashcards */}
          <button
            onClick={() => setActiveTab?.("flashcards")}
            className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500/[0.07] via-white to-emerald-500/[0.02] dark:from-emerald-950/30 dark:via-[#111218] dark:to-emerald-900/10 border border-emerald-200/60 dark:border-emerald-500/20 shadow-[0_2px_14px_-2px_rgba(16,185,129,0.06)] dark:shadow-none hover:border-emerald-500/50 dark:hover:border-emerald-400/50 hover:shadow-md transition-all duration-200 text-center sm:text-left group cursor-pointer active:scale-[0.98] flex flex-col items-center sm:items-start justify-center sm:justify-between min-h-[100px] sm:min-h-[110px]"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Flashcards
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-2">
              Review & practice
            </p>
          </button>

          {/* Card 3: Study Calendar */}
          <button
            onClick={() => setActiveTab?.("calendar")}
            className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/[0.07] via-white to-amber-500/[0.02] dark:from-amber-950/30 dark:via-[#111218] dark:to-amber-900/10 border border-amber-200/60 dark:border-amber-500/20 shadow-[0_2px_14px_-2px_rgba(245,158,11,0.06)] dark:shadow-none hover:border-amber-500/50 dark:hover:border-amber-400/50 hover:shadow-md transition-all duration-200 text-center sm:text-left group cursor-pointer active:scale-[0.98] flex flex-col items-center sm:items-start justify-center sm:justify-between min-h-[100px] sm:min-h-[110px]"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Study Calendar
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-2">
              Plan your study
            </p>
          </button>

          {/* Card 4: Focus Session */}
          <button
            onClick={() => setActiveTab?.("pomodoro")}
            className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/[0.07] via-white to-purple-500/[0.02] dark:from-purple-950/30 dark:via-[#111218] dark:to-purple-900/10 border border-purple-200/60 dark:border-purple-500/20 shadow-[0_2px_14px_-2px_rgba(168,85,247,0.06)] dark:shadow-none hover:border-purple-500/50 dark:hover:border-purple-400/50 hover:shadow-md transition-all duration-200 text-center sm:text-left group cursor-pointer active:scale-[0.98] flex flex-col items-center sm:items-start justify-center sm:justify-between min-h-[100px] sm:min-h-[110px]"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs">
                <Target className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Focus Session
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-2">
              Start a session
            </p>
          </button>
        </div>
      </div>

      {/* 5. RECENT MATERIALS Section (Optional) */}
      {showRecentMaterials && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
              RECENT MATERIALS
            </span>
            <button 
              onClick={() => setActiveTab?.("library")}
              className="text-xs font-bold text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
            >
              View all
            </button>
          </div>

          {playlists.length === 0 && singleVideos.length === 0 ? (
            <div 
              onClick={() => setActiveTab?.("library")}
              className="p-4 rounded-2xl bg-white dark:bg-[#111217] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] shadow-xs dark:shadow-none hover:border-slate-300 dark:hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-500 shrink-0 flex items-center justify-center">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    No recent materials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    Import lectures or courses to get started.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {playlists.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onResumeSession) onResumeSession(p.id, "playlist");
                    else setActiveTab?.("study");
                  }}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111217] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] hover:border-blue-500/50 flex items-center justify-between gap-3 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 relative">
                      <img src={p.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                        {p.totalVideos} lectures • {p.channelName}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

