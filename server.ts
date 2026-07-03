import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to extract JSON block balancing braces
function extractJsonBlock(html: string, keyword: string): any {
  const index = html.indexOf(keyword);
  if (index === -1) return null;
  
  const startIndex = html.indexOf("{", index);
  if (startIndex === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escape = false;
  
  for (let i = startIndex; i < html.length; i++) {
    const char = html[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === "\\") {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          const jsonStr = html.substring(startIndex, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.error("JSON parse failed in extractJsonBlock for " + keyword, e);
            return null;
          }
        }
      }
    }
  }
  return null;
}

// Fetch with a strict timeout to avoid Gateway Timeout errors
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Parse YouTube URL to extract playlist ID or video ID
function parseYoutubeUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      if (url.hostname.includes("youtu.be")) {
        const videoId = url.pathname.slice(1);
        return { type: "video" as const, id: videoId };
      }
      
      const playlistId = url.searchParams.get("list");
      if (playlistId) {
        return { type: "playlist" as const, id: playlistId };
      }
      
      const videoId = url.searchParams.get("v");
      if (videoId) {
        return { type: "video" as const, id: videoId };
      }

      if (url.pathname.startsWith("/embed/")) {
        return { type: "video" as const, id: url.pathname.split("/")[2] };
      }

      if (url.pathname.startsWith("/live/")) {
        const parts = url.pathname.split("/");
        if (parts[2]) {
          return { type: "video" as const, id: parts[2] };
        }
      }
    }
  } catch (e) {
    // try regex
  }
  
  const playlistMatch = urlStr.match(/[?&]list=([^#\&\?]+)/);
  if (playlistMatch) {
    return { type: "playlist" as const, id: playlistMatch[1] };
  }
  
  const videoMatch = urlStr.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|youtu\.be\/|shorts\/|live\/)([^#\&\?]+)/);
  if (videoMatch) {
    return { type: "video" as const, id: videoMatch[1] };
  }
  
  return null;
}

// Convert seconds to MM:SS or HH:MM:SS
function formatDuration(secondsStr: string | number): string {
  const totalSeconds = parseInt(String(secondsStr), 10);
  if (isNaN(totalSeconds)) return "0:00";
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const sStr = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

// Parse ISO 8601 duration string (e.g., PT1H15M30S or PT5M)
function parseISO8601Duration(durationStr: string): string {
  const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return "0:00";
  
  const h = parseInt(matches[1] || "0", 10);
  const m = parseInt(matches[2] || "0", 10);
  const s = parseInt(matches[3] || "0", 10);
  
  const sStr = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

// Extract Player Response block with multiple fallback keys
function extractPlayerResponseFromHtml(html: string): any {
  const keys = [
    "ytInitialPlayerResponse = ",
    "ytInitialPlayerResponse=",
    "window['ytInitialPlayerResponse'] = ",
    "window['ytInitialPlayerResponse']="
  ];
  for (const key of keys) {
    const block = extractJsonBlock(html, key);
    if (block) return block;
  }
  return null;
}

// Extract Video Renderers individually from raw HTML if whole page JSON parsing failed
function extractPlaylistVideosFromHtml(html: string): any[] {
  const videos: any[] = [];
  const keyword = "playlistVideoRenderer";
  let pos = 0;
  
  while (true) {
    pos = html.indexOf(keyword, pos);
    if (pos === -1) break;
    
    const colonIndex = html.indexOf(":", pos);
    if (colonIndex !== -1) {
      const startIndex = html.indexOf("{", colonIndex);
      if (startIndex !== -1 && startIndex - colonIndex < 5) {
        let braceCount = 0;
        let inString = false;
        let escape = false;
        let foundBlock = false;
        let endIdx = startIndex;
        
        for (let i = startIndex; i < html.length; i++) {
          const char = html[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === "\\") {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                endIdx = i;
                foundBlock = true;
                break;
              }
            }
          }
        }
        
        if (foundBlock) {
          const blockStr = html.substring(startIndex, endIdx + 1);
          try {
            const vr = JSON.parse(blockStr);
            if (vr && vr.videoId) {
              const vId = vr.videoId;
              const title = vr.title?.simpleText || vr.title?.runs?.[0]?.text || "Untitled Video";
              const durText = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || "0:00";
              let thumb = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
              const thumbs = vr.thumbnail?.thumbnails;
              if (thumbs && thumbs.length > 0) {
                thumb = thumbs[thumbs.length - 1].url;
              }
              
              if (!videos.some(v => v.id === vId)) {
                videos.push({
                  id: vId,
                  title,
                  duration: durText,
                  thumbnail: thumb,
                  lectureNumber: videos.length + 1,
                  completed: false,
                  progress: 0,
                  channelName: vr.shortBylineText?.runs?.[0]?.text || "YouTube"
                });
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
    pos += keyword.length;
  }
  return videos;
}

// Fetch public playlist details from YouTube RSS feed (fully bypasses block screens / scrape issues)
async function fetchPlaylistFromRss(playlistId: string): Promise<any[] | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    console.log(`Fetching playlist RSS: ${rssUrl}`);
    const response = await fetchWithTimeout(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) return null;
    const xml = await response.text();
    
    const entries: any[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    let idx = 1;
    
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryContent = match[1];
      const idMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
      const authorMatch = entryContent.match(/<name>([^<]+)<\/name>/);
      
      if (idMatch && titleMatch) {
        const vId = idMatch[1];
        const title = titleMatch[1];
        const channelName = authorMatch ? authorMatch[1] : "YouTube Creator";
        
        entries.push({
          id: vId,
          title,
          duration: "10:00", // Default study chunk duration, will be corrected on play
          thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
          lectureNumber: idx++,
          completed: false,
          progress: 0,
          channelName
        });
      }
    }
    return entries.length > 0 ? entries : null;
  } catch (e) {
    console.error("Failed to fetch/parse playlist RSS feed:", e);
    return null;
  }
}

// Playlist info API using RSS
app.get("/api/playlist-info", async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing playlist ID" });
  }
  
  try {
    let videos = await fetchPlaylistFromRss(id);
    if (videos && videos.length > 0) {
      return res.json({ videos });
    }
    
    console.log(`RSS failed or empty, trying fallback playlist HTML fetch for ID: ${id}`);
    const playlistUrl = `https://www.youtube.com/playlist?list=${id}`;
    const response = await fetchWithTimeout(playlistUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (response.ok) {
      const html = await response.text();
      const extracted = extractPlaylistVideosFromHtml(html);
      if (extracted && extracted.length > 0) {
        console.log(`Successfully extracted ${extracted.length} videos from fallback HTML scraping`);
        return res.json({ videos: extracted });
      }
    }
    
    return res.status(404).json({ error: "Playlist not found, empty, or private" });
  } catch (e) {
    console.error("Failed to fetch playlist-info:", e);
    return res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

// Serve static assets in production
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
