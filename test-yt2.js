import fetch from "node-fetch";
async function test(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const vids = [];
    JSON.stringify(data, (key, value) => {
      if (key === "videoId" && typeof value === "string") {
        vids.push(value);
      }
      return value;
    });
    console.log(`Found videoIds:`, vids.slice(0, 10));
    
    // search for renderer names
    const renderers = [];
    JSON.stringify(data, (key, value) => {
      if (key.includes("Renderer") && typeof value === "object" && value !== null && value.videoId) {
        renderers.push(key);
      }
      return value;
    });
    console.log("Renderer types:", Array.from(new Set(renderers)));
  }
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
