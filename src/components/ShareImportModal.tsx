import React, { useState, useEffect } from "react";
import { 
  X, Share2, Copy, Check, Link2, Folder, BookOpen, 
  Layers, Plus, Video, Sparkles, CheckCircle2, ArrowRight,
  ExternalLink, Download, FileText, AlertCircle, Globe
} from "lucide-react";
import { CustomSubjectFolder, CourseChapter, ChapterLecture } from "../types";
import { 
  getFolderShareLink, 
  getChapterShareLink, 
  parseShareInput, 
  ParsedShareResult,
  generateChapterId,
  generateLectureId
} from "../utils/shareUtils";
import { parseYoutubeUrl } from "../utils/youtubeParser";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";

// =========================================================================
// 1. SHARE MODAL: Displays Copyable Direct Share Link
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

  if (!isOpen) return null;

  const title = type === "folder" ? folder?.subjectName || "Subject Folder" : chapter?.title || "Chapter";
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
      toast.success("Link Copied!", "Shareable link copied to clipboard. Anyone can use this link to access the course.");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the link from the text box.");
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
                Anyone with this link can view and import it into their library.
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
        <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {type === "folder" ? (folder?.category || "Subject") : "Chapter"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  {type === "folder" ? `${totalChapters} chapters • ${totalLectures} lectures` : `${totalLectures} lectures`}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                {title}
              </h4>
            </div>
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
              Works across all browsers
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
// 2. IMPORT MODAL: Universal link support with folder destination options
// =========================================================================
interface ImportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: CustomSubjectFolder[];
  preselectedFolderId?: string | null;
  onImportFolder: (folder: CustomSubjectFolder) => void;
  onImportChapter: (chapter: CourseChapter, targetSubjectId?: string, newSubjectName?: string) => void;
  initialInput?: string;
}

type LinkType = "shared_folder" | "shared_chapter" | "youtube_playlist" | "youtube_video" | "study_link";

