import { 
  db, 
  rtdb, 
  ref, 
  get, 
  set, 
  update, 
  onValue, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  User 
} from "../lib/firebase";
import { Storage } from "../utils/storage";
import { 
  PlaylistInfo, 
  SingleVideoInfo, 
  Bookmark, 
  Flashcard, 
  StudyPlanItem, 
  CourseFolder, 
  CustomSubjectFolder, 
  StudySessionLog, 
  StudySettings 
} from "../types";

export interface UserStudyDataPayload {
  playlists: PlaylistInfo[];
  singleVideos: SingleVideoInfo[];
  notes: Record<string, string>;
  bookmarks: Record<string, Bookmark[]>;
  flashcards: Flashcard[];
  studyPlans: StudyPlanItem[];
  courseFolders: CourseFolder[];
  customSubjects: CustomSubjectFolder[];
  favorites: { playlists: string[]; videos: string[] };
  pomodoroLogs: StudySessionLog[];
  settings: StudySettings;
  lastSyncedAt: number;
  version: number;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

type SyncListener = (status: SyncStatus, lastSyncedAt: number | null, error?: string | null) => void;

class CloudSyncService {
  private currentUserId: string | null = null;
  private syncStatus: SyncStatus = "idle";
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private unsubscribeFirestore: (() => void) | null = null;
  private unsubscribeRtdb: (() => void) | null = null;
  private isApplyingRemoteChange = false;

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.syncStatus, this.lastSyncedAt, this.lastError);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus, error: string | null = null) {
    this.syncStatus = status;
    this.lastError = error;
    if (status === "synced") {
      this.lastSyncedAt = Date.now();
    }
    this.listeners.forEach((l) => l(this.syncStatus, this.lastSyncedAt, this.lastError));
  }

  public getStatus(): { status: SyncStatus; lastSyncedAt: number | null; error: string | null } {
    return {
      status: this.syncStatus,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError
    };
  }

  /**
   * Initializes sync for an authenticated user.
   * Pulls remote data, merges with local state, pushes merged data, and registers real-time listeners.
   */
  public async initializeForUser(user: User): Promise<void> {
    if (this.currentUserId === user.uid && this.syncStatus === "synced") {
      return;
    }

    this.cleanup();
    this.currentUserId = user.uid;
    this.setStatus("syncing");

    try {
      // 1. Fetch remote data from Firestore and/or Realtime Database
      let remoteData = await this.fetchRemoteData(user.uid);

      // 2. Read current local storage
      const localData = this.collectLocalData();

      if (remoteData) {
        // Merge remote and local data
        const mergedData = this.mergeData(localData, remoteData);
        // Apply merged data to local storage
        this.isApplyingRemoteChange = true;
        this.applyDataToLocalStorage(mergedData);
        this.isApplyingRemoteChange = false;

        // Push merged state back to cloud
        await this.pushDataToCloud(user.uid, mergedData);
      } else {
        // First time cloud sync for this user: upload current local data
        await this.pushDataToCloud(user.uid, localData);
      }

      this.setStatus("synced");

      // 3. Register real-time sync listeners
      this.setupRealtimeListeners(user.uid);
    } catch (err: any) {
      console.warn("Initial Cloud Sync warning:", err);
      this.setStatus("error", err?.message || "Failed to initialize cloud sync");
    }
  }

  /**
   * Stops sync and clears listeners when user logs out.
   */
  public handleUserSignOut(): void {
    this.cleanup();
    this.currentUserId = null;
    this.setStatus("idle");
  }

  private cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    if (this.unsubscribeRtdb) {
      this.unsubscribeRtdb();
      this.unsubscribeRtdb = null;
    }
  }

  /**
   * Triggered whenever local data changes in the app. Debounces and uploads to cloud.
   */
  public triggerAutoSync(): void {
    if (!this.currentUserId || this.isApplyingRemoteChange) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (!this.currentUserId) return;
      try {
        this.setStatus("syncing");
        const currentData = this.collectLocalData();
        await this.pushDataToCloud(this.currentUserId, currentData);
        this.setStatus("synced");
      } catch (e: any) {
        console.warn("Auto-sync error:", e);
        this.setStatus("error", e?.message || "Auto-sync failed");
      }
    }, 1500); // 1.5s debounce
  }

  /**
   * Manual force sync triggered by the user
   */
  public async syncNow(): Promise<boolean> {
    if (!this.currentUserId) {
      this.setStatus("offline", "Sign in with Google to enable cloud sync");
      return false;
    }

    try {
      this.setStatus("syncing");
      const remoteData = await this.fetchRemoteData(this.currentUserId);
      const localData = this.collectLocalData();

      const mergedData = remoteData ? this.mergeData(localData, remoteData) : localData;
      
      this.isApplyingRemoteChange = true;
      this.applyDataToLocalStorage(mergedData);
      this.isApplyingRemoteChange = false;

      await this.pushDataToCloud(this.currentUserId, mergedData);
      this.setStatus("synced");
      return true;
    } catch (e: any) {
      console.error("Manual sync failed:", e);
      this.setStatus("error", e?.message || "Cloud sync failed");
      return false;
    }
  }

  private collectLocalData(): UserStudyDataPayload {
    return {
      playlists: Storage.getPlaylists(),
      singleVideos: Storage.getSingleVideos(),
      notes: Storage.getNotes(),
      bookmarks: Storage.getBookmarks(),
      flashcards: Storage.getFlashcards(),
      studyPlans: Storage.getStudyPlans(),
      courseFolders: Storage.getCourseFolders(),
      customSubjects: Storage.getCustomSubjects(),
      favorites: Storage.getFavorites(),
      pomodoroLogs: Storage.getStudyLogs(),
      settings: Storage.getSettings(),
      lastSyncedAt: Date.now(),
      version: 2
    };
  }

  private applyDataToLocalStorage(data: UserStudyDataPayload): void {
    if (data.playlists) Storage.savePlaylists(data.playlists);
    if (data.singleVideos) Storage.saveSingleVideos(data.singleVideos);
    if (data.notes) {
      localStorage.setItem("studytube_notes", JSON.stringify(data.notes));
    }
    if (data.bookmarks) {
      localStorage.setItem("studytube_bookmarks", JSON.stringify(data.bookmarks));
    }
    if (data.flashcards) Storage.saveFlashcards(data.flashcards);
    if (data.studyPlans) Storage.saveStudyPlans(data.studyPlans);
    if (data.courseFolders) Storage.saveCourseFolders(data.courseFolders);
    if (data.customSubjects) Storage.saveCustomSubjects(data.customSubjects);
    if (data.favorites) {
      localStorage.setItem("studytube_favorites", JSON.stringify(data.favorites));
    }
    if (data.pomodoroLogs) {
      localStorage.setItem("studytube_pomodoro_logs", JSON.stringify(data.pomodoroLogs));
    }
    if (data.settings) {
      Storage.saveSettings(data.settings);
    }

    // Trigger local events to refresh React state across components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_playlists_updated"));
      window.dispatchEvent(new Event("studytube_single_videos_updated"));
      window.dispatchEvent(new Event("studytube_custom_subjects_updated"));
      window.dispatchEvent(new Event("storage"));
    }
  }

  private mergeData(local: UserStudyDataPayload, remote: UserStudyDataPayload): UserStudyDataPayload {
    // 1. Merge Playlists
    const playlistMap = new Map<string, PlaylistInfo>();
    (remote.playlists || []).forEach(p => playlistMap.set(p.id, p));
    (local.playlists || []).forEach(localPl => {
      const remotePl = playlistMap.get(localPl.id);
      if (!remotePl) {
        playlistMap.set(localPl.id, localPl);
      } else {
        // Merge video progress inside playlist
        const videoMap = new Map<string, any>();
        (remotePl.videos || []).forEach(v => videoMap.set(v.id, v));
        (localPl.videos || []).forEach(localVid => {
          const remoteVid = videoMap.get(localVid.id);
          if (!remoteVid) {
            videoMap.set(localVid.id, localVid);
          } else {
            videoMap.set(localVid.id, {
              ...remoteVid,
              ...localVid,
              progress: Math.max(localVid.progress || 0, remoteVid.progress || 0),
              completed: localVid.completed || remoteVid.completed
            });
          }
        });

        playlistMap.set(localPl.id, {
          ...remotePl,
          ...localPl,
          lastWatchedAt: new Date(localPl.lastWatchedAt) > new Date(remotePl.lastWatchedAt || 0) ? localPl.lastWatchedAt : remotePl.lastWatchedAt,
          videos: Array.from(videoMap.values())
        });
      }
    });

    // 2. Merge Single Videos
    const videoMap = new Map<string, SingleVideoInfo>();
    (remote.singleVideos || []).forEach(v => videoMap.set(v.id, v));
    (local.singleVideos || []).forEach(localVid => {
      const remoteVid = videoMap.get(localVid.id);
      if (!remoteVid) {
        videoMap.set(localVid.id, localVid);
      } else {
        videoMap.set(localVid.id, {
          ...remoteVid,
          ...localVid,
          progress: Math.max(localVid.progress || 0, remoteVid.progress || 0),
          completed: localVid.completed || remoteVid.completed,
          lastWatchedAt: new Date(localVid.lastWatchedAt) > new Date(remoteVid.lastWatchedAt || 0) ? localVid.lastWatchedAt : remoteVid.lastWatchedAt
        });
      }
    });

    // 3. Merge Notes
    const notes: Record<string, string> = { ...(remote.notes || {}), ...(local.notes || {}) };

    // 4. Merge Bookmarks
    const bookmarks: Record<string, Bookmark[]> = { ...(remote.bookmarks || {}) };
    Object.entries(local.bookmarks || {}).forEach(([vid, list]) => {
      const existing = bookmarks[vid] || [];
      const combined = [...existing];
      list.forEach(b => {
        if (!combined.some(c => Math.floor(c.timestamp) === Math.floor(b.timestamp))) {
          combined.push(b);
        }
      });
      bookmarks[vid] = combined;
    });

    // 5. Merge Flashcards
    const flashcardMap = new Map<string, Flashcard>();
    (remote.flashcards || []).forEach(f => flashcardMap.set(f.id, f));
    (local.flashcards || []).forEach(f => flashcardMap.set(f.id, f));

    // 6. Merge Study Plans
    const planMap = new Map<string, StudyPlanItem>();
    (remote.studyPlans || []).forEach(p => planMap.set(p.id, p));
    (local.studyPlans || []).forEach(p => planMap.set(p.id, p));

    // 7. Merge Custom Subjects & Folders
    const subjectMap = new Map<string, CustomSubjectFolder>();
    (remote.customSubjects || []).forEach(s => subjectMap.set(s.id, s));
    (local.customSubjects || []).forEach(s => subjectMap.set(s.id, s));

    // 8. Merge Favorites
    const favPlaylists = Array.from(new Set([...(remote.favorites?.playlists || []), ...(local.favorites?.playlists || [])]));
    const favVideos = Array.from(new Set([...(remote.favorites?.videos || []), ...(local.favorites?.videos || [])]));

    const mergedSettings: StudySettings = {
      ...local.settings,
      ...(remote.settings || {})
    };

    return {
      playlists: Array.from(playlistMap.values()),
      singleVideos: Array.from(videoMap.values()),
      notes,
      bookmarks,
      flashcards: Array.from(flashcardMap.values()),
      studyPlans: Array.from(planMap.values()),
      courseFolders: local.courseFolders?.length ? local.courseFolders : (remote.courseFolders || []),
      customSubjects: Array.from(subjectMap.values()),
      favorites: { playlists: favPlaylists, videos: favVideos },
      pomodoroLogs: Array.from(new Set([...(local.pomodoroLogs || []), ...(remote.pomodoroLogs || [])])),
      settings: mergedSettings,
      lastSyncedAt: Date.now(),
      version: 2
    };
  }

  private async fetchRemoteData(userId: string): Promise<UserStudyDataPayload | null> {
    // Try Realtime Database first for low-latency live JSON
    if (rtdb) {
      try {
        const studyRef = ref(rtdb, `users/${userId}/studyData`);
        const snap = await get(studyRef);
        if (snap.exists()) {
          return snap.val() as UserStudyDataPayload;
        }
      } catch (err) {
        console.warn("RTDB fetch notice:", err);
      }
    }

    // Try Firestore as persistent secondary store
    try {
      const docRef = doc(db, "users", userId, "studyData", "main");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserStudyDataPayload;
      }
    } catch (err) {
      console.warn("Firestore fetch notice:", err);
    }

    return null;
  }

  private async pushDataToCloud(userId: string, data: UserStudyDataPayload): Promise<void> {
    const payload = {
      ...data,
      lastSyncedAt: Date.now()
    };

    let pushed = false;

    // 1. Push to Realtime Database
    if (rtdb) {
      try {
        const studyRef = ref(rtdb, `users/${userId}/studyData`);
        await set(studyRef, payload);
        pushed = true;
      } catch (err) {
        console.warn("RTDB save notice:", err);
      }
    }

    // 2. Push to Firestore
    try {
      const docRef = doc(db, "users", userId, "studyData", "main");
      await setDoc(docRef, payload, { merge: true });
      pushed = true;
    } catch (err) {
      console.warn("Firestore save notice:", err);
    }

    if (!pushed) {
      throw new Error("Could not sync data to Firebase cloud storage.");
    }
  }

  private setupRealtimeListeners(userId: string): void {
    // Realtime Database listener
    if (rtdb) {
      try {
        const studyRef = ref(rtdb, `users/${userId}/studyData`);
        this.unsubscribeRtdb = onValue(studyRef, (snap) => {
          if (snap.exists() && !this.isApplyingRemoteChange) {
            const remoteData = snap.val() as UserStudyDataPayload;
            if (remoteData && remoteData.lastSyncedAt && (!this.lastSyncedAt || remoteData.lastSyncedAt > this.lastSyncedAt + 1000)) {
              this.isApplyingRemoteChange = true;
              this.applyDataToLocalStorage(remoteData);
              this.isApplyingRemoteChange = false;
              this.setStatus("synced");
            }
          }
        }, (err) => {
          console.warn("RTDB realtime listener notice:", err);
        });
      } catch (e) {
        console.warn("RTDB subscription setup notice:", e);
      }
    }

    // Firestore fallback listener
    try {
      const docRef = doc(db, "users", userId, "studyData", "main");
      this.unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && !this.isApplyingRemoteChange) {
          const remoteData = docSnap.data() as UserStudyDataPayload;
          if (remoteData && remoteData.lastSyncedAt && (!this.lastSyncedAt || remoteData.lastSyncedAt > this.lastSyncedAt + 1000)) {
            this.isApplyingRemoteChange = true;
            this.applyDataToLocalStorage(remoteData);
            this.isApplyingRemoteChange = false;
            this.setStatus("synced");
          }
        }
      }, (err) => {
        console.warn("Firestore subscription notice:", err);
      });
    } catch (e) {
      console.warn("Firestore subscription setup notice:", e);
    }
  }
}

export const cloudSync = new CloudSyncService();
