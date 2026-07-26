export const PUBLIC_YOUTUBE_API_KEY = "AIzaSyAHYW-4Q4wTBvdk1EyHFzp9EX9RBDwWr7E";

export interface ParsedYoutubeUrl {
  type: "playlist" | "video";
  id: string; // The playlist ID or video ID
  videoId?: string; // Optional accompanying video ID for playlist URLs
}

export function parseYoutubeUrl(urlStr: string): ParsedYoutubeUrl | null {
  let cleaned = urlStr.trim();
  if (!cleaned) return null;

  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://") && (cleaned.includes("youtube.com") || cleaned.includes("youtu.be"))) {
    cleaned = "https://" + cleaned;
  }

  try {
    const url = new URL(cleaned);
    
    // Check for playlist parameter "list" which takes priority if we want to load the playlist
    const playlistId = url.searchParams.get("list");
    if (playlistId) {
      const videoId = url.searchParams.get("v") || undefined;
      return {
        type: "playlist",
        id: playlistId,
        videoId
      };
    }

    // Check for youtube.com, youtu.be, or youtube-nocookie.com hostnames
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be") || url.hostname.includes("youtube-nocookie.com")) {
      if (url.hostname.includes("youtu.be")) {
        const videoId = url.pathname.slice(1).split("/")[0];
        if (videoId) {
          return { type: "video", id: videoId };
        }
      }

      const videoId = url.searchParams.get("v");
      if (videoId) {
        return { type: "video", id: videoId };
      }

      if (url.pathname.startsWith("/embed/")) {
        const parts = url.pathname.split("/");
        if (parts[2]) {
          return { type: "video", id: parts[2] };
        }
      }

      if (url.pathname.startsWith("/live/")) {
        const parts = url.pathname.split("/");
        if (parts[2]) {
          return { type: "video", id: parts[2] };
        }
      }

      if (url.pathname.startsWith("/shorts/")) {
        const parts = url.pathname.split("/");
        if (parts[2]) {
          return { type: "video", id: parts[2] };
        }
      }
    }
  } catch (e) {
    // Fall back to manual regex matching if URL parsing fails or if it is just a plain ID
  }

  // Regex for playlist matching (support list parameter in any context)
  const playlistMatch = cleaned.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch && playlistMatch[1]) {
    return { type: "playlist", id: playlistMatch[1] };
  }

  // Regex for various video ID matches (including shorts, live, embed, etc.)
  const videoMatch = cleaned.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|youtu\.be\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  if (videoMatch && videoMatch[1]) {
    return { type: "video", id: videoMatch[1] };
  }

  // If it's an 11-character string, it could be a raw video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return { type: "video", id: cleaned };
  }

  // If it's a playlist ID (12 or more alphanumeric/underscore/hyphen characters)
  if (/^[a-zA-Z0-9_-]{12,}$/.test(cleaned)) {
    return { type: "playlist", id: cleaned };
  }

  return null;
}

/**
 * Universal YouTube playlist & video fetcher with robust client + server fallback
 */
