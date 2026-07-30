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
    <>
      <style>{`
        #pricing.pricing-mobile-fix,
        #pricing.pricing-mobile-fix * {
          box-sizing: border-box;
        }

        #pricing.pricing-mobile-fix {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        #pricing.pricing-mobile-fix .pricing-shell,
        #pricing.pricing-mobile-fix .pricing-grid,
        #pricing.pricing-mobile-fix .pricing-column,
        #pricing.pricing-mobile-fix .pricing-copy,
        #pricing.pricing-mobile-fix .pricing-list,
        #pricing.pricing-mobile-fix .pricing-list-item,
        #pricing.pricing-mobile-fix .pricing-security-row,
        #pricing.pricing-mobile-fix .pricing-legal {
          min-width: 0;
          max-width: 100%;
        }

        #pricing.pricing-mobile-fix .pricing-copy,
        #pricing.pricing-mobile-fix .pricing-copy *,
        #pricing.pricing-mobile-fix .pricing-list-item,
        #pricing.pricing-mobile-fix .pricing-list-item *,
        #pricing.pricing-mobile-fix .pricing-security-row,
        #pricing.pricing-mobile-fix .pricing-security-row *,
        #pricing.pricing-mobile-fix .pricing-legal,
        #pricing.pricing-mobile-fix .pricing-legal * {
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
        }

        @media (max-width: 639px) {
          #pricing.pricing-mobile-fix {
            padding-top: 4rem;
            padding-bottom: 7.5rem;
          }

          #pricing.pricing-mobile-fix .pricing-shell {
            width: 100%;
            max-width: 100%;
            border-radius: 22px;
          }

          #pricing.pricing-mobile-fix .pricing-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            width: 100%;
          }

          #pricing.pricing-mobile-fix .pricing-column {
            width: 100%;
            padding: 20px;
            overflow: visible;
          }

          #pricing.pricing-mobile-fix .pricing-heading {
            width: 100%;
            max-width: 100%;
            font-size: 32px;
            line-height: 1.08;
            letter-spacing: -0.04em;
          }

          #pricing.pricing-mobile-fix .pricing-description {
            width: 100%;
            max-width: 100%;
            font-size: 16px;
            line-height: 1.65;
          }

          #pricing.pricing-mobile-fix .pricing-list {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
            width: 100%;
          }

          #pricing.pricing-mobile-fix .pricing-list-item {
            display: grid;
            grid-template-columns: 18px minmax(0, 1fr);
            align-items: start;
            gap: 12px;
            width: 100%;
            font-size: 15px;
            line-height: 1.55;
          }

          #pricing.pricing-mobile-fix .pricing-eyebrow {
            width: 100%;
            font-size: 12px;
            line-height: 1.5;
            letter-spacing: 0.12em;
          }

          #pricing.pricing-mobile-fix .pricing-price {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-end;
            gap: 4px 12px;
            width: 100%;
          }

          #pricing.pricing-mobile-fix .pricing-price-value {
            font-size: 60px;
            line-height: 0.95;
          }

          #pricing.pricing-mobile-fix .pricing-price-note {
            padding-bottom: 5px;
            font-size: 16px;
          }

          #pricing.pricing-mobile-fix .pricing-subscription {
            width: 100%;
            font-size: 15px;
            line-height: 1.55;
          }

          #pricing.pricing-mobile-fix .pricing-button {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            height: auto;
            min-height: 56px;
            padding: 14px 16px;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            text-align: center;
            font-size: 15px;
            line-height: 1.35;
          }

          #pricing.pricing-mobile-fix .pricing-security {
            width: 100%;
          }

          #pricing.pricing-mobile-fix .pricing-security-row {
            display: grid;
            grid-template-columns: 18px minmax(0, 1fr);
            align-items: start;
            gap: 12px;
            width: 100%;
            font-size: 14px;
            line-height: 1.55;
          }

          #pricing.pricing-mobile-fix .pricing-legal {
            width: 100%;
            font-size: 14px;
            line-height: 1.7;
          }
        }
      `}</style>

      <section
        id="pricing"
        className="pricing-mobile-fix relative scroll-mt-24 bg-[#050911] py-20 sm:py-28"
      >
        <Container className="relative min-w-0 max-w-full">
          <div className="pricing-shell mx-auto w-full min-w-0 max-w-5xl overflow-hidden rounded-[28px] border border-[#f4c542]/25 bg-[#101c2e] shadow-[0_28px_80px_rgba(0,0,0,.3)]">
            <div className="pricing-grid grid min-w-0 lg:grid-cols-[1.05fr_.95fr]">
              <div className="pricing-column min-w-0 p-7 sm:p-10 lg:p-12">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#ffd45a]">
                  <Sparkles className="h-4 w-4 shrink-0" />

                  <span className="pricing-copy min-w-0">
                    $15 document review
                  </span>
                </div>

                <h2 className="pricing-heading pricing-copy mt-6 text-4xl font-extrabold tracking-[-0.045em] text-white sm:text-5xl">
                  Know what deserves a second look—for $15.
                </h2>

                <p className="pricing-description pricing-copy mt-6 text-lg font-medium leading-[1.72] text-[#dce4ec]">
                  See the exact charges and clauses worth questioning, why they
                  matter, and what you can say next.
                </p>

                <div className="pricing-list mt-8 grid min-w-0 gap-3 sm:grid-cols-2">
                  {inclusions.map((item) => (
                    <div
                      key={item}
                      className="pricing-list-item flex min-w-0 items-start gap-2.5 text-base font-semibold text-[#dce4ec]"
                    >
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-[#42d392]"
                        strokeWidth={3}
                      />

                      <span className="pricing-copy min-w-0">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pricing-column min-w-0 border-t border-white/[0.08] bg-[#0c1626] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <p className="pricing-eyebrow pricing-copy text-sm font-bold uppercase tracking-[0.16em] text-[#7cc4ff]">
                  Everything you need to act
                </p>

                <div className="pricing-price mt-4 flex min-w-0 items-end gap-3">
                  <strong className="pricing-price-value text-7xl font-black tracking-[-0.06em] text-white">
                    $15
                  </strong>

                  <span className="pricing-price-note pb-3 text-base font-semibold text-[#dce4ec]">
                    one time
                  </span>
                </div>

                <p className="pricing-subscription pricing-copy mt-3 text-base font-semibold text-[#dce4ec]">
                  No subscription · No account required
                </p>

                <Button
                  variant="violet"
                  size="lg"
                  className="pricing-button mt-8 h-14 w-full min-w-0 max-w-full text-base"
                  onClick={startAudit}
                >
                  <span className="pricing-copy block min-w-0 max-w-full">
                    Check My Document for Hidden Fees
                  </span>
                </Button>

                <div className="pricing-security mt-6 grid min-w-0 gap-3 text-sm font-semibold text-[#dce4ec]">
                  <div className="pricing-security-row flex min-w-0 items-center gap-2">
                    <CreditCard className="h-4 w-4 shrink-0 text-[#42d392]" />

                    <span className="pricing-copy min-w-0">
                      Stripe-hosted checkout
                    </span>
                  </div>

                  <div className="pricing-security-row flex min-w-0 items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#42d392]" />

                    <span className="pricing-copy min-w-0">
                      HiddenFeeAI does not receive full card details
                    </span>
                  </div>

                  <div className="pricing-security-row flex min-w-0 items-center gap-2">
                    <FileDown className="h-4 w-4 shrink-0 text-[#42d392]" />

                    <span className="pricing-copy min-w-0">
                      Downloadable PDF included
                    </span>
                  </div>
                </div>

                <p className="pricing-legal mt-6 min-w-0 text-sm leading-[1.7] text-[#c8d3df]">
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
    </>
  );
}