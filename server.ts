import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// =========================================================================
// 🔑 PASTE YOUR YOUTUBE API KEY HERE DIRECTLY:
// If you're deploying to GitHub / Live sites and don't want to deal with .env files,
// simply paste your API key inside the quotes below!
// Example: const DIRECT_YOUTUBE_API_KEY = "AIzaSyA1B2C3D4...";
// =========================================================================
const DIRECT_YOUTUBE_API_KEY = "AIzaSyAHYW-4Q4wTBvdk1EyHFzp9EX9RBDwWr7E";

const app = express();
const PORT = 3000;

app.use(express.json());

// ISO 8601 Duration Parser helper
function parseISO8601Duration(durationStr: string): string {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "10:00";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// Global Diagnostics Memory to power the real-time Debug/Diagnostics Panel
const ytDiagnostics: any = {
  lastChecked: null,
  apiKeyLoaded: false,
  apiKeySource: "NONE",
  apiKeyMasked: "None",
  lastRequest: null,
  lastStatus: null,
  lastError: null,
  suggestedAction: null
};

// Update diagnostics state
function updateDiagnostics(status: string, details: { apiKey?: string; error?: string; requestUrl?: string; responseStatus?: number; suggestedAction?: string }) {
  const apiKey = details.apiKey || DIRECT_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || "";
  ytDiagnostics.lastChecked = new Date().toISOString();
  ytDiagnostics.apiKeyLoaded = apiKey.trim().length > 0;
  ytDiagnostics.apiKeySource = DIRECT_YOUTUBE_API_KEY ? "DIRECT_CODE" : (process.env.YOUTUBE_API_KEY ? "ENV_VAR" : "NONE");
  ytDiagnostics.apiKeyMasked = apiKey.trim().length > 8 
    ? `${apiKey.trim().substring(0, 6)}...${apiKey.trim().substring(apiKey.trim().length - 4)}` 
    : (apiKey.trim() ? "Invalid Key Length" : "None");
  if (details.requestUrl) ytDiagnostics.lastRequest = details.requestUrl;
  if (details.responseStatus !== undefined) ytDiagnostics.lastStatus = details.responseStatus;
  if (details.error) ytDiagnostics.lastError = details.error;
  if (details.suggestedAction) ytDiagnostics.suggestedAction = details.suggestedAction;
  console.log(`[Diagnostics Update] Status: ${status} | Result: ${details.error ? "Failed with: " + details.error : "Success"}`);
}

// Fetch helper with Exponential Backoff retry logic for temporary network issues
async function fetchWithRetry(url: string, options: any = {}, maxRetries = 3, initialDelay = 500): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      // Retry on Server Errors (5xx) or Rate Limiting (429)
      // Do not retry on client errors (400, 401, 403, 404) unless it's a transient 429
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      attempt++;
      if (attempt < maxRetries) {
        const backoffDelay = initialDelay * Math.pow(2, attempt);
        console.warn(`[YouTube API Retry] HTTP ${response.status} on attempt ${attempt}. Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        return response;
      }
    } catch (err: any) {
      attempt++;
      if (attempt < maxRetries) {
        const backoffDelay = initialDelay * Math.pow(2, attempt);
        console.warn(`[YouTube API Retry] Network/Fetch error on attempt ${attempt}: ${err.message || err}. Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Maximum fetch retry attempts reached");
}

// Detailed YouTube Error Extractor and Analyzer
async function analyzeYoutubeApiError(response: Response, actionContext: string): Promise<{ message: string; suggestedAction: string; rawError: any }> {
  let rawError = null;
  let message = `Failed to ${actionContext} (HTTP ${response.status})`;
  let suggestedAction = "Check your internet connection and verify that the YouTube Playlist/Video ID is public.";

  try {
    const errorData = await response.json();
    rawError = errorData;
    if (errorData.error) {
      const apiErr = errorData.error;
      const firstError = apiErr.errors?.[0] || {};
      const reason = firstError.reason || "";
      const apiMsg = apiErr.message || "";
      
      message = `YouTube API Error (${response.status}): ${apiMsg}`;

      if (reason === "keyInvalid" || apiMsg.toLowerCase().includes("key is not valid")) {
        message = "Invalid YouTube API Key.";
        suggestedAction = "The API key being sent is invalid or has typos. If you pasted the key directly in server.ts, verify that the quotes don't contain extra spaces. Check that you copied the complete API key from Google Cloud Console.";
      } else if (reason === "quotaExceeded") {
        message = "YouTube API Quota Exceeded.";
        suggestedAction = "This API key has exceeded its daily limit (usually 10,000 units). You can request more quota in Google Cloud Console or create a new API key on a different Google Cloud project to resume immediately.";
      } else if (reason === "ipRefererBlocked" || apiMsg.toLowerCase().includes("referer") || apiMsg.toLowerCase().includes("restriction")) {
        message = "API Key Referrer / IP Restriction Blocked.";
        suggestedAction = "Your Google Cloud API Key is restricted (HTTP referrers or IP addresses) and is blocking requests from this live server. GO TO Google Cloud Console -> APIs & Services -> Credentials -> Edit your API key -> Set Restrictions to 'None' (recommended for server-side endpoints), or make sure to allow the live domain: " + (process.env.APP_URL || "your live site domain");
      } else if (reason === "playlistNotFound" || reason === "notFound") {
        message = "Playlist / Video Not Found or Private.";
        suggestedAction = "The requested YouTube item could not be found. Please double check that the Playlist/Video ID is correct, and that its visibility is set to 'Public' or 'Unlisted' rather than 'Private'.";
      } else if (reason === "accessNotConfigured" || apiMsg.toLowerCase().includes("not enabled")) {
        message = "YouTube Data API v3 is not enabled.";
        suggestedAction = "You must enable the 'YouTube Data API v3' in your Google Cloud Console project. Go to APIs & Services -> Library -> Search for 'YouTube Data API v3' -> Click 'Enable'.";
      }
    }
  } catch (e) {
    // If not JSON, use default status text
    message = `HTTP Error ${response.status}: ${response.statusText || "Forbidden"}`;
  }

  return { message, suggestedAction, rawError };
}

// API route to proxy and parse public YouTube playlists (with optional YouTube Data API key and scraper fallback)
app.get("/api/playlist", async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid playlist ID" });
  }

  let cleanId = id.trim();

  // Extract list ID or video ID if URL or query parameter was supplied
  const listMatch = cleanId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) {
    cleanId = listMatch[1];
  } else if (cleanId.includes("http://") || cleanId.includes("https://") || cleanId.includes("youtube.com") || cleanId.includes("youtu.be")) {
    const vidMatch = cleanId.match(/(?:v=|\/embed\/|\/watch\?v=|\/vi\/|youtu\.be\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (vidMatch) {
      cleanId = vidMatch[1];
    }
  }

  // 1. Single video check (exact 11 character YouTube video ID, non-playlist)
  const isPlaylistId = cleanId.length !== 11 || /^(PL|UU|FL|WL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(cleanId);

  if (!isPlaylistId && /^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
    console.log(`[YouTube API] ID ${cleanId} detected as single video. Wrapping as single-video chapter.`);
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      let title = "YouTube Video";
      let channelName = "YouTube Channel";
      let thumbnail = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;

      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        title = oembedData.title || title;
        channelName = oembedData.author_name || channelName;
        thumbnail = oembedData.thumbnail_url || thumbnail;
      }

      return res.json({
        id: cleanId,
        title,
        channelName,
        thumbnail,
        videos: [{
          id: cleanId,
          title,
          channelName,
          duration: "10:00",
          thumbnail,
          progress: 0,
          lastWatchedPosition: 0,
          completed: false,
          lectureNumber: 1
        }],
        totalVideos: 1
      });
    } catch (singleVidErr) {
      console.warn("[YouTube API] Single video oEmbed fallback error:", singleVidErr);
    }
  }

  const apiKey = DIRECT_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (apiKey && apiKey !== "MY_YOUTUBE_API_KEY" && apiKey.trim() !== "") {
    try {
      console.log(`[YouTube API] Fetching playlist metadata for ID: ${cleanId}`);
      
      let playlistTitle = "YouTube Playlist";
      let playlistChannel = "Unknown Channel";
      let playlistThumbnail = "";

      // 1. Fetch playlist snippet
      const plUrl = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${cleanId}&key=${apiKey}`;
      const plRes = await fetchWithRetry(plUrl);
      if (plRes.ok) {
        const plData = await plRes.json();
        if (plData.items && plData.items[0]) {
          const item = plData.items[0];
          playlistTitle = item.snippet?.title || playlistTitle;
          playlistChannel = item.snippet?.channelTitle || playlistChannel;
          playlistThumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "";
        }
      }

      // 2. Fetch all playlist items (handling pagination with nextPageToken)
      let videos: any[] = [];
      let nextPageToken = "";
      let page = 0;

      do {
        const itemsUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${cleanId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
        const itemsRes = await fetchWithRetry(itemsUrl);
        if (!itemsRes.ok) break;
        
        const itemsData = await itemsRes.json();
        if (!itemsData.items || itemsData.items.length === 0) break;

        const pageVideos = itemsData.items.map((item: any, index: number) => {
          const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          const title = item.snippet?.title || "Video";
          const channelName = item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown Channel";
          const thumbnail = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
          
          return {
            id: vidId,
            title,
            channelName,
            duration: "10:00",
            thumbnail,
            progress: 0,
            lastWatchedPosition: 0,
            completed: false,
            lectureNumber: (page * 50) + index + 1
          };
        });

        videos.push(...pageVideos);
        nextPageToken = itemsData.nextPageToken || "";
        page++;
      } while (nextPageToken && page < 20);

      // 3. Batch fetch durations
      if (videos.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < videos.length; i += batchSize) {
          const batch = videos.slice(i, i + batchSize);
          const ids = batch.map(v => v.id).join(",");
          try {
            const vidUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`;
            const vidRes = await fetchWithRetry(vidUrl);
            if (vidRes.ok) {
              const vidData = await vidRes.json();
              if (vidData.items) {
                const durationMap = new Map<string, string>();
                vidData.items.forEach((item: any) => {
                  if (item.contentDetails?.duration) {
                    durationMap.set(item.id, parseISO8601Duration(item.contentDetails.duration));
                  }
                });
                
                batch.forEach(v => {
                  if (durationMap.has(v.id)) {
                    v.duration = durationMap.get(v.id);
                  }
                });
              }
            }
          } catch (batchErr) {
            console.error("[YouTube API] Batch duration fetch failed:", batchErr);
          }
        }
      }

      if (videos.length > 0) {
        if (!playlistThumbnail) {
          playlistThumbnail = videos[0].thumbnail;
        }

        updateDiagnostics("PLAYLIST_LOAD_SUCCESS", {
          apiKey,
          requestUrl: `https://youtube.googleapis.com/youtube/v3/playlists?id=${cleanId}`
        });

        return res.json({
          id: cleanId,
          title: playlistTitle,
          channelName: playlistChannel,
          thumbnail: playlistThumbnail,
          videos,
          totalVideos: videos.length
        });
      }
    } catch (apiErr: any) {
      console.warn("[YouTube API] API key failed or quota limit hit. Trying RSS fallback:", apiErr.message || apiErr);
    }
  }

  // --- RSS FEED FALLBACK (Fast, robust, zero API key required) ---
  try {
    console.log(`[YouTube API] Attempting RSS Feed parsing for playlist: ${cleanId}`);
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${cleanId}`;
    const rssRes = await fetch(rssUrl);
    if (rssRes.ok) {
      const xml = await rssRes.text();
      const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
      const playlistTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : "YouTube Playlist";

      const authorMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/);
      const channelName = authorMatch ? authorMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "YouTube Channel";

      const entries = xml.split("<entry>").slice(1);
      const videos = entries.map((entry, idx) => {
        const vIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const vTitleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const vId = vIdMatch ? vIdMatch[1] : "";
        const title = vTitleMatch ? vTitleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : `Video ${idx + 1}`;
        
        return {
          id: vId,
          title,
          channelName,
          duration: "10:00",
          thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
          progress: 0,
          lastWatchedPosition: 0,
          completed: false,
          lectureNumber: idx + 1
        };
      }).filter(v => v.id && v.id.length === 11);

      if (videos.length > 0) {
        console.log(`[YouTube RSS] Successfully fetched ${videos.length} videos for playlist ${cleanId}`);
        return res.json({
          id: cleanId,
          title: playlistTitle,
          channelName,
          thumbnail: videos[0]?.thumbnail || `https://i.ytimg.com/vi/${videos[0]?.id}/hqdefault.jpg`,
          videos,
          totalVideos: videos.length
        });
      }
    }
  } catch (rssErr: any) {
    console.warn("[YouTube API] RSS Feed fallback failed:", rssErr.message || rssErr);
  }

  // --- PIPED PUBLIC API FALLBACK ---
  try {
    console.log(`[YouTube API] Attempting Piped API fallback for playlist: ${cleanId}`);
    const pipedRes = await fetch(`https://pipedapi.kavin.rocks/playlists/${cleanId}`);
    if (pipedRes.ok) {
      const pipedData = await pipedRes.json();
      if (pipedData && pipedData.relatedStreams && pipedData.relatedStreams.length > 0) {
        const videos = pipedData.relatedStreams.map((item: any, idx: number) => {
          const vidId = item.url ? item.url.replace("/watch?v=", "") : "";
          return {
            id: vidId,
            title: item.title || `Video ${idx + 1}`,
            channelName: item.uploaderName || pipedData.uploader || "YouTube Channel",
            duration: item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")}` : "10:00",
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            progress: 0,
            lastWatchedPosition: 0,
            completed: false,
            lectureNumber: idx + 1
          };
        }).filter((v: any) => v.id);

        if (videos.length > 0) {
          return res.json({
            id: cleanId,
            title: pipedData.title || "YouTube Playlist",
            channelName: pipedData.uploader || "YouTube Channel",
            thumbnail: pipedData.thumbnailUrl || videos[0].thumbnail,
            videos,
            totalVideos: videos.length
          });
        }
      }
    }
  } catch (pipedErr: any) {
    console.warn("[YouTube API] Piped fallback failed:", pipedErr.message || pipedErr);
  }

  return res.status(404).json({
    error: "Could not fetch playlist from YouTube. Please verify that the link is correct and the playlist is set to Public or Unlisted on YouTube."
  });
});

