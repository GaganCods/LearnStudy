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
  console.log("ytInitialData present?", html.includes("ytInitialData"));
  
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    console.log("Parsed ytInitialData");
    
    // traverse to find videoId
    const vids = [];
    JSON.stringify(data, (key, value) => {
      if (key === "playlistVideoRenderer") {
        vids.push({
           id: value.videoId,
           title: value.title?.runs?.[0]?.text || "Unknown"
        });
      }
      return value;
    });
    console.log(`Found ${vids.length} videos`);
    console.log(vids[0]);
  } else {
    console.log("No match");
  }
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
