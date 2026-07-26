import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  PDFDocument, 
  PDFHighlight, 
  PDFBookmark, 
  PDFStickyNote, 
  PDFDrawingStroke, 
  PDFQuestionFlag,
  Flashcard 
} from "../types";
import { Storage } from "../utils/storage";
import { PdfDb } from "../utils/pdfDb";
import { 
  FileText, 
  Upload, 
  Search, 
  StickyNote, 
  Trash2, 
  BookOpen, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sparkles,
  PenTool,
  Bookmark as BookmarkIcon,
  HelpCircle,
  Eye,
  Columns,
  List,
  Grid,
  Moon,
  Sun,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Plus,
  X,
  Check,
  Languages,
  Book,
  Download,
  Share2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
  Copy,
  FolderPlus,
  Pin
} from "lucide-react";

// Set PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;

export function PDFStudyReader() {
  // Document list & Active documents (Multi-tab support)
  const [docs, setDocs] = useState<PDFDocument[]>(() => Storage.getPDFDocuments());
  const [openDocIds, setOpenDocIds] = useState<string[]>(() => {
    const loaded = Storage.getPDFDocuments();
    return loaded.length > 0 ? [loaded[0].id] : [];
  });
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const loaded = Storage.getPDFDocuments();
    return loaded.length > 0 ? loaded[0].id : null;
  });

  const activeDoc = docs.find(d => d.id === activeDocId) || null;

  // PDF.js State
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.1);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedPageTexts, setExtractedPageTexts] = useState<Record<number, string>>({});

  // IndexedDB Heavy PDF Storage States
  const [activeFileData, setActiveFileData] = useState<string | null>(null);
  const [loadingFileData, setLoadingFileData] = useState<boolean>(false);

  // Load heavy PDF file data from IndexedDB when active document changes
  useEffect(() => {
    if (!activeDocId) {
      setActiveFileData(null);
      return;
    }

    // Check if we already have it loaded in memory in the docs state (e.g., from a fresh upload)
    const currentDoc = docs.find(d => d.id === activeDocId);
    if (currentDoc && (currentDoc.fileDataUrl || currentDoc.fileData)) {
      setActiveFileData(currentDoc.fileDataUrl || currentDoc.fileData || null);
      return;
    }

    setLoadingFileData(true);
    setLoadingPdf(true); // Show loader in main UI too
    PdfDb.getPdfFile(activeDocId)
      .then((data) => {
        if (data) {
          setActiveFileData(data);
          // Pre-populate the docs state so we don't have to fetch it again for this active session
          setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, fileData: data, fileDataUrl: data } : d));
        } else {
          setActiveFileData(null);
        }
        setLoadingFileData(false);
      })
      .catch((err) => {
        console.error("Error loading PDF from IndexedDB", err);
        setLoadingFileData(false);
      });
  }, [activeDocId]);

  // Reading Modes
  const [readingMode, setReadingMode] = useState<"single" | "continuous" | "facing" | "horizontal">("single");
  const [colorMode, setColorMode] = useState<"normal" | "dark" | "eyeComfort" | "highContrast">("normal");
  const [warmTint, setWarmTint] = useState<number>(30); // 0 to 100
  const [splitScreen, setSplitScreen] = useState<boolean>(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [revisionOnly, setRevisionOnly] = useState<boolean>(false);
  const [questionPaperMode, setQuestionPaperMode] = useState<boolean>(false);

  // Sidebars
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);
  const [leftTab, setLeftTab] = useState<"toc" | "thumbnails" | "bookmarks" | "highlights" | "drawings" | "ai">("bookmarks");
  const [rightTab, setRightTab] = useState<"ai" | "notes" | "flashcards" | "dictionary" | "timer">("ai");

  // Interactive Tools & Annotations
  const [activeTool, setActiveTool] = useState<"select" | "highlighter" | "pen" | "sticky" | "eraser">("select");
  const [strokeColor, setStrokeColor] = useState<string>("#f59e0b");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{ x: number; y: number }>>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Array<{ page: number; snippet: string }>>([]);
  const [searchIndex, setSearchIndex] = useState<number>(0);

  // Selection & Context Menu
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  // Sticky Note Modal / Prompt
  const [newStickyText, setNewStickyText] = useState<string>("");

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>("");
  const [aiOutputMode, setAiOutputMode] = useState<"text" | "flashcards" | "mcqs" | "dictionary">("text");
  const [aiGeneratedFlashcards, setAiGeneratedFlashcards] = useState<Array<{ question: string; answer: string }>>([]);
  const [aiGeneratedMCQs, setAiGeneratedMCQs] = useState<Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>>([]);
  const [dictionaryResult, setDictionaryResult] = useState<any>(null);

  // Dictionary Lookup Tool
  const [dictQuery, setDictQuery] = useState<string>("");

  // Study Timer
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60); // 25 min default
  const [timerMode, setTimerMode] = useState<"pomodoro" | "stopwatch">("pomodoro");
  const [totalStudiedSeconds, setTotalStudiedSeconds] = useState<number>(0);

  // Recent Pages History
  const [pageHistory, setPageHistory] = useState<number[]>([1]);

  // Open Recent Modal State
  const [showRecentModal, setShowRecentModal] = useState<boolean>(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const facingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load documents from Storage
  const refreshDocs = useCallback(() => {
    const loaded = Storage.getPDFDocuments();
    setDocs(loaded);
    return loaded;
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTotalStudiedSeconds(prev => prev + 1);
        if (timerMode === "pomodoro") {
          setTimerSeconds(prev => {
            if (prev <= 1) {
              setTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setTimerSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerMode]);

  // Load PDF into PDF.js Proxy
  useEffect(() => {
    if (!activeDoc) {
      setPdfProxy(null);
      setNumPages(0);
      return;
    }

    if (loadingFileData) return; // Wait for IndexedDB fetch to complete

    const dataUrl = activeFileData || activeDoc.fileDataUrl || activeDoc.fileData;
    if (!dataUrl) {
      setPdfProxy(null);
      setNumPages(0);
      return;
    }

    setLoadingPdf(true);
    setPdfError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: dataUrl,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
      cMapPacked: true,
    });

    loadingTask.promise.then(
      (pdf) => {
        setPdfProxy(pdf);
        setNumPages(pdf.numPages);
        setLoadingPdf(false);

        // Update doc page count in storage if missing
        if (!activeDoc.pageCount || activeDoc.pageCount !== pdf.numPages) {
          const updated = { ...activeDoc, pageCount: pdf.numPages };
          Storage.savePDFDocument(updated);
          refreshDocs();
        }

        // Extract text snippets from first 10 pages for fast searching
        const textMap: Record<number, string> = {};
        const maxPagesToExtract = Math.min(pdf.numPages, 15);
        const textPromises = [];
        for (let i = 1; i <= maxPagesToExtract; i++) {
          textPromises.push(
            pdf.getPage(i).then(page => 
              page.getTextContent().then(tc => {
                textMap[i] = tc.items.map((item: any) => item.str).join(" ");
              })
            )
          );
        }
        Promise.all(textPromises).then(() => {
          setExtractedPageTexts(textMap);
        });
      },
      (err) => {
        console.error("PDF loading error:", err);
        setPdfError("Could not render full canvas vector for this file format. Showing embedded document view.");
        setLoadingPdf(false);
      }
    );
  }, [activeDocId]);

  // Render PDF Page to Canvas
  const renderCanvasPage = useCallback(
    async (pageNo: number, targetCanvas: HTMLCanvasElement | null) => {
      if (!pdfProxy || !targetCanvas) return;
      try {
        const page = await pdfProxy.getPage(pageNo);
        const viewport = page.getViewport({ scale: zoomScale });
        
        targetCanvas.width = viewport.width;
        targetCanvas.height = viewport.height;

        const canvasContext = targetCanvas.getContext("2d");
        if (!canvasContext) return;

        canvasContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        const renderContext = {
          canvasContext,
          viewport,
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page to canvas:", err);
      }
    },
    [pdfProxy, zoomScale]
  );

  // Render primary page canvas
  useEffect(() => {
    if (pdfProxy && canvasRef.current && currentPage >= 1 && currentPage <= numPages) {
      renderCanvasPage(currentPage, canvasRef.current);

      if (readingMode === "facing" && currentPage + 1 <= numPages && facingCanvasRef.current) {
        renderCanvasPage(currentPage + 1, facingCanvasRef.current);
      }
    }
  }, [pdfProxy, currentPage, zoomScale, readingMode, renderCanvasPage, numPages]);

  // Page History Tracker
  const jumpToPage = (p: number) => {
    const validPage = Math.max(1, Math.min(p, numPages || 1));
    setCurrentPage(validPage);
    setPageHistory(prev => [validPage, ...prev.filter(x => x !== validPage)].slice(0, 10));
  };

  // Upload PDF Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      const newDoc: PDFDocument = {
        id: "pdf_" + Date.now(),
        title: file.name,
        courseName: "Uploaded Course Material",
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        pageCount: 1,
        fileData: dataUrl,
        fileDataUrl: dataUrl,
        uploadedAt: new Date().toISOString(),
        highlights: [],
        bookmarks: [{ id: "bm_1", page: 1, title: "Cover Page / Start", color: "#8b5cf6" }],
        stickyNotes: [],
        drawings: [],
        questionFlags: []
      };

      Storage.savePDFDocument(newDoc);
      const updated = refreshDocs();
      setOpenDocIds(prev => [...prev, newDoc.id]);
      setActiveDocId(newDoc.id);
      setCurrentPage(1);
    };

    reader.readAsDataURL(file);
  };

  // Close Tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remainingTabs = openDocIds.filter(t => t !== id);
    setOpenDocIds(remainingTabs);
    if (activeDocId === id) {
      setActiveDocId(remainingTabs[remainingTabs.length - 1] || null);
    }
  };

  // Delete Document Permanently
  const handleDeletePdf = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Storage.deletePDFDocument(id);
    const remainingDocs = refreshDocs();
    setOpenDocIds(prev => prev.filter(t => t !== id));
    if (activeDocId === id) {
      setActiveDocId(remainingDocs[0]?.id || null);
    }
  };

  // Add Smart Bookmark
  const handleAddBookmark = () => {
    if (!activeDoc) return;
    const existing = activeDoc.bookmarks || [];
    const newBm: PDFBookmark = {
      id: "bm_" + Date.now(),
      page: currentPage,
      title: `Page ${currentPage} Bookmark`,
      color: strokeColor || "#8b5cf6",
      createdAt: new Date().toISOString()
    };
    const updated = {
      ...activeDoc,
      bookmarks: [...existing, newBm]
    };
    Storage.savePDFDocument(updated);
    refreshDocs();
  };

  // Add Sticky Note
  const handleAddStickyNote = (e?: React.MouseEvent) => {
    if (!activeDoc || !newStickyText.trim()) return;

    let xPercent = 50;
    let yPercent = 50;

    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      xPercent = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100));
      yPercent = Math.min(90, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));
    }

    const newNote: PDFStickyNote = {
      id: "sn_" + Date.now(),
      page: currentPage,
      text: newStickyText.trim(),
      color: strokeColor || "#f59e0b",
      xPercent,
      yPercent,
      author: "Student",
      createdAt: new Date().toISOString(),
      expanded: true
    };

    const updated = {
      ...activeDoc,
      stickyNotes: [...(activeDoc.stickyNotes || []), newNote]
    };

    Storage.savePDFDocument(updated);
    refreshDocs();
    setNewStickyText("");
  };

  // Toggle Question Flag (Exam Mode)
  const handleToggleQuestionFlag = (qNum: number) => {
    if (!activeDoc) return;
    const existing = activeDoc.questionFlags || [];
    const idx = existing.findIndex(q => q.questionNumber === qNum);
    
    let updatedFlags = [...existing];
    if (idx > -1) {
      const current = existing[idx];
      if (!current.solved) {
        updatedFlags[idx] = { ...current, solved: true, difficult: false };
      } else if (!current.difficult) {
        updatedFlags[idx] = { ...current, solved: false, difficult: true };
      } else {
        updatedFlags = updatedFlags.filter(q => q.questionNumber !== qNum);
      }
    } else {
      updatedFlags.push({ questionNumber: qNum, page: currentPage, solved: true, difficult: false });
    }

    const updated = { ...activeDoc, questionFlags: updatedFlags };
    Storage.savePDFDocument(updated);
    refreshDocs();
  };

  // Search in PDF Text
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results: Array<{ page: number; snippet: string }> = [];

    Object.entries(extractedPageTexts).forEach(([pageStr, rawText]) => {
      const pNum = parseInt(pageStr, 10);
      const text = String(rawText || "");
      if (text.toLowerCase().includes(query)) {
        const idx = text.toLowerCase().indexOf(query);
        const snippet = text.substring(Math.max(0, idx - 20), Math.min(text.length, idx + 40));
        results.push({ page: pNum, snippet: `...${snippet}...` });
      }
    });

    setSearchResults(results);
    if (results.length > 0) {
      setSearchIndex(0);
      jumpToPage(results[0].page);
    }
  };

  // Text Selection Popup Listener
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const text = sel.toString().trim();
      setSelectedText(text);
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionCoords({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setSelectionCoords(null);
    }
  };

  // Run AI Assistant Actions
  const runAiAssistant = async (action: string, overrideText?: string) => {
    if (!activeDoc) return;
    setAiLoading(true);
    setRightSidebarOpen(true);
    setRightTab("ai");
    setAiResponse("");

    const textToUse = overrideText || selectedText || extractedPageTexts[currentPage] || activeDoc.title;
    const fullContext = extractedPageTexts[currentPage] || "";

    try {
      const res = await fetch("/api/ai/pdf-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          documentTitle: activeDoc.title,
          pageNumber: currentPage,
          selectedText: textToUse,
          fullContext,
          customQuery: aiCustomPrompt
        })
      });

      const data = await res.json();
      setAiLoading(false);

      if (action === "dictionary") {
        setAiOutputMode("dictionary");
        setDictionaryResult(data);
      } else if (action === "generate_flashcards") {
        setAiOutputMode("flashcards");
        setAiGeneratedFlashcards(Array.isArray(data) ? data : []);
      } else if (action === "generate_mcqs") {
        setAiOutputMode("mcqs");
        setAiGeneratedMCQs(Array.isArray(data) ? data : []);
      } else {
        setAiOutputMode("text");
        setAiResponse(data.result || "No response received.");
      }
    } catch (err) {
      console.error("AI Assistant call failed:", err);
      setAiLoading(false);
      setAiOutputMode("text");
      setAiResponse("AI Assistant failed to connect. Please check internet connection.");
    }
  };

  // Save AI Flashcards to Flashcards Bank
  const handleSaveFlashcardsToBank = (cards: Array<{ question: string; answer: string }>) => {
    cards.forEach(c => {
      const newFc: Flashcard = {
        id: "fc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        question: c.question,
        answer: c.answer,
        courseTitle: activeDoc?.courseName || "PDF Study Material",
        rating: "unrated",
        createdAt: new Date().toISOString()
      };
      Storage.saveFlashcard(newFc);
    });
    alert(`Saved ${cards.length} flashcards to your LearnStudy Flashcards Bank!`);
  };

  // Canvas Drawing Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "select" || activeTool === "sticky") return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStrokePoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStrokePoints(prev => [...prev, { x, y }]);

    // Draw active line on top annotation canvas
    const ctx = canvas.getContext("2d");
    if (ctx && currentStrokePoints.length > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const last = currentStrokePoints[currentStrokePoints.length - 1];
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !activeDoc) return;
    setIsDrawing(false);

    if (currentStrokePoints.length > 1) {
      const newStroke: PDFDrawingStroke = {
        id: "ds_" + Date.now(),
        page: currentPage,
        tool: activeTool === "highlighter" ? "highlighter" : "pen",
        color: strokeColor,
        thickness: strokeWidth,
        points: currentStrokePoints
      };

      const existingDrawings = activeDoc.drawings || [];
      const updated = {
        ...activeDoc,
        drawings: [...existingDrawings, newStroke]
      };
      Storage.savePDFDocument(updated);
      refreshDocs();
    }
    setCurrentStrokePoints([]);
  };

  // Active color mode filter styles
  const getColorModeStyle = () => {
    if (colorMode === "dark") {
      return "invert(0.92) hue-rotate(180deg) contrast(1.1)";
    }
    if (colorMode === "eyeComfort") {
      return `sepia(${warmTint / 100}) saturate(1.2) hue-rotate(-10deg)`;
    }
    if (colorMode === "highContrast") {
      return "contrast(1.4) brightness(0.95)";
    }
    return "none";
  };

  // Filtered documents by search or revision
  const activeStickyNotes = (activeDoc?.stickyNotes || []).filter(n => n.page === currentPage);
  const activeBookmarks = activeDoc?.bookmarks || [];
  const activeHighlights = activeDoc?.highlights || [];
  const activeQuestionFlags = activeDoc?.questionFlags || [];

  // --------------------------------------------------------------------------
  // EMPTY STATE (IF NO PDF OPEN)
  // --------------------------------------------------------------------------
  if (!activeDoc || openDocIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Empty State Banner */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-10 md:p-16 text-center space-y-6 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
            <BookOpen className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">
              No PDF Open
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Upload lecture notes, textbooks, or assignments to start studying.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shadow-purple-500/25 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
              <Upload className="w-4 h-4" />
              Upload PDF
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            {docs.length > 0 && (
              <button
                onClick={() => setShowRecentModal(true)}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Book className="w-4 h-4 text-purple-500" />
                Open Recent ({docs.length})
              </button>
            )}
          </div>
        </div>

        {/* Recent Documents Selection Modal */}
        {showRecentModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Your Study Document Library
                </h3>
                <button
                  onClick={() => setShowRecentModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {docs.map(docItem => (
                  <div
                    key={docItem.id}
                    onClick={() => {
                      if (!openDocIds.includes(docItem.id)) {
                        setOpenDocIds(prev => [...prev, docItem.id]);
                      }
                      setActiveDocId(docItem.id);
                      setShowRecentModal(false);
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 bg-slate-50 dark:bg-zinc-950 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{docItem.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {docItem.fileSize || "PDF"} • Uploaded {new Date(docItem.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeletePdf(docItem.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN WORKSPACE INTERFACE (FULL WORKSPACE)
  // --------------------------------------------------------------------------
  return (
    <div 
      className={`min-h-screen flex flex-col bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 ${
        fullscreen ? "fixed inset-0 z-50 overflow-auto" : "space-y-3"
      }`}
      onMouseUp={handleTextSelection}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* MULTI-TAB DOCUMENT BAR & TOP HEADER */}
      {/* ---------------------------------------------------------------------- */}
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-30 shadow-sm">
        {/* Document Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto border-b border-slate-100 dark:border-zinc-850">
          {openDocIds.map(id => {
            const doc = docs.find(d => d.id === id);
            if (!doc) return null;
            const isActive = id === activeDocId;
            return (
              <div
                key={id}
                onClick={() => setActiveDocId(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-bold transition cursor-pointer border-t border-x shrink-0 ${
                  isActive
                    ? "bg-slate-100 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-purple-600 dark:text-purple-400"
                    : "bg-white dark:bg-zinc-900 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px]">{doc.title}</span>
                <button
                  onClick={(e) => handleCloseTab(id, e)}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <label className="p-1 px-2.5 rounded-t-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-purple-600 text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" />
            New PDF
            <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Primary Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 px-4">
          {/* Left Side: Sidebar Toggles & Title */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`p-2 rounded-xl transition ${
                leftSidebarOpen
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
              title="Toggle Left Sidebar"
            >
              <Columns className="w-4 h-4" />
            </button>

            <div>
              <h1 className="text-xs font-black text-slate-900 dark:text-zinc-100 max-w-xs md:max-w-md truncate">
                {activeDoc.title}
              </h1>
              <p className="text-[10px] text-slate-400">
                {numPages > 0 ? `${numPages} Pages` : "PDF Document"} • {activeDoc.courseName || "Course Note"}
              </p>
            </div>
          </div>

          {/* Center: Page Controls & Zoom */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-950 p-1 px-2 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => jumpToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-bold px-1">
              <span>Page</span>
              <input
                type="number"
                value={currentPage}
                onChange={(e) => jumpToPage(parseInt(e.target.value, 10) || 1)}
                className="w-10 text-center bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg py-0.5 focus:outline-none"
              />
              <span className="text-slate-400">of {numPages || 1}</span>
            </div>

            <button
              onClick={() => jumpToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-zinc-800 mx-1" />

            <button
              onClick={() => setZoomScale(z => Math.max(0.6, z - 0.15))}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-extrabold w-11 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(z => Math.min(2.5, z + 0.15))}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Side: Modes, Filters & Right Sidebar Toggle */}
          <div className="flex items-center gap-1.5">
            {/* Reading View Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setReadingMode("single")}
                className={`p-1.5 rounded-xl transition ${
                  readingMode === "single" ? "bg-white dark:bg-zinc-800 text-purple-600 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Page Mode"
              >
                <Book className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingMode("continuous")}
                className={`p-1.5 rounded-xl transition ${
                  readingMode === "continuous" ? "bg-white dark:bg-zinc-800 text-purple-600 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Continuous Scroll"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingMode("facing")}
                className={`p-1.5 rounded-xl transition ${
                  readingMode === "facing" ? "bg-white dark:bg-zinc-800 text-purple-600 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Facing Pages (Book View)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Color Filters Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setColorMode("normal")}
                className={`p-1.5 rounded-xl transition ${
                  colorMode === "normal" ? "bg-white dark:bg-zinc-800 text-purple-600 shadow-sm" : "text-slate-400"
                }`}
                title="Normal Reading Mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setColorMode("dark")}
                className={`p-1.5 rounded-xl transition ${
                  colorMode === "dark" ? "bg-white dark:bg-zinc-800 text-purple-600 shadow-sm" : "text-slate-400"
                }`}
                title="Smart Dark Reading Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setColorMode("eyeComfort")}
                className={`p-1.5 rounded-xl transition ${
                  colorMode === "eyeComfort" ? "bg-white dark:bg-zinc-800 text-amber-600 shadow-sm" : "text-slate-400"
                }`}
                title="Eye Comfort Warm Mode"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Exam Mode Toggle */}
            <button
              onClick={() => setQuestionPaperMode(!questionPaperMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                questionPaperMode
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
              }`}
              title="Exam / Question Paper Mode"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exam Mode</span>
            </button>

            {/* Fullscreen Mode */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 transition"
              title="Fullscreen Mode"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Right Sidebar Toggle */}
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`p-2 rounded-xl transition ${
                rightSidebarOpen
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
              title="Toggle AI & Context Tools Sidebar"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Eye Comfort Warmth Intensity Slider Sub-Bar */}
        {colorMode === "eyeComfort" && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/50 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              Eye Comfort Warm Tint Intensity:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="80"
                value={warmTint}
                onChange={(e) => setWarmTint(parseInt(e.target.value, 10))}
                className="w-32 accent-amber-600 cursor-pointer"
              />
              <span className="font-mono text-[11px] font-bold">{warmTint}%</span>
            </div>
          </div>
        )}
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA (LEFT SIDEBAR + CENTER CANVAS + RIGHT SIDEBAR) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR */}
        {leftSidebarOpen && (
          <aside className="w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 shadow-sm z-20">
            {/* Left Sidebar Navigation Tabs */}
            <div className="flex items-center justify-around border-b border-slate-100 dark:border-zinc-800 p-2 bg-slate-50 dark:bg-zinc-950/50">
              <button
                onClick={() => setLeftTab("bookmarks")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "bookmarks" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Smart Bookmarks"
              >
                <BookmarkIcon className="w-4 h-4" />
                <span className="text-[10px]">Bookmarks</span>
              </button>

              <button
                onClick={() => setLeftTab("thumbnails")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "thumbnails" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Page Thumbnails"
              >
                <Grid className="w-4 h-4" />
                <span className="text-[10px]">Thumbnails</span>
              </button>

              <button
                onClick={() => setLeftTab("highlights")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "highlights" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Highlights & Notes"
              >
                <StickyNote className="w-4 h-4" />
                <span className="text-[10px]">Notes</span>
              </button>

              <button
                onClick={() => setLeftTab("drawings")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "drawings" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Canvas Drawings"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[10px]">Drawings</span>
              </button>
            </div>

            {/* Left Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* BOOKMARKS TAB */}
              {leftTab === "bookmarks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Smart Bookmarks ({activeBookmarks.length})
                    </h3>
                    <button
                      onClick={handleAddBookmark}
                      className="bg-purple-600 hover:bg-purple-500 text-white p-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Current Page
                    </button>
                  </div>

                  {activeBookmarks.length > 0 ? (
                    <div className="space-y-2">
                      {activeBookmarks.map((bm) => (
                        <div
                          key={bm.id}
                          onClick={() => jumpToPage(bm.page)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                            bm.page === currentPage
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 text-purple-900 dark:text-purple-200"
                              : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BookmarkIcon className="w-4 h-4 text-purple-500 shrink-0" />
                            <div>
                              <div className="text-xs font-bold">{bm.title}</div>
                              <div className="text-[10px] text-slate-400">Page {bm.page}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                            P{bm.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No bookmarks saved yet. Click "Add Current Page" above.</p>
                  )}
                </div>
              )}

              {/* THUMBNAILS TAB */}
              {leftTab === "thumbnails" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Page Previews ({numPages})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: numPages || 1 }).map((_, i) => {
                      const pNum = i + 1;
                      const isCurr = pNum === currentPage;
                      return (
                        <div
                          key={pNum}
                          onClick={() => jumpToPage(pNum)}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                            isCurr
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20"
                              : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-purple-300"
                          }`}
                        >
                          <div className="h-20 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-1.5 flex items-center justify-center text-slate-400 text-xs font-bold">
                            P{pNum}
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                            Page {pNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HIGHLIGHTS & STICKY NOTES TAB */}
              {leftTab === "highlights" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Sticky Notes & Annotations
                  </h3>

                  <div className="space-y-2">
                    {activeDoc.stickyNotes && activeDoc.stickyNotes.length > 0 ? (
                      activeDoc.stickyNotes.map(sn => (
                        <div
                          key={sn.id}
                          onClick={() => jumpToPage(sn.page)}
                          className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs space-y-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <span>Page {sn.page} Sticky Note</span>
                            <span>{new Date(sn.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-amber-900 dark:text-amber-200 font-medium">{sn.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No sticky notes created yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* DRAWINGS TAB */}
              {leftTab === "drawings" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Handwritten Markups ({activeDoc.drawings?.length || 0})
                  </h3>
                  {activeDoc.drawings && activeDoc.drawings.length > 0 ? (
                    <div className="space-y-2">
                      {activeDoc.drawings.map((ds, i) => (
                        <div
                          key={ds.id || i}
                          onClick={() => jumpToPage(ds.page)}
                          className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-purple-500" />
                            <span>Page {ds.page} Stroke</span>
                          </div>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ds.color }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No drawing markups added yet.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* CENTER VIEWPORT (PDF CANVAS & FLOATING TOOLBAR) */}
        <main 
          ref={containerRef}
          className="flex-1 overflow-auto flex flex-col items-center p-6 relative bg-slate-200/60 dark:bg-zinc-950/80"
        >
          {/* Floating Annotation & Markup Toolbar */}
          <div className="sticky top-2 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-800 p-2 px-4 rounded-3xl shadow-xl flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tools:</span>

            <button
              onClick={() => setActiveTool("select")}
              className={`p-2 rounded-xl transition ${
                activeTool === "select" ? "bg-purple-600 text-white shadow-sm" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Selection Tool"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool("highlighter")}
              className={`p-2 rounded-xl transition ${
                activeTool === "highlighter" ? "bg-amber-500 text-white shadow-sm" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Highlighter"
            >
              <StickyNote className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool("pen")}
              className={`p-2 rounded-xl transition ${
                activeTool === "pen" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Pen Draw Tool"
            >
              <PenTool className="w-4 h-4" />
            </button>

            {/* Color Palette Picker */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-zinc-800 pl-3">
              {["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#000000"].map(c => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  className={`w-5 h-5 rounded-full transition transform hover:scale-110 ${
                    strokeColor === c ? "ring-2 ring-offset-1 ring-purple-500" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* PDF Canvas Rendering Container */}
          <div 
            className="relative shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 border border-slate-300 dark:border-zinc-800"
            style={{ filter: getColorModeStyle() }}
          >
            {loadingPdf && (
              <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">Rendering PDF Page Vector...</p>
              </div>
            )}

            {/* Direct Canvas Page Render */}
            <canvas
              ref={canvasRef}
              className="block rounded-2xl bg-white"
            />

            {/* Facing Second Page Canvas (If Facing Mode Active) */}
            {readingMode === "facing" && (
              <canvas
                ref={facingCanvasRef}
                className="block rounded-2xl bg-white mt-4 border-t"
              />
            )}

            {/* Annotation Overlay Canvas for Pen Drawings */}
            <canvas
              ref={annotationCanvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`absolute inset-0 z-10 ${
                activeTool !== "select" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
              }`}
            />

            {/* Interactive Sticky Notes Layer on Page */}
            {activeStickyNotes.map(sn => (
              <div
                key={sn.id}
                style={{
                  top: `${sn.yPercent || 50}%`,
                  left: `${sn.xPercent || 50}%`,
                }}
                className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 p-3 bg-amber-200 text-amber-950 font-sans text-xs rounded-2xl shadow-xl max-w-xs border border-amber-300 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 border-b border-amber-300/60 pb-1">
                  <span>Sticky Note</span>
                  <button
                    onClick={() => {
                      const updatedNotes = (activeDoc?.stickyNotes || []).filter(n => n.id !== sn.id);
                      Storage.savePDFDocument({ ...activeDoc, stickyNotes: updatedNotes });
                      refreshDocs();
                    }}
                    className="p-0.5 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="font-semibold leading-relaxed">{sn.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Add Sticky Note Input Bar */}
          <div className="mt-4 max-w-md w-full flex gap-2">
            <input
              type="text"
              value={newStickyText}
              onChange={(e) => setNewStickyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStickyNote()}
              placeholder="Drop a study sticky note on this page..."
              className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 px-4 py-2.5 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={(e) => handleAddStickyNote(e)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-2xl transition shadow-md cursor-pointer shrink-0"
            >
              Add Note
            </button>
          </div>
        </main>

        {/* RIGHT SIDEBAR (AI ASSISTANT & CONTEXT TOOLS) */}
        {rightSidebarOpen && (
          <aside className="w-80 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 shadow-sm z-20">
            {/* Right Sidebar Header Navigation */}
            <div className="flex items-center justify-around border-b border-slate-100 dark:border-zinc-800 p-2 bg-slate-50 dark:bg-zinc-950/50">
              <button
                onClick={() => setRightTab("ai")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "ai" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>AI Tutor</span>
              </button>

              <button
                onClick={() => setRightTab("flashcards")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "flashcards" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => setRightTab("timer")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "timer" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Play className="w-4 h-4 text-emerald-500" />
                <span>Timer</span>
              </button>
            </div>

            {/* Right Sidebar Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* AI READING ASSISTANT TAB */}
              {rightTab === "ai" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      AI PDF Study Assistant
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ask questions, generate flashcards, or simplify complex textbook concepts.
                    </p>
                  </div>

                  {/* AI Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => runAiAssistant("explain")}
                      className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      💡 Explain Page
                    </button>
                    <button
                      onClick={() => runAiAssistant("summarize")}
                      className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      📑 Summarize Page
                    </button>
                    <button
                      onClick={() => runAiAssistant("generate_mcqs")}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      🎯 Quiz Me (MCQs)
                    </button>
                    <button
                      onClick={() => runAiAssistant("generate_flashcards")}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      🎴 Flashcards
                    </button>
                  </div>

                  {/* Custom Question Input */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ask any doubt about this page or formula..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => runAiAssistant("ask_doubt")}
                      disabled={aiLoading}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Analyzing Document...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask Gemini Tutor</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Response Output Display */}
                  {aiOutputMode === "text" && aiResponse && (
                    <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-2xl text-xs space-y-2">
                      <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        AI Explanation
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                    </div>
                  )}

                  {/* Generated Flashcards Output */}
                  {aiOutputMode === "flashcards" && aiGeneratedFlashcards.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600">Generated Flashcards</span>
                        <button
                          onClick={() => handleSaveFlashcardsToBank(aiGeneratedFlashcards)}
                          className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg"
                        >
                          Save All to Bank
                        </button>
                      </div>
                      {aiGeneratedFlashcards.map((fc, i) => (
                        <div key={i} className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs space-y-1">
                          <div className="font-bold text-emerald-900 dark:text-emerald-300">Q: {fc.question}</div>
                          <div className="text-emerald-700 dark:text-emerald-400">A: {fc.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Generated MCQs Output */}
                  {aiOutputMode === "mcqs" && aiGeneratedMCQs.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-amber-600">Generated Practice Quiz</span>
                      {aiGeneratedMCQs.map((q, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs space-y-2">
                          <div className="font-bold text-amber-900 dark:text-amber-200">{i + 1}. {q.question}</div>
                          <div className="space-y-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-1.5 rounded-lg border text-[11px] ${
                                  optIdx === q.correctIndex
                                    ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 font-bold text-emerald-900"
                                    : "bg-white dark:bg-zinc-900 border-amber-200"
                                }`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TIMER & STATS TAB */}
              {rightTab === "timer" && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl text-white text-center space-y-3 shadow-lg">
                    <div className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                      Study Focus Timer
                    </div>
                    <div className="text-4xl font-black font-mono tracking-tight">
                      {Math.floor(timerSeconds / 60).toString().padStart(2, "0")}:
                      {(timerSeconds % 60).toString().padStart(2, "0")}
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        className="bg-white text-indigo-900 font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition hover:scale-[1.03]"
                      >
                        {timerRunning ? "Pause" : "Start Focus"}
                      </button>
                      <button
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(25 * 60);
                        }}
                        className="bg-white/20 text-white font-bold text-xs p-2.5 rounded-2xl transition hover:bg-white/30"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
                    <div className="font-bold text-slate-800 dark:text-zinc-200">Reading Progress Statistics</div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Time Studied:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{Math.floor(totalStudiedSeconds / 60)} min</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Completed Percentage:</span>
                      <span className="font-bold text-purple-600">{Math.round((currentPage / (numPages || 1)) * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SELECTION POPUP CONTEXT MENU */}
      {/* ---------------------------------------------------------------------- */}
      {selectionCoords && selectedText && (
        <div
          style={{
            top: `${selectionCoords.y}px`,
            left: `${selectionCoords.x}px`,
          }}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 border border-slate-700 animate-in fade-in zoom-in duration-150"
        >
          <button
            onClick={() => {
              runAiAssistant("explain", selectedText);
              setSelectionCoords(null);
            }}
            className="p-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-1 text-purple-300"
          >
            💡 Explain
          </button>
          <button
            onClick={() => {
              runAiAssistant("summarize", selectedText);
              setSelectionCoords(null);
            }}
            className="p-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-1 text-indigo-300"
          >
            📝 Summarize
          </button>
          <button
            onClick={() => {
              runAiAssistant("generate_flashcards", selectedText);
              setSelectionCoords(null);
            }}
            className="p-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-1 text-emerald-300"
          >
            🎴 Flashcard
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(selectedText);
              setSelectionCoords(null);
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Copy Text"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
