import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Settings as SettingsIcon,
  Play,
  Sun,
  Moon,
  Laptop,
  Volume2,
  VolumeX,
  Sparkles,
  Database,
  Download,
  Upload,
  Keyboard,
  ShieldAlert,
  Info,
  CheckCircle2,
  X,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  CheckCircle,
  Clock,
  HardDrive,
  FileText,
  Bookmark as BookmarkIcon,
  Brain,
  Zap,
  Lock,
  ExternalLink,
  Code,
  Bell,
  Sliders,
  Palette,
  Flame,
  Globe,
  Github,
  Twitter
} from "lucide-react";
import { StudySettings } from "../types";
import { Storage } from "../utils/storage";
import { UserAvatar } from "./UserAvatar";
import {
  PRESET_DOODLE_AVATARS,
  DOODLE_STYLES,
  buildDoodleAvatarUrl,
  getAutoAssignedDoodleAvatar,
  getEffectiveAvatarUrl,
} from "../utils/doodleAvatar";

export type SettingsCategory =
  | "general"
  | "playback"
  | "appearance"
  | "notifications"
  | "ai"
  | "storage"
  | "backup"
  | "shortcuts"
  | "developer"
  | "about"
  | "danger";

interface SettingsPanelProps {
  settings: StudySettings;
  onSettingChange: (key: keyof StudySettings, value: any) => void;
  onSaveSettings: (newSettings: StudySettings) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  handleExportAll: () => void;
  handleImportAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetData: () => void;
  getGeminiKey: () => string | null;
  removeGeminiKey: () => void;
  setOnboardingOpen: (open: boolean) => void;
  setHasGeminiKeyInState: (hasKey: boolean) => void;
  hasGeminiKeyInState: boolean;
  toast: any;
  onNavigateTab: (tab: any) => void;
}

