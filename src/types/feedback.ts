import { FeedbackCategoryOption } from "../config/feedback.config";

export interface TelemetryData {
  page: string;
  url: string;
  browser: string;
  platform: string;
  language: string;
  screen: string;
  viewport: string;
  timezone: string;
  device: string;
}

export interface FeedbackPayload extends TelemetryData {
  rating: number;
  category: FeedbackCategoryOption;
  message: string;
  email: string;
  sessionId: string;
  timestamp: string;
  includeTechnicalInfo: boolean;
}

export interface FeedbackFormData {
  rating: number;
  category: FeedbackCategoryOption;
  message: string;
  email: string;
  includeTechnicalInfo: boolean;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  message?: string;
  cooldownRemaining?: number;
}