export async function fetchPlaylistWithFallback(playlistOrVideoId: string): Promise<{
  id: string;
  title: string;
  channelName: string;
  thumbnail: string;
  videos: any[];
  totalVideos: number;
}> {
  const cleanId = playlistOrVideoId.trim();
  if (!cleanId) {
    throw new Error("Missing YouTube URL or ID.");
  }

  // 1. Primary: Server Proxy Route
  try {
    const res = await fetch(`/api/playlist?id=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.videos && data.videos.length > 0) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn("[Playlist Fetch] Server route proxy failed, trying client fallback...", serverErr);
  }

  // 2. Secondary: Client-side YouTube Data API v3
  let userKey = "";
  try {
    const settingsRaw = localStorage.getItem("learnstudy_settings");
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      userKey = parsed.youtubeApiKey || "";
    }
  } catch (e) {}
  const apiKey = userKey || PUBLIC_YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const plUrl = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(cleanId)}&key=${apiKey}`;
      const plRes = await fetch(plUrl);
      if (plRes.ok) {
        const plData = await plRes.json();
        const playlistItem = plData.items?.[0];
        const playlistTitle = playlistItem?.snippet?.title || "YouTube Playlist";
        const playlistChannel = playlistItem?.snippet?.channelTitle || "YouTube Creator";
        const playlistThumbnail = playlistItem?.snippet?.thumbnails?.high?.url || playlistItem?.snippet?.thumbnails?.default?.url || "";

        const videos: any[] = [];
        let nextPageToken = "";
        let page = 0;
        do {
          const itemsUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(cleanId)}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
          const itemsRes = await fetch(itemsUrl);
          if (!itemsRes.ok) break;
          const itemsData = await itemsRes.json();
          if (!itemsData.items || itemsData.items.length === 0) break;

          for (let index = 0; index < itemsData.items.length; index++) {
            const item = itemsData.items[index];
            const snippet = item.snippet || {};
            const vidId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
            if (!vidId) continue;

            videos.push({
              id: vidId,
              title: snippet.title || "Video",
              channelName: snippet.videoOwnerChannelTitle || snippet.channelTitle || playlistChannel,
              duration: "10:00",
              thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              progress: 0,
              lastWatchedPosition: 0,
              completed: false,
              lectureNumber: (page * 50) + index + 1
            });
          }
          nextPageToken = itemsData.nextPageToken || "";
          page++;
        } while (nextPageToken && page < 20);

        if (videos.length > 0) {
          // Batch fetch video durations from YouTube API if key is available
          try {
            const batchSize = 50;
            for (let i = 0; i < videos.length; i += batchSize) {
              const batch = videos.slice(i, i + batchSize);
              const batchIds = batch.map(v => v.id).join(",");
              const vidUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`;
              const vidRes = await fetch(vidUrl);
              if (vidRes.ok) {
                const vidData = await vidRes.json();
                if (vidData.items) {
                  const durationMap = new Map<string, string>();
                  vidData.items.forEach((item: any) => {
                    if (item.contentDetails?.duration) {
                      const iso = item.contentDetails.duration;
                      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                      if (match) {
                        const h = parseInt(match[1] || "0", 10);
                        const m = parseInt(match[2] || "0", 10);
                        const s = parseInt(match[3] || "0", 10);
                        const durStr = h > 0 
                          ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` 
                          : `${m}:${s.toString().padStart(2, "0")}`;
                        durationMap.set(item.id, durStr);
                      }
                    }
                  });
                  batch.forEach(v => {
                    if (durationMap.has(v.id)) {
                      v.duration = durationMap.get(v.id);
                    }
                  });
                }
              }
            }
          } catch (batchErr) {
            console.warn("[youtubeParser] Client batch duration fetch failed:", batchErr);
          }

          return {
            id: cleanId,
            title: playlistTitle,
            channelName: playlistChannel,
            thumbnail: playlistThumbnail || videos[0].thumbnail,
            videos,
            totalVideos: videos.length
          };
        }
      }
    } catch (clientErr) {
      console.warn("[Playlist Fetch] Client-side YouTube Data API failed:", clientErr);
    }
  }

  // 3. Fallback: Single Video Metadata endpoint if 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
    try {
      const metaRes = await fetch(`/api/video-metadata?id=${cleanId}`);
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const title = metaData.title || "YouTube Video";
        const channelName = metaData.channelName || "YouTube Creator";
        const duration = metaData.duration || "10:00";
        const thumbnail = metaData.thumbnail || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
        return {
          id: cleanId,
          title,
          channelName,
          thumbnail,
          videos: [{
            id: cleanId,
            title,
            channelName,
            duration,
            thumbnail,
            progress: 0,
            lastWatchedPosition: 0,
            completed: false,
            lectureNumber: 1
          }],
          totalVideos: 1
        };
      }
    } catch (e) {}

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        const title = oembedData.title || "YouTube Video";
        const channelName = oembedData.author_name || "YouTube Creator";
        const thumbnail = oembedData.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
        return {
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
        };
      }
    } catch (e) {}
  }

  throw new Error("Could not fetch playlist from YouTube. Please verify the link is correct and the playlist is set to Public or Unlisted.");
}
