export const GEMINI_STORAGE_KEY = "gemini_api_key";
const LEGACY_STORAGE_KEY = "learnstudy_api_key";

export function sanitizeApiKey(key: string): string {
  if (!key) return "";
  return key
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/[\r\n\t]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function getGeminiKey(): string | null {
  const val = localStorage.getItem(GEMINI_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!val) return null;
  const sanitized = sanitizeApiKey(val);
  return sanitized.length >= 10 ? sanitized : null;
}

export function saveGeminiKey(key: string) {
  const sanitized = sanitizeApiKey(key);
  localStorage.setItem(GEMINI_STORAGE_KEY, sanitized);
  localStorage.setItem(LEGACY_STORAGE_KEY, sanitized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("learnstudy_key_updated"));
    window.dispatchEvent(new Event("storage"));
  }
}

export function removeGeminiKey() {
  localStorage.removeItem(GEMINI_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("learnstudy_key_updated"));
    window.dispatchEvent(new Event("storage"));
  }
}

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  const trimmed = sanitizeApiKey(key);
  if (trimmed.length <= 8) {
    return "••••••••••••";
  }
  return `${trimmed.slice(0, 4)}••••••••••••${trimmed.slice(-3)}`;
}

export function hasGeminiKey(): boolean {
  const key = getGeminiKey();
  return !!key && key.length >= 10;
}

export interface KeyTestResult {
  valid: boolean;
  errorType?: "invalid" | "quota" | "network" | "model" | "unknown";
  title: string;
  message: string;
}

/**
 * Validates candidate Gemini API key and diagnoses specific problems:
 * - Invalid key
 * - Quota exceeded
 * - Model unavailable
 * - Network error
 */
export async function testGeminiKey(candidateKey?: string): Promise<KeyTestResult> {
  const keyToTest = candidateKey ? sanitizeApiKey(candidateKey) : getGeminiKey();
  if (!keyToTest) {
    return {
      valid: false,
      errorType: "invalid",
      title: "No API Key Provided",
      message: "Please enter or paste your Gemini API key from Google AI Studio.",
    };
  }

  if (keyToTest.length < 10) {
    return {
      valid: false,
      errorType: "invalid",
      title: "Invalid API Key",
      message: "The API key appears to be invalid. Please create a new key in Google AI Studio.",
    };
  }

  try {
    const res = await fetch("/api/ai/validate-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-key": keyToTest,
        "Authorization": `Bearer ${keyToTest}`
      },
      body: JSON.stringify({ key: keyToTest, apiKey: keyToTest }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.valid !== false) {
      return {
        valid: true,
        title: "API key verified",
        message: "Your Gemini AI features are ready.",
      };
    }

    const errText = (data.error || "").toLowerCase();
    if (res.status === 400 || data.errorType === "invalid" || errText.includes("invalid") || errText.includes("unauthenticated") || errText.includes("api_key_invalid")) {
      return {
        valid: false,
        errorType: "invalid",
        title: "Invalid key",
        message: "The API key appears to be invalid. Please create a new key in Google AI Studio.",
      };
    }

    if (res.status === 429 || data.errorType === "quota" || errText.includes("quota") || errText.includes("resource_exhausted") || errText.includes("rate limit")) {
      return {
        valid: false,
        errorType: "quota",
        title: "Quota exceeded",
        message: "This API key has reached its available quota. Try another key or check your Google AI Studio usage.",
      };
    }

    if (res.status === 503 || data.errorType === "model" || errText.includes("unavailable") || errText.includes("high demand") || errText.includes("model")) {
      return {
        valid: false,
        errorType: "model",
        title: "Model unavailable",
        message: "This Gemini model isn't available for this API key. Try another supported model or wait a moment.",
      };
    }

    return {
      valid: false,
      errorType: "unknown",
      title: "Verification issue",
      message: data.error || "Could not verify the API key with Gemini. Please check your key and try again.",
    };
  } catch (err: any) {
    return {
      valid: false,
      errorType: "network",
      title: "Network error",
      message: "LearnStudy couldn't connect to Gemini. Check your internet connection and try again.",
    };
  }
}

/**
 * Common request headers helper to inject custom key if available
 */
function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = getGeminiKey();
  if (key) {
    headers["x-gemini-key"] = key;
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

/**
 * Validates a Gemini API Key format and makes a lightweight request to test live connectivity.
 */
export async function validateGeminiKey(key: string): Promise<boolean> {
  const result = await testGeminiKey(key);
  if (!result.valid) {
    throw new Error(result.message);
  }
  return true;
}

/**
 * Generates a structured study material using the backend proxy endpoint
 */
export async function generateStudyMaterial(
  videoTitle: string,
  channelName: string,
  type: string,
  studentNotes?: string,
  imageBase64?: string,
  imageMime?: string
): Promise<string> {
  try {
    const res = await fetch("/api/ai/generate-notes", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        videoTitle,
        channelName,
        type,
        studentNotes,
        imageBase64,
        imageMime,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to generate ${type} study material`);
    }

    const data = await res.json();
    return data.result || "";
  } catch (err: any) {
    console.error(`Study material (${type}) generation failed:`, err);
    throw new Error(err.message || "Failed to connect to the study companion server.");
  }
}

/**
 * Generates a structured markdown summary of a lecture (kept for legacy support or backward compatibility)
 */
export async function generateLectureSummary(videoTitle: string, channelName: string, studentNotes?: string): Promise<string> {
  return generateStudyMaterial(videoTitle, channelName, "complete", studentNotes);
}

export interface StudyQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Generates interactive multiple choice questions based on lecture title and current notes.
 */
export async function generateLectureQuiz(videoTitle: string, channelName: string, studentNotes?: string): Promise<StudyQuizQuestion[]> {
  try {
    const res = await fetch("/api/ai/generate-quiz", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        videoTitle,
        channelName,
        studentNotes,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to generate interactive quiz");
    }

    return await res.json();
  } catch (err: any) {
    console.error("Quiz generation failed:", err);
    throw new Error(err.message || "Failed to retrieve concept quiz from AI tutor.");
  }
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/**
 * Sends a doubt solver message to Gemini with conversation history and lecture context.
 */
export async function solveLectureDoubt(
  videoTitle: string,
  channelName: string,
  studentNotes: string,
  chatHistory: ChatMessage[],
  newQuestion: string
): Promise<string> {
  try {
    const res = await fetch("/api/ai/solve-doubt", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        videoTitle,
        channelName,
        studentNotes,
        chatHistory,
        newQuestion,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to solve academic doubt");
    }

    const data = await res.json();
    return data.result || "";
  } catch (err: any) {
    console.error("Doubt solver failed:", err);
    throw new Error(err.message || "Failed to connect to doubt solver tutor.");
  }
}

export interface VideoMetadata {
  title: string;
  channelName: string;
  duration: string;
  publishDate: string;
  description: string;
  tags: string[];
}

/**
 * Uses Gemini API to fetch or predict extremely detailed academic metadata for a YouTube video ID.
 */
export async function fetchVideoMetadataWithGemini(videoId: string): Promise<VideoMetadata> {
  try {
    const res = await fetch(`/api/ai/video-metadata?id=${encodeURIComponent(videoId)}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to predict lecture metadata");
    }

    return await res.json();
  } catch (err: any) {
    console.error("Gemini metadata extraction failed:", err);
    throw new Error(err.message || "Failed to predict metadata from AI indexer.");
  }
}
