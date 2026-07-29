import { STORAGE_KEYS } from "../config/feedback.config";
import { TelemetryData } from "../types/feedback";

/**
 * Get or generate a persistent session ID saved in localStorage
 */
export function getOrCreateSessionId(): string {
  try {
    let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        sessionId = crypto.randomUUID();
      } else {
        sessionId = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  } catch (e) {
    // Fallback if localStorage is unavailable
    return "sess_temp_" + Math.random().toString(36).substring(2, 11);
  }
}

/**
 * Detect device category: Mobile, Tablet, or Desktop
 */
export function detectDeviceType(): string {
  if (typeof window === "undefined" || !navigator) return "Unknown";
  
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

/**
 * Collect browser and system metadata as requested
 */
export function collectTelemetry(includeTechnicalInfo: boolean): TelemetryData {
  if (typeof window === "undefined") {
    return {
      page: "/",
      url: "",
      browser: "Server",
      platform: "Unknown",
      language: "en",
      screen: "0x0",
      viewport: "0x0",
      timezone: "UTC",
      device: "Unknown",
    };
  }

  if (!includeTechnicalInfo) {
    return {
      page: window.location.pathname || "/",
      url: window.location.href || "",
      browser: "Omitted by user",
      platform: "Omitted",
      language: navigator.language || "Unknown",
      screen: "Omitted",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
      device: detectDeviceType(),
    };
  }

  let tz = "Unknown";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    // fallback
  }

  return {
    page: window.location.pathname || "/",
    url: window.location.href || "",
    browser: navigator.userAgent || "Unknown",
    platform: navigator.platform || "Unknown",
    language: navigator.language || "en",
    screen: typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "Unknown",
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: tz,
    device: detectDeviceType(),
  };
}
