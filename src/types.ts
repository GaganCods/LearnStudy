export interface VideoItem {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  lectureNumber: number;
  completed: boolean;
  progress: number; // percentage watched (0-100)
  lastWatchedPosition?: number; // seconds
  channelName: string;
}

export interface PlaylistInfo {
  id: string;
  type: "playlist";
  title: string;
  channelName: string;
  totalVideos: number;
  videos: VideoItem[];
  thumbnail: string;
  progress: number; // overall percentage
  lastWatchedAt: string; // ISO string
  isFavorite?: boolean;
}

export interface SingleVideoInfo {
  id: string;
  type: "video";
  title: string;
  channelName: string;
  duration: string;
  thumbnail: string;
  progress: number;
  lastWatchedAt: string;
  lastWatchedPosition?: number;
  completed: boolean;
  isFavorite?: boolean;
}

export interface Bookmark {
  id: string;
  videoId: string;
  timestamp: number; // in seconds
  timeText: string;
  label: string;
  createdAt: string;
}

export interface StudySessionLog {
  date: string; // "YYYY-MM-DD"
  secondsStudied: number;
  videoId: string;
  videoTitle: string;
}

export interface StudySettings {
  playbackSpeed: number;
  autoPlay: boolean;
  skipCompleted: boolean;
  theme: "light" | "dark" | "system";
  enableShortcuts?: boolean;
  youtubeApiKey?: string;
  userName?: string;
  compactMode?: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  autoBackup?: boolean;
  dailyGoalMinutes?: number;
  accentColor?: string;
  userAvatarUrl?: string;
  userAvatarSeed?: string;
  userAvatarStyle?: string;
}

export interface Flashcard {
  id: string;
  videoId?: string;
  videoTitle?: string;
  timestamp?: number;
  courseTitle?: string;
  question: string;
  answer: string;
  rating?: "easy" | "medium" | "hard" | "unrated";
  nextReviewDate?: string;
  createdAt: string;
}

export interface StudyPlanItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  type: "video" | "revision" | "quiz" | "assignment" | "other";
  createdAt: string;
  timeString?: string;
  skipped?: boolean;
  isAi?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  dailyGoalMinutes: number;
  studiedTodayMinutes: number;
  bio?: string;
  examName?: string;
  examDate?: string;
}

export interface ChapterLecture {
  id: string;
  title: string;
  videoUrl?: string;
  youtubeVideoId?: string;
  duration?: string;
  completed: boolean;
  progress: number; // 0-100
  lastWatchedPosition?: number; // seconds
  notes?: string;
  lectureNumber?: number;
}

export interface CourseChapter {
  id: string;
  subjectId?: string;
  chapterNumber: number;
  title: string;
  description?: string;
  lectures: ChapterLecture[];
}

export interface CustomSubjectFolder {
  id: string;
  subjectName: string;
  category: string; // custom category name entered by user
  color: string;
  description?: string;
  chapters: CourseChapter[];
  createdAt: string;
}

export interface CourseFolder {
  id: string;
  name: string; // e.g. "Algorithms", "Machine Learning"
  color: string;
  playlistIds: string[];
  singleVideoIds: string[];
  category?: string;
  chapters?: CourseChapter[];
}

export interface StudyFriend {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  currentActivity?: string;
  currentSubject?: string;
  weeklyXp: number;
  streak: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
}

export type ActiveTab = 
  | "home" 
  | "study" 
  | "library" 
  | "flashcards" 
  | "planner" 
  | "calendar" 
  | "history" 
  | "favorites" 
  | "settings" 
  | "completed" 
  | "stats" 
  | "pomodoro" 
  | "search" 
  | "developer";

