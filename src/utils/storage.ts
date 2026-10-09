import { 
  PlaylistInfo, 
  SingleVideoInfo, 
  Bookmark, 
  StudySessionLog, 
  StudySettings,
  Flashcard,
  StudyPlanItem,
  CourseFolder,
  CustomSubjectFolder,
  CourseChapter,
  ChapterLecture,
  UserProfile
} from "../types";
import { userAccountSync, DEFAULT_ACCOUNT_SETTINGS } from "../services/userAccountSync";

// Default settings for fallback
const DEFAULT_SETTINGS: StudySettings = { ...DEFAULT_ACCOUNT_SETTINGS };

function notifyStorageMutation(eventKey?: string) {
  if (typeof window !== "undefined") {
    if (eventKey) {
      window.dispatchEvent(new Event(eventKey));
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("studytube_data_updated"));
  }
}

export const Storage = {
  // Flashcards
  getFlashcards(): Flashcard[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getFlashcards();
    }
    try {
      const data = localStorage.getItem("studytube_guest_flashcards");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveFlashcards(flashcards: Flashcard[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveFlashcards(flashcards);
      return;
    }
    localStorage.setItem("studytube_guest_flashcards", JSON.stringify(flashcards));
    notifyStorageMutation();
  },

  saveFlashcard(card: Flashcard) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveFlashcard(card);
      return;
    }
    const cards = this.getFlashcards();
    const index = cards.findIndex(c => c.id === card.id);
    if (index > -1) {
      cards[index] = card;
    } else {
      cards.unshift(card);
    }
    this.saveFlashcards(cards);
  },

  deleteFlashcard(id: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.deleteFlashcard(id);
      return;
    }
    const cards = this.getFlashcards().filter(c => c.id !== id);
    this.saveFlashcards(cards);
  },

  // Study Plans / Homework Tasks
  getStudyPlans(): StudyPlanItem[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getStudyPlans();
    }
    try {
      const data = localStorage.getItem("studytube_guest_study_plans");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveStudyPlans(plans: StudyPlanItem[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveStudyPlans(plans);
      return;
    }
    localStorage.setItem("studytube_guest_study_plans", JSON.stringify(plans));
    notifyStorageMutation();
  },

  saveStudyPlan(plan: StudyPlanItem) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveStudyPlan(plan);
      return;
    }
    const plans = this.getStudyPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    if (index > -1) {
      plans[index] = plan;
    } else {
      plans.unshift(plan);
    }
    this.saveStudyPlans(plans);
  },

  deleteStudyPlan(id: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.deleteStudyPlan(id);
      return;
    }
    const plans = this.getStudyPlans().filter(p => p.id !== id);
    this.saveStudyPlans(plans);
  },

  // Course Folders (e.g. "Algorithms", "Machine Learning")
  getCourseFolders(): CourseFolder[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getCourseFolders();
    }
    try {
      const data = localStorage.getItem("studytube_guest_course_folders");
      return data ? JSON.parse(data) : [
        { id: "c1", name: "Computer Science", color: "blue", playlistIds: [], singleVideoIds: [] },
        { id: "c2", name: "Mathematics & Physics", color: "purple", playlistIds: [], singleVideoIds: [] },
        { id: "c3", name: "General Engineering", color: "emerald", playlistIds: [], singleVideoIds: [] }
      ];
    } catch {
      return [];
    }
  },

  saveCourseFolders(folders: CourseFolder[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveCourseFolders(folders);
      return;
    }
    localStorage.setItem("studytube_guest_course_folders", JSON.stringify(folders));
    notifyStorageMutation();
  },

  // Playlists
  getPlaylists(): PlaylistInfo[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getPlaylists();
    }
    try {
      const data = localStorage.getItem("studytube_guest_playlists");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePlaylists(playlists: PlaylistInfo[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.savePlaylists(playlists);
      return;
    }
    localStorage.setItem("studytube_guest_playlists", JSON.stringify(playlists));
    notifyStorageMutation("studytube_playlists_updated");
  },

  savePlaylist(playlist: PlaylistInfo) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.savePlaylist(playlist);
      return;
    }
    const playlists = this.getPlaylists();
    const index = playlists.findIndex((p) => p.id === playlist.id);
    if (index > -1) {
      playlists[index] = playlist;
    } else {
      playlists.push(playlist);
    }
    this.savePlaylists(playlists);
  },

  // Single Videos
  getSingleVideos(): SingleVideoInfo[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getSingleVideos();
    }
    try {
      const data = localStorage.getItem("studytube_guest_single_videos");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSingleVideos(videos: SingleVideoInfo[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveSingleVideos(videos);
      return;
    }
    localStorage.setItem("studytube_guest_single_videos", JSON.stringify(videos));
    notifyStorageMutation("studytube_single_videos_updated");
  },

  saveSingleVideo(video: SingleVideoInfo) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveSingleVideo(video);
      return;
    }
    const videos = this.getSingleVideos();
    const index = videos.findIndex((v) => v.id === video.id);
    if (index > -1) {
      videos[index] = video;
    } else {
      videos.push(video);
    }
    this.saveSingleVideos(videos);
  },

  // Notes
  getNotes(): Record<string, string> {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getNotes();
    }
    try {
      const data = localStorage.getItem("studytube_guest_notes");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getNoteForVideo(videoId: string): string {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getNoteForVideo(videoId);
    }
    return this.getNotes()[videoId] || "";
  },

  saveNoteForVideo(videoId: string, markdown: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveNoteForVideo(videoId, markdown);
      return;
    }
    const notes = this.getNotes();
    notes[videoId] = markdown;
    localStorage.setItem("studytube_guest_notes", JSON.stringify(notes));
    notifyStorageMutation();
  },

  deleteNoteForVideo(videoId: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveNoteForVideo(videoId, "");
      return;
    }
    const notes = this.getNotes();
    delete notes[videoId];
    localStorage.setItem("studytube_guest_notes", JSON.stringify(notes));
    notifyStorageMutation();
  },

  // Bookmarks
  getBookmarks(): Record<string, Bookmark[]> {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getBookmarks();
    }
    try {
      const data = localStorage.getItem("studytube_guest_bookmarks");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getBookmarksForVideo(videoId: string): Bookmark[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getBookmarksForVideo(videoId);
    }
    return this.getBookmarks()[videoId] || [];
  },

  saveBookmark(bookmark: Bookmark) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveBookmark(bookmark);
      return;
    }
    const bookmarks = this.getBookmarks();
    if (!bookmarks[bookmark.videoId]) {
      bookmarks[bookmark.videoId] = [];
    }
    const existsIdx = bookmarks[bookmark.videoId].findIndex(b => Math.floor(b.timestamp) === Math.floor(bookmark.timestamp));
    if (existsIdx > -1) {
      bookmarks[bookmark.videoId][existsIdx] = bookmark;
    } else {
      bookmarks[bookmark.videoId].push(bookmark);
    }
    bookmarks[bookmark.videoId].sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem("studytube_guest_bookmarks", JSON.stringify(bookmarks));
    notifyStorageMutation();
  },

  deleteBookmark(videoId: string, bookmarkId: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.deleteBookmark(videoId, bookmarkId);
      return;
    }
    const bookmarks = this.getBookmarks();
    if (bookmarks[videoId]) {
      bookmarks[videoId] = bookmarks[videoId].filter((b) => b.id !== bookmarkId);
      localStorage.setItem("studytube_guest_bookmarks", JSON.stringify(bookmarks));
      notifyStorageMutation();
    }
  },

  updateBookmarkLabel(videoId: string, bookmarkId: string, newLabel: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.updateBookmarkLabel(videoId, bookmarkId, newLabel);
      return;
    }
    const bookmarks = this.getBookmarks();
    if (bookmarks[videoId]) {
      const b = bookmarks[videoId].find(x => x.id === bookmarkId);
      if (b) {
        b.label = newLabel;
        localStorage.setItem("studytube_guest_bookmarks", JSON.stringify(bookmarks));
        notifyStorageMutation();
      }
    }
  },

  // Study Session Logs
  getStudyLogs(): StudySessionLog[] {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getStudyLogs();
    }
    try {
      const data = localStorage.getItem("studytube_guest_study_logs");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addStudyTime(videoId: string, title: string, seconds: number) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.addStudyTime(videoId, title, seconds);
      return;
    }
    const logs = this.getStudyLogs();
    const today = new Date().toLocaleDateString("en-CA");
    const existingLogIdx = logs.findIndex(l => l.date === today && l.videoId === videoId);
    if (existingLogIdx > -1) {
      logs[existingLogIdx].secondsStudied += seconds;
    } else {
      logs.push({
        date: today,
        secondsStudied: seconds,
        videoId,
        videoTitle: title
      });
    }
    localStorage.setItem("studytube_guest_study_logs", JSON.stringify(logs));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_logs_updated"));
    }
  },

  saveStudyLogs(logs: any[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveStudyLogs(logs);
      return;
    }
    localStorage.setItem("studytube_guest_study_logs", JSON.stringify(logs));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_logs_updated"));
    }
  },

  toggleDateStudied(dateStr: string, studyMinutes?: number) {
    const settings = this.getSettings();
    const targetMins = studyMinutes || settings.dailyGoalMinutes || 45;
    const targetSecs = targetMins * 60;
    const logs = this.getStudyLogs();
    const dateLogs = logs.filter(l => l.date === dateStr);
    const totalSeconds = dateLogs.reduce((acc, curr) => acc + curr.secondsStudied, 0);
    
    if (totalSeconds >= targetSecs) {
      const updatedLogs = logs.filter(l => l.date !== dateStr);
      this.saveStudyLogs(updatedLogs);
      return false;
    } else {
      const neededSeconds = targetSecs - totalSeconds;
      logs.push({
        date: dateStr,
        secondsStudied: neededSeconds > 0 ? neededSeconds : targetSecs,
        videoId: "manual",
        videoTitle: "Manual/Quick Study Session"
      });
      this.saveStudyLogs(logs);
      return true;
    }
  },

  // Settings
  getSettings(): StudySettings {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getSettings();
    }
    try {
      const data = localStorage.getItem("studytube_guest_settings");
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: StudySettings) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveSettings(settings);
      return;
    }
    localStorage.setItem("studytube_guest_settings", JSON.stringify(settings));
    if (settings.dailyGoalMinutes) {
      const hours = Math.max(1, Math.round(settings.dailyGoalMinutes / 60));
      localStorage.setItem("studytube_target_hours", String(hours));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_settings_updated"));
    }
    notifyStorageMutation();
  },

  // Custom Subjects with Chapter-wise Lectures
  getCustomSubjects(): CustomSubjectFolder[] {
    let rawList: CustomSubjectFolder[] = [];
    if (userAccountSync.hasActiveUser()) {
      rawList = userAccountSync.getCustomSubjects();
    } else {
      try {
        const data = localStorage.getItem("studytube_guest_custom_subjects");
        rawList = data ? JSON.parse(data) : [];
      } catch {
        rawList = [];
      }
    }
    // Remove legacy import folder completely as requested
    return rawList.filter(
      (s) => s && s.id !== "subject-imported-folder" && s.category !== "Imports" && s.subjectName?.toLowerCase() !== "imported lectures"
    );
  },

  saveCustomSubjects(subjects: CustomSubjectFolder[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveCustomSubjects(subjects);
      return;
    }
    localStorage.setItem("studytube_guest_custom_subjects", JSON.stringify(subjects));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_custom_subjects_updated"));
    }
    notifyStorageMutation("studytube_custom_subjects_updated");
  },

  saveCustomSubject(subject: CustomSubjectFolder) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveCustomSubject(subject);
      return;
    }
    const subjects = this.getCustomSubjects();
    const idx = subjects.findIndex((s) => s.id === subject.id);
    if (idx > -1) {
      subjects[idx] = subject;
    } else {
      subjects.unshift(subject);
    }
    this.saveCustomSubjects(subjects);
  },

  deleteCustomSubject(id: string) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.deleteCustomSubject(id);
      return;
    }
    const subjects = this.getCustomSubjects().filter((s) => s.id !== id);
    this.saveCustomSubjects(subjects);
  },

  // Progress debouncing
  saveProgressDebounced(
    videoId: string,
    data: {
      position: number;
      duration: string;
      percentage: number;
      completed: boolean;
      playlistId?: string;
    }
  ) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveProgressDebounced(videoId, data);
    }
  },

  // Progress synchronization across custom subjects & playlists
  syncVideoProgressToSubjects(
    videoId: string,
    progress: number,
    completed: boolean,
    lastWatchedPosition?: number,
    duration?: string
  ) {
    if (!videoId) return;
    const subjects = this.getCustomSubjects();
    let modified = false;

    subjects.forEach((subj) => {
      subj.chapters?.forEach((ch) => {
        ch.lectures?.forEach((lec) => {
          if (
            lec.youtubeVideoId === videoId ||
            (lec.videoUrl && lec.videoUrl.includes(videoId)) ||
            lec.id.includes(videoId)
          ) {
            modified = true;
            if (completed) {
              lec.completed = true;
              lec.progress = 100;
            } else {
              lec.progress = Math.max(lec.progress || 0, progress);
              if (progress >= 95) {
                lec.completed = true;
              }
            }
            if (lastWatchedPosition !== undefined) {
              lec.lastWatchedPosition = lastWatchedPosition;
            }
            if (duration && duration !== "10:00" && duration !== "0:00" && duration !== "LIVE") {
              lec.duration = duration;
            }
          }
        });
      });
    });

    if (modified) {
      this.saveCustomSubjects(subjects);
    }
  },

  setLectureCompletionEverywhere(videoId: string, completed: boolean) {
    if (!videoId) return;

    // 1. Sync custom subjects
    const subjects = this.getCustomSubjects();
    let subjectsModified = false;
    subjects.forEach((subj) => {
      subj.chapters?.forEach((ch) => {
        ch.lectures?.forEach((lec) => {
          if (
            lec.youtubeVideoId === videoId ||
            (lec.videoUrl && lec.videoUrl.includes(videoId)) ||
            lec.id.includes(videoId)
          ) {
            subjectsModified = true;
            lec.completed = completed;
            lec.progress = completed ? 100 : 0;
          }
        });
      });
    });
    if (subjectsModified) {
      this.saveCustomSubjects(subjects);
    }

    // 2. Sync playlists
    const playlists = this.getPlaylists();
    let playlistsModified = false;
    playlists.forEach((pl) => {
      let plVideoFound = false;
      pl.videos?.forEach((v) => {
        if (v.id === videoId) {
          playlistsModified = true;
          plVideoFound = true;
          v.completed = completed;
          v.progress = completed ? 100 : 0;
        }
      });
      if (plVideoFound && pl.videos && pl.videos.length > 0) {
        const completedCount = pl.videos.filter((v) => v.completed).length;
        pl.completedVideos = completedCount;
        pl.progress = Math.round((completedCount / (pl.totalVideos || pl.videos.length)) * 100);
      }
    });
    if (playlistsModified) {
      this.savePlaylists(playlists);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("studytube_playlists_updated"));
      }
    }

    // 3. Sync single videos
    const singles = this.getSingleVideos();
    let singlesModified = false;
    singles.forEach((v) => {
      if (v.id === videoId) {
        singlesModified = true;
        v.completed = completed;
        v.progress = completed ? 100 : 0;
      }
    });
    if (singlesModified) {
      this.saveSingleVideos(singles);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("studytube_single_videos_updated"));
      }
    }
  },

  // Import Folder in Course Library
  getOrCreateImportSubject(): CustomSubjectFolder {
    const subjects = this.getCustomSubjects();
    let importSubj = subjects.find(
      (s) => s.id === "subject-imported-folder" || s.subjectName.toLowerCase() === "imported lectures" || s.subjectName.toLowerCase() === "imports"
    );

    if (!importSubj) {
      importSubj = {
        id: "subject-imported-folder",
        subjectName: "Imported Lectures",
        category: "Imports",
        color: "blue",
        description: "Lectures and playlists imported directly from the Home page.",
        createdAt: new Date().toISOString(),
        chapters: []
      };
      this.saveCustomSubject(importSubj);
    }

    return importSubj;
  },

  addPlaylistToImportFolder(playlist: PlaylistInfo): CustomSubjectFolder {
    if (!playlist) return this.getOrCreateImportSubject();

    const importSubj = this.getOrCreateImportSubject();
    const playlistTitle = playlist.title || "Imported Playlist";
    const playlistId = playlist.id;

    const existingChapterIndex = importSubj.chapters.findIndex(
      (ch) => ch.id === `ch-import-pl-${playlistId}` || (ch.description && ch.description.includes(playlistId))
    );

    const convertedLectures: ChapterLecture[] = (playlist.videos || []).map((v: any, idx: number) => ({
      id: `lec-pl-${playlistId}-${v.id || idx}`,
      title: v.title || `Lecture ${idx + 1}`,
      videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
      youtubeVideoId: v.id,
      duration: v.duration || "15:00",
      completed: !!v.completed,
      progress: v.progress || 0,
      lastWatchedPosition: v.lastWatchedPosition || 0,
      lectureNumber: idx + 1
    }));

    if (existingChapterIndex > -1) {
      const existingCh = importSubj.chapters[existingChapterIndex];
      const existingLecMap = new Map<string, ChapterLecture>();
      existingCh.lectures.forEach((l) => {
        if (l.youtubeVideoId) existingLecMap.set(l.youtubeVideoId, l);
      });
      const mergedLectures = convertedLectures.map((lec) => {
        const prev = lec.youtubeVideoId ? existingLecMap.get(lec.youtubeVideoId) : undefined;
        if (prev) {
          return {
            ...lec,
            completed: prev.completed || lec.completed,
            progress: Math.max(prev.progress || 0, lec.progress || 0),
            lastWatchedPosition: prev.lastWatchedPosition || lec.lastWatchedPosition || 0,
            notes: prev.notes || lec.notes
          };
        }
        return lec;
      });

      existingCh.title = `Chapter ${existingCh.chapterNumber}: ${playlistTitle}`;
      existingCh.description = `Imported playlist (${playlistId}) from ${playlist.channelName || "YouTube"} • ${mergedLectures.length} lectures`;
      existingCh.lectures = mergedLectures;
    } else {
      const nextChNum = importSubj.chapters.length + 1;
      const newChapter: CourseChapter = {
        id: `ch-import-pl-${playlistId}`,
        chapterNumber: nextChNum,
        title: `Chapter ${nextChNum}: ${playlistTitle}`,
        description: `Imported playlist (${playlistId}) from ${playlist.channelName || "YouTube"} • ${convertedLectures.length} lectures`,
        lectures: convertedLectures
      };
      importSubj.chapters.push(newChapter);
    }

    importSubj.chapters.forEach((ch, idx) => {
      ch.chapterNumber = idx + 1;
      if (/^Chapter \d+:/i.test(ch.title)) {
        ch.title = ch.title.replace(/^Chapter \d+:/i, `Chapter ${idx + 1}:`);
      }
    });

    this.saveCustomSubject(importSubj);
    return importSubj;
  },

  addVideoToImportFolder(video: { id: string; title?: string; channelName?: string; duration?: string }): CustomSubjectFolder {
    if (!video || !video.id) return this.getOrCreateImportSubject();

    const importSubj = this.getOrCreateImportSubject();
    let singleCh = importSubj.chapters.find(
      (ch) => ch.id === "ch-import-single-videos" || ch.title.toLowerCase().includes("individual lectures")
    );

    if (!singleCh) {
      singleCh = {
        id: "ch-import-single-videos",
        chapterNumber: 1,
        title: "Chapter 1: Individual Lectures",
        description: "Standalone video lectures imported from the Home page",
        lectures: []
      };
      importSubj.chapters.unshift(singleCh);
    }

    const existingIndex = singleCh.lectures.findIndex(
      (l) => l.youtubeVideoId === video.id || l.id === `lec-single-${video.id}`
    );

    const cleanTitle = (video.title && video.title !== "Loading lecture details..." && video.title !== "YouTube Video" && video.title !== "Connecting...")
      ? video.title
      : "";

    if (existingIndex > -1) {
      const existingLec = singleCh.lectures[existingIndex];
      if (cleanTitle) existingLec.title = cleanTitle;
      if (video.duration && video.duration !== "0:00" && video.duration !== "10:00") {
        existingLec.duration = video.duration;
      }
    } else {
      const newLec: ChapterLecture = {
        id: `lec-single-${video.id}`,
        title: cleanTitle || `Lecture: ${video.id}`,
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        youtubeVideoId: video.id,
        duration: (video.duration && video.duration !== "0:00") ? video.duration : "10:00",
        completed: false,
        progress: 0,
        lectureNumber: singleCh.lectures.length + 1
      };
      singleCh.lectures.push(newLec);
    }

    singleCh.description = `Standalone video lectures imported from the Home page • ${singleCh.lectures.length} lecture${singleCh.lectures.length === 1 ? "" : "s"}`;

    importSubj.chapters.forEach((ch, idx) => {
      ch.chapterNumber = idx + 1;
      if (/^Chapter \d+:/i.test(ch.title)) {
        ch.title = ch.title.replace(/^Chapter \d+:/i, `Chapter ${idx + 1}:`);
      }
    });

    this.saveCustomSubject(importSubj);
    return importSubj;
  },

  // --- USER FOLDERS & CATEGORIES SYSTEM (Save / Bookmark / Watch Later) ---
  getOrCreateWatchLaterSubject(): CustomSubjectFolder {
    const subjects = this.getCustomSubjects();
    let wlSubj = subjects.find(
      (s) => s.id === "subject-watch-later" || s.subjectName.toLowerCase() === "watch later"
    );

    if (!wlSubj) {
      wlSubj = {
        id: "subject-watch-later",
        subjectName: "Watch Later",
        category: "Watch Later",
        color: "amber",
        description: "Lectures and playlists saved to watch and review later.",
        createdAt: new Date().toISOString(),
        chapters: []
      };
      this.saveCustomSubject(wlSubj);
    }

    return wlSubj;
  },

  getAllCategories(): string[] {
    const subjects = this.getCustomSubjects();
    const categoriesFromSubjects = subjects.map(s => s.category).filter(Boolean);
    let customCats: string[] = [];
    try {
      const stored = localStorage.getItem("studyai_custom_categories");
      if (stored) customCats = JSON.parse(stored);
    } catch {}
    const defaultCats = [
      "Watch Later",
      "Computer Science",
      "Engineering",
      "Mathematics",
      "Science",
      "Exam Prep",
      "General Knowledge"
    ];
    return Array.from(new Set([...defaultCats, ...categoriesFromSubjects, ...customCats]));
  },

  createSubjectFolder(params: {
    name: string;
    category: string;
    color?: string;
    description?: string;
  }): CustomSubjectFolder {
    const cleanName = params.name.trim();
    const cleanCategory = (params.category || "General").trim();
    const color = params.color || "blue";
    
    const newSubject: CustomSubjectFolder = {
      id: `subject-${Date.now()}`,
      subjectName: cleanName,
      category: cleanCategory,
      color,
      description: params.description || `Folder for ${cleanName} (${cleanCategory})`,
      createdAt: new Date().toISOString(),
      chapters: []
    };

    this.saveCustomSubject(newSubject);

    // Also sync to CourseFolder
    try {
      const courseFolders = this.getCourseFolders();
      courseFolders.push({
        id: newSubject.id,
        name: cleanName,
        category: cleanCategory,
        color,
        playlistIds: [],
        singleVideoIds: []
      });
      this.saveCourseFolders(courseFolders);
    } catch {}

    // Store custom category in categories list
    try {
      const stored = localStorage.getItem("studyai_custom_categories");
      const current = stored ? JSON.parse(stored) : [];
      if (!current.includes(cleanCategory)) {
        current.push(cleanCategory);
        localStorage.setItem("studyai_custom_categories", JSON.stringify(current));
      }
    } catch {}

    return newSubject;
  },

  saveItemToSubjectFolder(params: {
    subjectId: string;
    itemType: "video" | "playlist";
    id: string;
    title: string;
    channelName: string;
    duration?: string;
    thumbnail?: string;
    playlist?: PlaylistInfo;
  }): void {
    const subjects = this.getCustomSubjects();
    const subject = subjects.find(s => s.id === params.subjectId);
    if (!subject) return;

    if (params.itemType === "video") {
      let chapter = subject.chapters[0];
      if (!chapter) {
        chapter = {
          id: `ch-${subject.id}-lectures`,
          chapterNumber: 1,
          title: "Chapter 1: Lectures & Topics",
          description: `Lectures saved in ${subject.subjectName}`,
          lectures: []
        };
        subject.chapters.push(chapter);
      }

      const existingLec = chapter.lectures.find(
        l => l.youtubeVideoId === params.id || l.id === `lec-${params.id}`
      );

      if (!existingLec) {
        chapter.lectures.push({
          id: `lec-${params.id}-${Date.now()}`,
          title: params.title || `Lecture: ${params.id}`,
          videoUrl: `https://www.youtube.com/watch?v=${params.id}`,
          youtubeVideoId: params.id,
          duration: params.duration || "10:00",
          completed: false,
          progress: 0,
          lectureNumber: chapter.lectures.length + 1
        });
      }

      // Also ensure video exists in singleVideos storage
      const existingSingle = this.getSingleVideos().find(v => v.id === params.id);
      this.saveSingleVideo({
        id: params.id,
        type: "video",
        title: params.title,
        channelName: params.channelName,
        duration: params.duration || "10:00",
        thumbnail: params.thumbnail || `https://i.ytimg.com/vi/${params.id}/hqdefault.jpg`,
        progress: existingSingle?.progress || 0,
        lastWatchedAt: new Date().toISOString(),
        completed: existingSingle?.completed || false,
        isFavorite: existingSingle?.isFavorite || false
      });
    } else {
      const pl = params.playlist || this.getPlaylists().find(p => p.id === params.id);
      const plTitle = pl?.title || params.title || "Study Playlist";
      const existingChIdx = subject.chapters.findIndex(
        ch => ch.id === `ch-${subject.id}-${params.id}` || (ch.description && ch.description.includes(params.id))
      );

      const convertedLectures: ChapterLecture[] = (pl?.videos || []).map((v, idx) => ({
        id: `lec-${params.id}-${v.id || idx}`,
        title: v.title || `Lecture ${idx + 1}`,
        videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        youtubeVideoId: v.id,
        duration: v.duration || "15:00",
        completed: !!v.completed,
        progress: v.progress || 0,
        lastWatchedPosition: v.lastWatchedPosition || 0,
        lectureNumber: idx + 1
      }));

      if (existingChIdx > -1) {
        subject.chapters[existingChIdx].title = `Chapter ${subject.chapters[existingChIdx].chapterNumber}: ${plTitle}`;
        if (convertedLectures.length > 0) {
          subject.chapters[existingChIdx].lectures = convertedLectures;
        }
      } else {
        const nextNum = subject.chapters.length + 1;
        subject.chapters.push({
          id: `ch-${subject.id}-${params.id}`,
          chapterNumber: nextNum,
          title: `Chapter ${nextNum}: ${plTitle}`,
          description: `Playlist (${params.id}) by ${params.channelName} • ${convertedLectures.length} lectures`,
          lectures: convertedLectures
        });
      }

      if (pl) {
        this.savePlaylist(pl);
      }
    }

    this.saveCustomSubject(subject);

    // Sync CourseFolder
    try {
      const courseFolders = this.getCourseFolders();
      const cf = courseFolders.find(f => f.id === params.subjectId);
      if (cf) {
        if (params.itemType === "video" && !cf.singleVideoIds.includes(params.id)) {
          cf.singleVideoIds.push(params.id);
        } else if (params.itemType === "playlist" && !cf.playlistIds.includes(params.id)) {
          cf.playlistIds.push(params.id);
        }
        this.saveCourseFolders(courseFolders);
      }
    } catch {}
  },

  removeItemFromSubjectFolder(params: {
    subjectId: string;
    itemType: "video" | "playlist";
    itemId: string;
  }): void {
    const subjects = this.getCustomSubjects();
    const subject = subjects.find(s => s.id === params.subjectId);
    if (!subject) return;

    if (params.itemType === "video") {
      subject.chapters.forEach(ch => {
        ch.lectures = ch.lectures.filter(
          l => l.youtubeVideoId !== params.itemId && l.id !== `lec-${params.itemId}`
        );
        ch.lectures.forEach((l, idx) => { l.lectureNumber = idx + 1; });
      });
      subject.chapters = subject.chapters.filter(ch => ch.lectures.length > 0 || !ch.id.includes("lectures"));
    } else {
      subject.chapters = subject.chapters.filter(
        ch => ch.id !== `ch-${subject.id}-${params.itemId}` && (!ch.description || !ch.description.includes(params.itemId))
      );
    }

    subject.chapters.forEach((ch, idx) => {
      ch.chapterNumber = idx + 1;
      if (/^Chapter \d+:/i.test(ch.title)) {
        ch.title = ch.title.replace(/^Chapter \d+:/i, `Chapter ${idx + 1}:`);
      }
    });

    this.saveCustomSubject(subject);

    try {
      const courseFolders = this.getCourseFolders();
      const cf = courseFolders.find(f => f.id === params.subjectId);
      if (cf) {
        if (params.itemType === "video") {
          cf.singleVideoIds = cf.singleVideoIds.filter(id => id !== params.itemId);
        } else {
          cf.playlistIds = cf.playlistIds.filter(id => id !== params.itemId);
        }
        this.saveCourseFolders(courseFolders);
      }
    } catch {}
  },

  isItemInSubjectFolder(subjectId: string, itemType: "video" | "playlist", itemId: string): boolean {
    const subjects = this.getCustomSubjects();
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return false;

    if (itemType === "video") {
      return subject.chapters.some(ch =>
        ch.lectures.some(l => l.youtubeVideoId === itemId || l.id === `lec-${itemId}` || (l.videoUrl && l.videoUrl.includes(itemId)))
      );
    } else {
      return subject.chapters.some(
        ch => ch.id === `ch-${subject.id}-${itemId}` || (ch.description && ch.description.includes(itemId))
      );
    }
  },

  getSubjectFoldersForItem(itemType: "video" | "playlist", itemId: string): string[] {
    const subjects = this.getCustomSubjects();
    return subjects
      .filter(s => this.isItemInSubjectFolder(s.id, itemType, itemId))
      .map(s => s.id);
  },

  // Favorites
  getFavorites(): { playlists: string[]; videos: string[] } {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getFavorites();
    }
    try {
      const data = localStorage.getItem("studytube_guest_favorites");
      return data ? JSON.parse(data) : { playlists: [], videos: [] };
    } catch {
      return { playlists: [], videos: [] };
    }
  },

  saveFavorites(favs: { playlists: string[]; videos: string[] }) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveFavorites(favs);
      return;
    }
    localStorage.setItem("studytube_guest_favorites", JSON.stringify(favs));
  },

  toggleFavorite(type: "playlist" | "video", id: string): boolean {
    const favs = this.getFavorites();
    let isFavNow = false;
    
    if (type === "playlist") {
      if (favs.playlists.includes(id)) {
        favs.playlists = favs.playlists.filter(x => x !== id);
      } else {
        favs.playlists.push(id);
        isFavNow = true;
      }
    } else {
      if (favs.videos.includes(id)) {
        favs.videos = favs.videos.filter(x => x !== id);
      } else {
        favs.videos.push(id);
        isFavNow = true;
      }
    }
    
    this.saveFavorites(favs);
    
    // Also update target's internal state
    if (type === "playlist") {
      const playlists = this.getPlaylists();
      const p = playlists.find(x => x.id === id);
      if (p) {
        p.isFavorite = isFavNow;
        this.savePlaylist(p);
      }
    } else {
      const vids = this.getSingleVideos();
      const v = vids.find(x => x.id === id);
      if (v) {
        v.isFavorite = isFavNow;
        this.saveSingleVideo(v);
      }
    }
    
    return isFavNow;
  },

  clearFavorites(): void {
    this.saveFavorites({ playlists: [], videos: [] });
    const playlists = this.getPlaylists().map(p => ({ ...p, isFavorite: false }));
    this.savePlaylists(playlists);
    const vids = this.getSingleVideos().map(v => ({ ...v, isFavorite: false }));
    this.saveSingleVideos(vids);
  },

  clearWatchHistory(): void {
    this.savePlaylists([]);
    this.saveSingleVideos([]);
    this.clearFavorites();
  },

  // Streaks calculation
  getStreakStats(customGoalMinutes?: number) {
    const settings = this.getSettings();
    const targetMins = customGoalMinutes || settings.dailyGoalMinutes || 45;
    const targetSeconds = targetMins * 60;

    const logs = this.getStudyLogs();
    const plans = this.getStudyPlans();

    // Group logs by date
    const dateSums: { [date: string]: number } = {};
    logs.forEach((l) => {
      dateSums[l.date] = (dateSums[l.date] || 0) + (l.secondsStudied || 0);
    });

    const candidateDates = Array.from(new Set([
      ...Object.keys(dateSums),
      ...plans.map(p => p.dueDate)
    ]));

    const studyDates = candidateDates.filter((date) => {
      const secondsLogged = dateSums[date] || 0;
      if (secondsLogged >= Math.min(60, targetSeconds) && secondsLogged >= targetSeconds) return true;

      const tasksForDate = plans.filter(p => p.dueDate === date && !p.skipped);
      if (tasksForDate.length > 0 && tasksForDate.every(p => p.completed)) {
        return true;
      }

      if (secondsLogged >= 60 && targetMins <= 1) return true;
      return false;
    }).sort() as string[];

    if (studyDates.length === 0) return { current: 0, longest: 0, datesStudied: [] };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");

    let prevDate: Date | null = null;
    for (const dStr of studyDates) {
      const currDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      prevDate = currDate;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    const lastStudyDateStr = studyDates[studyDates.length - 1];
    if (lastStudyDateStr === todayStr || lastStudyDateStr === yesterdayStr) {
      let curr = 0;
      let checkDate = new Date();
      if (!studyDates.includes(todayStr) && studyDates.includes(yesterdayStr)) {
        checkDate = yesterday;
      }
      
      while (true) {
        const checkStr = checkDate.toLocaleDateString("en-CA");
        if (studyDates.includes(checkStr)) {
          curr++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = curr;
    } else {
      currentStreak = 0;
    }

    return {
      current: currentStreak,
      longest: Math.max(longestStreak, currentStreak),
      datesStudied: studyDates
    };
  },

  // Dashboard Customization
  getDashboardPreferences() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getDashboardPreferences();
    }
    try {
      const data = localStorage.getItem("studytube_guest_dashboard");
      return data ? JSON.parse(data) : {
        layout: "default",
        pinnedItemIds: [],
        widgetOrder: ["continue-learning", "stats", "today-tasks", "quick-access", "streak"],
        hiddenWidgets: []
      };
    } catch {
      return {
        layout: "default",
        pinnedItemIds: [],
        widgetOrder: ["continue-learning", "stats", "today-tasks", "quick-access", "streak"],
        hiddenWidgets: []
      };
    }
  },

  saveDashboardPreferences(prefs: any) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveDashboardPreferences(prefs);
      return;
    }
    localStorage.setItem("studytube_guest_dashboard", JSON.stringify(prefs));
    notifyStorageMutation();
  },

  // Quizzes
  getQuizAttempts() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getQuizAttempts();
    }
    try {
      const data = localStorage.getItem("studytube_guest_quiz_attempts");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveQuizAttempt(attempt: any) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveQuizAttempt(attempt);
      return;
    }
    const current = this.getQuizAttempts();
    current.unshift(attempt);
    localStorage.setItem("studytube_guest_quiz_attempts", JSON.stringify(current));
    notifyStorageMutation();
  },

  // Calendar
  getCalendarEvents() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getCalendarEvents();
    }
    try {
      const data = localStorage.getItem("studytube_guest_calendar_events");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCalendarEvents(events: any[]) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveCalendarEvents(events);
      return;
    }
    localStorage.setItem("studytube_guest_calendar_events", JSON.stringify(events));
    notifyStorageMutation();
  },

  // Developer Profile
  getDeveloperProfile() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getDeveloperProfile();
    }
    try {
      const data = localStorage.getItem("studytube_guest_dev_profile");
      return data ? JSON.parse(data) : {
        username: "",
        bio: "Lifelong learner using LearnStudy for distraction-free deep work.",
        githubUrl: "",
        portfolioUrl: "",
        skills: ["React", "TypeScript", "AI Engineering"]
      };
    } catch {
      return {
        username: "",
        bio: "Lifelong learner using LearnStudy for distraction-free deep work.",
        githubUrl: "",
        portfolioUrl: "",
        skills: ["React", "TypeScript", "AI Engineering"]
      };
    }
  },

  saveDeveloperProfile(profile: any) {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.saveDeveloperProfile(profile);
      return;
    }
    localStorage.setItem("studytube_guest_dev_profile", JSON.stringify(profile));
    notifyStorageMutation();
  },

  // Feedback
  getFeedbackSubmissions() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.getFeedbackSubmissions();
    }
    try {
      const data = localStorage.getItem("studytube_guest_feedback");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  submitFeedback(feedback: any) {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.submitFeedback(feedback);
    }
    const current = this.getFeedbackSubmissions();
    const item = {
      id: "fb_" + Date.now(),
      createdAt: new Date().toISOString(),
      status: "received",
      ...feedback
    };
    current.unshift(item);
    localStorage.setItem("studytube_guest_feedback", JSON.stringify(current));
    notifyStorageMutation();
    return item;
  },

  // Derived Statistics Calculation
  getDerivedStatistics() {
    if (userAccountSync.hasActiveUser()) {
      return userAccountSync.calculateDerivedStatistics();
    }
    const studyLogs = this.getStudyLogs();
    const totalSeconds = studyLogs.reduce((acc, s) => acc + (s.secondsStudied || 0), 0);
    const playlists = this.getPlaylists();
    const singleVideos = this.getSingleVideos();
    const subjects = this.getCustomSubjects();
    let completedLectures = 0;
    playlists.forEach(p => p.videos?.forEach(v => { if (v.completed) completedLectures++; }));
    singleVideos.forEach(v => { if (v.completed) completedLectures++; });
    subjects.forEach(s => s.chapters?.forEach(c => c.lectures?.forEach(l => { if (l.completed) completedLectures++; })));

    return {
      totalSecondsStudied: totalSeconds,
      totalStudyMinutes: Math.round(totalSeconds / 60),
      totalCompletedLectures: completedLectures,
      quizzesCompleted: this.getQuizAttempts().length,
      flashcardsCount: this.getFlashcards().length,
      notesCount: Object.keys(this.getNotes()).length,
      totalBookmarks: Object.values(this.getBookmarks()).reduce((acc: number, list: any) => acc + (Array.isArray(list) ? list.length : 0), 0),
      currentStreak: this.getStreakStats().current,
      longestStreak: this.getStreakStats().longest,
      savedPlaylistsCount: playlists.length,
      savedCoursesCount: subjects.length
    };
  },

  // Export Data as JSON
  exportData(): string {
    const data = {
      playlists: this.getPlaylists(),
      singleVideos: this.getSingleVideos(),
      notes: this.getNotes(),
      bookmarks: this.getBookmarks(),
      studyLogs: this.getStudyLogs(),
      favorites: this.getFavorites(),
      settings: this.getSettings()
    };
    return JSON.stringify(data, null, 2);
  },

  // Import Data from JSON
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.playlists) this.savePlaylists(data.playlists);
      if (data.singleVideos) this.saveSingleVideos(data.singleVideos);
      if (data.notes) {
        Object.entries(data.notes).forEach(([k, v]) => this.saveNoteForVideo(k, v as string));
      }
      if (data.bookmarks) {
        Object.values(data.bookmarks).flat().forEach((b) => this.saveBookmark(b as Bookmark));
      }
      if (data.studyLogs) this.saveStudyLogs(data.studyLogs);
      if (data.favorites) this.saveFavorites(data.favorites);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error("Failed to import data:", e);
      return false;
    }
  },

  // Reset ALL Data
  resetAllData() {
    if (userAccountSync.hasActiveUser()) {
      userAccountSync.savePlaylists([]);
      userAccountSync.saveSingleVideos([]);
      userAccountSync.saveFavorites({ playlists: [], videos: [] });
      userAccountSync.saveStudyLogs([]);
      userAccountSync.saveFlashcards([]);
      userAccountSync.saveStudyPlans([]);
      userAccountSync.saveCustomSubjects([]);
      userAccountSync.saveSettings({ ...DEFAULT_ACCOUNT_SETTINGS });
    }
    localStorage.removeItem("studytube_guest_playlists");
    localStorage.removeItem("studytube_guest_single_videos");
    localStorage.removeItem("studytube_guest_notes");
    localStorage.removeItem("studytube_guest_bookmarks");
    localStorage.removeItem("studytube_guest_study_logs");
    localStorage.removeItem("studytube_guest_favorites");
    localStorage.removeItem("studytube_guest_settings");
    localStorage.removeItem("studytube_guest_study_plans");
    localStorage.removeItem("studytube_guest_flashcards");
    localStorage.removeItem("studytube_guest_custom_subjects");
    localStorage.removeItem("studytube_guest_course_folders");
  }
};
