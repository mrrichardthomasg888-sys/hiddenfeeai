// HiddenFeeAI — Structured Data Expansion
// Generates JSON-LD schema markup for:
// FAQ, Article, HowTo, SoftwareApplication, Review, BreadcrumbList
// Never creates misleading structured data. All schemas are truth-accurate.

import { TRACKED_PAGES, type TrackedPage } from "./contentAuthority";
import { KNOWLEDGE_TOPICS, type KnowledgeTopic } from "../growth/aiAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export type SchemaType = "Article" | "FAQPage" | "HowTo" | "SoftwareApplication" | "Review" | "BreadcrumbList" | "WebPage" | "Organization";

export interface GeneratedSchema {
  type: SchemaType;
  url: string;
  jsonLd: string;
  validated: boolean;
}

// ── FAQ Schema Generator ──────────────────────────────────────────────────

export function generateFAQSchema(
  url: string,
  questions: { question: string; answer: string }[],
): GeneratedSchema {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: q.answer,
        },
      })),
    },
    null,
    2,
  );

  return {
    type: "FAQPage",
    url,
    jsonLd,
    validated: questions.length > 0 && questions.every((q) => q.question.length > 0 && q.answer.length > 0),
  };
}

// ── Article Schema Generator ───────────────────────────────────────────────

export function generateArticleSchema(
  url: string,
  page: TrackedPage,
  topic: KnowledgeTopic | undefined,
): GeneratedSchema {
  const baseUrl = "https://hiddenfeeai.com";

  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      description: topic?.answerEngineOptimization.featuredSnippetTarget ||
        `Learn about ${page.primaryKeyword} and how to identify and challenge hidden fees.`,
      url: `${baseUrl}${url}`,
      datePublished: page.lastUpdated,
      dateModified: page.lastUpdated,
      author: {
        "@type": "Organization",
        name: "HiddenFeeAI",
        url: baseUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "HiddenFeeAI",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}${url}`,
      },
      ...(topic && {
        about: topic.answerEngineOptimization.keyEntities.map((entity) => ({
          "@type": "Thing",
          name: entity,
        })),
      }),
      wordCount: page.wordCount,
      inLanguage: "en-US",
      isAccessibleForFree: true,
      ...(topic?.evidenceReferences.length ? {
        citation: topic.evidenceReferences.map((ref) => ({
          "@type": "CreativeWork",
          url: ref,
        })),
      } : {}),
    },
    null,
    2,
  );

  return {
    type: "Article",
    url,
    jsonLd,
    validated: true,
  };
}

// ── HowTo Schema Generator ─────────────────────────────────────────────────

export function generateHowToSchema(
  url: string,
  title: string,
  steps: { step: number; text: string; name?: string }[],
  tools?: string[],
  estimatedCost?: { currency: string; value: string },
): GeneratedSchema {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      description: `Step-by-step guide: ${title}`,
      ...(estimatedCost && {
        estimatedCost: {
          "@type": "MonetaryAmount",
          currency: estimatedCost.currency,
          value: estimatedCost.value,
        },
      }),
      ...(tools?.length && {
        tool: tools.map((tool) => ({
          "@type": "HowToTool",
          name: tool,
        })),
      }),
      step: steps.map((s) => ({
        "@type": "HowToStep",
        position: s.step,
        name: s.name || `Step ${s.step}`,
        itemListElement: {
          "@type": "HowToDirection",
          text: s.text,
        },
      })),
      totalTime: `PT${steps.length * 5}M`,
    },
    null,
    2,
  );

  return {
    type: "HowTo",
    url,
    jsonLd,
    validated: steps.length > 0,
  };
}

// ── SoftwareApplication Schema ─────────────────────────────────────────────

export function generateSoftwareApplicationSchema(
  url: string,
  app: {
    name: string;
    description: string;
    applicationCategory: string;
    operatingSystem: string;
    price: string;
    offersFreeTrial?: boolean;
    aggregateRating?: { ratingValue: number; reviewCount: number };
  },
): GeneratedSchema {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: app.name,
      description: app.description,
      url: `https://hiddenfeeai.com${url}`,
      applicationCategory: app.applicationCategory,
      operatingSystem: app.operatingSystem,
      price: app.price,
      priceCurrency: "USD",
      offers: {
        "@type": "Offer",
        price: app.price,
        priceCurrency: "USD",
        ...(app.offersFreeTrial ? { businessFunction: "https://purl.org/goodrelations/v1#ProvideService" } : {}),
      },
      ...(app.aggregateRating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: app.aggregateRating.ratingValue,
          reviewCount: app.aggregateRating.reviewCount,
        },
      }),
    },
    null,
    2,
  );

  return {
    type: "SoftwareApplication",
    url,
    jsonLd,
    validated: app.name.length > 0 && app.description.length > 0,
  };
}

