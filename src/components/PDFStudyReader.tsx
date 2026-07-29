import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  PDFDocument, 
  PDFBookmark, 
  PDFStickyNote, 
  PDFDrawingStroke, 
  Flashcard 
} from "../types";
import { Storage } from "../utils/storage";
import { PdfDb } from "../utils/pdfDb";
import { 
  FileText, 
  Upload, 
  StickyNote, 
  Trash2, 
  BookOpen, 
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sparkles,
  PenTool,
  Bookmark as BookmarkIcon,
  Eye,
  Columns,
  List,
  Grid,
  Moon,
  Sun,
  Palette,
  Play,
  RotateCcw,
  Plus,
  X,
  Book,
  CheckCircle2,
  Copy
} from "lucide-react";

// Set PDF.js Worker with jsDelivr CDN
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "6.1.200"}/build/pdf.worker.min.mjs`;
}

// Minimal valid sample PDF (1 page with study guide title)
const SAMPLE_PDF_BASE64 = "JVBERi0xLjQKJSDi483NCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iaiA8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9SZXNvdXJjZXMgNCAwIFIgL0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvRm9udCA8PC9GMSA2IDAgUj4+Pj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDczPj4Kc3RyZWFtCkJUMyAwIDAgMyA1MCA3MDAgVG1CVCAvRjEgMjQgVGYgKExlYXJuU3R1ZHkgQUkgLSBTYW1wbGUgU3R1ZHkgR3VpZGUpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iaiA8PC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwDY2OTU1ZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIxNCAwMDAwMCBuIAowMDAwMDAwMjYxIDAwMDAwIG4gCjAwMDAwMDAzODQgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDcgL1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDYzCiUlRU9G";

function parsePdfData(dataUrl: string): Uint8Array | string {
  if (!dataUrl) return "";
  if (dataUrl.startsWith("data:")) {
    try {
      const base64Index = dataUrl.indexOf(";base64,");
      if (base64Index !== -1) {
        const base64 = dataUrl.substring(base64Index + 8);
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
    } catch (e) {
      console.warn("Could not parse base64 dataUrl, passing raw string", e);
    }
  }
  return dataUrl;
}

export function PDFStudyReader() {
  // Screen size detection for responsive mobile drawers
  const [isMobile, setIsMobile] = useState<boolean>(() => 
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedPageTexts, setExtractedPageTexts] = useState<Record<number, string>>({});

  // IndexedDB Heavy PDF Storage States
  const [activeFileData, setActiveFileData] = useState<string | null>(null);
  const [loadingFileData, setLoadingFileData] = useState<boolean>(false);

  // Sidebars - Default closed on mobile, open on desktop
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => 
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => 
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [showMobileTools, setShowMobileTools] = useState<boolean>(false);

  const [leftTab, setLeftTab] = useState<"thumbnails" | "bookmarks" | "highlights" | "drawings">("bookmarks");
  const [rightTab, setRightTab] = useState<"ai" | "flashcards" | "timer">("ai");

  // Reading & Color Modes
  const [readingMode, setReadingMode] = useState<"single" | "facing">("single");
  const [colorMode, setColorMode] = useState<"normal" | "dark" | "eyeComfort">("normal");
  const [warmTint, setWarmTint] = useState<number>(30);
  const [fullscreen, setFullscreen] = useState<boolean>(false);

  // Interactive Tools & Annotations
  const [activeTool, setActiveTool] = useState<"select" | "highlighter" | "pen">("select");
  const [strokeColor, setStrokeColor] = useState<string>("#f59e0b");
  const [strokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{ x: number; y: number }>>([]);

  // Selection & Context Menu
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  // Sticky Note State
  const [newStickyText, setNewStickyText] = useState<string>("");

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>("");
  const [aiOutputMode, setAiOutputMode] = useState<"text" | "flashcards" | "mcqs">("text");
  const [aiGeneratedFlashcards, setAiGeneratedFlashcards] = useState<Array<{ question: string; answer: string }>>([]);
  const [aiGeneratedMCQs, setAiGeneratedMCQs] = useState<Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>>([]);

  // Study Timer
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [totalStudiedSeconds, setTotalStudiedSeconds] = useState<number>(0);

  // Recent Pages History & Modal
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
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Load heavy PDF file data from IndexedDB when active document changes
  useEffect(() => {
    if (!activeDocId) {
      setActiveFileData(null);
      return;
    }

    const currentDoc = docs.find(d => d.id === activeDocId);
    if (currentDoc && (currentDoc.fileDataUrl || currentDoc.fileData)) {
      setActiveFileData(currentDoc.fileDataUrl || currentDoc.fileData || null);
      return;
    }

    setLoadingFileData(true);
    setLoadingPdf(true);
    PdfDb.getPdfFile(activeDocId)
      .then((data) => {
        if (data) {
          setActiveFileData(data);
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

  // Load PDF into PDF.js Proxy
  useEffect(() => {
    if (!activeDoc) {
      setPdfProxy(null);
      setNumPages(0);
      setLoadingPdf(false);
      return;
    }

    if (loadingFileData) return;

    const rawData = activeFileData || activeDoc.fileDataUrl || activeDoc.fileData;
    if (!rawData) {
      setPdfProxy(null);
      setNumPages(0);
      setLoadingPdf(false);
      return;
    }

    setLoadingPdf(true);
    setPdfError(null);

    const pdfSource = parsePdfData(rawData);
    const loadingParams: any = typeof pdfSource === "string" 
      ? { url: pdfSource } 
      : { data: pdfSource };

    loadingParams.cMapUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "6.1.200"}/cmaps/`;
    loadingParams.cMapPacked = true;

    const loadingTask = pdfjsLib.getDocument(loadingParams);

    loadingTask.promise.then(
      (pdf) => {
        setPdfProxy(pdf);
        setNumPages(pdf.numPages);
        setLoadingPdf(false);

        if (!activeDoc.pageCount || activeDoc.pageCount !== pdf.numPages) {
          const updated = { ...activeDoc, pageCount: pdf.numPages };
          Storage.savePDFDocument(updated);
          refreshDocs();
        }

        // Extract text snippets from first 15 pages for AI context
        const textMap: Record<number, string> = {};
        const maxPagesToExtract = Math.min(pdf.numPages, 15);
        const textPromises = [];
        for (let i = 1; i <= maxPagesToExtract; i++) {
          textPromises.push(
            pdf.getPage(i).then(page => 
              page.getTextContent().then(tc => {
                textMap[i] = tc.items.map((item: any) => item.str).join(" ");
              })
            ).catch(() => {})
          );
        }
        Promise.all(textPromises).then(() => {
          setExtractedPageTexts(textMap);
        });
      },
      (err) => {
        console.error("PDF loading error:", err);
        setPdfError("Could not render PDF vector canvas. Please verify file format or try another PDF.");
        setLoadingPdf(false);
      }
    );
  }, [activeDocId, activeFileData, loadingFileData]);

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

  // Page Navigation
  const jumpToPage = (p: number) => {
    const validPage = Math.max(1, Math.min(p, numPages || 1));
    setCurrentPage(validPage);
  };

  // Fit width scale helper
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - (isMobile ? 24 : 64);
      // Standard A4 width is ~595 points
      const calculatedScale = Math.max(0.5, Math.min(2.0, containerWidth / 595.28));
      setZoomScale(Number(calculatedScale.toFixed(2)));
    }
  };

  // Auto-fit width on mobile load
  useEffect(() => {
    if (isMobile && containerRef.current) {
      handleFitWidth();
    }
  }, [isMobile, activeDocId]);

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
        bookmarks: [{ id: "bm_1", page: 1, title: "Start / Cover Page", color: "#8b5cf6" }],
        stickyNotes: [],
        drawings: [],
        questionFlags: []
      };

      Storage.savePDFDocument(newDoc);
      refreshDocs();
      if (!openDocIds.includes(newDoc.id)) {
        setOpenDocIds(prev => [...prev, newDoc.id]);
      }
      setActiveDocId(newDoc.id);
      setCurrentPage(1);
    };

    reader.readAsDataURL(file);
  };

  // Load Sample PDF Guide
  const handleLoadSamplePdf = () => {
    const sampleDoc: PDFDocument = {
      id: "pdf_sample_guide",
      title: "Sample Study Guide & Notes.pdf",
      courseName: "LearnStudy AI Material",
      fileSize: "0.15 MB",
      pageCount: 1,
      fileData: "data:application/pdf;base64," + SAMPLE_PDF_BASE64,
      fileDataUrl: "data:application/pdf;base64," + SAMPLE_PDF_BASE64,
      uploadedAt: new Date().toISOString(),
      highlights: [],
      bookmarks: [{ id: "bm_1", page: 1, title: "Start of Guide", color: "#8b5cf6" }],
      stickyNotes: [
        {
          id: "sn_sample",
          page: 1,
          text: "Welcome to LearnStudy AI PDF Reader! Use sticky notes, drawings, and AI Tutor to learn fast.",
          color: "#f59e0b",
          xPercent: 50,
          yPercent: 35,
          author: "Gemini AI",
          createdAt: new Date().toISOString(),
          expanded: true
        }
      ],
      drawings: [],
      questionFlags: []
    };

    Storage.savePDFDocument(sampleDoc);
    refreshDocs();
    if (!openDocIds.includes(sampleDoc.id)) {
      setOpenDocIds(prev => [...prev, sampleDoc.id]);
    }
    setActiveDocId(sampleDoc.id);
    setCurrentPage(1);
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

  // Delete Document
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
    const newBm = {
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
  const handleAddStickyNote = () => {
    if (!activeDoc || !newStickyText.trim()) return;

    const newNote: PDFStickyNote = {
      id: "sn_" + Date.now(),
      page: currentPage,
      text: newStickyText.trim(),
      color: strokeColor || "#f59e0b",
      xPercent: 50,
      yPercent: 40,
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

  // Text Selection Listener
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const text = sel.toString().trim();
      setSelectedText(text);
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionCoords({
          x: Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2)),
          y: Math.max(80, rect.top - 10)
        });
      } catch {
        setSelectionCoords(null);
      }
    } else {
      setSelectionCoords(null);
    }
  };

  // AI Assistant Action Handler
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

      if (action === "generate_flashcards") {
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

  // Save AI Flashcards to Bank
  const handleSaveFlashcardsToBank = (cards: Array<{ question: string; answer: string }>) => {
    cards.forEach(c => {
      const newFc: Flashcard = {
        id: "fc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        question: c.question,
        answer: c.answer,
        courseTitle: activeDoc?.courseName || "PDF Material",
        rating: "unrated",
        createdAt: new Date().toISOString()
      };
      Storage.saveFlashcard(newFc);
    });
    alert(`Saved ${cards.length} flashcards to your Flashcards Bank!`);
  };

  // Drawing Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "select") return;
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

  // Color Filter CSS
  const getColorModeStyle = () => {
    if (colorMode === "dark") {
      return "invert(0.92) hue-rotate(180deg) contrast(1.1)";
    }
    if (colorMode === "eyeComfort") {
      return `sepia(${warmTint / 100}) saturate(1.2) hue-rotate(-10deg)`;
    }
    return "none";
  };

  const activeStickyNotes = (activeDoc?.stickyNotes || []).filter(n => n.page === currentPage);
  const activeBookmarks = activeDoc?.bookmarks || [];

  // --------------------------------------------------------------------------
  // EMPTY STATE (NO OPEN PDF)
  // --------------------------------------------------------------------------
  if (!activeDoc || openDocIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-12 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">
              LearnStudy PDF Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              Upload textbook PDFs, lecture slides, or study guides to annotate, ask doubts, and generate AI flashcards.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shadow-purple-500/25 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
              <Upload className="w-4 h-4" />
              Upload PDF
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleLoadSamplePdf}
              className="bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              Try Sample PDF Guide
            </button>

            {docs.length > 0 && (
              <button
                onClick={() => setShowRecentModal(true)}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-extrabold text-xs px-6 py-3.5 rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Book className="w-4 h-4 text-purple-500" />
                Library ({docs.length})
              </button>
            )}
          </div>
        </div>

        {/* Library Modal */}
        {showRecentModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Your Study Documents
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
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-purple-400 bg-slate-50 dark:bg-zinc-950 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0">
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
  // MAIN WORKSPACE INTERFACE
  // --------------------------------------------------------------------------
  return (
    <div 
      className={`flex flex-col bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xl ${
        fullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "min-h-[750px]"
      }`}
      onMouseUp={handleTextSelection}
    >
      {/* HEADER & TABS BAR */}
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-30 shadow-xs">
        {/* Document Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto border-b border-slate-100 dark:border-zinc-850 scrollbar-none">
          {openDocIds.map(id => {
            const doc = docs.find(d => d.id === id);
            if (!doc) return null;
            const isActive = id === activeDocId;
            return (
              <div
                key={id}
                onClick={() => setActiveDocId(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-bold transition cursor-pointer border-t border-x shrink-0 ${
                  isActive
                    ? "bg-slate-100 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-purple-600 dark:text-purple-400"
                    : "bg-white dark:bg-zinc-900 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[140px]">{doc.title}</span>
                <button
                  onClick={(e) => handleCloseTab(id, e)}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <label className="p-1 px-2.5 rounded-t-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-purple-600 text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New PDF</span>
            <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleLoadSamplePdf}
            className="p-1 px-2.5 rounded-t-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sample PDF</span>
          </button>
        </div>

        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`p-2 rounded-xl transition shrink-0 ${
                leftSidebarOpen
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
              title="Study Sidebar"
            >
              <Columns className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                {activeDoc.title}
              </h1>
              <p className="text-[10px] text-slate-400 truncate">
                {numPages > 0 ? `${numPages} Pages` : "PDF Document"} • {activeDoc.courseName || "Uploaded PDF"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowMobileTools(!showMobileTools)}
              className={`p-2 rounded-xl transition md:hidden ${
                showMobileTools
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-600"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Display & View Tools"
            >
              <Palette className="w-4 h-4" />
            </button>

            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`p-2 rounded-xl transition flex items-center gap-1 ${
                rightSidebarOpen
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold"
                  : "bg-purple-600 text-white hover:bg-purple-500 font-bold shadow-xs"
              }`}
              title="AI Tutor & Tools"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">AI Tutor</span>
            </button>
          </div>
        </div>

        {/* Page Navigation & Zoom Sub-Bar */}
        <div className="bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <button
              onClick={() => jumpToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 border border-slate-200 dark:border-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <span>Page</span>
              <input
                type="number"
                value={currentPage}
                onChange={(e) => jumpToPage(parseInt(e.target.value, 10) || 1)}
                className="w-11 text-center bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg py-0.5 focus:outline-none text-xs font-bold"
              />
              <span className="text-slate-400">/ {numPages || 1}</span>
            </div>

            <button
              onClick={() => jumpToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 border border-slate-200 dark:border-zinc-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomScale(z => Math.max(0.5, z - 0.15))}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-extrabold w-10 text-center font-mono">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(z => Math.min(2.5, z + 0.15))}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitWidth}
              className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100"
            >
              Fit Width
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setReadingMode("single")}
                className={`p-1 rounded-lg transition ${readingMode === "single" ? "bg-purple-100 dark:bg-purple-950 text-purple-600" : "text-slate-400"}`}
                title="Single Page"
              >
                <Book className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingMode("facing")}
                className={`p-1 rounded-lg transition ${readingMode === "facing" ? "bg-purple-100 dark:bg-purple-950 text-purple-600" : "text-slate-400"}`}
                title="Facing Pages"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setColorMode("normal")}
                className={`p-1 rounded-lg transition ${colorMode === "normal" ? "bg-purple-100 dark:bg-purple-950 text-purple-600" : "text-slate-400"}`}
                title="Normal"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setColorMode("dark")}
                className={`p-1 rounded-lg transition ${colorMode === "dark" ? "bg-purple-100 dark:bg-purple-950 text-purple-600" : "text-slate-400"}`}
                title="Smart Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setColorMode("eyeComfort")}
                className={`p-1 rounded-lg transition ${colorMode === "eyeComfort" ? "bg-amber-100 dark:bg-amber-950 text-amber-600" : "text-slate-400"}`}
                title="Eye Comfort"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Tools Dropdown */}
        {showMobileTools && (
          <div className="md:hidden bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Reading Mode</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setReadingMode("single")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${readingMode === "single" ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600"}`}
                >
                  Single
                </button>
                <button
                  onClick={() => setReadingMode("facing")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${readingMode === "facing" ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600"}`}
                >
                  Facing
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Color Comfort</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setColorMode("normal")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorMode === "normal" ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600"}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setColorMode("dark")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorMode === "dark" ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600"}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setColorMode("eyeComfort")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorMode === "eyeComfort" ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600"}`}
                >
                  Warm
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebars */}
        {isMobile && (leftSidebarOpen || rightSidebarOpen) && (
          <div 
            onClick={() => { setLeftSidebarOpen(false); setRightSidebarOpen(false); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          />
        )}

        {/* LEFT SIDEBAR (Inline on Desktop, Drawer Overlay on Mobile) */}
        {leftSidebarOpen && (
          <aside className={`${
            isMobile 
              ? "fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-900 z-50 shadow-2xl flex flex-col"
              : "w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 z-20"
          }`}>
            {isMobile && (
              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Study Sidebar</span>
                <button onClick={() => setLeftSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-around border-b border-slate-100 dark:border-zinc-800 p-2 bg-slate-50 dark:bg-zinc-950/50">
              <button
                onClick={() => setLeftTab("bookmarks")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "bookmarks" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <BookmarkIcon className="w-4 h-4" />
                <span className="text-[10px]">Bookmarks</span>
              </button>

              <button
                onClick={() => setLeftTab("thumbnails")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "thumbnails" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Grid className="w-4 h-4" />
                <span className="text-[10px]">Pages</span>
              </button>

              <button
                onClick={() => setLeftTab("highlights")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "highlights" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <StickyNote className="w-4 h-4" />
                <span className="text-[10px]">Notes</span>
              </button>

              <button
                onClick={() => setLeftTab("drawings")}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  leftTab === "drawings" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[10px]">Markups</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {leftTab === "bookmarks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400">
                      Smart Bookmarks ({activeBookmarks.length})
                    </h3>
                    <button
                      onClick={handleAddBookmark}
                      className="bg-purple-600 hover:bg-purple-500 text-white p-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Page
                    </button>
                  </div>

                  {activeBookmarks.length > 0 ? (
                    <div className="space-y-2">
                      {activeBookmarks.map((bm) => (
                        <div
                          key={bm.id}
                          onClick={() => {
                            jumpToPage(bm.page);
                            if (isMobile) setLeftSidebarOpen(false);
                          }}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                            bm.page === currentPage
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 text-purple-900 dark:text-purple-200"
                              : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BookmarkIcon className="w-4 h-4 text-purple-500 shrink-0" />
                            <div>
                              <div className="text-xs font-bold">{bm.title}</div>
                              <div className="text-[10px] text-slate-400">Page {bm.page}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No bookmarks saved yet.</p>
                  )}
                </div>
              )}

              {leftTab === "thumbnails" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400">
                    Pages ({numPages})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: numPages || 1 }).map((_, i) => {
                      const pNum = i + 1;
                      const isCurr = pNum === currentPage;
                      return (
                        <div
                          key={pNum}
                          onClick={() => {
                            jumpToPage(pNum);
                            if (isMobile) setLeftSidebarOpen(false);
                          }}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                            isCurr
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20"
                              : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                          }`}
                        >
                          <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-1 flex items-center justify-center text-slate-400 text-xs font-bold">
                            P{pNum}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                            Page {pNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {leftTab === "highlights" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400">
                    Sticky Notes
                  </h3>
                  <div className="space-y-2">
                    {activeDoc.stickyNotes && activeDoc.stickyNotes.length > 0 ? (
                      activeDoc.stickyNotes.map(sn => (
                        <div
                          key={sn.id}
                          onClick={() => {
                            jumpToPage(sn.page);
                            if (isMobile) setLeftSidebarOpen(false);
                          }}
                          className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs space-y-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-700">
                            <span>Page {sn.page} Note</span>
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

              {leftTab === "drawings" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400">
                    Handwritten Markups ({activeDoc.drawings?.length || 0})
                  </h3>
                  {activeDoc.drawings && activeDoc.drawings.length > 0 ? (
                    <div className="space-y-2">
                      {activeDoc.drawings.map((ds, i) => (
                        <div
                          key={ds.id || i}
                          onClick={() => {
                            jumpToPage(ds.page);
                            if (isMobile) setLeftSidebarOpen(false);
                          }}
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

        {/* CENTER VIEWPORT */}
        <main 
          ref={containerRef}
          className="flex-1 overflow-auto flex flex-col items-center p-3 sm:p-6 relative bg-slate-200/50 dark:bg-zinc-950/80 w-full"
        >
          {/* Floating Annotation & Tools Bar */}
          <div className="sticky top-2 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-800 p-1.5 px-3 rounded-2xl shadow-lg flex items-center gap-2 mb-3 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTool("select")}
              className={`p-2 rounded-xl transition ${
                activeTool === "select" ? "bg-purple-600 text-white shadow-xs" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Select Tool"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool("highlighter")}
              className={`p-2 rounded-xl transition ${
                activeTool === "highlighter" ? "bg-amber-500 text-white shadow-xs" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Highlighter"
            >
              <StickyNote className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool("pen")}
              className={`p-2 rounded-xl transition ${
                activeTool === "pen" ? "bg-indigo-600 text-white shadow-xs" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              }`}
              title="Pen Draw Tool"
            >
              <PenTool className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-800 pl-2">
              {["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#000000"].map(c => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  className={`w-4 h-4 rounded-full transition transform hover:scale-110 ${
                    strokeColor === c ? "ring-2 ring-offset-1 ring-purple-500" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* PDF Canvas Container */}
          <div 
            className="relative shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 border border-slate-300 dark:border-zinc-800 max-w-full overflow-x-auto"
            style={{ filter: getColorModeStyle() }}
          >
            {loadingPdf && (
              <div className="p-8 sm:p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl min-w-[300px]">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">Rendering PDF Page Vector...</p>
              </div>
            )}

            {pdfError && (
              <div className="p-8 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl max-w-md">
                <p className="text-xs font-bold text-red-500">{pdfError}</p>
                <button onClick={handleLoadSamplePdf} className="text-xs bg-purple-600 text-white font-bold px-4 py-2 rounded-xl">
                  Try Sample PDF
                </button>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="block rounded-2xl bg-white max-w-full"
            />

            {readingMode === "facing" && (
              <canvas
                ref={facingCanvasRef}
                className="block rounded-2xl bg-white mt-4 border-t max-w-full"
              />
            )}

            <canvas
              ref={annotationCanvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`absolute inset-0 z-10 ${
                activeTool !== "select" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
              }`}
            />

            {activeStickyNotes.map(sn => (
              <div
                key={sn.id}
                style={{
                  top: `${sn.yPercent || 35}%`,
                  left: `${sn.xPercent || 50}%`,
                }}
                className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 p-2.5 bg-amber-200 text-amber-950 font-sans text-xs rounded-xl shadow-xl max-w-[200px] border border-amber-300 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 border-b border-amber-300/60 pb-1">
                  <span>Note</span>
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
                <p className="font-semibold leading-relaxed text-[11px]">{sn.text}</p>
              </div>
            ))}
          </div>

          {/* Sticky Note Bar */}
          <div className="mt-4 max-w-md w-full flex gap-2">
            <input
              type="text"
              value={newStickyText}
              onChange={(e) => setNewStickyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStickyNote()}
              placeholder="Drop a study sticky note on this page..."
              className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 px-4 py-2.5 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddStickyNote}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl transition shadow-xs cursor-pointer shrink-0"
            >
              Add Note
            </button>
          </div>
        </main>

        {/* RIGHT SIDEBAR (Inline on Desktop, Drawer Overlay on Mobile) */}
        {rightSidebarOpen && (
          <aside className={`${
            isMobile 
              ? "fixed top-0 bottom-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-900 z-50 shadow-2xl flex flex-col"
              : "w-80 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 z-20"
          }`}>
            {isMobile && (
              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> AI Tutor & Tools
                </span>
                <button onClick={() => setRightSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-around border-b border-slate-100 dark:border-zinc-800 p-2 bg-slate-50 dark:bg-zinc-950/50">
              <button
                onClick={() => setRightTab("ai")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "ai" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>AI Tutor</span>
              </button>

              <button
                onClick={() => setRightTab("flashcards")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "flashcards" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Cards</span>
              </button>

              <button
                onClick={() => setRightTab("timer")}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  rightTab === "timer" ? "text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Play className="w-4 h-4 text-emerald-500" />
                <span>Timer</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {rightTab === "ai" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      AI PDF Study Assistant
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ask doubts, simplify concepts, or generate flashcards.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => runAiAssistant("explain")}
                      className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      💡 Explain
                    </button>
                    <button
                      onClick={() => runAiAssistant("summarize")}
                      className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      📑 Summarize
                    </button>
                    <button
                      onClick={() => runAiAssistant("generate_mcqs")}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      🎯 Quiz Me
                    </button>
                    <button
                      onClick={() => runAiAssistant("generate_flashcards")}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs font-bold text-left hover:scale-[1.02] transition"
                    >
                      🎴 Flashcards
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ask any question about this page..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => runAiAssistant("ask_doubt")}
                      disabled={aiLoading}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask Gemini Tutor</span>
                        </>
                      )}
                    </button>
                  </div>

                  {aiOutputMode === "text" && aiResponse && (
                    <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-2xl text-xs space-y-2">
                      <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        AI Explanation
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                    </div>
                  )}

                  {aiOutputMode === "flashcards" && aiGeneratedFlashcards.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600">Generated Cards</span>
                        <button
                          onClick={() => handleSaveFlashcardsToBank(aiGeneratedFlashcards)}
                          className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg"
                        >
                          Save All
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

              {rightTab === "flashcards" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Flashcards & Practice
                  </h3>
                  <button
                    onClick={() => runAiAssistant("generate_flashcards")}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs py-3 rounded-2xl shadow-xs"
                  >
                    Generate Cards from Page {currentPage}
                  </button>
                </div>
              )}

              {rightTab === "timer" && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl text-white text-center space-y-3 shadow-lg">
                    <div className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                      Study Focus Timer
                    </div>
                    <div className="text-3xl font-black font-mono tracking-tight">
                      {Math.floor(timerSeconds / 60).toString().padStart(2, "0")}:
                      {(timerSeconds % 60).toString().padStart(2, "0")}
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        className="bg-white text-indigo-900 font-black text-xs px-4 py-2 rounded-xl shadow-xs transition"
                      >
                        {timerRunning ? "Pause" : "Start"}
                      </button>
                      <button
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(25 * 60);
                        }}
                        className="bg-white/20 text-white font-bold text-xs p-2 rounded-xl transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
                    <div className="font-bold text-slate-800 dark:text-zinc-200">Reading Progress</div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Time Studied:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{Math.floor(totalStudiedSeconds / 60)} min</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Completed:</span>
                      <span className="font-bold text-purple-600">{Math.round((currentPage / (numPages || 1)) * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* SELECTION POPUP MENU */}
      {selectionCoords && selectedText && (
        <div
          style={{
            top: `${selectionCoords.y}px`,
            left: `${selectionCoords.x}px`,
          }}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 border border-slate-700"
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
