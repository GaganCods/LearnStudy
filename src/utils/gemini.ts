export const GEMINI_STORAGE_KEY = "learnstudy_api_key";

export function getGeminiKey(): string | null {
  return localStorage.getItem(GEMINI_STORAGE_KEY);
}

export function saveGeminiKey(key: string) {
  localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
}

export function removeGeminiKey() {
  localStorage.removeItem(GEMINI_STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "*".repeat(trimmed.length);
  }
  return `${trimmed.slice(0, 4)}` + "*".repeat(trimmed.length - 8) + `${trimmed.slice(-4)}`;
}

export function hasGeminiKey(): boolean {
  const key = getGeminiKey();
  return !!key && key.trim().length >= 20;
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
  }
  return headers;
}

/**
 * Validates a Gemini API Key format and makes a lightweight request to test live connectivity.
 */
export async function validateGeminiKey(key: string): Promise<boolean> {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error("API Key cannot be empty");
  }
  if (trimmed.length < 20) {
    throw new Error("Invalid length. API Key must be at least 20 characters.");
  }

  try {
    const res = await fetch("/api/ai/validate-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-key": trimmed,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Invalid API key");
    }

    const data = await res.json();
    return !!data.valid;
  } catch (err: any) {
    console.error("API Key connection validation failed:", err);
    throw new Error(err.message || "Unable to verify API key. Please check your key and try again.");
  }
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
