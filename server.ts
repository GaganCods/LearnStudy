import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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

  const apiKey = DIRECT_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (apiKey && apiKey !== "MY_YOUTUBE_API_KEY" && apiKey.trim() !== "") {
    try {
      console.log(`[YouTube API] Fetching playlist metadata for ID: ${id}`);
      
      let playlistTitle = "YouTube Playlist";
      let playlistChannel = "Unknown Channel";
      let playlistThumbnail = "";

      // 1. Fetch playlist snippet
      const plUrl = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${apiKey}`;
      const plRes = await fetchWithRetry(plUrl);
      if (!plRes.ok) {
        const errDetails = await analyzeYoutubeApiError(plRes, "fetch playlist metadata");
        updateDiagnostics("PLAYLIST_METADATA_API_ERROR", {
          apiKey,
          error: errDetails.message,
          requestUrl: plUrl,
          responseStatus: plRes.status,
          suggestedAction: errDetails.suggestedAction
        });
        throw new Error(errDetails.message);
      }
      
      const plData = await plRes.json();
      if (plData.items && plData.items[0]) {
        const item = plData.items[0];
        playlistTitle = item.snippet?.title || playlistTitle;
        playlistChannel = item.snippet?.channelTitle || playlistChannel;
        playlistThumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "";
      }

      // 2. Fetch all playlist items (handling pagination with nextPageToken)
      let videos: any[] = [];
      let nextPageToken = "";
      let page = 0;

      do {
        const itemsUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${id}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
        const itemsRes = await fetchWithRetry(itemsUrl);
        if (!itemsRes.ok) {
          const errDetails = await analyzeYoutubeApiError(itemsRes, "fetch playlist items");
          updateDiagnostics("PLAYLIST_ITEMS_API_ERROR", {
            apiKey,
            error: errDetails.message,
            requestUrl: itemsUrl,
            responseStatus: itemsRes.status,
            suggestedAction: errDetails.suggestedAction
          });
          throw new Error(errDetails.message);
        }
        
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
            duration: "10:00", // Default, will update in batch below
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
      } while (nextPageToken && page < 20); // Safe limit of 1000 items

      // 3. Batch fetch durations for all retrieved videos (in chunks of 50)
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

        // Update diagnostics on successful retrieval
        updateDiagnostics("PLAYLIST_LOAD_SUCCESS", {
          apiKey,
          requestUrl: `https://youtube.googleapis.com/youtube/v3/playlists?id=${id}`
        });

        return res.json({
          id,
          title: playlistTitle,
          channelName: playlistChannel,
          thumbnail: playlistThumbnail,
          videos,
          totalVideos: videos.length
        });
      }
    } catch (apiErr: any) {
      console.warn("[YouTube API] API key failed or quota limit hit. Falling back to scraping:", apiErr.message || apiErr);
      // Ensure diagnostics are populated with the error before falling back to scraper
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
    const url = `https://www.youtube.com/playlist?list=${id}&hl=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist page: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract ytInitialData variable
    const startStr = "ytInitialData = ";
    let ytInitialData: any = null;
    const startIdx = html.indexOf(startStr);
    if (startIdx !== -1) {
      let depth = 0;
      let jsonStart = startIdx + startStr.length;
      while (jsonStart < html.length && html[jsonStart] !== "{") {
        jsonStart++;
      }
      
      if (jsonStart < html.length) {
        for (let i = jsonStart; i < html.length; i++) {
          if (html[i] === "{") depth++;
          else if (html[i] === "}") {
            depth--;
            if (depth === 0) {
              const jsonStr = html.slice(jsonStart, i + 1);
              try {
                ytInitialData = JSON.parse(jsonStr);
              } catch (e) {
                console.error("Failed to parse extracted JSON:", e);
              }
              break;
            }
          }
        }
      }
    }

    if (!ytInitialData) {
      return res.status(404).json({ error: "Could not find playlist data on YouTube page" });
    }

    // Recursive search helpers to find nested data
    const findVideosRecursive = (obj: any, results: any[] = []): any[] => {
      if (!obj || typeof obj !== "object") return results;
      if (obj.playlistVideoRenderer) {
        results.push(obj.playlistVideoRenderer);
        return results;
      }
      for (const key of Object.keys(obj)) {
        findVideosRecursive(obj[key], results);
      }
      return results;
    };

    const findPlaylistHeaderRecursive = (obj: any): any => {
      if (!obj || typeof obj !== "object") return null;
      if (obj.playlistHeaderRenderer) return obj.playlistHeaderRenderer;
      if (obj.playlistSidebarPrimaryInfoRenderer) return obj.playlistSidebarPrimaryInfoRenderer;
      for (const key of Object.keys(obj)) {
        const res = findPlaylistHeaderRecursive(obj[key]);
        if (res) return res;
      }
      return null;
    };

    const getText = (textObj: any): string => {
      if (!textObj) return "";
      if (typeof textObj === "string") return textObj;
      if (textObj.simpleText) return textObj.simpleText;
      if (Array.isArray(textObj.runs) && textObj.runs[0]) {
        return textObj.runs.map((r: any) => r.text).join("");
      }
      return "";
    };

    const playlistVideoRenderers = findVideosRecursive(ytInitialData);
    const videos = playlistVideoRenderers.map((item: any, idx: number) => {
      const vidId = item.videoId;
      const title = getText(item.title) || `Video ${idx + 1}`;
      const channelName = getText(item.shortBylineText) || "Unknown Channel";
      const duration = item.lengthText ? getText(item.lengthText) : "10:00";
      const thumbnail = item.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
      
      return {
        id: vidId,
        title,
        channelName,
        duration,
        thumbnail,
        progress: 0,
        lastWatchedPosition: 0,
        completed: false,
        lectureNumber: idx + 1
      };
    });

    let title = "YouTube Playlist";
    let channelName = "Unknown Channel";
    let thumbnail = "";

    const header = findPlaylistHeaderRecursive(ytInitialData);
    if (header) {
      title = getText(header.title) || title;
      const owner = header.ownerText || header.shortBylineText;
      if (owner) {
        channelName = getText(owner) || channelName;
      }
    }

    if (videos.length > 0) {
      if (channelName === "Unknown Channel" && videos[0].channelName) {
        channelName = videos[0].channelName;
      }
      thumbnail = videos[0].thumbnail;
    }

    return res.json({
      id,
      title,
      channelName,
      thumbnail,
      videos,
      totalVideos: videos.length
    });
  } catch (err: any) {
    console.error("Error scraping playlist:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch and parse playlist" });
  }
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
