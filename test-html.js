import fetch from "node-fetch";

// Extract Video Renderers individually from raw HTML if whole page JSON parsing failed
function extractPlaylistVideosFromHtml(html) {
  const videos = [];
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

async function test(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });
  const html = await response.text();
  const vids = extractPlaylistVideosFromHtml(html);
  console.log(`Found ${vids.length} videos`);
  if(vids.length) console.log(vids[0]);
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
