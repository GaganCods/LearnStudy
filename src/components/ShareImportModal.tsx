import React, { useState, useEffect } from "react";
import { 
  X, Share2, Copy, Check, Link2, Folder, BookOpen, 
  Layers, Plus, Video, Sparkles, CheckCircle2, ArrowRight,
  ExternalLink, Download, FileText
} from "lucide-react";
import { CustomSubjectFolder, CourseChapter } from "../types";
import { 
  getFolderShareLink, 
  getChapterShareLink, 
  parseShareInput, 
  ParsedShareResult 
} from "../utils/shareUtils";
import { useToast } from "./ToastContext";

// =========================================================================
// 1. SHARE MODAL: Displays Unique ID & Copyable Share Link
// =========================================================================
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "folder" | "chapter";
  folder?: CustomSubjectFolder | null;
  chapter?: CourseChapter | null;
  subjectName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  type,
  folder,
  chapter,
  subjectName
}) => {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const title = type === "folder" ? folder?.subjectName || "Subject Folder" : chapter?.title || "Chapter";
  const uniqueId = type === "folder" ? folder?.id || "" : chapter?.id || "";
  const shareLink = type === "folder" 
    ? (folder ? getFolderShareLink(folder) : "") 
    : (chapter ? getChapterShareLink(chapter, subjectName) : "");

  const totalLectures = type === "folder"
    ? (folder?.chapters || []).reduce((acc, ch) => acc + (ch.lectures || []).length, 0)
    : (chapter?.lectures || []).length;

  const totalChapters = type === "folder" ? (folder?.chapters || []).length : 1;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      toast.success("Link Copied!", "Shareable link copied to clipboard. Other students can import it directly.");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the link from the text box.");
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(uniqueId);
      setCopiedId(true);
      toast.success("Unique ID Copied!", `ID: "${uniqueId}" copied to clipboard.`);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the ID.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Study Course: ${title}`,
          text: `Check out this course on LearnStudy: "${title}" (${totalLectures} lectures)`,
          url: shareLink
        });
        toast.success("Shared Successfully", "Course shared via device share dialog.");
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                Share {type === "folder" ? "Course Folder" : "Chapter"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Anyone with this link or ID can import and add it to their library.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Card Preview */}
        <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {type === "folder" ? (folder?.category || "Subject") : "Chapter"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                  {type === "folder" ? `${totalChapters} chapters • ${totalLectures} lectures` : `${totalLectures} lectures`}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                {title}
              </h4>
            </div>
          </div>

          {/* Unique ID Badge & Copy */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Unique ID:
              </span>
              <code className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate select-all">
                {uniqueId}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                copiedId 
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
              }`}
              title="Copy Unique ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedId ? "Copied" : "Copy ID"}</span>
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Shareable Direct Link</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Works across all devices
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-600 dark:text-zinc-400 select-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs ${
                copiedLink
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
          {typeof navigator !== "undefined" && typeof (navigator as any).share === "function" && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via App...</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};


// =========================================================================
// 2. IMPORT MODAL: Input link/ID and preview + add to user library
// =========================================================================
interface ImportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: CustomSubjectFolder[];
  onImportFolder: (folder: CustomSubjectFolder) => void;
  onImportChapter: (chapter: CourseChapter, targetSubjectId?: string, newSubjectName?: string) => void;
  initialInput?: string;
}

