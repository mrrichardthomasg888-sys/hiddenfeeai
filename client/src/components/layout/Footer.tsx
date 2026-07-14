import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";

export function Footer() {
  return (
    <footer className="border-t border-mist-200 bg-white py-10">
      <Container className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-savings-500" />
          <span className="text-sm font-medium text-ink-900">HiddenFeeAI</span>
        </div>
        <p className="max-w-md text-xs text-mist-500">
          Your documents are analyzed privately and automatically deleted after
          processing. Never sold. Never used to train AI models.
        </p>
        <p className="text-xs text-mist-400">
          © {new Date().getFullYear()} HiddenFeeAI. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