// API route to proxy and parse single YouTube video metadata
app.get("/api/video-metadata", async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing video ID" });
  }

  const apiKey = DIRECT_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (apiKey && apiKey !== "MY_YOUTUBE_API_KEY" && apiKey.trim() !== "") {
    try {
      console.log(`[YouTube API] Fetching video details for ID: ${id}`);
      const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${apiKey}`;
      const apiRes = await fetchWithRetry(url);
      if (!apiRes.ok) {
        const errDetails = await analyzeYoutubeApiError(apiRes, "fetch video details");
        updateDiagnostics("VIDEO_METADATA_API_ERROR", {
          apiKey,
          error: errDetails.message,
          requestUrl: url,
          responseStatus: apiRes.status,
          suggestedAction: errDetails.suggestedAction
        });
        throw new Error(errDetails.message);
      }
      
      const data = await apiRes.json();
      if (data.items && data.items[0]) {
        const item = data.items[0];
        const snippet = item.snippet || {};
        const contentDetails = item.contentDetails || {};

        const title = snippet.title || "YouTube Video";
        const channelName = snippet.channelTitle || "Unknown Channel";
        const duration = contentDetails.duration ? parseISO8601Duration(contentDetails.duration) : "10:00";
        const description = snippet.description || "No description available.";
        let publishDate = "Unknown date";
        if (snippet.publishedAt) {
          try {
            publishDate = new Date(snippet.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          } catch (e) {
            publishDate = snippet.publishedAt;
          }
        }
        const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        updateDiagnostics("VIDEO_LOAD_SUCCESS", {
          apiKey,
          requestUrl: url
        });

        return res.json({
          id,
          title,
          channelName,
          duration,
          description,
          publishDate,
          thumbnail
        });
      }
    } catch (apiErr: any) {
      console.warn("[YouTube API] Single video details API call failed. Falling back to scraper:", apiErr.message || apiErr);
      const errMsg = apiErr.message || String(apiErr);
      if (!ytDiagnostics.lastError) {
        updateDiagnostics("API_FALLBACK_TRIGGERED", {
          apiKey,
          error: errMsg
        });
      }
    }
  }

  // --- SCRAPER FALLBACK ---
  try {
    const url = `https://www.youtube.com/watch?v=${id}&hl=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract title
    let title = "";
    const titleMatch = html.match(/<meta name="title" content="([^"]+)"/) || html.match(/<meta property="og:title" content="([^"]+)"/);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    }

    // Extract channel name
    let channelName = "";
    const channelMatch = html.match(/<link itemprop="name" content="([^"]+)"/) || html.match(/"author":"([^"]+)"/);
    if (channelMatch) {
      channelName = channelMatch[1];
    }

    // Extract description
    let description = "";
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/) || html.match(/<meta property="og:description" content="([^"]+)"/);
    if (descMatch) {
      description = descMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    }

    // Attempt to extract duration (lengthSeconds is sometimes in ytInitialPlayerResponse)
    let duration = "10:00";
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (durationMatch && durationMatch[1]) {
      const totalSecs = parseInt(durationMatch[1], 10);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      
      if (hrs > 0) {
        duration = `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      } else {
        duration = `${mins}:${secs.toString().padStart(2, "0")}`;
      }
    }

    // Extracted publish date helper
    let publishDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dateMatch = html.match(/"publishDate":"([^"]+)"/) || html.match(/itemprop="datePublished" content="([^"]+)"/);
    if (dateMatch && dateMatch[1]) {
      try {
        publishDate = new Date(dateMatch[1]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) {
        publishDate = dateMatch[1];
      }
    }

    return res.json({
      id,
      title: title || "YouTube Video",
      channelName: channelName || "Unknown Channel",
      duration,
      description: description || "No video description available.",
      publishDate,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    });

  } catch (err: any) {
    console.error("Error scraping video details:", err);
    return res.json({
      id,
      title: "YouTube Video",
      channelName: "Unknown Channel",
      duration: "10:00",
      description: "Failed to scrape details, but player will initialize.",
      publishDate: "Unknown date",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    });
  }
});

// API route to get real-time YouTube Data API diagnostic info
app.get("/api/youtube-diagnostics", (req, res) => {
  res.json({
    ...ytDiagnostics,
    nodeEnv: process.env.NODE_ENV || "development",
    appUrl: process.env.APP_URL || "Not Configured"
  });
});

// =========================================================================
// 🧠 SERVER-SIDE GEMINI API PROXY ENDPOINTS (Secure, scalable, and compliant)
// =========================================================================

function getGeminiClient(req: express.Request): GoogleGenAI {
  let userKey = (req.headers["x-gemini-key"] as string)
    || (req.headers["authorization"]?.replace("Bearer ", ""))
    || req.body?.apiKey
    || req.body?.key;

  if (userKey) {
    userKey = userKey.trim().replace(/^["']|["']$/g, "");
  }

  const apiKey = (userKey && userKey.length >= 20) ? userKey : process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("No Gemini API key detected. Please connect your API key in the Study Hub settings.");
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });
}

// Resilient Gemini generator wrapper with exponential backoff and fallback model
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  const primaryModel = "gemini-2.5-flash";
  const fallbackModel = "gemini-2.0-flash";
  const tertiaryModel = "gemini-1.5-flash";

  let lastError: any = null;
  let delay = 1000;

  // Try primary model, fallback model, tertiary model
  const modelsToTry = [primaryModel, fallbackModel, tertiaryModel];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err.message || err);
      const is503Or429 = err?.status === 503 || err?.code === 503 || 
                         err?.status === 429 || err?.code === 429 ||
                         errMsg.includes("503") || errMsg.includes("high demand") || 
                         errMsg.includes("UNAVAILABLE") || errMsg.includes("RESOURCE_EXHAUSTED");

      console.warn(`[Gemini API Attempt ${i + 1}/${modelsToTry.length}] Model ${model} failed (${is503Or429 ? "503/High Demand" : errMsg}).`);

      if (i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  }

  throw lastError;
}

// Format human-friendly error messages from raw API exceptions
function formatGeminiError(err: any): string {
  const rawMsg = err?.message || String(err);
  if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
    return "The AI study model is currently experiencing high demand. Please try again in a few moments.";
  }
  if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
    return "Rate limit reached. Please wait a moment before sending another AI request.";
  }
  if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("API key not valid") || rawMsg.includes("401") || rawMsg.includes("UNAUTHENTICATED")) {
    return "Invalid or inactive API key. Please check your Google Gemini API key from Google AI Studio (aistudio.google.com).";
  }
  return rawMsg;
}

// 1. API key validation
app.post("/api/ai/validate-key", async (req, res) => {
  try {
    const ai = getGeminiClient(req);
    const response = await generateContentWithFallback(ai, {
      contents: "Hello, respond with VALID.",
    });
    if (response && response.text) {
      return res.json({ valid: true });
    }
    return res.status(400).json({ error: "Empty or invalid response from the AI engine." });
  } catch (err: any) {
    console.error("[Gemini Validation Failed]:", err);
    return res.status(400).json({ error: formatGeminiError(err) });
  }
});

// 2. Multi-format AI study material generator
app.post("/api/ai/generate-notes", async (req, res) => {
  const { videoTitle, channelName, type, studentNotes, imageBase64, imageMime } = req.body;
  if (!videoTitle) {
    return res.status(400).json({ error: "Missing video title parameter." });
  }

  try {
    const ai = getGeminiClient(req);
    let prompt = "";
    let systemInstruction = "You are LearnStudy AI, an elite educational summarizer and study tutor. Your materials are deeply structured, clean, comprehensive, and beautifully formatted in markdown.";

    if (type === "complete") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate comprehensive, highly detailed, and complete study notes in markdown format.
Structure the notes precisely as follows:
- **Executive Outline**: An in-depth overview of the lecture's core goals and themes.
- **Detailed Core Concepts**: Multiple bulleted sections breaking down every major concept with clear definitions, real-world examples, and academic context.
- **Key Equations & Formulas**: Detail any equations, derivations, and variables mentioned, or practical uses.
- **Academic Comparison Grid**: A structured markdown table summarizing milestones, figures, or comparison parameters.
- **Comprehensive Glossary**: Definitions of all technical and industry terms.
- **In-Depth Study Guide**: Specific practice problems or study tracks for the student to follow.

Write in a formal, engaging, academic tone using bold highlights and spacious layout. Avoid meta-commentary.`;
    } else if (type === "short") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate highly condensed, high-yield Short Notes (or an executive summary) in markdown format.
Keep it strictly under 500 words but dense with information.
Include:
- **The Core Thesis**: One paragraph summarizing the video.
- **High-Yield Concepts**: 4-5 bullet points of the most critical take-aways.
- **Instant Glossary**: 3 brief term definitions.`;
    } else if (type === "revision") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate an elegant, highly structured Revision Cheat Sheet in markdown format.
Focus on memory-retention hacks, clear visual analogies, key bullet-point summaries, and mnemonic devices to help a student revise the topic 10 minutes before an exam. Use lists, warning notes, and highlight markers.`;
    } else if (type === "flashcards") {
      systemInstruction = "You are LearnStudy Flashcard Maker. You return lists of highly effective academic flashcards.";
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate 6 to 10 high-value study flashcards.
Each flashcard should test a core concept, definition, formula, or relationship.
Format the output as a beautiful, easy-to-read markdown table or list:
| Card ID | Front (Question/Concept) | Back (Answer/Explanation) |
| --- | --- | --- |`;
    } else if (type === "questions") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate a list of 5 to 8 Important Practice Questions with comprehensive, step-by-step academic answers.
Each question should mimic a university exam question and provide a flawless model answer.`;
    } else if (type === "mindmap") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Generate a beautiful visual Markdown Mind Map.
