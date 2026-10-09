import { CustomSubjectFolder, CourseChapter, ChapterLecture } from "../types";

// Generate clean, readable unique IDs for Folders and Chapters
export function generateFolderId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `folder_${rand}${time}`;
}

export function generateChapterId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `chap_${rand}${time}`;
}

export function generateLectureId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `lec_${rand}${time}`;
}

// Compact data representation for URL sharing
export interface SharedFolderPayload {
  v: 1; // schema version
  type: "folder";
  id: string;
  name: string;
  cat?: string;
  color?: string;
  desc?: string;
  chapters: {
    id: string;
    num: number;
    title: string;
    desc?: string;
    lectures: {
      id: string;
      title: string;
      vid?: string;
      url?: string;
      dur?: string;
      num?: number;
    }[];
  }[];
}

export interface SharedChapterPayload {
  v: 1;
  type: "chapter";
  id: string;
  subjectName?: string;
  num: number;
  title: string;
  desc?: string;
  lectures: {
    id: string;
    title: string;
    vid?: string;
    url?: string;
    dur?: string;
    num?: number;
  }[];
}

export type SharedPayload = SharedFolderPayload | SharedChapterPayload;

// URL-safe base64 encoding & decoding
function toUrlSafeBase64(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    return encodeURIComponent(str);
  }
}

function fromUrlSafeBase64(base64: string): string {
  try {
    let b64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    try {
      return decodeURIComponent(base64);
    } catch {
      return "";
    }
  }
}

// Convert a CustomSubjectFolder into a compact shareable payload
export function folderToPayload(folder: CustomSubjectFolder): SharedFolderPayload {
  return {
    v: 1,
    type: "folder",
    id: folder.id,
    name: folder.subjectName,
    cat: folder.category || "General Studies",
    color: folder.color || "blue",
    desc: folder.description || "",
    chapters: (folder.chapters || []).map((ch, idx) => ({
      id: ch.id || `chap_${idx + 1}`,
      num: ch.chapterNumber || idx + 1,
      title: ch.title,
      desc: ch.description || "",
      lectures: (ch.lectures || []).map((lec, lIdx) => ({
        id: lec.id || `lec_${lIdx + 1}`,
        title: lec.title,
        vid: lec.youtubeVideoId || "",
        url: lec.videoUrl || "",
        dur: lec.duration || "15:00",
        num: lec.lectureNumber || lIdx + 1
      }))
    }))
  };
}

// Convert a CourseChapter into a compact shareable payload
export function chapterToPayload(chapter: CourseChapter, subjectName?: string): SharedChapterPayload {
  return {
    v: 1,
    type: "chapter",
    id: chapter.id,
    subjectName: subjectName || "Course Chapter",
    num: chapter.chapterNumber || 1,
    title: chapter.title,
    desc: chapter.description || "",
    lectures: (chapter.lectures || []).map((lec, lIdx) => ({
      id: lec.id || `lec_${lIdx + 1}`,
      title: lec.title,
      vid: lec.youtubeVideoId || "",
      url: lec.videoUrl || "",
      dur: lec.duration || "15:00",
      num: lec.lectureNumber || lIdx + 1
    }))
  };
}

// Convert payload back into a CustomSubjectFolder
export function payloadToFolder(payload: SharedFolderPayload): CustomSubjectFolder {
  const newFolderId = generateFolderId();
  return {
    id: newFolderId,
    subjectName: payload.name || "Shared Folder",
    category: payload.cat || "Shared Folders",
    color: payload.color || "blue",
    description: payload.desc || "",
    createdAt: new Date().toISOString(),
    chapters: (payload.chapters || []).map((ch, idx) => ({
      id: generateChapterId(),
      chapterNumber: ch.num || idx + 1,
      title: ch.title || `Chapter ${idx + 1}`,
      description: ch.desc || "",
      lectures: (ch.lectures || []).map((lec, lIdx) => ({
        id: generateLectureId(),
        title: lec.title || `Lecture ${lIdx + 1}`,
        youtubeVideoId: lec.vid || "",
        videoUrl: lec.url || (lec.vid ? `https://www.youtube.com/watch?v=${lec.vid}` : ""),
        duration: lec.dur || "15:00",
        completed: false,
        progress: 0,
        lectureNumber: lec.num || lIdx + 1
      }))
    }))
  };
}

