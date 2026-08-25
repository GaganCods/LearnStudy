import { ActiveTab } from "../types";

export interface PageItem {
  id: ActiveTab;
  title: string;
  shortTitle: string;
  badge?: string;
  description: string;
  keywords: string[];
  category: "Core Hub" | "Study Tools" | "Personal Archive" | "Settings & Info";
  accentColor: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  tabParam: string;
}

export const APP_PAGES: PageItem[] = [
  {
    id: "home",
    title: "Home Dashboard",
    shortTitle: "Home",
    badge: "Hub",
    description: "Your personalized study hub, quick action shortcuts, learning streaks, and recent course progress.",
    keywords: ["home", "dashboard", "hub", "overview", "streak", "recent", "stats", "summary", "start"],
    category: "Core Hub",
    accentColor: "blue",
    accentBg: "bg-blue-500/10 dark:bg-blue-500/15",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBorder: "border-blue-500/30",
    tabParam: "home"
  },
  {
    id: "study",
    title: "Lecture Study Player",
    shortTitle: "Study Player",
    badge: "Workspace",
    description: "Distraction-free lecture player with timestamped bookmarks, rich Markdown notes, and AI study companion.",
    keywords: ["study", "player", "lecture", "video", "youtube", "notes", "bookmarks", "companion", "ai", "transcript"],
    category: "Core Hub",
    accentColor: "indigo",
    accentBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    accentText: "text-indigo-600 dark:text-indigo-400",
    accentBorder: "border-indigo-500/30",
    tabParam: "study"
  },
  {
    id: "library",
    title: "Course & Subject Library",
    shortTitle: "Library",
    badge: "Courses",
    description: "Organize YouTube playlists and single lectures into custom subjects, chapters, and syllabus folders.",
    keywords: ["library", "course", "courses", "subject", "subjects", "folder", "folders", "syllabus", "chapters", "playlist", "playlists"],
    category: "Core Hub",
    accentColor: "sky",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    accentText: "text-sky-600 dark:text-sky-400",
    accentBorder: "border-sky-500/30",
    tabParam: "library"
  },
  {
    id: "flashcards",
    title: "Flashcards & AI Quiz",
    shortTitle: "Flashcards",
    badge: "Active Recall",
    description: "Spaced repetition flashcards with automated AI deck generation from your lectures and active recall quiz master.",
    keywords: ["flashcard", "flashcards", "quiz", "test", "anki", "cards", "questions", "active recall", "spaced repetition", "mcq"],
    category: "Study Tools",
    accentColor: "purple",
    accentBg: "bg-purple-500/10 dark:bg-purple-500/15",
    accentText: "text-purple-600 dark:text-purple-400",
    accentBorder: "border-purple-500/30",
    tabParam: "flashcards"
  },
  {
    id: "planner",
    title: "Study Planner & Tasks",
    shortTitle: "Planner",
    badge: "Schedule",
    description: "Smart task planner, assignment deadlines, AI-powered study schedule generator, and daily priority tracker.",
    keywords: ["planner", "plan", "tasks", "task", "todo", "schedule", "assignment", "deadline", "goals", "routine"],
    category: "Study Tools",
    accentColor: "emerald",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-emerald-500/30",
    tabParam: "planner"
  },
  {
    id: "calendar",
    title: "Study Calendar & Streaks",
    shortTitle: "Calendar",
    badge: "Timeline",
    description: "Interactive monthly study schedule, revision deadlines, daily streak tracking, and study activity heatmaps.",
    keywords: ["calendar", "streaks", "streak", "heatmap", "schedule", "month", "timeline", "dates", "events", "exam"],
    category: "Study Tools",
    accentColor: "amber",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    accentText: "text-amber-600 dark:text-amber-400",
    accentBorder: "border-amber-500/30",
    tabParam: "calendar"
  },
  {
    id: "pomodoro",
    title: "Pomodoro Focus Timer",
    shortTitle: "Pomodoro",
    badge: "Focus",
    description: "Focus timer with customizable intervals, ambient background sounds, full-screen mode, and study logs.",
    keywords: ["pomodoro", "timer", "focus", "clock", "stopwatch", "interval", "break", "ambient", "sound", "concentration"],
    category: "Study Tools",
    accentColor: "orange",
    accentBg: "bg-orange-500/10 dark:bg-orange-500/15",
    accentText: "text-orange-600 dark:text-orange-400",
    accentBorder: "border-orange-500/30",
    tabParam: "pomodoro"
  },
  {
    id: "stats",
    title: "Study Analytics & Insights",
    shortTitle: "Analytics",
    badge: "Insights",
    description: "Weekly focus hours, subject distribution, completion rates, study performance, and productivity trends.",
    keywords: ["stats", "statistics", "analytics", "insights", "charts", "graphs", "hours", "progress", "report", "productivity"],
    category: "Personal Archive",
    accentColor: "cyan",
    accentBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    accentText: "text-cyan-600 dark:text-cyan-400",
    accentBorder: "border-cyan-500/30",
    tabParam: "stats"
  },
  {
    id: "history",
    title: "Learning History",
    shortTitle: "History",
    badge: "Archive",
    description: "Chronological log of all watched video lectures, completed sessions, and recent study timestamps.",
    keywords: ["history", "recent", "watched", "completed", "log", "archive", "sessions", "timestamps"],
    category: "Personal Archive",
    accentColor: "slate",
    accentBg: "bg-slate-500/10 dark:bg-slate-500/15",
    accentText: "text-slate-600 dark:text-zinc-300",
    accentBorder: "border-slate-500/30",
    tabParam: "history"
  },
  {
    id: "favorites",
    title: "Favorites & Starred",
    shortTitle: "Favorites",
    badge: "Bookmarks",
    description: "Fast one-click access to all your starred playlists, top-priority lectures, and saved learning materials.",
    keywords: ["favorites", "favorite", "starred", "bookmarks", "saved", "priority", "likes", "loved"],
    category: "Personal Archive",
    accentColor: "rose",
    accentBg: "bg-rose-500/10 dark:bg-rose-500/15",
    accentText: "text-rose-600 dark:text-rose-400",
    accentBorder: "border-rose-500/30",
    tabParam: "favorites"
  },
  {
    id: "search",
    title: "Workspace Omni-Search",
    shortTitle: "Search",
    badge: "Discovery",
    description: "Search across all playlists, lectures, markdown notes, saved moments, and jump directly to any page.",
    keywords: ["search", "find", "discover", "omni", "query", "lookup", "explore", "pages", "links"],
    category: "Core Hub",
    accentColor: "teal",
    accentBg: "bg-teal-500/10 dark:bg-teal-500/15",
    accentText: "text-teal-600 dark:text-teal-400",
    accentBorder: "border-teal-500/30",
    tabParam: "search"
  },
  {
    id: "settings",
    title: "Settings & Preferences",
    shortTitle: "Settings",
    badge: "Config",
    description: "Theme preferences, Gemini API key configuration, study shortcuts, JSON backup export, and profile setup.",
    keywords: ["settings", "preferences", "config", "api key", "gemini", "theme", "dark mode", "backup", "export", "import"],
    category: "Settings & Info",
    accentColor: "zinc",
    accentBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    accentText: "text-zinc-700 dark:text-zinc-300",
    accentBorder: "border-zinc-500/30",
    tabParam: "settings"
  },
  {
    id: "developer",
    title: "Developer Profile",
    shortTitle: "Developer",
    badge: "About",
    description: "Information about LearnStudy AI, tech stack, architecture, creator details, and feedback channels.",
    keywords: ["developer", "creator", "about", "profile", "author", "feedback", "github", "stack", "info"],
    category: "Settings & Info",
    accentColor: "violet",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    accentText: "text-violet-600 dark:text-violet-400",
    accentBorder: "border-violet-500/30",
    tabParam: "developer"
  }
];

