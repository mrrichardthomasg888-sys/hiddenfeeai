import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://hiddenfeeai.com";
const DEFAULT = {
  title: "HiddenFeeAI | Find Hidden Fees Before They Cost You Money",
  description: "Upload a bill, invoice, receipt, or contract. Find hidden fees, duplicate charges, billing mistakes, and costly clauses—plus the evidence and questions you can use.",
};

const pageMetadata: Record<string, { title: string; description: string; type?: "article" | "website" }> = {
  "/": DEFAULT,
  "/privacy": { title: "Privacy and Document Processing | HiddenFeeAI", description: "Learn how HiddenFeeAI temporarily processes uploaded documents, uses Google Gemini, handles Stripe checkout, and deletes original files." },
  "/terms": { title: "Terms of Service | HiddenFeeAI", description: "Read the terms for HiddenFeeAI's one-time financial document audit, including limitations, acceptable use, and payment conditions." },
  "/refund": { title: "Refund Policy | HiddenFeeAI", description: "Understand refund eligibility for a HiddenFeeAI document audit and how to contact support about a purchase." },
  "/contact": { title: "Contact HiddenFeeAI Support", description: "Contact HiddenFeeAI about uploads, payment, document analysis, reports, privacy, or account-free audit support." },
  "/faq": { title: "HiddenFeeAI FAQ | Uploads, Privacy, Payment, and Reports", description: "Clear answers about supported files, the $15 audit, Stripe checkout, temporary document processing, AI limitations, and downloadable reports." },
  "/hidden-fees-car-purchase": { title: "How to Review Car Purchase Agreement Fees | HiddenFeeAI", description: "Learn how to review vehicle purchase fees, optional products, government charges, financing terms, cancellation language, and the out-the-door total.", type: "article" },
  "/hidden-charges-medical-bills": { title: "How to Review Questionable Medical Bill Charges | HiddenFeeAI", description: "Compare an itemized medical bill with an explanation of benefits, payments, adjustments, dates, and services to prepare focused billing questions.", type: "article" },
  "/review-contracts-hidden-costs": { title: "How to Find Hidden Costs in Contract Language | HiddenFeeAI", description: "Review contract renewals, price changes, cancellation charges, minimum commitments, liability terms, and other clauses that can affect total cost.", type: "article" },
  "/hidden-fees-utility-subscription-bills": { title: "How to Review Utility and Subscription Bill Fees | HiddenFeeAI", description: "Review recurring bills for rate changes, equipment, add-ons, missing credits, prior balances, provider fees, and cancellation terms.", type: "article" },
};

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivateReport = pathname.startsWith("/report/");
    const isKnown = Boolean(pageMetadata[pathname]);
    const metadata = isPrivateReport
      ? { title: "Your Professional Audit Report | HiddenFeeAI", description: "See what deserves attention, where it appears, why it matters, and what to ask next." }
      : pageMetadata[pathname] ?? { title: "Page Not Found | HiddenFeeAI", description: "The requested HiddenFeeAI page could not be found." };
    const canonicalPath = isPrivateReport || !isKnown ? "/" : pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;

    document.title = metadata.title;
    upsertMeta('meta[name="description"]', "name", "description", metadata.description);
    upsertMeta('meta[name="robots"]', "name", "robots", isPrivateReport || !isKnown ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    upsertMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "type" in metadata && metadata.type === "article" ? "article" : "website");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
