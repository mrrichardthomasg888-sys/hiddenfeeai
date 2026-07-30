import { Link } from "react-router-dom";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

type PageKind = "about" | "security" | "methodology" | "accuracy";

const content: Record<PageKind, { eyebrow: string; title: string; intro: string; sections: Array<[string, string]> }> = {
  about: {
    eyebrow: "About the product",
    title: "A faster way to understand the fine print.",
    intro: "HiddenFeeAI is an AI document-audit product for people who want a clearer view of charges, terms, and negotiation opportunities before they commit or pay.",
    sections: [
      ["What HiddenFeeAI does", "Upload a bill, invoice, receipt, agreement, or contract and HiddenFeeAI turns the visible document into an evidence-led review. The product identifies potential hidden fees, duplicate charges, billing mistakes, risky clauses, and questions worth asking."] ,
      ["Built for decisions", "The product is designed around useful output: a risk view, financial impact, source evidence, recommended actions, questions, phone language, email language, and a downloadable report. It is software that helps a person prepare—not a replacement for a qualified professional."] ,
      ["Our product boundary", "HiddenFeeAI is independent software. It is not a law firm, accounting firm, financial adviser, insurer, lender, government agency, or payment provider. Review the original document and seek professional advice for consequential decisions."] ,
    ],
  },
  security: {
    eyebrow: "Trust and security",
    title: "Privacy-aware document processing by design.",
    intro: "HiddenFeeAI uses a short-lived, no-account workflow so the product can produce a report without building a permanent document library.",
    sections: [
      ["Temporary processing", "The original upload is processed for the requested audit. Extracted source data is cleared when analysis completes or fails, and the temporary audit record expires after its short retention window. The report is available only through its private report link during that window."] ,
      ["Payment separation", "Checkout is hosted by Stripe. HiddenFeeAI does not receive or store the full payment-card number. Payment status is used only to unlock the report workflow."] ,
      ["Transport and operational controls", "Uploads and report requests use HTTPS-protected connections. Abuse controls, input validation, error handling, and short-lived storage reduce exposure. No internet-connected service can promise absolute security, so do not upload passwords, payment-card numbers, or unrelated sensitive information."] ,
    ],
  },
  methodology: {
    eyebrow: "How the product works",
    title: "A transparent audit path from document to decision.",
    intro: "HiddenFeeAI is structured around evidence, not a black-box score alone. Each output is intended to show what was noticed, where it appears, why it matters, and what to ask next.",
    sections: [
      ["1. Document reading", "The product accepts supported documents and images, extracts visible text and structure, and accounts for page context where available. Document quality affects the completeness of the result."] ,
      ["2. Finding detection", "The AI reviews charges, totals, repeated items, terms, renewal language, cancellation language, and other cost signals. Findings are categorized and assigned severity and confidence information."] ,
      ["3. Evidence and action", "The report connects findings to source evidence when available, explains consumer impact, estimates potential savings where the document supports it, and generates practical questions and scripts."] ,
      ["4. Human verification", "Use the report as an informed starting point. Compare every important item with the original document and confirm disputed charges with the provider or a qualified professional."] ,
    ],
  },
  accuracy: {
    eyebrow: "Accuracy and limitations",
    title: "Useful evidence, with honest boundaries.",
    intro: "AI document review can accelerate understanding, but it cannot guarantee that every charge, clause, or mistake will be found.",
    sections: [
      ["What improves accuracy", "Clear typed text, complete pages, readable scans, visible totals, and surrounding context generally produce stronger results. Upload the complete document whenever possible."] ,
      ["What can reduce accuracy", "Blurred images, handwriting, missing pages, unusual layouts, ambiguous terms, tables that do not extract cleanly, and documents in languages outside the product's strongest coverage can reduce completeness."] ,
      ["How to use a finding", "A finding is a reason to investigate, not proof that a provider acted improperly. Verify the quoted evidence, request an explanation in writing, and consult legal, financial, tax, medical-billing, or other qualified professionals when appropriate."] ,
    ],
  },
};

export function ProductTrustPage({ kind }: { kind: PageKind }) {
  const page = content[kind];
  return <div className="premium-page min-h-screen bg-[#050911]"><Nav /><main className="py-20 sm:py-24"><Container className="max-w-4xl"><article><header className="max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">{page.eyebrow}</p><h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">{page.title}</h1><p className="mt-6 text-lg font-medium leading-[1.75] text-[#dce4ec]">{page.intro}</p></header><div className="mt-14 space-y-5">{page.sections.map(([title, text]) => <section key={title} className="rounded-[22px] border border-white/[0.11] bg-[#111d30] p-7 shadow-[0_18px_48px_rgba(0,0,0,.2)] sm:p-9"><h2 className="text-2xl font-extrabold text-white">{title}</h2><p className="mt-4 text-base font-medium leading-[1.8] text-[#dce4ec]">{text}</p></section>)}</div><nav aria-label="Trust resources" className="mt-10 flex flex-wrap gap-3"><Link to="/privacy" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-[#dce4ec]">Privacy Policy</Link><Link to="/contact" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-[#dce4ec]">Contact Support</Link><Link to="/changelog" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-[#dce4ec]">Changelog</Link></nav></article></Container></main><Footer /></div>;
}
