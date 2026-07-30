import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "client", "public");
const routes = JSON.parse(await readFile(path.join(root, "seo", "routes.json"), "utf8"));
const deletedUrls = JSON.parse(await readFile(path.join(root, "seo", "deleted-urls.json"), "utf8"));
const site = "https://hiddenfeeai.com";

function lastmod(source) {
  try {
    const value = execFileSync("git", ["log", "-1", "--format=%cI", "--", source], { cwd: root, encoding: "utf8" }).trim();
    return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const dated = routes.map((route) => ({ ...route, lastmod: lastmod(route.source) }));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${dated.map((route) => `  <url>\n    <loc>${site}${route.path === "/" ? "/" : route.path}</loc>\n    <lastmod>${route.lastmod}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
const htmlSitemap = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HTML Sitemap | HiddenFeeAI</title><meta name="description" content="Canonical, indexable HiddenFeeAI product pages and policies."><link rel="canonical" href="${site}/sitemap"></head><body><main><h1>HiddenFeeAI site map</h1><p>Canonical product, support, and trust pages.</p><ul>${dated.map((route) => `<li><a href="${site}${route.path}">${xml(route.title)}</a><time datetime="${route.lastmod}">${route.lastmod}</time></li>`).join("")}</ul></main></body></html>`;
const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>HiddenFeeAI product updates</title><link>${site}/changelog</link><description>Product, documentation, and trust updates from HiddenFeeAI.</description><language>en-us</language>${dated.filter((route) => ["/changelog", "/methodology", "/security", "/accuracy"].includes(route.path)).map((route) => `<item><title>${xml(route.title)}</title><link>${site}${route.path}</link><guid>${site}${route.path}</guid><pubDate>${new Date(`${route.lastmod}T12:00:00Z`).toUTCString()}</pubDate><description>${xml(`Updated ${route.title} for the HiddenFeeAI product.`)}</description></item>`).join("")}</channel></rss>`;

await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, "sitemap.xml"), sitemap);
await writeFile(path.join(publicDir, "sitemap.html"), htmlSitemap);
await writeFile(path.join(publicDir, "rss.xml"), rss);
await writeFile(path.join(publicDir, "sitemap-validation.json"), JSON.stringify({ generatedAt: new Date().toISOString(), canonicalUrlCount: dated.length, urls: dated.map(({ path, lastmod }) => ({ path, lastmod })), deletedUrls }, null, 2));

if (!existsSync(path.join(publicDir, "hiddenfeeai-indexnow-20260730.txt"))) {
  await writeFile(path.join(publicDir, "hiddenfeeai-indexnow-20260730.txt"), "hiddenfeeai-indexnow-20260730");
}

console.log(`Generated ${dated.length} canonical URLs, sitemap, HTML sitemap, and RSS feed.`);
