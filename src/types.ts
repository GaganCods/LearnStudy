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
}

export type ActiveTab = "home" | "study" | "history" | "favorites" | "settings" | "completed" | "stats" | "pomodoro";
