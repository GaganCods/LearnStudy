import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, FileText, MessageSquare, BrainCircuit, Play, 
  Send, Copy, Check, Download, RefreshCw, HelpCircle, 
  AlertTriangle, Key, ChevronRight, CheckCircle, XCircle, ChevronLeft, Loader2,
  Trash2, ArrowLeft, UploadCloud, FileUp
} from "lucide-react";
import { 
  hasGeminiKey, 
  generateStudyMaterial, 
  generateLectureQuiz, 
  solveLectureDoubt, 
  StudyQuizQuestion, 
  ChatMessage 
} from "../utils/gemini";
import { Storage } from "../utils/storage";
import { useToast } from "./ToastContext";

interface AIStudyCompanionProps {
  videoId: string;
  videoTitle: string;
  channelName: string;
  onOpenKeyModal: () => void;
  onClose?: () => void; // Optional callback when closed as a side panel
  initialTab?: "hub" | "chat" | "quiz";
  initialMaterialId?: string | null;
  initialChatMessage?: string;
}

type CompanionTab = "hub" | "chat" | "quiz";

interface MaterialOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
}

export function AIStudyCompanion({ 
  videoId, 
  videoTitle, 
  channelName,
  onOpenKeyModal,
  onClose,
  initialTab,
  initialMaterialId,
  initialChatMessage
}: AIStudyCompanionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CompanionTab>("hub");
  const [hasKey, setHasKey] = useState(hasGeminiKey());
  
  // Materials Hub State
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [materialContent, setMaterialContent] = useState<string>("");
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [copiedMaterial, setCopiedMaterial] = useState(false);

  // Image Notes Upload State
  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat/Doubt States
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quiz States
  const [quizQuestions, setQuizQuestions] = useState<StudyQuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Global Error banner
  const [apiError, setApiError] = useState<string | null>(null);

  // Material Options List
  const materialOptions: MaterialOption[] = [
    {
      id: "complete",
      title: "Complete Notes",
      description: "Generates in-depth, structured outline notes with glossary & FACT tables.",
      emoji: "📚",
      icon: <FileText className="w-5 h-5 text-blue-500" />
    },
    {
      id: "short",
      title: "Short Notes",
      description: "Condenses the whole lecture into a high-yield under-500-word quick summary.",
      emoji: "⚡",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />
    },
    {
      id: "revision",
      title: "Revision Guide",
      description: "Memory hacks, mnemonic devices, lists, and visual analogies for quick cramming.",
      emoji: "🧠",
      icon: <BrainCircuit className="w-5 h-5 text-indigo-500" />
    },
    {
      id: "flashcards",
      title: "Flashcards Set",
      description: "Extracts 6 to 10 question & answer pairs formatted in an academic grid.",
      emoji: "🎴",
      icon: <HelpCircle className="w-5 h-5 text-purple-500" />
    },
    {
      id: "questions",
      title: "Important Questions",
      description: "Generate 5-8 typical college exam questions accompanied by step-by-step master answers.",
      emoji: "📝",
      icon: <HelpCircle className="w-5 h-5 text-emerald-500" />
    },
    {
      id: "mindmap",
      title: "Mind Map Outline",
      description: "Builds a branching tree representation of concepts with visual emojis.",
      emoji: "🗺️",
      icon: <BrainCircuit className="w-5 h-5 text-cyan-500" />
    },
    {
      id: "formulas",
      title: "Formula Sheet",
      description: "Extracts key mathematical/scientific formulas, derivations, variables and SI units.",
      emoji: "📐",
      icon: <FileText className="w-5 h-5 text-pink-500" />
    },
    {
      id: "improve",
      title: "Improve Draft Notes",
      description: "Feeds your current active notes draft to AI to restructure, explain, and expand.",
      emoji: "✨",
      icon: <Sparkles className="w-5 h-5 text-violet-500" />
    },
    {
      id: "image",
      title: "Slide / Image Notes",
      description: "Upload a lecture slide, diagram, or page. AI transcribes and adds in-depth academic notes.",
      emoji: "📷",
      icon: <UploadCloud className="w-5 h-5 text-sky-500" />
    }
  ];

  // Refresh key state when videoId changes
  useEffect(() => {
    setHasKey(hasGeminiKey());
    setApiError(null);
    setSelectedMaterial(null);
    setMaterialContent("");
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);

    // Load cached summary or chat for backward compatibility
    const cachedSummary = localStorage.getItem(`learnstudy_summary_${videoId}`);
    if (cachedSummary) {
      setSelectedMaterial("complete");
      setMaterialContent(cachedSummary);
    }

    // Load cached chat
    try {
      const cachedChat = localStorage.getItem(`learnstudy_chat_${videoId}`);
      setChatHistory(cachedChat ? JSON.parse(cachedChat) : []);
    } catch {
      setChatHistory([]);
    }

    // Load cached quiz
    try {
      const cachedQuiz = localStorage.getItem(`learnstudy_quiz_${videoId}`);
      setQuizQuestions(cachedQuiz ? JSON.parse(cachedQuiz) : []);
    } catch {
      setQuizQuestions([]);
    }

    // Reset quiz runtime states
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
  }, [videoId]);

  // Handle deep-linking initial properties
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialMaterialId !== undefined) {
      setSelectedMaterial(initialMaterialId);
      setMaterialContent("");
    }
    if (initialChatMessage) {
      setChatInput(initialChatMessage);
    }
  }, [videoId, initialTab, initialMaterialId, initialChatMessage]);

  // Hook into the external "studytube-improve-notes" event to bridge InteractiveNotes with the AI Companion
  useEffect(() => {
    const handleExternalImprove = (e: Event) => {
      const customEvent = e as CustomEvent;
      const notes = customEvent.detail?.noteText || "";
      
      // Open AI companion, switch to Materials Hub, select "improve", and run!
      setActiveTab("hub");
      setSelectedMaterial("improve");
      setMaterialContent("");
      
      if (!notes.trim()) {
        toast.warning("Empty Notes Draft", "Take some draft notes in the text area first so the AI can improve them!");
        return;
      }

      toast.info("Importing Notes", "Your current lecture notes draft has been successfully imported into the AI Notes Hub.");
    };

    window.addEventListener("studytube-improve-notes", handleExternalImprove);
    return () => window.removeEventListener("studytube-improve-notes", handleExternalImprove);
  }, [toast]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  // Periodically verify key state
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentHasKey = hasGeminiKey();
      if (currentHasKey !== hasKey) {
        setHasKey(currentHasKey);
        if (currentHasKey) setApiError(null);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [hasKey]);

  // Simple Markdown Parser
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Headers
    formatted = formatted.replace(/^##### (.*$)/gim, '<h6 class="text-[11px] font-black text-slate-900 dark:text-zinc-100 mt-2 mb-0.5">$1</h6>');
    formatted = formatted.replace(/^#### (.*$)/gim, '<h5 class="text-xs font-black text-slate-900 dark:text-zinc-100 mt-2.5 mb-1">$1</h5>');
    formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-3.5 mb-1">$1</h4>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="text-base font-black text-slate-950 dark:text-zinc-50 mt-4.5 mb-2 border-b border-slate-100 dark:border-zinc-850 pb-1">$1</h3>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-slate-950 dark:text-zinc-50 mt-5.5 mb-3 border-b-2 border-slate-200 dark:border-zinc-800 pb-1.5">$1</h2>');
    
    // Bold / Italics
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950 dark:text-zinc-50">$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Tables
    // Matches markdown table syntax and replaces with simple custom structured classes
    formatted = formatted.replace(/\|(.+)\|/g, (match) => {
      // Avoid parsing header split rows: | --- | --- |
      if (match.includes("---")) {
        return "";
      }
      const cells = match.split("|").slice(1, -1);
      const rowContent = cells.map(cell => `<td class="border border-slate-200 dark:border-zinc-800 px-3 py-1.5 text-[11px] text-slate-700 dark:text-zinc-300">${cell.trim()}</td>`).join("");
      return `<tr class="border-b border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">${rowContent}</tr>`;
    });
    // Wrap any table structure in tables and tbody tags
    if (formatted.includes("</tr>")) {
      formatted = formatted.replace(/(<tr[\s\S]*?<\/tr>)/g, '<table class="min-w-full border-collapse border border-slate-200 dark:border-zinc-800 my-3"><tbody>$1</tbody></table>');
    }

    // Inline Code
    formatted = formatted.replace(/`(.*?)`/g, '<code class="font-mono bg-slate-100 dark:bg-zinc-850 text-red-500 dark:text-red-400 px-1 py-0.5 rounded text-[11px]">$1</code>');
    
    // Bullet Lists
    formatted = formatted.replace(/^\s*-\s+(.*$)/gim, '<li class="list-disc list-inside ml-2.5 my-1 text-slate-700 dark:text-zinc-300 leading-relaxed">$1</li>');
    formatted = formatted.replace(/^\s*\*\s+(.*$)/gim, '<li class="list-disc list-inside ml-2.5 my-1 text-slate-700 dark:text-zinc-300 leading-relaxed">$1</li>');
    
    // Paragraphs / splits
    formatted = formatted.split("\n").map(para => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<l") || trimmed.startsWith("<u") || trimmed.startsWith("<p") || trimmed.startsWith("<t")) {
        return para;
      }
      return `<p class="my-2.5 text-slate-700 dark:text-zinc-300 leading-relaxed">${para}</p>`;
    }).join("\n");

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formatted }} 
        className="text-xs space-y-2 text-slate-800 dark:text-zinc-200 select-text" 
      />
    );
  };

  // --- STUDY GENERATORS ACTIONS ---

  const handleGenerateMaterial = async (type: string) => {
    setLoadingMaterial(true);
    setApiError(null);
    const draftNotes = Storage.getNoteForVideo(videoId);

    try {
      const result = await generateStudyMaterial(
        videoTitle,
        channelName,
        type,
        draftNotes,
        imageBase64 || undefined,
        imageMime
      );

      setMaterialContent(result);
      if (type === "complete") {
        localStorage.setItem(`learnstudy_summary_${videoId}`, result);
      }
    } catch (err: any) {
      setApiError(err.message || "Failed to generate AI Study Material. Please verify your connection.");
    } finally {
      setLoadingMaterial(false);
    }
  };

  const handleCopyMaterial = () => {
    if (!materialContent) return;
    navigator.clipboard.writeText(materialContent);
    setCopiedMaterial(true);
    setTimeout(() => setCopiedMaterial(false), 2000);
    toast.success("Copied to Clipboard", "The study material has been copied to your clipboard.");
  };

  const handleMergeWithNotes = (overwrite = false) => {
    if (!materialContent) return;
    const currentNotes = Storage.getNoteForVideo(videoId);
    
    let updatedNotes = "";
    if (overwrite) {
      updatedNotes = materialContent;
    } else {
      const divider = currentNotes.trim() ? "\n\n---\n\n## AI Study Content ✨\n\n" : "## AI Study Content ✨\n\n";
      updatedNotes = currentNotes + divider + materialContent;
    }

    Storage.saveNoteForVideo(videoId, updatedNotes);
    window.dispatchEvent(new CustomEvent("studytube-save-notes"));
    
    toast.success(
      overwrite ? "Notes Replaced" : "Notes Appended", 
      overwrite 
        ? "Your lecture notes have been fully replaced with the polished AI notes!"
        : "AI study material has been appended to your Lecture Notes pane successfully."
    );
  };

  const handleExportAsFile = () => {
    if (!materialContent) return;
    const typeLabel = selectedMaterial?.toUpperCase() || "MATERIAL";
    const filename = `LearnStudy_${typeLabel}_${videoId}.md`;
    const content = `# LearnStudy ${typeLabel} ✨\n\n**Video Lecture:** ${videoTitle}\n**Creator:** ${channelName}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n${materialContent}`;
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- DRAG AND DROP FILE HANDLERS ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File", "Only image files (PNG, JPG, WEBP) are supported for slide analysis.");
      return;
    }
    setImageFile(file);
    setImageMime(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      setImagePreview(resultStr);
      // Strip off "data:image/png;base64," header
      const base64Data = resultStr.split(",")[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // --- DOUBT SOLVER CHAT SEND ACTIONS ---

  const handleSendChat = async () => {
    if (!chatInput.trim() || loadingChat) return;
    
    const userMessage = chatInput.trim();
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: "user", text: userMessage }];
    setChatHistory(updatedHistory);
    setChatInput("");
    setLoadingChat(true);
    setApiError(null);

    const studentNotes = Storage.getNoteForVideo(videoId);

    try {
      const response = await solveLectureDoubt(
        videoTitle,
        channelName,
        studentNotes,
        chatHistory,
        userMessage
      );
      const newHistory: ChatMessage[] = [...updatedHistory, { role: "model", text: response }];
      setChatHistory(newHistory);
      localStorage.setItem(`learnstudy_chat_${videoId}`, JSON.stringify(newHistory));
    } catch (err: any) {
      setApiError(err.message || "Failed to solve doubt. Please check API key.");
      setChatHistory(chatHistory);
      setChatInput(userMessage);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    localStorage.removeItem(`learnstudy_chat_${videoId}`);
    toast.success("Chat Cleared", "AI tutor discussion history has been cleared.");
  };

  // --- MASTERY QUIZ ACTIONS ---

  const handleGenerateQuiz = async () => {
    setLoadingQuiz(true);
    setApiError(null);
    const studentNotes = Storage.getNoteForVideo(videoId);

    try {
      const result = await generateLectureQuiz(videoTitle, channelName, studentNotes);
      setQuizQuestions(result);
      localStorage.setItem(`learnstudy_quiz_${videoId}`, JSON.stringify(result));
      
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setQuizSubmitted(false);
      setQuizScore(0);
      setQuizCompleted(false);
    } catch (err: any) {
      setApiError(err.message || "Failed to generate concept quiz. Please check key.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleQuizOptionSelect = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedOption(idx);
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null || quizSubmitted) return;
    
    setQuizSubmitted(true);
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (selectedOption === currentQuestion.correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedOption(null);
    setQuizSubmitted(false);

    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Dynamic Header & Actions Bar */}
      <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-indigo-500 to-blue-500 text-white p-2 rounded-2xl shadow-sm relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-zinc-50 leading-none">
              LearnStudy AI Notes Hub
            </h2>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-1 block">
              Generate elite study materials & tutoring.
            </span>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-850 select-none">
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === "hub" ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Study Materials
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === "chat" ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Doubt Solver
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === "quiz" ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Interactive Quiz
          </button>
        </div>

        {/* Close Button if requested as a drawer */}
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Global Connection / API Key Warnings */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] p-3.5 rounded-2xl flex items-start gap-3 shadow-sm mb-4 shrink-0">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <span className="font-extrabold block text-xs">AI Engine Interrupted</span>
            <span className="leading-relaxed block mt-0.5 text-[11px]">{apiError}</span>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <button
                onClick={() => {
                  setApiError(null);
                  if (activeTab === "hub" && selectedMaterial) {
                    handleGenerateMaterial(selectedMaterial);
                  } else if (activeTab === "chat") {
                    handleSendChat();
                  } else if (activeTab === "quiz") {
                    handleGenerateQuiz();
                  }
                }}
                className="text-xs font-extrabold bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Request
              </button>
              <button 
                onClick={onOpenKeyModal}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Update API Key <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasKey ? (
          /* Locked State Onboarding Banner */
          <div className="py-8 text-center bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/60 dark:border-zinc-850 p-6 flex flex-col items-center max-w-md mx-auto my-auto">
            <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full border border-indigo-500/15 mb-3">
              <Key className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">Connect Gemini API</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 leading-relaxed">
              Unlock the complete AI Study Materials Generator suite, interactive doubt clearing, and customized concept quizzes by adding your Gemini API key.
            </p>
            <div className="flex items-center gap-3 mt-5 w-full">
              <button
                onClick={onOpenKeyModal}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md shadow-indigo-500/15 cursor-pointer"
              >
                Connect Key
              </button>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                Get Free Key
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* 1. AI STUDY MATERIALS GENERATORS HUB */}
            {activeTab === "hub" && (
              <div className="h-full flex flex-col">
                {selectedMaterial === null ? (
                  /* Grid Menu of Study Options */
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-4">
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        ✨ Watch Once, Master Instantly
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Choose an AI study model below to extract high-yield, formatted educational documents, cheat sheets, flashcards, or image-to-text breakdowns.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                      {materialOptions.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSelectedMaterial(opt.id);
                            setMaterialContent("");
                            setImageFile(null);
                            setImagePreview(null);
                            setImageBase64(null);
                          }}
                          className="group border border-slate-150 dark:border-zinc-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 p-3 rounded-2xl cursor-pointer transition duration-150 flex items-start gap-3 text-left relative"
                        >
                          <div className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-xl group-hover:scale-105 transition-transform">
                            {opt.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5 leading-none mt-0.5">
                              <span>{opt.title}</span>
                              <span className="text-sm">{opt.emoji}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-snug line-clamp-2">
                              {opt.description}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-700 absolute right-3 top-3.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Active Material Generator Window */
                  <div className="h-full flex flex-col">
                    {/* Back header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-2 mb-3">
                      <button
                        onClick={() => setSelectedMaterial(null)}
                        className="text-xs font-extrabold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 px-2.5 py-1 rounded-lg border border-slate-150 dark:border-zinc-850 transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Materials
                      </button>
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {materialOptions.find(o => o.id === selectedMaterial)?.title}
                      </span>
                    </div>

                    {/* Generator Prompt / Input States */}
                    {!materialContent && !loadingMaterial && (
                      <div className="flex-1 flex flex-col justify-center items-center py-6 text-center max-w-md mx-auto space-y-4">
                        
                        {/* 1. Custom Image Notes Drag Zone */}
                        {selectedMaterial === "image" ? (
                          <div className="w-full space-y-4">
                            <div
                              onDragEnter={handleDrag}
                              onDragOver={handleDrag}
                              onDragLeave={handleDrag}
                              onDrop={handleDrop}
                              onClick={() => fileInputRef.current?.click()}
                              className={`w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition ${
                                dragActive 
                                  ? "border-indigo-500 bg-indigo-500/5" 
                                  : imagePreview 
                                    ? "border-emerald-500/40 bg-slate-50/50" 
                                    : "border-slate-300 hover:border-indigo-500/70 bg-slate-50/30 dark:border-zinc-800"
                              }`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                              />

                              {imagePreview ? (
                                <div className="space-y-2 w-full flex flex-col items-center">
                                  <img 
                                    src={imagePreview} 
                                    className="max-h-24 object-contain rounded-lg border border-slate-200 shadow-sm" 
                                    alt="Slide Preview" 
                                  />
                                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    ✓ {imageFile?.name} loaded successfully
                                  </div>
                                  <div className="text-[9px] text-slate-400">Click or drag another to change</div>
                                </div>
                              ) : (
                                <>
                                  <FileUp className="w-10 h-10 text-slate-300 dark:text-zinc-700 animate-bounce mb-2" />
                                  <h4 className="text-xs font-black text-slate-700 dark:text-zinc-300">Drag & Drop Lecture Slide Image</h4>
                                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 max-w-[250px] leading-snug">
                                    Drop a classroom slide, textbook page, screenshot, or diagram here to transcribe and extract.
                                  </p>
                                  <span className="text-[9px] bg-slate-200/50 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded font-bold mt-3">
                                    Choose local image
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => handleGenerateMaterial("image")}
                              disabled={!imageBase64}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-zinc-850 disabled:text-slate-400 text-white font-extrabold text-xs py-3 rounded-xl transition shadow shadow-indigo-600/10 cursor-pointer"
                            >
                              ✨ Analyze & Transcribe Slide Notes
                            </button>
                          </div>
                        ) : selectedMaterial === "improve" ? (
                          /* 2. Custom Improve Notes Layout */
                          <div className="w-full space-y-4 text-left">
                            <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-150 dark:border-zinc-850 space-y-2">
                              <h4 className="text-xs font-black text-slate-700 dark:text-zinc-300">Active Lecture Draft Notes Preview</h4>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
                                We will take your current notes written on this lecture, restructure them, explain any bullet points with rich context, correct typos, and return pristine finished study guides.
                              </p>
                              
                              <div className="max-h-24 overflow-y-auto p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] text-slate-500 italic">
                                {Storage.getNoteForVideo(videoId)?.trim() || "(Your draft notes are empty! Write some lecture notes in the text area below first, or click '✨ Improve Notes' in the toolbar.)"}
                              </div>
                            </div>

                            <button
                              onClick={() => handleGenerateMaterial("improve")}
                              disabled={!Storage.getNoteForVideo(videoId)?.trim()}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-zinc-850 disabled:text-slate-400 text-white font-extrabold text-xs py-3 rounded-xl transition shadow shadow-indigo-600/10 cursor-pointer text-center"
                            >
                              ✨ Restructure & Polish Draft Notes
                            </button>
                          </div>
                        ) : (
                          /* 3. Standard Text Generators Layout */
                          <div className="space-y-4">
                            <FileText className="w-12 h-12 text-slate-200 dark:text-zinc-850 mx-auto" />
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                                Synthesize {materialOptions.find(o => o.id === selectedMaterial)?.title}
                              </h4>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
                                Our AI system will process the video lecture "{videoTitle}" to assemble professional formatted {selectedMaterial} reference material.
                              </p>
                            </div>

                            <button
                              onClick={() => handleGenerateMaterial(selectedMaterial)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow shadow-indigo-600/15"
                            >
                              <Sparkles className="w-4 h-4 animate-pulse" />
                              <span>Generate Study Material</span>
                            </button>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Loading study material state */}
                    {loadingMaterial && (
                      <div className="flex-1 flex flex-col justify-center items-center py-10 space-y-4 max-w-sm mx-auto text-center select-none">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-widest animate-pulse">AI Synthesizing Outline</h4>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                            Reading lecture facts, modeling equations, and drafting customized Markdown study files. This takes about 8 to 15 seconds.
                          </p>
                        </div>
                        {/* Interactive Study Tips */}
                        <div className="p-3 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-150 dark:border-zinc-850 text-[10px] text-slate-500 italic mt-4">
                          💡 <strong>Study Tip:</strong> Active recall and repeating concepts over spaced time intervals improves retention up to 150%!
                        </div>
                      </div>
                    )}

                    {/* Output study material rendering */}
                    {materialContent && !loadingMaterial && (
                      <div className="flex-1 bg-slate-50 dark:bg-zinc-950/45 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 space-y-3 flex flex-col min-h-0">
                        {/* Output Actions Toolbar */}
                        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-850 pb-2 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            AI Generation Complete
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={handleCopyMaterial}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 transition text-[10px] font-bold flex items-center gap-1"
                              title="Copy markdown to clipboard"
                            >
                              {copiedMaterial ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedMaterial ? "Copied" : "Copy"}</span>
                            </button>

                            {selectedMaterial === "improve" ? (
                              <>
                                <button
                                  onClick={() => handleMergeWithNotes(true)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-indigo-600 dark:text-indigo-400 font-extrabold transition text-[10px] flex items-center gap-1"
                                  title="Replace your current draft notes with improved"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Replace Draft</span>
                                </button>
                                <button
                                  onClick={() => handleMergeWithNotes(false)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 transition text-[10px] font-bold flex items-center gap-1"
                                  title="Append improved notes to your current draft notes"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Merge/Append</span>
                                </button>
                              </>
                            ) : (
                              <button
                                  onClick={() => handleMergeWithNotes(false)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-indigo-600 dark:text-indigo-400 font-extrabold transition text-[10px] flex items-center gap-1"
                                  title="Append this to your lecture notes"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span>Add to Notes</span>
                              </button>
                            )}

                            <button
                              onClick={handleExportAsFile}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 transition text-[10px] font-bold flex items-center gap-1"
                              title="Export study guide markdown"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Export</span>
                            </button>

                            <button
                              onClick={() => handleGenerateMaterial(selectedMaterial)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-400 transition"
                              title="Regenerate material"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Parsed Output Box */}
                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin max-h-[350px]">
                          {renderMarkdown(materialContent)}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* 2. DOUBT SOLVER INTERACTIVE CHAT TAB */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-[400px] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-zinc-950/45">
                
                {/* Discussion Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto select-none py-4">
                      <MessageSquare className="w-9 h-9 text-slate-300 dark:text-zinc-700 mb-2" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300">Live Doubt Solver Room</h4>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">
                        Ask any conceptual question, query math derivations, or request real-world applications. Your AI tutor will answer instantly.
                      </p>

                      {/* Quick query presets */}
                      <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                        {[
                          "Explain the main theorem",
                          "Identify key scientific formulas",
                          "Give 3 real-world applications"
                        ].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setChatInput(tag)}
                            className="text-[10px] bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-850 px-2.5 py-1 rounded-full text-slate-600 dark:text-zinc-300 font-semibold transition"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Interactive Chat bubble loop */}
                      {chatHistory.map((msg, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role !== "user" && (
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-500/15">
                              ✨
                            </div>
                          )}
                          <div 
                            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-normal select-text ${
                              msg.role === "user" 
                                ? "bg-indigo-600 text-white rounded-tr-none" 
                                : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-150 dark:border-zinc-850 rounded-tl-none shadow-sm"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <span className="whitespace-pre-wrap font-medium">{msg.text}</span>
                            ) : (
                              renderMarkdown(msg.text)
                            )}
                          </div>
                        </div>
                      ))}
                      {loadingChat && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            ✨
                          </div>
                          <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Tutor drafting explanation...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </>
                  )}
                </div>

                {/* Input Controls Bar */}
                <div className="p-2.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
                  {chatHistory.length > 0 && (
                    <button
                      onClick={handleClearChat}
                      className="p-1.5 text-slate-400 hover:text-red-500 text-[10px] font-bold shrink-0 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition"
                      title="Clear history"
                    >
                      Clear
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder="Ask a question about this lecture..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChat();
                    }}
                    disabled={loadingChat}
                    className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || loadingChat}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-zinc-850 disabled:text-slate-400 text-white font-bold p-2.5 rounded-xl transition shrink-0 cursor-pointer shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            )}

            {/* 3. MASTERY CONCEPT QUIZ TAB */}
            {activeTab === "quiz" && (
              <div className="space-y-4">
                {quizQuestions.length === 0 ? (
                  /* Generate Quiz Button State */
                  <div className="text-center py-10 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/50 dark:border-zinc-850 p-6 max-w-md mx-auto my-auto">
                    <BrainCircuit className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Lecture Mastery Quiz</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
                      Evaluate your comprehension with 3 to 5 conceptual multiple-choice questions custom-built from the lecture text and active student notes draft.
                    </p>
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={loadingQuiz}
                      className="mt-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-zinc-850 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow shadow-indigo-600/10"
                    >
                      {loadingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Quiz...</span>
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-4 h-4" />
                          <span>Generate Concept Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : quizCompleted ? (
                  /* Quiz Completed Review Screen */
                  <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/50 dark:border-zinc-850 p-6 max-w-md mx-auto text-center space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-emerald-500/20">
                      🎓
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-zinc-50">Syllabus Mastered!</h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">You completed the diagnostic concepts quiz.</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 rounded-2xl p-4 flex justify-around items-center shadow-sm">
                      <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-zinc-50">{quizScore} / {quizQuestions.length}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Correct Answers</div>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800" />
                      <div>
                        <div className="text-2xl font-black text-indigo-500">{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Comprehension</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleResetQuiz}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition shadow"
                      >
                        Retry Quiz
                      </button>
                      <button
                        onClick={handleGenerateQuiz}
                        className="flex-1 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-bold py-2.5 rounded-xl transition"
                      >
                        New Questions
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Quiz Slide */
                  <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-850 pb-2.5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        QUESTION {currentQuestionIndex + 1} OF {quizQuestions.length}
                      </span>
                      <button
                        onClick={handleGenerateQuiz}
                        className="text-[9px] text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 font-bold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Skip / New Quiz
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-50 leading-snug">
                        {quizQuestions[currentQuestionIndex].question}
                      </h3>

                      {/* Options Block */}
                      <div className="space-y-2">
                        {quizQuestions[currentQuestionIndex].options.map((opt, oIdx) => {
                          let btnStyle = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950";
                          if (selectedOption === oIdx && !quizSubmitted) {
                            btnStyle = "bg-indigo-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30";
                          } else if (quizSubmitted) {
                            const isCorrect = oIdx === quizQuestions[currentQuestionIndex].correctIndex;
                            const isSelected = oIdx === selectedOption;
                            if (isCorrect) {
                              btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30";
                            } else if (isSelected) {
                              btnStyle = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 ring-1 ring-red-500/30";
                            } else {
                              btnStyle = "bg-white/50 dark:bg-zinc-900/50 border-slate-250/30 dark:border-zinc-900 opacity-65";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleQuizOptionSelect(oIdx)}
                              disabled={quizSubmitted}
                              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all ${btnStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-150/60 dark:bg-zinc-800 text-[10px] font-black flex items-center justify-center text-slate-500 shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanations & Next Button */}
                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-zinc-850 flex flex-col gap-2.5">
                      {!quizSubmitted ? (
                        <button
                          onClick={handleQuizSubmit}
                          disabled={selectedOption === null}
                          className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 disabled:bg-slate-150 dark:disabled:bg-zinc-800 disabled:text-slate-400 text-white dark:text-zinc-950 font-bold text-xs py-3 rounded-xl transition"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          {/* Rich Explanation text */}
                          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5 space-y-1.5">
                            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 select-none">
                              <HelpCircle className="w-3.5 h-3.5" />
                              Tutor Explanation
                            </div>
                            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
                              {quizQuestions[currentQuestionIndex].explanation}
                            </p>
                          </div>

                          <button
                            onClick={handleNextQuizQuestion}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1 shadow cursor-pointer"
                          >
                            <span>{currentQuestionIndex + 1 === quizQuestions.length ? "Complete Quiz" : "Next Question"}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
