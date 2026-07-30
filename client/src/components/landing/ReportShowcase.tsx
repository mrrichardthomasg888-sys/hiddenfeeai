import {
  Check,
  CreditCard,
  FileDown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

const inclusions = [
  "Every page and line item reviewed",
  "Hidden fees, duplicate charges, and billing mistakes",
  "Confusing clauses and automatic renewals",
  "Evidence showing where each issue appears",
  "Questions and scripts you can use",
  "Downloadable Professional Audit Report",
];

export function PricingCard() {
  const startAudit = () => {
    document
      .getElementById("upload")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

    window.setTimeout(() => {
      document.getElementById("file-upload-input")?.click();
    }, 550);
  };

  return (
    <section
      id="pricing"
      className="relative w-full max-w-full scroll-mt-24 overflow-hidden bg-[#050911] py-16 sm:py-28"
    >
      <Container className="relative min-w-0 max-w-full">
        <div className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden rounded-[24px] border border-[#f4c542]/25 bg-[#101c2e] shadow-[0_28px_80px_rgba(0,0,0,.3)] sm:rounded-[28px]">
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[1.05fr_.95fr]">
            <div className="min-w-0 overflow-hidden p-5 sm:p-10 lg:p-12">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-3 py-2 text-[11px] font-bold uppercase leading-5 tracking-[0.1em] text-[#ffd45a] sm:px-4 sm:text-xs sm:tracking-[0.15em]">
                <Sparkles className="h-4 w-4 shrink-0" />

                <span className="min-w-0 break-words">
                  $15 document review
                </span>
              </div>

              <h2 className="mt-6 max-w-full break-words text-[2rem] font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl">
                Know what deserves a second look—for $15.
              </h2>

              <p className="mt-6 max-w-full break-words text-base font-medium leading-[1.7] text-[#dce4ec] sm:text-lg">
                See the exact charges and clauses worth questioning, why they
                matter, and what you can say next.
              </p>

              <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                {inclusions.map((item) => (
                  <div
                    key={item}
                    className="flex min-w-0 items-start gap-3 text-sm font-semibold leading-6 text-[#dce4ec] sm:text-base"
                  >
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-[#42d392]"
                      strokeWidth={3}
                    />

                    <span className="min-w-0 flex-1 break-words">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden border-t border-white/[0.08] bg-[#0c1626] p-5 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="max-w-full break-words text-xs font-bold uppercase leading-6 tracking-[0.12em] text-[#7cc4ff] sm:text-sm sm:tracking-[0.16em]">
                Everything you need to act
              </p>

              <div className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
                <strong className="max-w-full break-words text-6xl font-black leading-none tracking-[-0.06em] text-white sm:text-7xl">
                  $15
                </strong>

                <span className="pb-1 text-base font-semibold text-[#dce4ec] sm:pb-3">
                  one time
                </span>
              </div>

              <p className="mt-4 max-w-full break-words text-sm font-semibold leading-6 text-[#dce4ec] sm:text-base">
                No subscription · No account required
              </p>

              <Button
                variant="violet"
                size="lg"
                className="mt-8 h-auto min-h-14 w-full max-w-full whitespace-normal break-words px-4 py-4 text-center text-sm leading-5 sm:text-base"
                onClick={startAudit}
              >
                <span className="block min-w-0 max-w-full break-words">
                  Check My Document for Hidden Fees
                </span>
              </Button>

              <div className="mt-6 grid min-w-0 gap-4 text-sm font-semibold leading-6 text-[#dce4ec]">
                <div className="flex min-w-0 items-start gap-3">
                  <CreditCard className="mt-1 h-4 w-4 shrink-0 text-[#42d392]" />

                  <span className="min-w-0 flex-1 break-words">
                    Stripe-hosted checkout
                  </span>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#42d392]" />

                  <span className="min-w-0 flex-1 break-words">
                    HiddenFeeAI does not receive full card details
                  </span>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <FileDown className="mt-1 h-4 w-4 shrink-0 text-[#42d392]" />

                  <span className="min-w-0 flex-1 break-words">
                    Downloadable PDF included
                  </span>
                </div>
              </div>

              <p className="mt-6 max-w-full break-words text-sm leading-[1.7] text-[#c8d3df]">
                By continuing, you agree to the{" "}
                <Link
                  className="break-words font-semibold text-[#7cc4ff] underline underline-offset-4"
                  to="/terms"
                >
                  Terms
                </Link>
                . Review the{" "}
                <Link
                  className="break-words font-semibold text-[#7cc4ff] underline underline-offset-4"
                  to="/refund"
                >
                  Refund Policy
                </Link>{" "}
                and{" "}
                <Link
                  className="break-words font-semibold text-[#7cc4ff] underline underline-offset-4"
                  to="/privacy"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}