Use hierarchical bullet points, indentation levels, and branch emojis (e.g. 🌲, 🌿, 📍, 🔑) to represent how all the subtopics branch off from the main lecture topic. Make it highly structural and easy to scan at a glance.`;
    } else if (type === "formulas") {
      prompt = `Analyze the video lecture "${videoTitle}" by creator "${channelName}".
Extract and generate a Formula and Definition Cheat Sheet in markdown format.
Create a clear markdown table listing every formula, variable definition, SI unit, and key definition mentioned in the topic, with brief examples of how to apply them.`;
    } else if (type === "improve") {
      prompt = `The student has taken the following draft notes during the lecture "${videoTitle}" by creator "${channelName}":
---
${studentNotes || ""}
---

Your task is to improve, structure, and expand these notes. 
Keep all of the student's original facts and thoughts, but:
1. Fix any grammar, typos, and formatting issues.
2. Structure them with clear markdown headings, bullet points, and code blocks.
3. Enhance them by adding detailed conceptual explanations, real-world examples, and necessary academic context for the terms mentioned by the student.
4. Highlight key terms and equations.
Format the output as clean, production-ready study notes in markdown.`;
    } else if (type === "image") {
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing image data" });
      }
      prompt = `Analyze this lecture slide, diagram, or textbook page.