// Convert payload back into a CourseChapter
export function payloadToChapter(payload: SharedChapterPayload, targetChapterNum?: number): CourseChapter {
  const newChapterNum = targetChapterNum || payload.num || 1;
  return {
    id: generateChapterId(),
    chapterNumber: newChapterNum,
    title: payload.title || `Chapter ${newChapterNum}`,
    description: payload.desc || "",
    lectures: (payload.lectures || []).map((lec, lIdx) => ({
      id: generateLectureId(),
      title: lec.title || `Lecture ${lIdx + 1}`,
      youtubeVideoId: lec.vid || "",
      videoUrl: lec.url || (lec.vid ? `https://www.youtube.com/watch?v=${lec.vid}` : ""),
      duration: lec.dur || "15:00",
      completed: false,
      progress: 0,
      lectureNumber: lec.num || lIdx + 1
    }))
  };
}

// Generate shareable link for a Folder
export function getFolderShareLink(folder: CustomSubjectFolder): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const payload = folderToPayload(folder);
  const encoded = toUrlSafeBase64(JSON.stringify(payload));
  // Save locally in registry cache so ID lookup works even without payload
  saveSharedToRegistry(folder.id, payload);
  return `${origin}/app/lectures?shareFolder=${encodeURIComponent(folder.id)}&d=${encoded}`;
}

// Generate shareable link for a Chapter
export function getChapterShareLink(chapter: CourseChapter, subjectName?: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const payload = chapterToPayload(chapter, subjectName);
  const encoded = toUrlSafeBase64(JSON.stringify(payload));
  saveSharedToRegistry(chapter.id, payload);
  return `${origin}/app/lectures?shareChapter=${encodeURIComponent(chapter.id)}&d=${encoded}`;
}

// Local registry cache for created shares (supports ID-only lookup on current device / sync)
const SHARED_REGISTRY_KEY = "studytube_shared_registry_cache";

export function saveSharedToRegistry(id: string, payload: SharedPayload) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SHARED_REGISTRY_KEY);
    const registry: Record<string, SharedPayload> = raw ? JSON.parse(raw) : {};
    registry[id] = payload;
    localStorage.setItem(SHARED_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn("Failed to cache shared item", e);
  }
}

export function getSharedFromRegistry(id: string): SharedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHARED_REGISTRY_KEY);
    if (!raw) return null;
    const registry: Record<string, SharedPayload> = JSON.parse(raw);
    return registry[id] || null;
  } catch (e) {
    return null;
  }
}

// Parse a share link, query string, share code, or ID
export interface ParsedShareResult {
  type: "folder" | "chapter";
  folder?: CustomSubjectFolder;
  chapter?: CourseChapter;
  subjectName?: string;
  sourceId: string;
  rawPayload: SharedPayload;
}

