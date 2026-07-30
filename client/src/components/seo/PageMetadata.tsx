import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { faqs } from "@/content/faqs";

const SITE_URL = "https://hiddenfeeai.com";
const DEFAULT = {
  title: "HiddenFeeAI | AI Document Audit Software for Hidden Fees",
  description: "HiddenFeeAI is AI document audit software that finds hidden fees, billing errors, duplicate charges, and costly clauses, then gives you evidence and next steps.",
};
type Metadata = { title: string; description: string; type?: "article" | "website"; noindex?: boolean };
const pageMetadata: Record<string, Metadata> = {
  "/": DEFAULT,
  "/about": { title: "About HiddenFeeAI | AI Document Audit Software", description: "Learn what HiddenFeeAI does, who it is for, and how the product turns document fine print into evidence-led decisions." },
  "/security": { title: "HiddenFeeAI Security | Temporary Document Processing", description: "Learn how HiddenFeeAI handles temporary document processing, Stripe checkout, HTTPS transport, and short-lived report access." },
  "/methodology": { title: "HiddenFeeAI Methodology | Evidence-Led AI Audits", description: "See how HiddenFeeAI reads documents, detects cost signals, connects findings to evidence, and creates practical next steps." },
  "/accuracy": { title: "HiddenFeeAI Accuracy and Limitations", description: "Understand what improves HiddenFeeAI audit accuracy, what can reduce it, and how to verify every finding against the original document." },
  "/changelog": { title: "HiddenFeeAI Changelog | Product Updates", description: "Follow HiddenFeeAI product, report, privacy, and reliability updates." },
  "/sitemap": { title: "HiddenFeeAI HTML Sitemap", description: "Browse canonical product, trust, support, and policy pages from HiddenFeeAI." },
  "/search": { title: "Search HiddenFeeAI", description: "Search HiddenFeeAI product documentation, FAQs, and trust resources.", noindex: true },
  "/privacy": { title: "Privacy and Document Processing | HiddenFeeAI", description: "Learn how HiddenFeeAI temporarily processes uploaded documents, uses Google Gemini, handles Stripe checkout, and deletes original files." },
  "/terms": { title: "Terms of Service | HiddenFeeAI", description: "Read the terms for HiddenFeeAI's one-time AI document audit, including limitations, acceptable use, payment, and report access." },
  "/refund": { title: "Refund Policy | HiddenFeeAI", description: "Understand refund eligibility for a HiddenFeeAI document audit and how to contact support about a purchase." },
  "/contact": { title: "Contact HiddenFeeAI Support", description: "Contact HiddenFeeAI about uploads, payment, document analysis, reports, privacy, or account-free audit support." },
  "/faq": { title: "HiddenFeeAI FAQ | AI Audits, Privacy, Payment, and Reports", description: "Clear answers about HiddenFeeAI's AI audit product, supported files, one-time pricing, privacy, accuracy, and downloadable reports." },
  "/hidden-fees-car-purchase": { title: "Car Purchase Fee Analysis Software | HiddenFeeAI", description: "Use HiddenFeeAI to analyze a vehicle purchase document and create evidence-led questions about fees and financing terms.", type: "article", noindex: true },
  "/hidden-charges-medical-bills": { title: "Medical Bill Analysis Software | HiddenFeeAI", description: "Use HiddenFeeAI to analyze a medical bill and prepare evidence-led questions about charges, payments, and adjustments.", type: "article", noindex: true },
  "/review-contracts-hidden-costs": { title: "Contract Cost Analysis Software | HiddenFeeAI", description: "Use HiddenFeeAI to analyze a contract and identify terms worth questioning before you commit.", type: "article", noindex: true },
  "/hidden-fees-utility-subscription-bills": { title: "Utility and Subscription Bill Analysis | HiddenFeeAI", description: "Use HiddenFeeAI to analyze recurring bills and prepare questions about rates, credits, fees, and cancellation terms.", type: "article", noindex: true },
};
const AUTHORITY_CANONICALS: Record<string, string> = {
  "/hidden-fees-car-purchase": "https://detecthiddenfees.com/hidden-fees-car-purchase",
  "/hidden-charges-medical-bills": "https://detecthiddenfees.com/hidden-charges-medical-bills",
  "/review-contracts-hidden-costs": "https://detecthiddenfees.com/review-contracts-hidden-costs",
  "/hidden-fees-utility-subscription-bills": "https://detecthiddenfees.com/hidden-fees-utility-subscription-bills",
};

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); }
  element.content = content;
}
function upsertJsonLd(graph: unknown[]) {
  let script = document.head.querySelector<HTMLScriptElement>('script[data-hiddenfee-schema="true"]');
  if (!script) { script = document.createElement("script"); script.type = "application/ld+json"; script.dataset.hiddenfeeSchema = "true"; document.head.appendChild(script); }
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}
function breadcrumb(pathname: string, canonicalUrl: string) {
  const label = pathname === "/" ? "Home" : pathname.slice(1).split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
  return { "@type": "BreadcrumbList", "@id": `${canonicalUrl}#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "HiddenFeeAI", item: `${SITE_URL}/` }, ...(pathname === "/" ? [] : [{ "@type": "ListItem", position: 2, name: label, item: canonicalUrl }])] };
}

export function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isPrivateReport = pathname.startsWith("/report/");
    const isKnown = Boolean(pageMetadata[pathname]);
    const metadata: Metadata = isPrivateReport ? { title: "Your Professional Audit Report | HiddenFeeAI", description: "See what deserves attention, where it appears, why it matters, and what to ask next.", noindex: true } : pageMetadata[pathname] ?? { title: "Page Not Found | HiddenFeeAI", description: "The requested HiddenFeeAI page could not be found.", noindex: true };
    const canonicalPath = isPrivateReport || !isKnown ? "/" : pathname;
    const canonicalUrl = AUTHORITY_CANONICALS[pathname] ?? `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
    const noindex = Boolean(metadata.noindex);
    document.title = metadata.title;
    upsertMeta('meta[name="description"]', "name", "description", metadata.description);
    upsertMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    upsertMeta('meta[name="author"]', "name", "author", "HiddenFeeAI");
    upsertMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta('meta[property="og:type"]', "property", "og:type", metadata.type === "article" ? "article" : "website");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "HiddenFeeAI");
    upsertMeta('meta[property="og:image"]', "property", "og:image", `${SITE_URL}/og-image.png`);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${SITE_URL}/og-image.png`);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    let rss = document.head.querySelector<HTMLLinkElement>('link[rel="alternate"][type="application/rss+xml"]');
    if (!rss) { rss = document.createElement("link"); rss.rel = "alternate"; rss.type = "application/rss+xml"; rss.title = "HiddenFeeAI product updates"; document.head.appendChild(rss); }
    rss.href = `${SITE_URL}/rss.xml`;
    const organization = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "HiddenFeeAI", url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` }, email: "support@hiddenfeehub.com", contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "support@hiddenfeehub.com" }, description: "AI document audit software for hidden fees, billing errors, duplicate charges, and costly clauses." };
    const software = { "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`, name: "HiddenFeeAI", url: `${SITE_URL}/`, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: DEFAULT.description, provider: { "@id": `${SITE_URL}/#organization` }, offers: { "@type": "Offer", price: "15.00", priceCurrency: "USD", availability: "https://schema.org/InStock", description: "One-time AI document audit with evidence, action plan, scripts, and PDF report." }, featureList: ["AI document audit", "Hidden fee detection", "Billing error analysis", "Contract cost review", "Evidence-linked findings", "Negotiation scripts", "Downloadable PDF report"] };
    const website = { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: "HiddenFeeAI", publisher: { "@id": `${SITE_URL}/#organization` }, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } };
    const webPage = { "@type": "WebPage", "@id": `${canonicalUrl}#webpage`, url: canonicalUrl, name: metadata.title, description: metadata.description, isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": `${SITE_URL}/#software` }, breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` }, inLanguage: "en-US" };
    const graph: unknown[] = [organization, software, website, webPage, breadcrumb(pathname, canonicalUrl)];
    if (pathname === "/faq") graph.push({ "@type": "FAQPage", "@id": `${canonicalUrl}#faq`, mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) });
    upsertJsonLd(graph);
  }, [pathname]);
  return null;
}
