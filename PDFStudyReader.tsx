import React, { useState } from "react";
import { Flashcard } from "../types";
import { Storage } from "../utils/storage";
import { 
  Sparkles, 
  Plus, 
  RotateCw, 
  Check, 
  Trash2, 
  BookOpen, 
  Brain, 
  Play, 
  ChevronRight, 
  Layers, 
  Star, 
  Clock,
  ThumbsUp,
  Meh,
  Flame
} from "lucide-react";

interface FlashcardsManagerProps {
  currentVideoId?: string;
  currentVideoTitle?: string;
  currentTimestamp?: number;
  onJumpToTimestamp?: (seconds: number) => void;
}

export function FlashcardsManager({
  currentVideoId,
  currentVideoTitle,
  currentTimestamp,
  onJumpToTimestamp
}: FlashcardsManagerProps) {
  const [cards, setCards] = useState<Flashcard[]>(Storage.getFlashcards());
  const [activeMode, setActiveMode] = useState<"list" | "review" | "create">("list");
  
  // Review Mode state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [courseTitle, setCourseTitle] = useState(currentVideoTitle || "General Knowledge");

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    const newCard: Flashcard = {
      id: "fc_" + Date.now(),
      videoId: currentVideoId,
      videoTitle: currentVideoTitle,
      timestamp: currentTimestamp,
      courseTitle: courseTitle.trim(),
      question: question.trim(),
      answer: answer.trim(),
      createdAt: new Date().toISOString()
    };

    Storage.saveFlashcard(newCard);
    setCards(Storage.getFlashcards());
    setQuestion("");
    setAnswer("");
    setActiveMode("list");
  };

  const handleDeleteCard = (id: string) => {
    Storage.deleteFlashcard(id);
    setCards(Storage.getFlashcards());
  };

  const handleRateCard = (rating: "easy" | "medium" | "hard") => {
    if (cards[reviewIndex]) {
      const updatedCard = { ...cards[reviewIndex], rating };
      Storage.saveFlashcard(updatedCard);
      setCards(Storage.getFlashcards());
    }

    setIsFlipped(false);
    setReviewedCount(prev => prev + 1);
    if (reviewIndex < cards.length - 1) {
      setReviewIndex(prev => prev + 1);
    } else {
      setActiveMode("list");
    }
  };

  const formatSeconds = (sec?: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-200">
            <Brain className="w-4 h-4 text-blue-200" />
            Spaced Repetition Engine
          </div>
          <h1 className="text-2xl font-black tracking-tight">Active Flashcards</h1>
          <p className="text-xs text-blue-100/80">
            Create cards while watching videos & retain key concepts permanently.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {cards.length > 0 && activeMode === "list" && (
            <button
              onClick={() => {
                setReviewIndex(0);
                setIsFlipped(false);
                setReviewedCount(0);
                setActiveMode("review");
              }}
              className="bg-white text-blue-700 hover:bg-blue-50 font-black text-xs px-4 py-3 rounded-2xl transition shadow-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Revise Deck ({cards.length})
            </button>
          )}

          {activeMode !== "create" && (
            <button
              onClick={() => setActiveMode("create")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs px-4 py-3 rounded-2xl transition border border-white/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Card
            </button>
          )}

          {activeMode !== "list" && (
            <button
              onClick={() => setActiveMode("list")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs px-4 py-3 rounded-2xl transition border border-white/20"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* CREATE CARD MODE */}
      {activeMode === "create" && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Create Flashcard
            </h2>
            {currentVideoTitle && (
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/50">
                Attached to: {currentVideoTitle.slice(0, 30)}... @ {formatSeconds(currentTimestamp)}
              </span>
            )}
          </div>

          <form onSubmit={handleCreateCard} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Course / Subject Topic
              </label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g. Data Structures, Machine Learning"
                className="w-full mt-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Front (Question / Prompt)
              </label>
              <textarea
                rows={3}
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is Binary Search algorithm?"
                className="w-full mt-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Back (Answer / Explanation)
              </label>
              <textarea
                rows={3}
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="A Divide and Conquer search algorithm with O(log n) time complexity that operates on sorted arrays."
                className="w-full mt-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-md shadow-blue-500/20"
              >
                Save Flashcard
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("list")}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs px-6 py-3 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW MODE */}
      {activeMode === "review" && cards.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>Card {reviewIndex + 1} of {cards.length}</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {cards[reviewIndex].courseTitle}
            </span>
          </div>

          {/* Interactive 3D Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[260px] bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 hover:border-blue-500/50 rounded-3xl p-8 shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between select-none relative group"
          >
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span className="uppercase tracking-wider">
                {isFlipped ? "Back (Answer)" : "Front (Question)"}
              </span>
              <span className="text-[11px] text-blue-500 flex items-center gap-1 group-hover:underline">
                <RotateCw className="w-3.5 h-3.5" />
                Tap to Flip
              </span>
            </div>

            <div className="my-auto text-center py-6">
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 leading-relaxed">
                {isFlipped ? cards[reviewIndex].answer : cards[reviewIndex].question}
              </p>
            </div>

            {cards[reviewIndex].videoTitle && (
              <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                Source: {cards[reviewIndex].videoTitle}
              </div>
            )}
          </div>

          {/* Spaced Repetition Rating Controls */}
          {isFlipped ? (
            <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-150">
              <button
                onClick={() => handleRateCard("hard")}
                className="p-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 transition"
              >
                <Flame className="w-5 h-5" />
                <span>Hard (Review Soon)</span>
              </button>

              <button
                onClick={() => handleRateCard("medium")}
                className="p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 transition"
              >
                <Meh className="w-5 h-5" />
                <span>Medium (Good)</span>
              </button>

              <button
                onClick={() => handleRateCard("easy")}
                className="p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 transition"
              >
                <ThumbsUp className="w-5 h-5" />
                <span>Easy (Mastered)</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-extrabold text-xs py-3.5 rounded-2xl transition shadow-md"
              >
                Reveal Answer
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIST MODE */}
      {activeMode === "list" && (
        <div className="space-y-4">
          {cards.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">No Flashcards Yet</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                Create flashcards while studying lectures to retain formula, definitions, and concepts.
              </p>
              <button
                onClick={() => setActiveMode("create")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Create First Flashcard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between relative group hover:border-blue-500/40 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">
                        {card.courseTitle || "General"}
                      </span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                        title="Delete Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        Q: {card.question}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 line-clamp-2">
                        A: {card.answer}
                      </p>
                    </div>
                  </div>

                  {card.timestamp !== undefined && card.timestamp > 0 && onJumpToTimestamp && (
                    <button
                      onClick={() => onJumpToTimestamp(card.timestamp!)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-zinc-800"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Jump to {formatSeconds(card.timestamp)} in video
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
