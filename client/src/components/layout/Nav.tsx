import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";

export function Nav() {
  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-900/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-savings-400" strokeWidth={2} />
          <span className="text-base font-semibold tracking-tight text-white">
            HiddenFeeAI
          </span>
        </div>
        <Button variant="savings" size="sm" onClick={scrollToUpload}>
          Start AI Audit
        </Button>
      </Container>
    </header>
  );
}
