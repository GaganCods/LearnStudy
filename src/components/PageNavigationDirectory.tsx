import React, { useState, useMemo } from "react";
import { 
  Home, 
  Tv, 
  Folder, 
  Brain, 
  CheckCircle2, 
  Calendar, 
  AlarmClock, 
  TrendingUp, 
  History, 
  Heart, 
  Search, 
  Settings, 
  User, 
  Link, 
  Copy, 
  Check, 
  ExternalLink,
  Compass,
  ArrowRight
} from "lucide-react";
import { ActiveTab } from "../types";
import { APP_PAGES, PageItem, copyPageLink, getPageShareableUrl } from "../utils/pageRegistry";

interface PageNavigationDirectoryProps {
  onNavigate: (tab: ActiveTab) => void;
  activeTab?: ActiveTab;
  filterQuery?: string;
  onCopySuccess?: (title: string, url: string) => void;
  variant?: "full" | "compact" | "cards-grid" | "search-results";
}

export const PageNavigationDirectory: React.FC<PageNavigationDirectoryProps> = ({
  onNavigate,
  activeTab,
  filterQuery = "",
  onCopySuccess,
  variant = "full"
}) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [localQuery, setLocalQuery] = useState<string>("");

  const effectiveQuery = (filterQuery || localQuery).toLowerCase().trim();

  // Filter pages
  const filteredPages = useMemo(() => {
    return APP_PAGES.filter((page) => {
      // Category filter
      if (selectedCategory !== "All" && page.category !== selectedCategory) {
        return false;
      }
      // Query filter
      if (!effectiveQuery) return true;
      return (
        page.title.toLowerCase().includes(effectiveQuery) ||
        page.shortTitle.toLowerCase().includes(effectiveQuery) ||
        page.description.toLowerCase().includes(effectiveQuery) ||
        page.tabParam.toLowerCase().includes(effectiveQuery) ||
        page.keywords.some((kw) => kw.toLowerCase().includes(effectiveQuery))
      );
    });
  }, [effectiveQuery, selectedCategory]);

  const categories = ["All", "Core Hub", "Study Tools", "Personal Archive", "Settings & Info"];

  const handleCopy = async (e: React.MouseEvent, page: PageItem) => {
    e.stopPropagation();
    const url = await copyPageLink(page.id);
    setCopiedTab(page.id);
    setTimeout(() => setCopiedTab(null), 2200);
    if (onCopySuccess) {
      onCopySuccess(page.title, url);
    }
  };

  const getPageIcon = (tabId: ActiveTab) => {
    const iconClass = "w-5 h-5";
    switch (tabId) {
      case "home": return <Home className={iconClass} />;
      case "study": return <Tv className={iconClass} />;
      case "library": return <Folder className={iconClass} />;
      case "flashcards": return <Brain className={iconClass} />;
      case "planner": return <CheckCircle2 className={iconClass} />;
      case "calendar": return <Calendar className={iconClass} />;
      case "pomodoro": return <AlarmClock className={iconClass} />;
      case "stats": return <TrendingUp className={iconClass} />;
      case "history": return <History className={iconClass} />;
      case "favorites": return <Heart className={iconClass} />;
      case "search": return <Search className={iconClass} />;
      case "settings": return <Settings className={iconClass} />;
      case "developer": return <User className={iconClass} />;
      default: return <Compass className={iconClass} />;
    }
  };

  // Search Results variant - compact, high density with quick land & copy
  if (variant === "search-results") {
    if (filteredPages.length === 0) return null;

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xl font-[900] text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                Pages & Navigation Portals
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  {filteredPages.length} {filteredPages.length === 1 ? "match" : "matches"}
                </span>
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => {
            const isCurrent = activeTab === page.id;
            const isCopied = copiedTab === page.id;
            const directUrl = getPageShareableUrl(page.id);

            return (
              <div
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs"
                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-400/50 dark:hover:border-blue-500/50 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${page.accentBg} ${page.accentText} transition-transform group-hover:scale-105`}>
                        {getPageIcon(page.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {page.title}
                          </h3>
                          {page.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                              {page.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleCopy(e, page)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 transition-all ${
                        isCopied
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          : "bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                      }`}
                      title="Copy Direct Link URL"
                      aria-label="Copy Direct Link URL"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px] hidden xs:inline font-mono font-bold">{isCopied ? "Copied!" : "Link"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                    {page.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">
                    {page.category}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Land on Page <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Full Directory Component
  return (
    <div className="space-y-6">
      {/* Header with Filter Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              <Compass className="w-4 h-4" />
              <span>Workspace Navigation Links</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">
              Direct Page Portals & Shareable Links
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
              Every page in LearnStudy has a unique direct URL. Search pages below, jump straight to your target workspace, or copy shareable links.
            </p>
          </div>

          {!filterQuery && (
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter pages..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPages.map((page) => {
          const isCurrent = activeTab === page.id;
          const isCopied = copiedTab === page.id;

          return (
            <div
              key={page.id}
              onClick={() => onNavigate(page.id)}
              className={`group p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isCurrent
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20"
                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-3 rounded-2xl shrink-0 ${page.accentBg} ${page.accentText} group-hover:scale-105 transition-transform`}>
                      {getPageIcon(page.id)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {page.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {page.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleCopy(e, page)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                      isCopied
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                    }`}
                    title="Copy Direct Link URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-bold">{isCopied ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {page.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {page.keywords.slice(0, 3).map((kw) => (
                    <span key={kw} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400">
                      #{kw}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
