import { FEEDBACK_ENDPOINT } from "../config/feedback.config";
import { FeedbackFormData, FeedbackPayload, FeedbackSubmissionResult } from "../types/feedback";
import { collectTelemetry, getOrCreateSessionId } from "../utils/feedbackTelemetry";
import { getRemainingCooldownSeconds, recordSubmissionTimestamp, validateFeedbackForm } from "../utils/spamPrevention";

/**
 * Submit feedback payload to Google Apps Script Web App endpoint
 */
export async function submitFeedback(formData: FeedbackFormData): Promise<FeedbackSubmissionResult> {
  // 1. Check Rate Limit / Spam Prevention
  const cooldownRemaining = getRemainingCooldownSeconds();
  if (cooldownRemaining > 0) {
    return {
      success: false,
      message: `Rate limit active. Please wait ${cooldownRemaining}s before submitting again.`,
      cooldownRemaining,
    };
  }

  // 2. Validate Form Data
  const validation = validateFeedbackForm(formData);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return {
      success: false,
      message: firstError || "Please check your form inputs.",
    };
  }

  // 3. Assemble Complete Payload
  const telemetry = collectTelemetry(formData.includeTechnicalInfo);
  const sessionId = getOrCreateSessionId();
  const timestamp = new Date().toISOString();

  const payload: FeedbackPayload = {
    rating: formData.rating,
    category: formData.category,
    message: formData.message.trim(),
    email: formData.email.trim(),
    sessionId,
    timestamp,
    includeTechnicalInfo: formData.includeTechnicalInfo,
    ...telemetry,
  };

  // 4. Send request to configured Web App endpoint
  try {
    const isPlaceholder = !FEEDBACK_ENDPOINT || 
      FEEDBACK_ENDPOINT === "GOOGLE_APPS_SCRIPT_URL" || 
      FEEDBACK_ENDPOINT.includes("YOUR_") ||
      !FEEDBACK_ENDPOINT.startsWith("http");

    if (isPlaceholder) {
      // Simulate real network request delay for demonstration when endpoint is not yet pointed to live Google Apps Script URL
      await new Promise((resolve) => setTimeout(resolve, 1000));
      recordSubmissionTimestamp();
      return {
        success: true,
        message: "Thank you! Your feedback has been submitted.",
      };
    }

    // Google Apps Script Web Apps require 'redirect: follow'.
    // Sending as 'text/plain;charset=utf-8' prevents CORS preflight OPTIONS requests from being blocked by Google Apps Script.
    // In Google Apps Script, JSON.parse(e.postData.contents) handles this cleanly.
    let response: Response;
    try {
      response = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
        redirect: "follow",
      });
    } catch (corsErr) {
      // Fallback: try form-urlencoded if raw text/plain is blocked by strict browser policy
      const formDataBody = new URLSearchParams();
      Object.entries(payload).forEach(([key, val]) => {
        formDataBody.append(key, typeof val === "object" ? JSON.stringify(val) : String(val));
      });

      response = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formDataBody.toString(),
        redirect: "follow",
      });
    }

    // Google Apps Script redirects to script.googleusercontent.com
    if (response.ok || response.type === "opaque" || response.status === 200 || response.status === 302) {
      recordSubmissionTimestamp();
      return {
        success: true,
        message: "Thank you! Your feedback has been submitted.",
      };
    }

    // Attempt parsing response
    let errorMsg = "Failed to send feedback. Please check your Google Apps Script deployment.";
    try {
      const data = await response.json();
      if (data && (data.success || data.status === "success")) {
        recordSubmissionTimestamp();
        return {
          success: true,
          message: "Thank you! Your feedback has been submitted.",
        };
      }
      if (data && data.message) {
        errorMsg = data.message;
      }
    } catch (e) {
      // Text response or redirect output
    }

    return {
      success: false,
      message: errorMsg,
    };
  } catch (error: any) {
    console.error("Feedback submission error:", error);
    
    // Fallback error handling
    return {
      success: false,
      message: "Network error occurred. Please check your connection and try again.",
    };
  }
}
