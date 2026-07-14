import { Check } from "lucide-react";
import { Container } from "@/components/layout/Container";

const docs = [
  "Invoices",
  "Receipts",
  "Contracts",
  "Medical Bills",
  "Auto Bills",
  "Subscription Bills",
  "Insurance Statements",
  "Bank Statements",
  "Leases",
];

export function SupportedDocuments() {
  return (
    <section className="border-t border-mist-200 bg-mist-50 py-16">
      <Container>
        <p className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-mist-500">
          Designed to analyze
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {docs.map((doc) => (
            <div
              key={doc}
              className="flex items-center gap-1.5 rounded-full border border-mist-200 bg-white px-4 py-2 text-sm text-ink-900 shadow-sm"
            >
              <Check className="h-3.5 w-3.5 text-savings-500" strokeWidth={2.5} />
              {doc}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