export interface NavigationUrlParams {
  tab?: ActiveTab;
  v?: string;
  list?: string;
  q?: string;
  t?: number;
}

/**
 * Returns the shareable link (relative or absolute) for a specific page or resource.
 */
export function getPageShareableUrl(
  tab: ActiveTab,
  params?: {
    videoId?: string;
    playlistId?: string;
    searchQuery?: string;
    timestamp?: number;
    absolute?: boolean;
  }
): string {
  const isAbsolute = params?.absolute !== false;
  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";

  const searchParams = new URLSearchParams();

  if (tab === "search" || params?.searchQuery) {
    searchParams.set("tab", "search");
    if (params?.searchQuery) {
      searchParams.set("q", params.searchQuery);
    }
  } else if (tab === "study") {
    searchParams.set("tab", "study");
    if (params?.playlistId) {
      searchParams.set("list", params.playlistId);
    }
    if (params?.videoId) {
      searchParams.set("v", params.videoId);
    }
    if (params?.timestamp && params.timestamp > 0) {
      searchParams.set("t", String(Math.floor(params.timestamp)));
    }
  } else {
    searchParams.set("tab", tab);
  }

  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${baseUrl}?${queryString}` : `${baseUrl}?tab=${tab}`;
  return isAbsolute ? fullUrl : `?${queryString}`;
}

/**
 * Copies a page direct link to the clipboard.
 */
export async function copyPageLink(
  tab: ActiveTab,
  params?: {
    videoId?: string;
    playlistId?: string;
    searchQuery?: string;
    timestamp?: number;
  }
): Promise<string> {
  const url = getPageShareableUrl(tab, { ...params, absolute: true });
  try {
    await navigator.clipboard.writeText(url);
    return url;
  } catch (e) {
    // Fallback using legacy command if clipboard API is restricted
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return url;
  }
}

/**
 * Search the registered pages by query matching title, shortTitle, description, and keywords.
 */
export function searchPages(rawQuery: string): PageItem[] {
  if (!rawQuery || !rawQuery.trim()) {
    return APP_PAGES;
  }
  const query = rawQuery.toLowerCase().trim();

  return APP_PAGES.filter((page) => {
    if (page.title.toLowerCase().includes(query)) return true;
    if (page.shortTitle.toLowerCase().includes(query)) return true;
    if (page.description.toLowerCase().includes(query)) return true;
    if (page.category.toLowerCase().includes(query)) return true;
    if (page.tabParam.toLowerCase().includes(query)) return true;
    if (page.keywords.some((kw) => kw.toLowerCase().includes(query))) return true;
    return false;
  });
}

/**
 * Parse the current window URL (search params or hash) to determine direct landing target.
 */
export function parseInitialUrlState(): {
  tab: ActiveTab | null;
  videoId?: string;
  playlistId?: string;
  searchQuery?: string;
  timestamp?: number;
} {
  if (typeof window === "undefined") {
    return { tab: null };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    
    // Check tab or page param
    let tabParam = (params.get("tab") || params.get("page")) as ActiveTab | null;
    
    // Also check hash (e.g. #flashcards or #/planner)
    const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    if (!tabParam && hash) {
      const matchedPage = APP_PAGES.find(p => p.tabParam === hash || p.id === hash);
      if (matchedPage) {
        tabParam = matchedPage.id;
      }
    }

    const videoId = params.get("v") || params.get("videoId") || undefined;
    const playlistId = params.get("list") || params.get("playlistId") || undefined;
    const searchQuery = params.get("q") || params.get("search") || undefined;
    const tParam = params.get("t") || params.get("time");
    const timestamp = tParam ? parseInt(tParam, 10) : undefined;

    // If a video or playlist ID is directly in the URL without tab, default to study tab
    if ((videoId || playlistId) && !tabParam) {
      tabParam = "study";
    }

    // If a search query is present without tab, default to search tab
    if (searchQuery && !tabParam) {
      tabParam = "search";
    }

    // Validate that tab is a known ActiveTab
    const validTabs: ActiveTab[] = APP_PAGES.map(p => p.id);
    const validTab = tabParam && validTabs.includes(tabParam) ? tabParam : null;

    return {
      tab: validTab,
      videoId,
      playlistId,
      searchQuery,
      timestamp: isNaN(timestamp as any) ? undefined : timestamp
    };
  } catch (e) {
    console.error("Failed to parse URL state", e);
    return { tab: null };
  }
}

/**
 * Sync the current app state to browser history URL.
 */
export function syncStateToUrl(
  tab: ActiveTab,
  params?: {
    videoId?: string;
    playlistId?: string;
    searchQuery?: string;
    replace?: boolean;
  }
) {
  if (typeof window === "undefined") return;

  try {
    const searchParams = new URLSearchParams();

    if (params?.searchQuery && params.searchQuery.trim()) {
      searchParams.set("tab", "search");
      searchParams.set("q", params.searchQuery.trim());
    } else if (tab === "study") {
      searchParams.set("tab", "study");
      if (params?.playlistId) {
        searchParams.set("list", params.playlistId);
      }
      if (params?.videoId) {
        searchParams.set("v", params.videoId);
      }
    } else if (tab === "home") {
      searchParams.set("tab", "home");
    } else {
      searchParams.set("tab", tab);
    }

    const newSearch = searchParams.toString();
    const newRelativeUrl = newSearch ? `?${newSearch}` : window.location.pathname;
    const currentRelativeUrl = window.location.search || window.location.pathname;

    if (currentRelativeUrl !== newRelativeUrl && window.location.search !== `?${newSearch}`) {
      if (params?.replace) {
        window.history.replaceState({ tab, ...params }, "", newRelativeUrl);
      } else {
        window.history.pushState({ tab, ...params }, "", newRelativeUrl);
      }
    }
  } catch (e) {
    console.error("Failed to sync state to URL", e);
  }
}
