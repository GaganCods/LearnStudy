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
    shortTitle: "Lectures & Courses",
    badge: "Courses",
    description: "Organize YouTube playlists and single lectures into custom subjects, chapters, and syllabus folders.",
    keywords: ["library", "lectures", "lecture", "course", "courses", "subject", "subjects", "folder", "folders", "syllabus", "chapters", "playlist", "playlists"],
    category: "Core Hub",
    accentColor: "sky",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    accentText: "text-sky-600 dark:text-sky-400",
    accentBorder: "border-sky-500/30",
    tabParam: "lectures"
  },
  {
    id: "notes",
    title: "Lecture Notes Hub",
    shortTitle: "Notes",
    badge: "Markdown",
    description: "Browse, edit, search, and export all your interactive lecture notes and AI summaries across all courses.",
    keywords: ["notes", "note", "markdown", "summary", "lecture notes", "text", "draft", "export", "cheatsheet"],
    category: "Study Tools",
    accentColor: "emerald",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-emerald-500/30",
    tabParam: "notes"
  },
  {
    id: "flashcards",
    title: "Flashcards & Active Recall",
    shortTitle: "Flashcards",
    badge: "Active Recall",
    description: "Spaced repetition flashcards with automated AI deck generation from your lectures and active recall practice.",
    keywords: ["flashcard", "flashcards", "test", "anki", "cards", "questions", "active recall", "spaced repetition"],
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
    title: "Favorites & Liked",
    shortTitle: "Favorites",
    badge: "Saved",
    description: "Fast one-click access to all your favorite playlists, top-priority lectures, and saved learning materials.",
    keywords: ["favorites", "favorite", "heart", "liked", "bookmarks", "saved", "priority", "likes", "loved"],
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
  title?: string;
  list?: string;
  q?: string;
  t?: number;
}

/**
 * Converts text into a clean, URL-safe slug
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-alphanumerics except spaces & hyphens
    .replace(/\s+/g, "-") // replace multiple spaces with hyphen
    .replace(/-+/g, "-") // collapse repeated hyphens
    .slice(0, 60) // clean length limit
    .replace(/^-+|-+$/g, ""); // trim hyphens at ends
}

/**
 * Returns the clean, semantic shareable link (e.g. /app/dashboard, /app/lectures, /app/lectures/physics, /app/notes)
 */
export function getPageShareableUrl(
  tab: ActiveTab,
  params?: {
    subjectSlug?: string;
    lectureSlug?: string;
    videoId?: string;
    videoTitle?: string;
    playlistId?: string;
    searchQuery?: string;
    timestamp?: number;
    absolute?: boolean;
  }
): string {
  const isAbsolute = params?.absolute !== false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  let pathname = `/app/${tab}`;
  const searchParams = new URLSearchParams();

  if (tab === "home") {
    pathname = "/app/dashboard";
  } else if (tab === "library") {
    if (params?.subjectSlug && params?.lectureSlug) {
      pathname = `/app/lectures/${params.subjectSlug}/${params.lectureSlug}`;
    } else if (params?.subjectSlug) {
      pathname = `/app/lectures/${params.subjectSlug}`;
    } else {
      pathname = "/app/lectures";
    }
  } else if (tab === "notes") {
    pathname = "/app/notes";
  } else if (tab === "flashcards") {
    pathname = "/app/flashcards";
  } else if (tab === "planner") {
    pathname = "/app/planner";
  } else if (tab === "calendar") {
    pathname = "/app/calendar";
  } else if (tab === "pomodoro") {
    pathname = "/app/pomodoro";
  } else if (tab === "history") {
    pathname = "/app/history";
  } else if (tab === "favorites") {
    pathname = "/app/favorites";
  } else if (tab === "stats") {
    pathname = "/app/stats";
  } else if (tab === "settings") {
    pathname = "/app/settings";
  } else if (tab === "developer") {
    pathname = "/app/developer";
  } else if (tab === "search" || params?.searchQuery) {
    pathname = "/app/search";
    if (params?.searchQuery) {
      searchParams.set("q", params.searchQuery);
    }
  } else if (tab === "study") {
    if (params?.subjectSlug && params?.lectureSlug) {
      pathname = `/app/lectures/${params.subjectSlug}/${params.lectureSlug}`;
    } else {
      pathname = "/app/study";
      if (params?.videoId) {
        searchParams.set("v", params.videoId);
        if (params.videoTitle) {
          const titleSlug = slugify(params.videoTitle);
          if (titleSlug) searchParams.set("title", titleSlug);
        }
      }
      if (params?.playlistId) {
        searchParams.set("list", params.playlistId);
      }
    }
  }

  if (params?.timestamp && params.timestamp > 0) {
    searchParams.set("t", String(Math.floor(params.timestamp)));
  }

  const queryString = searchParams.toString();
  const relativeUrl = queryString ? `${pathname}?${queryString}` : pathname;
  return isAbsolute ? `${origin}${relativeUrl}` : relativeUrl;
}