Extract all key concepts, formulas, bullet points, and visual data shown in the image.
Provide a clear, highly structured markdown explanation:
1. **Slide Summary**: What is the slide/diagram illustrating?
2. **Extracted Content**: Detailed breakdown of text, lists, and formulas.
3. **Conceptual Deep-Dive**: In-depth explanation of the principles shown, adding context that may not be directly written but is highly relevant to the topic.
4. **Integration Hint**: Briefly suggest where this fits in the student's notes.`;
    } else {
      return res.status(400).json({ error: "Invalid study material type requested" });
    }

    if (studentNotes && type !== "improve" && studentNotes.trim()) {
      prompt += `\n\nIncorporate the student's current draft notes to personalize and detail the material:\nSTUDENT DRAFT NOTES:\n${studentNotes}`;
    }

    if (type === "image" && imageBase64) {
      const imagePart = {
        inlineData: {
          mimeType: imageMime || "image/png",
          data: imageBase64,
        },
      };
      const textPart = { text: prompt };
      const response = await generateContentWithFallback(ai, {
        contents: { parts: [imagePart, textPart] },
        config: { systemInstruction },
      });
      return res.json({ result: response.text });
    } else {
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: { systemInstruction },
      });
      return res.json({ result: response.text });
    }
  } catch (err: any) {
    console.error("[Gemini Study Materials Generation Failed]:", err);
    return res.status(500).json({ error: formatGeminiError(err) });
  }
});