// ── Breadcrumb Schema Generator ────────────────────────────────────────────

export function generateBreadcrumbSchema(
  url: string,
  breadcrumbs: { name: string; url: string }[],
): GeneratedSchema {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: `https://hiddenfeeai.com${crumb.url}`,
      })),
    },
    null,
    2,
  );

  return {
    type: "BreadcrumbList",
    url,
    jsonLd,
    validated: breadcrumbs.length > 0,
  };
}

// ── Organization Schema ────────────────────────────────────────────────────

export function generateOrganizationSchema(): GeneratedSchema {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "HiddenFeeAI",
      url: "https://hiddenfeeai.com",
      description: "AI-powered document analysis that finds hidden fees in contracts, bills, and purchase agreements. Save money with evidence-backed audit reports.",
      foundingDate: "2025",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://hiddenfeeai.com/contact",
      },
      sameAs: [
        "https://twitter.com/hiddenfeeai",
        "https://linkedin.com/company/hiddenfeeai",
      ],
    },
    null,
    2,
  );

  return {
    type: "Organization",
    url: "/",
    jsonLd,
    validated: true,
  };
}

// ── Auto-Generate All Schemas ──────────────────────────────────────────────

export function generateAllSchemas(): GeneratedSchema[] {
  const schemas: GeneratedSchema[] = [];

  // Organization schema (once)
  schemas.push(generateOrganizationSchema());

  // Generate schemas for each tracked page
  for (const page of TRACKED_PAGES) {
    const topic = KNOWLEDGE_TOPICS.find(
      (t) => t.slug === page.url.replace(/\//g, ""),
    );

    // Every page gets BreadcrumbList
    const breadcrumbs = generatePageBreadcrumbs(page);
    schemas.push(generateBreadcrumbSchema(page.url, breadcrumbs));

    // Generate type-specific schemas
    switch (page.type) {
      case "educational":
      case "blog":
        schemas.push(generateArticleSchema(page.url, page, topic));
        break;

      case "landing":
        schemas.push(
          generateSoftwareApplicationSchema(page.url, {
            name: "HiddenFeeAI",
            description: "AI-powered hidden fee detection and document auditing platform. Upload contracts, bills, and agreements to find hidden charges with evidence-backed analysis.",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            price: "Free (basic) / $0.99 (premium report)",
            offersFreeTrial: true,
          }),
        );
        schemas.push(
          generateArticleSchema(page.url, page, topic),
        );
        break;

      case "legal":
        // Legal pages get WebPage schema (not Article)
        schemas.push({
          type: "WebPage",
          url: page.url,
          jsonLd: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: page.title,
              description: `${page.title} for HiddenFeeAI — AI-powered hidden fee detection platform.`,
              url: `https://hiddenfeeai.com${page.url}`,
              inLanguage: "en-US",
            },
            null,
            2,
          ),
          validated: true,
        });
        break;
    }
  }

  // FAQ page gets special FAQ schema
  const faqPage = TRACKED_PAGES.find((p) => p.url === "/faq");
  if (faqPage) {
    schemas.push(
      generateFAQSchema("/faq", [
        {
          question: "Are hidden fees illegal?",
          answer: "Hidden fees are not always illegal, but many violate consumer protection laws if they are not clearly disclosed. The FTC Act prohibits unfair or deceptive practices in commerce. HiddenFeeAI helps you identify undisclosed or inflated charges so you can challenge them.",
        },
        {
          question: "How does HiddenFeeAI find hidden fees?",
          answer: "HiddenFeeAI uses advanced AI to analyze your documents line by line, comparing charges against market rates, identifying duplicate entries, flagging vague fee descriptions, and detecting inflated charges. You receive an audit report with evidence, negotiation strategies, and recommended actions.",
        },
        {
          question: "Can I negotiate hidden fees after signing?",
          answer: "While it's harder to dispute fees after signing, many can still be challenged. HiddenFeeAI provides negotiation scripts and regulatory references you can use to push back on inflated or undisclosed charges, even after the fact.",
        },
        {
          question: "Is my document data safe?",
          answer: "Absolutely. Your documents are encrypted in transit and at rest. They are automatically deleted after processing, and we never share or sell your data. HiddenFeeAI is built with a privacy-first architecture.",
        },
        {
          question: "What types of documents can I analyze?",
          answer: "HiddenFeeAI supports purchase agreements, medical bills, utility statements, subscription invoices, insurance policies, lease agreements, financing contracts, and any document that may contain hidden fees. Supported formats include PDF, images, and text.",
        },
      ]),
    );
  }

  // Educational pages with HowTo content type
  const howToTopics = KNOWLEDGE_TOPICS.filter((t) => t.contentType === "how_to");
  for (const topic of howToTopics) {
    schemas.push(
      generateHowToSchema(
        `/${topic.slug}`,
        topic.title,
        [
          { step: 1, text: "Request an itemized breakdown of all charges from the provider", name: "Get Itemized Breakdown" },
          { step: 2, text: "Scan the document for vague fee descriptions like 'processing fee' or 'administrative charge'", name: "Identify Vague Fees" },
          { step: 3, text: "Calculate the total cost over the full contract term, not just monthly payments", name: "Calculate Total Cost" },
          { step: 4, text: "Compare the total against the originally advertised price", name: "Compare Against Advertised Price" },
          { step: 5, text: "Upload the document to HiddenFeeAI for AI-powered analysis and evidence-backed findings", name: "Use HiddenFeeAI" },
        ],
        ["HiddenFeeAI Document Analyzer", "Itemized Bill Request Template"],
      ),
    );
  }

  return schemas;
}

