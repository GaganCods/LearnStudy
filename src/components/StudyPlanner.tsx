import React, { useState, useEffect, useMemo } from "react";
import { StudyPlanItem } from "../types";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  Target, 
  TrendingUp,
  MoreVertical,
  Check,
  Coffee,
  Youtube,
  FileText,
  AlertCircle,
  Brain,
  ChevronRight,
  ChevronLeft,
  X,
  Edit2,
  CalendarDays,
  Activity,
  UserCheck,
  Settings
} from "lucide-react";

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

export function StudyPlanner() {
  const { toast } = useToast();
  // Primary state loaded from Storage
  const [plans, setPlans] = useState<StudyPlanItem[]>(() => Storage.getStudyPlans());
  const [examName, setExamName] = useState(() => localStorage.getItem("studytube_exam_name") || "Fall Semester Midterms");
  const [examDate, setExamDate] = useState(() => localStorage.getItem("studytube_exam_date") || "In 18 Days");
  const [targetHours, setTargetHours] = useState(() => {
    const savedMins = Storage.getSettings().dailyGoalMinutes;
    if (savedMins) return Math.max(1, Math.round(savedMins / 60));
    return Number(localStorage.getItem("studytube_target_hours")) || 3;
  });

  const updatePlannerTargetHours = (hours: number) => {
    const val = Math.max(1, Math.min(24, hours));
    setTargetHours(val);
    localStorage.setItem("studytube_target_hours", String(val));
    const settings = Storage.getSettings();
    settings.dailyGoalMinutes = val * 60;
    Storage.saveSettings(settings);
  };

  // Manual Task Creation State (Hidden by default)
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Physics");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newType, setNewType] = useState<"video" | "revision" | "quiz" | "assignment" | "other">("revision");

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("10:00");

  // Quick Action Menu State
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [showClearPlansModal, setShowClearPlansModal] = useState(false);

  // --- AI Planning Wizard Multi-Step States ---
  const [wizardStep, setWizardStep] = useState<number>(0); // 0 = closed, 1-9 = active wizard steps
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  // Wizard Questions Answers
  const [studyTime, setStudyTime] = useState<number>(4);
  const [subjects, setSubjects] = useState<string[]>(["Physics", "Chemistry", "Mathematics"]);
  const [newCustomSubject, setNewCustomSubject] = useState("");
  const [focus, setFocus] = useState<string>("Revision");
  const [hasExam, setHasExam] = useState<boolean>(false);
  const [wizardExamName, setWizardExamName] = useState("");
  const [wizardExamDate, setWizardExamDate] = useState("");
  const [energyLevel, setEnergyLevel] = useState<string>("Normal");
  const [includeResources, setIncludeResources] = useState<boolean>(true);
  const [breakDuration, setBreakDuration] = useState<number>(10);
  const [pomodoroStyle, setPomodoroStyle] = useState<string>("50/10");

  // Load real resources from storage for Wizard Step 7
  const resourceCounts = useMemo(() => {
    let pendingLectures = 0;
    try {
      const playlists = Storage.getPlaylists();
      const singleVideos = Storage.getSingleVideos();
      playlists.forEach(p => {
        p.videos.forEach(v => {
          if (!v.completed && v.progress < 100) pendingLectures++;
        });
      });
      singleVideos.forEach(v => {
        if (!v.completed && v.progress < 100) pendingLectures++;
      });
    } catch (e) {
      console.error(e);
    }

    let assignments = 0;
    try {
      assignments = Storage.getStudyPlans().filter(p => p.type === "assignment" && !p.completed).length;
    } catch (e) {
      console.error(e);
    }

    let practiceSets = 0;
    try {
      practiceSets = Storage.getFlashcards().length;
    } catch (e) {
      console.error(e);
    }

    return {
      pendingLectures,
      assignments,
      practiceSets
    };
  }, [plans]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuTaskId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Timer simulation for Loading Steps
  useEffect(() => {
    if (!isGenerating) return;

    if (loadingStepIdx < 5) {
      const timer = setTimeout(() => {
        setLoadingStepIdx(prev => prev + 1);
      }, 650);
      return () => clearTimeout(timer);
    } else {
      // Finished simulation - generate the plan & save
      const timer = setTimeout(() => {
        const generated = generatePlan();
        
        // Save to Storage & React state
        generated.forEach(task => Storage.saveStudyPlan(task));
        const updatedPlans = Storage.getStudyPlans();
        setPlans(updatedPlans);

        // Update target hours and exam milestone if set
        updatePlannerTargetHours(studyTime);

        if (hasExam && wizardExamName.trim()) {
          localStorage.setItem("studytube_exam_name", wizardExamName.trim());
          setExamName(wizardExamName.trim());
          if (wizardExamDate) {
            localStorage.setItem("studytube_exam_date", wizardExamDate);
            setExamDate(wizardExamDate);
          }
        }

        // Close Wizard & reset loading state
        setIsGenerating(false);
        setLoadingStepIdx(0);
        setWizardStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, loadingStepIdx]);

  // Schedule generator algorithm (Smart Integration)
  const generatePlan = () => {
    const generatedTasks: StudyPlanItem[] = [];
    const selectedSubs = subjects.length > 0 ? subjects : ["General Studies"];
    
    // Calculate block durations based on Pomodoro style
    let studyBlockMinutes = 50;
    let breakBlockMinutes = 10;
    if (pomodoroStyle === "25/5") {
      studyBlockMinutes = 25;
      breakBlockMinutes = 5;
    } else if (pomodoroStyle === "Custom") {
      studyBlockMinutes = 45;
      breakBlockMinutes = breakDuration;
    } else {
      studyBlockMinutes = 50;
      breakBlockMinutes = breakDuration;
    }

    // Detect real resources if included
    let pendingLecturesList: { title: string; channel: string }[] = [];
    
    if (includeResources) {
      try {
        const playlists = Storage.getPlaylists();
        const singleVideos = Storage.getSingleVideos();
        playlists.forEach(p => {
          p.videos.forEach(v => {
            if (!v.completed && v.progress < 100) {
              pendingLecturesList.push({ title: v.title, channel: p.title || p.channelName });
            }
          });
        });
        singleVideos.forEach(v => {
          if (!v.completed && v.progress < 100) {
            pendingLecturesList.push({ title: v.title, channel: v.channelName });
          }
        });
      } catch (e) {
        console.error("Failed to parse integrated LearnStudy resources", e);
      }
    }

    // Starting study plan at 09:00 AM
    let currentHour = 9;
    let currentMinute = 0;

    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? "PM" : "AM";
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const padMin = m.toString().padStart(2, "0");
      return `${displayHour.toString().padStart(2, "0")}:${padMin} ${period}`;
    };

    const addMinutes = (h: number, m: number, minsToAdd: number) => {
      let newM = m + minsToAdd;
      let newH = h + Math.floor(newM / 60);
      newM = newM % 60;
      newH = newH % 24;
      return [newH, newM];
    };

    const totalMinutes = studyTime * 60;
    let allocatedMinutes = 0;
    let blockIndex = 1;
    let subjectIndex = 0;

    while (allocatedMinutes < totalMinutes) {
      // 1. Add Study Block
      const startStr = formatTime(currentHour, currentMinute);
      const [endH, endM] = addMinutes(currentHour, currentMinute, studyBlockMinutes);
      const endStr = formatTime(endH, endM);
      const timeString = `${startStr} - ${endStr}`;

      const currentSubject = selectedSubs[subjectIndex % selectedSubs.length];
      
      // Choose dynamic task content
      let taskTitle = "";
      let taskType: "video" | "revision" | "quiz" | "assignment" | "other" = "revision";

      if (focus === "Finish Lectures" && pendingLecturesList.length > 0) {
        const lecture = pendingLecturesList.shift()!;
        taskTitle = `Lecture: ${lecture.title}`;
        taskType = "video";
      } else {
        // General focus generation
        const sub = currentSubject;
        if (focus === "Finish Lectures") {
          taskTitle = `Watch online lectures & complete core notes for ${sub}`;
          taskType = "video";
        } else if (focus === "Practice Questions") {
          taskTitle = `Solve 20 high-yield practice questions on ${sub}`;
          taskType = "quiz";
        } else if (focus === "Revision") {
          taskTitle = `Revise textbook chapter and formulas for ${sub}`;
          taskType = "revision";
        } else if (focus === "Mock Test") {
          taskTitle = `Attempt simulation test on ${sub} weak topics`;
          taskType = "quiz";
        } else if (focus === "Assignment") {
          taskTitle = `Draft assignment solutions for ${sub}`;
          taskType = "assignment";
        } else {
          taskTitle = `Active recall study session on ${sub}`;
          taskType = "other";
        }
      }

      generatedTasks.push({
        id: `ai_task_${Date.now()}_${blockIndex}`,
        title: taskTitle,
        subject: currentSubject,
        dueDate: new Date().toISOString().split("T")[0],
        priority: blockIndex % 3 === 0 ? "high" : blockIndex % 2 === 0 ? "medium" : "low",
        completed: false,
        type: taskType,
        createdAt: new Date().toISOString(),
        timeString: timeString,
        isAi: true
      });

      currentHour = endH;
      currentMinute = endM;
      allocatedMinutes += studyBlockMinutes;
      blockIndex++;

      // If we still have study time remaining, add a Break block
      if (allocatedMinutes < totalMinutes) {
        const breakStart = formatTime(currentHour, currentMinute);
        const [breakEndH, breakEndM] = addMinutes(currentHour, currentMinute, breakBlockMinutes);
        const breakEnd = formatTime(breakEndH, breakEndM);
        const breakTimeString = `${breakStart} - ${breakEnd}`;

        generatedTasks.push({
          id: `ai_break_${Date.now()}_${blockIndex}`,
          title: "Refreshment / Relaxing Break",
          subject: "Rest Block",
          dueDate: new Date().toISOString().split("T")[0],
          priority: "low",
          completed: false,
          type: "other",
          createdAt: new Date().toISOString(),
          timeString: breakTimeString,
          isAi: true
        });

        currentHour = breakEndH;
        currentMinute = breakEndM;
        allocatedMinutes += breakBlockMinutes;
        blockIndex++;
      }

      subjectIndex++;
    }

    return generatedTasks;
  };

  // Add Manual Custom Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task: StudyPlanItem = {
      id: "sp_" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject.trim(),
      dueDate: new Date().toISOString().split("T")[0],
      priority: newPriority,
      type: newType,
      completed: false,
      createdAt: new Date().toISOString(),
      timeString: "Flexible Scheduled"
    };

    Storage.saveStudyPlan(task);
    setPlans(Storage.getStudyPlans());
    setNewTitle("");
    setShowCustomForm(false);
  };

  // Toggle Completed State
  const handleToggleTask = (id: string) => {
    const p = plans.find(x => x.id === id);
    if (p) {
      p.completed = !p.completed;
      Storage.saveStudyPlan(p);
      setPlans(Storage.getStudyPlans());
    }
  };

  // Skip Task State
  const handleToggleSkipTask = (id: string) => {
    const p = plans.find(x => x.id === id);
    if (p) {
      p.skipped = !p.skipped;
      if (p.skipped) {
        p.completed = false; // reset completed if skipped
      }
      Storage.saveStudyPlan(p);
      setPlans(Storage.getStudyPlans());
    }
  };

  // Reschedule Task Time Form State Trigger
  const handleTriggerReschedule = (task: StudyPlanItem) => {
    const newTimeStr = prompt("Enter new study time slot (e.g., 10:15 AM - 11:00 AM):", task.timeString || "");
    if (newTimeStr !== null) {
      task.timeString = newTimeStr;
      Storage.saveStudyPlan(task);
      setPlans(Storage.getStudyPlans());
    }
  };

  // Trigger Edit Form inline
  const startEditTask = (task: StudyPlanItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubject(task.subject);
    const parsed = parseTimeRange(task.timeString || "09:00 AM - 10:00 AM");
    setEditStartTime(parsed.start);
    setEditEndTime(parsed.end);
  };

  const handleSaveEdit = (id: string) => {
    const p = plans.find(x => x.id === id);
    if (p) {
      p.title = editTitle;
      p.subject = editSubject;
      p.timeString = formatTimeRange(editStartTime, editEndTime);
      Storage.saveStudyPlan(p);
      setPlans(Storage.getStudyPlans());
    }
    setEditingTaskId(null);
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    Storage.deleteStudyPlan(id);
    setPlans(Storage.getStudyPlans());
    toast.success("Task Deleted", "The study item has been removed from your plan.");
  };

  // Clear All Plans
  const handleClearAllPlans = () => {
    setShowClearPlansModal(true);
  };

  // Progress Percentages
  const completedCount = plans.filter(p => p.completed && !p.skipped).length;
  const activePlansCount = plans.filter(p => !p.skipped).length;
  const progressPercent = activePlansCount > 0 ? Math.round((completedCount / activePlansCount) * 100) : 0;

  // Custom subject inclusion handler
  const handleAddCustomSubject = () => {
    if (newCustomSubject.trim() && !subjects.includes(newCustomSubject.trim())) {
      setSubjects(prev => [...prev, newCustomSubject.trim()]);
      setNewCustomSubject("");
    }
  };

  const handleToggleSubject = (sub: string) => {
    if (subjects.includes(sub)) {
      setSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSubjects(prev => [...prev, sub]);
    }
  };

  // List of loading steps
  const simulationSteps = [
    "Checking Course Library",
    "Finding Pending Lectures",
    "Reading Assignment Deadlines",
    "Calculating Breaks",
    "Balancing Subjects"
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 px-4">
      {/* Header Banner - Elegant Minimal Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 dark:bg-zinc-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Target className="w-4 h-4 text-emerald-400" />
            LearnStudy AI Co-Pilot
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Daily Study Planner</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            A minimalist, smart personal study coach that automatically balances lectures, revision, practice, and breaks.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start md:self-center relative z-10">
          <button
            onClick={() => {
              setSubjects(["Physics", "Chemistry", "Mathematics"]);
              setWizardStep(1);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4.5 h-4.5 text-slate-950 fill-slate-950" />
            AI Auto-Planner
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`font-extrabold text-xs px-5 py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 border ${
              showSettings 
                ? "bg-white dark:bg-zinc-850 border-white dark:border-zinc-800 text-slate-950 dark:text-white" 
                : "bg-white/10 hover:bg-white/15 border-white/10 text-white"
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            Planner Settings
          </button>
        </div>
      </div>

      {/* Target Hours & Goal Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              Upcoming Milestone
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-zinc-100 truncate">
              {examName}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-3 pt-3 border-t border-slate-50 dark:border-zinc-800/50">
            Exam Target: <span className="font-bold text-slate-700 dark:text-zinc-300">{examDate}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Daily Target Hours
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
              {targetHours} Hours / day
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-3 pt-3 border-t border-slate-50 dark:border-zinc-800/50">
            Optimal study pace for retention
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Today's Progress
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
              {progressPercent}% Complete
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-zinc-800/50">
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Configuration & Manual Customization Settings Center */}
      {showSettings && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/50 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">Planner Settings & Goals</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">Customize target study hours, milestone deadlines, and manual settings.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Milestone & Daily Target */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Study Milestone & Exam Date
              </h4>
              
              <div className="space-y-3 bg-slate-50 dark:bg-zinc-950/45 p-4 rounded-2xl border border-slate-150/45 dark:border-zinc-850/45">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Exam / Milestone Name</label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => {
                      setExamName(e.target.value);
                      localStorage.setItem("studytube_exam_name", e.target.value);
                    }}
                    placeholder="e.g. Fall Semester Midterms"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Exam Target Date</label>
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) {
                          // Format target date nicely, e.g. "In 15 Days" or date string
                          const selected = new Date(e.target.value + "T00:00:00");
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const diffTime = selected.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          let displayStr = "";
                          if (diffDays === 0) {
                            displayStr = "Today!";
                          } else if (diffDays === 1) {
                            displayStr = "Tomorrow";
                          } else if (diffDays > 1) {
                            displayStr = `In ${diffDays} Days`;
                          } else {
                            displayStr = selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                          }
                          
                          setExamDate(displayStr);
                          localStorage.setItem("studytube_exam_date", displayStr);
                        }
                      }}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500/30 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Custom Date Text</label>
                    <input
                      type="text"
                      value={examDate}
                      onChange={(e) => {
                        setExamDate(e.target.value);
                        localStorage.setItem("studytube_exam_date", e.target.value);
                      }}
                      placeholder="e.g. In 18 Days"
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Target Hours & Manual Mode Options */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Target Hours & Study Modes
              </h4>

              <div className="space-y-4 bg-slate-50 dark:bg-zinc-950/45 p-4 rounded-2xl border border-slate-150/45 dark:border-zinc-850/45">
                {/* Stepper control for Daily Target Hours */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Daily Study Target</span>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Available study time for calculations.</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => updatePlannerTargetHours(targetHours - 1)}
                      className="w-8 h-8 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-xs text-slate-950 dark:text-white min-w-[28px] text-center">
                      {targetHours}h
                    </span>
                    <button 
                      type="button"
                      onClick={() => updatePlannerTargetHours(targetHours + 1)}
                      className="w-8 h-8 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Manual Mode / Custom Task Trigger */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Manual Planning Mode</span>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Create custom tasks manually & manage active subjects.</p>
                  </div>
                  <button
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-all ${
                      showCustomForm 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100/60"
                    }`}
                  >
                    {showCustomForm ? "✓ Enabled" : "Configure Manual Mode"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Customization inside settings */}
          <div className="bg-slate-50 dark:bg-zinc-950/45 p-4 rounded-2xl border border-slate-150/45 dark:border-zinc-850/45 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Active Subjects List</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Manage tags for your custom study plan.</p>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {subjects.map(sub => (
                <span 
                  key={sub}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg"
                >
                  {sub}
                  <button 
                    type="button"
                    onClick={() => handleToggleSubject(sub)}
                    className="text-slate-400 hover:text-red-500 transition ml-0.5"
                    title="Remove Subject"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomSubject}
                onChange={e => setNewCustomSubject(e.target.value)}
                placeholder="Add new subject..."
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3 py-1.5 rounded-lg flex-1 focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSubject();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomSubject}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/55 pb-2.5">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <span>Scheduled Daily Plans</span>
            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] px-2 py-0.5 rounded-full">
              {completedCount} / {activePlansCount}
            </span>
          </h3>
          {plans.length > 0 && (
            <button
              onClick={handleClearAllPlans}
              className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              Clear Current Plan
            </button>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-14 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <Brain className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-zinc-100">Your study board is clean!</h4>
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto">
                No active lessons scheduled for today. Launch the AI Auto-Planner to auto-generate a custom schedule tailored to your available time.
              </p>
            </div>
            <button
              onClick={() => {
                setSubjects(["Physics", "Chemistry", "Mathematics"]);
                setWizardStep(1);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
            >
              Create AI Study Plan
            </button>
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-zinc-800">
            {plans.map((task, index) => {
              const isRestBlock = task.subject === "Rest Block";
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`relative group bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 ${
                    task.completed 
                      ? "border-slate-150 dark:border-zinc-850 opacity-60" 
                      : task.skipped
                      ? "border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 opacity-50"
                      : isRestBlock
                      ? "border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/10 dark:bg-indigo-950/5"
                      : "border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30"
                  }`}
                >
                  {/* Timeline bullet */}
                  <div className={`absolute left-[20px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-zinc-900 z-10 transition ${
                    task.completed ? "border-emerald-500 bg-emerald-500" : task.skipped ? "border-slate-300 dark:border-zinc-700" : isRestBlock ? "border-indigo-400" : "border-slate-400"
                  }`}></div>

                  <div className="pl-6 flex items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      {/* Completion check */}
                      {!isRestBlock && !isEditing && (
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="mt-0.5 sm:mt-0 text-slate-400 hover:text-emerald-500 transition-all shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500 fill-emerald-500/10" />
                          ) : (
                            <Circle className="w-5.5 h-5.5 text-slate-300 dark:text-zinc-700" />
                          )}
                        </button>
                      )}

                      {isRestBlock && !isEditing && (
                        <div className="w-5.5 h-5.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center shrink-0">
                          <Coffee className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                      )}

                      {/* Editing state inline */}
                      {isEditing ? (
                        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-950 dark:text-white"
                            placeholder="Task Title"
                          />
                          <input
                            type="text"
                            value={editSubject}
                            onChange={e => setEditSubject(e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-950 dark:text-white"
                            placeholder="Subject"
                          />
                          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 w-full">
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
                            <button
                              onClick={() => handleSaveEdit(task.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {task.timeString && (
                              <span className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {task.timeString}
                              </span>
                            )}
                            {task.isAi && (
                              <span className="text-[9px] font-black tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                AI Plan
                              </span>
                            )}
                            {task.skipped && (
                              <span className="text-[9px] font-black tracking-wider uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                Skipped Today
                              </span>
                            )}
                          </div>

                          <h4 className={`text-sm font-bold mt-1.5 leading-tight ${task.completed ? "line-through text-slate-400" : task.skipped ? "text-slate-400" : "text-slate-950 dark:text-zinc-50"}`}>
                            {task.title}
                          </h4>

                          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isRestBlock 
                                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20" 
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                            }`}>
                              {task.subject}
                            </span>
                            
                            {!isRestBlock && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                task.priority === "high" ? "text-red-600 dark:text-red-400" :
                                task.priority === "medium" ? "text-amber-600 dark:text-amber-400" :
                                "text-slate-500"
                              }`}>
                                {task.priority} Priority
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Task Actions Dropdown Menu */}
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-500 transition shrink-0 cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition shrink-0"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                        {activeMenuTaskId === task.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 text-left"
                          >
                            {!isRestBlock && (
                              <button
                                onClick={() => {
                                  handleToggleTask(task.id);
                                  setActiveMenuTaskId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                {task.completed ? "Mark Incomplete" : "Mark Complete"}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                startEditTask(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              Edit Task
                            </button>
                            <button
                              onClick={() => {
                                handleTriggerReschedule(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Reschedule
                            </button>
                            {!isRestBlock && (
                              <button
                                onClick={() => {
                                  handleToggleSkipTask(task.id);
                                  setActiveMenuTaskId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                              >
                                <X className="w-3.5 h-3.5 text-orange-500" />
                                {task.skipped ? "Unskip" : "Skip Today"}
                              </button>
                            )}
                            <div className="border-t border-slate-100 dark:border-zinc-900 my-1"></div>
                            <button
                              onClick={() => {
                                handleDeleteTask(task.id);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* "Add Custom Task" Toggle (Only appears when active plans exist or after first schedule) */}
      <div className="pt-4 flex flex-col items-center">
        {!showCustomForm ? (
          <button
            onClick={() => setShowCustomForm(true)}
            className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-5 py-2.5 rounded-xl hover:bg-emerald-100/60 transition-all flex items-center gap-1.5 shadow-xs border border-emerald-100/30"
          >
            <Plus className="w-4 h-4" />
            Add Custom Task
          </button>
        ) : (
          <div className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl p-5 space-y-4 shadow-sm text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add Custom Task
              </h3>
              <button
                onClick={() => setShowCustomForm(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Finish chemistry project report"
                className="sm:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Subject"
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex gap-2.5">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* --- BEAUTIFUL AI PLANNING WIZARD MODAL --- */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Wizard Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                  AI Planning Wizard
                </span>
              </div>
              <button 
                onClick={() => setWizardStep(0)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Step Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300" 
                style={{ width: `${(wizardStep / 9) * 100}%` }}
              ></div>
            </div>

            {/* Wizard Scrollable Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              
              {/* STEP 1: WELCOME */}
              {wizardStep === 1 && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                    🤖
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50">AI Study Planner</h2>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                      Let's build your perfect balanced study schedule today. This takes less than 30 seconds.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: AVAILABLE STUDY TIME */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    How much time can you study today?
                  </h3>
                  <div className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto">
                    {[1, 2, 3, 4, 5, 6].map((hour) => (
                      <button
                        key={hour}
                        onClick={() => setStudyTime(hour)}
                        className={`py-4 px-5 rounded-2xl border text-sm font-extrabold text-center transition-all ${
                          studyTime === hour 
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-xs" 
                            : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {hour} {hour === 6 ? "6+ Hours" : hour === 1 ? "Hour" : "Hours"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: SELECT SUBJECTS */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                    Which subjects do you want to study today?
                  </h3>
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {["Physics", "Chemistry", "Mathematics", "Biology", "English"].map((sub) => (
                      <label 
                        key={sub}
                        className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-800 p-3.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900/60 transition"
                      >
                        <input
                          type="checkbox"
                          checked={subjects.includes(sub)}
                          onChange={() => handleToggleSubject(sub)}
                          className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{sub}</span>
                      </label>
                    ))}
                  </div>

                  {/* Add Custom Subject */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. History"
                      value={newCustomSubject}
                      onChange={e => setNewCustomSubject(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 px-3 py-2.5 rounded-xl focus:outline-none"
                    />
                    <button
                      onClick={handleAddCustomSubject}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: TODAY'S FOCUS */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    What's your priority today?
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                    {[
                      "Finish Lectures",
                      "Practice Questions",
                      "Revision",
                      "Mock Test",
                      "Assignment",
                      "Weak Topics"
                    ].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFocus(f)}
                        className={`w-full py-3 px-4 rounded-xl border text-xs font-bold text-left transition ${
                          focus === f 
                            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
                            : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: UPCOMING EXAM */}
              {wizardStep === 5 && (
                <div className="space-y-5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    Do you have an upcoming exam?
                  </h3>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setHasExam(true)}
                      className={`px-6 py-3.5 rounded-xl border font-bold text-sm w-28 text-center transition ${
                        hasExam === true
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-zinc-800 text-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        setHasExam(false);
                        setWizardExamName("");
                        setWizardExamDate("");
                      }}
                      className={`px-6 py-3.5 rounded-xl border font-bold text-sm w-28 text-center transition ${
                        hasExam === false
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-zinc-800 text-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>

                  {hasExam && (
                    <div className="space-y-3.5 max-w-sm mx-auto pt-4 border-t border-slate-100 dark:border-zinc-800/60 animate-fade-in">
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500">Exam Name</label>
                        <input
                          type="text"
                          value={wizardExamName}
                          onChange={e => setWizardExamName(e.target.value)}
                          placeholder="e.g. AP Physics Final"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500">Exam Date</label>
                        <input
                          type="text"
                          value={wizardExamDate}
                          onChange={e => setWizardExamDate(e.target.value)}
                          placeholder="e.g. Aug 15"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: ENERGY LEVEL */}
              {wizardStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    How are you feeling today?
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {[
                      { label: "😊 Fresh", val: "Fresh" },
                      { label: "🙂 Normal", val: "Normal" },
                      { label: "😴 Tired", val: "Tired" },
                      { label: "😵 Burned Out", val: "Burned Out" }
                    ].map((energy) => (
                      <button
                        key={energy.val}
                        onClick={() => setEnergyLevel(energy.val)}
                        className={`py-4 px-4 rounded-2xl border text-xs font-bold transition-all ${
                          energyLevel === energy.val 
                            ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                            : "border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {energy.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 7: LEARNING RESOURCES */}
              {wizardStep === 7 && (
                <div className="space-y-5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    Available Study Resources
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 text-center max-w-xs mx-auto">
                    LearnStudy co-pilot scanned the library to detect current pending assets.
                  </p>

                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-855 rounded-2xl p-5 max-w-xs mx-auto space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1.5"><Youtube className="w-4 h-4 text-rose-500" /> Pending Lectures</span>
                      <span>{resourceCounts.pendingLectures} pending</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-500" /> Saved Assignments</span>
                      <span>{resourceCounts.assignments} files</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1.5"><Brain className="w-4 h-4 text-amber-500" /> Practice Sets</span>
                      <span>{resourceCounts.practiceSets} cards</span>
                    </div>
                  </div>

                  <label className="flex items-center justify-center gap-2.5 max-w-xs mx-auto cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={includeResources}
                      onChange={() => setIncludeResources(prev => !prev)}
                      className="w-4.5 h-4.5 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Include pending resources in scheduler?
                    </span>
                  </label>
                </div>
              )}

              {/* STEP 8: PREFERENCES */}
              {wizardStep === 8 && (
                <div className="space-y-6 max-w-sm mx-auto">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-500">Break Duration</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((b) => (
                        <button
                          key={b}
                          onClick={() => setBreakDuration(b)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                            breakDuration === b 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                              : "border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          {b} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-500">Pomodoro Style</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {["25/5", "50/10", "Custom"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPomodoroStyle(p)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                            pomodoroStyle === p 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                              : "border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 9: AI SUMMARY */}
              {wizardStep === 9 && (
                <div className="space-y-5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 text-center">
                    Today's Plan Summary
                  </h3>

                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 rounded-2xl p-5 max-w-xs mx-auto space-y-4 text-xs font-bold">
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Study Time</span>
                      <span className="text-slate-900 dark:text-zinc-100">{studyTime} Hours</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Subjects</span>
                      <span className="text-slate-900 dark:text-zinc-100 max-w-[180px] text-right truncate">
                        {subjects.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Focus</span>
                      <span className="text-slate-900 dark:text-zinc-100">{focus}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Break Duration</span>
                      <span className="text-slate-900 dark:text-zinc-100">{breakDuration} Mins ({pomodoroStyle})</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Resources Integrated</span>
                      <span className="text-slate-900 dark:text-zinc-100">{includeResources ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Navigation Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-850/60 bg-slate-50 dark:bg-zinc-900/80 flex items-center justify-between">
              <button
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => prev - 1)}
                className={`flex items-center gap-1 text-xs font-extrabold text-slate-500 hover:text-slate-700 transition ${
                  wizardStep === 1 ? "opacity-30 pointer-events-none" : ""
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {wizardStep < 9 ? (
                <button
                  onClick={() => setWizardStep(prev => prev + 1)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsGenerating(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5 animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-white fill-white" />
                  Generate My Plan
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- RECONSTRUCTED BEAUTIFUL LOADING MODAL --- */}
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-3xl p-6 text-center space-y-6 shadow-2xl">
            <div className="flex flex-col items-center gap-2">
              <Brain className="w-12 h-12 text-emerald-500 animate-bounce" />
              <h3 className="text-base font-black text-slate-950 dark:text-zinc-50">🤖 Creating Your Study Plan...</h3>
            </div>

            <div className="space-y-3.5 text-left max-w-[240px] mx-auto">
              {simulationSteps.map((step, idx) => {
                const isPassed = loadingStepIdx > idx;
                const isCurrent = loadingStepIdx === idx;
                return (
                  <div 
                    key={step} 
                    className={`flex items-center gap-2.5 text-xs transition duration-300 ${
                      isPassed ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : isCurrent ? "text-slate-900 dark:text-zinc-100 font-black" : "text-slate-300 dark:text-zinc-600"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] ${
                      isPassed ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : isCurrent ? "border-emerald-500 bg-emerald-500 text-white animate-pulse" : "border-slate-200 dark:border-zinc-850"
                    }`}>
                      {isPassed ? "✓" : indexToStepNumber(idx)}
                    </div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 animate-pulse">
              {loadingStepIdx >= 5 ? "Almost Ready..." : "Structuring daily schedule blocks..."}
            </p>
          </div>
        </div>
      )}

      {/* Clear Plans Modal */}
      {showClearPlansModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Clear Daily Plan?</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
                This will permanently delete all your current study plans. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowClearPlansModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  Storage.saveStudyPlans([]);
                  setPlans([]);
                  toast.success("Daily Plan Cleared", "All current study plans have been cleared.");
                  setShowClearPlansModal(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition cursor-pointer"
              >
                Clear Plans
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helpers
function indexToStepNumber(index: number) {
  return String(index + 1);
}
