/**
 * Feedback System Configuration
 */

export const FEEDBACK_ENDPOINT: string = "https://script.google.com/macros/s/AKfycbxbqKOE2UurXw8vr-cmIH7KRbYDfZQzTh70VE658HbvhhB0RnkLsB8SRYn0kryG8UXgLQ/exec";

export const SPAM_PREVENTION_COOLDOWN_SECONDS = 60; // Rate limit: 1 submission per 60 seconds

export const MIN_MESSAGE_LENGTH = 10;

export const STORAGE_KEYS = {
  SESSION_ID: "app_feedback_session_id",
  LAST_SUBMISSION: "app_feedback_last_submission_time",
} as const;

export const FEEDBACK_CATEGORIES = [
  "General Feedback",
  "Bug Report",
  "Feature Request",
  "UI/UX",
  "Performance",
  "Other",
] as const;

export type FeedbackCategoryOption = typeof FEEDBACK_CATEGORIES[number];
