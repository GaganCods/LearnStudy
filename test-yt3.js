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
  fs.writeFileSync("out.html", html);
}
test("PLbc24Y2DnjmI8K48K-3UqgZc9L0g2B58S");
