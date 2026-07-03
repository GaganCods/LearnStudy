import fetch from "node-fetch";

async function test(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  const html = await response.text();
  const match = html.match(/ytInitialData(?:\]|\s*=\s*)\s*(\{.*?\})\s*;/);
  if (!match) { console.log("no match"); return; }
  const data = JSON.parse(match[1]);
  
  const videos = [];
  let playlistTitle = "YouTube Playlist";
  let playlistChannel = "Unknown Channel";
  
  // Quick recursive search for playlistVideoRenderer
  function traverse(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }
    
    // Check for playlistTitle
    if (obj.playlistMetadataRenderer) {
      playlistTitle = obj.playlistMetadataRenderer.title || playlistTitle;
    }
    if (obj.microformatDataRenderer) {
      playlistTitle = obj.microformatDataRenderer.title || playlistTitle;
    }
    
    if (obj.playlistVideoRenderer) {
      const vr = obj.playlistVideoRenderer;
      const vId = vr.videoId;
      const title = vr.title?.runs?.[0]?.text || "Untitled";
      const channel = vr.shortBylineText?.runs?.[0]?.text || "Unknown Channel";
      const duration = vr.lengthText?.simpleText || "0:00";
      const thumb = vr.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
      videos.push({ id: vId, title, channel, duration, thumb });
    } else {
      for (const k in obj) traverse(obj[k]);
    }
  }
  
  traverse(data);
  console.log("Playlist:", playlistTitle);
  console.log("Videos:", videos.length);
  if (videos.length) console.log(videos[0]);
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
