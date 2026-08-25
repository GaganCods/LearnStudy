import React, { useState, useEffect, useMemo } from "react";
import { Storage } from "../utils/storage";
import { Calendar, Flame, Clock, Play, Award, BarChart2 } from "lucide-react";

export function StudyStats() {
  const [logs, setLogs] = useState(() => Storage.getStudyLogs());
  const [dailyGoalMins, setDailyGoalMins] = useState(() => Storage.getSettings().dailyGoalMinutes || 45);

  useEffect(() => {
    const handleUpdate = () => {
      setLogs(Storage.getStudyLogs());
      setDailyGoalMins(Storage.getSettings().dailyGoalMinutes || 45);
    };
    window.addEventListener("studytube_logs_updated", handleUpdate);
    window.addEventListener("studytube_settings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("studytube_logs_updated", handleUpdate);
      window.removeEventListener("studytube_settings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const streakStats = useMemo(() => Storage.getStreakStats(), [logs]);

  // Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    
    // Total Studied
    let totalSeconds = 0;
    let todaySeconds = 0;
    let thisWeekSeconds = 0;
    
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    logs.forEach((log) => {
      totalSeconds += log.secondsStudied;
      if (log.date === todayStr) {
        todaySeconds += log.secondsStudied;
      }
      
      const logDate = new Date(log.date);
      if (logDate >= oneWeekAgo && logDate <= now) {
        thisWeekSeconds += log.secondsStudied;
      }
    });

    const uniqueVideos = new Set(logs.map((l) => l.videoId)).size;

    return {
      totalHours: (totalSeconds / 3600).toFixed(1),
      todayHours: (todaySeconds / 3600).toFixed(1),
      todayMinutes: Math.round((todaySeconds % 3600) / 60),
      weekHours: (thisWeekSeconds / 3600).toFixed(1),
      uniqueVideos,
      totalSessions: logs.length,
      averageSessionMins: logs.length ? Math.round((totalSeconds / logs.length) / 60) : 0,
    };
  }, [logs]);

  // Generate 7 Days Bar Chart
  const chartData = useMemo(() => {
    const data = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      const dayName = days[d.getDay()];
      
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const seconds = dayLogs.reduce((acc, curr) => acc + curr.secondsStudied, 0);
      const minutes = Math.round(seconds / 60);
      
      data.push({
        day: dayName,
        date: dateStr.substring(8), // just DD
        minutes,
      });
    }
    return data;
  }, [logs]);

  // Max minutes in the last 7 days for chart scaling
  const maxMins = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.minutes), 30); // default minimum scaling at 30 min
    return Math.ceil(max / 10) * 10;
  }, [chartData]);

  // Generate Calendar Days for Current Month
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Padding for empty space of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: "", dateStr: "", studied: false });
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toLocaleDateString("en-CA");
      const studied = streakStats.datesStudied.includes(dateStr);
      days.push({ dayNum: i, dateStr, studied });
    }
    
    return days;
  }, [streakStats]);

  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6" id="stats-dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Award className="text-amber-500 w-8 h-8" />
            Study Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Track your study streaks, log notes, and observe daily productivity insights.
          </p>
        </div>
        
        {/* Streak indicators */}
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 dark:bg-orange-950/40 p-2.5 rounded-xl">
              <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider">Current Streak</div>
              <div className="text-2xl font-bold text-slate-950 dark:text-zinc-50 flex items-baseline gap-1">
                {streakStats.current} <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">days</span>
              </div>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-800" />
          <div>
            <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider">Longest Streak</div>
            <div className="text-2xl font-bold text-slate-950 dark:text-zinc-50 flex items-baseline gap-1">
              {streakStats.longest} <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
            <span className="text-sm font-medium">Today's Focus</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold mt-2 text-slate-950 dark:text-zinc-50">
            {stats.todayMinutes > 0 ? (
              <>
                {stats.todayMinutes} <span className="text-base font-normal text-slate-500 dark:text-zinc-400">mins</span>
              </>
            ) : (
              <>
                0 <span className="text-base font-normal text-slate-500 dark:text-zinc-400">mins</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Target: {dailyGoalMins} mins daily
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
            <span className="text-sm font-medium">Past 7 Days</span>
            <BarChart2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold mt-2 text-slate-950 dark:text-zinc-50">
            {stats.weekHours} <span className="text-base font-normal text-slate-500 dark:text-zinc-400">hours</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Weekly study sessions cumulative
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
            <span className="text-sm font-medium">Average Session</span>
            <Play className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold mt-2 text-slate-950 dark:text-zinc-50">
            {stats.averageSessionMins} <span className="text-base font-normal text-slate-500 dark:text-zinc-400">mins</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Across {stats.totalSessions} sessions logged
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
            <span className="text-sm font-medium">Lectures Opened</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold mt-2 text-slate-950 dark:text-zinc-50">
            {stats.uniqueVideos} <span className="text-base font-normal text-slate-500 dark:text-zinc-400">videos</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Distinct learning resources
          </div>
        </div>
      </div>

      {/* Main Charts block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 7-Day Custom SVG Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-zinc-50">Weekly Progress</h2>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Study minutes logged in the last 7 days.</p>
          </div>

          {/* SVG Custom Bar Chart */}
          <div className="relative mt-8 h-56 w-full flex items-end justify-between px-2">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none">
              <div className="w-full border-b border-dashed border-slate-100 dark:border-zinc-800/60 h-0" />
              <div className="w-full border-b border-dashed border-slate-100 dark:border-zinc-800/60 h-0" />
              <div className="w-full border-b border-dashed border-slate-100 dark:border-zinc-800/60 h-0" />
              <div className="w-full border-b border-slate-100 dark:border-zinc-800 h-0" />
            </div>

            {/* Y Axis labels inside chart */}
            <div className="absolute left-1 top-1 text-[10px] text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-zinc-850">
              Max: {maxMins} mins
            </div>

            {/* Bars */}
            {chartData.map((d, index) => {
              const heightPercent = maxMins > 0 ? (d.minutes / maxMins) * 100 : 0;
              const barHeight = Math.max(heightPercent, 2); // minimum height to show a pixel or two
              return (
                <div key={index} className="flex flex-col items-center flex-1 group z-10">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition duration-150 absolute bottom-full mb-10 bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-semibold px-2 py-1 rounded shadow-md pointer-events-none">
                    {d.minutes} mins
                  </div>
                  
                  {/* The bar */}
                  <div className="w-8 md:w-10 rounded-t-lg bg-slate-100 dark:bg-zinc-800 overflow-hidden h-40 flex items-end">
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        d.minutes > 0
                          ? "bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-400"
                          : "bg-transparent"
                      }`}
                    />
                  </div>
                  
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-2.5">
                    {d.day}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium mt-0.5">
                    {d.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak Calendar Tracker */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950 dark:text-zinc-50">Streak Calendar</h2>
              <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2.5 py-1 rounded-full font-semibold">
                {monthName}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Days marked green when daily target of {dailyGoalMins} minutes (or target tasks) is achieved.</p>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
              <span key={idx} className="font-semibold text-slate-400 dark:text-zinc-500 mb-2">
                {day}
              </span>
            ))}
            
            {calendarDays.map((cell, idx) => {
              if (cell.dayNum === "") {
                return <div key={idx} className="aspect-square" />;
              }

              const isToday = new Date().getDate() === cell.dayNum && new Date().getMonth() === new Date().getMonth();

              return (
                <div
                  key={idx}
                  title={cell.dateStr}
                  className={`aspect-square flex items-center justify-center rounded-xl text-xs font-semibold relative transition ${
                    cell.studied
                      ? "bg-emerald-500 text-white"
                      : isToday
                      ? "border-2 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "bg-slate-50 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cell.dayNum}
                  {cell.studied && (
                    <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium">
              <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
              <span>Studied</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium">
              <div className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700" />
              <span>Rest Day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
