import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  PomodoroDb, PomodoroSettings, PomodoroHistoryItem, PomodoroStats, RunningSessionState 
} from "../utils/pomodoroDb";
import { playPomodoroSound } from "../utils/pomodoroSounds";
import { useToast } from "./ToastContext";
import { Storage } from "../utils/storage";

interface PomodoroContextType {
  settings: PomodoroSettings;
  activeState: RunningSessionState;
  history: PomodoroHistoryItem[];
  stats: PomodoroStats;
  isFullScreen: boolean;
  isFloating: boolean;
  floatingPosition: { x: number; y: number };
  activeTab: string;
  setFloatingPosition: (pos: { x: number; y: number }) => void;
  setFullScreen: (b: boolean) => void;
  setFloating: (b: boolean) => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => Promise<void>;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  addMinute: () => void;
  subMinute: () => void;
  selectPreset: (name: string) => void;
  updateGoals: (daily: number, weekly: number, monthly: number) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  exportHistory: () => void;
  activeVideoInfo: { playlistTitle?: string; lectureTitle?: string } | null;
  setActiveVideoInfo: (info: { playlistTitle?: string; lectureTitle?: string } | null) => void;
  isAlarmRinging: boolean;
  stopAlarm: () => void;
  snoozeAlarm: (mins: number) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro must be used within a PomodoroProvider");
  return context;
};

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  // DB States
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [activeState, setActiveState] = useState<RunningSessionState | null>(null);
  const [history, setHistory] = useState<PomodoroHistoryItem[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);

  // Layout states
  const [isFullScreen, setFullScreen] = useState(false);
  const [isFloating, setFloating] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({ x: 20, y: 80 });

  // Currently studied lecture details passed from player
  const [activeVideoInfo, setActiveVideoInfo] = useState<{ playlistTitle?: string; lectureTitle?: string } | null>(null);

  
  // Background sound effect
  useEffect(() => {
    if (activeState && !activeState.isPaused && activeState.mode !== "focus") {
      if (settings && settings.backgroundSound && settings.backgroundSound !== "none") {
        import("../utils/pomodoroSounds").then(({ startBackgroundSound }) => {
          startBackgroundSound(settings.backgroundSound, settings.backgroundVolume);
        });
      }
    } else {
      import("../utils/pomodoroSounds").then(({ stopBackgroundSound }) => {
        stopBackgroundSound();
      });
    }
  }, [activeState?.isPaused, activeState?.mode, settings?.backgroundSound, settings?.backgroundVolume]);

  // References for the timestamp countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmRef = useRef<NodeJS.Timeout | null>(null);
  const alarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const endTimeRef = useRef<number | null>(null);

  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      const s = await PomodoroDb.getSettings();
      const state = await PomodoroDb.getRunningState();
      const hist = await PomodoroDb.getHistory();
      const st = await PomodoroDb.getStats();

      setSettings(s);
      setHistory(hist);
      setStats(st);
      setFloatingPosition(s.floatingTimerPosition || { x: 20, y: 80 });

      // Handle running state restoration with accurate timestamps
      if (state) {
        if (!state.isPaused && state.lastTimestamp) {
          // If was running, calculate elapsed time since tab closed/refreshed
          const elapsedMs = Date.now() - state.lastTimestamp;
          const newRemainingMs = state.remainingMs - elapsedMs;

          if (newRemainingMs <= 0) {
            // Completed while user was away!
            setActiveState({
              ...state,
              remainingMs: 0,
              isPaused: true,
              lastTimestamp: Date.now(),
            });
            // Handle completion after state is loaded below
            setTimeout(() => handleTimerCompletion(state, s), 500);
          } else {
            // Resume countdown
            const newState = {
              ...state,
              remainingMs: newRemainingMs,
              lastTimestamp: Date.now(),
            };
            setActiveState(newState);
            endTimeRef.current = Date.now() + newRemainingMs;
          }
        } else {
          setActiveState(state);
        }
      } else {
        // Default idle state based on focus settings
        setActiveState({
          mode: "focus",
          isPaused: true,
          durationMs: s.focusDuration * 60 * 1000,
          remainingMs: s.focusDuration * 60 * 1000,
          lastTimestamp: Date.now(),
          sessionIndex: 1,
        });
      }

      // Request browser notification permission
      if (s.enableBrowserNotifications && "Notification" in window) {
        Notification.requestPermission();
      }
    }
    loadInitialData();
  }, []);

  // Sync state to ref to avoid stale closure issues
  const activeStateRef = useRef<RunningSessionState | null>(null);
  activeStateRef.current = activeState;

  // Sound play helper

  const snoozeAlarm = (mins: number) => {
    stopAlarm();
    if (!activeState) return;
    const newState = {
      ...activeState,
      isPaused: false,
      remainingMs: activeState.remainingMs + (mins * 60 * 1000),
      lastTimestamp: Date.now()
    };
    setActiveState(newState);
    endTimeRef.current = Date.now() + newState.remainingMs;
  };

  const stopAlarm = () => {
    if (alarmRef.current) clearInterval(alarmRef.current);
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    alarmRef.current = null;
    alarmTimeoutRef.current = null;
    setIsAlarmRinging(false);
  };

  const triggerAlarm = (isFocus: boolean) => {
    if (!settings) return;
    stopAlarm();
    
    if (settings.voiceReminders) {
      import("../utils/pomodoroSounds").then(({ speakVoiceReminder }) => {
        speakVoiceReminder(isFocus ? "Study session completed." : "Break is over. Time to focus.");
      });
    }

    import("../utils/pomodoroSounds").then(({ playPomodoroSound }) => {
      playPomodoroSound(settings.notificationSound, settings.volume);
      
      if (settings.loopAlarm !== "off" && settings.loopAlarm !== "once") {
        setIsAlarmRinging(true);
        let intervalSecs = settings.loopInterval || 5;
        if (settings.loopAlarm === "until_stopped") intervalSecs = 5;
        
        alarmRef.current = setInterval(() => {
          playPomodoroSound(settings.notificationSound, settings.volume);
          if (settings.enableVibration) triggerVibration();
        }, intervalSecs * 1000);
        
        let maxDur = settings.maxRepeatDuration || 30;
        if (settings.autoStopAlarm === 30) maxDur = 30;
        else if (settings.autoStopAlarm === 60) maxDur = 60;
        
        if (settings.autoStopAlarm !== "never" && settings.autoStopAlarm !== "one_ring") {
          alarmTimeoutRef.current = setTimeout(() => {
            stopAlarm();
          }, maxDur * 1000);
        }
      }
    });
  };

  // Browser notification helper
  const showNotification = (title: string, body: string) => {
    if (!settings || !settings.enableBrowserNotifications) return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    }
  };

  // Mobile vibration helper
  const triggerVibration = () => {
    if (settings?.enableVibration && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Core Timer ticking function
  useEffect(() => {
    if (!activeState || activeState.isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Set end time if not set
    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + activeState.remainingMs;
    }

    timerRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const rem = Math.max(0, endTimeRef.current - Date.now());

      setActiveState((prev) => {
        if (!prev) return null;
        if (rem <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          endTimeRef.current = null;
          // Trigger session completion asynchronously
          setTimeout(() => {
            if (activeStateRef.current) {
              handleTimerCompletion(activeStateRef.current, settings!);
            }
          }, 0);

          return {
            ...prev,
            remainingMs: 0,
            isPaused: true,
            lastTimestamp: Date.now(),
          };
        }

        return {
          ...prev,
          remainingMs: rem,
          lastTimestamp: Date.now(),
        };
      });
    }, 200);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeState?.isPaused, settings]);

  // Periodically persist running state to DB (every 5 seconds) to handle unexpected close
  useEffect(() => {
    if (!activeState) return;
    const t = setTimeout(() => {
      PomodoroDb.saveRunningState(activeState);
    }, 5000);
    return () => clearTimeout(t);
  }, [activeState]);

  // Clean database saves on component beforeunload/destroy
  useEffect(() => {
    const handleUnload = () => {
      if (activeStateRef.current) {
        PomodoroDb.saveRunningState(activeStateRef.current);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Completion logic: save statistics, add history, auto-advance sessions
  const handleTimerCompletion = async (stateOnCompletion: RunningSessionState, currentSettings: PomodoroSettings) => {
    const isFocus = stateOnCompletion.mode === "focus";
    const durationMins = isFocus ? currentSettings.focusDuration : (stateOnCompletion.mode === "shortBreak" ? currentSettings.shortBreakDuration : currentSettings.longBreakDuration);

    triggerAlarm(isFocus);
    triggerVibration();

    // Browser Notification & Toast
    if (isFocus) {
      showNotification("Focus Session Done!", "Great job! Time for a well-deserved break.");
      toast.success("Focus Session Done!", "Great job! Time for a well-deserved break.");
    } else {
      showNotification("Break Finished!", "Time to continue studying!");
      toast.info("Break Finished!", "Time to continue studying!");
    }

    // 1. Log Session to History
    const historyItem: PomodoroHistoryItem = {
      id: "pomo_" + Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString("en-CA"),
      startTime: new Date(Date.now() - durationMins * 60 * 1000).toLocaleTimeString("en-US", { hour12: false }),
      endTime: new Date().toLocaleTimeString("en-US", { hour12: false }),
      focusDuration: isFocus ? durationMins : 0,
      breakDuration: !isFocus ? durationMins : 0,
      completed: true,
      playlistTitle: activeVideoInfo?.playlistTitle || stateOnCompletion.playlistTitle,
      lectureTitle: activeVideoInfo?.lectureTitle || stateOnCompletion.lectureTitle,
    };
    await PomodoroDb.saveHistoryItem(historyItem);
    const updatedHistory = await PomodoroDb.getHistory();
    setHistory(updatedHistory);

    // Sync to global study logs for real-time streak tracking
    if (isFocus) {
      Storage.addStudyTime(
        "pomodoro",
        historyItem.lectureTitle || "Focus Session",
        durationMins * 60
      );
    }

    // 2. Update Stats
    const currentStats = await PomodoroDb.getStats();
    const todayStr = new Date().toLocaleDateString("en-CA");

    const newStats: PomodoroStats = {
      ...currentStats,
      totalFocusToday: currentStats.totalFocusToday + (isFocus ? durationMins : 0),
      totalBreakToday: currentStats.totalBreakToday + (!isFocus ? durationMins : 0),
      sessionsCompletedToday: currentStats.sessionsCompletedToday + (isFocus ? 1 : 0),
      lastCompletedDate: todayStr,
    };

    // Calculate Streak
    if (isFocus) {
      if (currentStats.lastCompletedDate !== todayStr) {
        const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
        if (currentStats.lastCompletedDate === yesterdayStr) {
          newStats.currentStreak = currentStats.currentStreak + 1;
        } else if (!currentStats.lastCompletedDate || currentStats.lastCompletedDate !== todayStr) {
          newStats.currentStreak = 1;
        }
        if (newStats.currentStreak > currentStats.longestStreak) {
          newStats.longestStreak = newStats.currentStreak;
        }
      }
    }

    await PomodoroDb.saveStats(newStats);
    setStats(newStats);

    // 3. Determine Next Mode
    let nextMode: "focus" | "shortBreak" | "longBreak" = "focus";
    let nextIndex = stateOnCompletion.sessionIndex;

    if (isFocus) {
      if (currentSettings.skipBreaks) {
        nextMode = "focus";
        nextIndex = nextIndex >= currentSettings.sessionsBeforeLongBreak ? 1 : nextIndex + 1;
      } else {
        if (nextIndex >= currentSettings.sessionsBeforeLongBreak) {
          nextMode = "longBreak";
          nextIndex = 1;
          import("canvas-confetti").then((confetti) => {
            confetti.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          });
        } else {
          nextMode = "shortBreak";
          nextIndex = nextIndex + 1;
        }
      }
    } else {
      nextMode = "focus";
    }

    const nextDurationMins = nextMode === "focus" 
      ? currentSettings.focusDuration 
      : (nextMode === "shortBreak" ? currentSettings.shortBreakDuration : currentSettings.longBreakDuration);

    const autoStart = isFocus 
      ? currentSettings.autoStartBreaks 
      : currentSettings.autoStartNextFocus;

    const nextState: RunningSessionState = {
      mode: nextMode,
      isPaused: !autoStart,
      durationMs: nextDurationMins * 60 * 1000,
      remainingMs: nextDurationMins * 60 * 1000,
      lastTimestamp: Date.now(),
      sessionIndex: nextIndex,
      playlistTitle: activeVideoInfo?.playlistTitle || undefined,
      lectureTitle: activeVideoInfo?.lectureTitle || undefined,
    };

    setActiveState(nextState);
    await PomodoroDb.saveRunningState(nextState);

    if (autoStart) {
      endTimeRef.current = Date.now() + nextState.durationMs;
    } else {
      endTimeRef.current = null;
    }
  };

  // Control Functions
  const startTimer = () => {
    if (!activeState) return;
    const newState = {
      ...activeState,
      isPaused: false,
      lastTimestamp: Date.now(),
      playlistTitle: activeVideoInfo?.playlistTitle || activeState.playlistTitle,
      lectureTitle: activeVideoInfo?.lectureTitle || activeState.lectureTitle,
    };
    setActiveState(newState);
    endTimeRef.current = Date.now() + activeState.remainingMs;
    PomodoroDb.saveRunningState(newState);
  };

  const pauseTimer = () => {
    if (!activeState) return;
    const newState = {
      ...activeState,
      isPaused: true,
      lastTimestamp: Date.now(),
    };
    setActiveState(newState);
    endTimeRef.current = null;
    PomodoroDb.saveRunningState(newState);
  };

  const resetTimer = () => {
    if (!activeState || !settings) return;
    const durationMins = activeState.mode === "focus" 
      ? settings.focusDuration 
      : (activeState.mode === "shortBreak" ? settings.shortBreakDuration : settings.longBreakDuration);

    const newState = {
      ...activeState,
      isPaused: true,
      remainingMs: durationMins * 60 * 1000,
      durationMs: durationMins * 60 * 1000,
      lastTimestamp: Date.now(),
    };
    setActiveState(newState);
    endTimeRef.current = null;
    PomodoroDb.saveRunningState(newState);
  };

  // Interrupted/Skipped current timer logging
  const skipSession = async () => {
    if (!activeState || !settings) return;

    // Log the current session as "interrupted" if focus and started
    const totalDurationMins = activeState.durationMs / (60 * 1000);
    const completedMins = Math.round((activeState.durationMs - activeState.remainingMs) / (60 * 1000));
    
    if (completedMins > 0) {
      const historyItem: PomodoroHistoryItem = {
        id: "pomo_" + Math.random().toString(36).substr(2, 9),
        date: new Date().toLocaleDateString("en-CA"),
        startTime: new Date(Date.now() - completedMins * 60 * 1000).toLocaleTimeString("en-US", { hour12: false }),
        endTime: new Date().toLocaleTimeString("en-US", { hour12: false }),
        focusDuration: activeState.mode === "focus" ? completedMins : 0,
        breakDuration: activeState.mode !== "focus" ? completedMins : 0,
        completed: false, // marked as interrupted since they skipped
        playlistTitle: activeVideoInfo?.playlistTitle || activeState.playlistTitle,
        lectureTitle: activeVideoInfo?.lectureTitle || activeState.lectureTitle,
      };
      await PomodoroDb.saveHistoryItem(historyItem);
      const updatedHistory = await PomodoroDb.getHistory();
      setHistory(updatedHistory);

      // Add custom stats for whatever study was completed
      const currentStats = await PomodoroDb.getStats();
      const updatedStats = {
        ...currentStats,
        totalFocusToday: currentStats.totalFocusToday + (activeState.mode === "focus" ? completedMins : 0),
        totalBreakToday: currentStats.totalBreakToday + (activeState.mode !== "focus" ? completedMins : 0),
        lastCompletedDate: new Date().toLocaleDateString("en-CA"),
      };
      await PomodoroDb.saveStats(updatedStats);
      setStats(updatedStats);
    }

    // Toggle to next mode
    let nextMode: "focus" | "shortBreak" | "longBreak" = "focus";
    let nextIndex = activeState.sessionIndex;

    if (activeState.mode === "focus") {
      if (nextIndex >= settings.sessionsBeforeLongBreak) {
        nextMode = "longBreak";
        nextIndex = 1;
      } else {
        nextMode = "shortBreak";
        nextIndex = nextIndex + 1;
      }
    } else {
      nextMode = "focus";
    }

    const nextDurationMins = nextMode === "focus" 
      ? settings.focusDuration 
      : (nextMode === "shortBreak" ? settings.shortBreakDuration : settings.longBreakDuration);

    const nextState: RunningSessionState = {
      mode: nextMode,
      isPaused: true,
      durationMs: nextDurationMins * 60 * 1000,
      remainingMs: nextDurationMins * 60 * 1000,
      lastTimestamp: Date.now(),
      sessionIndex: nextIndex,
      playlistTitle: activeVideoInfo?.playlistTitle || undefined,
      lectureTitle: activeVideoInfo?.lectureTitle || undefined,
    };

    setActiveState(nextState);
    endTimeRef.current = null;
    await PomodoroDb.saveRunningState(nextState);
  };

  const addMinute = () => {
    if (!activeState) return;
    setActiveState((prev) => {
      if (!prev) return null;
      const extraMs = 60 * 1000;
      const newRemaining = prev.remainingMs + extraMs;
      const newDuration = prev.durationMs + extraMs;
      if (!prev.isPaused && endTimeRef.current) {
        endTimeRef.current += extraMs;
      }
      return {
        ...prev,
        remainingMs: newRemaining,
        durationMs: newDuration,
      };
    });
  };

  const subMinute = () => {
    if (!activeState) return;
    setActiveState((prev) => {
      if (!prev) return null;
      const subMs = 60 * 1000;
      const newRemaining = Math.max(0, prev.remainingMs - subMs);
      if (!prev.isPaused && endTimeRef.current) {
        endTimeRef.current -= subMs;
      }
      return {
        ...prev,
        remainingMs: newRemaining,
      };
    });
  };

  const selectPreset = (name: string) => {
    if (!settings) return;
    let focus = 25, short = 5, long = 15;
    if (name === "50/10") { focus = 50; short = 10; long = 20; }
    else if (name === "60/15") { focus = 60; short = 15; long = 20; }
    else if (name === "90/20") { focus = 90; short = 20; long = 30; }
    else if (name === "custom") { focus = settings.focusDuration; short = settings.shortBreakDuration; long = settings.longBreakDuration; }
    else {
      // Find custom preset
      const customPreset = settings.customPresets?.find(p => p.id === name);
      if (customPreset) {
        focus = customPreset.focusDuration;
        short = customPreset.shortBreakDuration;
        long = customPreset.longBreakDuration;
      }
    }

        const updatedSettings = {
      ...settings,
      focusDuration: focus,
      shortBreakDuration: short,
      longBreakDuration: long,
      selectedPresetId: name,
    };

    setSettings(updatedSettings);
    PomodoroDb.saveSettings(updatedSettings);

    const defaultState: RunningSessionState = {
      mode: "focus",
      isPaused: true,
      durationMs: focus * 60 * 1000,
      remainingMs: focus * 60 * 1000,
      lastTimestamp: Date.now(),
      sessionIndex: 1,
    };
    setActiveState(defaultState);
    endTimeRef.current = null;
    PomodoroDb.saveRunningState(defaultState);
  };

  const updateSettings = async (newSettings: Partial<PomodoroSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await PomodoroDb.saveSettings(updated);

    // If focus duration changed and current is paused focus, adjust remaining
    if (activeState && activeState.isPaused && activeState.mode === "focus" && newSettings.focusDuration !== undefined) {
      setActiveState({
        ...activeState,
        durationMs: newSettings.focusDuration * 60 * 1000,
        remainingMs: newSettings.focusDuration * 60 * 1000,
      });
    }
  };

  const updateGoals = async (daily: number, weekly: number, monthly: number) => {
    if (!stats) return;
    const updated = {
      ...stats,
      dailyGoalMins: daily,
      weeklyGoalMins: weekly,
      monthlyGoalMins: monthly,
    };
    setStats(updated);
    await PomodoroDb.saveStats(updated);
  };

  const deleteHistory = async (id: string) => {
    await PomodoroDb.deleteHistoryItem(id);
    const hist = await PomodoroDb.getHistory();
    setHistory(hist);
  };

  const clearHistory = async () => {
    await PomodoroDb.clearHistory();
    setHistory([]);
  };

  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `pomodoro_study_history_${new Date().toLocaleDateString("en-CA")}.json`);
    dlAnchorElem.click();
  };

  if (!settings || !activeState || !stats) {
    // Return loading placeholder while DB initializes
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Loading Study Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <PomodoroContext.Provider value={{
      settings,
      activeState,
      history,
      stats,
      isFullScreen,
      isFloating,
      floatingPosition,
      activeTab: "pomodoro",
      setFloatingPosition,
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
      setActiveVideoInfo,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
};