// 3. Interactive MCQ Quiz Generator
app.post("/api/ai/generate-quiz", async (req, res) => {
  const { videoTitle, channelName, studentNotes } = req.body;
  try {
    const ai = getGeminiClient(req);
    let prompt = `Create a multiple-choice quiz consisting of 3 to 5 premium conceptual questions testing a student's deep comprehension of the video lecture: "${videoTitle}" by "${channelName}".`;
    if (studentNotes && studentNotes.trim()) {
      prompt += `\n\nBase your questions on the core content of the lecture and integrate facts/details from these student study notes:\n${studentNotes}`;
    }
    prompt += `\n\nEnsure that each question is unique, mathematically/conceptually rigorous, and has 4 options. Make sure the explanation is comprehensive and explains why the correct option is correct, and why other options are incorrect.`;

    const response = await generateContentWithFallback(ai, {
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
              question: { type: Type.STRING, description: "The conceptual multiple-choice question." },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of exactly 4 plausible options." },
              correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option (0 to 3)." },
              explanation: { type: Type.STRING, description: "Thorough explanation of the correct answer and conceptual reasoning." }
            },
            required: ["question", "options", "correctIndex", "explanation"]
          }
        }
      }
    });

    const jsonText = response.text?.trim() || "[]";
    return res.json(JSON.parse(jsonText));
  } catch (err: any) {
    console.error("[Gemini Quiz Generation Failed]:", err);
    return res.status(500).json({ error: formatGeminiError(err) });
  }
});

