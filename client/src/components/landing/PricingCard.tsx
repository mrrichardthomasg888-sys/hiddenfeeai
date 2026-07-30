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
      className="relative w-full scroll-mt-24 overflow-hidden bg-[#050911] py-16 sm:py-28"
    >
      {/* MOBILE-ONLY PRICING LAYOUT */}
      <div className="block w-full px-4 sm:hidden">
        <div className="mx-auto w-full overflow-hidden rounded-[24px] border border-[#f4c542]/25 bg-[#101c2e] shadow-[0_28px_80px_rgba(0,0,0,.3)]">
          {/* Mobile overview */}
          <div className="w-full p-5">
            <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-3 py-2 text-[#ffd45a]">
              <Sparkles className="h-4 w-4 shrink-0" />

              <span className="text-[11px] font-bold uppercase leading-5 tracking-[0.1em]">
                $15 document review
              </span>
            </div>

            <h2 className="mt-6 text-[30px] font-extrabold leading-[1.08] tracking-[-0.04em] text-white">
              Know what deserves a second look—for $15.
            </h2>

            <p className="mt-5 text-[16px] font-medium leading-7 text-[#dce4ec]">
              See the exact charges and clauses worth questioning, why they
              matter, and what you can say next.
            </p>

            <div className="mt-8 space-y-5">
              {inclusions.map((item) => (
                <div
                  key={item}
                  className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3"
                >
                  <Check
                    className="mt-1 h-5 w-5 text-[#42d392]"
                    strokeWidth={3}
                  />

                  <p className="text-[15px] font-semibold leading-6 text-[#dce4ec]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile payment section */}
          <div className="w-full border-t border-white/[0.08] bg-[#0c1626] p-5">
            <p className="text-[12px] font-bold uppercase leading-5 tracking-[0.12em] text-[#7cc4ff]">
              Everything you need to act
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              <strong className="text-[60px] font-black leading-none tracking-[-0.06em] text-white">
                $15
              </strong>

              <span className="pb-1 text-[16px] font-semibold text-[#dce4ec]">
                one time
              </span>
            </div>

            <p className="mt-5 text-[15px] font-semibold leading-6 text-[#dce4ec]">
              No subscription
              <span className="mx-2">·</span>
              No account required
            </p>

            <button
              type="button"
              onClick={startAudit}
              className="mt-8 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#f4c542] px-4 py-4 text-center text-[15px] font-black leading-5 text-[#111827] shadow-[0_12px_30px_rgba(244,197,66,.18)]"
            >
              Check My Document for Hidden Fees
            </button>

            <div className="mt-7 space-y-5">
              <div className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
                <CreditCard className="mt-1 h-5 w-5 text-[#42d392]" />

                <p className="text-[14px] font-semibold leading-6 text-[#dce4ec]">
                  Stripe-hosted checkout
                </p>
              </div>

              <div className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-[#42d392]" />

                <p className="text-[14px] font-semibold leading-6 text-[#dce4ec]">
                  HiddenFeeAI does not receive full card details
                </p>
              </div>

              <div className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
                <FileDown className="mt-1 h-5 w-5 text-[#42d392]" />

                <p className="text-[14px] font-semibold leading-6 text-[#dce4ec]">
                  Downloadable PDF included
                </p>
              </div>
            </div>

            <p className="mt-7 text-[14px] leading-6 text-[#c8d3df]">
              By continuing, you agree to the{" "}
              <Link
                className="font-semibold text-[#7cc4ff] underline underline-offset-4"
                to="/terms"
              >
                Terms
              </Link>
              . Review the{" "}
              <Link
                className="font-semibold text-[#7cc4ff] underline underline-offset-4"
                to="/refund"
              >
                Refund Policy
              </Link>{" "}
              and{" "}
              <Link
                className="font-semibold text-[#7cc4ff] underline underline-offset-4"
                to="/privacy"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* TABLET AND DESKTOP — ORIGINAL DESIGN */}
      <Container className="relative hidden sm:block">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-[#f4c542]/25 bg-[#101c2e] shadow-[0_28px_80px_rgba(0,0,0,.3)]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#ffd45a]">
                <Sparkles className="h-4 w-4" />
                $15 document review
              </div>

              <h2 className="mt-6 text-5xl font-extrabold tracking-[-0.045em] text-white">
                Know what deserves a second look—for $15.
              </h2>

              <p className="mt-6 text-lg font-medium leading-[1.72] text-[#dce4ec]">
                See the exact charges and clauses worth questioning, why they
                matter, and what you can say next.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {inclusions.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-base font-semibold text-[#dce4ec]"
                  >
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-[#42d392]"
                      strokeWidth={3}
                    />

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.08] bg-[#0c1626] p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7cc4ff]">
                Everything you need to act
              </p>

              <div className="mt-4 flex items-end gap-3">
                <strong className="text-7xl font-black tracking-[-0.06em] text-white">
                  $15
                </strong>

                <span className="pb-3 text-base font-semibold text-[#dce4ec]">
                  one time
                </span>
              </div>

              <p className="mt-3 text-base font-semibold text-[#dce4ec]">
                No subscription · No account required
              </p>

              <Button
                variant="violet"
                size="lg"
                className="mt-8 h-14 w-full text-base"
                onClick={startAudit}
              >
                Check My Document for Hidden Fees
              </Button>

              <div className="mt-6 grid gap-3 text-sm font-semibold text-[#dce4ec]">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#42d392]" />
                  Stripe-hosted checkout
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#42d392]" />
                  HiddenFeeAI does not receive full card details
                </div>

                <div className="flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-[#42d392]" />
                  Downloadable PDF included
                </div>
              </div>

              <p className="mt-6 text-sm leading-[1.7] text-[#c8d3df]">
                By continuing, you agree to the{" "}
                <Link
                  className="font-semibold text-[#7cc4ff] underline underline-offset-4"
                  to="/terms"
                >
                  Terms
                </Link>
                . Review the{" "}
                <Link
                  className="font-semibold text-[#7cc4ff] underline underline-offset-4"
                  to="/refund"
                >
                  Refund Policy
                </Link>{" "}
                and{" "}
                <Link
                  className="font-semibold text-[#7cc4ff] underline underline-offset-4"
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