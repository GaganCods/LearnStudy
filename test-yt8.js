import fetch from "node-fetch";
import fs from "fs";
async function test(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
  });
  const html = await response.text();
  const match = html.match(/ytInitialData(?:\]|\s*=\s*)\s*(\{.*?\})\s*;/);
  if (match) {
    fs.writeFileSync("out.json", match[1]);
    console.log("Written to out.json");
  }
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
