export interface ParsedYoutubeUrl {
  type: "playlist" | "video";
  id: string; // The playlist ID or video ID
  videoId?: string; // Optional accompanying video ID for playlist URLs
}

export function parseYoutubeUrl(urlStr: string): ParsedYoutubeUrl | null {
  const cleaned = urlStr.trim();
  if (!cleaned) return null;

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

    // Check for youtube.com watch path
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
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

  // Regex for playlist matching
  const playlistMatch = cleaned.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch && playlistMatch[1]) {
    return { type: "playlist", id: playlistMatch[1] };
  }

  // Regex for various video ID matches
  const videoMatch = cleaned.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|youtu\.be\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  if (videoMatch && videoMatch[1]) {
    return { type: "video", id: videoMatch[1] };
  }

  // If it's an 11-character string, it could be a raw video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return { type: "video", id: cleaned };
  }

  // If it's a playlist ID start (typically PL...), it could be a raw playlist ID
  if (/^PL[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return { type: "playlist", id: cleaned };
  }

  return null;
}
