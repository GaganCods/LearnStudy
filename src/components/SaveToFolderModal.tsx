import React, { useState, useEffect } from "react";
import { 
  Bookmark, Folder, FolderPlus, Clock, Check, Plus, X, Search, 
  Tag, Sparkles, Layers, BookOpen, ChevronDown, ChevronUp, CheckCircle2 
} from "lucide-react";
import { Storage } from "../utils/storage";
import { CustomSubjectFolder, PlaylistInfo } from "../types";
import { useToast } from "./ToastContext";

export interface SaveTargetItem {
  type: "video" | "playlist";
  id: string;
  title: string;
  channelName: string;
  duration?: string;
  thumbnail?: string;
  playlist?: PlaylistInfo;
}

interface SaveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SaveTargetItem | null;
  onSaved?: (folderName: string) => void;
}

const COLOR_OPTIONS = [
  { id: "blue", bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", light: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" },
  { id: "purple", bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", light: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400" },
  { id: "emerald", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" },
  { id: "amber", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500", light: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" },
  { id: "rose", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500", light: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400" },
  { id: "indigo", bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500", light: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" },
  { id: "cyan", bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500", light: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400" },
];

export const SaveToFolderModal: React.FC<SaveToFolderModalProps> = ({
  isOpen,
  onClose,
  target,
  onSaved
}) => {
  const { toast } = useToast();

  const [folders, setFolders] = useState<CustomSubjectFolder[]>([]);
  const [savedFolderIds, setSavedFolderIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Create new folder form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  // Sync folders and saved state when modal opens or target changes
  const reloadFolders = () => {
    if (!target) return;
    Storage.getOrCreateWatchLaterSubject();
    const stored = Storage.getCustomSubjects() || [];
    setFolders(stored);

    const savedIds = Storage.getSubjectFoldersForItem(target.type, target.id);
    setSavedFolderIds(savedIds);
  };

  useEffect(() => {
    if (isOpen && target) {
      reloadFolders();
      setIsCreatingNew(false);
      setNewFolderName("");
      setNewCategoryName("");
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const watchLaterFolder = folders.find(
    f => f.id === "subject-watch-later" || f.subjectName.toLowerCase() === "watch later"
  );
  const isWatchLaterSaved = watchLaterFolder ? savedFolderIds.includes(watchLaterFolder.id) : false;

  // Categories list
  const existingCategories = Array.from(
    new Set(folders.map(f => f.category).filter(Boolean))
  );

  // Toggle saving to a folder
  const handleToggleFolder = (folder: CustomSubjectFolder) => {
    const isCurrentlySaved = savedFolderIds.includes(folder.id);

    if (isCurrentlySaved) {
      Storage.removeItemFromSubjectFolder({
        subjectId: folder.id,
        itemType: target.type,
        itemId: target.id
      });
      setSavedFolderIds(prev => prev.filter(id => id !== folder.id));
      toast.info("Removed from Folder", `Removed from "${folder.subjectName}".`);
    } else {
      Storage.saveItemToSubjectFolder({
        subjectId: folder.id,
        itemType: target.type,
        id: target.id,
        title: target.title,
        channelName: target.channelName,
        duration: target.duration,
        thumbnail: target.thumbnail,
        playlist: target.playlist
      });
      setSavedFolderIds(prev => [...prev, folder.id]);
      toast.success("Saved to Folder", `Saved to "${folder.subjectName}" (${folder.category}).`);
      if (onSaved) onSaved(folder.subjectName);
    }
  };

  // Create & Save
  const handleCreateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const finalCategory = newCategoryName.trim() || "General";
    const newSubject = Storage.createSubjectFolder({
      name: newFolderName.trim(),
      category: finalCategory,
      color: selectedColor,
      description: `Custom folder for ${newFolderName.trim()} (${finalCategory})`
    });

    // Save the item to this newly created folder immediately
    Storage.saveItemToSubjectFolder({
      subjectId: newSubject.id,
      itemType: target.type,
      id: target.id,
      title: target.title,
      channelName: target.channelName,
      duration: target.duration,
      thumbnail: target.thumbnail,
      playlist: target.playlist
    });

    reloadFolders();
    setIsCreatingNew(false);
    setNewFolderName("");
    setNewCategoryName("");
    toast.success("Folder Created & Saved", `Created "${newSubject.subjectName}" and saved item!`);
    if (onSaved) onSaved(newSubject.subjectName);
  };

  // Filtered folders
  const filteredFolders = folders.filter(f => {
    const matchesSearch = f.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getColorConfig = (colorName: string) => {
    return COLOR_OPTIONS.find(c => c.id === colorName) || COLOR_OPTIONS[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-zinc-50 leading-tight">
                Save to Folder
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Organize this {target.type === "playlist" ? "playlist" : "lecture"} into your custom library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Item Preview Card */}
        <div className="px-5 py-3.5 bg-slate-100/60 dark:bg-zinc-950/60 border-b border-slate-200/60 dark:border-zinc-850 flex items-center gap-3">
          <div className="relative w-16 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-zinc-800 shadow-sm border border-slate-200/50 dark:border-zinc-700/50">
            <img 
              src={target.thumbnail || `https://i.ytimg.com/vi/${target.id}/hqdefault.jpg`} 
              alt="" 
              className="w-full h-full object-cover" 
            />
            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider text-white bg-black/80">
              {target.type === "playlist" ? "Playlist" : (target.duration || "Video")}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {target.type === "playlist" ? "📚 YouTube Playlist" : "🎥 Single Lecture"}
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate mt-0.5" title={target.title}>
              {target.title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              {target.channelName}
            </p>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
          
          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your folders or categories..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category Filter Chips */}
            {existingCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                    selectedCategory === "All"
                      ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  All
                </button>
                {existingCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Folders List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-zinc-400">
              <span>Your Library Folders ({folders.length})</span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                {savedFolderIds.length} folder{savedFolderIds.length === 1 ? "" : "s"} selected
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {filteredFolders.map((folder) => {
                const isSaved = savedFolderIds.includes(folder.id);
                const color = getColorConfig(folder.color);
                const itemCount = folder.chapters.reduce(
                  (acc, ch) => acc + (ch.lectures?.length || 0), 0
                );

                return (
                  <div
                    key={folder.id}
                    onClick={() => handleToggleFolder(folder)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSaved
                        ? "bg-blue-50/70 border-blue-400/80 dark:bg-blue-950/20 dark:border-blue-500/50 shadow-sm"
                        : "bg-white dark:bg-zinc-850/60 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${color.light}`}>
                        <Folder className="w-4 h-4 fill-current" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {folder.subjectName}
                          </h5>
                          {folder.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                              {folder.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          {folder.chapters.length} chapter{folder.chapters.length === 1 ? "" : "s"} • {itemCount} lecture{itemCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border transition ${
                      isSaved
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "border-slate-300 dark:border-zinc-700 group-hover:border-blue-400"
                    }`}>
                      {isSaved && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {filteredFolders.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                  <Folder className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                    No matching folders found
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Create a new folder below to organize this lecture.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Create New Folder Section */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700/80 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-zinc-850/30 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2 transition"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Create New Folder & Category</span>
              </button>
            ) : (
              <form onSubmit={handleCreateAndSave} className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-blue-500" />
                    New Folder & Category
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Folder Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Machine Learning, Calculus, Exam Prep"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Category Selection / Custom Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategoryMode(!isCustomCategoryMode)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      {isCustomCategoryMode ? "Pick from existing" : "+ Type new category"}
                    </button>
                  </div>

                  {!isCustomCategoryMode ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {["Computer Science", "Engineering", "Mathematics", "Science", "Exam Prep", "Personal", "Research"].map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setNewCategoryName(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              newCategoryName === cat
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Selected category"
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Type custom category (e.g. Neuroscience, Web3, GRE)"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Color Picker */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                    Folder Color
                  </label>
                  <div className="flex items-center gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedColor(c.id)}
                        className={`w-6 h-6 rounded-full ${c.bg} transition transform flex items-center justify-center ${
                          selectedColor === c.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-zinc-100 scale-110" : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {selectedColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create & Save</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {savedFolderIds.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Saved in {savedFolderIds.length} folder{savedFolderIds.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span>Select folders above</span>
            )}
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-black transition cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