/**
 * Copies a page direct link to the clipboard.
 */
export async function copyPageLink(
  tab: ActiveTab,
  params?: {
    subjectSlug?: string;
    lectureSlug?: string;
    videoId?: string;
    videoTitle?: string;
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
 * Parse the current window URL (pathname, search params or hash) to determine direct landing target.
 */
export function parseInitialUrlState(): {
  tab: ActiveTab | null;
  subjectSlug?: string;
  lectureSlug?: string;
  videoId?: string;
  videoTitle?: string;
  playlistId?: string;
  searchQuery?: string;
  timestamp?: number;
  shareFolder?: string;
  shareChapter?: string;
  shareData?: string;
} {
  if (typeof window === "undefined") {
    return { tab: null };
  }

  try {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const pathParts = rawPath.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";

    const pathTabMap: Record<string, ActiveTab> = {
      "": "home",
      "app": "home",
      "dashboard": "home",
      "home": "home",
      "study": "study",
      "lectures": "library",
      "library": "library",
      "courses": "library",
      "notes": "notes",
      "note": "notes",
      "flashcards": "flashcards",
      "planner": "planner",
      "tasks": "planner",
      "calendar": "calendar",
      "schedule": "calendar",
      "pomodoro": "pomodoro",
      "timer": "pomodoro",
      "stats": "stats",
      "analytics": "stats",
      "history": "history",
      "favorites": "favorites",
      "search": "search",
      "settings": "settings",
      "developer": "developer",
      "about": "developer",
    };

    let targetSegment = firstSegment;
    let subSegment = pathParts[1] || "";
    let subjectSlugFromPath: string | undefined = undefined;
    let lectureSlugFromPath: string | undefined = undefined;

    if (firstSegment === "app") {
      targetSegment = subSegment || "home";
      if (subSegment === "lectures" || subSegment === "library" || subSegment === "courses") {
        subjectSlugFromPath = pathParts[2] || undefined;
        lectureSlugFromPath = pathParts[3] || undefined;
      }
    } else {
      if (firstSegment === "lectures" || firstSegment === "library" || firstSegment === "courses") {
        subjectSlugFromPath = pathParts[1] || undefined;
        lectureSlugFromPath = pathParts[2] || undefined;
      }
    }

    let tabFromPath: ActiveTab | null = pathTabMap[targetSegment] || null;
    let videoIdFromPath: string | undefined = undefined;
    let titleFromPath: string | undefined = undefined;

    // Check path patterns like /study/v/:videoId or /app/study/v/:videoId
    if (targetSegment === "study" || targetSegment === "v") {
      const remainingParts = firstSegment === "app" ? pathParts.slice(1) : pathParts;
      if (remainingParts[1] === "v" && remainingParts[2]) {
        videoIdFromPath = remainingParts[2];
        if (remainingParts[3]) titleFromPath = remainingParts[3];
      } else if (remainingParts[1] && remainingParts[1].length === 11) {
        videoIdFromPath = remainingParts[1];
        if (remainingParts[2]) titleFromPath = remainingParts[2];
      }
    }

    // Check query params
    let tabParam = (params.get("tab") || params.get("page")) as ActiveTab | null;
    if (tabParam && !APP_PAGES.some(p => p.id === tabParam)) {
      tabParam = null;
    }

    // Check hash fallback (e.g. #flashcards or #/planner)
    const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    let tabFromHash: ActiveTab | null = null;
    if (hash && pathTabMap[hash]) {
      tabFromHash = pathTabMap[hash];
    }

    const videoId = params.get("v") || params.get("videoId") || videoIdFromPath || undefined;
    const titleSlug = params.get("title") || params.get("name") || titleFromPath || undefined;
    const playlistId = params.get("list") || params.get("playlistId") || undefined;
    const searchQuery = params.get("q") || params.get("search") || undefined;
    const tParam = params.get("t") || params.get("time");
    const timestamp = tParam ? parseInt(tParam, 10) : undefined;
    const shareFolder = params.get("shareFolder") || params.get("folderId") || undefined;
    const shareChapter = params.get("shareChapter") || params.get("chapterId") || undefined;
    const shareData = params.get("d") || params.get("data") || undefined;

    // If a lecture slug is present in /app/lectures/:subject/:lecture, route to study tab!
    let finalTab: ActiveTab | null = tabParam || tabFromPath || tabFromHash || (videoId || playlistId ? "study" : (searchQuery ? "search" : (shareFolder || shareChapter ? "library" : null)));
    if (subjectSlugFromPath && lectureSlugFromPath) {
      finalTab = "study";
    }

    return {
      tab: finalTab,
      subjectSlug: subjectSlugFromPath,
      lectureSlug: lectureSlugFromPath,
      videoId,
      videoTitle: titleSlug ? titleSlug.replace(/-/g, " ") : undefined,
      playlistId,
      searchQuery,
      timestamp: isNaN(timestamp as any) ? undefined : timestamp,
      shareFolder,
      shareChapter,
      shareData
    };
  } catch (e) {
    console.error("Failed to parse URL state", e);
    return { tab: null };
  }
}

/**
 * Sync the current app state to browser history URL with clean paths & video slugs.
 */
export function syncStateToUrl(
  tab: ActiveTab,
  params?: {
    subjectSlug?: string;
    lectureSlug?: string;
    videoId?: string;
    videoTitle?: string;
    playlistId?: string;
    searchQuery?: string;
    replace?: boolean;
    push?: boolean;
  }
) {
  if (typeof window === "undefined") return;

  try {
    const newRelativeUrl = getPageShareableUrl(tab, { ...params, absolute: false });
    const currentRelativeUrl = `${window.location.pathname}${window.location.search}`;

    if (currentRelativeUrl !== newRelativeUrl) {
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

/**
 * Programmatically navigate to a URL or Tab while creating a proper browser history entry.
 */
export function navigateTo(
  urlOrTab: string | ActiveTab,
  params?: {
    subjectSlug?: string;
    lectureSlug?: string;
    videoId?: string;
    videoTitle?: string;
    playlistId?: string;
    searchQuery?: string;
    replace?: boolean;
  }
) {
  if (typeof window === "undefined") return;

  let targetUrl = "";
  let tab: ActiveTab = "home";

  if (typeof urlOrTab === "string" && (urlOrTab.startsWith("/") || urlOrTab.startsWith("http"))) {
    targetUrl = urlOrTab;
  } else {
    tab = urlOrTab as ActiveTab;
    targetUrl = getPageShareableUrl(tab, { ...params, absolute: false });
  }

  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl === targetUrl) {
    // Already on the target URL, no-op to avoid history pollution and redundant popstate events
    return;
  }

  if (params?.replace) {
    window.history.replaceState({ tab, ...params }, "", targetUrl);
  } else {
    window.history.pushState({ tab, ...params }, "", targetUrl);
  }

  // Dispatch popstate event only when URL actually changed
  window.dispatchEvent(new PopStateEvent("popstate", { state: { tab, ...params } }));
}
