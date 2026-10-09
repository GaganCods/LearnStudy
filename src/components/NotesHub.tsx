import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Plus, Trash2, Edit3, Eye, Copy, Download, 
  Play, BookOpen, Clock, Calendar, Sparkles, Check, ChevronRight,
  ExternalLink, Layers, ArrowLeft
} from "lucide-react";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";
import { PlaylistInfo, SingleVideoInfo, CustomSubjectFolder } from "../types";

interface NoteEntry {
  videoId: string;
  markdown: string;
  title: string;
  channelName: string;
  thumbnail?: string;
  updatedAt?: string;
  wordCount: number;
}

interface NotesHubProps {
  onOpenLecture: (videoId: string, title?: string, channelName?: string) => void;
  onNavigateToLibrary?: () => void;
}

export const NotesHub: React.FC<NotesHubProps> = ({ 
  onOpenLecture,
  onNavigateToLibrary 
}) => {
  const { toast } = useToast();
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => Storage.getNotes());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // New Note Modal
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteVideoId, setNewNoteVideoId] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  // Sync when storage updates
  useEffect(() => {
    const handleUpdate = () => {
      setNotesMap(Storage.getNotes());
    };
    window.addEventListener("studytube_logs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("studytube_logs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Build indexed metadata lookup for video IDs from playlists, single videos, and custom subjects
  const allVideosMetadata: Record<string, { title: string; channelName: string; thumbnail?: string }> = {};
  
  const playlists: PlaylistInfo[] = Storage.getPlaylists();
  playlists.forEach(pl => {
    pl.videos?.forEach(v => {
      if (v.id) {
        allVideosMetadata[v.id] = {
          title: v.title || `Lecture ${v.lectureNumber || ""}`,
          channelName: v.channelName || pl.channelName || "Educational Lecture",
          thumbnail: v.thumbnail || pl.thumbnail
        };
      }
    });
  });

  const singleVideos: SingleVideoInfo[] = Storage.getSingleVideos();
  singleVideos.forEach(sv => {
    if (sv.id) {
      allVideosMetadata[sv.id] = {
        title: sv.title || "Lecture Video",
        channelName: sv.channelName || "Educational Creator",
        thumbnail: sv.thumbnail
      };
    }
  });

  const customSubjects: CustomSubjectFolder[] = Storage.getCustomSubjects();
  customSubjects.forEach(sub => {
    sub.chapters?.forEach(ch => {
      ch.lectures?.forEach(lec => {
        if (lec.youtubeVideoId) {
          allVideosMetadata[lec.youtubeVideoId] = {
            title: lec.title || "Lecture",
            channelName: sub.subjectName || "Course Library",
            thumbnail: `https://i.ytimg.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`
          };
        }
      });
    });
  });

  // Compile list of non-empty notes
  const notesList: NoteEntry[] = Object.entries(notesMap)
    .filter(([_, content]) => typeof content === "string" && Boolean(content.trim()))
    .map(([videoId, markdown]) => {
      const text = typeof markdown === "string" ? markdown : String(markdown || "");
      const meta = allVideosMetadata[videoId];
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      return {
        videoId,
        markdown: text,
        title: meta?.title || `Lecture Notes (${videoId})`,
        channelName: meta?.channelName || "Course Lecture",
        thumbnail: meta?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        wordCount
      };
    });

  // Filter notes by search query
  const filteredNotes = notesList.filter(note => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.channelName.toLowerCase().includes(q) ||
      note.markdown.toLowerCase().includes(q)
    );
  });

  // Select first note by default if none selected or if selected note was deleted
  useEffect(() => {
    if (filteredNotes.length > 0) {
      if (!selectedVideoId || !notesList.some(n => n.videoId === selectedVideoId)) {
        setSelectedVideoId(filteredNotes[0].videoId);
        setEditedText(filteredNotes[0].markdown);
      }
    } else {
      setSelectedVideoId(null);
      setEditedText("");
    }
  }, [notesList.length, searchQuery]);

  const activeNote = notesList.find(n => n.videoId === selectedVideoId);

  // When activeNote changes and not editing, sync editedText
  useEffect(() => {
    if (activeNote && !isEditing) {
      setEditedText(activeNote.markdown);
    }
  }, [selectedVideoId, activeNote?.markdown]);

  const handleSaveEdit = () => {
    if (!selectedVideoId) return;
    Storage.saveNoteForVideo(selectedVideoId, editedText);
    setNotesMap(prev => ({ ...prev, [selectedVideoId]: editedText }));
    setIsEditing(false);
    toast.success("Notes Saved", "Your lecture notes have been updated.");
  };

  const handleDeleteNote = (videoId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete notes for "${title}"?`)) {
      Storage.deleteNoteForVideo(videoId);
      setNotesMap(prev => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      if (selectedVideoId === videoId) {
        setSelectedVideoId(null);
        setIsEditing(false);
      }
      toast.info("Notes Deleted", "Lecture notes removed from local storage.");
    }
  };

  const handleCopyNote = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(editedText || activeNote.markdown);
      setIsCopied(true);
      toast.success("Copied to Clipboard", "Notes markdown copied.");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Copy Failed", "Could not access clipboard.");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([editedText || activeNote.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = activeNote.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `${safeTitle}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded", "Saved as Markdown file.");
  };

  const handleCreateNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedId = newNoteVideoId.trim();
    // Parse YouTube URL if full URL is entered
    if (cleanedId.includes("youtube.com") || cleanedId.includes("youtu.be")) {
      const match = cleanedId.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
      if (match) cleanedId = match[1];
    }

    if (!cleanedId) {
      toast.error("Invalid Video ID", "Please enter a valid YouTube Video ID or URL.");
      return;
    }

    const initialBody = newNoteContent.trim() || `# ${newNoteTitle.trim() || "Lecture Notes"}\n\n## Key Takeaways\n- Point 1\n- Point 2\n\n## Important Concepts\n- `;
    Storage.saveNoteForVideo(cleanedId, initialBody);
    setNotesMap(prev => ({ ...prev, [cleanedId]: initialBody }));
    setSelectedVideoId(cleanedId);
    setEditedText(initialBody);
    setShowNewNoteModal(false);
    setNewNoteVideoId("");
    setNewNoteTitle("");
    setNewNoteContent("");
    toast.success("Note Created", "New lecture note added to workspace.");
  };

  // Helper to render simple markdown formatting
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-2 text-slate-800 dark:text-zinc-200 text-sm leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return <h1 key={idx} className="text-xl font-black text-slate-900 dark:text-white pt-2 border-b border-slate-200 dark:border-zinc-800 pb-1">{line.replace("# ", "")}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={idx} className="text-base font-bold text-slate-900 dark:text-zinc-100 pt-3">{line.replace("## ", "")}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={idx} className="text-sm font-bold text-slate-800 dark:text-zinc-200 pt-2">{line.replace("### ", "")}</h3>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>{line.substring(2)}</span>
              </div>
            );
          }
          if (line.trim() === "---") {
            return <hr key={idx} className="border-slate-200 dark:border-zinc-800 my-4" />;
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  const totalWords = notesList.reduce((acc, n) => acc + n.wordCount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Personal Archive
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              {notesList.length} {notesList.length === 1 ? "lecture note" : "lecture notes"} saved
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Lecture Notes Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Organize, search, review, and export all your Markdown notes across your courses.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowNewNoteModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Lecture Note</span>
          </button>
          {onNavigateToLibrary && (
            <button
              onClick={onNavigateToLibrary}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Browse Courses</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{notesList.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Total Notes Created</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{totalWords.toLocaleString()}</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Total Words Written</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl col-span-2 sm:col-span-1 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">Markdown</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Export & Auto-Save</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {notesList.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs space-y-5 my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Lecture Notes Yet</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              When you watch lectures in the Study Player, any notes you write in the interactive editor or generate with the AI Notes Hub are saved here automatically.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowNewNoteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Note</span>
            </button>
            {onNavigateToLibrary && (
              <button
                onClick={onNavigateToLibrary}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Go to Courses</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Search & Notes List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes by lecture title or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs"
              />
            </div>

            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredNotes.map(note => {
                const isSelected = note.videoId === selectedVideoId;
                return (
                  <div
                    key={note.videoId}
                    onClick={() => {
                      setSelectedVideoId(note.videoId);
                      setIsEditing(false);
                      setEditedText(note.markdown);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/50 dark:border-blue-500/40 shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 relative">
                        {note.thumbnail ? (
                          <img 
                            src={note.thumbnail} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {note.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {note.wordCount} words
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {note.channelName}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 mt-1.5 font-mono text-[10px] bg-slate-50 dark:bg-zinc-850 p-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                          {note.markdown.replace(/^[#\-* ]+/gm, "").slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Note Reader & Live Editor */}
          <div className="lg:col-span-7">
            {activeNote ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                {/* Note Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {activeNote.channelName}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {activeNote.wordCount} words
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate mt-0.5">
                      {activeNote.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onOpenLecture(activeNote.videoId, activeNote.title, activeNote.channelName)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Open in Study Player with full video and AI tools"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Study Video</span>
                    </button>

                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isEditing
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span>{isEditing ? "Preview" : "Edit"}</span>
                    </button>

                    <button
                      onClick={handleCopyNote}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
                      title="Copy Markdown"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
                      title="Download .md file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteNote(activeNote.videoId, activeNote.title)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition border border-red-200 dark:border-red-900/50 cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Content View / Editor */}
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={18}
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm font-mono text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y leading-relaxed"
                      placeholder="Write your study notes in Markdown..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Supports Markdown headings (`#`), bullet points (`-`), and timestamps.
                      </span>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-850 min-h-[380px] max-h-[640px] overflow-y-auto">
                    {renderFormattedMarkdown(editedText || activeNote.markdown)}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-slate-400">
                Select a note on the left to read or edit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Note Modal */}
      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Lecture Note</h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  YouTube Video Link or ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. g2o22C3CRfU or https://www.youtube.com/watch?v=..."
                  value={newNoteVideoId}
                  onChange={(e) => setNewNoteVideoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Lecture Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Chapter 1: Kinematics"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Initial Notes Content (Optional Markdown)
                </label>
                <textarea
                  rows={4}
                  placeholder="## Summary\n- Key equation..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