export const ImportShareModal: React.FC<ImportShareModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onImportFolder,
  onImportChapter,
  initialInput = ""
}) => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(initialInput);
  const [parsedResult, setParsedResult] = useState<ParsedShareResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Chapter destination configuration
  const [targetSubjectMode, setTargetSubjectMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [newSubjectTitle, setNewSubjectTitle] = useState("");
  const [customFolderCategory, setCustomFolderCategory] = useState("");

  // Populate input if opened via deep link query
  useEffect(() => {
    if (initialInput) {
      setInputValue(initialInput);
      handleParse(initialInput);
    }
  }, [initialInput]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
    if (subjects.length === 0) {
      setTargetSubjectMode("NEW");
    }
  }, [subjects]);

  const handleParse = (text: string) => {
    if (!text.trim()) {
      setParsedResult(null);
      setParseError(null);
      return;
    }

    const result = parseShareInput(text, subjects);
    if (result) {
      setParsedResult(result);
      setParseError(null);
      if (result.type === "folder" && result.folder) {
        setCustomFolderCategory(result.folder.category || "Imported Courses");
      } else if (result.type === "chapter" && result.chapter) {
        setNewSubjectTitle(result.subjectName || "Imported Course");
      }
    } else {
      setParsedResult(null);
      setParseError("Could not recognize this link or ID. Please check and try again.");
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    handleParse(val);
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;

    if (parsedResult.type === "folder" && parsedResult.folder) {
      const folderToAdd: CustomSubjectFolder = {
        ...parsedResult.folder,
        category: customFolderCategory.trim() || parsedResult.folder.category || "Imported Courses"
      };
      onImportFolder(folderToAdd);
      toast.success("Course Folder Imported!", `Added "${folderToAdd.subjectName}" with ${(folderToAdd.chapters || []).length} chapters to your Library.`);
      onClose();
    } else if (parsedResult.type === "chapter" && parsedResult.chapter) {
      if (targetSubjectMode === "EXISTING" && selectedSubjectId) {
        onImportChapter(parsedResult.chapter, selectedSubjectId);
        const targetSubj = subjects.find(s => s.id === selectedSubjectId);
        toast.success("Chapter Added!", `Added "${parsedResult.chapter.title}" to ${targetSubj?.subjectName || "Subject"}.`);
        onClose();
      } else {
        const titleForNew = newSubjectTitle.trim() || parsedResult.subjectName || "New Subject";
        onImportChapter(parsedResult.chapter, undefined, titleForNew);
        toast.success("Subject & Chapter Created!", `Created "${titleForNew}" with chapter "${parsedResult.chapter.title}".`);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                Import Shared Folder or Chapter
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Paste a share link or enter a unique ID to add it to your library.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Input Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Paste Share Link or Unique ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. https://.../app/lectures?shareFolder=... or folder_xxx or chap_xxx"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => handleInputChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {parseError && (
              <p className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 mt-1">
                {parseError}
              </p>
            )}
          </div>

          {/* Validated Live Preview Card */}
          {parsedResult && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-blue-200/50 dark:border-blue-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Ready to Import: {parsedResult.type === "folder" ? "Course Folder" : "Chapter"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                  ID: {parsedResult.sourceId}
                </span>
              </div>

              {/* Folder Details */}
              {parsedResult.type === "folder" && parsedResult.folder && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                      {parsedResult.folder.subjectName}
                    </h4>
                    {parsedResult.folder.description && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {parsedResult.folder.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-medium">
                      <span>📁 {(parsedResult.folder.chapters || []).length} Chapters</span>
                      <span>•</span>
                      <span>
                        🎬 {(parsedResult.folder.chapters || []).reduce((acc, c) => acc + (c.lectures || []).length, 0)} Lectures
                      </span>
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      Import into Category:
                    </label>
                    <input
                      type="text"
                      value={customFolderCategory}
                      onChange={(e) => setCustomFolderCategory(e.target.value)}
                      placeholder="Category name (e.g. Computer Science, Physics)"
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Chapters Preview List */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Chapters:
                    </div>
                    {(parsedResult.folder.chapters || []).map((ch, idx) => (
                      <div 
                        key={ch.id || idx}
                        className="bg-white dark:bg-zinc-900/90 border border-slate-200/70 dark:border-zinc-800 rounded-xl p-2 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate flex-1">
                          {ch.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono ml-2">
                          {(ch.lectures || []).length} vids
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter Details */}
              {parsedResult.type === "chapter" && parsedResult.chapter && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                      {parsedResult.chapter.title}
                    </h4>
                    {parsedResult.chapter.description && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {parsedResult.chapter.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-medium">
                      <span>🎬 {(parsedResult.chapter.lectures || []).length} Lectures in this chapter</span>
                    </div>
                  </div>

                  {/* Choose destination for this chapter */}
                  <div className="space-y-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">
                      Where would you like to add this chapter?
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetSubjectMode("EXISTING")}
                        disabled={subjects.length === 0}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSubjectMode === "EXISTING"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        Existing Subject
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetSubjectMode("NEW")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          targetSubjectMode === "NEW"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        + New Subject
                      </button>
                    </div>

                    {targetSubjectMode === "EXISTING" && subjects.length > 0 ? (
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-slate-800 dark:text-zinc-200"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            📁 {s.subjectName} ({(s.chapters || []).length} chapters)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newSubjectTitle}
                        onChange={(e) => setNewSubjectTitle(e.target.value)}
                        placeholder="Subject name (e.g. Physics, Calculus)"
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-slate-800 dark:text-zinc-200"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parsedResult}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
              parsedResult
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                : "bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {parsedResult?.type === "folder" 
                ? "Add Folder to Library" 
                : "Add Chapter to Library"}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
