import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

import handler from "./dist/server/server.js";

const CLIENT = normalize(join(process.cwd(), "dist", "client"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const IMMUTABLE_EXTS = new Set([
  ".js",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".map",
]);

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

const toRequest = (req, body) => {
  const url = `http://${req.headers.host ?? "localhost"}${req.url}`;
  const headers = new Headers();
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
  }
  return new Request(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });
};

async function tryServeStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const file = normalize(join(CLIENT, decoded));
  if (!file.startsWith(CLIENT)) return false;
  if (!existsSync(file)) return false;
  const stat = statSync(file);
  if (stat.isDirectory()) return false;

  const ext = extname(file).toLowerCase();
  const headers = {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "content-length": stat.size,
    "cache-control": IMMUTABLE_EXTS.has(ext)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  };
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (await tryServeStatic(req, res, pathname)) return;

    const body = await readBody(req);
    const response = await handler.fetch(toRequest(req, body), {}, {});

    const plain = {};
    for (const [k, v] of response.headers) {
      if (k.toLowerCase() !== "set-cookie") plain[k] = v;
    }
    res.writeHead(response.status, plain);
    for (const cookie of response.headers.getSetCookie()) {
      res.appendHeader("set-cookie", cookie);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`PMS server listening on http://0.0.0.0:${PORT}`);
});