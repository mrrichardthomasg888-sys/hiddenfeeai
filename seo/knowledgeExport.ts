// HiddenFeeAI — AI Answer Engine Knowledge Export
// Prepares structured knowledge outputs for FAQ pages, AI search answers,
// educational articles, and industry guides.
// Includes entity relationships, questions, answers, and schema connections.

import { CONSUMER_QUESTIONS } from "../knowledge/consumerQuestions";
import { KNOWLEDGE_TOPICS } from "../growth/aiAuthority";
import { NODES, EDGES } from "../knowledge/knowledgeGraph";
import { FEE_INTELLIGENCE, FEE_ALIAS_MAP } from "../intelligence/feeIntelligenceNetwork";

// ── Types ──────────────────────────────────────────────────────────────────

export interface KnowledgeExport {
  exportType: "faq_page" | "ai_search_answer" | "educational_article" | "industry_guide" | "entity_graph";
  targetIndustry?: string;
  targetFeeCategory?: string;
  content: ExportedContent[];
  metadata: { generatedAt: string; totalItems: number; version: string };
}

export interface ExportedContent {
  id: string;
  type: "question_answer" | "fee_explanation" | "entity_relationship" | "topic_summary";
  title: string;
  content: string;
  entities: string[];
  relatedTopics: string[];
  schemaType: string;
  priority: "Critical" | "High" | "Medium" | "Low";
}

// ── FAQ Export ─────────────────────────────────────────────────────────────

export function exportFAQKnowledge(industry?: string): KnowledgeExport {
  const questions = industry
    ? CONSUMER_QUESTIONS.filter((q) => q.industry.includes(industry))
    : CONSUMER_QUESTIONS;

  return {
    exportType: "faq_page",
    targetIndustry: industry,
    content: questions.map((q) => ({
      id: q.id,
      type: "question_answer" as const,
      title: q.question,
      content: q.shortAnswer,
      entities: q.knowledgeGraphNodes,
      relatedTopics: q.relatedQuestions,
      schemaType: "FAQPage",
      priority: q.featuredSnippetPotential ? "Critical" : "High",
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      totalItems: questions.length,
      version: "4.0.0",
    },
  };
}

// ── AI Search Answer Export ────────────────────────────────────────────────

export function exportAISearchAnswers(): KnowledgeExport {
  return {
    exportType: "ai_search_answer",
    content: KNOWLEDGE_TOPICS.map((topic) => ({
      id: topic.id,
      type: "topic_summary" as const,
      title: topic.title,
      content: topic.answerEngineOptimization.featuredSnippetTarget,
      entities: topic.answerEngineOptimization.keyEntities,
      relatedTopics: topic.relatedTopics,
      schemaType: topic.answerEngineOptimization.schemaType,
      priority: topic.authorityScore >= 90 ? "Critical" : topic.authorityScore >= 80 ? "High" : "Medium",
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      totalItems: KNOWLEDGE_TOPICS.length,
      version: "4.0.0",
    },
  };
}

// ── Entity Graph Export ────────────────────────────────────────────────────

export function exportEntityGraph(): KnowledgeExport {
  return {
    exportType: "entity_graph",
    content: NODES.slice(0, 50).map((node) => ({
      id: node.id,
      type: "entity_relationship" as const,
      title: node.label,
      content: node.description,
      entities: node.aliases,
      relatedTopics: EDGES
        .filter((e) => e.from === node.id || e.to === node.id)
        .map((e) => (e.from === node.id ? e.to : e.from)),
      schemaType: "DefinedTerm",
      priority: node.weight >= 90 ? "Critical" : node.weight >= 75 ? "High" : "Medium",
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      totalItems: Math.min(NODES.length, 50),
      version: "4.0.0",
    },
  };
}

// ── Industry Guide Export ──────────────────────────────────────────────────

export function exportIndustryGuide(industry: string): KnowledgeExport {
  const industryFees = FEE_INTELLIGENCE.filter((f) => f.industries.includes(industry as any));
  const industryQuestions = CONSUMER_QUESTIONS.filter((q) => q.industry.includes(industry));
  const industryNodes = NODES.filter((n) => n.id.includes(`industry-${industry}`));

  return {
    exportType: "industry_guide",
    targetIndustry: industry,
    content: [
      ...industryFees.map((fee) => ({
        id: fee.feeId,
        type: "fee_explanation" as const,
        title: fee.canonicalName,
        content: fee.description,
        entities: [...fee.commonNames, ...fee.alternativeNames],
        relatedTopics: fee.consumerQuestions,
        schemaType: "Article",
        priority: fee.frequencyScore >= 80 ? "Critical" : fee.frequencyScore >= 60 ? "High" : "Medium" as const,
      })),
      ...industryQuestions.map((q) => ({
        id: q.id,
        type: "question_answer" as const,
        title: q.question,
        content: q.shortAnswer,
        entities: q.knowledgeGraphNodes,
        relatedTopics: q.relatedQuestions,
        schemaType: "FAQPage",
        priority: q.featuredSnippetPotential ? "Critical" : "High" as const,
      })),
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      totalItems: industryFees.length + industryQuestions.length,
      version: "4.0.0",
    },
  };
}

// ── All-in-One Export ──────────────────────────────────────────────────────

export function exportAllKnowledge(): { faq: KnowledgeExport; aiSearch: KnowledgeExport; entityGraph: KnowledgeExport } {
  return {
    faq: exportFAQKnowledge(),
    aiSearch: exportAISearchAnswers(),
    entityGraph: exportEntityGraph(),
  };
}

export const KNOWLEDGE_EXPORT_VERSION = "4.0.0";