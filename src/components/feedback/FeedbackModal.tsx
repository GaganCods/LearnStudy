import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { StarRating } from "./StarRating";
import { FEEDBACK_CATEGORIES, FeedbackCategoryOption, MIN_MESSAGE_LENGTH } from "../../config/feedback.config";
import { FeedbackFormData } from "../../types/feedback";
import { submitFeedback } from "../../services/feedbackApi";
import { getRemainingCooldownSeconds, validateFeedbackForm } from "../../utils/spamPrevention";
import { collectTelemetry } from "../../utils/feedbackTelemetry";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_DATA: FeedbackFormData = {
  rating: 0,
  category: "General Feedback",
  message: "",
  email: "",
  includeTechnicalInfo: true,
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FeedbackFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showTechInfoPreview, setShowTechInfoPreview] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Check rate limit status on modal open
  useEffect(() => {
    if (isOpen) {
      const remaining = getRemainingCooldownSeconds();
      setCooldownSeconds(remaining);
      setSubmissionStatus("idle");
      setStatusMessage("");
      setErrors({});
    }
  }, [isOpen]);

  // Live timer countdown for cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // ESC key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: "" }));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, message: val }));
    if (errors.message && val.trim().length >= MIN_MESSAGE_LENGTH) {
      setErrors((prev) => ({ ...prev, message: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const validation = validateFeedbackForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSubmissionStatus("idle");

    try {
      const result = await submitFeedback(formData);

      if (result.success) {
        setSubmissionStatus("success");
        setStatusMessage(result.message || "Thank you! Your feedback has been submitted.");
        
        // Auto reset form after 2.5s and close modal
        setTimeout(() => {
          setFormData(INITIAL_FORM_DATA);
          setSubmissionStatus("idle");
          onClose();
        }, 2500);
      } else {
        setSubmissionStatus("error");
        setStatusMessage(result.message || "Failed to submit feedback. Please try again.");
        if (result.cooldownRemaining) {
          setCooldownSeconds(result.cooldownRemaining);
        }
      }
    } catch (err) {
      setSubmissionStatus("error");
      setStatusMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const telemetrySample = collectTelemetry(formData.includeTechnicalInfo);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            aria-describedby="feedback-modal-subtitle"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold tracking-wide border border-blue-200/50 dark:border-blue-800/40">
                  <Sparkles className="w-3 h-3" />
                  <span>Your Voice Matters</span>
                </div>
                <h2
                  id="feedback-modal-title"
                  className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight"
                >
                  Help us improve
                </h2>
                <p
                  id="feedback-modal-subtitle"
                  className="text-sm font-medium text-slate-500 dark:text-zinc-400"
                >
                  We'd love to hear your thoughts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close modal"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
              {/* Rate limit warning banner */}
              {cooldownSeconds > 0 && submissionStatus !== "success" && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-200">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-medium leading-relaxed">
                    <span className="font-bold">Rate limit active:</span> Please wait{" "}
                    <span className="font-bold underline">{cooldownSeconds} seconds</span> before sending another feedback message.
                  </div>
                </div>
              )}

              {/* SUCCESS STATE ANIMATION */}
              {submissionStatus === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
                      Thank You!
                    </h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-300 max-w-xs mx-auto">
                      {statusMessage || "Thank you! Your feedback has been submitted."}
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* FEEDBACK FORM */
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* General Error Banner */}
                  {(submissionStatus === "error" || errors.general) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-200"
                    >
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs font-medium leading-relaxed flex-1">
                        {statusMessage || errors.general || "Something went wrong. Please check inputs and try again."}
                      </div>
                    </motion.div>
                  )}

                  {/* 1. Rating */}
                  <StarRating
                    value={formData.rating}
                    onChange={handleRatingChange}
                    disabled={isSubmitting || cooldownSeconds > 0}
                    error={errors.rating}
                  />

                  {/* 2. Feedback Type Dropdown */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="feedback-category"
                      className="block text-sm font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      Feedback Type
                    </label>
                    <div className="relative">
                      <select
                        id="feedback-category"
                        value={formData.category}
                        disabled={isSubmitting || cooldownSeconds > 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            category: e.target.value as FeedbackCategoryOption,
                          }))
                        }
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-blue-500 text-slate-900 dark:text-zinc-100 text-sm rounded-2xl px-4 py-3 pr-10 appearance-none focus:outline-none transition-all font-medium disabled:opacity-60 cursor-pointer"
                      >
                        {FEEDBACK_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Message Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="feedback-message"
                        className="block text-sm font-semibold text-slate-800 dark:text-zinc-200"
                      >
                        Message <span className="text-amber-500 font-bold">*</span>
                      </label>
                      <span
                        className={`text-xs font-medium ${
                          formData.message.trim().length >= MIN_MESSAGE_LENGTH
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-zinc-500"
                        }`}
                      >
                        {formData.message.trim().length}/{MIN_MESSAGE_LENGTH} min chars
                      </span>
                    </div>

                    <textarea
                      id="feedback-message"
                      ref={messageInputRef}
                      rows={4}
                      value={formData.message}
                      onChange={handleMessageChange}
                      disabled={isSubmitting || cooldownSeconds > 0}
                      placeholder="Tell us what happened or what we can improve..."
                      className={`w-full bg-slate-50 dark:bg-zinc-950 border text-slate-900 dark:text-zinc-100 text-sm rounded-2xl p-4 focus:outline-none transition-all font-medium resize-none disabled:opacity-60 placeholder-slate-400 dark:placeholder-zinc-600 ${
                        errors.message
                          ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-400/30"
                          : "border-slate-200 dark:border-zinc-800 focus:border-blue-500"
                      }`}
                    />
                    {errors.message && (
                      <p className="text-xs font-medium text-rose-500 dark:text-rose-400 animate-in fade-in">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* 4. Email (Optional) */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="feedback-email"
                      className="block text-sm font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      Email <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">(Optional)</span>
                    </label>
                    <input
                      id="feedback-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, email: val }));
                        if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      disabled={isSubmitting || cooldownSeconds > 0}
                      placeholder="your@email.com"
                      className={`w-full bg-slate-50 dark:bg-zinc-950 border text-slate-900 dark:text-zinc-100 text-sm rounded-2xl px-4 py-3 focus:outline-none transition-all font-medium disabled:opacity-60 placeholder-slate-400 dark:placeholder-zinc-600 ${
                        errors.email
                          ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-400/30"
                          : "border-slate-200 dark:border-zinc-800 focus:border-blue-500"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-xs font-medium text-rose-500 dark:text-rose-400 animate-in fade-in">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* 5. Include technical info Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.includeTechnicalInfo}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            includeTechnicalInfo: e.target.checked,
                          }))
                        }
                        disabled={isSubmitting || cooldownSeconds > 0}
                        className="mt-1 w-4 h-4 text-blue-600 border-slate-300 dark:border-zinc-700 rounded focus:ring-blue-500 dark:bg-zinc-900 cursor-pointer"
                      />
                      <div className="text-xs leading-tight">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Include technical information
                        </span>
                        <p className="text-slate-400 dark:text-zinc-500 mt-0.5">
                          Helps us diagnose issues (browser, screen resolution, URL, OS).
                        </p>
                      </div>
                    </label>

                    {/* Expandable technical details preview */}
                    <div className="mt-2 pl-7">
                      <button
                        type="button"
                        onClick={() => setShowTechInfoPreview((prev) => !prev)}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{showTechInfoPreview ? "Hide details" : "Preview collected data"}</span>
                      </button>

                      <AnimatePresence>
                        {showTechInfoPreview && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-3 bg-slate-100 dark:bg-zinc-950 rounded-xl text-[11px] font-mono text-slate-600 dark:text-zinc-400 space-y-1 border border-slate-200/60 dark:border-zinc-800/80 overflow-hidden"
                          >
                            <div><span className="font-semibold">URL:</span> {telemetrySample.url}</div>
                            <div><span className="font-semibold">Device:</span> {telemetrySample.device} ({telemetrySample.platform})</div>
                            <div><span className="font-semibold">Screen:</span> {telemetrySample.screen} (Viewport: {telemetrySample.viewport})</div>
                            <div><span className="font-semibold">Timezone:</span> {telemetrySample.timezone}</div>
                            <div><span className="font-semibold">Language:</span> {telemetrySample.language}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Form Footer Buttons */}
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || cooldownSeconds > 0}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:active:scale-100 rounded-2xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : cooldownSeconds > 0 ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Wait {cooldownSeconds}s</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
