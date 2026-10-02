import { 
  rtdb, 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  onValue, 
  off, 
  db, 
  doc, 
  setDoc, 
  getDoc,
  User 
} from "../lib/firebase";
import { 
  PlaylistInfo, 
  SingleVideoInfo, 
  Bookmark, 
  StudySessionLog, 
  StudySettings,
  Flashcard,
  StudyPlanItem,
  CourseFolder,
  CustomSubjectFolder
} from "../types";

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  videoId?: string;
  videoTitle?: string;
  score: number;
  maxScore: number;
  percentage: number;
  completedAt: string; // ISO date
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: "lecture" | "exam" | "revision" | "quiz" | "custom";
  completed: boolean;
  notes?: string;
}

export interface UserDeveloperProfile {
  username: string;
  bio: string;
  githubUrl: string;
  portfolioUrl: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  skills: string[];
  contactEmail?: string;
  updatedAt: number;
}

export interface FeedbackSubmission {
  id: string;
  type: "feature" | "bug" | "praise" | "general";
  message: string;
  rating?: number;
  createdAt: string;
  status: "received" | "reviewed";
}

export interface UserAccountState {
  profile: {
    uid: string;
    name: string;
    email: string;
    photoURL: string;
    provider: "google";
    createdAt: number;
    lastLoginAt: number;
    accountStatus: "active" | "verified";
    profileUpdatedAt: number;
  };
  settings: StudySettings;
  dashboard: {
    layout: "default" | "compact" | "analytics" | "focus";
    pinnedItemIds: string[];
    widgetOrder: string[];
    hiddenWidgets: string[];
    welcomeDismissed?: boolean;
    updatedAt: number;
  };
  playlists: PlaylistInfo[];
  singleVideos: SingleVideoInfo[];
  notes: Record<string, string>; // videoId -> note markdown
  bookmarks: Record<string, Bookmark[]>; // videoId -> bookmarks array
  flashcards: Flashcard[];
  quizzes: {
    attempts: QuizAttempt[];
    bestScores: Record<string, number>; // quizId -> max score percentage
  };
  studyPlans: StudyPlanItem[];
  customSubjects: CustomSubjectFolder[];
  courseFolders: CourseFolder[];
  favorites: { 
    playlists: string[]; 
    videos: string[];
    courses: string[];
  };
  calendar: {
    events: CalendarEventItem[];
  };
  streaks: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string; // YYYY-MM-DD
    dailyActivity: Record<string, { secondsStudied: number; completedLectures: number; quizzesTaken: number }>;
  };
  pomodoro: {
    settings: {
      workDurationMinutes: number;
      shortBreakMinutes: number;
      longBreakMinutes: number;
      longBreakInterval: number;
      soundEnabled: boolean;
      autoStartBreaks: boolean;
      autoStartPomodoros: boolean;
    };
    sessions: StudySessionLog[];
  };
  progress: Record<string, {
    videoId: string;
    playlistId?: string;
    position: number;
    duration: string;
    percentage: number;
    completed: boolean;
    lastWatchedAt: number;
  }>;
  recent: {
    lastOpenedPlaylistId?: string;
    lastOpenedVideoId?: string;
    lastOpenedCategory?: string;
    lastOpenedFolder?: string;
    lastStudySessionAt?: number;
    recentSearches?: string[];
  };
  goals: {
    dailyGoalMinutes: number;
    targetLecturesPerWeek: number;
    examName?: string;
    examDate?: string;
    updatedAt: number;
  };
  developerProfile: UserDeveloperProfile;
  feedback: FeedbackSubmission[];
}

export const DEFAULT_ACCOUNT_SETTINGS: StudySettings = {
  playbackSpeed: 1,
  autoPlay: true,
  skipCompleted: false,
  theme: "system",
  enableShortcuts: true,
  userName: "",
  notificationsEnabled: true,
  soundEnabled: true,
  dailyGoalMinutes: 45,
  compactMode: false
};

const DEFAULT_COURSE_FOLDERS: CourseFolder[] = [
  { id: "c1", name: "Computer Science", color: "blue", playlistIds: [], singleVideoIds: [] },
  { id: "c2", name: "Mathematics & Physics", color: "purple", playlistIds: [], singleVideoIds: [] },
  { id: "c3", name: "General Engineering", color: "emerald", playlistIds: [], singleVideoIds: [] }
];

const DEFAULT_POMODORO_SETTINGS = {
  workDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  autoStartBreaks: false,
  autoStartPomodoros: false
};

const DEFAULT_DEVELOPER_PROFILE: UserDeveloperProfile = {
  username: "",
  bio: "Lifelong learner using LearnStudy for distraction-free deep work.",
  githubUrl: "",
  portfolioUrl: "",
  skills: ["React", "TypeScript", "AI Engineering"],
  updatedAt: Date.now()
};

type ChangeListener = () => void;

class UserAccountSyncService {
  private activeUid: string | null = null;
  private activeUser: User | null = null;
  private isLoaded: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncedAt: number | null = null;
  private activeListeners: { path: string; refObj: any; callback: (snap: any) => void }[] = [];
  private progressDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private genericDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private subscribers: Set<ChangeListener> = new Set();

