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

// Default settings
const DEFAULT_SETTINGS: StudySettings = {
  playbackSpeed: 1,
  autoPlay: true,
  skipCompleted: false,
  theme: "system",
  enableShortcuts: true,
  userName: "",
};

export const Storage = {
  // Flashcards
  getFlashcards(): Flashcard[] {
    try {
      const data = localStorage.getItem("studytube_flashcards");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveFlashcards(flashcards: Flashcard[]) {
    localStorage.setItem("studytube_flashcards", JSON.stringify(flashcards));
  },

  saveFlashcard(card: Flashcard) {
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
    const cards = this.getFlashcards().filter(c => c.id !== id);
    this.saveFlashcards(cards);
  },

  // Study Plans / Homework Tasks
  getStudyPlans(): StudyPlanItem[] {
    try {
      const data = localStorage.getItem("studytube_study_plans");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveStudyPlans(plans: StudyPlanItem[]) {
    localStorage.setItem("studytube_study_plans", JSON.stringify(plans));
  },

  saveStudyPlan(plan: StudyPlanItem) {
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
    const plans = this.getStudyPlans().filter(p => p.id !== id);
    this.saveStudyPlans(plans);
  },

  // Course Folders (e.g. "Algorithms", "Machine Learning")
  getCourseFolders(): CourseFolder[] {
    try {
      const data = localStorage.getItem("studytube_course_folders");
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
    localStorage.setItem("studytube_course_folders", JSON.stringify(folders));
  },

  // Playlists (contains lists of playlists fetched and saved)

  getPlaylists(): PlaylistInfo[] {
    try {
      const data = localStorage.getItem("studytube_playlists");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePlaylists(playlists: PlaylistInfo[]) {
    localStorage.setItem("studytube_playlists", JSON.stringify(playlists));
  },

  savePlaylist(playlist: PlaylistInfo) {
    const playlists = this.getPlaylists();
    const index = playlists.findIndex((p) => p.id === playlist.id);
    if (index > -1) {
      playlists[index] = playlist;
    } else {
      playlists.push(playlist);
    }
    this.savePlaylists(playlists);
  },

  // Single Videos (loaded and saved directly)
  getSingleVideos(): SingleVideoInfo[] {
    try {
      const data = localStorage.getItem("studytube_single_videos");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSingleVideos(videos: SingleVideoInfo[]) {
    localStorage.setItem("studytube_single_videos", JSON.stringify(videos));
  },

  saveSingleVideo(video: SingleVideoInfo) {
    const videos = this.getSingleVideos();
    const index = videos.findIndex((v) => v.id === video.id);
    if (index > -1) {
      videos[index] = video;
    } else {
      videos.push(video);
    }
    this.saveSingleVideos(videos);
  },

  // Notes (Video ID -> Note Markdown)
  getNotes(): Record<string, string> {
    try {
      const data = localStorage.getItem("studytube_notes");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getNoteForVideo(videoId: string): string {
    return this.getNotes()[videoId] || "";
  },

  saveNoteForVideo(videoId: string, markdown: string) {
    const notes = this.getNotes();
    notes[videoId] = markdown;
    localStorage.setItem("studytube_notes", JSON.stringify(notes));
  },

  // Bookmarks (Video ID -> Array of Bookmarks)
  getBookmarks(): Record<string, Bookmark[]> {
    try {
      const data = localStorage.getItem("studytube_bookmarks");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getBookmarksForVideo(videoId: string): Bookmark[] {
    return this.getBookmarks()[videoId] || [];
  },

  saveBookmark(bookmark: Bookmark) {
    const bookmarks = this.getBookmarks();
    if (!bookmarks[bookmark.videoId]) {
      bookmarks[bookmark.videoId] = [];
    }
    // Avoid duplicates of exactly the same second
    const existsIdx = bookmarks[bookmark.videoId].findIndex(b => Math.floor(b.timestamp) === Math.floor(bookmark.timestamp));
    if (existsIdx > -1) {
      bookmarks[bookmark.videoId][existsIdx] = bookmark;
    } else {
      bookmarks[bookmark.videoId].push(bookmark);
    }
    // Sort bookmarks by timestamp
    bookmarks[bookmark.videoId].sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem("studytube_bookmarks", JSON.stringify(bookmarks));
  },

  deleteBookmark(videoId: string, bookmarkId: string) {
    const bookmarks = this.getBookmarks();
    if (bookmarks[videoId]) {
      bookmarks[videoId] = bookmarks[videoId].filter((b) => b.id !== bookmarkId);
      localStorage.setItem("studytube_bookmarks", JSON.stringify(bookmarks));
    }
  },

  updateBookmarkLabel(videoId: string, bookmarkId: string, newLabel: string) {
    const bookmarks = this.getBookmarks();
    if (bookmarks[videoId]) {
      const b = bookmarks[videoId].find(x => x.id === bookmarkId);
      if (b) {
        b.label = newLabel;
        localStorage.setItem("studytube_bookmarks", JSON.stringify(bookmarks));
      }
    }
  },

  // Study Session Logs
  getStudyLogs(): StudySessionLog[] {
    try {
      const data = localStorage.getItem("studytube_study_logs");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addStudyTime(videoId: string, title: string, seconds: number) {
    const logs = this.getStudyLogs();
    const today = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time zone
    
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
    localStorage.setItem("studytube_study_logs", JSON.stringify(logs));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_logs_updated"));
    }
  },

  saveStudyLogs(logs: any[]) {
    localStorage.setItem("studytube_study_logs", JSON.stringify(logs));
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
      // It is studied, let's remove logs for this date to mark it as unstudied/rest day
      const updatedLogs = logs.filter(l => l.date !== dateStr);
      this.saveStudyLogs(updatedLogs);
      return false;
    } else {
      // It is not studied, let's add a manual log to reach daily goal
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
    try {
      const data = localStorage.getItem("studytube_settings");
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: StudySettings) {
    localStorage.setItem("studytube_settings", JSON.stringify(settings));
    if (settings.dailyGoalMinutes) {
      const hours = Math.max(1, Math.round(settings.dailyGoalMinutes / 60));
      localStorage.setItem("studytube_target_hours", String(hours));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_settings_updated"));
    }
  },

  // Custom Subjects with Chapter-wise Lectures
  getCustomSubjects(): CustomSubjectFolder[] {
    try {
      const data = localStorage.getItem("studytube_custom_subjects");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomSubjects(subjects: CustomSubjectFolder[]) {
    localStorage.setItem("studytube_custom_subjects", JSON.stringify(subjects));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("studytube_custom_subjects_updated"));
    }
  },

  saveCustomSubject(subject: CustomSubjectFolder) {
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
    const subjects = this.getCustomSubjects().filter((s) => s.id !== id);
    this.saveCustomSubjects(subjects);
  },

  // Bidirectional Synchronization between Study Player and Course Library Custom Subjects
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

    // 1. Sync all custom subjects
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

    // 2. Sync all playlists
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

  // Import Folder in Course Library (Auto-adds all Home-page imported playlists and videos)
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

    // Ensure "Imports" category is saved in custom categories
    try {
      const storedCats = localStorage.getItem("studyai_custom_categories");
      let cats: string[] = storedCats ? JSON.parse(storedCats) : [];
      if (!cats.includes("Imports")) {
        cats.unshift("Imports");
        localStorage.setItem("studyai_custom_categories", JSON.stringify(cats));
      }
    } catch {}

    return importSubj;
  },

  addPlaylistToImportFolder(playlist: PlaylistInfo): CustomSubjectFolder {
    if (!playlist) return this.getOrCreateImportSubject();

    const importSubj = this.getOrCreateImportSubject();
    const playlistTitle = playlist.title || "Imported Playlist";
    const playlistId = playlist.id;

    // Check if chapter for this playlist already exists
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

    // Ensure all chapter numbers are sequential
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
    
    // Find or create the Single / Individual Lectures chapter
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

    // Check if this video is already in single lectures
    const existingIndex = singleCh.lectures.findIndex(
      (l) => l.youtubeVideoId === video.id || l.id === `lec-single-${video.id}`
    );

    const cleanTitle = (video.title && video.title !== "Loading lecture details..." && video.title !== "YouTube Video" && video.title !== "Connecting...")
      ? video.title
      : "";

    if (existingIndex > -1) {
      const existingLec = singleCh.lectures[existingIndex];
      if (cleanTitle) {
        existingLec.title = cleanTitle;
      }
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

    // Update chapter description with count
    singleCh.description = `Standalone video lectures imported from the Home page • ${singleCh.lectures.length} lecture${singleCh.lectures.length === 1 ? "" : "s"}`;

    // Ensure all chapter numbers are sequential
    importSubj.chapters.forEach((ch, idx) => {
      ch.chapterNumber = idx + 1;
      if (/^Chapter \d+:/i.test(ch.title)) {
        ch.title = ch.title.replace(/^Chapter \d+:/i, `Chapter ${idx + 1}:`);
      }
    });

    this.saveCustomSubject(importSubj);
    return importSubj;
  },

  // Favorites (list of favorites, can be playlist ID or video ID)
  getFavorites(): { playlists: string[]; videos: string[] } {
    try {
      const data = localStorage.getItem("studytube_favorites");
      return data ? JSON.parse(data) : { playlists: [], videos: [] };
    } catch {
      return { playlists: [], videos: [] };
    }
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
    
    localStorage.setItem("studytube_favorites", JSON.stringify(favs));
    
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
    localStorage.setItem("studytube_favorites", JSON.stringify({ playlists: [], videos: [] }));
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

    // Dates with study logs or planner tasks
    const candidateDates = Array.from(new Set([
      ...Object.keys(dateSums),
      ...plans.map(p => p.dueDate)
    ]));

    const studyDates = candidateDates.filter((date) => {
      const secondsLogged = dateSums[date] || 0;
      // 1. Reached time goal threshold (at least 60s minimum if goal set low)
      if (secondsLogged >= Math.min(60, targetSeconds) && secondsLogged >= targetSeconds) return true;

      // 2. OR completed all target tasks scheduled for that day in Planner
      const tasksForDate = plans.filter(p => p.dueDate === date && !p.skipped);
      if (tasksForDate.length > 0 && tasksForDate.every(p => p.completed)) {
        return true;
      }

      // 3. Fallback: if at least 1 min studied and no specific tasks broke it
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

    // Calculate streaks by walking the sorted unique dates list
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

    // Check if streak is still active today or yesterday
    const lastStudyDateStr = studyDates[studyDates.length - 1];
    if (lastStudyDateStr === todayStr || lastStudyDateStr === yesterdayStr) {
      // Find current streak by scanning backwards from today/yesterday
      let curr = 0;
      let checkDate = new Date();
      // If we didn't study today but did study yesterday, start checks from yesterday
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
      if (data.playlists) localStorage.setItem("studytube_playlists", JSON.stringify(data.playlists));
      if (data.singleVideos) localStorage.setItem("studytube_single_videos", JSON.stringify(data.singleVideos));
      if (data.notes) localStorage.setItem("studytube_notes", JSON.stringify(data.notes));
      if (data.bookmarks) localStorage.setItem("studytube_bookmarks", JSON.stringify(data.bookmarks));
      if (data.studyLogs) localStorage.setItem("studytube_study_logs", JSON.stringify(data.studyLogs));
      if (data.favorites) localStorage.setItem("studytube_favorites", JSON.stringify(data.favorites));
      if (data.settings) localStorage.setItem("studytube_settings", JSON.stringify(data.settings));
      return true;
    } catch (e) {
      console.error("Failed to import data:", e);
      return false;
    }
  },

  // Reset ALL Data
  resetAllData() {
    localStorage.removeItem("studytube_playlists");
    localStorage.removeItem("studytube_single_videos");
    localStorage.removeItem("studytube_notes");
    localStorage.removeItem("studytube_bookmarks");
    localStorage.removeItem("studytube_study_logs");
    localStorage.removeItem("studytube_favorites");
    localStorage.removeItem("studytube_settings");
    localStorage.removeItem("studytube_study_plans");
    localStorage.removeItem("studytube_flashcards");
    localStorage.removeItem("studytube_custom_subjects");
    localStorage.removeItem("studytube_course_folders");
    localStorage.removeItem("studytube_target_hours");
  }
};
