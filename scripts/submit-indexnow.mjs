import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "client", "public");
const sitemap = await readFile(path.join(publicDir, "sitemap.xml"), "utf8");
const validation = JSON.parse(await readFile(path.join(publicDir, "sitemap-validation.json"), "utf8"));
const deletedUrls = Array.isArray(validation.deletedUrls) ? validation.deletedUrls : [];
const allPaths = [...validation.urls.map(({ path: route }) => route), ...deletedUrls];
if (!sitemap.includes("<urlset") || !sitemap.includes("<lastmod>") || validation.canonicalUrlCount !== validation.urls.length || allPaths.some((route) => typeof route !== "string" || !route.startsWith("/"))) {
  throw new Error("Sitemap validation failed; IndexNow submission was not attempted.");
}

const key = "hiddenfeeai-indexnow-20260730";
const discoveryUrls = ["/sitemap.xml", "/rss.xml"];
const urlList = [...new Set([...allPaths, ...discoveryUrls].map((route) => `https://hiddenfeeai.com${route === "/" ? "/" : route}`))];
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "hiddenfeeai.com", key, keyLocation: `https://hiddenfeeai.com/${key}.txt`, urlList }),
});
if (!response.ok && response.status !== 202) throw new Error(`IndexNow returned HTTP ${response.status}`);
console.log(`Validated sitemap and submitted ${urlList.length} current/deleted/discovery URLs to IndexNow.`);