export const ImportShareModal: React.FC<ImportShareModalProps> = ({
  isOpen,
  onClose,
  subjects,
  preselectedFolderId = null,
  onImportFolder,
  onImportChapter,
  initialInput = ""
}) => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(initialInput);
  const [linkType, setLinkType] = useState<LinkType | null>(null);
  const [parsedSharedResult, setParsedSharedResult] = useState<ParsedShareResult | null>(null);
  const [youtubePreview, setYoutubePreview] = useState<{
    type: "video" | "playlist";
    id: string;
    title: string;
    channelName: string;
    thumbnail?: string;
  } | null>(null);
  const [studyLinkPreview, setStudyLinkPreview] = useState<{
    url: string;
    domain: string;
    title: string;
  } | null>(null);

  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Destination folder settings
  const [targetFolderMode, setTargetFolderMode] = useState<"EXISTING" | "NEW" | "WATCH_LATER">("EXISTING");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderCategory, setNewFolderCategory] = useState("General");

  // Populate input on mount or initialInput change
  useEffect(() => {
    if (initialInput) {
      setInputValue(initialInput);
      handleParse(initialInput);
    }
  }, [initialInput]);

  // Set default selected folder
  useEffect(() => {
    if (preselectedFolderId && subjects.some(s => s.id === preselectedFolderId)) {
      setSelectedFolderId(preselectedFolderId);
      setTargetFolderMode("EXISTING");
    } else if (subjects.length > 0 && !selectedFolderId) {
      setSelectedFolderId(subjects[0].id);
      setTargetFolderMode("EXISTING");
    } else if (subjects.length === 0) {
      setTargetFolderMode("NEW");
    }
  }, [subjects, preselectedFolderId]);

  const handleParse = async (text: string) => {
    const raw = text.trim();
    if (!raw) {
      setLinkType(null);
      setParsedSharedResult(null);
      setYoutubePreview(null);
      setStudyLinkPreview(null);
      setParseError(null);
      return;
    }

    setParseError(null);

    // 1. Check for LearnStudy share link
    const shareRes = parseShareInput(raw, subjects);
    if (shareRes) {
      setParsedSharedResult(shareRes);
      setYoutubePreview(null);
      setStudyLinkPreview(null);
      if (shareRes.type === "folder") {
        setLinkType("shared_folder");
      } else {
        setLinkType("shared_chapter");
      }
      return;
    }

    // 2. Check for YouTube link
    const ytParsed = parseYoutubeUrl(raw);
    if (ytParsed) {
      setParsedSharedResult(null);
      setStudyLinkPreview(null);
      if (ytParsed.type === "playlist") {
        setLinkType("youtube_playlist");
        setYoutubePreview({
          type: "playlist",
          id: ytParsed.id,
          title: "YouTube Study Playlist",
          channelName: "YouTube",
          thumbnail: `https://i.ytimg.com/vi/${ytParsed.videoId || ""}/hqdefault.jpg`
        });
      } else {
        setLinkType("youtube_video");
        setYoutubePreview({
          type: "video",
          id: ytParsed.id,
          title: "YouTube Lecture Video",
          channelName: "YouTube",
          thumbnail: `https://i.ytimg.com/vi/${ytParsed.id}/hqdefault.jpg`
        });
      }
      return;
    }

    // 3. Check for general study / web link (HTTP / HTTPS)
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const parsedUrl = new URL(raw);
        setParsedSharedResult(null);
        setYoutubePreview(null);
        setLinkType("study_link");
        const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        const cleanTitle = lastSegment
          ? decodeURIComponent(lastSegment).replace(/[-_]/g, " ").replace(/\.(html|pdf)$/i, "")
          : `Study Resource (${parsedUrl.hostname})`;

        setStudyLinkPreview({
          url: raw,
          domain: parsedUrl.hostname,
          title: cleanTitle.length > 2 ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : `Study Link from ${parsedUrl.hostname}`
        });
        return;
      } catch (e) {
        // invalid URL
      }
    }

    setLinkType(null);
    setParsedSharedResult(null);
    setYoutubePreview(null);
    setStudyLinkPreview(null);
    setParseError("Could not recognize this link. Please enter a valid course share link, YouTube link, or study URL.");
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    handleParse(val);
  };

  // Check if the parsed shared folder is already in library to prevent duplication
  const existingFolderMatch = parsedSharedResult?.folder 
    ? subjects.find(s => 
        s.id === parsedSharedResult.sourceId ||
        s.id === parsedSharedResult.folder?.id ||
        (s.subjectName && parsedSharedResult.folder?.subjectName && s.subjectName.toLowerCase().trim() === parsedSharedResult.folder.subjectName.toLowerCase().trim())
      )
    : null;

  const handleConfirmImport = async () => {
    if (!linkType) return;
    setIsLoading(true);

    try {
      // SCENARIO 1: Shared Folder
      if (linkType === "shared_folder" && parsedSharedResult?.folder) {
        if (existingFolderMatch) {
          // Already in library! Don't duplicate, open it
          onImportFolder(existingFolderMatch);
          toast.info("Folder Already in Library", `Opened "${existingFolderMatch.subjectName}".`);
          onClose();
          return;
        }

        onImportFolder(parsedSharedResult.folder);
        toast.success("Folder Added!", `"${parsedSharedResult.folder.subjectName}" added to your library.`);
        onClose();
        return;
      }

      // Resolve destination folder ID
      let destSubjectId = selectedFolderId;

      if (targetFolderMode === "WATCH_LATER") {
        const wl = Storage.getOrCreateWatchLaterSubject();
        destSubjectId = wl.id;
      } else if (targetFolderMode === "NEW") {
        const folderName = newFolderTitle.trim() || (linkType === "shared_chapter" && parsedSharedResult?.chapter ? parsedSharedResult.chapter.title : "General Studies");
        const newSubj = Storage.createSubjectFolder({
          name: folderName,
          category: newFolderCategory.trim() || "General Studies",
          color: "blue",
          description: `Custom folder for ${folderName}`
        });
        destSubjectId = newSubj.id;
      }

      if (!destSubjectId && subjects.length > 0) {
        destSubjectId = subjects[0].id;
      }

      // SCENARIO 2: Shared Chapter
      if (linkType === "shared_chapter" && parsedSharedResult?.chapter) {
        onImportChapter(parsedSharedResult.chapter, destSubjectId);
        const allSubjects = Storage.getCustomSubjects();
        const targetSubj = allSubjects.find(s => s.id === destSubjectId) || subjects.find(s => s.id === destSubjectId);
        toast.success("Chapter Added!", `Added "${parsedSharedResult.chapter.title}" to ${targetSubj?.subjectName || "Folder"}.`);
        onClose();
        return;
      }

      // SCENARIO 3: YouTube Playlist
      if (linkType === "youtube_playlist" && youtubePreview) {
        // Fetch playlist items or fallback
        let videos = [];
        let plTitle = youtubePreview.title;
        let plChannel = youtubePreview.channelName;
        try {
          const res = await fetch(`/api/playlist?id=${encodeURIComponent(youtubePreview.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.videos?.length) {
              videos = data.videos;
              plTitle = data.title || plTitle;
              plChannel = data.channelName || plChannel;
            }
          }
        } catch (e) {}

        const lectures: ChapterLecture[] = (videos.length > 0 ? videos : [{ id: youtubePreview.id, title: plTitle, duration: "10:00" }]).map((v: any, idx: number) => ({
          id: generateLectureId(),
          title: v.title || `Lecture ${idx + 1}`,
          youtubeVideoId: v.id,
          videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
          duration: v.duration || "15:00",
          completed: false,
          progress: 0,
          lectureNumber: idx + 1
        }));

        const newChapter: CourseChapter = {
          id: generateChapterId(),
          chapterNumber: 1,
          title: plTitle,
          description: `Imported playlist from ${plChannel}`,
          lectures
        };

        onImportChapter(newChapter, destSubjectId);
        const targetSubj = subjects.find(s => s.id === destSubjectId);
        toast.success("Playlist Imported!", `Added "${plTitle}" with ${lectures.length} lectures to ${targetSubj?.subjectName || "Folder"}.`);
        onClose();
        return;
      }

      // SCENARIO 4: YouTube Single Video
      if (linkType === "youtube_video" && youtubePreview) {
        let vidTitle = youtubePreview.title;
        let vidDuration = "10:00";
        try {
          const res = await fetch(`/api/video-metadata?id=${encodeURIComponent(youtubePreview.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.title) vidTitle = data.title;
            if (data?.duration) vidDuration = data.duration;
          }
        } catch (e) {}

        Storage.saveItemToSubjectFolder({
          subjectId: destSubjectId,
          itemType: "video",
          id: youtubePreview.id,
          title: vidTitle,
          channelName: youtubePreview.channelName,
          duration: vidDuration,
          thumbnail: youtubePreview.thumbnail
        });

        const targetSubj = subjects.find(s => s.id === destSubjectId);
        toast.success("Lecture Added!", `Added "${vidTitle}" to ${targetSubj?.subjectName || "Folder"}.`);
        onClose();
        return;
      }

      // SCENARIO 5: General Educational Web / Study Link
      if (linkType === "study_link" && studyLinkPreview) {
        const newLec: ChapterLecture = {
          id: generateLectureId(),
          title: studyLinkPreview.title,
          videoUrl: studyLinkPreview.url,
          duration: "Read",
          completed: false,
          progress: 0
        };

        const targetSubj = subjects.find(s => s.id === destSubjectId);
        if (targetSubj) {
          let chapter = targetSubj.chapters[0];
          if (!chapter) {
            chapter = {
              id: generateChapterId(),
              chapterNumber: 1,
              title: "Chapter 1: Study Materials",
              description: "Imported reading materials and references",
              lectures: []
            };
            targetSubj.chapters.push(chapter);
          }
          chapter.lectures.push(newLec);
          Storage.saveCustomSubject(targetSubj);
          toast.success("Study Link Saved!", `Added "${studyLinkPreview.title}" to ${targetSubj.subjectName}.`);
        }
        onClose();
        return;
      }

    } catch (err: any) {
      toast.error("Import Error", err?.message || "Failed to import item.");
    } finally {
      setIsLoading(false);
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
                Import by Link
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Paste any shared course link, YouTube playlist/video, or study resource.
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
              Paste Link
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. https://... (Course link, YouTube playlist/video, or study article)"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
              <p className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{parseError}</span>
              </p>
            )}
          </div>

          {/* Validated Live Preview Card */}
          {linkType && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between gap-2 border-b border-blue-200/50 dark:border-blue-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    {linkType === "shared_folder" && "Course Folder Link Detected"}
                    {linkType === "shared_chapter" && "Chapter Link Detected"}
                    {linkType === "youtube_playlist" && "YouTube Playlist Detected"}
                    {linkType === "youtube_video" && "YouTube Lecture Detected"}
                    {linkType === "study_link" && "Educational Study Resource Detected"}
                  </span>
                </div>
              </div>

              {/* Shared Folder Preview */}
              {linkType === "shared_folder" && parsedSharedResult?.folder && (
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                      {parsedSharedResult.folder.subjectName}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                      <span>📁 {(parsedSharedResult.folder.chapters || []).length} Chapters</span>
                      <span>•</span>
                      <span>
                        🎬 {(parsedSharedResult.folder.chapters || []).reduce((acc, c) => acc + (c.lectures || []).length, 0)} Lectures
                      </span>
                    </div>
                  </div>

                  {existingFolderMatch && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>This folder already exists in your library. Clicking below will open it without duplicating.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Shared Chapter Preview */}
              {linkType === "shared_chapter" && parsedSharedResult?.chapter && (
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                    {parsedSharedResult.chapter.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                    🎬 {(parsedSharedResult.chapter.lectures || []).length} Lectures
                  </p>
                </div>
              )}

              {/* YouTube Preview */}
              {(linkType === "youtube_playlist" || linkType === "youtube_video") && youtubePreview && (
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                    {youtubePreview.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                    YouTube {youtubePreview.type === "playlist" ? "Playlist" : "Video"}
                  </p>
                </div>
              )}

              {/* Study Link Preview */}
              {linkType === "study_link" && studyLinkPreview && (
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{studyLinkPreview.title}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium truncate">
                    {studyLinkPreview.url}
                  </p>
                </div>
              )}

              {/* FOLDER DESTINATION SELECTOR: For non-folder items */}
              {linkType !== "shared_folder" && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-900/40 space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 block">
                    In which folder do you want to save it?
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetFolderMode("EXISTING")}
                      disabled={subjects.length === 0}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        targetFolderMode === "EXISTING"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      Choose Folder
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetFolderMode("WATCH_LATER")}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        targetFolderMode === "WATCH_LATER"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      Watch Later
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetFolderMode("NEW")}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        targetFolderMode === "NEW"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      + New Folder
                    </button>
                  </div>

                  {targetFolderMode === "EXISTING" && (
                    <div className="mt-2">
                      <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            📁 {s.subjectName} ({s.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetFolderMode === "NEW" && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Folder Name (e.g. Physics, Web Development)"
                        value={newFolderTitle}
                        onChange={(e) => setNewFolderTitle(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        placeholder="Category (e.g. Computer Science)"
                        value={newFolderCategory}
                        onChange={(e) => setNewFolderCategory(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-200"
                      />
                    </div>
                  )}
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
            disabled={!linkType || isLoading}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
              linkType && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                : "bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {isLoading 
                ? "Importing..." 
                : linkType === "shared_folder" && existingFolderMatch
                ? "Open Existing Folder"
                : linkType === "shared_folder"
                ? "Add Folder to Library"
                : "Save to Folder"}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
