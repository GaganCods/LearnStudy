import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Tv, Home, Youtube, History, Heart, Settings, Play, Pause, Check, 
  RotateCcw, Maximize, FileText, Bookmark, Trash2, Search, 
  Maximize2, Minimize2, ChevronRight, ChevronLeft, BookOpen, GraduationCap, 
  Sparkles, TrendingUp, Plus, Edit2, X, Clock, Flame, 
  ShieldAlert, Share2, Moon, Sun, Laptop, ChevronDown, CheckCircle,
  Eye, EyeOff, Star, Calendar, Download, Upload, Info, RefreshCw, ArrowUpDown, Filter
} from "lucide-react";
import { Storage } from "./utils/storage";
import { StudyStats } from "./components/StudyStats";
import { InteractiveNotes } from "./components/InteractiveNotes";
import { 
  PlaylistInfo, SingleVideoInfo, Bookmark as BookmarkType, 
  StudySettings, ActiveTab, VideoItem 
} from "./types";
import { usePomodoro } from "./components/PomodoroContext";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { CompactStudyTimer } from "./components/CompactStudyTimer";
import { FullScreenTimer } from "./components/FullScreenTimer";
import { parseYoutubeUrl } from "./utils/youtubeParser";
import { PlaylistDb } from "./utils/playlistDb";
import { hasGeminiKey, getGeminiKey, removeGeminiKey, fetchVideoMetadataWithGemini, maskApiKey } from "./utils/gemini";
import { GeminiOnboardingModal } from "./components/GeminiOnboardingModal";
import { AIStudyCompanion } from "./components/AIStudyCompanion";
import { useToast } from "./components/ToastContext";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

const CLIENT_YOUTUBE_API_KEY = "AIzaSyAHYW-4Q4wTBvdk1EyHFzp9EX9RBDwWr7E";

