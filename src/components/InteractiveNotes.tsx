import React, { useState, useEffect, useRef, useCallback } from "react";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";
import { 
  FileText, CheckCircle, Bold, Italic, Heading1, 
  List, Code, CheckSquare, Download, Clipboard, Sparkles,
  ChevronDown, ChevronRight, Trash2, Eye, Code2
} from "lucide-react";

interface InteractiveNotesProps {
  videoId: string;
  videoTitle: string;
}

// Convert markdown to rich HTML for visual editing
function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return "";

  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;

  const formatInline = (text: string): string => {
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold: **text**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic: *text* (avoiding double stars)
    escaped = escaped.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

    // Inline code: `code`
    escaped = escaped.replace(/`([^`]+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 font-mono text-xs">$1</code>');

    return escaped;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<div><br></div>";
      continue;
    }

    // Heading 1 or 2
    if (trimmed.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${formatInline(trimmed.substring(2))}</h2>`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${formatInline(trimmed.substring(3))}</h2>`;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${formatInline(trimmed.substring(4))}</h3>`;
      continue;
    }

    // Checklists: - [ ] or - [x] or [ ] or [x]
    const checkMatch = trimmed.match(/^[-*]?\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      if (inList) { html += "</ul>"; inList = false; }
      const isChecked = checkMatch[1].toLowerCase() === "x";
      const taskText = formatInline(checkMatch[2]);
      html += `<div class="task-checkbox-item flex items-center gap-2 my-1"><input type="checkbox" ${isChecked ? "checked " : ""}class="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer" /><span ${isChecked ? 'class="line-through text-slate-400 dark:text-zinc-500"' : ""}>${taskText}</span></div>`;
      continue;
    }

    // Bullet lists: - or *
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 my-1">';
        inList = true;
      }
      html += `<li>${formatInline(trimmed.substring(2))}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    html += `<div>${formatInline(rawLine)}</div>`;
  }

  if (inList) {
    html += "</ul>";
  }

  return html;
}

// Convert rich editor HTML back to clean markdown
function htmlToMarkdown(rootNode: Node): string {
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Checkbox container
      if (el.classList.contains("task-checkbox-item")) {
        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const isChecked = checkbox ? checkbox.checked : false;
        const span = el.querySelector("span");
        const label = span ? Array.from(span.childNodes).map(walk).join("").trim() : el.textContent?.trim() || "";
        return `\n${isChecked ? "[x]" : "[ ]"} ${label}\n`;
      }

      if (tag === "input" && (el as HTMLInputElement).type === "checkbox") {
        return (el as HTMLInputElement).checked ? "[x] " : "[ ] ";
      }

      const children = Array.from(el.childNodes).map(walk).join("");

      if (tag === "b" || tag === "strong") {
        const trimmed = children.trim();
        return trimmed ? `**${trimmed}**` : "";
      }
      if (tag === "i" || tag === "em") {
        const trimmed = children.trim();
        return trimmed ? `*${trimmed}*` : "";
      }
      if (tag === "code") {
        const trimmed = children.trim();
        return trimmed ? `\`${trimmed}\`` : "";
      }
      if (tag === "h1" || tag === "h2") {
        const trimmed = children.trim();
        return trimmed ? `\n## ${trimmed}\n` : "\n";
      }
      if (tag === "h3" || tag === "h4") {
        const trimmed = children.trim();
        return trimmed ? `\n### ${trimmed}\n` : "\n";
      }
      if (tag === "li") {
        const trimmed = children.trim();
        return `\n- ${trimmed}`;
      }
      if (tag === "ul" || tag === "ol") {
        return `\n${children}\n`;
      }
      if (tag === "br") {
        return "\n";
      }
      if (tag === "div" || tag === "p") {
        if (!children.trim()) return "\n";
        return `\n${children}\n`;
      }
      return children;
    }
    return "";
  }

  const raw = walk(rootNode);
  return raw
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