  // In-memory single source of truth for the active user
  private state: UserAccountState = this.getEmptyState("");

  private getEmptyState(uid: string): UserAccountState {
    return {
      profile: {
        uid,
        name: "",
        email: "",
        photoURL: "",
        provider: "google",
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        accountStatus: "active",
        profileUpdatedAt: Date.now()
      },
      settings: { ...DEFAULT_ACCOUNT_SETTINGS },
      dashboard: {
        layout: "default",
        pinnedItemIds: [],
        widgetOrder: ["continue-learning", "stats", "today-tasks", "quick-access", "streak"],
        hiddenWidgets: [],
        updatedAt: Date.now()
      },
      playlists: [],
      singleVideos: [],
      notes: {},
      bookmarks: {},
      flashcards: [],
      quizzes: {
        attempts: [],
        bestScores: {}
      },
      studyPlans: [],
      customSubjects: [],
      courseFolders: [...DEFAULT_COURSE_FOLDERS],
      favorites: { playlists: [], videos: [], courses: [] },
      calendar: {
        events: []
      },
      streaks: {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: "",
        dailyActivity: {}
      },
      pomodoro: {
        settings: { ...DEFAULT_POMODORO_SETTINGS },
        sessions: []
      },
      progress: {},
      recent: {},
      goals: {
        dailyGoalMinutes: 45,
        targetLecturesPerWeek: 10,
        updatedAt: Date.now()
      },
      developerProfile: { ...DEFAULT_DEVELOPER_PROFILE },
      feedback: []
    };
  }

