import { GoogleGenAI, Type } from "@google/genai";

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
    const ai = new GoogleGenAI({ apiKey: trimmed });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Test connection. Reply with exactly the word: 'CONNECTED'.",
    });

    if (response && response.text) {
      return true;
    }
    throw new Error("Received an empty response from the validation endpoint.");
  } catch (err: any) {
    console.error("API Key connection validation failed:", err);
    
    const status = err.status || err.statusCode || (err.error && err.error.code);
    const msg = (err.message || "").toLowerCase() + " " + JSON.stringify(err).toLowerCase();
    
    if (
      status === 401 || 
      status === 403 || 
      msg.includes("api_key_invalid") || 
      msg.includes("api key") || 
      msg.includes("invalid") || 
      msg.includes("unauthorized") || 
      msg.includes("permission") || 
      msg.includes("auth") ||
      msg.includes("credential")
    ) {
      throw new Error("Invalid API Key.");
    } else {
      throw new Error("Unable to verify API key. Please try again.");
    }
  }
}

/**
 * Helper to initialize a GoogleGenAI client with the locally stored key.
 * Throws an error if key is missing.
 */
export function getAIClient(): GoogleGenAI {
  const key = getGeminiKey();
  if (!key) {
    throw new Error("Gemini API key is not connected. Please connect your API key in settings or onboarding.");
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Generates a structured markdown summary of a lecture based on its metadata and optional notes.
 */
export async function generateLectureSummary(videoTitle: string, channelName: string, studentNotes?: string): Promise<string> {
  const ai = getAIClient();
  
  let prompt = `Analyze this video lecture titled "${videoTitle}" by creator "${channelName}". `;
  if (studentNotes && studentNotes.trim()) {
    prompt += `Incorporate the student's study notes to contextualize and detail the summary:\n\nSTUDENT STUDY NOTES:\n${studentNotes}\n\n`;
  }
  prompt += `Please generate a highly structured, comprehensive, and beautiful study summary in markdown format. 
It must contain:
1. **Executive Overview**: A high-level description of what this lecture is about.
2. **Core Concepts & Explanations**: A detailed list or breakdown of the primary terms, principles, formulas, or facts mentioned, with elegant definitions.
3. **Key Takeaways & Formulas**: Practical insights or primary takeaways.
4. **Glossary / Terminology**: Brief definitions of industry-specific terms mentioned.
5. **Recommended Study Plan / Next Steps**: What the student should study next or practice based on this material.

Write in a friendly, helpful, academic tone using spacious spacing, lists, and bold highlighting. Do not include introductory conversational noise; start directly with the markdown headers.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LearnStudy AI, an elite educational summarizer and study tutor. Your summaries are structured, thorough, aesthetically formatted in Markdown, and perfectly clear.",
      }
    });

    return response.text || "Failed to generate summary content.";
  } catch (err: any) {
    console.error("Summary generation failed:", err);
    throw new Error(err.message || "Failed to generate summary. Please check your network and API key.");
  }
}

/**
 * Generates interactive multiple choice questions based on lecture title and current notes.
 */
export interface StudyQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateLectureQuiz(videoTitle: string, channelName: string, studentNotes?: string): Promise<StudyQuizQuestion[]> {
  const ai = getAIClient();

  let prompt = `Create a multiple-choice quiz consisting of 3 to 5 premium conceptual questions testing a student's deep comprehension of the video lecture: "${videoTitle}" by "${channelName}".`;
  if (studentNotes && studentNotes.trim()) {
    prompt += `\n\nBase your questions on the core content of the lecture and integrate facts/details from these student study notes:\n${studentNotes}`;
  }
  prompt += `\n\nEnsure that each question is unique, mathematically/conceptually rigorous, and has 4 options. Make sure the explanation is comprehensive and explains why the correct option is correct, and why other options are incorrect.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LearnStudy QuizMaster. You generate balanced, challenging, multiple-choice quizzes that test actual learning and conceptual mastery.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of multiple choice questions.",
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The conceptual multiple-choice question."
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of exactly 4 plausible options."
              },
              correctIndex: {
                type: Type.INTEGER,
                description: "The 0-based index of the correct option (0 to 3)."
              },
              explanation: {
                type: Type.STRING,
                description: "Thorough explanation of the correct answer and conceptual reasoning."
              }
            },
            required: ["question", "options", "correctIndex", "explanation"]
          }
        }
      }
    });

    const jsonText = response.text?.trim() || "[]";
    return JSON.parse(jsonText) as StudyQuizQuestion[];
  } catch (err: any) {
    console.error("Quiz generation failed:", err);
    throw new Error(err.message || "Failed to generate quiz. Please check your network and API key.");
  }
}

/**
 * Sends a doubt solver message to Gemini with conversation history and lecture context.
 */
export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function solveLectureDoubt(
  videoTitle: string,
  channelName: string,
  studentNotes: string,
  chatHistory: ChatMessage[],
  newQuestion: string
): Promise<string> {
  const ai = getAIClient();

  const formattedHistory = chatHistory.map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }]
  }));

  // Create active system instruction which injects current lecture context
  const systemInstruction = `You are LearnStudy Doubt Solver, an award-winning personalized academic tutor. 
The student is currently watching the lecture: "${videoTitle}" by creator "${channelName}".
The student's study notes for this lecture are:
---
${studentNotes || "(No study notes yet)"}
---

Your role is to resolve the student's doubts about this lecture topic with incredible clarity, patience, and visual descriptions. 
Break down complex formulas step-by-step. Use Markdown formatting like headers, bullet points, code blocks, bold key terms, and italic formulas for a gorgeous educational layout. Keep explanations highly educational and engaging.`;

  try {
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: newQuestion }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      }
    });

    return response.text || "Could not find an answer. Please try phrasing your question differently.";
  } catch (err: any) {
    console.error("Doubt solving failed:", err);
    throw new Error(err.message || "Failed to receive answer. Please check your network and API key.");
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
  const ai = getAIClient();
  const prompt = `Identify or estimate highly accurate educational metadata for the YouTube video with ID: "${videoId}".
If you have exact pre-trained memory of this video ID, return the exact info. Otherwise, return a highly realistic, academically-focused title, channel name, duration, publish date, concise and engaging 2-3 sentence description, and 3-5 relevant educational tags matching typical video topics for this ID.
Ensure the duration is in MM:SS format or H:MM:SS format (e.g. "12:34" or "1:05:22").`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LearnStudy Video Indexer. You return structured metadata for educational and informational video lectures.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The educational/academic video title" },
            channelName: { type: Type.STRING, description: "Name of the YouTube channel or creator" },
            duration: { type: Type.STRING, description: "Video duration formatted as MM:SS or H:MM:SS" },
            publishDate: { type: Type.STRING, description: "Realistic publish date, e.g. 'Oct 14, 2022'" },
            description: { type: Type.STRING, description: "Concise 2-3 sentence summary of the educational content covered" },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 5 academic tags or keywords"
            }
          },
          required: ["title", "channelName", "duration", "publishDate", "description", "tags"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    return JSON.parse(jsonText) as VideoMetadata;
  } catch (err: any) {
    console.error("Gemini metadata extraction failed:", err);
    throw new Error(err.message || "Failed to fetch metadata via Gemini");
  }
}

