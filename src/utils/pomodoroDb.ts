// IndexedDB Wrapper for Pomodoro Study Timer
const DB_NAME = "PomodoroStudyTimerDB";
const DB_VERSION = 1;

export interface PomodoroSettings {
  focusDuration: number; // in mins
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartNextFocus: boolean;
  autoStartBreaks: boolean;
  skipBreaks: boolean;
  pauseBetweenSessions: boolean;
  countdownFormat: "MM:SS" | "HH:MM:SS";
  notificationSound: string;
  loopAlarm: "off" | "once" | "until_stopped" | "custom";
  loopInterval: number;
  maxRepeatDuration: number;
  autoStopAlarm: "one_ring" | 30 | 60 | "never";
  backgroundSound: string;
  backgroundVolume: number;
  voiceReminders: boolean;
  selectedPresetId: string;
  customPresets: { id: string; name: string; focusDuration: number; shortBreakDuration: number; longBreakDuration: number; sessionsBeforeLongBreak: number }[];
  volume: number;
  enableBrowserNotifications: boolean;
  enableVibration: boolean;
  floatingTimerPosition: { x: number; y: number };
  compactWidget: boolean;
  countdownAnimationStyle: "none" | "pulse" | "smooth";
}

export interface PomodoroHistoryItem {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string;
  focusDuration: number; // in mins completed
  breakDuration: number;
  completed: boolean; // completed or interrupted
  playlistTitle?: string;
  lectureTitle?: string;
}

export interface PomodoroStats {
  totalFocusToday: number; // in mins
  totalBreakToday: number; // in mins
  sessionsCompletedToday: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalMins: number;
  weeklyGoalMins: number;
  monthlyGoalMins: number;
  lastCompletedDate?: string; // YYYY-MM-DD
}

export interface RunningSessionState {
  mode: "focus" | "shortBreak" | "longBreak";
  isPaused: boolean;
  durationMs: number; // total duration
  remainingMs: number; // remaining duration
  lastTimestamp: number; // Date.now() when paused or updated
  sessionIndex: number; // index of session (e.g. 1 to sessionsBeforeLongBreak)
  playlistTitle?: string;
  lectureTitle?: string;
}

export class PomodoroDb {
  private static db: IDBDatabase | null = null;

  private static getDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        // Create object stores
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        if (!db.objectStoreNames.contains("history")) {
          db.createObjectStore("history", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("stats")) {
          db.createObjectStore("stats");
        }
        if (!db.objectStoreNames.contains("state")) {
          db.createObjectStore("state");
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- Settings Store ---
  static async getSettings(): Promise<PomodoroSettings> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("settings", "readonly");
      const store = transaction.objectStore("settings");
      const request = store.get("current_settings");

      request.onsuccess = () => {
        const defaultSettings: PomodoroSettings = {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          sessionsBeforeLongBreak: 4,
          autoStartNextFocus: false,
          autoStartBreaks: true,
          skipBreaks: false,
          pauseBetweenSessions: true,
          countdownFormat: "MM:SS",
          notificationSound: "alarm",
          volume: 50,
          enableBrowserNotifications: false,
          enableVibration: true,
          floatingTimerPosition: { x: 20, y: 80 },
          compactWidget: false,
          countdownAnimationStyle: "smooth",
          loopAlarm: "off",
          loopInterval: 5,
          maxRepeatDuration: 30,
          autoStopAlarm: "one_ring",
          backgroundSound: "none",
          backgroundVolume: 50,
          voiceReminders: true,
          selectedPresetId: "classic",
          customPresets: [],
        };
        resolve(request.result || defaultSettings);
      };

      request.onerror = () => {
        resolve({
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          sessionsBeforeLongBreak: 4,
          autoStartNextFocus: false,
          autoStartBreaks: true,
          skipBreaks: false,
          pauseBetweenSessions: true,
          countdownFormat: "MM:SS",
          notificationSound: "alarm",
          volume: 50,
          enableBrowserNotifications: false,
          enableVibration: true,
          floatingTimerPosition: { x: 20, y: 80 },
          compactWidget: false,
          countdownAnimationStyle: "smooth",
          loopAlarm: "off",
          loopInterval: 5,
          maxRepeatDuration: 30,
          autoStopAlarm: "one_ring",
          backgroundSound: "none",
          backgroundVolume: 50,
          voiceReminders: true,
          selectedPresetId: "classic",
          customPresets: [],
        });
      };
    });
  }

  static async saveSettings(settings: PomodoroSettings): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("settings", "readwrite");
      const store = transaction.objectStore("settings");
      const request = store.put(settings, "current_settings");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Active Running State Store (For persistence across reloads) ---
  static async getRunningState(): Promise<RunningSessionState | null> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("state", "readonly");
      const store = transaction.objectStore("state");
      const request = store.get("running_state");

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  static async saveRunningState(state: RunningSessionState | null): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readwrite");
      const store = transaction.objectStore("state");
      const request = state ? store.put(state, "running_state") : store.delete("running_state");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- History Store ---
  static async getHistory(): Promise<PomodoroHistoryItem[]> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("history", "readonly");
      const store = transaction.objectStore("history");
      const request = store.getAll();

      request.onsuccess = () => {
        const sorted = (request.result || []).sort(
          (a, b) => new Date(b.date + "T" + b.startTime).getTime() - new Date(a.date + "T" + a.startTime).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => resolve([]);
    });
  }

  static async saveHistoryItem(item: PomodoroHistoryItem): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteHistoryItem(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async clearHistory(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Statistics Store ---
  static async getStats(): Promise<PomodoroStats> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("stats", "readonly");
      const store = transaction.objectStore("stats");
      const request = store.get("current_stats");

      request.onsuccess = () => {
        const todayStr = new Date().toLocaleDateString("en-CA");
        const defaultStats: PomodoroStats = {
          totalFocusToday: 0,
          totalBreakToday: 0,
          sessionsCompletedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailyGoalMins: 120, // default 2 hours focus goal
          weeklyGoalMins: 600, // default 10 hours focus goal
          monthlyGoalMins: 2400, // default 40 hours focus goal
        };

        if (!request.result) {
          resolve(defaultStats);
          return;
        }

        const data = request.result as PomodoroStats;
        // Check if date has changed, if so, reset daily tallies
        if (data.lastCompletedDate !== todayStr) {
          // If the difference between last completed date and today is more than 1 day (streak broken)
          // we can reset streak or handle streaks. Let's calculate streaks.
          const statsCopy = { ...data };
          statsCopy.totalFocusToday = 0;
          statsCopy.totalBreakToday = 0;
          statsCopy.sessionsCompletedToday = 0;

          // Streak validation: if last completed was yesterday, streak continues, else breaks
          if (data.lastCompletedDate) {
            const lastDate = new Date(data.lastCompletedDate);
            const today = new Date(todayStr);
            const diffTime = Math.abs(today.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 1) {
              statsCopy.currentStreak = 0;
            }
          } else {
            statsCopy.currentStreak = 0;
          }

          resolve(statsCopy);
        } else {
          resolve(data);
        }
      };

      request.onerror = () => {
        resolve({
          totalFocusToday: 0,
          totalBreakToday: 0,
          sessionsCompletedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailyGoalMins: 120,
          weeklyGoalMins: 600,
          monthlyGoalMins: 2400,
        });
      };
    });
  }

  static async saveStats(stats: PomodoroStats): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("stats", "readwrite");
      const store = transaction.objectStore("stats");
      const request = store.put(stats, "current_stats");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
