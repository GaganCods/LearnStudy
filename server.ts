import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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

// API route to proxy and parse public YouTube playlists (with optional YouTube Data API key and scraper fallback)
app.get("/api/playlist", async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid playlist ID" });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey && apiKey !== "MY_YOUTUBE_API_KEY" && apiKey.trim() !== "") {
    try {
      console.log(`[YouTube API] Fetching playlist metadata for ID: ${id}`);
      
      let playlistTitle = "YouTube Playlist";
      let playlistChannel = "Unknown Channel";
      let playlistThumbnail = "";

      // 1. Fetch playlist snippet
      const plRes = await fetch(`https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${apiKey}`);
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
        const itemsUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${id}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
        const itemsRes = await fetch(itemsUrl);
        if (!itemsRes.ok) {
          throw new Error(`Failed to fetch playlist items: ${itemsRes.statusText}`);
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
            const vidRes = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`);
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

        return res.json({
          id,
          title: playlistTitle,
          channelName: playlistChannel,
          thumbnail: playlistThumbnail,
          videos,
          totalVideos: videos.length
        });
      }
    } catch (apiErr) {
      console.warn("[YouTube API] API key failed or quota limit hit. Falling back to scraping:", apiErr);
      // Fall through to scraping below
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

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey && apiKey !== "MY_YOUTUBE_API_KEY" && apiKey.trim() !== "") {
    try {
      console.log(`[YouTube API] Fetching video details for ID: ${id}`);
      const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${apiKey}`;
      const apiRes = await fetch(url);
      if (apiRes.ok) {
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
      }
    } catch (apiErr) {
      console.warn("[YouTube API] Single video details API call failed. Falling back to scraper:", apiErr);
      // Fall through to scraping below
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
