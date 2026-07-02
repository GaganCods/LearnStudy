import { PlaylistInfo, SingleVideoInfo, Bookmark, StudySessionLog, StudySettings } from "../types";

// Default settings
const DEFAULT_SETTINGS: StudySettings = {
  playbackSpeed: 1,
  autoPlay: true,
  skipCompleted: false,
  theme: "system",
  enableShortcuts: true,
};

export const Storage = {
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

  // Streaks calculation
  getStreakStats() {
    const logs = this.getStudyLogs();
    if (logs.length === 0) return { current: 0, longest: 0, datesStudied: [] };

    // Group logs by date and filter dates with total seconds >= 3600 (60 mins)
    const dateSums: { [date: string]: number } = {};
    logs.forEach((l) => {
      dateSums[l.date] = (dateSums[l.date] || 0) + l.secondsStudied;
    });

    const studyDates = Object.keys(dateSums)
      .filter((date) => dateSums[date] >= 3600)
      .sort() as string[];

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
  }
};