export function SettingsPanel({
  settings,
  onSettingChange,
  onSaveSettings,
  soundEnabled,
  setSoundEnabled,
  handleExportAll,
  handleImportAll,
  handleResetData,
  getGeminiKey,
  removeGeminiKey,
  setOnboardingOpen,
  setHasGeminiKeyInState,
  hasGeminiKeyInState,
  toast,
  onNavigateTab,
}: SettingsPanelProps) {
  // Local edit state for sticky save bar
  const [localSettings, setLocalSettings] = useState<StudySettings>({ ...settings });
  const [savedSettings, setSavedSettings] = useState<StudySettings>({ ...settings });

  // Navigation & Search State
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [mobileCategory, setMobileCategory] = useState<SettingsCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Gemini Key UI State
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Doodle Avatar UI State
  const [doodleStyleFilter, setDoodleStyleFilter] = useState<string>("all");
  const [customDoodleSeed, setCustomDoodleSeed] = useState<string>(localSettings.userAvatarSeed || "");

  // Bottom sheet modal state for mobile select controls
  const [bottomSheetConfig, setBottomSheetConfig] = useState<{
    isOpen: boolean;
    title: string;
    options: { label: string; value: any; icon?: React.ReactNode }[];
    currentValue: any;
    onSelect: (val: any) => void;
  }>({
    isOpen: false,
    title: "",
    options: [],
    currentValue: null,
    onSelect: () => {},
  });

  // Check if settings have unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(localSettings) !== JSON.stringify(savedSettings);
  }, [localSettings, savedSettings]);

  // Sync prop changes if external save happens
  useEffect(() => {
    setLocalSettings({ ...settings });
    setSavedSettings({ ...settings });
  }, [settings]);

  const updateLocalSetting = (key: keyof StudySettings, value: any, immediateGlobal = false) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    // Apply immediate global effects for live preview where needed
    if (immediateGlobal || key === "theme" || key === "compactMode" || key === "playbackSpeed") {
      onSettingChange(key, value);
    }
  };

  const updateLocalSettingsBatch = (batch: Partial<StudySettings>, immediateGlobal = false) => {
    const updated = { ...localSettings, ...batch };
    setLocalSettings(updated);
    if (immediateGlobal) {
      Object.entries(batch).forEach(([k, v]) => {
        onSettingChange(k as keyof StudySettings, v);
      });
    }
  };

  const handleSave = () => {
    setSavedSettings({ ...localSettings });
    onSaveSettings(localSettings);
    toast.success("Settings Saved", "All preferences updated successfully!");
  };

  const handleResetLocal = () => {
    setLocalSettings({ ...savedSettings });
    // Revert global settings to saved
    Object.entries(savedSettings).forEach(([k, v]) => {
      onSettingChange(k as keyof StudySettings, v);
    });
    toast.info("Changes Discarded", "Reverted to last saved preferences.");
  };

  // Mask API key
  const maskApiKey = (key: string | null) => {
    if (!key) return "No Key Connected";
    if (key.length <= 8) return "••••••••••••";
    return key.substring(0, 4) + "••••••••••••••••" + key.substring(key.length - 4);
  };

  // Test Gemini API key
  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const key = getGeminiKey();
      if (!key) throw new Error("No connected Gemini key found.");
      const { validateGeminiKey } = await import("../utils/gemini");
      const isValid = await validateGeminiKey(key);
      if (isValid) {
        setTestResult({
          type: "success",
          message: "API key validated successfully! Gemini 2.5 Flash connection is active.",
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        message: err.message || "Failed to validate API Key. Please verify key permissions.",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Calculate local storage stats dynamically only when in storage tab or needed
  const [storageStats, setStorageStats] = useState({
    playlistsCount: 0,
    videosCount: 0,
    bookmarksCount: 0,
    notesCount: 0,
    flashcardsCount: 0,
    totalMB: "0.1",
    playlistsPercent: 35,
    bookmarksPercent: 15,
    notesPercent: 25,
    flashcardsPercent: 15,
    aiPercent: 10,
  });

  useEffect(() => {
    // Only calculate storage stats lazily
    try {
      const playlists = Storage.getPlaylists();
      const singleVideos = Storage.getSingleVideos();
      const bookmarks = Storage.getBookmarks();
      const notes = Storage.getNotes();
      const flashcards = Storage.getFlashcards();

      const playlistsCount = playlists.length;
      const videosCount = singleVideos.length + playlists.reduce((acc, p) => acc + p.videos.length, 0);
      const bookmarksCount = Object.values(bookmarks).reduce((acc, list) => acc + list.length, 0);
      const notesCount = Object.keys(notes).length;
      const flashcardsCount = flashcards.length;

      const rawData = localStorage.getItem("studytube_playlists") || "";
      const notesData = localStorage.getItem("studytube_notes") || "";
      const flashcardData = localStorage.getItem("studytube_flashcards") || "";
      const totalBytes = (rawData.length + notesData.length + flashcardData.length) * 2;
      const totalMB = Math.max(0.1, (totalBytes / (1024 * 1024))).toFixed(2);

      setStorageStats({
        playlistsCount,
        videosCount,
        bookmarksCount,
        notesCount,
        flashcardsCount,
        totalMB,
        playlistsPercent: 35,
        bookmarksPercent: 15,
        notesPercent: 25,
        flashcardsPercent: 15,
        aiPercent: 10,
      });
    } catch (e) {
      // safe fallback
    }
  }, [activeCategory, mobileCategory]);

  // Categories list definition
  const categories: {
    id: SettingsCategory;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
    color: string;
  }[] = [
    {
      id: "general",
      label: "General",
      description: "Profile, workspace name & study goals",
      icon: <User className="w-4 h-4" />,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      id: "playback",
      label: "Playback & Audio",
      description: "Speed, autoplay & video controls",
      icon: <Play className="w-4 h-4" />,
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Theme mode & visual density",
      icon: <Palette className="w-4 h-4" />,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Sound effects & toast chimes",
      icon: <Bell className="w-4 h-4" />,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      id: "ai",
      label: "Gemini AI",
      description: "API Key, connection & model status",
      icon: <Sparkles className="w-4 h-4" />,
      badge: hasGeminiKeyInState ? "Connected" : "Needed",
      color: "text-violet-500 bg-violet-500/10",
    },
    {
      id: "storage",
      label: "Storage & Cache",
      description: "IndexedDB stats & offline cache",
      icon: <HardDrive className="w-4 h-4" />,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "backup",
      label: "Backup & Restore",
      description: "JSON export & data migration",
      icon: <Database className="w-4 h-4" />,
      color: "text-cyan-500 bg-cyan-500/10",
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      description: "macOS & YouTube hotkeys guide",
      icon: <Keyboard className="w-4 h-4" />,
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      id: "developer",
      label: "Developer",
      description: "Creator profile & credentials",
      icon: <Code className="w-4 h-4" />,
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      id: "about",
      label: "About LearnStudy",
      description: "Version 2.1.0, links & terms",
      icon: <Info className="w-4 h-4" />,
      color: "text-slate-500 bg-slate-500/10",
    },
    {
      id: "danger",
      label: "Danger Zone",
      description: "Reset local database & cache",
      icon: <ShieldAlert className="w-4 h-4" />,
      color: "text-red-500 bg-red-500/10",
    },
  ];

  // Render Category Content Panel
  const renderCategoryContent = (catId: SettingsCategory) => {
    switch (catId) {
      case "general":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                General Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Manage your user profile identity and workspace targets.
              </p>
            </div>

            {/* Display Name Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4 hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Display Name
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Your name shown across the home dashboard, certificates, and AI chats.
                  </p>
                </div>
              </div>

              <div className="max-w-md">
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={localSettings.userName || ""}
                  onChange={(e) => {
                    const newName = e.target.value;
                    updateLocalSetting("userName", newName);
                  }}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold px-4 py-3 rounded-2xl text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Doodle Art Profile Picture Gallery & Auto-Assign Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                      Doodle Art Profile Picture
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Every user gets an auto-assigned doodle art avatar based on their name. Pick your favorite or auto-generate a new one!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const randomSeed = "Doodle_" + Math.random().toString(36).substring(2, 9);
                      updateLocalSettingsBatch({
                        userAvatarSeed: randomSeed,
                        userAvatarStyle: "fun-emoji",
                        userAvatarUrl: undefined,
                      });
                      setCustomDoodleSeed(randomSeed);
                      toast.success("New Doodle Auto-Assigned!", "Generated a new vibrant doodle profile picture.");
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Randomize Doodle
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateLocalSettingsBatch({
                        userAvatarSeed: undefined,
                        userAvatarStyle: undefined,
                        userAvatarUrl: undefined,
                      });
                      setCustomDoodleSeed("");
                      toast.info("Auto Doodle Reset", "Reverted to name-derived default doodle art.");
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              {/* Active Profile Preview Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    userName={localSettings.userName || "Scholar"}
                    customAvatarUrl={localSettings.userAvatarUrl}
                    customSeed={localSettings.userAvatarSeed}
                    customStyle={localSettings.userAvatarStyle}
                    size="xl"
                    showStatusIndicator={true}
                    showLevelBadge={false}
                  />

                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Doodle Avatar</div>
                    <div className="text-base font-black text-slate-900 dark:text-zinc-50">
                      {localSettings.userName || "Scholar"}'s Doodle
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      {localSettings.userAvatarSeed
                        ? `Custom Seed: "${localSettings.userAvatarSeed}"`
                        : "Auto-assigned from user display name"}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Active Profile Pic
                  </span>
                </div>
              </div>

              {/* Custom Seed Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <span>Custom Doodle Seed String</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Type anything to generate a custom doodle avatar)</span>
                </label>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g. CosmicRider, TechScholar, PixelNinja..."
                    value={customDoodleSeed}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDoodleSeed(val);
                      updateLocalSetting("userAvatarSeed", val || undefined);
                    }}
                    className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold px-4 py-2.5 rounded-2xl text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customDoodleSeed.trim()) {
                        updateLocalSetting("userAvatarSeed", customDoodleSeed.trim());
                        toast.success("Doodle Seed Applied!", `Avatar updated to "${customDoodleSeed.trim()}".`);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-2xl cursor-pointer hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Style Filter Tabs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Doodle Art Gallery ({PRESET_DOODLE_AVATARS.length} Presets)
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setDoodleStyleFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                      doodleStyleFilter === "all"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    All Styles
                  </button>
                  {DOODLE_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDoodleStyleFilter(st.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                        doodleStyleFilter === st.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {st.name}
                    </button>
                  ))}
                </div>

                {/* Doodle Gallery Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[380px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                  {PRESET_DOODLE_AVATARS.filter(
                    (p) => doodleStyleFilter === "all" || p.style === doodleStyleFilter
                  ).map((preset) => {
                    const presetUrl = buildDoodleAvatarUrl(preset.style, preset.seed);
                    const isSelected = localSettings.userAvatarSeed === preset.seed;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          updateLocalSettingsBatch({
                            userAvatarSeed: preset.seed,
                            userAvatarStyle: preset.style,
                            userAvatarUrl: undefined,
                          });
                          setCustomDoodleSeed(preset.seed);
                          toast.success("Doodle Avatar Selected!", `Set profile picture to "${preset.name}".`);
                        }}
                        className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center gap-2 cursor-pointer group ${
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30 scale-102 shadow-md"
                            : "bg-slate-50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800 hover:border-indigo-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80"
                        }`}
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xs group-hover:scale-110 transition-transform">
                          <img
                            src={presetUrl}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="w-full">
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">
                            {preset.tag}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Daily Goal Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4 hover:-translate-y-0.5 transition-all duration-300">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Daily Study Goal
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Set target study duration per day to maintain learning streaks.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {[15, 30, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => updateLocalSetting("dailyGoalMinutes", mins)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                      (localSettings.dailyGoalMinutes || 45) === mins
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {mins} mins / day
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Layout Toggle */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Compact Mode Layout
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Reduce padding and card margins for high density viewing on smaller monitors.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateLocalSetting("compactMode", !localSettings.compactMode)}
                className={`w-12 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer ${
                  localSettings.compactMode ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ x: localSettings.compactMode ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        );

      case "playback":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-500" />
                Playback & Player Controls
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Customize YouTube video lecture speed, autoplay rules and queue behavior.
              </p>
            </div>

            {/* Speed Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4 hover:-translate-y-0.5 transition-all duration-300">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Default Playback Speed
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Initial playback speed applied automatically when starting any video lecture.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateLocalSetting("playbackSpeed", s)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      localSettings.playbackSpeed === s
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Autoplay Toggle */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Autoplay Next Lecture
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Automatically transition to the next chapter video upon completion.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateLocalSetting("autoPlay", !localSettings.autoPlay)}
                className={`w-12 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer ${
                  localSettings.autoPlay ? "bg-indigo-600" : "bg-slate-200 dark:bg-zinc-800"
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ x: localSettings.autoPlay ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Skip Completed Toggle */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Skip Completed Videos in Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Automatically jump over lectures marked 100% completed while playing playlist queue.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateLocalSetting("skipCompleted", !localSettings.skipCompleted)}
                className={`w-12 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer ${
                  localSettings.skipCompleted ? "bg-indigo-600" : "bg-slate-200 dark:bg-zinc-800"
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ x: localSettings.skipCompleted ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500" />
                Appearance & Styling
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Toggle theme mode and UI accent highlights.
              </p>
            </div>

            {/* Segmented Theme Controls */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4 hover:-translate-y-0.5 transition-all duration-300">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Theme Mode
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Choose between Light, Dark or automatic System scheme synchronization.
                </p>
              </div>

              <div className="p-1.5 bg-slate-100 dark:bg-zinc-950 rounded-2xl flex items-center gap-1 border border-slate-200/60 dark:border-zinc-800 max-w-md relative">
                {[
                  { id: "light", label: "Light", icon: <Sun className="w-4 h-4 text-amber-500" /> },
                  { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-purple-400" /> },
                  { id: "system", label: "System", icon: <Laptop className="w-4 h-4 text-blue-400" /> },
                ].map((t) => {
                  const isActive = localSettings.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateLocalSetting("theme", t.id as any)}
                      className={`flex-1 relative flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer z-10 ${
                        isActive
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="theme-pill"
                          className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200/50 dark:border-zinc-700/50"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {t.icon}
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Notification & Sound Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Configure subtle audio chimes and status banners.
              </p>
            </div>

            {/* Sound Chimes */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  Notification Sound Chimes
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Play a dual-tone audio chime when bookmarking, completing sessions, or timer triggers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer ${
                  soundEnabled ? "bg-amber-500" : "bg-slate-200 dark:bg-zinc-800"
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ x: soundEnabled ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                Gemini AI Engine Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Manage your Google GenAI API connection powering lecture summaries, tutor chat & mastery quizzes.
              </p>
            </div>

            {/* Connection Status & Quality Metrics */}
            <div className="bg-gradient-to-br from-violet-600/10 via-purple-600/10 to-indigo-600/10 border border-violet-500/20 dark:border-violet-500/30 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                      Gemini 2.5 Flash Model
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Direct client-to-API zero-latency connection
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    hasGeminiKeyInState
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${hasGeminiKeyInState ? "bg-emerald-500 animate-ping" : "bg-red-500"}`} />
                  {hasGeminiKeyInState ? "● Connected" : "● Disconnected"}
                </span>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Latency</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 mt-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> ~110 ms
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Model Alias</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 mt-1">
                    gemini-2.5-flash
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Last Used</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 mt-1">
                    Just now
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Quota Tier</div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    Free / BYOK
                  </div>
                </div>
              </div>
            </div>

            {/* API Key Box */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  API Key Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Your Google AI Studio key is saved securely in your browser's private local storage.
                </p>
              </div>

              {hasGeminiKeyInState ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type={showKey ? "text" : "password"}
                      readOnly
                      value={getGeminiKey() || ""}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-4 py-3 rounded-2xl font-mono text-slate-800 dark:text-zinc-200 outline-none select-all"
                    />

                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl text-slate-700 dark:text-zinc-300 transition cursor-pointer"
                      title={showKey ? "Hide Key" : "Show Key"}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const k = getGeminiKey();
                        if (k) {
                          navigator.clipboard.writeText(k);
                          toast.success("Copied Key", "API key copied to clipboard.");
                        }
                      }}
                      className="p-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl text-slate-700 dark:text-zinc-300 transition cursor-pointer"
                      title="Copy Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold ${
                        testResult.type === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {testResult.message}
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap pt-2">
                    <button
                      type="button"
                      disabled={isTestingKey}
                      onClick={handleTestKey}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl transition shadow-md shadow-violet-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingKey ? "Testing Connection..." : "Test Connection"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOnboardingOpen(true)}
                      className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs px-5 py-2.5 rounded-2xl transition cursor-pointer"
                    >
                      Replace Key
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toast.warning("Remove Gemini Key?", "This will disable AI features until re-connected.", {
                          duration: 8000,
                          action: {
                            label: "Remove Key",
                            primary: true,
                            onClick: () => {
                              removeGeminiKey();
                              setHasGeminiKeyInState(false);
                              setTestResult(null);
                              toast.success("Key Removed", "Gemini key cleared.");
                            },
                          },
                        });
                      }}
                      className="bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/30 font-bold text-xs px-5 py-2.5 rounded-2xl transition cursor-pointer"
                    >
                      Remove Key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Your Gemini API key is currently disconnected. Connect your free Google AI Studio key to unlock AI notes, chapter summaries & tutor chat.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOnboardingOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-violet-500/20 transition cursor-pointer"
                  >
                    Connect Free API Key
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case "storage":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" />
                Workspace Storage & Cache
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                macOS-style offline IndexedDB storage breakdown and cached items management.
              </p>
            </div>

            {/* macOS Style Storage Bar Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                    Local Storage Usage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {storageStats.totalMB} MB total persistent offline cache
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  IndexedDB Active
                </span>
              </div>

              {/* Progress Bar Visual */}
              <div className="h-4 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-1 p-1">
                <div
                  className="bg-blue-500 rounded-full h-full transition-all duration-500"
                  style={{ width: `${storageStats.playlistsPercent}%` }}
                  title="Playlists & Videos"
                />
                <div
                  className="bg-indigo-500 rounded-full h-full transition-all duration-500"
                  style={{ width: `${storageStats.bookmarksPercent}%` }}
                  title="Bookmarks"
                />
                <div
                  className="bg-emerald-500 rounded-full h-full transition-all duration-500"
                  style={{ width: `${storageStats.notesPercent}%` }}
                  title="Study Notes"
                />
                <div
                  className="bg-amber-500 rounded-full h-full transition-all duration-500"
                  style={{ width: `${storageStats.flashcardsPercent}%` }}
                  title="Flashcards"
                />
                <div
                  className="bg-purple-500 rounded-full h-full transition-all duration-500"
                  style={{ width: `${storageStats.aiPercent}%` }}
                  title="AI Cache"
                />
              </div>

              {/* Breakdown Legend */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Courses & Videos
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {storageStats.playlistsCount} modules ({storageStats.videosCount} lectures)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Study Notes
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {storageStats.notesCount} saved lecture notes
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Bookmarks
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {storageStats.bookmarksCount} timestamp bookmarks
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Flashcards
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {storageStats.flashcardsCount} review cards
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      AI Cache & Logs
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Summaries & transcripts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-500" />
                Backup & Data Recovery
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Export backup JSON files or import settings across devices.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Export or Import JSON Workspace Backup
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Since LearnStudy stores all study history locally in your browser, exporting periodic backups prevents data loss.
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Backup JSON
                </button>

                <label className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import Backup JSON
                  <input type="file" accept=".json" onChange={handleImportAll} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        );

      case "shortcuts":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-orange-500" />
                Keyboard Shortcuts Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                macOS & YouTube player hotkeys for high productivity.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Global Shortcuts Switch
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Enable or disable hotkeys system.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateLocalSetting("enableShortcuts", !localSettings.enableShortcuts)}
                  className={`w-12 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer ${
                    localSettings.enableShortcuts !== false ? "bg-orange-500" : "bg-slate-200 dark:bg-zinc-800"
                  }`}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full shadow-md"
                    animate={{ x: localSettings.enableShortcuts !== false ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Shortcuts Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Column 1: Playback */}
                <div className="space-y-3">
                  <div className="font-extrabold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] text-indigo-500 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> Playback Controls
                  </div>
                  <div className="space-y-2 bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                    {[
                      { keys: ["Space", "K"], action: "Play / Pause video" },
                      { keys: ["J"], action: "Rewind 10 seconds" },
                      { keys: ["L"], action: "Forward 10 seconds" },
                      { keys: ["←", "→"], action: "Rewind / Forward 5s" },
                      { keys: ["0 – 9"], action: "Jump to 0% - 90%" },
                      { keys: [","], action: "Previous Frame (paused)" },
                      { keys: ["."], action: "Next Frame (paused)" },
                      { keys: ["Shift + <"], action: "Decrease Playback Speed" },
                      { keys: ["Shift + >"], action: "Increase Playback Speed" },
                      { keys: ["M"], action: "Mute / Unmute" },
                      { keys: ["↑", "↓"], action: "Volume Up / Down 5%" },
                      { keys: ["F"], action: "Toggle Fullscreen" },
                      { keys: ["T"], action: "Toggle Theatre Mode" },
                      { keys: ["Shift + N"], action: "Next Lecture in playlist" },
                    ].map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-900 last:border-none">
                        <span className="text-slate-600 dark:text-zinc-400 font-medium">{s.action}</span>
                        <div className="flex gap-1">
                          {s.keys.map((k) => (
                            <kbd key={k} className="px-2 py-0.5 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-mono text-[10px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Productivity */}
                <div className="space-y-3">
                  <div className="font-extrabold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] text-emerald-500 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Productivity & Notes
                  </div>
                  <div className="space-y-2 bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                    {[
                      { keys: ["Ctrl", "S"], action: "Save Notes" },
                      { keys: ["Ctrl", "Enter"], action: "Save Note timestamp" },
                      { keys: ["B", "Ctrl + B"], action: "Add Bookmark" },
                      { keys: ["Ctrl", "N"], action: "Focus Notes Editor" },
                      { keys: ["Ctrl", "/"], action: "Focus Global Search" },
                      { keys: ["Ctrl", "H"], action: "Go to Watch History" },
                      { keys: ["Ctrl", "P"], action: "Go to Pomodoro Station" },
                      { keys: ["Ctrl", "Shift", "F"], action: "Toggle Focus Mode" },
                      { keys: ["Ctrl", "Shift", "T"], action: "Toggle Theme Mode" },
                      { keys: ["Alt", "S"], action: "Start Pomodoro Timer" },
                      { keys: ["Alt", "P"], action: "Pause Pomodoro Timer" },
                      { keys: ["Alt", "R"], action: "Reset Pomodoro Timer" },
                    ].map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-900 last:border-none">
                        <span className="text-slate-600 dark:text-zinc-400 font-medium">{s.action}</span>
                        <div className="flex gap-1">
                          {s.keys.map((k) => (
                            <kbd key={k} className="px-2 py-0.5 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-mono text-[10px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "developer":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Code className="w-5 h-5 text-pink-500" />
                Developer Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Creator details and engineering information.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/20">
                    GP
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                      Gagan Pratap
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Creator & Lead Architect of LearnStudy AI
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab("developer")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl transition shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                >
                  View Full Developer Card
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-500" />
                About LearnStudy
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Application details, version manifest and system information.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-zinc-50">
                    LearnStudy AI Desktop Suite
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Version 2.1.0 (Build 2026.07)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Stable Release
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                    Created By
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                    Gagan Pratap
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                    Engine
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                    React 19 + Gemini GenAI
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                    Database
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                    IndexedDB Local Cache
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                    License
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                    MIT Open Source
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "danger":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Danger Zone
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Irreversible database reset and cache clearing operations.
              </p>
            </div>

            <div className="bg-red-500/5 border border-red-500/30 rounded-3xl p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400">
                  Reset All Local Workspace Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Wipes all playlists, saved notes, flashcards, study logs, and bookmarks from local browser storage.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetData}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-red-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Cached Data Permanently
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Filter categories when user types in search bar
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [searchQuery, categories]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 md:p-8 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-blue-500" />
            Applet Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Configure display, video playback, AI keys, offline storage, and hotkeys.
          </p>
        </div>

        {/* Global Settings Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search Settings... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs pl-10 pr-8 py-2.5 rounded-2xl text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP TWO-COLUMN LAYOUT (md:grid) */}
      <div className="hidden md:grid grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Profile Header + Category List */}
        <div className="col-span-4 space-y-4 sticky top-20">
          {/* Profile Card Header */}
          <div className="bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 dark:border-blue-500/30 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
                {(localSettings.userName || "G").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-zinc-50 truncate">
                  {localSettings.userName || "Gagan Pratap"}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white tracking-wide">
                    Creator Plan
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Synced
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-500/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <span>{storageStats.totalMB} MB Cached</span>
              <span>Last Backup: Today</span>
            </div>
          </div>

          {/* Categories Navigation */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-2.5 shadow-xs space-y-1">
            {filteredCategories.map((cat) => {
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery("");
                  }}
                  className={`w-full relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "text-slate-900 dark:text-white font-extrabold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-cat-active"
                      className="absolute inset-0 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-2 rounded-xl ${cat.color}`}>{cat.icon}</div>
                    <div>
                      <div className="text-xs font-bold leading-none">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 line-clamp-1 font-normal">
                        {cat.description}
                      </div>
                    </div>
                  </div>

                  {cat.badge && (
                    <span
                      className={`relative z-10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        cat.badge === "Connected"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Category Panel */}
        <div className="col-span-8">
          {searchQuery ? (
            <div className="space-y-6">
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                Matching Categories for "{searchQuery}" ({filteredCategories.length})
              </div>
              {filteredCategories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  {renderCategoryContent(cat.id)}
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="transform-gpu will-change-transform"
              >
                {renderCategoryContent(activeCategory)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* MOBILE DRILL-DOWN UI (md:hidden) */}
      <div className="md:hidden space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {mobileCategory === null ? (
            /* Mobile Root Category List */
            <motion.div
              key="mobile-root"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-4 transform-gpu"
            >
              {/* Profile Card Header */}
              <div className="bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 dark:border-blue-500/30 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
                    {(localSettings.userName || "G").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-zinc-50 truncate">
                      {localSettings.userName || "Gagan Pratap"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white tracking-wide">
                        Creator Plan
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Category List Buttons */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-3 shadow-xs space-y-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMobileCategory(cat.id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${cat.color}`}>{cat.icon}</div>
                      <div>
                        <div className="text-xs font-bold">{cat.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                          {cat.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Mobile Sub-Category Screen with Back Button */
            <motion.div
              key={`mobile-category-${mobileCategory}`}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-4 transform-gpu"
            >
              <button
                onClick={() => setMobileCategory(null)}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2.5 rounded-2xl transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Settings
              </button>

              {renderCategoryContent(mobileCategory)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STICKY SAVE BAR */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-zinc-900 text-white border border-slate-700/80 dark:border-zinc-700 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 w-[90%] max-w-lg justify-between backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-slate-200">Unsaved Changes</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetLocal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/30 transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