function parseISO8601DurationClient(durationStr: string): string {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "10:00";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

async function fetchPlaylistFromYouTubeClient(id: string): Promise<any> {
  const apiKey = CLIENT_YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Client API Key is empty");

  // 1. Fetch playlist metadata
  const plUrl = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${apiKey}`;
  const plRes = await fetch(plUrl);
  if (!plRes.ok) {
    const errorData = await plRes.json().catch(() => ({}));
    const apiMsg = errorData.error?.message || `HTTP Error ${plRes.status}`;
    throw new Error(`YouTube API Error: ${apiMsg}`);
  }
  const plData = await plRes.json();
  const playlistItem = plData.items?.[0];
  if (!playlistItem) {
    throw new Error("Playlist not found on YouTube");
  }
  const playlistTitle = playlistItem.snippet?.title || "YouTube Playlist";
  const playlistChannel = playlistItem.snippet?.channelTitle || "Unknown Channel";
  const playlistThumbnail = playlistItem.snippet?.thumbnails?.high?.url || playlistItem.snippet?.thumbnails?.default?.url || "";

  // 2. Fetch playlist items
  const videos: any[] = [];
  let nextPageToken = "";
  do {
    const itemsUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${id}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const itemsRes = await fetch(itemsUrl);
    if (!itemsRes.ok) {
      const errorData = await itemsRes.json().catch(() => ({}));
      const apiMsg = errorData.error?.message || `HTTP Error ${itemsRes.status}`;
      throw new Error(`YouTube API Error (playlistItems): ${apiMsg}`);
    }
    const itemsData = await itemsRes.json();
    if (!itemsData.items || itemsData.items.length === 0) break;

    for (const item of itemsData.items) {
      const snippet = item.snippet || {};
      const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
      if (!videoId) continue;

      const title = snippet.title || "No Title";
      const channelName = snippet.videoOwnerChannelTitle || snippet.channelTitle || playlistChannel;
      const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const description = snippet.description || "";
      const position = snippet.position !== undefined ? snippet.position : videos.length;

      videos.push({
        id: videoId,
        title,
        channelName,
        duration: "10:00", // placeholder
        thumbnail,
        description,
        position,
        progress: 0,
        completed: false,
        notes: [],
        bookmarks: []
      });
    }
    nextPageToken = itemsData.nextPageToken || "";
  } while (nextPageToken);

  // 3. Fetch video details in batches of 50 to get real durations
  const batchSize = 50;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const ids = batch.map(v => v.id).join(",");
    try {
      const vidUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`;
      const vidRes = await fetch(vidUrl);
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        if (vidData.items) {
          const durationMap = new Map();
          for (const item of vidData.items) {
            if (item.contentDetails?.duration) {
              durationMap.set(item.id, parseISO8601DurationClient(item.contentDetails.duration));
            }
          }
          for (const v of batch) {
            if (durationMap.has(v.id)) {
              v.duration = durationMap.get(v.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Client batch duration fetch failed:", e);
    }
  }

  let finalThumbnail = playlistThumbnail;
  if (!finalThumbnail && videos.length > 0) {
    finalThumbnail = videos[0].thumbnail;
  }

  return {
    id,
    title: playlistTitle,
    channelName: playlistChannel,
    thumbnail: finalThumbnail,
    videos,
    totalVideos: videos.length
  };
}

async function fetchVideoFromYouTubeClient(id: string): Promise<any> {
  const apiKey = CLIENT_YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Client API Key is empty");

  const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${apiKey}`;
  const apiRes = await fetch(url);
  if (!apiRes.ok) {
    const errorData = await apiRes.json().catch(() => ({}));
    const apiMsg = errorData.error?.message || `HTTP Error ${apiRes.status}`;
    throw new Error(`YouTube API Error: ${apiMsg}`);
  }
  const data = await apiRes.json();
  const item = data.items?.[0];
  if (!item) {
    throw new Error("Video not found on YouTube");
  }

  const snippet = item.snippet || {};
  const contentDetails = item.contentDetails || {};

  const title = snippet.title || "YouTube Video";
  const channelName = snippet.channelTitle || "Unknown Channel";
  const duration = contentDetails.duration ? parseISO8601DurationClient(contentDetails.duration) : "10:00";
  const description = snippet.description || "No description available.";
  let publishDate = "Unknown date";
  if (snippet.publishedAt) {
    try {
      publishDate = new Date(snippet.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      publishDate = snippet.publishedAt;
    }
  }
  const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    id,
    title,
    channelName,
    duration,
    description,
    publishDate,
    thumbnail
  };
}

export default function App() {
  const { toast, soundEnabled, setSoundEnabled } = useToast();
  // Pomodoro Study Timer Context
  const {
    activeState: pomoState,
    startTimer: startPomo,
    pauseTimer: pausePomo,
    resetTimer: resetPomo,
    skipSession: skipPomo,
    isFullScreen: isPomoFullScreen,
    setFullScreen,
    isFloating: isPomoFloating,
    setFloating,
    setActiveVideoInfo,
    settings: pomoSettings,
  } = usePomodoro();

  // Pause Timer suggestion banner state
  const [showPauseSuggestion, setShowPauseSuggestion] = useState(false);

  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [historyFilter, setHistoryFilter] = useState<"all" | "playlist" | "video">("all");
  const [settings, setSettings] = useState<StudySettings>(Storage.getSettings());
  const [searchQuery, setSearchQuery] = useState("");
  const [playlistVideoSearchQuery, setPlaylistVideoSearchQuery] = useState("");
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);

  // Playlists and Single Video state from storage
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [singleVideos, setSingleVideos] = useState<SingleVideoInfo[]>([]);
  const [favorites, setFavorites] = useState<{ playlists: string[]; videos: string[] }>({ playlists: [], videos: [] });
  const [favTypeFilter, setFavTypeFilter] = useState<"playlist" | "video">("playlist");
  
  // URL Input
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [isTestingDiagnostics, setIsTestingDiagnostics] = useState(false);

  // Gemini Onboarding & BYOK state
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hasGeminiKeyInState, setHasGeminiKeyInState] = useState(hasGeminiKey());
  const [showFullKeyInSettings, setShowFullKeyInSettings] = useState(false);
  const [settingsKeyTestLoading, setSettingsKeyTestLoading] = useState(false);
  const [settingsKeyTestResult, setSettingsKeyTestResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Trigger Onboarding Modal on launch if no key exists
  useEffect(() => {
    if (!hasGeminiKey()) {
      setOnboardingOpen(true);
    }
  }, []);

  // Poll for key presence so UI stays reactive
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const current = hasGeminiKey();
      if (current !== hasGeminiKeyInState) {
        setHasGeminiKeyInState(current);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [hasGeminiKeyInState]);

  // Active study session
  const [activeSession, setActiveSession] = useState<{
    id: string; // playlist ID or single video ID
    type: "playlist" | "video";
  } | null>(null);
  
  const [activeVideoId, setActiveVideoId] = useState<string>("");
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>("");
  const [activeVideoChannel, setActiveVideoChannel] = useState<string>("");

  // Bookmarks for active video
  const [activeBookmarks, setActiveBookmarks] = useState<BookmarkType[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingBookmarkLabel, setEditingBookmarkLabel] = useState("");

  // High Performance Loading Engine States
  const [isSingleVideoDetailsLoading, setIsSingleVideoDetailsLoading] = useState(false);
  const [singleVideoMetadata, setSingleVideoMetadata] = useState<{
    id: string;
    title: string;
    channelName: string;
    duration: string;
    publishDate: string;
    description: string;
    tags: string[];
    thumbnail?: string;
  } | null>(null);

  // Progressive Loading State
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [progressiveLoadedCount, setProgressiveLoadedCount] = useState(0);
  const [progressiveTotalCount, setProgressiveTotalCount] = useState(0);
  const [progressivePlaylistId, setProgressivePlaylistId] = useState("");
  const [fullProgressiveVideos, setFullProgressiveVideos] = useState<any[]>([]);

  // Background Update States for Cached Playlists
  const [backgroundUpdateAvailable, setBackgroundUpdateAvailable] = useState(false);
  const [backgroundNewLecturesCount, setBackgroundNewLecturesCount] = useState(0);
  const [backgroundPlaylistData, setBackgroundPlaylistData] = useState<any | null>(null);

  // Queue sorting/filtering
  const [queueFilter, setQueueFilter] = useState<"all" | "completed" | "remaining">("all");
  const [queueSort, setQueueSort] = useState<"number-asc" | "number-desc">("number-asc");


  // Custom video player control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerTime, setPlayerTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Player state
  const [focusMode, setFocusMode] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Player retry/error state
  const [initAttempts, setInitAttempts] = useState(0);
  const [playerLoadError, setPlayerLoadError] = useState(false);
  const initAttemptsRef = useRef(0);
  const playerReadyRef = useRef(false);

  useEffect(() => {
    initAttemptsRef.current = initAttempts;
  }, [initAttempts]);

  useEffect(() => {
    playerReadyRef.current = playerReady;
  }, [playerReady]);

  // Shortcut feedback overlay toast
  const [shortcutToast, setShortcutToast] = useState({ text: "", visible: false });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showShortcutToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShortcutToast({ text, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setShortcutToast(prev => ({ ...prev, visible: false }));
    }, 1200);
  };
  
  // Refs
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Refs to keep track of latest state inside player event listeners (avoids stale closures)
  const activeVideoIdRef = useRef<string>("");
  const activeSessionRef = useRef<any>(null);
  const playlistsRef = useRef<any[]>([]);

  useEffect(() => {
    activeVideoIdRef.current = activeVideoId;
  }, [activeVideoId]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  // Sync active lecture title to Pomodoro logs
  const currentPlaylist = useMemo(() => {
    if (activeSession?.type === "playlist") {
      return playlists.find(p => p.id === activeSession.id);
    }
    return null;
  }, [activeSession, playlists]);

  // Scroll to top when switching tabs or study sessions
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0 });
    }
    window.scrollTo({ top: 0 });
    document.documentElement.scrollTo({ top: 0 });
    document.body.scrollTo({ top: 0 });
  }, [activeTab, searchQuery, activeSession]);

  useEffect(() => {
    if (activeVideoId && activeVideoTitle) {
      setActiveVideoInfo({
        playlistTitle: currentPlaylist?.title || undefined,
        lectureTitle: activeVideoTitle
      });
    } else {
      setActiveVideoInfo(null);
    }
  }, [activeVideoId, activeVideoTitle, currentPlaylist, setActiveVideoInfo]);

  // Suggest pausing timer if video is paused for a long period (e.g. 15 seconds)
  useEffect(() => {
    if (isPlaying) {
      setShowPauseSuggestion(false);
      return;
    }

    if (!pomoState.isPaused && pomoState.mode === "focus") {
      const t = setTimeout(() => {
        setShowPauseSuggestion(true);
      }, 15000); // 15 seconds threshold

      return () => clearTimeout(t);
    } else {
      setShowPauseSuggestion(false);
    }
  }, [isPlaying, pomoState.isPaused, pomoState.mode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (pomoState.isPaused) {
          startPomo();
        } else {
          pausePomo();
        }
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        skipPomo();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetPomo();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [pomoState.isPaused, startPomo, pausePomo, skipPomo, resetPomo]);

  // Load state on mount
  useEffect(() => {
    setPlaylists(Storage.getPlaylists());
    setSingleVideos(Storage.getSingleVideos());
    setFavorites(Storage.getFavorites());

    // Auto-load most recent watch session as active if available
    const allPlaylists = Storage.getPlaylists();
    const allSingles = Storage.getSingleVideos();
    
    let mostRecent: any = null;
    let recentType: "playlist" | "video" = "video";

    allPlaylists.forEach(p => {
      if (!mostRecent || new Date(p.lastWatchedAt) > new Date(mostRecent.lastWatchedAt)) {
        mostRecent = p;
        recentType = "playlist";
      }
    });

    allSingles.forEach(v => {
      if (!mostRecent || new Date(v.lastWatchedAt) > new Date(mostRecent.lastWatchedAt)) {
        mostRecent = v;
        recentType = "video";
      }
    });

    if (mostRecent) {
      setActiveSession({ id: mostRecent.id, type: recentType });
      if ((recentType as string) === "playlist") {
        // Find first unfinished video or last watched video
        const playlist = mostRecent as PlaylistInfo;
        const lastWatchedVideo = playlist.videos.find(v => v.progress > 0 && v.progress < 95) || playlist.videos[0];
        if (lastWatchedVideo) {
          setActiveVideoId(lastWatchedVideo.id);
          setActiveVideoTitle(lastWatchedVideo.title);
          setActiveVideoChannel(lastWatchedVideo.channelName);
        }
      } else {
        const video = mostRecent as SingleVideoInfo;
        setActiveVideoId(video.id);
        setActiveVideoTitle(video.title);
        setActiveVideoChannel(video.channelName);
      }
    }
  }, []);

  // Sync Theme
  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      if (settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    updateTheme();

    if (settings.theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", updateTheme);
      return () => media.removeEventListener("change", updateTheme);
    }
  }, [settings.theme]);

  // Load bookmarks for current active video
  useEffect(() => {
    if (activeVideoId) {
      setActiveBookmarks(Storage.getBookmarksForVideo(activeVideoId));
    }
  }, [activeVideoId]);

  // YT Iframe script loader
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Re-build/re-initialize player on video switch or returning to study tab
  useEffect(() => {
    if (activeTab !== "study") return;
    if (!activeVideoId && activeSession?.type !== "playlist") return;

    let isCancelled = false;
    let player: any = null;
    let progressInterval: any = null;
    setPlayerReady(false);

    // Fetch video's start timestamp if there is progress
    let startSeconds = 0;
    if (pendingSeekSeconds !== null) {
      startSeconds = pendingSeekSeconds;
      setPendingSeekSeconds(null);
    } else if (activeSession) {
      if (activeSession.type === "playlist") {
        const currentPlaylist = Storage.getPlaylists().find(p => p.id === activeSession.id);
        const video = currentPlaylist?.videos.find(v => v.id === activeVideoId);
        if (video && video.lastWatchedPosition) {
          startSeconds = Math.floor(video.lastWatchedPosition);
        }
      } else {
        const video = Storage.getSingleVideos().find(v => v.id === activeSession.id);
        if (video && video.lastWatchedPosition) {
          startSeconds = Math.floor(video.lastWatchedPosition);
        }
      }
    }

    const initPlayer = () => {
      if (isCancelled) return;
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      // If previous element doesn't exist yet, retry (React DOM mounting delay)
      const placeholder = document.getElementById("yt-player-container");
      if (!placeholder) {
        setTimeout(initPlayer, 50);
        return;
      }

      placeholder.innerHTML = '<div id="yt-player-frame"></div>';

      const isPlaylist = activeSession?.type === "playlist";

      try {
        player = new window.YT.Player("yt-player-frame", {
          width: "100%",
          height: "100%",
          videoId: activeVideoId || undefined,
          playerVars: {
            autoplay: settings.autoPlay ? 1 : 0,
            controls: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            playsinline: 1,
            start: startSeconds,
            ...(isPlaylist ? { listType: "playlist", list: activeSession.id } : {})
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) {
                try { event.target.destroy(); } catch (e) {}
                return;
              }
              playerRef.current = event.target;
              setPlayerReady(true);
              setPlayerDuration(event.target.getDuration() || 0);
              
              if (event.target && typeof event.target.setPlaybackRate === "function") {
                try {
                  event.target.setPlaybackRate(settings.playbackSpeed);
                } catch (e) {
                  console.warn("Could not set playback speed", e);
                }
              }

              // Extract playlist metadata immediately if available
              if (activeSession?.type === "playlist") {
                try {
                  const currentPlaylist = Storage.getPlaylists().find(p => p.id === activeSession.id);
                  if (currentPlaylist && currentPlaylist.videos.length === 0) {
                    if (typeof event.target.getPlaylist === "function") {
                      let attempts = 0;
                      const intervalId = setInterval(() => {
                        if (isCancelled) {
                          clearInterval(intervalId);
                          return;
                        }
                        try {
                          attempts++;
                          const videoIds = event.target.getPlaylist() || [];
                          const updatedPlaylist = Storage.getPlaylists().find(p => p.id === activeSession.id);
                          
                          if (videoIds.length > 0 && updatedPlaylist && updatedPlaylist.videos.length === 0) {
                            clearInterval(intervalId);
                            updatedPlaylist.videos = videoIds.map((vid: string, index: number) => ({
                              id: vid,
                              title: `Video ${index + 1}`,
                              channelName: updatedPlaylist.channelName || "Unknown Channel",
                              duration: "10:00",
                              thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                              progress: 0,
                              lastWatchedPosition: 0,
                              completed: false,
                              lectureNumber: index + 1
                            }));
                            updatedPlaylist.totalVideos = videoIds.length;
                            Storage.savePlaylist(updatedPlaylist);
                            setPlaylists(Storage.getPlaylists());

                            // Also kickstart activeVideoId if it is empty
                            if (!activeVideoIdRef.current) {
                              setActiveVideoId(videoIds[0]);
                              setActiveVideoTitle(`Video 1`);
                            }
                          } else if (attempts >= 20 || (updatedPlaylist && updatedPlaylist.videos.length > 0)) {
                            clearInterval(intervalId);
                          }
                        } catch (e) {
                          if (attempts >= 20) clearInterval(intervalId);
                        }
                      }, 500);
                    }
                  }
                } catch (err) {}
              }

              // Record session progress every 5s
              progressInterval = setInterval(() => {
                if (isCancelled) return;
                if (playerRef.current && typeof playerRef.current.getCurrentTime === "function" && typeof playerRef.current.getDuration === "function") {
                  try {
                    const currentTime = playerRef.current.getCurrentTime();
                    const duration = playerRef.current.getDuration();
                    const isLive = duration <= 0 || !isFinite(duration) || isNaN(duration);
                    if (duration > 0 || isLive) {
                      handleProgressUpdate(currentTime, duration);
                    }
                  } catch (e) {
                    console.error("Failed to read playback times", e);
                  }
                }
              }, 5000);
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;

              // Extract metadata if it's a playlist
              if (activeSession?.type === "playlist") {
                try {
                  const currentPlaylist = Storage.getPlaylists().find(p => p.id === activeSession.id);
                  if (currentPlaylist) {
                    let modified = false;
                    if (typeof event.target.getPlaylist === "function") {
                      const videoIds = event.target.getPlaylist() || [];
                      if (videoIds.length > 0 && currentPlaylist.videos.length === 0) {
                        currentPlaylist.videos = videoIds.map((vid: string, index: number) => ({
                          id: vid,
                          title: `Video ${index + 1}`,
                          channelName: currentPlaylist.channelName || "Unknown Channel",
                          duration: "10:00", // Default placeholder
                          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                          progress: 0,
                          lastWatchedPosition: 0,
                          completed: false,
                          lectureNumber: index + 1
                        }));
                        currentPlaylist.totalVideos = videoIds.length;
                        modified = true;
                      }
                    }

                    if (typeof event.target.getVideoData === "function") {
                      const videoData = event.target.getVideoData();
                      if (videoData && videoData.video_id) {
                        const vId = videoData.video_id;
                        const vTitle = videoData.title;
                        const vAuthor = videoData.author;
                        if (currentPlaylist.title === "YouTube Playlist" && vTitle) {
                           currentPlaylist.title = `Playlist: ${vTitle} & more`;
                           modified = true;
                        }
                        if (currentPlaylist.channelName === "Unknown Channel" && vAuthor) {
                           currentPlaylist.channelName = vAuthor;
                           modified = true;
                        }
                        if (!currentPlaylist.thumbnail) {
                           currentPlaylist.thumbnail = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                           modified = true;
                        }
                        
                        const videoIndex = currentPlaylist.videos.findIndex(v => v.id === vId);
                        if (videoIndex >= 0) {
                          if (vTitle && currentPlaylist.videos[videoIndex].title !== vTitle) {
                            currentPlaylist.videos[videoIndex].title = vTitle;
                            modified = true;
                          }
                          if (vAuthor && currentPlaylist.videos[videoIndex].channelName !== vAuthor) {
                            currentPlaylist.videos[videoIndex].channelName = vAuthor;
                            modified = true;
                          }
                        }

                        // Use activeVideoIdRef to prevent stale closure comparison
                        if (activeVideoIdRef.current !== vId) {
                          setActiveVideoId(vId);
                          setActiveVideoTitle(vTitle || currentPlaylist.videos[videoIndex]?.title || "YouTube Video");
                          setActiveVideoChannel(vAuthor || currentPlaylist.videos[videoIndex]?.channelName || "Unknown Channel");
                        }
                      }
                    }

                    if (modified) {
                      Storage.savePlaylist(currentPlaylist);
                      setPlaylists(Storage.getPlaylists());
                    }
                  }
                } catch (err) {
                  console.warn("Failed to extract playlist metadata", err);
                }
              } else if (activeSession?.type === "video") {
                 try {
                   if (typeof event.target.getVideoData === "function") {
                      const videoData = event.target.getVideoData();
                      if (videoData && (videoData.title || videoData.author)) {
                         const vTitle = videoData.title;
                         const vAuthor = videoData.author;
                         let modified = false;
                         const currentVideo = Storage.getSingleVideos().find(v => v.id === activeSession.id);
                         if (currentVideo) {
                            if (vTitle && currentVideo.title === "YouTube Video" && currentVideo.title !== vTitle) {
                               currentVideo.title = vTitle;
                               setActiveVideoTitle(vTitle);
                               modified = true;
                            }
                            if (vAuthor && currentVideo.channelName === "Unknown Channel" && currentVideo.channelName !== vAuthor) {
                               currentVideo.channelName = vAuthor;
                               setActiveVideoChannel(vAuthor);
                               modified = true;
                            }
                            if (modified) {
                               Storage.saveSingleVideo(currentVideo);
                               setSingleVideos(Storage.getSingleVideos());
                            }
                         }
                      }
                   }
                 } catch (err) {}
              }

              if (event.data === 1) { // Playing
                setIsPlaying(true);
              } else if (event.data === 2) { // Paused
                setIsPlaying(false);
              } else if (event.data === 0) { // Video ended
                setIsPlaying(false);
                handleVideoEnded();
              }
            }
          }
        });
      } catch (err) {
        console.error("YT Player construction failed:", err);
      }
    };

    initPlayer();

    return () => {
      isCancelled = true;
      if (progressInterval) clearInterval(progressInterval);
      try {
        if (player && typeof player.destroy === "function") {
          player.destroy();
        }
      } catch (e) {
        console.warn("Player cleanup warning:", e);
      }
      playerRef.current = null;
    };
  }, [activeSession, activeTab]);


  // Seek to pending timestamp if player is already loaded and ready
  useEffect(() => {
    if (pendingSeekSeconds !== null && playerReady && playerRef.current) {
      try {
        if (typeof playerRef.current.seekTo === "function") {
          playerRef.current.seekTo(pendingSeekSeconds, true);
        }
        if (typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        }
        setPendingSeekSeconds(null);
      } catch (e) {
        console.error("Failed seeking to pending bookmark position", e);
      }
    }
  }, [pendingSeekSeconds, playerReady]);

  // Poll player states for custom controls
  useEffect(() => {
    let interval: any;
    if (playerReady && playerRef.current) {
      interval = setInterval(() => {
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
            setPlayerTime(playerRef.current.getCurrentTime() || 0);
            const dur = playerRef.current.getDuration();
            if (dur && dur > 0) {
              setPlayerDuration(dur);
            }
            if (typeof playerRef.current.isMuted === "function") {
              setIsMuted(playerRef.current.isMuted());
            }
            if (typeof playerRef.current.getPlayerState === "function") {
              const state = playerRef.current.getPlayerState();
              setIsPlaying(state === 1);
            }
          }
        } catch (err) {
          console.warn("Polling active states failed", err);
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playerReady, activeVideoId]);

  // Handle explicit video changes within the same session
  useEffect(() => {
    if (playerReady && playerRef.current && activeVideoId) {
      try {
        if (typeof playerRef.current.getVideoData === "function") {
          const currentVideoData = playerRef.current.getVideoData();
          if (currentVideoData && currentVideoData.video_id !== activeVideoId) {
            if (activeSession?.type === "playlist" && typeof playerRef.current.getPlaylist === "function" && typeof playerRef.current.playVideoAt === "function") {
              const playlist = playerRef.current.getPlaylist();
              if (playlist) {
                const idx = playlist.indexOf(activeVideoId);
                if (idx >= 0) {
                  playerRef.current.playVideoAt(idx);
                } else if (typeof playerRef.current.loadVideoById === "function") {
                  playerRef.current.loadVideoById(activeVideoId);
                }
              }
            } else if (typeof playerRef.current.loadVideoById === "function") {
              playerRef.current.loadVideoById(activeVideoId);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to sync video id with player", e);
      }
    }
  }, [activeVideoId, playerReady, activeSession]);

  const formatSecondsToDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return "0:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  // Handle study progression
  const handleProgressUpdate = (currentTime: number, duration: number) => {
    // 1. Log study time in background (5 seconds increment)
    Storage.addStudyTime(activeVideoId, activeVideoTitle, 5);

    // Determine if it is a live stream or invalid duration
    const isLiveVideo = duration <= 0 || !isFinite(duration) || isNaN(duration);

    let percent = 0;
    let isCompleted = false;
    let formattedDur = "LIVE";

    if (!isLiveVideo) {
      percent = Math.min(Math.round((currentTime / duration) * 100), 100);
      isCompleted = percent >= 95;
      formattedDur = formatSecondsToDuration(duration);
    }

    // 2. Update status in local storage
    if (activeSession) {
      const nowStr = new Date().toISOString();
      if (activeSession.type === "playlist") {
        const playlistsFromDb = Storage.getPlaylists();
        const playlist = playlistsFromDb.find(p => p.id === activeSession.id);
        if (playlist) {
          const video = playlist.videos.find(v => v.id === activeVideoId);
          if (video) {
            if (!isLiveVideo) {
              video.progress = percent;
              video.lastWatchedPosition = currentTime;
              if (video.duration === "0:00" || video.duration === "10:00" || video.duration === "LIVE" || !video.duration) {
                video.duration = formattedDur;
              }
              if (isCompleted) {
                video.completed = true;
              }
            } else {
              video.progress = 0;
              video.lastWatchedPosition = currentTime;
            }
          }

          // Compute overall playlist progress: completed videos count ratio
          const completedCount = playlist.videos.filter(v => v.completed).length;
          playlist.progress = Math.round((completedCount / playlist.totalVideos) * 100);
          playlist.lastWatchedAt = nowStr;

          Storage.savePlaylist(playlist);
          setPlaylists(playlistsFromDb);

          // Sync playlist session to IndexedDB
          try {
            PlaylistDb.savePlaylistState({
              playlistId: playlist.id,
              playlistUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
              lastWatchedVideo: activeVideoId,
              resumeTimestamp: Math.floor(currentTime),
              watchProgress: playlist.progress,
              updatedAt: nowStr
            });
          } catch (dbErr) {
            console.error("Failed to sync playlist session progress to IndexedDB", dbErr);
          }
        }
      } else {
        const singlesFromDb = Storage.getSingleVideos();
        const video = singlesFromDb.find(v => v.id === activeSession.id);
        if (video) {
          if (!isLiveVideo) {
            video.progress = percent;
            video.lastWatchedPosition = currentTime;
            video.lastWatchedAt = nowStr;
            if (video.duration === "0:00" || video.duration === "10:00" || video.duration === "LIVE" || !video.duration) {
              video.duration = formattedDur;
            }
            if (isCompleted) {
              video.completed = true;
            }
          } else {
            video.progress = 0;
            video.lastWatchedPosition = currentTime;
            video.lastWatchedAt = nowStr;
          }
          Storage.saveSingleVideo(video);
          setSingleVideos(singlesFromDb);
        }
      }
    }
  };

  // Skip / Autoplay next video on completion
  const handleVideoEnded = () => {
    // Force completion mark
    if (activeSession && activeSession.type === "playlist") {
      const playlistsFromDb = Storage.getPlaylists();
      const playlist = playlistsFromDb.find(p => p.id === activeSession.id);
      if (playlist) {
        const video = playlist.videos.find(v => v.id === activeVideoId);
        if (video) {
          video.completed = true;
          video.progress = 100;
        }
        Storage.savePlaylist(playlist);
        setPlaylists(playlistsFromDb);
      }
    } else if (activeSession && activeSession.type === "video") {
      const singlesFromDb = Storage.getSingleVideos();
      const video = singlesFromDb.find(v => v.id === activeSession.id);
      if (video) {
        video.completed = true;
        video.progress = 100;
        Storage.saveSingleVideo(video);
        setSingleVideos(singlesFromDb);
      }
    }

    if (settings.autoPlay && activeSession?.type !== "playlist") {
      handleNextVideo();
    }
  };

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === "INPUT" || 
         activeEl.tagName === "TEXTAREA" || 
         activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (!playerRef.current) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          try {
            const state = playerRef.current.getPlayerState();
            if (state === 1) { // playing
              playerRef.current.pauseVideo();
            } else if (state === 2 || state === -1) { // paused or unstarted
              playerRef.current.playVideo();
            }
          } catch {}
          break;
        case "arrowleft":
          e.preventDefault();
          try {
            const curr = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(Math.max(curr - 10, 0), true);
          } catch {}
          break;
        case "arrowright":
          e.preventDefault();
          try {
            const curr = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(curr + 10, true);
          } catch {}
          break;
        case "n":
          e.preventDefault();
          handleNextVideo();
          break;
        case "p":
          e.preventDefault();
          handlePrevVideo();
          break;
        case "f":
          e.preventDefault();
          setTheatreMode(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, activeVideoId, playlists, settings.autoPlay]);

  // Navigate video queue
  const handleNextVideo = () => {
    if (!activeSession || activeSession.type !== "playlist") return;

    const playlist = playlists.find(p => p.id === activeSession.id);
    if (!playlist) return;

    const currentIdx = playlist.videos.findIndex(v => v.id === activeVideoId);
    if (currentIdx > -1 && currentIdx < playlist.videos.length - 1) {
      const nextVid = playlist.videos[currentIdx + 1];
      playVideoInSession(nextVid.id, nextVid.title, nextVid.channelName);
    }
  };

  const handlePrevVideo = () => {
    if (!activeSession || activeSession.type !== "playlist") return;

    const playlist = playlists.find(p => p.id === activeSession.id);
    if (!playlist) return;

    const currentIdx = playlist.videos.findIndex(v => v.id === activeVideoId);
    if (currentIdx > 0) {
      const prevVid = playlist.videos[currentIdx - 1];
      playVideoInSession(prevVid.id, prevVid.title, prevVid.channelName);
    }
  };

  const playVideoInSession = (id: string, title: string, channelName: string) => {
    setActiveVideoId(id);
    setActiveVideoTitle(title);
    setActiveVideoChannel(channelName);
  };

  // Background Prefetching of upcoming lectures to ensure instant transitions
  useEffect(() => {
    if (!activeVideoId || activeSession?.type !== "playlist") return;
    
    const currentPlaylist = playlists.find(p => p.id === activeSession.id);
    if (!currentPlaylist) return;

    const currentIndex = currentPlaylist.videos.findIndex(v => v.id === activeVideoId);
    if (currentIndex === -1) return;

    // Prefetch next 3 lectures (e.g., current index + 1, + 2, + 3)
    const videosToPrefetch = currentPlaylist.videos.slice(currentIndex + 1, currentIndex + 4);
    
    videosToPrefetch.forEach(video => {
      // 1. Prefetch images to browser memory
      if (video.thumbnail) {
        const img = new Image();
        img.src = video.thumbnail;
      }

      // 2. Warm up browser cache by calling the metadata endpoint silently
      if (video.id) {
        fetch(`/api/video-metadata?id=${video.id}`).catch(() => {});
      }
    });
  }, [activeVideoId, activeSession, playlists]);


  const scrollToWorkspace = () => {
    setTimeout(() => {
      const element = document.getElementById("lecture-workspace");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const fetchDiagnostics = async () => {
    setIsTestingDiagnostics(true);
    try {
      const res = await fetch("/api/youtube-diagnostics");
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      } else {
        setDiagnosticsData({ error: `Failed to fetch diagnostics: ${res.statusText}` });
      }
    } catch (e: any) {
      setDiagnosticsData({ error: e.message || "Failed to reach server diagnostics" });
    } finally {
      setIsTestingDiagnostics(false);
    }
  };

  // URL input submission
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setErrorMessage("");
    setBackgroundUpdateAvailable(false);
    setBackgroundNewLecturesCount(0);
    setBackgroundPlaylistData(null);

    try {
      const parsed = parseYoutubeUrl(urlInput);
      if (!parsed) {
        throw new Error("Invalid YouTube URL. Please enter a valid video, shorts, live, or playlist link.");
      }

      const { type, id, videoId: maybeVideoId } = parsed;

      // Reset error state on new link submit
      setPlayerLoadError(false);
      setInitAttempts(0);

      if (type === "playlist") {
        let cachedPlaylist = Storage.getPlaylists().find(p => p.id === id);
        const initialVidId = maybeVideoId || "";
        
        // --- SMART CACHING & INSTANT RESUME ---
        if (cachedPlaylist && cachedPlaylist.videos.length > 0) {
          // Immediately display cached version! Instant loading (<500ms)
          setPlaylists(Storage.getPlaylists());
          setActiveSession({ id: cachedPlaylist.id, type: "playlist" });
          
          const lastWatchedVideo = cachedPlaylist.videos.find(v => v.progress > 0 && v.progress < 95) || cachedPlaylist.videos[0];
          if (lastWatchedVideo) {
            playVideoInSession(lastWatchedVideo.id, lastWatchedVideo.title, lastWatchedVideo.channelName);
          } else if (initialVidId) {
            const initialVid = cachedPlaylist.videos.find(v => v.id === initialVidId);
            if (initialVid) {
              playVideoInSession(initialVid.id, initialVid.title, initialVid.channelName);
            } else {
              playVideoInSession(cachedPlaylist.videos[0].id, cachedPlaylist.videos[0].title, cachedPlaylist.videos[0].channelName);
            }
          }
          
          setIsLoading(false);
          scrollToWorkspace();
          setUrlInput("");

          // --- BACKGROUND REFRESH ---
          // Quietly update in background without freezing the UI or interrupting the user
          fetch(`/api/playlist?id=${id}`)
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data && data.videos && data.videos.length > 0) {
                  // Find any new videos not present in cache
                  const cachedIds = new Set(cachedPlaylist!.videos.map(v => v.id));
                  const newVideos = data.videos.filter((v: any) => !cachedIds.has(v.id));

                  if (newVideos.length > 0) {
                    // Update detected! Show toast banner in UI
                    setBackgroundUpdateAvailable(true);
                    setBackgroundNewLecturesCount(newVideos.length);
                    setBackgroundPlaylistData(data);
                  } else {
                    // Silent update of metadata/title if changed, merge non-destructively
                    const updated = {
                      ...cachedPlaylist!,
                      title: data.title || cachedPlaylist!.title,
                      channelName: data.channelName || cachedPlaylist!.channelName,
                      thumbnail: data.thumbnail || cachedPlaylist!.thumbnail,
                    };
                    Storage.savePlaylist(updated);
                    setPlaylists(Storage.getPlaylists());
                  }
                }
              }
            })
            .catch((bgErr) => console.warn("Background playlist sync failed silently", bgErr));

          return;
        }

        // --- NEW PLAYLIST / FIRST LOAD (WITH PROGRESSIVE CHUNK LOADING) ---
        let playlist: PlaylistInfo | null = null;
        try {
          let data: any = null;
          try {
            const res = await fetch(`/api/playlist?id=${id}`);
            if (res.ok) {
              data = await res.ok ? await res.json() : null;
            } else {
              console.warn(`Server playlist endpoint returned ${res.status}. Falling back to client-side YouTube Data API...`);
              data = await fetchPlaylistFromYouTubeClient(id);
            }
          } catch (serverErr) {
            console.warn("Server playlist fetch failed. Falling back to client-side YouTube Data API...", serverErr);
            data = await fetchPlaylistFromYouTubeClient(id);
          }

          if (data && data.videos && data.videos.length > 0) {
            const totalVids = data.totalVideos || data.videos.length;
            
            if (totalVids > 20) {
              // progressive loading trigger! Take first 20 first
              const initialChunk = data.videos.slice(0, 20);
              playlist = {
                id: id,
                type: "playlist",
                title: data.title || "YouTube Playlist",
                channelName: data.channelName || "Unknown Channel",
                totalVideos: totalVids,
                videos: initialChunk,
                thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.videos[0].id}/hqdefault.jpg`,
                progress: 0,
                lastWatchedAt: new Date().toISOString()
              };

              // Store progressive state to continue importing in background
              setFullProgressiveVideos(data.videos);
              setProgressiveTotalCount(totalVids);
              setProgressiveLoadedCount(20);
              setProgressivePlaylistId(id);
              setProgressiveLoading(true);

            } else {
              playlist = {
                id: id,
                type: "playlist",
                title: data.title || "YouTube Playlist",
                channelName: data.channelName || "Unknown Channel",
                totalVideos: totalVids,
                videos: data.videos,
                thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.videos[0].id}/hqdefault.jpg`,
                progress: 0,
                lastWatchedAt: new Date().toISOString()
              };
            }
          }
        } catch (e: any) {
          console.error("Failed to load playlist from server or client fallback:", e);
          throw e; // Bubble up to handleUrlSubmit catch block so it shows in the UI error banner
        }

        // Fallback if scraping is totally down or returns empty
        if (!playlist) {
          playlist = {
            id: id,
            type: "playlist",
            title: "YouTube Playlist",
            channelName: "Unknown Channel",
            totalVideos: initialVidId ? 1 : 0,
            videos: initialVidId ? [{
              id: initialVidId,
              title: "Lecture 1",
              channelName: "Unknown Channel",
              duration: "10:00",
              thumbnail: `https://i.ytimg.com/vi/${initialVidId}/hqdefault.jpg`,
              progress: 0,
              lastWatchedPosition: 0,
              completed: false,
              lectureNumber: 1
            }] : [],
            thumbnail: initialVidId ? `https://i.ytimg.com/vi/${initialVidId}/hqdefault.jpg` : "",
            progress: 0,
            lastWatchedAt: new Date().toISOString()
          };
        }

        Storage.savePlaylist(playlist);
        setPlaylists(Storage.getPlaylists());
        setActiveSession({ id: playlist.id, type: "playlist" });
        
        if (playlist.videos.length > 0) {
          const firstVid = playlist.videos[0];
          playVideoInSession(firstVid.id, firstVid.title, firstVid.channelName);
        } else {
          playVideoInSession(initialVidId || "", "YouTube Playlist", "Unknown Channel");
        }

        // Save session state to IndexedDB
        try {
          await PlaylistDb.savePlaylistState({
            playlistId: id,
            playlistUrl: `https://www.youtube.com/playlist?list=${id}`,
            lastWatchedVideo: initialVidId || (playlist.videos[0]?.id || ""),
            resumeTimestamp: 0,
            watchProgress: 0,
            updatedAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.error("Failed to store playlist in IndexedDB", dbErr);
        }

      } else {
        // --- SINGLE VIDEO LOAD (WITH PARALLEL GEMINI METADATA FETCH) ---
        let video = Storage.getSingleVideos().find(v => v.id === id);
        
        // Set immediately to render skeleton and start player frame immediately
        setIsSingleVideoDetailsLoading(true);
        setSingleVideoMetadata(null);
        setActiveSession({ id, type: "video" });
        setActiveVideoId(id);
        setActiveVideoTitle(video?.title || "Loading lecture details...");
        setActiveVideoChannel(video?.channelName || "Connecting...");

        scrollToWorkspace();
        setUrlInput("");
        setIsLoading(false); // Stop loading spinner, the player is interactive now!

        // Parallel metadata requests: Scraper & Gemini
        const scrapePromise = fetch(`/api/video-metadata?id=${id}`)
          .then(async (r) => {
            if (r.ok) {
              return r.json();
            } else {
              console.warn(`Server video-metadata endpoint returned ${r.status}. Falling back to client-side YouTube Data API...`);
              return fetchVideoFromYouTubeClient(id).catch(() => null);
            }
          })
          .catch(async () => {
            console.warn("Server video-metadata fetch failed. Falling back to client-side YouTube Data API...");
            return fetchVideoFromYouTubeClient(id).catch(() => null);
          });

        const geminiPromise = hasGeminiKey()
          ? fetchVideoMetadataWithGemini(id).catch((err) => {
              console.warn("Gemini metadata failed, falling back to basic scraping:", err);
              return null;
            })
          : Promise.resolve(null);

        Promise.all([scrapePromise, geminiPromise]).then(([scraped, gemini]) => {
          const mergedTitle = gemini?.title || scraped?.title || video?.title || "YouTube Lecture";
          const mergedChannel = gemini?.channelName || scraped?.channelName || video?.channelName || "Unknown Creator";
          const mergedDuration = scraped?.duration || video?.duration || "10:00";
          const mergedDesc = gemini?.description || scraped?.description || "";
          const mergedPublishDate = scraped?.publishDate || "";
          const mergedTags = gemini?.tags || [];

          const videoToSave: SingleVideoInfo = {
            id: id,
            type: "video",
            title: mergedTitle,
            channelName: mergedChannel,
            duration: mergedDuration,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            progress: video?.progress || 0,
            lastWatchedAt: new Date().toISOString(),
            completed: video?.completed || false,
            isFavorite: video?.isFavorite || false
          };

          Storage.saveSingleVideo(videoToSave);
          setSingleVideos(Storage.getSingleVideos());
          
          setActiveVideoTitle(mergedTitle);
          setActiveVideoChannel(mergedChannel);

          setSingleVideoMetadata({
            id,
            title: mergedTitle,
            channelName: mergedChannel,
            duration: mergedDuration,
            publishDate: mergedPublishDate,
            description: mergedDesc,
            tags: mergedTags
          });

          setIsSingleVideoDetailsLoading(false);
        }).catch(err => {
          console.error("Parallel single video metadata fetch failed", err);
          setIsSingleVideoDetailsLoading(false);
        });

        return; // Early return because single video details are fetched asynchronously
      }

      scrollToWorkspace();
      setUrlInput("");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please verify your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Background Progressive Chunk Loading Effect
  useEffect(() => {
    if (!progressiveLoading || !progressivePlaylistId || fullProgressiveVideos.length === 0) return;

    const timer = setTimeout(() => {
      const playlistsFromDb = Storage.getPlaylists();
      const plIndex = playlistsFromDb.findIndex(p => p.id === progressivePlaylistId);
      if (plIndex === -1) {
        setProgressiveLoading(false);
        return;
      }

      const pl = playlistsFromDb[plIndex];
      const nextCount = Math.min(progressiveLoadedCount + 20, progressiveTotalCount);
      
      // Slice the next set of videos
      const chunk = fullProgressiveVideos.slice(0, nextCount);
      
      pl.videos = chunk;
      pl.totalVideos = progressiveTotalCount; // Keep total videos accurate

      // Calculate correct progress
      const completedCount = pl.videos.filter(v => v.completed).length;
      pl.progress = Math.round((completedCount / progressiveTotalCount) * 100) || 0;

      playlistsFromDb[plIndex] = pl;
      Storage.savePlaylist(pl);
      setPlaylists(playlistsFromDb);
      setProgressiveLoadedCount(nextCount);

      if (nextCount >= progressiveTotalCount) {
        setProgressiveLoading(false);
      }
    }, 400); // 400ms interval for super smooth animation and rendering

    return () => clearTimeout(timer);
  }, [progressiveLoading, progressivePlaylistId, progressiveLoadedCount, progressiveTotalCount, fullProgressiveVideos]);

  // Merge Background Refresh Playlist updates
  const handleApplyBackgroundUpdate = () => {
    if (!backgroundPlaylistData || !activeSession || activeSession.type !== "playlist") return;

    const playlistsFromDb = Storage.getPlaylists();
    const plIndex = playlistsFromDb.findIndex(p => p.id === activeSession.id);
    if (plIndex === -1) return;

    const currentPl = playlistsFromDb[plIndex];
    const incomingVideos = backgroundPlaylistData.videos || [];

    // Merge incoming videos, keeping user's progress and notes intact!
    const mergedVideos = incomingVideos.map((v: any, index: number) => {
      const existing = currentPl.videos.find(x => x.id === v.id);
      return {
        ...v,
        progress: existing?.progress || 0,
        lastWatchedPosition: existing?.lastWatchedPosition || 0,
        completed: existing?.completed || false,
        lectureNumber: index + 1
      };
    });

    currentPl.videos = mergedVideos;
    currentPl.totalVideos = mergedVideos.length;
    currentPl.title = backgroundPlaylistData.title || currentPl.title;
    currentPl.channelName = backgroundPlaylistData.channelName || currentPl.channelName;
    currentPl.thumbnail = backgroundPlaylistData.thumbnail || currentPl.thumbnail;

    // Recalculate progress
    const completedCount = mergedVideos.filter((v: any) => v.completed).length;
    currentPl.progress = Math.round((completedCount / mergedVideos.length) * 100) || 0;

    playlistsFromDb[plIndex] = currentPl;
    Storage.savePlaylist(currentPl);
    setPlaylists(playlistsFromDb);

    // Reset background update state
    setBackgroundUpdateAvailable(false);
    setBackgroundNewLecturesCount(0);
    setBackgroundPlaylistData(null);
  };


  // Set active session from history/favorites click
  const resumeLearningSession = (id: string, type: "playlist" | "video", shouldSwitchTab = true) => {
    setActiveSession({ id, type });
    setPlayerLoadError(false);
    setInitAttempts(0);

    if (type === "playlist") {
      const playlist = Storage.getPlaylists().find(p => p.id === id);
      if (playlist) {
        // Continue from last unfinished video or first
        const lastWatchedVideo = playlist.videos.find(v => v.progress > 0 && v.progress < 95) || playlist.videos[0];
        if (lastWatchedVideo) {
          playVideoInSession(lastWatchedVideo.id, lastWatchedVideo.title, lastWatchedVideo.channelName);
          // Sync playlist to IndexedDB
          try {
            PlaylistDb.savePlaylistState({
              playlistId: playlist.id,
              playlistUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
              lastWatchedVideo: lastWatchedVideo.id,
              resumeTimestamp: Math.floor(lastWatchedVideo.lastWatchedPosition || 0),
              watchProgress: playlist.progress,
              updatedAt: new Date().toISOString()
            });
          } catch (dbErr) {
            console.error("Failed to store playlist in IndexedDB on resume", dbErr);
          }
        }
      }
    } else {
      const video = Storage.getSingleVideos().find(v => v.id === id);
      if (video) {
        playVideoInSession(video.id, video.title, video.channelName);
      }
    }
    if (shouldSwitchTab) {
      setActiveTab("study");
    }
  };

  // Safe direct play helper for bookmarks, notes, or search items
  const playVideoDirectly = (videoId: string, videoTitle: string, channelName: string = "", seekSeconds: number | null = null) => {
    if (seekSeconds !== null) {
      setPendingSeekSeconds(seekSeconds);
    }
    
    // 1. Is there a playlist containing this video?
    const pl = Storage.getPlaylists().find(p => p.videos.some(x => x.id === videoId));
    if (pl) {
      setActiveSession({ id: pl.id, type: "playlist" });
      playVideoInSession(videoId, videoTitle, pl.channelName || channelName);
    } else {
      // 2. Play as single video. Check if it exists in single videos
      const existing = Storage.getSingleVideos().find(v => v.id === videoId);
      if (!existing) {
        const newSingle: SingleVideoInfo = {
          id: videoId,
          type: "video",
          title: videoTitle,
          channelName: channelName || "YouTube",
          duration: "0:00",
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          progress: 0,
          lastWatchedAt: new Date().toISOString(),
          completed: false
        };
        Storage.saveSingleVideo(newSingle);
        setSingleVideos(Storage.getSingleVideos());
      }
      setActiveSession({ id: videoId, type: "video" });
      playVideoInSession(videoId, videoTitle, existing?.channelName || channelName || "YouTube");
    }
    
    setActiveTab("study");
    setSearchQuery("");
  };

  // Toggle Favorite
  const handleToggleFav = (type: "playlist" | "video", id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Storage.toggleFavorite(type, id);
    setFavorites(Storage.getFavorites());
    setPlaylists(Storage.getPlaylists());
    setSingleVideos(Storage.getSingleVideos());
  };

  // Toggle active video favorite
  const handleToggleActiveVideoFavorite = () => {
    if (!activeVideoId) return;
    
    const allSingles = Storage.getSingleVideos();
    const existingVideo = allSingles.find(v => v.id === activeVideoId);
    
    if (existingVideo) {
      handleToggleFav("video", activeVideoId);
    } else {
      const newSingle: SingleVideoInfo = {
        id: activeVideoId,
        type: "video",
        title: activeVideoTitle,
        channelName: activeVideoChannel,
        duration: formatSecondsToDuration(playerDuration),
        thumbnail: `https://img.youtube.com/vi/${activeVideoId}/mqdefault.jpg`,
        progress: 0,
        lastWatchedAt: new Date().toISOString(),
        completed: false,
        isFavorite: true
      };
      Storage.saveSingleVideo(newSingle);
      Storage.toggleFavorite("video", activeVideoId);
      
      setFavorites(Storage.getFavorites());
      setPlaylists(Storage.getPlaylists());
      setSingleVideos(Storage.getSingleVideos());
    }
  };

  // Bookmark actions
  const handleAddBookmark = (customLabel?: string) => {
    if (!playerRef.current || !playerReady) return;
    try {
      const seconds = playerRef.current.getCurrentTime();
      if (isNaN(seconds)) return;

      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? "0" + s : s}`;
      };

      const newBookmark: BookmarkType = {
        id: Math.random().toString(36).slice(2, 9),
        videoId: activeVideoId,
        timestamp: seconds,
        timeText: formatTime(seconds),
        label: customLabel || bookmarkLabel.trim() || `Bookmark at ${formatTime(seconds)}`,
        createdAt: new Date().toISOString()
      };

      Storage.saveBookmark(newBookmark);
      setActiveBookmarks(Storage.getBookmarksForVideo(activeVideoId));
      setBookmarkLabel("");
    } catch (e) {
      console.error("Failed to fetch player current time", e);
    }
  };

  const handleSeekToBookmark = (sec: number) => {
    if (playerRef.current && playerReady) {
      playerRef.current.seekTo(sec, true);
      playerRef.current.playVideo();
    }
  };

  const handleDeleteBookmark = (bId: string) => {
    Storage.deleteBookmark(activeVideoId, bId);
    setActiveBookmarks(Storage.getBookmarksForVideo(activeVideoId));
  };

  const handleEditBookmark = (b: BookmarkType) => {
    setEditingBookmarkId(b.id);
    setEditingBookmarkLabel(b.label);
  };

  const handleSaveBookmarkLabel = (bId: string) => {
    Storage.updateBookmarkLabel(activeVideoId, bId, editingBookmarkLabel);
    setEditingBookmarkId(null);
    setActiveBookmarks(Storage.getBookmarksForVideo(activeVideoId));
  };

  // Settings Actions
  const handleSettingChange = (key: keyof StudySettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    Storage.saveSettings(updated);
    
    // Apply speed instantly if player exists
    if (key === "playbackSpeed" && playerRef.current && playerReady) {
      if (typeof playerRef.current.setPlaybackRate === "function") {
        try {
          playerRef.current.setPlaybackRate(parseFloat(value));
        } catch (e) {
          console.warn("Could not set playback speed", e);
        }
      }
    }
  };

  const handleExportAll = () => {
    const dataStr = Storage.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LearnStudy_Backup_${new Date().toLocaleDateString("en-CA")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const ok = Storage.importData(content);
        if (ok) {
          toast.success("Backup Restored", "All backup data restored successfully!");
          setPlaylists(Storage.getPlaylists());
          setSingleVideos(Storage.getSingleVideos());
          setFavorites(Storage.getFavorites());
          setSettings(Storage.getSettings());
        } else {
          toast.error("Restore Failed", "Invalid file format. Please upload a valid LearnStudy backup JSON file.");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    toast.warning(
      "Reset All Local Data?",
      "This action is permanent and will clear all notes, bookmarks, playlists, and histories!",
      {
        duration: 10000,
        action: {
          label: "Reset Data",
          primary: true,
          onClick: () => {
            Storage.resetAllData();
            setPlaylists([]);
            setSingleVideos([]);
            setFavorites({ playlists: [], videos: [] });
            setActiveSession(null);
            setActiveVideoId("");
            setActiveVideoTitle("");
            toast.success("Data Reset Complete", "All local data has been successfully cleared.");
            setActiveTab("home");
          }
        }
      }
    );
  };

  // Keyboard Shortcuts system listener
  useEffect(() => {
    if (!settings.enableShortcuts) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Identify if the user is typing in an input
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.hasAttribute("contenteditable")
      );

      // Check key modifiers
      const hasCtrl = e.ctrlKey || e.metaKey;
      const hasAlt = e.altKey;
      const hasShift = e.shiftKey;

      // Productivity / Note Shortcuts (which should work even when typing inside Notes textarea)
      // Ctrl + Enter: Save Note
      if (hasCtrl && e.key === "Enter" && !hasShift && !hasAlt) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("studytube-save-notes"));
        showShortcutToast("💾 Notes Saved!");
        return;
      }

      // Ctrl + Shift + B: Bookmark Timestamp
      if (hasCtrl && hasShift && (e.key === "B" || e.key === "b") && !hasAlt) {
        e.preventDefault();
        handleAddBookmark("Bookmark from Keyboard");
        showShortcutToast("🔖 Bookmark Added!");
        return;
      }

      // Ctrl + D: Delete Selected Note
      if (hasCtrl && (e.key === "D" || e.key === "d") && !hasShift && !hasAlt) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("studytube-delete-notes"));
        showShortcutToast("🗑️ Notes Cleared");
        return;
      }

      // If user is typing in general, ignore other general keyboard shortcuts
      if (isInputFocused) {
        // Allow manual save Ctrl + S inside notes input
        if (hasCtrl && (e.key === "s" || e.key === "S") && !hasShift && !hasAlt) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("studytube-save-notes"));
          showShortcutToast("💾 Notes Saved!");
          return;
        }
        // Allow bookmark with Ctrl + B inside notes
        if (hasCtrl && (e.key === "b" || e.key === "B") && !hasShift && !hasAlt) {
          e.preventDefault();
          handleAddBookmark("Quick Bookmark");
          showShortcutToast("🔖 Bookmark Added!");
          return;
        }
        return;
      }

      // --- GENERAL GLOBAL SHORTCUTS (when NOT typing) ---

      // Ctrl + S: Save Notes
      if (hasCtrl && (e.key === "s" || e.key === "S") && !hasShift && !hasAlt) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("studytube-save-notes"));
        showShortcutToast("💾 Notes Saved!");
        return;
      }

      // B / Ctrl + B: Bookmark Current Time
      if (((hasCtrl && (e.key === "b" || e.key === "B")) || (e.key === "b" || e.key === "B")) && !hasShift && !hasAlt) {
        e.preventDefault();
        handleAddBookmark();
        showShortcutToast("🔖 Bookmark Added!");
        return;
      }

      // Ctrl + N: Open & Focus Notes Tab
      if (hasCtrl && (e.key === "n" || e.key === "N") && !hasShift && !hasAlt) {
        e.preventDefault();
        setActiveTab("study");
        setTimeout(() => {
          const notesTextarea = document.querySelector("textarea[placeholder*='Start taking notes']") as HTMLTextAreaElement;
          if (notesTextarea) {
            notesTextarea.focus();
            showShortcutToast("✍️ Focused Notes");
          }
        }, 150);
        return;
      }

      // Ctrl + /: Focus Search bar
      if (hasCtrl && e.key === "/" && !hasShift && !hasAlt) {
        e.preventDefault();
        const searchInput = document.querySelector("input[placeholder*='search']") as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          showShortcutToast("🔍 Focused Search");
        }
        return;
      }

      // Ctrl + H: Navigation to History Tab
      if (hasCtrl && (e.key === "h" || e.key === "H") && !hasShift && !hasAlt) {
        e.preventDefault();
        setActiveTab("history");
        showShortcutToast("🕒 History Panel");
        return;
      }

      // Ctrl + P: Navigation to Pomodoro Tab
      if (hasCtrl && (e.key === "p" || e.key === "P") && !hasShift && !hasAlt) {
        e.preventDefault();
        setActiveTab("pomodoro");
        showShortcutToast("🍅 Pomodoro Station");
        return;
      }

      // Ctrl + Shift + F: Toggle Focus Mode
      if (hasCtrl && hasShift && (e.key === "f" || e.key === "F") && !hasAlt) {
        e.preventDefault();
        setFocusMode(prev => !prev);
        showShortcutToast(focusMode ? "👁️ Standard View" : "🔥 Focus Mode ON");
        return;
      }

      // Ctrl + Shift + L: Toggle Lecture List (Theatre Mode)
      if (hasCtrl && hasShift && (e.key === "l" || e.key === "L") && !hasAlt) {
        e.preventDefault();
        setTheatreMode(prev => !prev);
        showShortcutToast(theatreMode ? "📋 Showing Lecture List" : "🎬 Hiding Lecture List");
        return;
      }

      // Ctrl + Shift + T: Theme Toggle
      if (hasCtrl && hasShift && (e.key === "t" || e.key === "T") && !hasAlt) {
        e.preventDefault();
        const newTheme = settings.theme === "dark" ? "light" : "dark";
        handleSettingChange("theme", newTheme);
        showShortcutToast(newTheme === "dark" ? "🌙 Dark Theme" : "☀️ Light Theme");
        return;
      }

      // Pomodoro Alt Controls
      // Alt + S: Start Pomodoro
      if (hasAlt && (e.key === "s" || e.key === "S") && !hasCtrl && !hasShift) {
        e.preventDefault();
        try {
          startPomo();
          showShortcutToast("🍅 Pomodoro Started");
        } catch (err) {}
        return;
      }

      // Alt + P: Pause Pomodoro
      if (hasAlt && (e.key === "p" || e.key === "P") && !hasCtrl && !hasShift) {
        e.preventDefault();
        try {
          pausePomo();
          showShortcutToast("⏸️ Pomodoro Paused");
        } catch (err) {}
        return;
      }

      // Alt + R: Reset Pomodoro
      if (hasAlt && (e.key === "r" || e.key === "R") && !hasCtrl && !hasShift) {
        e.preventDefault();
        try {
          resetPomo();
          showShortcutToast("🔄 Pomodoro Reset");
        } catch (err) {}
        return;
      }

      // --- PLAYER CONTROLS (Only when Player is ready) ---
      const isPlayerActive = playerRef.current && playerReady;
      if (!isPlayerActive) return;

      // Space / K: Play/Pause
      if ((e.key === " " || e.key === "k" || e.key === "K") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const state = playerRef.current.getPlayerState();
          if (state === 1) {
            playerRef.current.pauseVideo();
            showShortcutToast("⏸️ Pause");
          } else {
            playerRef.current.playVideo();
            showShortcutToast("▶️ Play");
          }
        } catch (err) {}
        return;
      }

      // J: Rewind 10s
      if ((e.key === "j" || e.key === "J") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const curTime = playerRef.current.getCurrentTime();
          playerRef.current.seekTo(Math.max(0, curTime - 10), true);
          showShortcutToast("⏪ -10s");
        } catch (err) {}
        return;
      }

      // L: Fast Forward 10s
      if ((e.key === "l" || e.key === "L") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const curTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration() || 0;
          playerRef.current.seekTo(Math.min(duration, curTime + 10), true);
          showShortcutToast("⏩ +10s");
        } catch (err) {}
        return;
      }

      // Left arrow (←): Rewind 5s
      if (e.key === "ArrowLeft" && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const curTime = playerRef.current.getCurrentTime();
          playerRef.current.seekTo(Math.max(0, curTime - 5), true);
          showShortcutToast("◀️ -5s");
        } catch (err) {}
        return;
      }

      // Right arrow (→): Fast Forward 5s
      if (e.key === "ArrowRight" && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const curTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration() || 0;
          playerRef.current.seekTo(Math.min(duration, curTime + 5), true);
          showShortcutToast("▶️ +5s");
        } catch (err) {}
        return;
      }

      // 0–9: Jump to Percentages
      if (/^[0-9]$/.test(e.key) && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const percent = parseInt(e.key) * 10;
          const duration = playerRef.current.getDuration() || 0;
          const targetSeconds = (duration * percent) / 100;
          playerRef.current.seekTo(targetSeconds, true);
          showShortcutToast(`⏭️ Jump to ${percent}%`);
        } catch (err) {}
        return;
      }

      // `,` : Previous frame (0.03 seconds seek back when paused)
      if (e.key === "," && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const state = playerRef.current.getPlayerState();
          if (state !== 1) {
            const curTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(Math.max(0, curTime - 0.03), true);
            showShortcutToast("⏮️ Prev Frame");
          }
        } catch (err) {}
        return;
      }

      // `.` : Next frame (0.03 seconds seek forward when paused)
      if (e.key === "." && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const state = playerRef.current.getPlayerState();
          if (state !== 1) {
            const curTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration() || 0;
            playerRef.current.seekTo(Math.min(duration, curTime + 0.03), true);
            showShortcutToast("⏭️ Next Frame");
          }
        } catch (err) {}
        return;
      }

      // Playback speed controls (Shift + < / >)
      // Decrease speed (<)
      if (e.key === "<" && hasShift && !hasCtrl && !hasAlt) {
        e.preventDefault();
        try {
          const currentRate = playerRef.current.getPlaybackRate() || 1;
          const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          const prevSpeed = [...speeds].reverse().find(s => s < currentRate) || 0.5;
          playerRef.current.setPlaybackRate(prevSpeed);
          handleSettingChange("playbackSpeed", prevSpeed);
          showShortcutToast(`🐢 Speed ${prevSpeed}x`);
        } catch (err) {}
        return;
      }

      // Increase speed (>)
      if (e.key === ">" && hasShift && !hasCtrl && !hasAlt) {
        e.preventDefault();
        try {
          const currentRate = playerRef.current.getPlaybackRate() || 1;
          const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          const nextSpeed = speeds.find(s => s > currentRate) || 2.0;
          playerRef.current.setPlaybackRate(nextSpeed);
          handleSettingChange("playbackSpeed", nextSpeed);
          showShortcutToast(`🐇 Speed ${nextSpeed}x`);
        } catch (err) {}
        return;
      }

      // M: Mute/Unmute
      if ((e.key === "m" || e.key === "M") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          if (playerRef.current.isMuted()) {
            playerRef.current.unMute();
            showShortcutToast("🔊 Unmuted");
          } else {
            playerRef.current.mute();
            showShortcutToast("🔇 Muted");
          }
        } catch (err) {}
        return;
      }

      // ArrowUp (↑): Volume +5%
      if (e.key === "ArrowUp" && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const volume = playerRef.current.getVolume();
          const nextVol = Math.min(100, volume + 5);
          playerRef.current.setVolume(nextVol);
          showShortcutToast(`Volume ${nextVol}%`);
        } catch (err) {}
        return;
      }

      // ArrowDown (↓): Volume -5%
      if (e.key === "ArrowDown" && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        try {
          const volume = playerRef.current.getVolume();
          const nextVol = Math.max(0, volume - 5);
          playerRef.current.setVolume(nextVol);
          showShortcutToast(`Volume ${nextVol}%`);
        } catch (err) {}
        return;
      }

      // F: Fullscreen
      if ((e.key === "f" || e.key === "F") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        if (!document.fullscreenElement) {
          playerContainerRef.current?.requestFullscreen().catch(() => {});
          showShortcutToast("📺 Fullscreen ON");
        } else {
          document.exitFullscreen().catch(() => {});
          showShortcutToast("📺 Fullscreen OFF");
        }
        return;
      }

      // T: Theatre Mode
      if ((e.key === "t" || e.key === "T") && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        setTheatreMode(prev => !prev);
        showShortcutToast(theatreMode ? "🎬 Standard Screen" : "🎭 Wide Screen");
        return;
      }

      // Esc: Exit Fullscreen
      if (e.key === "Escape" && !hasCtrl && !hasAlt && !hasShift) {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          showShortcutToast("📺 Fullscreen OFF");
        }
        return;
      }

      // Shift + N: Next Lecture
      if (e.key === "N" && hasShift && !hasCtrl && !hasAlt) {
        e.preventDefault();
        handleNextVideo();
        showShortcutToast("⏭️ Next Lecture");
        return;
      }

      // Shift + P: Previous Lecture
      if (e.key === "P" && hasShift && !hasCtrl && !hasAlt) {
        e.preventDefault();
        handlePrevVideo();
        showShortcutToast("⏮️ Previous Lecture");
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [playerReady, activeVideoId, activeTab, theatreMode, focusMode, settings, activeBookmarks, bookmarkLabel]);

  // Continue Learning block
  const continueLearningItem = useMemo(() => {
    const all = [...playlists, ...singleVideos];
    if (all.length === 0) return null;
    return all.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())[0];
  }, [playlists, singleVideos]);

  // Sorted and filtered watch history items (most recently watched first)
  const sortedHistoryItems = useMemo(() => {
    let items: Array<PlaylistInfo | SingleVideoInfo> = [];
    if (historyFilter === "all" || historyFilter === "playlist") {
      items = [...items, ...playlists];
    }
    if (historyFilter === "all" || historyFilter === "video") {
      items = [...items, ...singleVideos];
    }
    return items.sort((a, b) => {
      const timeA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
      const timeB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [playlists, singleVideos, historyFilter]);

  // Unified global search across playlists, videos, notes, bookmarks
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();

    // Matching Playlists & single videos
    const matchedPlaylists = playlists.filter(p => p.title.toLowerCase().includes(query) || p.channelName.toLowerCase().includes(query));
    const matchedSingles = singleVideos.filter(v => v.title.toLowerCase().includes(query) || v.channelName.toLowerCase().includes(query));

    // Matching Notes
    const notesDb = Storage.getNotes();
    const matchedNotes = Object.entries(notesDb)
      .map(([vId, text]) => {
        // Find corresponding video title
        let vTitle = "Unknown Lecture";
        const matchedPl = playlists.find(p => p.videos.some(vid => vid.id === vId));
        const matchedVid = matchedPl?.videos.find(vid => vid.id === vId) || singleVideos.find(sv => sv.id === vId);
        if (matchedVid) vTitle = matchedVid.title;

        return { videoId: vId, text, title: vTitle };
      })
      .filter(item => item.text.toLowerCase().includes(query));

    // Matching Bookmarks
    const bookmarksDb = Storage.getBookmarks();
    const matchedBookmarks: any[] = [];
    Object.entries(bookmarksDb).forEach(([vId, list]) => {
      let vTitle = "Unknown Lecture";
      const matchedPl = playlists.find(p => p.videos.some(vid => vid.id === vId));
      const matchedVid = matchedPl?.videos.find(vid => vid.id === vId) || singleVideos.find(sv => sv.id === vId);
      if (matchedVid) vTitle = matchedVid.title;

      list.forEach(b => {
        if (b.label.toLowerCase().includes(query)) {
          matchedBookmarks.push({ ...b, videoTitle: vTitle });
        }
      });
    });

    return {
      playlists: matchedPlaylists,
      videos: matchedSingles,
      notes: matchedNotes,
      bookmarks: matchedBookmarks
    };
  }, [searchQuery, playlists, singleVideos]);

  // Clean formatted time
  const formatTimeText = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300 md:overflow-hidden">
      
      {/* 1. Header / Top App Bar */}
      {!focusMode && (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-900 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
              <div className="bg-gradient-to-tr from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-900/40 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800 flex items-center justify-center">
                <img src="/favicon.svg" alt="LearnStudy" className="w-7 h-7" referrerPolicy="no-referrer" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                LearnStudy
              </span>
            </div>
          </div>

          {/* Global Search Input */}
          <div className="relative max-w-md w-full mx-4 hidden md:block">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search lectures, saved notes, bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-zinc-900 border border-transparent focus:border-slate-300 dark:focus:border-zinc-800 text-sm pl-10 pr-4 py-2 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Top actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Stats display (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 px-3 py-1.5 rounded-xl">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                {Storage.getStreakStats().current} Day Streak
              </span>
            </div>

            {/* Pomodoro Timer top bar button */}
            <button
              onClick={() => { setActiveTab("pomodoro"); setSearchQuery(""); }}
              className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] shadow-sm hover:shadow-md ${
                activeTab === "pomodoro"
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 hover:border-orange-500/60"
                  : "bg-slate-100 hover:bg-slate-200/80 border-slate-200/50 hover:border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-zinc-800 dark:border-zinc-800/80 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-white"
              }`}
              title="Pomodoro Timer"
            >
              <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${!pomoState.isPaused && pomoState.mode === "focus" ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }} />
              <span className="text-xs font-black hidden xs:inline tracking-wide font-mono">
                {(() => {
                  const remainingSecs = Math.ceil(pomoState.remainingMs / 1000);
                  const m = Math.floor(remainingSecs / 60);
                  const s = remainingSecs % 60;
                  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                })()}
              </span>
            </button>

            {/* Mobile Statistics Button */}
            <button
              onClick={() => { setActiveTab("stats"); setSearchQuery(""); }}
              className={`p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] shadow-sm hover:shadow-md flex md:hidden items-center justify-center ${
                activeTab === "stats"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 hover:border-blue-500/60"
                  : "bg-slate-100 hover:bg-slate-200/80 border-slate-200/50 hover:border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-zinc-800 dark:border-zinc-800/80 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-white"
              }`}
              title="Study Statistics"
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Theme Single Switch Toggle */}
            <button
              onClick={() => {
                const nextTheme = settings.theme === "light" ? "dark" : settings.theme === "dark" ? "system" : "light";
                handleSettingChange("theme", nextTheme);
              }}
              className={`p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] shadow-sm hover:shadow-md flex items-center justify-center ${
                settings.theme === "dark"
                  ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-blue-400 hover:text-blue-300"
                  : settings.theme === "system"
                  ? "bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300 text-amber-500 hover:text-amber-600"
              }`}
              title={settings.theme === "dark" ? "Switch to System Theme" : settings.theme === "system" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {settings.theme === "dark" ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : settings.theme === "system" ? <Laptop className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Search input */}
      {!focusMode && (
        <div className="p-3 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-900 block md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search notes, playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-zinc-900 border border-transparent focus:border-slate-200 dark:focus:border-zinc-800 text-xs pl-9 pr-8 py-2 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-slate-400 dark:text-zinc-500">
                <X className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row relative md:overflow-hidden">
        
        {/* 2. Desktop Sidebar */}
        <aside className={`border-r border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-4 shrink-0 transition-all duration-300 ${focusMode ? "hidden" : "hidden md:flex flex-col justify-between"} ${sidebarCollapsed ? "w-[72px]" : "w-[260px]"}`}>
          <div className="space-y-6">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between px-3">
                <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Core Hub
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-750 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-900 transition-colors hidden md:block cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-750 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-900 transition-colors hidden md:block cursor-pointer"
                  title="Expand Sidebar"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
            
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab("home"); setSearchQuery(""); }}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  activeTab === "home" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Home" : undefined}
              >
                <Home className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Home</span>}
              </button>
              
              <button
                onClick={() => { setActiveTab("study"); setSearchQuery(""); }}
                disabled={!activeVideoId && !activeSession}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  !activeVideoId && !activeSession ? "opacity-50 cursor-not-allowed" : ""
                } ${
                  activeTab === "study" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Study Player" : undefined}
              >
                <Tv className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Study Player</span>}
              </button>

              <button
                onClick={() => { setActiveTab("history"); setSearchQuery(""); }}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  activeTab === "history" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Watch History" : undefined}
              >
                <History className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Watch History</span>}
              </button>

              <button
                onClick={() => { setActiveTab("favorites"); setSearchQuery(""); }}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  activeTab === "favorites" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Favorites" : undefined}
              >
                <Heart className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Favorites</span>}
              </button>

              <button
                onClick={() => { setActiveTab("pomodoro"); setSearchQuery(""); }}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  activeTab === "pomodoro" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Pomodoro Timer" : undefined}
              >
                <Clock className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Pomodoro Timer</span>}
              </button>

              <button
                onClick={() => { setActiveTab("stats"); setSearchQuery(""); }}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                  activeTab === "stats" && !searchQuery
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title={sidebarCollapsed ? "Statistics" : undefined}
              >
                <TrendingUp className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Statistics</span>}
              </button>
            </nav>
          </div>

          {/* Settings Section at the absolute bottom */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-900/60 shrink-0">
            <button
              onClick={() => { setActiveTab("settings"); setSearchQuery(""); }}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-semibold transition ${
                activeTab === "settings" && !searchQuery
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
              title={sidebarCollapsed ? "Settings" : undefined}
            >
              <Settings className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>
          </div>
        </aside>

        {/* 3. Main Workspace Container */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
          
          {/* SEARCH RESULTS TAB OVERRIDE */}
          {searchQuery ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <Search className="w-6 h-6 text-blue-500" />
                  Search Results for "{searchQuery}"
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Searching inside local playlists, single video lectures, markdown notes, and custom bookmarks.
                </p>
              </div>

              {searchResults && (
                <div className="space-y-6">
                  {/* Playlists matched */}
                  {searchResults.playlists.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-blue-500" />
                        Playlists ({searchResults.playlists.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.playlists.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              resumeLearningSession(p.id, "playlist");
                              setSearchQuery("");
                            }}
                            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 p-3.5 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] hover:border-blue-500/30 dark:hover:border-blue-500/20 transition-all duration-250"
                          >
                            <img src={p.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} className="w-full aspect-video object-cover rounded-xl mb-3" alt={p.title} />
                            <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 line-clamp-1">{p.title}</div>
                            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{p.channelName} • {p.totalVideos} videos</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos matched */}
                  {searchResults.videos.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Tv className="w-5 h-5 text-emerald-500" />
                        Single Videos ({searchResults.videos.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.videos.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => {
                              playVideoDirectly(v.id, v.title, v.channelName);
                            }}
                            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 p-3.5 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-250"
                          >
                            <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} className="w-full aspect-video object-cover rounded-xl mb-3" alt={v.title} />
                            <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 line-clamp-1">{v.title}</div>
                            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>{v.channelName}</span>
                              <span>•</span>
                              <span>{v.duration !== "LIVE" ? v.duration : ""}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes matched */}
                  {searchResults.notes.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        Lecture Notes ({searchResults.notes.length})
                      </h2>
                      <div className="space-y-3">
                        {searchResults.notes.map(n => (
                          <div 
                            key={n.videoId} 
                            onClick={() => {
                              playVideoDirectly(n.videoId, n.title, "");
                            }}
                            className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 rounded-2xl cursor-pointer hover:bg-amber-500/5 hover:shadow-md hover:scale-[1.005] active:scale-[0.995] hover:border-amber-500/30 dark:hover:border-amber-500/20 transition-all duration-250"
                          >
                            <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{n.title}</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2 line-clamp-2 font-mono">
                              {n.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bookmarks matched */}
                  {searchResults.bookmarks.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-purple-500" />
                        Bookmarks ({searchResults.bookmarks.length})
                      </h2>
                      <div className="space-y-3">
                        {searchResults.bookmarks.map((b: any) => (
                          <div 
                            key={b.id} 
                            onClick={() => {
                              playVideoDirectly(b.videoId, b.videoTitle, "", b.timestamp);
                            }}
                            className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 rounded-2xl cursor-pointer hover:bg-purple-500/5 hover:shadow-md hover:scale-[1.005] active:scale-[0.995] hover:border-purple-500/30 dark:hover:border-purple-500/20 transition-all duration-250 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{b.label}</div>
                              <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Lecture: {b.videoTitle}</div>
                            </div>
                            <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold px-2.5 py-1 rounded-lg">
                              {b.timeText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absolute empty result */}
                  {searchResults.playlists.length === 0 && 
                   searchResults.videos.length === 0 && 
                   searchResults.notes.length === 0 && 
                   searchResults.bookmarks.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-850">
                      <Search className="w-12 h-12 text-slate-300 mx-auto" />
                      <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-3">No matching results</h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto mt-1">
                        Try typing different keywords or search terms for video titles, markdown note contents, or custom bookmarks.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* HOME TAB */}
              {activeTab === "home" && (
                <div className="space-y-8 max-w-5xl mx-auto py-4">
                  {/* Hero Intro paste URL box */}
                  <div className="text-center py-12 px-6 md:px-10 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-6 shadow-sm">
                      <GraduationCap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Built for Students
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight leading-tight">
                      Distraction-Free <span className="text-blue-600 dark:text-blue-400">YouTube Study</span> Player
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-3 text-sm max-w-lg mx-auto leading-relaxed">
                      Study lectures without recommendations, comment sections, or auto-play loops. Simply paste a playlist or video URL to start focused study.
                    </p>
                    
                    <form onSubmit={handleUrlSubmit} className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full">
                        <Youtube className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Paste YouTube Playlist or Video URL..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm pl-12 pr-4 py-3.5 rounded-2xl text-slate-900 dark:text-zinc-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm px-7 py-3.5 rounded-2xl shadow-sm transition shrink-0 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          "Load Lectures"
                        )}
                      </button>
                    </form>

                    {errorMessage && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col gap-3 text-left">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-red-800 dark:text-red-300">Could Not Load URL</div>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 whitespace-pre-wrap">{errorMessage}</p>
                          </div>
                        </div>
                        
                        <div className="border-t border-red-100 dark:border-red-900/30 pt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDiagnostics(!showDiagnostics);
                              if (!showDiagnostics) {
                                fetchDiagnostics();
                              }
                            }}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 w-fit"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            {showDiagnostics ? "Hide Production Debug Panel" : "Open Production Debug Panel & Diagnostics"}
                          </button>

                          {showDiagnostics && (
                            <div className="mt-2 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300">
                              <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2 mb-3">
                                <span className="font-bold text-slate-900 dark:text-white">YouTube API Live Debugger</span>
                                <button
                                  type="button"
                                  onClick={fetchDiagnostics}
                                  disabled={isTestingDiagnostics}
                                  className="text-[10px] bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-2 py-1 rounded text-slate-600 dark:text-zinc-300 flex items-center gap-1 transition"
                                >
                                  <RefreshCw className={`w-2.5 h-2.5 ${isTestingDiagnostics ? "animate-spin" : ""}`} />
                                  Refresh diagnostics
                                </button>
                              </div>

                              {isTestingDiagnostics && !diagnosticsData ? (
                                <div className="py-4 text-center text-slate-500 flex items-center justify-center gap-2">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Contacting production server for diagnostics...
                                </div>
                              ) : diagnosticsData ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                    <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">API Key Loaded</span>
                                      <span className={diagnosticsData.apiKeyLoaded ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                        {diagnosticsData.apiKeyLoaded ? "YES" : "NO"}
                                      </span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">API Key Source</span>
                                      <span className="font-bold text-slate-800 dark:text-zinc-200">{diagnosticsData.apiKeySource}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">API Key (Masked)</span>
                                      <span className="text-slate-600 dark:text-zinc-400">{diagnosticsData.apiKeyMasked}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Node Environment</span>
                                      <span className="text-slate-600 dark:text-zinc-400">{diagnosticsData.nodeEnv}</span>
                                    </div>
                                  </div>

                                  {diagnosticsData.lastRequest && (
                                    <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded text-[11px] font-mono overflow-x-auto">
                                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Last Outgoing API URL</span>
                                      <span className="text-slate-600 dark:text-zinc-400 select-all">{diagnosticsData.lastRequest}</span>
                                    </div>
                                  )}

                                  {diagnosticsData.lastStatus !== null && (
                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                      <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                        <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">API Response Status</span>
                                        <span className={diagnosticsData.lastStatus >= 200 && diagnosticsData.lastStatus < 300 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                          {diagnosticsData.lastStatus}
                                        </span>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded">
                                        <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Error Event Category</span>
                                        <span className="font-bold text-slate-800 dark:text-zinc-200">{diagnosticsData.lastError ? "API_FAILED" : "NONE"}</span>
                                      </div>
                                    </div>
                                  )}

                                  {diagnosticsData.lastError && (
                                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 p-3 rounded-lg text-[11px]">
                                      <span className="text-rose-500 font-bold block mb-1">Last API Error Message:</span>
                                      <p className="font-mono text-rose-700 dark:text-rose-300">{diagnosticsData.lastError}</p>
                                    </div>
                                  )}

                                  {diagnosticsData.suggestedAction && (
                                    <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950 p-3 rounded-lg text-[11px]">
                                      <span className="text-blue-600 dark:text-blue-400 font-bold block mb-1">Recommended Solution:</span>
                                      <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{diagnosticsData.suggestedAction}</p>
                                    </div>
                                  )}

                                  <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 text-[10px] text-slate-500 leading-relaxed">
                                    <span className="font-semibold block text-slate-700 dark:text-zinc-300 mb-1">💡 Most Common Solution on GitHub Deployments:</span>
                                    If this playlist doesn't load but works inside AI Studio, it is usually because the Google Cloud key is restricted to HTTP referrers of AI Studio, but you are visiting a different URL. Verify that you have allowed your live URL (e.g. <span className="font-mono text-blue-600 dark:text-blue-400 select-all">{window.location.origin}</span>) in Google Cloud Console Credentials page, or set key restrictions to "None".
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-slate-500">
                                  No previous API load event captured. Enter a playlist link above to record a diagnostic run.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTIVE SESSION / SELECTED LECTURE PREVIEW SECTION */}
                  {activeSession && (() => {
                    const isPlaylist = activeSession.type === "playlist";
                    const currentPlaylistObj = isPlaylist ? playlists.find(p => p.id === activeSession.id) : null;
                    const currentVideoObj = !isPlaylist ? singleVideos.find(v => v.id === activeSession.id) : null;

                    let title = isPlaylist ? (currentPlaylistObj?.title || "YouTube Playlist") : (currentVideoObj?.title || "YouTube Video");
                    if (!isPlaylist && (title === "YouTube Video" || !currentVideoObj) && activeVideoTitle && activeVideoTitle !== "YouTube Video") {
                      title = activeVideoTitle;
                    }

                    let channelName = isPlaylist ? (currentPlaylistObj?.channelName || "Unknown Channel") : (currentVideoObj?.channelName || "Unknown Channel");
                    if (!isPlaylist && (channelName === "Unknown Channel" || !currentVideoObj) && activeVideoChannel && activeVideoChannel !== "Unknown Channel") {
                      channelName = activeVideoChannel;
                    }

                    const thumbnail = isPlaylist 
                      ? (currentPlaylistObj?.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60") 
                      : (currentVideoObj?.thumbnail || `https://i.ytimg.com/vi/${activeSession.id}/hqdefault.jpg`);
                    const progress = isPlaylist ? (currentPlaylistObj?.progress || 0) : (currentVideoObj?.progress || 0);
                    const completed = isPlaylist ? (progress >= 95) : (currentVideoObj?.completed || false);
                    const duration = isPlaylist ? "" : (currentVideoObj?.duration || "10:00");

                    return (
                      <div id="lecture-workspace" className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/40 to-blue-50/15 dark:from-zinc-900 dark:via-zinc-950/60 dark:to-blue-950/5 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-7 md:p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-slate-300 dark:hover:border-zinc-750 group/preview before:absolute before:-top-40 before:-right-40 before:w-80 before:h-80 before:bg-blue-500/5 dark:before:bg-blue-400/5 before:rounded-full before:blur-3xl before:pointer-events-none">
                        
                        {/* Clear Selection Button */}
                        <button 
                          onClick={() => setActiveSession(null)}
                          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 bg-slate-100/60 hover:bg-slate-200/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-slate-200/30 dark:border-zinc-700/30 transition-all duration-200 cursor-pointer z-10 shadow-sm"
                          title="Clear Selection"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                          {/* Thumbnail Frame in Perfect 16:9 */}
                          <div className="relative aspect-video w-full md:w-80 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-md shrink-0 bg-slate-100 dark:bg-zinc-900 group-hover/preview:shadow-xl transition-all duration-300 ring-4 ring-slate-100/60 dark:ring-zinc-850/40">
                            <img 
                              src={thumbnail} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-[1.03]" 
                              alt={title} 
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 group-hover/preview:bg-black/25">
                              <div className="bg-white/95 dark:bg-zinc-900/95 p-3.5 rounded-full shadow-xl transform transition-transform duration-300 group-hover/preview:scale-110">
                                <Play className="w-5 h-5 text-blue-600 fill-blue-600 dark:text-blue-400 dark:fill-blue-400" />
                              </div>
                            </div>
                            {isPlaylist && currentPlaylistObj?.videos?.length && (
                              <span className="absolute bottom-3 right-3 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg text-white bg-black/85 backdrop-blur-sm border border-white/10">
                                {currentPlaylistObj.videos.length} Lectures
                              </span>
                            )}
                          </div>

                          {/* Details & CTA */}
                          <div className="flex-1 space-y-4">
                            <div className="space-y-3">
                              {/* Pill Badge */}
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                                  isPlaylist 
                                    ? "bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30" 
                                    : "bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                                }`}>
                                  {isPlaylist ? "📚 Playlist Workspace" : "🎥 Lecture Workspace"}
                                </span>

                                {completed && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                              
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-50 leading-tight tracking-tight max-w-2xl">
                                {title}
                              </h2>
                              
                              <p className="text-sm text-slate-500 dark:text-zinc-400 font-semibold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                Creator: <span className="text-slate-700 dark:text-zinc-200 font-bold">{channelName}</span>
                              </p>

                              {/* Progress bar info */}
                              {(isPlaylist || (currentVideoObj && currentVideoObj.progress > 0)) && (
                                <div className="space-y-1.5 max-w-sm pt-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-zinc-400 font-medium">Overall Progress</span>
                                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{progress}%</span>
                                  </div>
                                  <div className="relative bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full w-full overflow-hidden">
                                    <div 
                                      style={{ width: `${progress}%` }} 
                                      className="absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 h-full rounded-full transition-all duration-500 ease-out" 
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Single Video Extra Meta Badges */}
                              {!isPlaylist && (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1 text-xs">
                                  {duration && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-semibold border border-slate-200/40 dark:border-zinc-700/30">
                                      ⏱ {duration}
                                    </span>
                                  )}
                                  {currentVideoObj && currentVideoObj.notesCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold border border-amber-100/50 dark:border-amber-900/10">
                                      📝 {currentVideoObj.notesCount} Notes
                                    </span>
                                  )}
                                  {currentVideoObj && currentVideoObj.bookmarksCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-400 font-semibold border border-pink-100/50 dark:border-pink-900/10">
                                      🔖 {currentVideoObj.bookmarksCount} Bookmarks
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Start Study Button / Main Action */}
                            <div className="pt-2">
                              <button
                                onClick={() => setActiveTab("study")}
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[size:200%_auto] hover:bg-[right_center] text-white font-extrabold text-sm px-10 py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
                              >
                                <Play className="w-4.5 h-4.5 fill-current animate-pulse" />
                                Start Study
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* If it is a playlist, show its videos/lectures list below */}
                        {isPlaylist && currentPlaylistObj?.videos && currentPlaylistObj.videos.length > 0 && (
                          <div className="mt-7 pt-6 border-t border-slate-200/80 dark:border-zinc-800/80">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                Playlist Lectures 
                                <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-zinc-700/50 font-bold ml-1.5">
                                  {currentPlaylistObj.videos.length} total
                                </span>
                              </h3>
                              
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                                Scroll to view lectures
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-72 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                              {currentPlaylistObj.videos.map((vid, idx) => {
                                const isSelected = vid.id === activeVideoId;
                                return (
                                  <div
                                    key={vid.id}
                                    onClick={() => {
                                      setActiveVideoId(vid.id);
                                      setActiveVideoTitle(vid.title);
                                      setActiveVideoChannel(vid.channelName);
                                    }}
                                    className={`group p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3 text-left items-start relative ${
                                      isSelected
                                        ? "bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-blue-500/60 dark:from-blue-950/20 dark:to-indigo-950/5 dark:border-blue-400/50 shadow-md shadow-blue-500/5 scale-[1.01]"
                                        : "bg-white border-slate-200/60 dark:bg-zinc-900/30 dark:border-zinc-850 hover:bg-slate-100/50 dark:hover:bg-zinc-950/40 hover:border-slate-300 dark:hover:border-zinc-700"
                                    }`}
                                  >
                                    <div className="relative w-16 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-900 shadow-sm border border-slate-200/30 dark:border-zinc-700/20">
                                      <img src={vid.thumbnail || `https://i.ytimg.com/vi/${vid.id}/hqdefault.jpg`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                                      {vid.completed && (
                                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[0.5px]">
                                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 fill-white dark:fill-zinc-900 shadow-sm" />
                                        </div>
                                      )}
                                      {!vid.completed && isSelected && (
                                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                          <Play className="w-4 h-4 text-blue-600 fill-current dark:text-blue-400" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                      <h4 className={`text-xs font-bold line-clamp-2 leading-tight transition-colors duration-150 ${
                                        isSelected 
                                          ? "text-blue-700 dark:text-blue-400" 
                                          : "text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                      }`}>
                                        {vid.title}
                                      </h4>
                                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                        <span className="font-bold">#{idx + 1}</span>
                                        <span>•</span>
                                        <span>{vid.duration || "LIVE"}</span>
                                        {vid.progress > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="text-blue-500 dark:text-blue-400 font-bold">{vid.progress}% watched</span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Active border decorator */}
                                    {isSelected && (
                                      <span className="absolute top-3 right-3 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* STREAKS & STATISTICS CARD */}
                  {(() => {
                    const stats = Storage.getStreakStats();
                    const days = [];
                    const today = new Date();
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(today.getDate() - i);
                      const dateStr = d.toLocaleDateString("en-CA");
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 1);
                      const isToday = i === 0;
                      const studied = stats.datesStudied.includes(dateStr);
                      days.push({ dayName, dateStr, studied, isToday });
                    }

                    return (
                      <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/15 dark:border-orange-500/10 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 w-full md:w-auto">
                          <div className="bg-gradient-to-tr from-orange-500 to-amber-500 text-white p-4 rounded-2xl shadow-lg shadow-orange-500/20 relative shrink-0">
                            <Flame className="w-7 h-7 animate-pulse" />
                            {stats.current > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border border-orange-500 shadow animate-bounce">
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-50 flex flex-wrap items-center gap-2">
                              Your Learning Streak
                              <span className="text-xs bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full font-bold">
                                {stats.current} {stats.current === 1 ? "Day" : "Days"}
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md">
                              Study at least 60 minutes daily to level up your streak. Longest streak: <span className="font-bold text-orange-600 dark:text-orange-400">{stats.longest} Days</span>.
                            </p>

                            {/* Week Consistency Tracker dots */}
                            <div className="flex items-center gap-2 mt-3.5">
                              {days.map((d, index) => (
                                <div key={index} className="flex flex-col items-center gap-1">
                                  <div 
                                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                                      d.studied 
                                        ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-sm ring-2 ring-orange-500/20 font-black" 
                                        : d.isToday 
                                          ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-300 dark:border-zinc-700 animate-pulse" 
                                          : "bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-zinc-600"
                                    }`}
                                    title={d.studied ? `Studied on ${d.dateStr}` : `No study logged for ${d.dateStr}`}
                                  >
                                    {d.studied ? "🔥" : d.dayName}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Statistics Navigation Button */}
                        <div className="w-full md:w-auto shrink-0">
                          <button
                            onClick={() => setActiveTab("stats")}
                            className="w-full md:w-auto bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 font-bold text-xs px-5 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <TrendingUp className="w-4 h-4 text-blue-500 animate-bounce" style={{ animationDuration: "3s" }} />
                            Analyze Statistics
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 1. CONTINUE LEARNING BANNER */}
                  {continueLearningItem && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                          Continue Learning
                        </h2>
                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                          Last active: {formatTimeText(continueLearningItem.lastWatchedAt)}
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                          <div className="relative aspect-video w-full sm:w-56 overflow-hidden rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm shrink-0">
                            <img src={continueLearningItem.thumbnail || (continueLearningItem.type === "playlist" ? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60" : `https://i.ytimg.com/vi/${continueLearningItem.id}/hqdefault.jpg`)} className="w-full h-full object-cover" alt={continueLearningItem.title} />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <div className="bg-white/95 dark:bg-zinc-900/95 p-3 rounded-full shadow">
                                <Play className="w-5 h-5 text-blue-600 fill-blue-600 dark:text-blue-400 dark:fill-blue-400" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1.5 py-1">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                              {continueLearningItem.type === "playlist" ? "PLAYLIST SESSION" : "SINGLE VIDEO"}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {continueLearningItem.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                              Creator: {continueLearningItem.channelName}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex-1 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full w-32 overflow-hidden">
                                <div style={{ width: `${continueLearningItem.progress}%` }} className="bg-blue-600 dark:bg-blue-400 h-full rounded-full" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                                {continueLearningItem.progress}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => resumeLearningSession(continueLearningItem.id, continueLearningItem.type)}
                          className="w-full lg:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-sm px-6 py-3 rounded-xl shadow flex items-center justify-center gap-2 transition"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Resume Lesson
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. RECENT LECTURES / PLAYLISTS GRID */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Recently Studied
                    </h2>

                    {[...playlists, ...singleVideos].length === 0 ? (
                      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-900">
                        <Tv className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-3">Ready to study?</h3>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mt-1">
                          No history logged yet. Paste any educational playlist URL or single lecture URL above to start studying distraction-free.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playlists.map((p) => (
                          <div 
                            key={p.id} 
                            onClick={() => resumeLearningSession(p.id, "playlist")}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                <img src={p.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} className="w-full h-full object-cover" alt={p.title} />
                                <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/80 font-bold px-2 py-0.5 rounded text-white flex items-center gap-1">
                                  Playlist ({p.totalVideos} videos)
                                </span>
                              </div>
                              <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                {p.title}
                              </h3>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{p.channelName}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">{p.progress}% done</span>
                              </div>
                              <button 
                                onClick={(e) => handleToggleFav("playlist", p.id, e)}
                                className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-amber-500 transition"
                              >
                                <Star className={`w-4 h-4 ${favorites.playlists.includes(p.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {singleVideos.map((v) => (
                          <div 
                            key={v.id} 
                            onClick={() => resumeLearningSession(v.id, "video")}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} className="w-full h-full object-cover" alt={v.title} />
                                {v.duration !== "LIVE" && (
                                  <span className="absolute bottom-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded text-white bg-black/80">
                                    {v.duration}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                {v.title}
                              </h3>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{v.channelName}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className={`w-3.5 h-3.5 ${v.completed ? "text-emerald-500" : "text-slate-400"}`} />
                                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                                  {v.progress}% watched
                                </span>
                              </div>
                              <button 
                                onClick={(e) => handleToggleFav("video", v.id, e)}
                                className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-amber-500 transition"
                              >
                                <Star className={`w-4 h-4 ${favorites.videos.includes(v.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STUDY PLAYER TAB */}
              {activeTab === "study" && (activeVideoId || activeSession) && (
                <div className={`space-y-6 max-w-7xl mx-auto ${focusMode ? "pb-12" : ""}`}>
                  
                  {/* Focus Mode top bar */}
                  {focusMode && (
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center justify-between shadow">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">FOCUSING ON: {activeVideoTitle}</span>
                      </div>
                      <button 
                        onClick={() => setFocusMode(false)}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Exit Focus Mode
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Centered Large Video Player & Controls */}
                    <div className={`${theatreMode ? "lg:col-span-12" : "lg:col-span-8"} space-y-4`}>
                      
                      {/* Embedded custom balanced video window */}
                      <div 
                        ref={playerContainerRef}
                        className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-black ${theatreMode ? "aspect-video" : "aspect-video"}`}
                      >
                        <div id="yt-player-container" className="w-full h-full">
                          <div id="yt-player-frame"></div>
                        </div>
                      </div>

                      {/* Action, Navigation and Controls Bar directly below player */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
                        
                        {/* Playlist Navigation (Previous / Next) */}
                        <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-0.5 border border-slate-200/40 dark:border-zinc-700/40 shrink-0">
                          <button 
                            onClick={handlePrevVideo}
                            disabled={activeSession?.type !== "playlist"}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Previous Video"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={handleNextVideo}
                            disabled={activeSession?.type !== "playlist"}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Next Video"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* All other controls grouped properly */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Save / Favorite Lecture */}
                          <button
                            onClick={handleToggleActiveVideoFavorite}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition shrink-0 ${
                              favorites.videos.includes(activeVideoId)
                                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                            }`}
                            title="Save / Favorite Lecture"
                          >
                            <Heart className={`w-3.5 h-3.5 ${favorites.videos.includes(activeVideoId) ? "fill-current text-red-500" : ""}`} />
                            {favorites.videos.includes(activeVideoId) ? "Saved" : "Save Lecture"}
                          </button>

                          {/* Focus Mode */}
                          <button 
                            onClick={() => setFocusMode(p => !p)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition shrink-0 ${
                              focusMode 
                                ? "bg-orange-500 border-transparent text-white hover:bg-orange-600" 
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                            }`}
                            title="Toggle Focus Mode"
                          >
                            <Flame className={`w-3.5 h-3.5 ${focusMode ? "animate-pulse" : ""}`} />
                            {focusMode ? "Focused" : "Focus Mode"}
                          </button>

                          {/* Mark Completed */}
                          <button 
                            onClick={() => {
                              if (activeSession) {
                                handleProgressUpdate(9999, 10000); // Trigger finish
                                toast.success("Lesson Completed", "Great job! This lecture has been marked as finished.");
                              }
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm shrink-0"
                            title="Complete Lesson"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Complete
                          </button>

                          {/* Playback Speed Control */}
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl text-xs font-bold shrink-0">
                            <span>Speed</span>
                            <select
                              value={settings.playbackSpeed}
                              onChange={(e) => handleSettingChange("playbackSpeed", parseFloat(e.target.value))}
                              className="bg-transparent border-0 outline-none text-xs font-black text-slate-900 dark:text-zinc-100 cursor-pointer focus:ring-0 px-1 py-0"
                            >
                              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                                <option key={s} value={s} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">{s}x</option>
                              ))}
                            </select>
                          </div>

                          {/* Theatre/Wide Mode (Full Screen icon) */}
                          <button 
                            onClick={() => setTheatreMode(p => !p)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition shrink-0 ${
                              theatreMode 
                                ? "bg-indigo-600 border-transparent text-white hover:bg-indigo-500" 
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                            }`}
                            title="Toggle Wide Screen Mode"
                          >
                            {theatreMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            {theatreMode ? "Standard Mode" : "Wide Screen"}
                          </button>
                        </div>
                      </div>

                      {/* Active Pomodoro HUD (Visible if Pomodoro is active) */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 flex flex-wrap items-center justify-between gap-4 shadow-sm select-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-500/10 dark:bg-orange-500/15 p-2 rounded-xl text-orange-600 dark:text-orange-400">
                            <Clock className={`w-5 h-5 ${!pomoState.isPaused && pomoState.mode === "focus" ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 dark:text-zinc-50 flex items-center gap-1.5 uppercase tracking-wider">
                              {pomoState.mode === "focus" ? "🍅 FOCUS SESSION" : "🌸 REST BREAK"}
                              <span className={`w-1.5 h-1.5 rounded-full ${pomoState.isPaused ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                              {pomoState.isPaused ? "Timer is paused. Resume to lock in focus." : "Focus timer is running. Stay fully immersed in this lecture."}
                            </div>
                          </div>
                        </div>

                        {/* Right Countdown & Controls */}
                        <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-zinc-950/45 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-zinc-850">
                          <span className="font-mono text-base font-black text-slate-900 dark:text-zinc-100">
                            {(() => {
                              const remainingSecs = Math.ceil(pomoState.remainingMs / 1000);
                              const m = Math.floor(remainingSecs / 60);
                              const s = remainingSecs % 60;
                              return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                            })()}
                          </span>
                          <button
                            onClick={pomoState.isPaused ? startPomo : pausePomo}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                              pomoState.isPaused 
                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm" 
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-750"
                            }`}
                          >
                            {pomoState.isPaused ? "Resume" : "Pause"}
                          </button>
                        </div>
                      </div>

                      {/* Optionally suggest pausing the timer */}
                      {showPauseSuggestion && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm select-none transition animate-in fade-in zoom-in-95">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">⏸️</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Study lecture is paused</p>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400">Would you like to temporarily pause your focus timer?</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                pausePomo();
                                setShowPauseSuggestion(false);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl transition"
                            >
                              Pause Timer
                            </button>
                            <button
                              onClick={() => setShowPauseSuggestion(false)}
                              className="bg-white/10 hover:bg-slate-150/50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-[10px] px-3 py-1.5 rounded-xl transition"
                            >
                              Keep Running
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Video Info: Title, Channel and Type placed just below the controls */}
                      {(() => {
                        const currentVideo = activeSession?.type === "playlist"
                          ? playlists.find(p => p.id === activeSession.id)?.videos.find(v => v.id === activeVideoId)
                          : singleVideos.find(v => v.id === activeSession?.id);
                        
                        const isLive = currentVideo?.duration === "LIVE";

                        if (isSingleVideoDetailsLoading) {
                          return (
                            <div className="bg-slate-50 dark:bg-zinc-900/45 border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
                              <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded-lg w-3/4" />
                              <div className="flex items-center gap-2">
                                <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded-md w-1/4" />
                                <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded-md w-12" />
                              </div>
                            </div>
                          );
                        }

                        const hasMetadata = singleVideoMetadata && singleVideoMetadata.id === activeVideoId;
                        const publishDate = hasMetadata ? singleVideoMetadata.publishDate : "";
                        const description = hasMetadata ? singleVideoMetadata.description : "";
                        const tags = hasMetadata ? singleVideoMetadata.tags : [];

                        return (
                          <div className="bg-slate-50 dark:bg-zinc-900/45 border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden space-y-3">
                            <div>
                              <h1 className="text-base sm:text-lg font-bold text-slate-950 dark:text-zinc-50 leading-snug pr-20" title={activeVideoTitle}>
                                {activeVideoTitle}
                              </h1>
                              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-zinc-300">{activeVideoChannel}</span>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                                  {activeSession?.type === "playlist" ? "Playlist Module" : "Single Lecture"}
                                </span>
                                {publishDate && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-500 dark:text-zinc-400">{publishDate}</span>
                                  </>
                                )}
                              </p>
                            </div>

                            {/* Academic curriculum tags / topics */}
                            {tags && tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {tags.map((tag, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-200/50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold px-2.5 py-0.5 rounded-md">
                                    #{tag.toLowerCase().replace(/[^a-zA-Z0-9]/g, "")}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Lecture syllabus description */}
                            {description && (
                              <div className="text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-200/45 dark:border-zinc-800/45 pt-3">
                                <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">Lecture Syllabus & Overview</div>
                                <p className="line-clamp-4 leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-zinc-400">
                                  {description}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Interactive Notes & Bookmarks Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Interactive Notes Panel */}
                        <InteractiveNotes videoId={activeVideoId} videoTitle={activeVideoTitle} />

                        {/* Timestamp Bookmarks Panel */}
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col h-[400px] shadow-sm">
                          <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                              Timestamp Bookmarks
                            </span>
                          </div>

                          {/* Quick bookmark input */}
                          <div className="p-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="E.g. Formula derivation, Key definition..."
                                value={bookmarkLabel}
                                onChange={(e) => setBookmarkLabel(e.target.value)}
                                className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-zinc-50 focus:outline-none"
                              />
                              <button
                                onClick={() => handleAddBookmark()}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Bookmark
                              </button>
                            </div>
                          </div>

                          {/* Bookmarks list scrollable */}
                          <div className="flex-1 overflow-y-auto  p-3 space-y-2">
                            {activeBookmarks.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center">
                                <Bookmark className="w-8 h-8 text-slate-200 dark:text-zinc-800" />
                                <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-1.5">No bookmarks saved yet</span>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-[200px] mt-1">Add custom labels at critical timestamps during study sessions.</p>
                              </div>
                            ) : (
                              activeBookmarks.map((b) => (
                                <div 
                                  key={b.id} 
                                  className="group flex items-center justify-between p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-900 rounded-xl"
                                >
                                  <div className="flex-1 mr-2">
                                    {editingBookmarkId === b.id ? (
                                      <div className="flex gap-2 items-center">
                                        <input
                                          type="text"
                                          value={editingBookmarkLabel}
                                          onChange={(e) => setEditingBookmarkLabel(e.target.value)}
                                          className="flex-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-xs px-2 py-1 rounded"
                                        />
                                        <button onClick={() => handleSaveBookmarkLabel(b.id)} className="text-emerald-500 font-bold text-xs hover:underline">Save</button>
                                      </div>
                                    ) : (
                                      <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 line-clamp-1">
                                        {b.label}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                      onClick={() => handleSeekToBookmark(b.timestamp)}
                                      className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-950 font-extrabold text-[10px] text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md"
                                      title="Jump to timeline"
                                    >
                                      {b.timeText}
                                    </button>
                                    
                                    {editingBookmarkId !== b.id && (
                                      <button 
                                        onClick={() => handleEditBookmark(b)}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-600"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}

                                    <button 
                                      onClick={() => handleDeleteBookmark(b.id)}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-950 rounded text-slate-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>

                      {/* AI Study Companion Section */}
                      <AIStudyCompanion 
                        videoId={activeVideoId} 
                        videoTitle={activeVideoTitle} 
                        channelName={activeVideoChannel} 
                        onOpenKeyModal={() => setOnboardingOpen(true)} 
                      />

                    </div>

                    {/* Left/Right scrollable Lecture list (Unless inside theatre mode) */}
                    {!theatreMode && (
                      <div className="lg:col-span-4 space-y-6">
                        {/* Compact Study Timer Widget */}
                        <CompactStudyTimer />

                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-1.5">
                              <BookOpen className="w-4.5 h-4.5 text-blue-500" />
                              Lecture Queue
                            </h2>
                            <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full">
                              {activeSession?.type === "playlist" ? "Playlist Module" : "Single Video"}
                            </span>
                          </div>

                          {/* --- PROGRESSIVE LOADING STATUS PANEL --- */}
                          {progressiveLoading && progressivePlaylistId === activeSession?.id && (
                            <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/30 p-3 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                <span className="flex items-center gap-1.5 animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Importing lectures...
                                </span>
                                <span>{progressiveLoadedCount} / {progressiveTotalCount}</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div style={{ width: `${(progressiveLoadedCount / progressiveTotalCount) * 100}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-350" />
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Study loaded lectures immediately. Remaining syllabus loads in background.</p>
                            </div>
                          )}

                          {/* --- BACKGROUND UPDATE BANNER --- */}
                          {backgroundUpdateAvailable && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <div>
                                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{backgroundNewLecturesCount} new lectures found!</div>
                                  <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 leading-tight">Sync the updated YouTube queue.</p>
                                </div>
                              </div>
                              <button 
                                onClick={handleApplyBackgroundUpdate}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg transition shadow-sm shrink-0"
                              >
                                Sync
                              </button>
                            </div>
                          )}

                          {/* Playlist search, filters & sorting if applicable */}
                          {activeSession?.type === "playlist" && (
                            <div className="space-y-3">
                              {/* Search */}
                              <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
                                <input
                                  type="text"
                                  placeholder="Search lectures in this playlist..."
                                  value={playlistVideoSearchQuery}
                                  onChange={(e) => setPlaylistVideoSearchQuery(e.target.value)}
                                  className="w-full bg-slate-100 dark:bg-zinc-900 border border-transparent focus:border-slate-300 dark:focus:border-zinc-700 text-xs pl-9 pr-8 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition"
                                />
                                {playlistVideoSearchQuery && (
                                  <button onClick={() => setPlaylistVideoSearchQuery("")} className="absolute right-3 top-2.5 text-slate-400 dark:text-zinc-500">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Filters & Sorting controls */}
                              <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-zinc-800/80 pt-2 pb-1">
                                <div className="flex gap-1 bg-slate-100/80 dark:bg-zinc-950/40 p-0.5 rounded-lg border border-slate-200/20">
                                  {(["all", "completed", "remaining"] as const).map((f) => (
                                    <button
                                      key={f}
                                      onClick={() => setQueueFilter(f)}
                                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition ${queueFilter === f ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-350"}`}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onClick={() => setQueueSort(p => p === "number-asc" ? "number-desc" : "number-asc")}
                                  className="p-1 rounded-lg border border-slate-200/60 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-950 text-slate-500 dark:text-zinc-400 transition flex items-center gap-1"
                                  title={queueSort === "number-asc" ? "Sorted Oldest to Newest" : "Sorted Newest to Oldest"}
                                >
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                                    {queueSort === "number-asc" ? "Asc" : "Desc"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Actual Lecture cards list */}
                          <div className="space-y-3 max-h-[700px] overflow-y-auto  pr-1">
                            {activeSession?.type === "playlist" ? (() => {
                              const rawVideos = playlists.find(p => p.id === activeSession.id)?.videos || [];
                              let processedVideos = rawVideos.filter(v => 
                                playlistVideoSearchQuery ? v.title.toLowerCase().includes(playlistVideoSearchQuery.toLowerCase()) : true
                              );

                              if (queueFilter === "completed") {
                                processedVideos = processedVideos.filter(v => v.completed);
                              } else if (queueFilter === "remaining") {
                                processedVideos = processedVideos.filter(v => !v.completed);
                              }

                              processedVideos = [...processedVideos].sort((a, b) => {
                                const numA = a.lectureNumber || 0;
                                const numB = b.lectureNumber || 0;
                                return queueSort === "number-asc" ? numA - numB : numB - numA;
                              });

                              if (processedVideos.length === 0) {
                                return (
                                  <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-xs">
                                    No lectures match your criteria.
                                  </div>
                                );
                              }

                              return processedVideos.map((v, idx) => {
                                const isSelected = v.id === activeVideoId;
                                return (
                                  <div
                                    key={v.id}
                                    onClick={() => playVideoInSession(v.id, v.title, v.channelName)}
                                    className={`group p-3 rounded-2xl cursor-pointer border transition flex gap-3 ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 dark:border-blue-400/40" : "bg-slate-50/50 hover:bg-slate-100/50 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/60 border-slate-200/50 dark:border-zinc-850"}`}
                                  >
                                    {/* Thumbnail Frame with CLS Prevention & Low-res Transition */}
                                    <div className="relative w-24 aspect-video overflow-hidden rounded-xl bg-slate-150 dark:bg-zinc-800 shrink-0 border border-slate-200/10">
                                      {/* Low-res Thumbnail */}
                                      <img 
                                        src={`https://img.youtube.com/vi/${v.id}/default.jpg`} 
                                        className="absolute inset-0 w-full h-full object-cover blur-md opacity-60 scale-105 pointer-events-none" 
                                        alt="" 
                                      />
                                      {/* HD Thumbnail */}
                                      <img 
                                        src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} 
                                        onLoad={(e) => {
                                          (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
                                          (e.currentTarget as HTMLImageElement).classList.add("opacity-100");
                                        }}
                                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 ease-in-out" 
                                        alt={v.title} 
                                      />
                                      <span className="absolute bottom-1 right-1 text-[9px] px-1 py-0.2 rounded font-bold text-white bg-black/85">
                                        {v.duration !== "LIVE" ? v.duration : ""}
                                      </span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center justify-between">
                                        <span>LECTURE {v.lectureNumber || idx + 1}</span>
                                        {v.completed && <CheckCircle className="w-3 h-3 text-emerald-500 fill-current bg-white dark:bg-zinc-900 rounded-full" />}
                                      </div>
                                      <div className={`text-xs font-bold line-clamp-2 ${isSelected ? "text-slate-950 dark:text-white" : "text-slate-700 dark:text-zinc-300"}`}>
                                        {v.title}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 bg-slate-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                          <div style={{ width: `${v.progress}%` }} className={`h-full ${v.completed ? "bg-emerald-500" : "bg-blue-500"}`} />
                                        </div>
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400">
                                          {v.completed ? "Done" : `${v.progress}%`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })() : (
                              <div className="p-4 bg-slate-50 dark:bg-zinc-950/50 border border-dashed border-slate-200 dark:border-zinc-850 rounded-2xl text-center">
                                <Youtube className="w-8 h-8 text-slate-300 mx-auto" />
                                <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-2">Single Lecture Active</div>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">This module was imported from a single video URL. You can paste any full YouTube playlist to see continuous sequential lectures.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* WATCH HISTORY TAB */}
              {activeTab === "history" && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Watch History</h1>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Your saved study lectures and curriculum paths.</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to clear your local watch history? playlists and single video files will be removed from shortcuts, but your notes will remain intact.")) {
                          Storage.savePlaylists([]);
                          Storage.saveSingleVideos([]);
                          setPlaylists([]);
                          setSingleVideos([]);
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 font-bold text-xs px-4 py-2 rounded-xl text-red-500 flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All History
                    </button>
                  </div>

                  {[...playlists, ...singleVideos].length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-900">
                      <History className="w-12 h-12 text-slate-300 mx-auto" />
                      <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-3">History is clean</h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mt-1">
                        Study sessions represent your curriculum paths. Load any YouTube video/playlist to populate lists.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl flex items-center gap-1 self-start w-max">
                        <button
                          onClick={() => setHistoryFilter("all")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${historyFilter === "all" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setHistoryFilter("playlist")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${historyFilter === "playlist" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}`}
                        >
                          Playlists
                        </button>
                        <button
                          onClick={() => setHistoryFilter("video")}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${historyFilter === "video" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}`}
                        >
                          Single Lectures
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedHistoryItems.map((item) => {
                          if (item.type === "playlist") {
                            const p = item;
                            return (
                              <div 
                                key={p.id} 
                                onClick={() => resumeLearningSession(p.id, "playlist")}
                                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                              >
                                <div>
                                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                    <img src={p.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} className="w-full h-full object-cover" alt={p.title} />
                                    <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/80 font-bold px-2 py-0.5 rounded text-white flex items-center gap-1">
                                      Playlist ({p.totalVideos} videos)
                                    </span>
                                  </div>
                                  <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                    {p.title}
                                  </h3>
                                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{p.channelName}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">{p.progress}% done</span>
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const list = playlists.filter(x => x.id !== p.id);
                                      Storage.savePlaylists(list);
                                      setPlaylists(list);
                                    }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-500 transition"
                                    title="Remove from history"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          } else {
                            const v = item;
                            return (
                              <div 
                                key={v.id} 
                                onClick={() => resumeLearningSession(v.id, "video")}
                                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                              >
                                <div>
                                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                    <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} className="w-full h-full object-cover" alt={v.title} />
                                    {v.duration !== "LIVE" && (
                                      <span className="absolute bottom-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded text-white bg-black/80">
                                        {v.duration}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                    {v.title}
                                  </h3>
                                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{v.channelName}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className={`w-3.5 h-3.5 ${v.completed ? "text-emerald-500" : "text-slate-400"}`} />
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                                      {v.progress}% watched
                                    </span>
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const list = singleVideos.filter(x => x.id !== v.id);
                                      Storage.saveSingleVideos(list);
                                      setSingleVideos(list);
                                    }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-500 transition"
                                    title="Remove from history"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* FAVORITES TAB */}
              {activeTab === "favorites" && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Favorite Modules</h1>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Quickly access pinned channels, playlists, or lectures.</p>
                    </div>

                    {/* TWO OPTION SUB-TABS: Playlists vs Particular Lectures */}
                    <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl flex items-center gap-1 self-start">
                      <button
                        onClick={() => setFavTypeFilter("playlist")}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                          favTypeFilter === "playlist"
                            ? "bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700/60 hover:text-slate-950 dark:hover:text-white"
                        }`}
                      >
                        📁 Whole Playlists ({playlists.filter(p => favorites.playlists.includes(p.id)).length})
                      </button>
                      <button
                        onClick={() => setFavTypeFilter("video")}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                          favTypeFilter === "video"
                            ? "bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700/60 hover:text-slate-950 dark:hover:text-white"
                        }`}
                      >
                        🎥 Particular Lectures ({singleVideos.filter(v => favorites.videos.includes(v.id)).length})
                      </button>
                    </div>
                  </div>

                  {favTypeFilter === "playlist" ? (
                    playlists.filter(p => favorites.playlists.includes(p.id)).length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-900">
                        <Heart className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-3">No favorite playlists</h3>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mt-1">
                          Pin a playlist using the star icon to easily access whole modules here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playlists.filter(p => favorites.playlists.includes(p.id)).map((p) => (
                          <div 
                            key={p.id} 
                            onClick={() => resumeLearningSession(p.id, "playlist")}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                <img src={p.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} className="w-full h-full object-cover" alt="" />
                                <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/80 font-bold px-2 py-0.5 rounded text-white">
                                  Playlist
                                </span>
                              </div>
                              <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                {p.title}
                              </h3>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{p.channelName}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">{p.progress}% done</span>
                              <button 
                                onClick={(e) => handleToggleFav("playlist", p.id, e)}
                                className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-amber-500 transition"
                              >
                                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    singleVideos.filter(v => favorites.videos.includes(v.id)).length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-900">
                        <Heart className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mt-3">No favorite lectures</h3>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mt-1">
                          Click "Save Lecture" inside the study page to add specific lessons here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {singleVideos.filter(v => favorites.videos.includes(v.id)).map((v) => (
                          <div 
                            key={v.id} 
                            onClick={() => resumeLearningSession(v.id, "video")}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-850">
                                <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} className="w-full h-full object-cover" alt="" />
                                {v.duration !== "LIVE" && (
                                  <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/80 font-bold px-2 py-0.5 rounded text-white">
                                    {v.duration}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-50 mt-3 line-clamp-2 leading-tight">
                                {v.title}
                              </h3>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{v.channelName}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">{v.progress}% done</span>
                              <button 
                                onClick={(e) => handleToggleFav("video", v.id, e)}
                                className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-amber-500 transition"
                              >
                                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* POMODORO TAB */}
              {activeTab === "pomodoro" && <PomodoroTimer />}

              {/* STATS TAB */}
              {activeTab === "stats" && <StudyStats />}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Applet Settings</h1>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Configure playback and local cache storage details.</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                    {/* Playback default speed */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Default Playback Speed</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Set standard lecture playback multiplier</div>
                      </div>
                      <select
                        value={settings.playbackSpeed}
                        onChange={(e) => handleSettingChange("playbackSpeed", parseFloat(e.target.value))}
                        className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 outline-none text-xs font-bold px-3 py-2 rounded-xl text-slate-800 dark:text-zinc-100 cursor-pointer transition-colors"
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                          <option key={s} value={s} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">{s}x</option>
                        ))}
                      </select>
                    </div>

                    {/* Theme Mode */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Theme Mode</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Choose between Light, Dark, or System Sync modes</div>
                      </div>
                      <select
                        value={settings.theme}
                        onChange={(e) => handleSettingChange("theme", e.target.value as "light" | "dark" | "system")}
                        className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 outline-none text-xs font-bold px-3 py-2 rounded-xl text-slate-800 dark:text-zinc-100 cursor-pointer transition-colors"
                      >
                        <option value="light" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Light Mode</option>
                        <option value="dark" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Dark Mode</option>
                        <option value="system" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">System Mode</option>
                      </select>
                    </div>

                    {/* Autoplay next */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Autoplay Next Video</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Automatically start the next lecture upon completion</div>
                      </div>
                      <button
                        onClick={() => handleSettingChange("autoPlay", !settings.autoPlay)}
                        className={`w-11 h-6 rounded-full transition relative flex items-center px-1 ${settings.autoPlay ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all transform ${settings.autoPlay ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    {/* Skip completed */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Skip Completed in Playlist</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Bypass lectures marked done while playing queue</div>
                      </div>
                      <button
                        onClick={() => handleSettingChange("skipCompleted", !settings.skipCompleted)}
                        className={`w-11 h-6 rounded-full transition relative flex items-center px-1 ${settings.skipCompleted ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all transform ${settings.skipCompleted ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    {/* Enable shortcuts */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Keyboard Shortcuts</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Enable premium YouTube-like keyboard shortcuts for faster navigation</div>
                      </div>
                      <button
                        onClick={() => handleSettingChange("enableShortcuts", !settings.enableShortcuts)}
                        className={`w-11 h-6 rounded-full transition relative flex items-center px-1 ${settings.enableShortcuts ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all transform ${settings.enableShortcuts ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    {/* Notification Sound toggle */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Notification Sound Effects</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">Play a very subtle dual-tone chime when notifications appear</div>
                      </div>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`w-11 h-6 rounded-full transition relative flex items-center px-1 ${soundEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all transform ${soundEnabled ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    {/* Shortcut Cheat Sheet */}
                    {settings.enableShortcuts && (
                      <div className="pt-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          Keyboard Shortcuts Guide
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-850">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-50 mb-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-1 flex items-center gap-1">
                              <span>📺</span> Playback & Player
                            </div>
                            <ul className="space-y-1.5 text-slate-600 dark:text-zinc-400 font-mono">
                              <li className="flex justify-between"><span>Space / K</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Play / Pause</span></li>
                              <li className="flex justify-between"><span>J / L</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Rewind / Forward 10s</span></li>
                              <li className="flex justify-between"><span>← / →</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Back / Forward 5s</span></li>
                              <li className="flex justify-between"><span>0–9</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Jump to 0% – 90%</span></li>
                              <li className="flex justify-between"><span>, / .</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Frame Back / Next</span></li>
                              <li className="flex justify-between"><span>Shift + &lt; / &gt;</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Speed - / +</span></li>
                              <li className="flex justify-between"><span>M</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Mute / Unmute</span></li>
                              <li className="flex justify-between"><span>↑ / ↓</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Volume - / + 5%</span></li>
                              <li className="flex justify-between"><span>F / T</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Fullscreen / Theatre</span></li>
                              <li className="flex justify-between"><span>Shift + N / P</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Next / Prev Lecture</span></li>
                            </ul>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-50 mb-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-1 flex items-center gap-1">
                              <span>✍️</span> Productivity & Study
                            </div>
                            <ul className="space-y-1.5 text-slate-600 dark:text-zinc-400 font-mono">
                              <li className="flex justify-between"><span>B / Ctrl + B</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Add Bookmark</span></li>
                              <li className="flex justify-between"><span>Ctrl + N</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Focus Notes</span></li>
                              <li className="flex justify-between"><span>Ctrl + S</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Save Notes</span></li>
                              <li className="flex justify-between"><span>Ctrl + /</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Focus Search</span></li>
                              <li className="flex justify-between"><span>Ctrl + H</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">History Tab</span></li>
                              <li className="flex justify-between"><span>Ctrl + P</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Pomodoro Tab</span></li>
                              <li className="flex justify-between"><span>Ctrl + Shift + F</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Focus Mode Toggle</span></li>
                              <li className="flex justify-between"><span>Ctrl + Shift + L</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Lecture List Toggle</span></li>
                              <li className="flex justify-between"><span>Ctrl + Shift + T</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Theme Toggle</span></li>
                              <li className="flex justify-between"><span>Alt + S / P / R</span> <span className="text-slate-800 dark:text-zinc-200 font-bold">Pomo Start/Pause/Reset</span></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Database Import/Export */}
                    <div className="space-y-3 pt-3">
                      <div className="text-sm font-bold text-slate-950 dark:text-zinc-50">Data Recovery & Backup</div>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Since everything is stored offline in the browser, export backup JSON files to prevent data loss or import files to restore progress on other devices.</p>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={handleExportAll}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition text-slate-800 dark:text-zinc-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export Backup JSON
                        </button>
                        
                        <label className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition text-slate-800 dark:text-zinc-200 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          Import Backup JSON
                          <input type="file" accept=".json" onChange={handleImportAll} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Reset Database */}
                    <div className="space-y-3 pt-5 border-t border-slate-150 dark:border-zinc-850">
                      <div className="text-sm font-bold text-red-500">Destructive Actions</div>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Delete all playlists, notes, bookmarks, and studies from local cache. This action is not reversible.</p>
                      <button
                        onClick={handleResetData}
                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/30 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset All Cached Data
                      </button>
                    </div>
                  </div>

                  {/* Gemini AI Settings Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-1.5 uppercase tracking-wide">
                          <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                          Gemini AI Settings
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Manage your custom API key which powers the study companion, summaries, tutor chat, and mastery quizzes.</div>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${hasGeminiKeyInState ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                        {hasGeminiKeyInState ? "Connected" : "Disconnected"}
                      </span>
                    </div>

                    {hasGeminiKeyInState ? (
                      <div className="space-y-4">
                        {/* Connected layout */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Connected API Key</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={showFullKeyInSettings ? (getGeminiKey() || "") : maskApiKey(getGeminiKey() || "")}
                              className="flex-1 bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl font-mono focus:outline-none select-all"
                            />
                            
                            <button
                              onClick={() => {
                                const fullKey = getGeminiKey();
                                if (fullKey) {
                                  navigator.clipboard.writeText(fullKey);
                                  toast.success("API Key Copied", "Full API key copied to clipboard!");
                                }
                              }}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 transition text-xs font-bold"
                              title="Copy API Key"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => setShowFullKeyInSettings(!showFullKeyInSettings)}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 transition text-xs font-bold"
                              title={showFullKeyInSettings ? "Hide Key" : "Show Key"}
                            >
                              {showFullKeyInSettings ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        {settingsKeyTestResult && (
                          <div className={`text-xs p-3.5 rounded-xl border font-semibold ${settingsKeyTestResult.type === "success" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-450" : "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-450"}`}>
                            {settingsKeyTestResult.text}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            onClick={async () => {
                              setSettingsKeyTestLoading(true);
                              setSettingsKeyTestResult(null);
                              try {
                                const currentKey = getGeminiKey();
                                if (!currentKey) throw new Error("No connected key found");
                                const { validateGeminiKey } = await import("./utils/gemini");
                                const isValid = await validateGeminiKey(currentKey);
                                if (isValid) {
                                  setSettingsKeyTestResult({ type: "success", text: "✅ API key validated and working perfectly. Direct connection to Google GenAI is active." });
                                }
                              } catch (err: any) {
                                setSettingsKeyTestResult({ type: "error", text: `❌ Validation Failed: ${err.message || "Invalid Key configuration or bad connection."}` });
                              } finally {
                                setSettingsKeyTestLoading(false);
                              }
                            }}
                            disabled={settingsKeyTestLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
                          >
                            {settingsKeyTestLoading ? "Testing..." : "Test Connection"}
                          </button>

                          <button
                            onClick={() => setOnboardingOpen(true)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            Replace API Key
                          </button>

                          <button
                            onClick={() => {
                              toast.warning(
                                "Remove API Key?",
                                "This will disable all AI-powered features like Summarizer, Doubt Solver, and Quizzes.",
                                {
                                  duration: 10000,
                                  action: {
                                    label: "Remove",
                                    primary: true,
                                    onClick: () => {
                                      removeGeminiKey();
                                      setHasGeminiKeyInState(false);
                                      setSettingsKeyTestResult(null);
                                      toast.success("API Key Removed", "Gemini API key has been removed successfully.");
                                    }
                                  }
                                }
                              );
                            }}
                            className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/30 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            Remove Key
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Disconnected layout */}
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Your Gemini API key is currently disconnected. Connecting your own key is free, takes less than 30 seconds, and unlocks all the AI lecture analysis engines.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => setOnboardingOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow cursor-pointer"
                          >
                            Connect API Key
                          </button>

                          <a
                            href="https://aistudio.google.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            Generate Free API Key
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* 4. Mobile Bottom Navigation bar (Only 5 Icons with labels) - Hidden during Focus Mode */}
      {!focusMode && (
        <nav className="sticky bottom-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-900 py-2.5 px-4 flex md:hidden items-center justify-around select-none shadow-lg">
          <button
            onClick={() => { setActiveTab("home"); setSearchQuery(""); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === "home" && !searchQuery ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button
            onClick={() => { setActiveTab("study"); setSearchQuery(""); }}
            disabled={!activeVideoId && !activeSession}
            className={`flex flex-col items-center gap-1 transition ${!activeVideoId && !activeSession ? "opacity-40 cursor-not-allowed" : ""} ${activeTab === "study" && !searchQuery ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`}
          >
            <Tv className="w-5 h-5" />
            <span className="text-[10px] font-bold">Study</span>
          </button>

          <button
            onClick={() => { setActiveTab("history"); setSearchQuery(""); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === "history" && !searchQuery ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold">History</span>
          </button>

          <button
            onClick={() => { setActiveTab("favorites"); setSearchQuery(""); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === "favorites" && !searchQuery ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-bold">Favorites</span>
          </button>

          <button
            onClick={() => { setActiveTab("settings"); setSearchQuery(""); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === "settings" && !searchQuery ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>
        </nav>
      )}

      {/* 5. Fullscreen Overlay Study Timer */}
      <FullScreenTimer />

      {/* 6. Floating Mini-Timer Widget (Visible across all tabs if enabled) */}
      {isPomoFloating && !isPomoFullScreen && (
        <div 
          className="fixed bottom-24 md:bottom-8 right-6 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xl flex items-center gap-4 select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-6"
          style={{ boxShadow: "0 12px 40px -12px rgba(0,0,0,0.2)" }}
        >
          <div className="flex flex-col pr-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${pomoState.mode === "focus" ? "bg-orange-500 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                {pomoState.mode === "focus" ? "Focus" : "Break"}
              </span>
            </div>
            <span className="text-base font-black text-slate-900 dark:text-zinc-50 font-mono mt-1">
              {(() => {
                const remainingSecs = Math.ceil(pomoState.remainingMs / 1000);
                const m = Math.floor(remainingSecs / 60);
                const s = remainingSecs % 60;
                return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
              })()}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-zinc-800/40 p-1.5 rounded-2xl border border-slate-200/40 dark:border-zinc-700/40">
            <button
              onClick={pomoState.isPaused ? startPomo : pausePomo}
              className="p-1.5 rounded-xl bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
              title={pomoState.isPaused ? "Start Timer" : "Pause Timer"}
            >
              {pomoState.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button
              onClick={() => setFullScreen(true)}
              className="p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 transition"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setFloating(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
              title="Hide Floating Widget"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Keyboard Shortcut feedback toast */}
      {shortcutToast.visible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-950/95 dark:bg-zinc-950/95 text-slate-100 dark:text-zinc-50 border border-slate-800/80 dark:border-zinc-800 px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold tracking-wide animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-200">
          <span className="font-sans">{shortcutToast.text}</span>
        </div>
      )}

      {/* 8. Gemini BYOK Onboarding Modal */}
      <GeminiOnboardingModal 
        isOpen={onboardingOpen} 
        onSuccess={() => {
          setOnboardingOpen(false);
          setHasGeminiKeyInState(true);
        }}
        allowClose={true}
        onClose={() => setOnboardingOpen(false)}
      />

    </div>
  );
}