export function parseShareInput(input: string, existingSubjects: CustomSubjectFolder[] = []): ParsedShareResult | null {
  if (!input || !input.trim()) return null;
  const cleaned = input.trim();

  // 1. Check if input is a URL with shareFolder or shareChapter
  try {
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.includes("?")) {
      const url = new URL(cleaned, typeof window !== "undefined" ? window.location.origin : "https://learnstudy.app");
      const dParam = url.searchParams.get("d") || url.searchParams.get("data");
      const folderId = url.searchParams.get("shareFolder") || url.searchParams.get("folderId");
      const chapterId = url.searchParams.get("shareChapter") || url.searchParams.get("chapterId");

      if (dParam) {
        const jsonStr = fromUrlSafeBase64(dParam);
        if (jsonStr) {
          const payload = JSON.parse(jsonStr) as SharedPayload;
          if (payload.type === "folder") {
            return {
              type: "folder",
              folder: payloadToFolder(payload),
              sourceId: payload.id || folderId || "shared-folder",
              rawPayload: payload
            };
          } else if (payload.type === "chapter") {
            return {
              type: "chapter",
              chapter: payloadToChapter(payload),
              subjectName: payload.subjectName,
              sourceId: payload.id || chapterId || "shared-chapter",
              rawPayload: payload
            };
          }
        }
      }

      // If URL had ID without 'd' param, check registry
      const targetId = folderId || chapterId;
      if (targetId) {
        const cached = getSharedFromRegistry(targetId);
        if (cached) {
          if (cached.type === "folder") {
            return {
              type: "folder",
              folder: payloadToFolder(cached),
              sourceId: cached.id,
              rawPayload: cached
            };
          } else {
            return {
              type: "chapter",
              chapter: payloadToChapter(cached),
              subjectName: cached.subjectName,
              sourceId: cached.id,
              rawPayload: cached
            };
          }
        }

        // Check if ID matches an existing subject/chapter
        const existingFolder = existingSubjects.find(s => s.id === targetId);
        if (existingFolder) {
          const payload = folderToPayload(existingFolder);
          return {
            type: "folder",
            folder: payloadToFolder(payload),
            sourceId: existingFolder.id,
            rawPayload: payload
          };
        }
      }
    }
  } catch (e) {
    // Continue to next parsing method
  }

  // 2. Check if input is direct URL-safe base64 data
  try {
    const jsonStr = fromUrlSafeBase64(cleaned);
    if (jsonStr && (jsonStr.startsWith("{") && jsonStr.endsWith("}"))) {
      const payload = JSON.parse(jsonStr) as SharedPayload;
      if (payload.type === "folder") {
        return {
          type: "folder",
          folder: payloadToFolder(payload),
          sourceId: payload.id || "shared-folder",
          rawPayload: payload
        };
      } else if (payload.type === "chapter") {
        return {
          type: "chapter",
          chapter: payloadToChapter(payload),
          subjectName: payload.subjectName,
          sourceId: payload.id || "shared-chapter",
          rawPayload: payload
        };
      }
    }
  } catch (e) {
    // Continue
  }

  // 3. Check if input is raw JSON
  try {
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      const parsed = JSON.parse(cleaned);
      if (parsed.type === "folder" || parsed.chapters) {
        const payload: SharedFolderPayload = parsed.type === "folder" ? parsed : folderToPayload(parsed);
        return {
          type: "folder",
          folder: payloadToFolder(payload),
          sourceId: payload.id || "json-folder",
          rawPayload: payload
        };
      } else if (parsed.type === "chapter" || parsed.lectures) {
        const payload: SharedChapterPayload = parsed.type === "chapter" ? parsed : chapterToPayload(parsed);
        return {
          type: "chapter",
          chapter: payloadToChapter(payload),
          subjectName: payload.subjectName,
          sourceId: payload.id || "json-chapter",
          rawPayload: payload
        };
      }
    }
  } catch (e) {
    // Continue
  }

  // 4. Check if input is a known unique ID in the registry
  const cached = getSharedFromRegistry(cleaned);
  if (cached) {
    if (cached.type === "folder") {
      return {
        type: "folder",
        folder: payloadToFolder(cached),
        sourceId: cached.id,
        rawPayload: cached
      };
    } else {
      return {
        type: "chapter",
        chapter: payloadToChapter(cached),
        subjectName: cached.subjectName,
        sourceId: cached.id,
        rawPayload: cached
      };
    }
  }

  // 5. Check if input matches any existing folder or chapter ID
  const matchedSubject = existingSubjects.find(s => s.id === cleaned);
  if (matchedSubject) {
    const payload = folderToPayload(matchedSubject);
    return {
      type: "folder",
      folder: payloadToFolder(payload),
      sourceId: matchedSubject.id,
      rawPayload: payload
    };
  }

  for (const s of existingSubjects) {
    const matchedChap = (s.chapters || []).find(c => c.id === cleaned);
    if (matchedChap) {
      const payload = chapterToPayload(matchedChap, s.subjectName);
      return {
        type: "chapter",
        chapter: payloadToChapter(payload),
        subjectName: s.subjectName,
        sourceId: matchedChap.id,
        rawPayload: payload
      };
    }
  }

  return null;
}
