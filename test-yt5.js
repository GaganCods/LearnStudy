import fetch from "node-fetch";

function extractPlaylistVideosFromHtml(html) {
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (!match) return [];
  const data = JSON.parse(match[1]);
  
  const videos = [];
  JSON.stringify(data, (key, value) => {
    if (key === "playlistVideoRenderer") {
      const vId = value.videoId;
      const title = value.title?.runs?.[0]?.text || "Untitled Video";
      const durText = value.lengthText?.simpleText || value.lengthText?.runs?.[0]?.text || "0:00";
      let thumb = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
      const thumbs = value.thumbnail?.thumbnails;
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
          channelName: value.shortBylineText?.runs?.[0]?.text || "YouTube"
        });
      }
    }
    return value;
  });
  return videos;
}

async function test(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+478"
    }
  });
  const html = await response.text();
  const vids = extractPlaylistVideosFromHtml(html);
  console.log(`Found ${vids.length} videos`);
  if(vids.length) console.log(vids[0]);
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
