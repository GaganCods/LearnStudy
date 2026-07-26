import React, { useState, useEffect, useRef } from "react";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";
import { 
  FileText, Save, CheckCircle, Bold, Italic, Heading1, 
  List, Code, CheckSquare, Download, Clipboard, Sparkles,
  ChevronDown, ChevronRight, Trash2
} from "lucide-react";

interface InteractiveNotesProps {
  videoId: string;
  videoTitle: string;
}

export function InteractiveNotes({ videoId, videoTitle }: InteractiveNotesProps) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load notes when video changes
  useEffect(() => {
    const loadedNote = Storage.getNoteForVideo(videoId);
    setNoteText(loadedNote);
    setSaveStatus("idle");
  }, [videoId]);

  // Auto-save logic
  useEffect(() => {
    if (saveStatus === "idle") return; // Avoid saving during initial load

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      Storage.saveNoteForVideo(videoId, noteText);
      setTimeout(() => setSaveStatus("saved"), 600);
    }, 1000); // 1 sec debounce

    return () => clearTimeout(timer);
  }, [noteText, videoId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value);
    setSaveStatus("saving"); // trigger auto-save timer
  };

  // Handle external keyboard shortcuts
  useEffect(() => {
    const handleSaveShortcut = () => {
      Storage.saveNoteForVideo(videoId, noteText);
      setSaveStatus("saved");
    };

    const handleDeleteShortcut = () => {
      toast.warning(
        "Clear Lecture Notes?",
        "Are you sure you want to delete all notes for this lecture?",
        {
          duration: 10000,
          action: {
            label: "Delete",
            primary: true,
            onClick: () => {
              setNoteText("");
              Storage.saveNoteForVideo(videoId, "");
              setSaveStatus("saved");
              toast.success("Notes Saved", "Changes saved automatically.");
            }
          }
        }
      );
    };

    window.addEventListener("studytube-save-notes", handleSaveShortcut);
    window.addEventListener("studytube-delete-notes", handleDeleteShortcut);

    return () => {
      window.removeEventListener("studytube-save-notes", handleSaveShortcut);
      window.removeEventListener("studytube-delete-notes", handleDeleteShortcut);
    };
  }, [videoId, noteText, toast]);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = before + (selected || "text") + after;
    const newText = text.substring(0, start) + replacement + text.substring(end);

    setNoteText(newText);
    setSaveStatus("saving");

    // Reset selection focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || "text").length);
    }, 50);
  };

  const handleExport = (format: "txt" | "md") => {
    const mime = format === "txt" ? "text/plain" : "text/markdown";
    const ext = format;
    const filename = `LearnStudy_Notes_${videoId}_${videoTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${ext}`;
    
    const content = `# LearnStudy Lecture Notes\n\n**Lecture Title:** ${videoTitle}\n**Video Link:** https://youtube.com/watch?v=${videoId}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n${noteText}`;
    
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(noteText);
    toast.success("Notes Copied", "Your lecture notes have been copied to the clipboard.");
  };

  const wordCount = noteText.trim() === "" ? 0 : noteText.trim().split(/\s+/).length;

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm transition-all duration-300 ${isCollapsed ? "h-auto" : "h-[400px]"}`}>
      {/* Header Toolbar */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-950/25 transition-colors select-none rounded-t-2xl"
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            Lecture Notes
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded font-medium">
            {wordCount} words
          </span>
        </div>

        {/* Action icons / Saved indicators */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {saveStatus === "saving" && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
              <CheckCircle className="w-3 h-3" />
              Saved
            </span>
          )}
          
          <div className="flex gap-1">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("studytube-improve-notes", { detail: { noteText } }));
              }}
              title="Restructure and expand notes with AI"
              className="p-1.5 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-extrabold flex items-center gap-1 transition text-xs mr-1"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Improve</span>
            </button>
            <button
              onClick={() => handleExport("md")}
              title="Download Markdown (.md)"
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyToClipboard}
              title="Copy to Clipboard"
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 transition"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setNoteText("");
                Storage.saveNoteForVideo(videoId, "");
                setSaveStatus("saved");
                toast.success("Notes Cleared", "Lecture notes have been deleted.");
              }}
              title="Clear Notes"
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>

      {/* Formatting bar */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto select-none">
        <button
          onClick={() => insertText("**", "**")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 font-bold text-xs"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertText("*", "*")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 italic text-xs"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertText("\n# ", "\n")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs font-semibold"
          title="Heading"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-[1px] bg-slate-300 dark:bg-zinc-800 mx-1" />
        <button
          onClick={() => insertText("\n- ", "")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertText("\n[ ] ", "")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs"
          title="Checklist"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertText("`", "`")}
          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs font-mono"
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor text area */}
      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={handleChange}
          placeholder="Start taking notes on this lecture... Bold formulas, jot definitions, insert checklists or code blocks. Autosaves locally."
          className="w-full h-full resize-none border-0 focus:ring-0 p-0 text-sm bg-transparent text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none leading-relaxed font-sans"
        />
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800/60 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
        <Sparkles className="w-3 h-3 text-blue-400" />
        <span>Press Bold/Italic tools to format selected text block.</span>
      </div>
    </>
  )}
</div>
  );
}
