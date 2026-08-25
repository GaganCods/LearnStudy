import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Plus, 
  Sparkles, 
  AlertCircle,
  Trash2,
  Edit2,
  X,
  Circle,
  Check,
  PlusCircle,
  Award,
  HelpCircle
} from "lucide-react";
import { Storage } from "../utils/storage";
import { StudyPlanItem } from "../types";

// Helper to format Start and End time strings into human readable range string
const formatTimeRange = (start: string, end: string) => {
  if (!start || !end) return "Flexible Scheduled";
  
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const minute = parseInt(m);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = minute < 10 ? "0" + minute : minute;
    return `${displayHour}:${displayMinute} ${ampm}`;
  };

  try {
    return `${parseTime(start)} - ${parseTime(end)}`;
  } catch {
    return `${start} - ${end}`;
  }
};

// Helper to parse human readable time range or fallback to default start/end times
const parseTimeRange = (rangeStr: string) => {
  let start = "09:00";
  let end = "10:00";
  if (!rangeStr || rangeStr === "Flexible Scheduled") return { start, end };

  try {
    const parts = rangeStr.split("-");
    if (parts.length === 2) {
      const parseSingle = (s: string) => {
        const clean = s.trim().toUpperCase();
        const ampmMatch = clean.match(/(AM|PM)/);
        const ampm = ampmMatch ? ampmMatch[0] : "";
        const timePart = clean.replace(/(AM|PM)/, "").trim();
        const [h, m] = timePart.split(":");
        let hour = parseInt(h);
        const minute = parseInt(m) || 0;
        
        if (ampm === "PM" && hour < 12) {
          hour += 12;
        } else if (ampm === "AM" && hour === 12) {
          hour = 0;
        }
        
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(hour)}:${pad(minute)}`;
      };
      start = parseSingle(parts[0]);
      end = parseSingle(parts[1]);
    }
  } catch (e) {
    // Fallback if parsing fails
  }
  return { start, end };
};

export const StudyCalendar: React.FC = () => {
  // Navigation & Date States
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  });

  // Reload triggers
  const [reloadKey, setReloadKey] = useState(0);

  // Form states for adding new study block on the selected date
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Physics");
  const [newType, setNewType] = useState<"video" | "revision" | "quiz" | "assignment" | "other">("revision");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");

  // Editing state for existing tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("10:00");

  // Manual Log Form State
  const [manualMinutes, setManualMinutes] = useState("60");

  // Load real data from Storage
  const allPlans = useMemo(() => {
    return Storage.getStudyPlans();
  }, [reloadKey]);

  const studyLogs = useMemo(() => {
    return Storage.getStudyLogs();
  }, [reloadKey]);

  const stats = useMemo(() => {
    return Storage.getStreakStats();
  }, [reloadKey]);

  const dailyGoalMins = useMemo(() => {
    return Storage.getSettings().dailyGoalMinutes || 45;
  }, [reloadKey]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Padding of empty cells for preceding month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: null, studied: false, minutes: 0 });
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toLocaleDateString("en-CA");
      
      // Calculate total study seconds for this date
      const dateLogs = studyLogs.filter(l => l.date === dateStr);
      const totalSeconds = dateLogs.reduce((acc, curr) => acc + curr.secondsStudied, 0);
      const minutes = Math.round(totalSeconds / 60);
      
      // Considered "studied" if in streak dates (meets daily goal time or completed target tasks)
      const studied = stats.datesStudied.includes(dateStr); 

      days.push({ 
        dayNum: i, 
        dateStr, 
        studied,
        minutes
      });
    }
    
    return days;
  }, [year, month, studyLogs, stats]);

  // Get active selected date details
  const selectedDateObj = useMemo(() => {
    return new Date(selectedDateStr + "T00:00:00");
  }, [selectedDateStr]);

  const isUpcoming = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    return selectedDateStr > todayStr;
  }, [selectedDateStr]);

  const selectedDatePlans = useMemo(() => {
    return allPlans.filter(p => p.dueDate === selectedDateStr);
  }, [allPlans, selectedDateStr]);

  const selectedDateLogs = useMemo(() => {
    return studyLogs.filter(l => l.date === selectedDateStr);
  }, [studyLogs, selectedDateStr]);

  const selectedDateMinutes = useMemo(() => {
    const totalSecs = selectedDateLogs.reduce((sum, log) => sum + log.secondsStudied, 0);
    return Math.round(totalSecs / 60);
  }, [selectedDateLogs]);

  // Event handlers
  const handleToggleTask = (id: string) => {
    const p = allPlans.find(x => x.id === id);
    if (p) {
      p.completed = !p.completed;
      Storage.saveStudyPlan(p);
      setReloadKey(prev => prev + 1);
    }
  };

  const handleDeleteTask = (id: string) => {
    Storage.deleteStudyPlan(id);
    setReloadKey(prev => prev + 1);
  };

  const handleToggleSkipTask = (id: string) => {
    const p = allPlans.find(x => x.id === id);
    if (p) {
      p.skipped = !p.skipped;
      if (p.skipped) {
        p.completed = false;
      }
      Storage.saveStudyPlan(p);
      setReloadKey(prev => prev + 1);
    }
  };

  const handleSaveInlineEdit = (id: string) => {
    const p = allPlans.find(x => x.id === id);
    if (p) {
      p.title = editTitle;
      p.subject = editSubject;
      p.timeString = formatTimeRange(editStartTime, editEndTime);
      Storage.saveStudyPlan(p);
    }
    setEditingTaskId(null);
    setReloadKey(prev => prev + 1);
  };

  const handleStartEdit = (task: StudyPlanItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubject(task.subject);
    const parsed = parseTimeRange(task.timeString || "09:00 AM - 10:00 AM");
    setEditStartTime(parsed.start);
    setEditEndTime(parsed.end);
  };

  const handleReschedule = (task: StudyPlanItem) => {
    const targetDate = prompt("Enter new date for this task (YYYY-MM-DD format):", task.dueDate);
    if (targetDate) {
      // Validate format
      if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        task.dueDate = targetDate;
        Storage.saveStudyPlan(task);
        setReloadKey(prev => prev + 1);
      } else {
        alert("Invalid format! Please use YYYY-MM-DD format (e.g. 2026-07-25)");
      }
    }
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task: StudyPlanItem = {
      id: "sp_" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject.trim(),
      dueDate: selectedDateStr,
      priority: newPriority,
      type: newType,
      completed: false,
      createdAt: new Date().toISOString(),
      timeString: formatTimeRange(newStartTime, newEndTime)
    };

    Storage.saveStudyPlan(task);
    setNewTitle("");
    setShowAddForm(false);
    setReloadKey(prev => prev + 1);
  };

  // Toggle Studied status (sets exactly 60 minutes manual log, or removes all logs for that day)
  const handleToggleDayStudied = () => {
    if (isUpcoming) return;
    Storage.toggleDateStudied(selectedDateStr, 60);
    setReloadKey(prev => prev + 1);
  };

  // Log custom manual study duration on selected date
  const handleLogManualTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpcoming) return;
    const minutes = parseInt(manualMinutes);
    if (isNaN(minutes) || minutes <= 0) return;

    const currentLogs = Storage.getStudyLogs();
    
    // Add new custom log
    currentLogs.push({
      date: selectedDateStr,
      secondsStudied: minutes * 60,
      videoId: "manual_" + Date.now(),
      videoTitle: "Self-Reported Study Block"
    });

    Storage.saveStudyLogs(currentLogs);
    setReloadKey(prev => prev + 1);
    setManualMinutes("60");
  };

  const handleClearSelectedLogs = () => {
    const updated = studyLogs.filter(l => l.date !== selectedDateStr);
    Storage.saveStudyLogs(updated);
    setReloadKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 px-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wide mb-2">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            Study Timetable & Streak Consistency
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50">
            Interactive Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Build habits by scheduling custom lectures, editing milestones, and logging manual study hours to keep your streaks perfect.
          </p>
        </div>

        <button 
          onClick={() => {
            setShowAddForm(true);
            setNewTitle("");
          }}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Schedule Study Block
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Monthly Interactive Calendar & Streak Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                  {monthName} {year}
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  Click any cell to select a date & inspect or override daily plans.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 border border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-xl transition text-slate-600 dark:text-zinc-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 border border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-xl transition text-slate-600 dark:text-zinc-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 dark:text-zinc-500 mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Grid of Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {calendarDays.map((cell, idx) => {
                if (cell.dayNum === null) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 dark:bg-zinc-900/10 rounded-xl" />;
                }

                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === new Date().toLocaleDateString("en-CA");
                const hasLogsLogged = cell.minutes > 0;
                const meetsStreakTarget = cell.studied; // >= 60 minutes

                return (
                  <button
                    key={`day-${cell.dayNum}`}
                    onClick={() => setSelectedDateStr(cell.dateStr || "")}
                    className={`aspect-square relative rounded-xl flex flex-col items-center justify-between p-1.5 transition ${
                      isSelected 
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                        : meetsStreakTarget
                        ? "bg-emerald-500 text-white font-extrabold hover:bg-emerald-600"
                        : hasLogsLogged
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-850 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-100/40"
                        : "bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-850"
                    } ${isToday && !isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : ""}`}
                  >
                    <span className="text-[11px] font-black">{cell.dayNum}</span>

                    {/* Studied indicators */}
                    <div className="flex gap-0.5 justify-center items-center h-4">
                      {meetsStreakTarget ? (
                        <Flame className={`w-3.5 h-3.5 fill-current ${isSelected ? "text-white" : "text-amber-300"}`} />
                      ) : hasLogsLogged ? (
                        <span className={`text-[8px] font-extrabold leading-none ${isSelected ? "text-white" : "text-emerald-500"}`}>
                          {cell.minutes}m
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                <span>Goal Met (≥60m)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-850" />
                <span>Partial Study Block</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900" />
                <span>Rest Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded ring-2 ring-blue-500" />
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Quick Streak Consistency Tools */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-2xl shadow-md shrink-0">
                <Flame className="w-6 h-6 animate-pulse text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                  {stats.current} Day Study Streak
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Longest record: <span className="font-extrabold text-amber-500">{stats.longest} days</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed bg-white/60 dark:bg-zinc-900/40 p-4 rounded-2xl border border-amber-500/10">
              Your streak increases automatically when you log at least <strong>{dailyGoalMins} minutes</strong> of study time or complete all planned target tasks within any single calendar day. You can use the logs panel to edit, switch, or manually report hours for any date to fix accidental breaks.
            </p>
          </div>
        </div>

        {/* Right Column: Daily Schedule Details & Log Override Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Selected Date Header Details */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3.5">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Date Inspection
                </h2>
                <p className="text-lg font-black text-slate-900 dark:text-zinc-50 mt-1">
                  {selectedDateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Daily Logged Time
                </span>
                <p className={`text-xl font-black ${selectedDateMinutes >= dailyGoalMins ? "text-emerald-500" : selectedDateMinutes > 0 ? "text-amber-500" : "text-slate-400"}`}>
                  {selectedDateMinutes} min
                </p>
              </div>
            </div>

            {isUpcoming ? (
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-center space-y-1.5">
                <Flame className="w-5 h-5 text-amber-500 mx-auto animate-pulse" />
                <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200">Streak Locked for Future</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  You cannot complete streaks or log manual study hours for future dates. Complete tasks on their active day to build consistency!
                </p>
              </div>
            ) : (
              <>
                {/* Quick Toggle Studied Status Override */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-150 dark:border-zinc-850">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                      Streak Target ({dailyGoalMins}m)
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Toggle to quick-report a {dailyGoalMins}m studied block.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleDayStudied}
                    className={`py-2 px-4 rounded-xl text-xs font-extrabold text-center transition-all cursor-pointer ${
                      selectedDateMinutes >= dailyGoalMins || stats.datesStudied.includes(selectedDateStr)
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                    }`}
                  >
                    {selectedDateMinutes >= dailyGoalMins || stats.datesStudied.includes(selectedDateStr) ? "✓ Streak Valid" : "+ Toggle Studied"}
                  </button>
                </div>

                {/* Log Manual Time Hours Form */}
                <form onSubmit={handleLogManualTime} className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Log Custom Study Minutes
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      max="1440"
                      value={manualMinutes}
                      onChange={e => setManualMinutes(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl focus:outline-none"
                      placeholder="Minutes studied"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-black text-xs px-4 rounded-xl transition shrink-0"
                    >
                      Log Time
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Log Entries List */}
            {selectedDateLogs.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Logged Sessions
                  </span>
                  <button 
                    type="button"
                    onClick={handleClearSelectedLogs}
                    className="text-[10px] text-red-500 hover:underline font-bold"
                  >
                    Clear Logged Hours
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedDateLogs.map((log, idx) => (
                    <div 
                      key={idx}
                      className="text-xs bg-slate-50 dark:bg-zinc-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-850 flex items-center justify-between text-slate-700 dark:text-zinc-300"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-extrabold truncate block text-[11px]">{log.videoTitle}</span>
                        {log.videoId && (
                          <span className="text-[9px] text-slate-400 font-mono">ID: {log.videoId}</span>
                        )}
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        {Math.round(log.secondsStudied / 60)}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's study blocks on this selected date */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Target Schedule
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {selectedDatePlans.length} tasks
              </span>
            </div>

            {/* Add schedule block form inline */}
            {showAddForm && (
              <form onSubmit={handleAddBlock} className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-150 dark:border-zinc-850 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-300 uppercase tracking-wide">
                    New Study Block
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Solid State Physics Lecture 2"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Subject</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Time Duration</label>
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-1.5">
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={e => setNewStartTime(e.target.value)}
                        className="bg-transparent text-xs text-slate-900 dark:text-zinc-100 focus:outline-none w-full"
                      />
                      <span className="text-[10px] text-slate-400 font-bold px-0.5">to</span>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={e => setNewEndTime(e.target.value)}
                        className="bg-transparent text-xs text-slate-900 dark:text-zinc-100 focus:outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Priority</label>
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as any)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-2 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Type</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-2 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="video">Lecture Video</option>
                      <option value="revision">Revision Notes</option>
                      <option value="quiz">Quiz Practice</option>
                      <option value="assignment">Assignment</option>
                      <option value="other">General Study</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-sm"
                >
                  Create Plan Block
                </button>
              </form>
            )}

            {/* Scheduled list on selected date */}
            {selectedDatePlans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-zinc-950/30 rounded-2xl border border-dashed border-slate-150 dark:border-zinc-850 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-zinc-400">
                  No plans scheduled
                </h4>
                <p className="text-[10px] text-slate-400">
                  Create a custom scheduled study block or use the top AI Auto-Planner to build a template.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDatePlans.map((task) => {
                  const isEditing = editingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        task.completed 
                          ? "bg-slate-50 dark:bg-zinc-950/30 border-slate-200/60 opacity-60" 
                          : task.skipped
                          ? "border-dashed border-slate-200 bg-slate-50/20 opacity-50"
                          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 hover:border-amber-500/40"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-950 dark:text-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editSubject}
                              onChange={e => setEditSubject(e.target.value)}
                              className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-950 dark:text-white"
                              placeholder="Subject"
                            />
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5">
                              <input
                                type="time"
                                value={editStartTime}
                                onChange={e => setEditStartTime(e.target.value)}
                                className="bg-transparent text-[11px] text-slate-950 dark:text-white focus:outline-none w-full"
                              />
                              <span className="text-[9px] text-slate-400 font-bold px-0.5">to</span>
                              <input
                                type="time"
                                value={editEndTime}
                                onChange={e => setEditEndTime(e.target.value)}
                                className="bg-transparent text-[11px] text-slate-950 dark:text-white focus:outline-none w-full"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 mt-1">
                            <button
                              onClick={() => handleSaveInlineEdit(task.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-500 transition shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-500/10" />
                              ) : (
                                <Circle className="w-4.5 h-4.5 text-slate-300 dark:text-zinc-700" />
                              )}
                            </button>
                            
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold leading-snug ${task.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-zinc-50"}`}>
                                {task.title}
                              </h4>
                              
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {task.timeString && (
                                  <span className="text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {task.timeString}
                                  </span>
                                )}
                                <span className="text-[9px] font-bold bg-slate-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-500">
                                  {task.subject}
                                </span>
                                {task.skipped && (
                                  <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                                    Skipped
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Edit/Delete/Skip action items */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md text-slate-400 hover:text-slate-600 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleToggleSkipTask(task.id)}
                              className={`p-1 rounded-md transition text-[9px] font-bold ${task.skipped ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:text-slate-600"}`}
                              title={task.skipped ? "Unskip" : "Skip task"}
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => handleReschedule(task)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md text-slate-400 hover:text-slate-600 text-[9px] font-bold"
                              title="Reschedule Date"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 rounded-md text-slate-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