  public subscribe(fn: ChangeListener): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify() {
    this.lastSyncedAt = Date.now();
    this.subscribers.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error("Subscriber notification error:", e);
      }
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("learnstudy_account_updated"));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("studytube_playlists_updated"));
      window.dispatchEvent(new Event("studytube_single_videos_updated"));
      window.dispatchEvent(new Event("studytube_custom_subjects_updated"));
      window.dispatchEvent(new Event("studytube_logs_updated"));
      window.dispatchEvent(new Event("studytube_settings_updated"));
    }
  }

  public hasActiveUser(): boolean {
    return Boolean(this.activeUid && this.isLoaded);
  }

  public getActiveUid(): string | null {
    return this.activeUid;
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncedAt(): number | null {
    return this.lastSyncedAt;
  }

  /**
   * Initializes the account upon login.
   * Loads user data from Firebase Realtime Database and attaches real-time listeners across all scoped trees.
   */
  public async handleUserLogin(user: User): Promise<void> {
    if (this.activeUid === user.uid && this.isLoaded) {
      return;
    }

    this.handleUserLogout();

    this.activeUid = user.uid;
    this.activeUser = user;
    this.isSyncing = true;
    this.state = this.getEmptyState(user.uid);

    // Populate profile from auth credential
    this.state.profile = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Learner",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider: "google",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      accountStatus: "active",
      profileUpdatedAt: Date.now()
    };
    if (this.state.profile.name) {
      this.state.settings.userName = this.state.profile.name;
      this.state.developerProfile.username = this.state.profile.name;
    }

    try {
      if (rtdb) {
        const userRootRef = ref(rtdb, `users/${user.uid}`);
        const snapshot = await get(userRootRef);

        if (snapshot.exists()) {
          const cloudData = snapshot.val();
          this.applyCloudSnapshot(cloudData);
        } else {
          // Initialize fresh cloud account tree in RTDB
          await this.saveWholeAccountToRtdb();
        }

        // Update profile in cloud
        const profileRef = ref(rtdb, `users/${user.uid}/profile`);
        await update(profileRef, {
          name: this.state.profile.name,
          email: this.state.profile.email,
          photoURL: this.state.profile.photoURL,
          lastLoginAt: Date.now()
        });

        // Register targeted Realtime Database listeners for live multi-device synchronization
        this.setupRealtimeListeners(user.uid);
      }
    } catch (err) {
      console.warn("RTDB initial account load notice:", err);
      // Fallback: load from Firestore
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fsData = docSnap.data();
          if (fsData.accountState) {
            this.applyCloudSnapshot(fsData.accountState);
          }
        }
      } catch (fsErr) {
        console.warn("Firestore fallback notice:", fsErr);
      }
    } finally {
      this.isLoaded = true;
      this.isSyncing = false;
      this.lastSyncedAt = Date.now();
      this.notify();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("learnstudy_account_loaded"));
      }
    }
  }

  /**
   * Cleans all active listeners and wipes all user memory state upon logout.
   * Completely prevents data leakage to subsequent users.
   */
  public handleUserLogout(): void {
    this.progressDebounceTimers.forEach((t) => clearTimeout(t));
    this.progressDebounceTimers.clear();
    this.genericDebounceTimers.forEach((t) => clearTimeout(t));
    this.genericDebounceTimers.clear();

    this.activeListeners.forEach(({ refObj, callback }) => {
      try {
        off(refObj, "value", callback);
      } catch (e) {
        // ignore
      }
    });
    this.activeListeners = [];

    this.activeUid = null;
    this.activeUser = null;
    this.isLoaded = false;
    this.isSyncing = false;
    this.lastSyncedAt = null;
    this.state = this.getEmptyState("");

    this.notify();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("learnstudy_account_cleared"));
    }
  }

  private applyCloudSnapshot(cloudData: any) {
    if (!cloudData || typeof cloudData !== "object") return;

    if (cloudData.profile) {
      this.state.profile = { ...this.state.profile, ...cloudData.profile };
    }
    if (cloudData.settings) {
      this.state.settings = { ...DEFAULT_ACCOUNT_SETTINGS, ...cloudData.settings };
    }
    if (cloudData.dashboard) {
      this.state.dashboard = { ...this.state.dashboard, ...cloudData.dashboard };
    }
    if (cloudData.playlists) {
      this.state.playlists = Array.isArray(cloudData.playlists)
        ? cloudData.playlists.filter(Boolean)
        : Object.values(cloudData.playlists);
    }
    if (cloudData.singleVideos) {
      this.state.singleVideos = Array.isArray(cloudData.singleVideos)
        ? cloudData.singleVideos.filter(Boolean)
        : Object.values(cloudData.singleVideos);
    }
    if (cloudData.notes) {
      this.state.notes = typeof cloudData.notes === "object" ? cloudData.notes : {};
    }
    if (cloudData.bookmarks) {
      this.state.bookmarks = typeof cloudData.bookmarks === "object" ? cloudData.bookmarks : {};
    }
    if (cloudData.flashcards) {
      this.state.flashcards = Array.isArray(cloudData.flashcards)
        ? cloudData.flashcards.filter(Boolean)
        : Object.values(cloudData.flashcards);
    }
    if (cloudData.quizzes) {
      this.state.quizzes = {
        attempts: Array.isArray(cloudData.quizzes.attempts) ? cloudData.quizzes.attempts : [],
        bestScores: typeof cloudData.quizzes.bestScores === "object" ? cloudData.quizzes.bestScores : {}
      };
    }
    if (cloudData.studyPlans) {
      this.state.studyPlans = Array.isArray(cloudData.studyPlans)
        ? cloudData.studyPlans.filter(Boolean)
        : Object.values(cloudData.studyPlans);
    }
    if (cloudData.customSubjects) {
      this.state.customSubjects = Array.isArray(cloudData.customSubjects)
        ? cloudData.customSubjects.filter(Boolean)
        : Object.values(cloudData.customSubjects);
    }
    if (cloudData.courseFolders) {
      this.state.courseFolders = Array.isArray(cloudData.courseFolders)
        ? cloudData.courseFolders.filter(Boolean)
        : Object.values(cloudData.courseFolders);
    }
    if (cloudData.favorites) {
      this.state.favorites = {
        playlists: Array.isArray(cloudData.favorites.playlists) ? cloudData.favorites.playlists : [],
        videos: Array.isArray(cloudData.favorites.videos) ? cloudData.favorites.videos : [],
        courses: Array.isArray(cloudData.favorites.courses) ? cloudData.favorites.courses : []
      };
    }
    if (cloudData.calendar) {
      this.state.calendar = {
        events: Array.isArray(cloudData.calendar.events) ? cloudData.calendar.events : []
      };
    }
    if (cloudData.streaks) {
      this.state.streaks = {
        ...this.state.streaks,
        ...cloudData.streaks
      };
    }
    if (cloudData.pomodoro) {
      this.state.pomodoro = {
        settings: { ...DEFAULT_POMODORO_SETTINGS, ...(cloudData.pomodoro?.settings || {}) },
        sessions: Array.isArray(cloudData.pomodoro?.sessions)
          ? cloudData.pomodoro.sessions.filter(Boolean)
          : Array.isArray(cloudData.pomodoroLogs)
          ? cloudData.pomodoroLogs.filter(Boolean)
          : []
      };
    } else if (cloudData.pomodoroLogs) {
      this.state.pomodoro.sessions = Array.isArray(cloudData.pomodoroLogs) ? cloudData.pomodoroLogs : [];
    }
    if (cloudData.progress) {
      this.state.progress = typeof cloudData.progress === "object" ? cloudData.progress : {};
    }
    if (cloudData.recent) {
      this.state.recent = typeof cloudData.recent === "object" ? cloudData.recent : {};
    }
    if (cloudData.goals) {
      this.state.goals = { ...this.state.goals, ...cloudData.goals };
    }
    if (cloudData.developerProfile) {
      this.state.developerProfile = { ...DEFAULT_DEVELOPER_PROFILE, ...cloudData.developerProfile };
    }
    if (cloudData.feedback) {
      this.state.feedback = Array.isArray(cloudData.feedback) ? cloudData.feedback : [];
    }
  }

  private setupRealtimeListeners(uid: string) {
    if (!rtdb) return;

    const watchSubtree = (subPath: string, onUpdate: (val: any) => void) => {
      try {
        const subtreeRef = ref(rtdb!, `users/${uid}/${subPath}`);
        const callback = (snap: any) => {
          if (this.activeUid !== uid) return;
          if (snap.exists()) {
            onUpdate(snap.val());
            this.notify();
          }
        };
        onValue(subtreeRef, callback);
        this.activeListeners.push({ path: subPath, refObj: subtreeRef, callback });
      } catch (e) {
        console.warn(`RTDB listener registration failed for ${subPath}:`, e);
      }
    };

    // 1. Settings listener
    watchSubtree("settings", (val) => {
      this.state.settings = { ...DEFAULT_ACCOUNT_SETTINGS, ...val };
    });

    // 2. Dashboard listener
    watchSubtree("dashboard", (val) => {
      this.state.dashboard = { ...this.state.dashboard, ...val };
    });

    // 3. Playlists listener
    watchSubtree("playlists", (val) => {
      this.state.playlists = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 4. Single videos listener
    watchSubtree("singleVideos", (val) => {
      this.state.singleVideos = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 5. Notes listener
    watchSubtree("notes", (val) => {
      this.state.notes = typeof val === "object" ? val : {};
    });

    // 6. Bookmarks listener
    watchSubtree("bookmarks", (val) => {
      this.state.bookmarks = typeof val === "object" ? val : {};
    });

    // 7. Flashcards listener
    watchSubtree("flashcards", (val) => {
      this.state.flashcards = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 8. Quizzes listener
    watchSubtree("quizzes", (val) => {
      this.state.quizzes = {
        attempts: Array.isArray(val?.attempts) ? val.attempts : [],
        bestScores: typeof val?.bestScores === "object" ? val.bestScores : {}
      };
    });

    // 9. Study Plans listener
    watchSubtree("studyPlans", (val) => {
      this.state.studyPlans = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 10. Custom subjects listener
    watchSubtree("customSubjects", (val) => {
      this.state.customSubjects = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 11. Course Folders listener
    watchSubtree("courseFolders", (val) => {
      this.state.courseFolders = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
    });

    // 12. Favorites listener
    watchSubtree("favorites", (val) => {
      this.state.favorites = {
        playlists: Array.isArray(val?.playlists) ? val.playlists : [],
        videos: Array.isArray(val?.videos) ? val.videos : [],
        courses: Array.isArray(val?.courses) ? val.courses : []
      };
    });

    // 13. Pomodoro listener
    watchSubtree("pomodoro", (val) => {
      if (val) {
        this.state.pomodoro = {
          settings: { ...DEFAULT_POMODORO_SETTINGS, ...(val.settings || {}) },
          sessions: Array.isArray(val.sessions) ? val.sessions : []
        };
      }
    });

    // 14. Calendar listener
    watchSubtree("calendar", (val) => {
      this.state.calendar = {
        events: Array.isArray(val?.events) ? val.events : []
      };
    });

    // 15. Streaks listener
    watchSubtree("streaks", (val) => {
      this.state.streaks = { ...this.state.streaks, ...val };
    });

    // 16. Playback progress listener
    watchSubtree("progress", (val) => {
      this.state.progress = typeof val === "object" ? val : {};
    });

    // 17. Recent state listener
    watchSubtree("recent", (val) => {
      this.state.recent = typeof val === "object" ? val : {};
    });

    // 18. Goals listener
    watchSubtree("goals", (val) => {
      this.state.goals = { ...this.state.goals, ...val };
    });

    // 19. Developer profile listener
    watchSubtree("developerProfile", (val) => {
      this.state.developerProfile = { ...DEFAULT_DEVELOPER_PROFILE, ...val };
    });

    // 20. Feedback listener
    watchSubtree("feedback", (val) => {
      this.state.feedback = Array.isArray(val) ? val : [];
    });
  }

  private async saveWholeAccountToRtdb(): Promise<void> {
    if (!this.activeUid || !rtdb) return;
    try {
      const userRef = ref(rtdb, `users/${this.activeUid}`);
      await set(userRef, this.state);
    } catch (e) {
      console.warn("saveWholeAccountToRtdb warning:", e);
    }
  }

  // ==========================================
  // GRANULAR STATE ACCESSORS & MUTATORS (RTDB)
  // ==========================================

  // --- DASHBOARD ---
  public getDashboardPreferences() {
    return { ...this.state.dashboard };
  }

  public saveDashboardPreferences(dashboard: Partial<UserAccountState["dashboard"]>) {
    this.state.dashboard = {
      ...this.state.dashboard,
      ...dashboard,
      updatedAt: Date.now()
    };
    this.notify();
    if (this.activeUid && rtdb) {
      const dRef = ref(rtdb, `users/${this.activeUid}/dashboard`);
      set(dRef, this.state.dashboard).catch((e) => console.warn("Save dashboard RTDB error:", e));
    }
  }

  // --- PLAYLISTS ---
  public getPlaylists(): PlaylistInfo[] {
    return [...this.state.playlists];
  }

  public savePlaylists(playlists: PlaylistInfo[]) {
    this.state.playlists = [...playlists];
    this.notify();
    if (this.activeUid && rtdb) {
      const pRef = ref(rtdb, `users/${this.activeUid}/playlists`);
      set(pRef, playlists).catch((e) => console.warn("Save playlists RTDB error:", e));
    }
  }

  public savePlaylist(playlist: PlaylistInfo) {
    const list = [...this.state.playlists];
    const idx = list.findIndex((p) => p.id === playlist.id);
    if (idx > -1) {
      list[idx] = playlist;
    } else {
      list.unshift(playlist);
    }
    this.savePlaylists(list);
  }

  public deletePlaylist(id: string) {
    const list = this.state.playlists.filter((p) => p.id !== id);
    this.savePlaylists(list);
  }

  // --- SINGLE VIDEOS ---
  public getSingleVideos(): SingleVideoInfo[] {
    return [...this.state.singleVideos];
  }

  public saveSingleVideos(videos: SingleVideoInfo[]) {
    this.state.singleVideos = [...videos];
    this.notify();
    if (this.activeUid && rtdb) {
      const vRef = ref(rtdb, `users/${this.activeUid}/singleVideos`);
      set(vRef, videos).catch((e) => console.warn("Save single videos RTDB error:", e));
    }
  }

  public saveSingleVideo(video: SingleVideoInfo) {
    const list = [...this.state.singleVideos];
    const idx = list.findIndex((v) => v.id === video.id);
    if (idx > -1) {
      list[idx] = video;
    } else {
      list.unshift(video);
    }
    this.saveSingleVideos(list);
  }

  public deleteSingleVideo(id: string) {
    const list = this.state.singleVideos.filter((v) => v.id !== id);
    this.saveSingleVideos(list);
  }

  // --- NOTES ---
  public getNotes(): Record<string, string> {
    return { ...this.state.notes };
  }

  public getNoteForVideo(videoId: string): string {
    return this.state.notes[videoId] || "";
  }

  public saveNoteForVideo(videoId: string, markdown: string) {
    this.state.notes[videoId] = markdown;
    this.notify();
    if (this.activeUid && rtdb) {
      const nRef = ref(rtdb, `users/${this.activeUid}/notes/${videoId}`);
      set(nRef, markdown).catch((e) => console.warn("Save note RTDB error:", e));
    }
  }

  public deleteNoteForVideo(videoId: string) {
    delete this.state.notes[videoId];
    this.notify();
    if (this.activeUid && rtdb) {
      const nRef = ref(rtdb, `users/${this.activeUid}/notes/${videoId}`);
      remove(nRef).catch((e) => console.warn("Delete note RTDB error:", e));
    }
  }

  // --- BOOKMARKS ---
  public getBookmarks(): Record<string, Bookmark[]> {
    return { ...this.state.bookmarks };
  }

  public getBookmarksForVideo(videoId: string): Bookmark[] {
    return this.state.bookmarks[videoId] || [];
  }

  public saveBookmark(bookmark: Bookmark) {
    const list = [...(this.state.bookmarks[bookmark.videoId] || [])];
    const existsIdx = list.findIndex((b) => Math.floor(b.timestamp) === Math.floor(bookmark.timestamp));
    if (existsIdx > -1) {
      list[existsIdx] = bookmark;
    } else {
      list.push(bookmark);
    }
    list.sort((a, b) => a.timestamp - b.timestamp);
    this.state.bookmarks[bookmark.videoId] = list;
    this.notify();

    if (this.activeUid && rtdb) {
      const bRef = ref(rtdb, `users/${this.activeUid}/bookmarks/${bookmark.videoId}`);
      set(bRef, list).catch((e) => console.warn("Save bookmark RTDB error:", e));
    }
  }

  public deleteBookmark(videoId: string, bookmarkId: string) {
    if (!this.state.bookmarks[videoId]) return;
    const list = this.state.bookmarks[videoId].filter((b) => b.id !== bookmarkId);
    this.state.bookmarks[videoId] = list;
    this.notify();

    if (this.activeUid && rtdb) {
      const bRef = ref(rtdb, `users/${this.activeUid}/bookmarks/${videoId}`);
      set(bRef, list).catch((e) => console.warn("Delete bookmark RTDB error:", e));
    }
  }

  public updateBookmarkLabel(videoId: string, bookmarkId: string, newLabel: string) {
    if (!this.state.bookmarks[videoId]) return;
    const list = [...this.state.bookmarks[videoId]];
    const b = list.find((x) => x.id === bookmarkId);
    if (b) {
      b.label = newLabel;
      this.state.bookmarks[videoId] = list;
      this.notify();

      if (this.activeUid && rtdb) {
        const bRef = ref(rtdb, `users/${this.activeUid}/bookmarks/${videoId}`);
        set(bRef, list).catch((e) => console.warn("Update bookmark RTDB error:", e));
      }
    }
  }

  // --- FLASHCARDS ---
  public getFlashcards(): Flashcard[] {
    return [...this.state.flashcards];
  }

  public saveFlashcards(cards: Flashcard[]) {
    this.state.flashcards = [...cards];
    this.notify();
    if (this.activeUid && rtdb) {
      const fRef = ref(rtdb, `users/${this.activeUid}/flashcards`);
      set(fRef, cards).catch((e) => console.warn("Save flashcards RTDB error:", e));
    }
  }

  public saveFlashcard(card: Flashcard) {
    const list = [...this.state.flashcards];
    const idx = list.findIndex((c) => c.id === card.id);
    if (idx > -1) {
      list[idx] = card;
    } else {
      list.unshift(card);
    }
    this.saveFlashcards(list);
  }

  public deleteFlashcard(id: string) {
    const list = this.state.flashcards.filter((c) => c.id !== id);
    this.saveFlashcards(list);
  }

  // --- QUIZZES ---
  public getQuizAttempts(): QuizAttempt[] {
    return [...this.state.quizzes.attempts];
  }

  public saveQuizAttempt(attempt: QuizAttempt) {
    const attempts = [attempt, ...this.state.quizzes.attempts];
    const currentBest = this.state.quizzes.bestScores[attempt.quizId] || 0;
    const bestScores = {
      ...this.state.quizzes.bestScores,
      [attempt.quizId]: Math.max(currentBest, attempt.percentage)
    };

    this.state.quizzes = { attempts, bestScores };
    this.notify();

    if (this.activeUid && rtdb) {
      const qRef = ref(rtdb, `users/${this.activeUid}/quizzes`);
      set(qRef, this.state.quizzes).catch((e) => console.warn("Save quiz attempt RTDB error:", e));
    }
  }

  // --- STUDY PLANS & TASKS ---
  public getStudyPlans(): StudyPlanItem[] {
    return [...this.state.studyPlans];
  }

  public saveStudyPlans(plans: StudyPlanItem[]) {
    this.state.studyPlans = [...plans];
    this.notify();
    if (this.activeUid && rtdb) {
      const spRef = ref(rtdb, `users/${this.activeUid}/studyPlans`);
      set(spRef, plans).catch((e) => console.warn("Save study plans RTDB error:", e));
    }
  }

  public saveStudyPlan(plan: StudyPlanItem) {
    const list = [...this.state.studyPlans];
    const idx = list.findIndex((p) => p.id === plan.id);
    if (idx > -1) {
      list[idx] = plan;
    } else {
      list.unshift(plan);
    }
    this.saveStudyPlans(list);
  }

  public deleteStudyPlan(id: string) {
    const list = this.state.studyPlans.filter((p) => p.id !== id);
    this.saveStudyPlans(list);
  }

  // --- COURSE FOLDERS ---
  public getCourseFolders(): CourseFolder[] {
    return this.state.courseFolders?.length ? [...this.state.courseFolders] : [...DEFAULT_COURSE_FOLDERS];
  }

  public saveCourseFolders(folders: CourseFolder[]) {
    this.state.courseFolders = [...folders];
    this.notify();
    if (this.activeUid && rtdb) {
      const cfRef = ref(rtdb, `users/${this.activeUid}/courseFolders`);
      set(cfRef, folders).catch((e) => console.warn("Save course folders RTDB error:", e));
    }
  }

  // --- CUSTOM SUBJECTS ---
  public getCustomSubjects(): CustomSubjectFolder[] {
    return [...this.state.customSubjects];
  }

  public saveCustomSubjects(subjects: CustomSubjectFolder[]) {
    this.state.customSubjects = [...subjects];
    this.notify();
    if (this.activeUid && rtdb) {
      const csRef = ref(rtdb, `users/${this.activeUid}/customSubjects`);
      set(csRef, subjects).catch((e) => console.warn("Save custom subjects RTDB error:", e));
    }
  }

  public saveCustomSubject(subject: CustomSubjectFolder) {
    const list = [...this.state.customSubjects];
    const idx = list.findIndex((s) => s.id === subject.id);
    if (idx > -1) {
      list[idx] = subject;
    } else {
      list.unshift(subject);
    }
    this.saveCustomSubjects(list);
  }

  public deleteCustomSubject(id: string) {
    const list = this.state.customSubjects.filter((s) => s.id !== id);
    this.saveCustomSubjects(list);
  }

  // --- FAVORITES ---
  public getFavorites(): { playlists: string[]; videos: string[]; courses: string[] } {
    return {
      playlists: [...(this.state.favorites?.playlists || [])],
      videos: [...(this.state.favorites?.videos || [])],
      courses: [...(this.state.favorites?.courses || [])]
    };
  }

  public saveFavorites(favs: { playlists: string[]; videos: string[]; courses?: string[] }) {
    this.state.favorites = {
      playlists: favs.playlists || [],
      videos: favs.videos || [],
      courses: favs.courses || []
    };
    this.notify();
    if (this.activeUid && rtdb) {
      const favRef = ref(rtdb, `users/${this.activeUid}/favorites`);
      set(favRef, this.state.favorites).catch((e) => console.warn("Save favorites RTDB error:", e));
    }
  }

  // --- SETTINGS ---
  public getSettings(): StudySettings {
    return { ...DEFAULT_ACCOUNT_SETTINGS, ...this.state.settings };
  }

  public saveSettings(settings: StudySettings) {
    this.state.settings = { ...DEFAULT_ACCOUNT_SETTINGS, ...settings };
    this.notify();
    if (this.activeUid && rtdb) {
      const sRef = ref(rtdb, `users/${this.activeUid}/settings`);
      set(sRef, settings).catch((e) => console.warn("Save settings RTDB error:", e));
    }
  }

  // --- POMODORO & STUDY SESSIONS ---
  public getPomodoroSettings() {
    return { ...DEFAULT_POMODORO_SETTINGS, ...this.state.pomodoro.settings };
  }

  public savePomodoroSettings(settings: Partial<typeof DEFAULT_POMODORO_SETTINGS>) {
    this.state.pomodoro.settings = {
      ...this.state.pomodoro.settings,
      ...settings
    };
    this.notify();
    if (this.activeUid && rtdb) {
      const pRef = ref(rtdb, `users/${this.activeUid}/pomodoro/settings`);
      set(pRef, this.state.pomodoro.settings).catch((e) => console.warn("Save pomodoro settings RTDB error:", e));
    }
  }

  public getStudyLogs(): StudySessionLog[] {
    return [...this.state.pomodoro.sessions];
  }

  public saveStudyLogs(logs: StudySessionLog[]) {
    this.state.pomodoro.sessions = [...logs];
    this.notify();
    if (this.activeUid && rtdb) {
      const logRef = ref(rtdb, `users/${this.activeUid}/pomodoro/sessions`);
      set(logRef, logs).catch((e) => console.warn("Save study logs RTDB error:", e));
    }
  }

  public addStudyTime(videoId: string, title: string, seconds: number) {
    const logs = [...this.state.pomodoro.sessions];
    const today = new Date().toLocaleDateString("en-CA");
    const existingIdx = logs.findIndex((l) => l.date === today && l.videoId === videoId);

    if (existingIdx > -1) {
      logs[existingIdx].secondsStudied += seconds;
    } else {
      logs.push({
        date: today,
        secondsStudied: seconds,
        videoId,
        videoTitle: title
      });
    }
    this.saveStudyLogs(logs);
    this.recordDailyActivity(today, seconds, 0);
  }

  // --- CALENDAR EVENTS ---
  public getCalendarEvents(): CalendarEventItem[] {
    return [...this.state.calendar.events];
  }

  public saveCalendarEvents(events: CalendarEventItem[]) {
    this.state.calendar.events = [...events];
    this.notify();
    if (this.activeUid && rtdb) {
      const cRef = ref(rtdb, `users/${this.activeUid}/calendar/events`);
      set(cRef, events).catch((e) => console.warn("Save calendar events RTDB error:", e));
    }
  }

  // --- STREAKS & DAILY ACTIVITY ---
  public getStreakInfo() {
    return { ...this.state.streaks };
  }

  public recordDailyActivity(date: string, seconds: number, completedLectures: number = 0) {
    const current = this.state.streaks.dailyActivity[date] || { secondsStudied: 0, completedLectures: 0, quizzesTaken: 0 };
    const updated = {
      ...this.state.streaks.dailyActivity,
      [date]: {
        secondsStudied: current.secondsStudied + seconds,
        completedLectures: current.completedLectures + completedLectures,
        quizzesTaken: current.quizzesTaken
      }
    };

    // Calculate streak
    const dates = Object.keys(updated).sort();
    let currentStreak = this.state.streaks.currentStreak;
    if (this.state.streaks.lastStudyDate !== date) {
      currentStreak += 1;
    }
    const longestStreak = Math.max(this.state.streaks.longestStreak, currentStreak);

    this.state.streaks = {
      currentStreak,
      longestStreak,
      lastStudyDate: date,
      dailyActivity: updated
    };
    this.notify();

    if (this.activeUid && rtdb) {
      const sRef = ref(rtdb, `users/${this.activeUid}/streaks`);
      set(sRef, this.state.streaks).catch((e) => console.warn("Save streaks RTDB error:", e));
    }
  }

  // --- PLAYBACK PROGRESS (Debounced) ---
  public saveProgressDebounced(
    videoId: string,
    data: {
      position: number;
      duration: string;
      percentage: number;
      completed: boolean;
      playlistId?: string;
    }
  ) {
    if (!videoId) return;

    this.state.progress[videoId] = {
      videoId,
      playlistId: data.playlistId,
      position: data.position,
      duration: data.duration,
      percentage: data.percentage,
      completed: data.completed,
      lastWatchedAt: Date.now()
    };

    if (!this.activeUid || !rtdb) return;

    const existingTimer = this.progressDebounceTimers.get(videoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.progressDebounceTimers.delete(videoId);
      if (this.activeUid && rtdb) {
        const progRef = ref(rtdb, `users/${this.activeUid}/progress/${videoId}`);
        set(progRef, this.state.progress[videoId]).catch((e) => console.warn("Save progress RTDB error:", e));
      }
    }, 1200);

    this.progressDebounceTimers.set(videoId, timer);
  }

  public getProgressForVideo(videoId: string) {
    return this.state.progress[videoId] || null;
  }

  // --- RECENT STATE ---
  public updateRecent(recentData: Partial<UserAccountState["recent"]>) {
    this.state.recent = {
      ...this.state.recent,
      ...recentData,
      lastStudySessionAt: Date.now()
    };
    this.notify();

    if (this.activeUid && rtdb) {
      const recRef = ref(rtdb, `users/${this.activeUid}/recent`);
      update(recRef, this.state.recent).catch((e) => console.warn("Save recent RTDB error:", e));
    }
  }

  public getRecent() {
    return { ...this.state.recent };
  }

  // --- GOALS ---
  public updateGoals(goalsData: Partial<UserAccountState["goals"]>) {
    this.state.goals = {
      ...this.state.goals,
      ...goalsData,
      updatedAt: Date.now()
    };
    this.notify();

    if (this.activeUid && rtdb) {
      const gRef = ref(rtdb, `users/${this.activeUid}/goals`);
      update(gRef, this.state.goals).catch((e) => console.warn("Save goals RTDB error:", e));
    }
  }

  public getGoals() {
    return { ...this.state.goals };
  }

  // --- DEVELOPER PROFILE ---
  public getDeveloperProfile(): UserDeveloperProfile {
    return { ...DEFAULT_DEVELOPER_PROFILE, ...this.state.developerProfile };
  }

  public saveDeveloperProfile(profile: Partial<UserDeveloperProfile>) {
    this.state.developerProfile = {
      ...this.state.developerProfile,
      ...profile,
      updatedAt: Date.now()
    };
    this.notify();

    if (this.activeUid && rtdb) {
      const devRef = ref(rtdb, `users/${this.activeUid}/developerProfile`);
      set(devRef, this.state.developerProfile).catch((e) => console.warn("Save developer profile RTDB error:", e));
    }
  }

  // --- FEEDBACK ---
  public getFeedbackSubmissions(): FeedbackSubmission[] {
    return [...this.state.feedback];
  }

  public submitFeedback(submission: Omit<FeedbackSubmission, "id" | "createdAt" | "status">): FeedbackSubmission {
    const newSubmission: FeedbackSubmission = {
      id: "fb_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      status: "received",
      ...submission
    };

    const updated = [newSubmission, ...this.state.feedback];
    this.state.feedback = updated;
    this.notify();

    if (this.activeUid && rtdb) {
      const fbRef = ref(rtdb, `users/${this.activeUid}/feedback`);
      set(fbRef, updated).catch((e) => console.warn("Save feedback RTDB error:", e));
    }

    return newSubmission;
  }

  // --- DERIVED STATISTICS ---
  public calculateDerivedStatistics() {
    const totalSecondsStudied = this.state.pomodoro.sessions.reduce((acc, s) => acc + (s.secondsStudied || 0), 0);
    
    let totalCompletedLectures = 0;
    this.state.playlists.forEach((p) => {
      p.videos?.forEach((v) => {
        if (v.completed) totalCompletedLectures++;
      });
    });
    this.state.singleVideos.forEach((v) => {
      if (v.completed) totalCompletedLectures++;
    });
    this.state.customSubjects.forEach((s) => {
      s.chapters?.forEach((ch) => {
        ch.lectures?.forEach((lec) => {
          if (lec.completed) totalCompletedLectures++;
        });
      });
    });

    const quizzesCompleted = this.state.quizzes.attempts.length;
    const flashcardsCount = this.state.flashcards.length;
    const notesCount = Object.keys(this.state.notes).length;
    const totalBookmarks = Object.values(this.state.bookmarks).reduce((acc, list) => acc + list.length, 0);

    return {
      totalSecondsStudied,
      totalStudyMinutes: Math.round(totalSecondsStudied / 60),
      totalCompletedLectures,
      quizzesCompleted,
      flashcardsCount,
      notesCount,
      totalBookmarks,
      currentStreak: this.state.streaks.currentStreak,
      longestStreak: this.state.streaks.longestStreak,
      savedPlaylistsCount: this.state.playlists.length,
      savedCoursesCount: this.state.customSubjects.length + this.state.courseFolders.length
    };
  }

  /**
   * Force instant sync with Firebase Realtime Database
   */
  public async forceCloudSync(): Promise<boolean> {
    if (!this.activeUid || !rtdb) return false;
    try {
      this.isSyncing = true;
      const userRootRef = ref(rtdb, `users/${this.activeUid}`);
      await set(userRootRef, this.state);
      this.lastSyncedAt = Date.now();
      return true;
    } catch (e) {
      console.error("forceCloudSync error:", e);
      return false;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const userAccountSync = new UserAccountSyncService();
