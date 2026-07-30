import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "client", "dist");
const routes = JSON.parse(await readFile(path.join(root, "seo", "routes.json"), "utf8"));
const template = await readFile(path.join(dist, "index.html"), "utf8");
const site = "https://hiddenfeeai.com";
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

for (const route of routes.filter(({ path: routePath }) => routePath !== "/")) {
  const canonical = `${site}${route.path}`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${site}/#organization`, name: "HiddenFeeAI", url: `${site}/`, logo: { "@type": "ImageObject", url: `${site}/favicon.svg` }, email: "support@hiddenfeehub.com" },
      { "@type": "SoftwareApplication", "@id": `${site}/#software`, name: "HiddenFeeAI", url: `${site}/`, applicationCategory: "BusinessApplication", operatingSystem: "Web", provider: { "@id": `${site}/#organization` }, offers: { "@type": "Offer", price: "15.00", priceCurrency: "USD" } },
      { "@type": "WebSite", "@id": `${site}/#website`, url: `${site}/`, name: "HiddenFeeAI", publisher: { "@id": `${site}/#organization` }, potentialAction: { "@type": "SearchAction", target: `${site}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
      { "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: route.title, description: route.description, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#software` }, breadcrumb: { "@id": `${canonical}#breadcrumb` }, inLanguage: "en-US" },
      { "@type": "BreadcrumbList", "@id": `${canonical}#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "HiddenFeeAI", item: `${site}/` }, { "@type": "ListItem", position: 2, name: route.title, item: canonical }] },
    ],
  };
  const shell = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escape(route.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escape(route.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escape(route.description)}" />`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(graph)}</script>`);
  const output = path.join(dist, route.path.slice(1), "index.html");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, shell);
}
console.log(`Prerendered ${routes.length - 1} canonical route shells for crawlers and social previews.`);
