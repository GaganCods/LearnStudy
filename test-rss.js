import fetch from "node-fetch";

async function fetchPlaylistFromRss(playlistId) {
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
    console.log(xml.slice(0, 200));
        
    const entries = [];
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
          channelName
        });
      }
    }
    return entries.length > 0 ? entries : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
fetchPlaylistFromRss("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S").then(console.log);