export function InteractiveNotes({ videoId, videoTitle }: InteractiveNotesProps) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");

  // Active toolbar formatting status
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalChangeRef = useRef(false);

  // Synchronize visual editor innerHTML with current note text
  const syncEditorHtml = useCallback((markdown: string) => {
    if (editorRef.current) {
      const html = markdownToHtml(markdown);
      editorRef.current.innerHTML = html;
    }
  }, []);

  // Load notes when videoId changes
  useEffect(() => {
    const loadedNote = Storage.getNoteForVideo(videoId);
    setNoteText(loadedNote);
    setSaveStatus("idle");
    isInternalChangeRef.current = false;
    syncEditorHtml(loadedNote);
  }, [videoId, syncEditorHtml]);

  // Update active formatting states (bold, italic) on selection change
  const updateActiveStates = () => {
    if (editorMode !== "visual") return;
    try {
      setIsBoldActive(document.queryCommandState("bold"));
      setIsItalicActive(document.queryCommandState("italic"));
    } catch {
      // Ignore queryCommandState errors if not supported
    }
  };

  // Trigger content change from visual contentEditable
  const handleEditorInput = () => {
    if (!editorRef.current) return;
    isInternalChangeRef.current = true;
    const markdown = htmlToMarkdown(editorRef.current);
    setNoteText(markdown);
    setSaveStatus("saving");
    updateActiveStates();
  };

  // Handle textarea change in raw code mode
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isInternalChangeRef.current = true;
    const newText = e.target.value;
    setNoteText(newText);
    setSaveStatus("saving");
  };

  // Auto-save debouncing logic
  useEffect(() => {
    if (saveStatus === "idle") return;

    const timer = setTimeout(() => {
      Storage.saveNoteForVideo(videoId, noteText);
      setSaveStatus("saved");
    }, 800);

    return () => clearTimeout(timer);
  }, [noteText, videoId, saveStatus]);

  // Handle external keyboard shortcuts and events
  useEffect(() => {
    const handleSaveShortcut = () => {
      // Refresh current note from storage if updated externally (e.g., AI companion)
      const currentSaved = Storage.getNoteForVideo(videoId);
      if (currentSaved !== noteText) {
        setNoteText(currentSaved);
        syncEditorHtml(currentSaved);
      } else {
        Storage.saveNoteForVideo(videoId, noteText);
      }
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
              if (editorRef.current) editorRef.current.innerHTML = "";
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
  }, [videoId, noteText, toast, syncEditorHtml]);

  // Toggle editor mode between Visual (WYSIWYG) and Code (Markdown)
  const toggleEditorMode = (mode: "visual" | "code") => {
    if (mode === editorMode) return;
    setEditorMode(mode);
    if (mode === "visual") {
      // Switching to visual mode: render current noteText markdown into editor
      setTimeout(() => {
        syncEditorHtml(noteText);
      }, 20);
    }
  };

  // Formatting operations
  const handleBold = () => {
    if (editorMode === "visual") {
      if (editorRef.current) editorRef.current.focus();
      document.execCommand("bold", false);
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("**", "**");
    }
  };

  const handleItalic = () => {
    if (editorMode === "visual") {
      if (editorRef.current) editorRef.current.focus();
      document.execCommand("italic", false);
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("*", "*");
    }
  };

  const handleHeading = () => {
    if (editorMode === "visual") {
      if (editorRef.current) editorRef.current.focus();
      document.execCommand("formatBlock", false, "<h2>");
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("\n## ", "\n");
    }
  };

  const handleBulletList = () => {
    if (editorMode === "visual") {
      if (editorRef.current) editorRef.current.focus();
      document.execCommand("insertUnorderedList", false);
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("\n- ", "");
    }
  };

  const handleChecklist = () => {
    if (editorMode === "visual") {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const html = `<div class="task-checkbox-item flex items-center gap-2 my-1"><input type="checkbox" class="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer" /> <span>Task item</span></div>&nbsp;`;
      document.execCommand("insertHTML", false, html);
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("\n[ ] ", "");
    }
  };

  const handleCode = () => {
    if (editorMode === "visual") {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const selection = window.getSelection();
      const selected = selection ? selection.toString() : "";
      const html = `<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 font-mono text-xs">${selected || "code"}</code>&nbsp;`;
      document.execCommand("insertHTML", false, html);
      handleEditorInput();
    } else {
      insertMarkdownInTextarea("`", "`");
    }
  };

  const insertMarkdownInTextarea = (before: string, after: string = "") => {
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

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || "text").length);
    }, 50);
  };

  // Interactive checkbox toggling inside rich editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName.toLowerCase() === "input" && (target as HTMLInputElement).type === "checkbox") {
      const checkbox = target as HTMLInputElement;
      const span = checkbox.parentElement?.querySelector("span");
      if (span) {
        if (checkbox.checked) {
          span.classList.add("line-through", "text-slate-400", "dark:text-zinc-500");
        } else {
          span.classList.remove("line-through", "text-slate-400", "dark:text-zinc-500");
        }
      }
      handleEditorInput();
    }
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

  const handleClearNotes = () => {
    setNoteText("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    Storage.saveNoteForVideo(videoId, "");
    setSaveStatus("saved");
    toast.success("Notes Cleared", "Lecture notes have been deleted.");
  };

  const wordCount = noteText.trim() === "" ? 0 : noteText.trim().split(/\s+/).filter(Boolean).length;

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
              className="p-1.5 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-extrabold flex items-center gap-1 transition text-xs mr-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Improve</span>
            </button>
            <button
              onClick={() => handleExport("md")}
              title="Download Markdown (.md)"
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyToClipboard}
              title="Copy to Clipboard"
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 transition cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearNotes}
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
          {/* Formatting bar (Child 2: matches selector div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2)) */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto select-none">
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => { e.preventDefault(); handleBold(); }}
                className={`p-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isBoldActive 
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-xs" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                }`}
                title="Bold (Ctrl+B) - Formats text bold directly"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleItalic(); }}
                className={`p-1 rounded text-xs italic transition flex items-center gap-1 cursor-pointer ${
                  isItalicActive 
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-xs" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                }`}
                title="Italic (Ctrl+I) - Formats text italic directly"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleHeading(); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs font-semibold transition cursor-pointer"
                title="Heading - Formats line as heading"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-zinc-800 mx-1" />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleBulletList(); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs transition cursor-pointer"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleChecklist(); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs transition cursor-pointer"
                title="Checklist / Task Items"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleCode(); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400 text-xs font-mono transition cursor-pointer"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Switch: Rich Visual vs Behind in Code */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => toggleEditorMode("visual")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 cursor-pointer ${
                  editorMode === "visual"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-zinc-700 font-semibold"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
                title="Visual Rich Text - Formatting renders live in the typing box, syntax works in behind in code"
              >
                <Eye className="w-3 h-3" />
                <span>Visual</span>
              </button>
              <button
                onClick={() => toggleEditorMode("code")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 cursor-pointer ${
                  editorMode === "code"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-zinc-700 font-semibold"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
                title="View Code (Markdown) - Inspect the underlying markdown working behind the scenes"
              >
                <Code2 className="w-3 h-3" />
                <span>Code</span>
              </button>
            </div>
          </div>

          {/* Editor text area (Child 3) */}
          <div className="flex-1 p-3 overflow-hidden flex flex-col">
            {editorMode === "visual" ? (
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onKeyUp={updateActiveStates}
                onMouseUp={updateActiveStates}
                onClick={handleEditorClick}
                data-placeholder="Start taking notes on this lecture... Bold formulas, jot definitions, insert checklists or code blocks. Autosaves locally."
                className="notes-rich-editor flex-1 w-full h-full min-h-0 overflow-y-auto text-sm leading-relaxed font-sans text-slate-800 dark:text-zinc-200 focus:outline-none select-text"
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={handleTextareaChange}
                placeholder="Markdown source code behind your notes... (# headings, **bold**, *italic*, - lists, `code`). Autosaves locally."
                className="w-full flex-1 min-h-0 resize-none border-0 focus:ring-0 p-0 text-sm bg-transparent text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none leading-relaxed font-mono select-text"
              />
            )}
          </div>

          {/* Footer hint (Child 4) */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">
                {editorMode === "visual"
                  ? "Live formatting: Bold (Ctrl+B), Italic (Ctrl+I) render visually; code syntax works in behind."
                  : "Raw markdown mode: View and edit underlying markdown code directly."}
              </span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400/80 shrink-0">
              {editorMode === "visual" ? "Rich Visual" : "Code View"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