// 4. Tutor doubt solver
app.post("/api/ai/solve-doubt", async (req, res) => {
  const { videoTitle, channelName, studentNotes, chatHistory, newQuestion } = req.body;
  try {
    const ai = getGeminiClient(req);
    const formattedHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const systemInstruction = `You are LearnStudy Doubt Solver, an award-winning personalized academic tutor. 
The student is currently watching the lecture: "${videoTitle}" by creator "${channelName}".
The student's study notes for this lecture are:
---
${studentNotes || "(No study notes yet)"}
---

Your role is to resolve the student's doubts about this lecture topic with incredible clarity, patience, and visual descriptions. 
Break down complex formulas step-by-step. Use Markdown formatting like headers, bullet points, code blocks, bold key terms, and italic formulas for a gorgeous educational layout. Keep explanations highly educational and engaging.`;

    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: newQuestion }] }
    ];

    const response = await generateContentWithFallback(ai, {
      contents,
      config: { systemInstruction }
    });

    return res.json({ result: response.text });
  } catch (err: any) {
    console.error("[Gemini Doubt Solver Failed]:", err);
    return res.status(500).json({ error: formatGeminiError(err) });
  }
});

// 5. Predict educational metadata for a video
app.get("/api/ai/video-metadata", async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing video ID parameter." });
  }

  try {
    const ai = getGeminiClient(req);
    const prompt = `Identify or estimate highly accurate educational metadata for the YouTube video with ID: "${id}".
If you have exact pre-trained memory of this video ID, return the exact info. Otherwise, return a highly realistic, academically-focused title, channel name, duration, publish date, concise and engaging 2-3 sentence description, and 3-5 relevant educational tags matching typical video topics for this ID.
Ensure the duration is in MM:SS format or H:MM:SS format (e.g. "12:34" or "1:05:22").`;

    const response = await generateContentWithFallback(ai, {
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
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 academic tags or keywords" }
          },
          required: ["title", "channelName", "duration", "publishDate", "description", "tags"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    return res.json(JSON.parse(jsonText));
  } catch (err: any) {
    console.error("[Gemini Video Metadata Predictor Failed]:", err);
    return res.status(500).json({ error: formatGeminiError(err) });
  }
});

