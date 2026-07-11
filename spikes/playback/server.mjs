import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  const requestedPath = new URL(request.url ?? "/", "http://localhost").pathname;
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const normalizedPath = normalize(relativePath);

  if (normalizedPath.startsWith("..")) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  const filePath = join(root, normalizedPath);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": [
        "default-src 'self'",
        "frame-src https://www.youtube-nocookie.com",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'none'",
        "connect-src 'none'",
        "media-src 'none'",
      ].join("; "),
      "Content-Type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Playback spike running at http://127.0.0.1:${port}`);
});
