import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, FileText, MessageSquare, BrainCircuit, Play, 
  Send, Copy, Check, Download, RefreshCw, HelpCircle, 
  AlertTriangle, Key, ChevronRight, CheckCircle, XCircle, ChevronLeft, Loader2
} from "lucide-react";
import { 
  hasGeminiKey, 
  generateLectureSummary, 
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
}

type CompanionTab = "summary" | "chat" | "quiz";

export function AIStudyCompanion({ 
  videoId, 
  videoTitle, 
  channelName,
  onOpenKeyModal 
}: AIStudyCompanionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CompanionTab>("summary");
  const [hasKey, setHasKey] = useState(hasGeminiKey());
  
  // Summary States
  const [summary, setSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

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

  // Refresh key state when videoId changes
  useEffect(() => {
    setHasKey(hasGeminiKey());
    setApiError(null);
    
    // Clear state or load saved AI content if we store them in local storage.
    // For optimal local feel, let's load cached summary for this video if available.
    const cachedSummary = localStorage.getItem(`learnstudy_summary_${videoId}`);
    setSummary(cachedSummary || "");

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

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  // Handle key modal callback checks
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

  // Helper to parse markdown
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Headers
    formatted = formatted.replace(/^#### (.*$)/gim, '<h5 class="text-xs font-black text-slate-900 dark:text-zinc-100 mt-2.5 mb-1">$1</h5>');
    formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-3.5 mb-1">$1</h4>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="text-base font-black text-slate-950 dark:text-zinc-50 mt-4.5 mb-2 border-b border-slate-100 dark:border-zinc-800 pb-1">$1</h3>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-slate-950 dark:text-zinc-50 mt-5.5 mb-3 border-b-2 border-slate-200 dark:border-zinc-800 pb-1.5">$1</h2>');
    
    // Bold / Italics
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950 dark:text-zinc-50">$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Inline Code
    formatted = formatted.replace(/`(.*?)`/g, '<code class="font-mono bg-slate-100 dark:bg-zinc-850 text-red-500 dark:text-red-400 px-1 py-0.5 rounded text-[11px]">$1</code>');
    
    // Bullet Lists
    formatted = formatted.replace(/^\s*-\s+(.*$)/gim, '<li class="list-disc list-inside ml-2 my-1 text-slate-700 dark:text-zinc-300 leading-relaxed">$1</li>');
    formatted = formatted.replace(/^\s*\*\s+(.*$)/gim, '<li class="list-disc list-inside ml-2 my-1 text-slate-700 dark:text-zinc-300 leading-relaxed">$1</li>');
    
    // Paragraphs / splits
    formatted = formatted.split("\n").map(para => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<l") || trimmed.startsWith("<u") || trimmed.startsWith("<p")) {
        return para;
      }
      return `<p class="my-2 text-slate-700 dark:text-zinc-300 leading-relaxed">${para}</p>`;
    }).join("\n");

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formatted }} 
        className="text-xs space-y-2 text-slate-800 dark:text-zinc-200" 
      />
    );
  };

  // --- ACTIONS ---

  // Generate Summary Action
  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    setApiError(null);
    const studentNotes = Storage.getNoteForVideo(videoId);

    try {
      const result = await generateLectureSummary(videoTitle, channelName, studentNotes);
      setSummary(result);
      localStorage.setItem(`learnstudy_summary_${videoId}`, result);
    } catch (err: any) {
      setApiError(err.message || "Failed to connect. Is your Gemini key valid?");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Copy Summary
  const handleCopySummary = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Append Summary to Notes Action
  const handleAppendToNotes = () => {
    if (!summary) return;
    const currentNotes = Storage.getNoteForVideo(videoId);
    const divider = currentNotes.trim() ? "\n\n---\n\n## AI Study Summary ✨\n\n" : "## AI Study Summary ✨\n\n";
    const updatedNotes = currentNotes + divider + summary;
    Storage.saveNoteForVideo(videoId, updatedNotes);
    
    // Dispatch custom event to refresh notes text area if open
    window.dispatchEvent(new CustomEvent("studytube-save-notes"));
    toast.success(
      "Summary Appended", 
      "AI summary added to your Lecture Notes successfully! Scroll down in your Notes pane to edit."
    );
  };

  // Export Summary as File
  const handleExportSummary = () => {
    if (!summary) return;
    const filename = `LearnStudy_Summary_${videoId}.md`;
    const content = `# LearnStudy AI Summary ✨\n\n**Video Title:** ${videoTitle}\n**Creator:** ${channelName}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n${summary}`;
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

  // Solve Doubt Chat Send Action
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
      setApiError(err.message || "Failed to receive answer. Please check connection.");
      // Rollback last message so they can retry
      setChatHistory(chatHistory);
      setChatInput(userMessage);
    } finally {
      setLoadingChat(false);
    }
  };

  // Preset question triggers
  const triggerPresetQuestion = (q: string) => {
    setChatInput(q);
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the AI Chat history for this lecture?")) {
      setChatHistory([]);
      localStorage.removeItem(`learnstudy_chat_${videoId}`);
    }
  };

  // Generate Mastery Quiz Action
  const handleGenerateQuiz = async () => {
    setLoadingQuiz(true);
    setApiError(null);
    const studentNotes = Storage.getNoteForVideo(videoId);

    try {
      const result = await generateLectureQuiz(videoTitle, channelName, studentNotes);
      setQuizQuestions(result);
      localStorage.setItem(`learnstudy_quiz_${videoId}`, JSON.stringify(result));
      
      // Reset quiz state
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setQuizSubmitted(false);
      setQuizScore(0);
      setQuizCompleted(false);
    } catch (err: any) {
      setApiError(err.message || "Failed to generate quiz. Please check key.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Submit Quiz Question Option
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

  // Reset/Retry Quiz
  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 dark:bg-blue-500/15 p-2 rounded-2xl text-blue-600 dark:text-blue-400">
            <Sparkles className="w-5.5 h-5.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-zinc-50 flex items-center gap-1.5 leading-none">
              AI Study Companion
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 inline-block">
              Analyze lecture content, clear doubts, and master concepts instantly.
            </span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-850 select-none">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "summary" ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Summarizer
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "chat" ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Doubt Solver
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "quiz" ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Mastery Quiz
          </button>
        </div>
      </div>

      {/* Global API Key Warning/Error banner */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-4 rounded-2xl flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-extrabold block">Gemini API Connection Issue</span>
            <span className="text-[11px] leading-normal">{apiError}</span>
            <button 
              onClick={onOpenKeyModal}
              className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              Update API Key <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* RENDER BODY BASED ON HAS KEY & TAB */}
      {!hasKey ? (
        /* Empty State / Not connected card */
        <div className="py-10 text-center bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/60 dark:border-zinc-850 p-6 flex flex-col items-center max-w-lg mx-auto">
          <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 rounded-full border border-blue-500/15 mb-3">
            <Key className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">Connect Gemini API</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 leading-relaxed max-w-sm">
            Unlock summaries, instant personalized tutoring, and multiple choice mastery quizzes by connecting your free Gemini API Key.
          </p>
          <div className="flex items-center gap-3 mt-5 w-full">
            <button
              onClick={onOpenKeyModal}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Connect Key
            </button>
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Generate Free Key
            </a>
          </div>
        </div>
      ) : (
        /* Render Active AI tabs */
        <div className="space-y-4">

          {/* 1. SUMMARIZER TAB */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {!summary ? (
                /* Generate Prompt block */
                <div className="text-center py-10 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/50 dark:border-zinc-850 p-6 max-w-lg mx-auto">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Generate Lecture Study Summary</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
                    Instantly create comprehensive markdown outlines, core takeaways, fact grids, and glossary definitions for this lecture.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={loadingSummary}
                    className="mt-5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    {loadingSummary ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Synthesizing Outline...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Summary</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Output block */
                <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-3">
                    <div className="text-xs font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Synthesized Summary Output</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopySummary}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[10px] font-bold flex items-center gap-1"
                        title="Copy markdown content"
                      >
                        {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSummary ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        onClick={handleAppendToNotes}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[10px] font-bold flex items-center gap-1"
                        title="Insert into local notes"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Add to Notes</span>
                      </button>

                      <button
                        onClick={handleExportSummary}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[10px] font-bold flex items-center gap-1"
                        title="Export markdown file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>

                      <button
                        onClick={handleGenerateSummary}
                        disabled={loadingSummary}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[10px] font-bold flex items-center gap-1 disabled:opacity-40"
                        title="Regenerate summary outline"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? "animate-spin" : ""}`} />
                        <span>Regen</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Text (parsed Markdown) */}
                  <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                    {renderMarkdown(summary)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. DOUBT SOLVER CHAT TAB */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-[400px] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-zinc-950/45">
              
              {/* Chat Window */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto select-none py-4">
                    <MessageSquare className="w-9 h-9 text-slate-300 dark:text-zinc-700 mb-2.5" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300">Doubt Solver Classroom</h4>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">
                      Ask anything about formulas, terms, or historical facts mentioned in this video. Your tutor responds with contextual solutions.
                    </p>

                    {/* Quick suggestion tags */}
                    <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                      {[
                        "Explain the main formula",
                        "Summary of key terms",
                        "Give real-world examples"
                      ].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => triggerPresetQuestion(tag)}
                          className="text-[10px] bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-850 px-2.5 py-1 rounded-full text-slate-600 dark:text-zinc-300 font-semibold transition"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat Bubble Render */}
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role !== "user" && (
                          <div className="w-6.5 h-6.5 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            ✨
                          </div>
                        )}
                        <div 
                          className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-normal ${
                            msg.role === "user" 
                              ? "bg-blue-600 text-white rounded-tr-none" 
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
                        <div className="w-6.5 h-6.5 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ✨
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 p-3.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Tutor is drafting response...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </>
                )}
              </div>

              {/* Chat Input Field and Actions */}
              <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
                {chatHistory.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-red-500 rounded-xl transition text-[10px] font-bold shrink-0"
                    title="Clear conversation"
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
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || loadingChat}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold p-2.5 rounded-xl transition shrink-0 cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* 3. MASTERY QUIZ TAB */}
          {activeTab === "quiz" && (
            <div className="space-y-4">
              {quizQuestions.length === 0 ? (
                /* Generate Quiz button state */
                <div className="text-center py-10 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200/50 dark:border-zinc-850 p-6 max-w-lg mx-auto">
                  <BrainCircuit className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Interactive Concept Quiz</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
                    Test your understanding with active multiple-choice questions tailored to the lecture and study notes. Includes descriptive step-by-step reasoning.
                  </p>
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={loadingQuiz}
                    className="mt-5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    {loadingQuiz ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Synthesizing Questions...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4" />
                        <span>Generate Active Quiz</span>
                      </>
                    )}
                  </button>
                </div>
              ) : quizCompleted ? (
                /* Quiz Complete Score Card */
                <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-zinc-850 p-6 max-w-md mx-auto text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-emerald-500/25">
                    🎉
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-zinc-50">Mastery Complete!</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">You have completed all quiz questions for this lesson.</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 rounded-2xl p-4 flex justify-around items-center">
                    <div>
                      <div className="text-2xl font-black text-slate-900 dark:text-zinc-50">{quizScore} / {quizQuestions.length}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Correct Answers</div>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800" />
                    <div>
                      <div className="text-2xl font-black text-blue-500">{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Conceptual Score</div>
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
                /* Question slide block */
                <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in duration-200">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-3">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      QUESTION {currentQuestionIndex + 1} OF {quizQuestions.length}
                    </span>
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={loadingQuiz}
                      className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      New Quiz
                    </button>
                  </div>

                  {/* Active Question Box */}
                  <div className="space-y-3.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-zinc-50 leading-snug">
                      {quizQuestions[currentQuestionIndex].question}
                    </h3>

                    {/* Option Buttons */}
                    <div className="space-y-2">
                      {quizQuestions[currentQuestionIndex].options.map((opt, oIdx) => {
                        let btnStyle = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 text-slate-700 dark:text-zinc-300";
                        if (selectedOption === oIdx && !quizSubmitted) {
                          btnStyle = "bg-blue-500/5 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/50";
                        } else if (quizSubmitted) {
                          const isCorrect = oIdx === quizQuestions[currentQuestionIndex].correctIndex;
                          const isSelected = oIdx === selectedOption;
                          if (isCorrect) {
                            btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40";
                          } else if (isSelected) {
                            btnStyle = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 ring-1 ring-red-500/40";
                          } else {
                            btnStyle = "bg-white/50 dark:bg-zinc-900/50 border-slate-200/50 dark:border-zinc-900 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleQuizOptionSelect(oIdx)}
                            disabled={quizSubmitted}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all ${btnStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-black flex items-center justify-center text-slate-500 shrink-0">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit / Explanations section */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex flex-col gap-3">
                    {!quizSubmitted ? (
                      <button
                        onClick={handleQuizSubmit}
                        disabled={selectedOption === null}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:opacity-50 disabled:text-slate-500 disabled:cursor-not-allowed text-white dark:text-zinc-950 font-bold text-xs py-3 rounded-xl transition"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Explanation Box */}
                        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5 space-y-2">
                          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Conceptual Explanation
                          </div>
                          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
                            {quizQuestions[currentQuestionIndex].explanation}
                          </p>
                        </div>

                        {/* Next slide button */}
                        <button
                          onClick={handleNextQuizQuestion}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1 shadow cursor-pointer"
                        >
                          <span>{currentQuestionIndex + 1 === quizQuestions.length ? "Finish Quiz & View Score" : "Next Question"}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
