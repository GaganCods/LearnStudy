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
    }
  } catch (e) {
    // try regex
  }
  
  const playlistMatch = urlStr.match(/[?&]list=([^#\&\?]+)/);
  if (playlistMatch) {
    return { type: "playlist" as const, id: playlistMatch[1] };
  }
  
  const videoMatch = urlStr.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|youtu\.be\/|shorts\/)([^#\&\?]+)/);
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
    const response = await fetch(rssUrl, {
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

// API endpoint to resolve and scrape YouTube data
app.get("/api/youtube-info", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing YouTube URL parameter" });
    return;
  }

  const parsed = parseYoutubeUrl(url);
  if (!parsed) {
    res.status(400).json({ error: "Invalid YouTube URL format. Please paste a valid YouTube Playlist or Video URL." });
    return;
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    if (parsed.type === "playlist") {
      const playlistUrl = `https://www.youtube.com/playlist?list=${parsed.id}`;
      console.log(`Fetching playlist: ${playlistUrl}`);
      
      let html = "";
      let fetchSuccess = false;
      try {
        const response = await fetch(playlistUrl, { headers });
        if (response.ok) {
          html = await response.text();
          fetchSuccess = true;
        }
      } catch (err) {
        console.error("Fetch playlist page failed", err);
      }

      const playlist: any = {
        id: parsed.id,
        type: "playlist",
        title: "Untitled Playlist",
        channelName: "Unknown Channel",
        totalVideos: 0,
        videos: [],
        thumbnail: ""
      };

      // Extract metadata from HTML meta tags (robust fallback)
      if (fetchSuccess) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          playlist.title = titleMatch[1].replace(" - YouTube", "");
        }
        const channelMatch = html.match(/"author":"([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/) || html.match(/<link itemprop="name" content="([^"]+)"/);
        if (channelMatch) {
          playlist.channelName = channelMatch[1];
        }
      }

      // Try 1: Full ytInitialData JSON extraction
      if (fetchSuccess) {
        try {
          const ytInitialData = extractJsonBlock(html, "ytInitialData = ") || 
                               extractJsonBlock(html, "ytInitialData=") ||
                               extractJsonBlock(html, "window['ytInitialData'] = ") ||
                               extractJsonBlock(html, "window['ytInitialData']=");
          
          if (ytInitialData) {
            // Extract sidebar details
            const sidebar = ytInitialData.sidebar?.playlistSidebarRenderer?.items;
            if (sidebar && Array.isArray(sidebar)) {
              for (const item of sidebar) {
                if (item.playlistSidebarPrimaryInfoRenderer) {
                  const info = item.playlistSidebarPrimaryInfoRenderer;
                  playlist.title = info.title?.simpleText || info.title?.runs?.[0]?.text || playlist.title;
                  
                  const stats = info.stats;
                  if (stats && Array.isArray(stats)) {
                    for (const stat of stats) {
                      const txt = stat.simpleText || stat.runs?.[0]?.text || "";
                      if (txt.includes("video")) {
                        playlist.totalVideos = parseInt(txt.replace(/\D/g, "")) || 0;
                      }
                    }
                  }
                }
                if (item.playlistSidebarSecondaryInfoRenderer) {
                  const secondary = item.playlistSidebarSecondaryInfoRenderer;
                  const owner = secondary.videoOwner?.videoOwnerRenderer;
                  if (owner) {
                    playlist.channelName = owner.title?.simpleText || owner.title?.runs?.[0]?.text || playlist.channelName;
                  }
                }
              }
            }

            // Get video list from ytInitialData
            let contents: any[] = [];
            const tabs = ytInitialData.contents?.twoColumnBrowseResultsRenderer?.tabs;
            if (tabs && Array.isArray(tabs)) {
              const content = tabs[0]?.tabRenderer?.content;
              const sectionList = content?.sectionListRenderer?.contents;
              if (sectionList && Array.isArray(sectionList)) {
                const itemSection = sectionList[0]?.itemSectionRenderer?.contents;
                if (itemSection && Array.isArray(itemSection)) {
                  const listRenderer = itemSection[0]?.playlistVideoListRenderer;
                  if (listRenderer && Array.isArray(listRenderer.contents)) {
                    contents = listRenderer.contents;
                  }
                }
              }
            }

            if (contents.length === 0) {
              const sect = ytInitialData.contents?.sectionListRenderer?.contents?.[0];
              const listRenderer = sect?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer;
              if (listRenderer && Array.isArray(listRenderer.contents)) {
                contents = listRenderer.contents;
              }
            }

            if (contents.length > 0) {
              playlist.videos = contents
                .map((item: any, idx: number) => {
                  const vr = item.playlistVideoRenderer;
                  if (!vr) return null;

                  const vId = vr.videoId;
                  const title = vr.title?.simpleText || vr.title?.runs?.[0]?.text || "Untitled Video";
                  const durText = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || "0:00";
                  
                  let thumb = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                  const thumbs = vr.thumbnail?.thumbnails;
                  if (thumbs && thumbs.length > 0) {
                    thumb = thumbs[thumbs.length - 1].url;
                  }

                  return {
                    id: vId,
                    title,
                    duration: durText,
                    thumbnail: thumb,
                    lectureNumber: idx + 1,
                    completed: false,
                    progress: 0,
                    channelName: vr.shortBylineText?.runs?.[0]?.text || playlist.channelName
                  };
                })
                .filter((v: any) => v !== null);
            }
          }
        } catch (err) {
          console.error("Failed to parse whole playlist fields from ytInitialData", err);
        }
      }

      // Try 2: Extract block-by-block playlistVideoRenderer if list is still empty
      if (playlist.videos.length === 0 && fetchSuccess) {
        console.log("No videos parsed from ytInitialData, trying block-by-block extractor");
        playlist.videos = extractPlaylistVideosFromHtml(html);
      }

      // Try 3: Fallback to RSS Feed (100% reliable for public playlists)
      if (playlist.videos.length === 0) {
        console.log("Web scraper yielded 0 videos, trying public RSS fallback");
        const rssVideos = await fetchPlaylistFromRss(parsed.id);
        if (rssVideos) {
          playlist.videos = rssVideos;
          // Retrieve channel name from first video if unknown
          if (playlist.channelName === "Unknown Channel" && rssVideos[0]?.channelName) {
            playlist.channelName = rssVideos[0].channelName;
          }
        }
      }

      // Set totals and thumbnail
      playlist.totalVideos = playlist.videos.length;
      if (playlist.videos[0]) {
        playlist.thumbnail = playlist.videos[0].thumbnail;
      }

      if (playlist.videos.length === 0) {
        throw new Error("No videos found in this playlist. Please ensure it is a public playlist with study content.");
      }

      res.json(playlist);
      return;
    } else {
      // Single video
      const videoUrl = `https://www.youtube.com/watch?v=${parsed.id}`;
      console.log(`Fetching video watch page: ${videoUrl}`);
      
      let videoInfo: any = null;
      let html = "";
      let fetchSuccess = false;

      try {
        const response = await fetch(videoUrl, { headers });
        if (response.ok) {
          html = await response.text();
          fetchSuccess = true;
        }
      } catch (err) {
        console.error("Fetch watch page failed", err);
      }

      // Try 1: Player Response JSON block
      if (fetchSuccess) {
        try {
          const playerResponse = extractPlayerResponseFromHtml(html);
          if (playerResponse && playerResponse.videoDetails) {
            const details = playerResponse.videoDetails;
            const videoId = details.videoId || parsed.id;
            const title = details.title || "Untitled Lecture";
            const channelName = details.author || "Unknown Channel";
            const lengthSec = details.lengthSeconds || "0";
            
            let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            const thumbs = details.thumbnail?.thumbnails;
            if (thumbs && thumbs.length > 0) {
              thumbnail = thumbs[thumbs.length - 1].url;
            }

            videoInfo = {
              id: videoId,
              type: "video",
              title,
              channelName,
              duration: formatDuration(lengthSec),
              thumbnail,
              lectureNumber: 1,
              completed: false,
              progress: 0
            };
          }
        } catch (err) {
          console.error("Failed to parse player response", err);
        }
      }

      // Try 2: Parse Meta tags (extremely robust fallback before oEmbed)
      if (!videoInfo && fetchSuccess) {
        try {
          console.log(`Failed player response parsing, trying meta tags parser for: ${parsed.id}`);
          let metaTitle = "";
          const metaTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || 
                                 html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) ||
                                 html.match(/<title>([^<]+)<\/title>/i);
          if (metaTitleMatch) {
            metaTitle = metaTitleMatch[1].replace(" - YouTube", "");
          }

          let metaChannel = "";
          const metaChannelMatch = html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i) ||
                                   html.match(/<meta\s+itemprop="name"\s+content="([^"]+)"/i) ||
                                   html.match(/"author":"([^"]+)"/);
          if (metaChannelMatch) {
            metaChannel = metaChannelMatch[1];
          }

          let metaDuration = "10:00";
          const metaDurationMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i);
          if (metaDurationMatch) {
            metaDuration = parseISO8601Duration(metaDurationMatch[1]);
          }

          if (metaTitle) {
            videoInfo = {
              id: parsed.id,
              type: "video",
              title: metaTitle,
              channelName: metaChannel || "YouTube Creator",
              duration: metaDuration,
              thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
              lectureNumber: 1,
              completed: false,
              progress: 0
            };
          }
        } catch (err) {
          console.error("Failed to parse meta tags", err);
        }
      }

      // Try 3: Fallback to oEmbed if page parsing was empty or blocked
      if (!videoInfo) {
        console.log(`Failed watch page parsing and meta tags, falling back to oEmbed for: ${parsed.id}`);
        try {
          const embedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${parsed.id}`);
          if (embedRes.ok) {
            const embedData = await embedRes.json() as any;
            if (embedData && embedData.title) {
              videoInfo = {
                id: parsed.id,
                type: "video",
                title: embedData.title || "Untitled Lecture",
                channelName: embedData.author_name || "Unknown Channel",
                duration: "10:00",
                thumbnail: embedData.thumbnail_url || `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
                lectureNumber: 1,
                completed: false,
                progress: 0
              };
            }
          }
        } catch (err) {
          console.error("oEmbed fallback failed", err);
        }
      }

      // Try 4: Absolute minimum fallback
      if (!videoInfo) {
        videoInfo = {
          id: parsed.id,
          type: "video",
          title: "YouTube Lecture Video",
          channelName: "YouTube Creator",
          duration: "10:00",
          thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
          lectureNumber: 1,
          completed: false,
          progress: 0
        };
      }

      res.json(videoInfo);
      return;
    }
  } catch (error: any) {
    console.error("Error in /api/youtube-info:", error);
    res.status(500).json({ error: error.message || "An error occurred while fetching YouTube content." });
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
