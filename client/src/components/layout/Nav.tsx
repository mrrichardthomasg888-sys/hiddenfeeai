import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";

export function Nav() {
  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    // Small delay to let scroll complete, then open file picker
    setTimeout(() => {
      document.getElementById("file-upload-input")?.click();
    }, 600);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-violet-500/10 bg-midnight-950/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" strokeWidth={2} />
          <span className="text-xl font-bold tracking-tight text-white text-glow">
            HiddenFeeAI
          </span>
        </div>
        <Button
          variant="violet"
          size="sm"
          onClick={scrollToUpload}
        >
          Start AI Audit
        </Button>
      </Container>
    </header>
  );
}