// ── Breadcrumb Helper ──────────────────────────────────────────────────────

function generatePageBreadcrumbs(page: TrackedPage): { name: string; url: string }[] {
  const breadcrumbs: { name: string; url: string }[] = [
    { name: "Home", url: "/" },
  ];

  if (page.type === "educational" || page.type === "blog") {
    if (page.industry.length === 1) {
      breadcrumbs.push({
        name: capitalize(page.industry[0]),
        url: `/${page.industry[0]}`,
      });
    } else if (page.industry.length > 1) {
      breadcrumbs.push({ name: "Guides", url: "/guides" });
    }
  }

  if (page.type === "legal") {
    breadcrumbs.push({ name: "Legal", url: "/legal" });
  }

  breadcrumbs.push({ name: page.title, url: page.url });

  return breadcrumbs;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Schema Validation ─────────────────────────────────────────────────────

export function validateSchemaCoverage(): {
  totalPages: number;
  pagesWithSchema: number;
  coveragePercent: number;
  pagesNeedingSchema: string[];
} {
  const total = TRACKED_PAGES.length;
  const withSchema = TRACKED_PAGES.filter((p) => p.hasSchema).length;
  const needing = TRACKED_PAGES.filter((p) => !p.hasSchema).map((p) => p.url);

  return {
    totalPages: total,
    pagesWithSchema: withSchema,
    coveragePercent: Math.round((withSchema / total) * 100),
    pagesNeedingSchema: needing,
  };
}

export const SCHEMA_GENERATOR_VERSION = "2.0.0";