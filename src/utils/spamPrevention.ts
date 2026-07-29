import { SPAM_PREVENTION_COOLDOWN_SECONDS, STORAGE_KEYS, MIN_MESSAGE_LENGTH } from "../config/feedback.config";
import { FeedbackFormData } from "../types/feedback";

/**
 * Get remaining cooldown seconds before next submission is allowed
 */
export function getRemainingCooldownSeconds(): number {
  try {
    const lastTimestampStr = localStorage.getItem(STORAGE_KEYS.LAST_SUBMISSION);
    if (!lastTimestampStr) return 0;
    
    const lastTime = parseInt(lastTimestampStr, 10);
    if (isNaN(lastTime)) return 0;

    const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);
    const remaining = SPAM_PREVENTION_COOLDOWN_SECONDS - elapsedSeconds;
    
    return remaining > 0 ? remaining : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Save current timestamp as last submission time
 */
export function recordSubmissionTimestamp(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SUBMISSION, Date.now().toString());
  } catch (e) {
    // Ignore storage errors
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    rating?: string;
    message?: string;
    email?: string;
    general?: string;
  };
}

/**
 * Validate feedback form fields according to requirements
 */
export function validateFeedbackForm(formData: FeedbackFormData): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
    errors.rating = "Please select a star rating (1-5).";
  }

  const trimmedMessage = formData.message ? formData.message.trim() : "";
  if (!trimmedMessage) {
    errors.message = "Please write a message.";
  } else if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
    errors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters long (currently ${trimmedMessage.length}).`;
  }

  if (formData.email && formData.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
  }

  const cooldown = getRemainingCooldownSeconds();
  if (cooldown > 0) {
    errors.general = `Please wait ${cooldown} second${cooldown > 1 ? "s" : ""} before submitting again.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