// 6. Student PDF Reader Workspace AI Assistant
app.post("/api/ai/pdf-assistant", async (req, res) => {
  const { action, documentTitle, pageNumber, selectedText, fullContext, customQuery, targetLanguage } = req.body;
  try {
    const ai = getGeminiClient(req);

    if (action === "dictionary") {
      const prompt = `Provide an academic dictionary breakdown for the word or phrase: "${selectedText}". Return definition, pronunciation guide, part of speech, key synonyms, and an educational example sentence.`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: "You are an academic lexicon dictionary assistant.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              definition: { type: Type.STRING },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              exampleSentence: { type: Type.STRING }
            },
            required: ["word", "pronunciation", "partOfSpeech", "definition", "synonyms", "exampleSentence"]
          }
        }
      });
      return res.json(JSON.parse(response.text?.trim() || "{}"));
    }

    if (action === "generate_flashcards") {
      const prompt = `Based on the following text/content from the PDF document "${documentTitle}" (Page ${pageNumber || 1}):\n\n"${selectedText || fullContext || documentTitle}"\n\nGenerate 3 to 5 study flashcards (Question + Answer) that test core concepts, definitions, or formulas.`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: "You are a master study flashcard creator.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                chapter: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          }
        }
      });
      return res.json(JSON.parse(response.text?.trim() || "[]"));
    }

    if (action === "generate_mcqs") {
      const prompt = `Generate 3 conceptual multiple-choice questions with 4 options and a detailed explanation based on this text from "${documentTitle}":\n\n"${selectedText || fullContext}"`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: "You are LearnStudy Quiz Generator for PDF course material.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        }
      });
      return res.json(JSON.parse(response.text?.trim() || "[]"));
    }

    // Default text responses (Explain, Summarize, Simplify, Formula Sheet, Translate, Ask Doubt)
    let systemInstruction = "You are LearnStudy AI Student Reading Assistant, specialized in helping university and school students master textbook chapters, lecture slides, and notes.";
    let prompt = "";

    if (action === "explain") {
      prompt = `Explain the following text from "${documentTitle}" (Page ${pageNumber || 1}) in simple, intuitive terms suitable for a student studying this topic:\n\n"${selectedText || fullContext}"`;
    } else if (action === "summarize") {
      prompt = `Provide a structured, bulleted study summary of this PDF section/page from "${documentTitle}" (Page ${pageNumber || 1}):\n\n"${fullContext || selectedText}"\n\nHighlight key concepts, definitions, and main takeaways.`;
    } else if (action === "simplify") {
      prompt = `Simplify and rewrite this complex paragraph or technical jargon into plain, easy-to-understand language:\n\n"${selectedText || fullContext}"`;
    } else if (action === "formula_sheet") {
      prompt = `Extract or derive all key formulas, equations, mathematical laws, or core principles from this text of "${documentTitle}" and format them cleanly as a revision cheat sheet:\n\n"${fullContext || selectedText}"`;
    } else if (action === "translate") {
      const lang = targetLanguage || "Spanish";
      prompt = `Translate the following educational text accurately into ${lang}, preserving technical clarity:\n\n"${selectedText || fullContext}"`;
    } else {
      // General question / doubt
      prompt = `The student is reading "${documentTitle}" (Page ${pageNumber || 1}).\nContext from page:\n"${fullContext || ""}"\n\nStudent Question:\n"${customQuery || selectedText || "Explain this page."}"`;
    }

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { systemInstruction }
    });

    return res.json({ result: response.text });
  } catch (err: any) {
    console.error("[Gemini PDF Assistant Failed]:", err);
    return res.status(500).json({ error: formatGeminiError(err) });
  }
});


// Serve static assets in production or run Vite dev server
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[StudyTube Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
