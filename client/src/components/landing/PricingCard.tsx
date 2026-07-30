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

const mobileTextStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

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
      {/* MOBILE LAYOUT */}
      <div
        className="block sm:hidden"
        style={{
          width: "100%",
          maxWidth: "100%",
          paddingLeft: "16px",
          paddingRight: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
            borderRadius: "24px",
            border: "1px solid rgba(244,197,66,.25)",
            background: "#101c2e",
            boxShadow: "0 28px 80px rgba(0,0,0,.3)",
          }}
        >
          {/* MOBILE INTRODUCTION */}
          <div
            style={{
              width: "100%",
              minWidth: 0,
              maxWidth: "100%",
              padding: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                maxWidth: "100%",
                padding: "8px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(244,197,66,.25)",
                background: "rgba(244,197,66,.1)",
                color: "#ffd45a",
              }}
            >
              <Sparkles
                style={{
                  width: "16px",
                  height: "16px",
                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  ...mobileTextStyle,
                  fontSize: "11px",
                  lineHeight: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                $15 document review
              </span>
            </div>

            <h2
              style={{
                ...mobileTextStyle,
                marginTop: "24px",
                marginBottom: 0,
                fontSize: "26px",
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#ffffff",
                textWrap: "wrap",
              }}
            >
              Know what deserves a second look—for $15.
            </h2>

            <p
              style={{
                ...mobileTextStyle,
                marginTop: "20px",
                marginBottom: 0,
                fontSize: "15px",
                lineHeight: 1.65,
                fontWeight: 500,
                color: "#dce4ec",
              }}
            >
              See the exact charges and clauses worth questioning, why they
              matter, and what you can say next.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                gap: "18px",
                marginTop: "28px",
              }}
            >
              {inclusions.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px minmax(0, 1fr)",
                    alignItems: "start",
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    gap: "11px",
                  }}
                >
                  <Check
                    strokeWidth={3}
                    style={{
                      width: "18px",
                      height: "18px",
                      marginTop: "3px",
                      color: "#42d392",
                    }}
                  />

                  <span
                    style={{
                      ...mobileTextStyle,
                      display: "block",
                      fontSize: "14px",
                      lineHeight: 1.55,
                      fontWeight: 600,
                      color: "#dce4ec",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MOBILE PAYMENT */}
          <div
            style={{
              width: "100%",
              minWidth: 0,
              maxWidth: "100%",
              padding: "20px",
              overflow: "hidden",
              borderTop: "1px solid rgba(255,255,255,.08)",
              background: "#0c1626",
            }}
          >
            <p
              style={{
                ...mobileTextStyle,
                margin: 0,
                fontSize: "11px",
                lineHeight: 1.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#7cc4ff",
              }}
            >
              Everything you need to act
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                gap: "4px 10px",
                marginTop: "18px",
              }}
            >
              <strong
                style={{
                  fontSize: "52px",
                  lineHeight: 0.95,
                  fontWeight: 900,
                  letterSpacing: "-0.055em",
                  color: "#ffffff",
                }}
              >
                $15
              </strong>

              <span
                style={{
                  paddingBottom: "4px",
                  fontSize: "15px",
                  lineHeight: 1.4,
                  fontWeight: 600,
                  color: "#dce4ec",
                }}
              >
                one time
              </span>
            </div>

            <p
              style={{
                ...mobileTextStyle,
                marginTop: "20px",
                marginBottom: 0,
                fontSize: "14px",
                lineHeight: 1.55,
                fontWeight: 600,
                color: "#dce4ec",
              }}
            >
              No subscription · No account required
            </p>

            <button
              type="button"
              onClick={startAudit}
              style={{
                ...mobileTextStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "56px",
                marginTop: "28px",
                padding: "14px 12px",
                border: 0,
                borderRadius: "16px",
                background: "#f4c542",
                color: "#111827",
                textAlign: "center",
                fontSize: "14px",
                lineHeight: 1.35,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Check My Document for Hidden Fees
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                gap: "18px",
                marginTop: "26px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0, 1fr)",
                  alignItems: "start",
                  gap: "11px",
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <CreditCard
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "3px",
                    color: "#42d392",
                  }}
                />

                <span
                  style={{
                    ...mobileTextStyle,
                    fontSize: "14px",
                    lineHeight: 1.55,
                    fontWeight: 600,
                    color: "#dce4ec",
                  }}
                >
                  Stripe-hosted checkout
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0, 1fr)",
                  alignItems: "start",
                  gap: "11px",
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <ShieldCheck
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "3px",
                    color: "#42d392",
                  }}
                />

                <span
                  style={{
                    ...mobileTextStyle,
                    fontSize: "14px",
                    lineHeight: 1.55,
                    fontWeight: 600,
                    color: "#dce4ec",
                  }}
                >
                  HiddenFeeAI does not receive full card details
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0, 1fr)",
                  alignItems: "start",
                  gap: "11px",
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <FileDown
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "3px",
                    color: "#42d392",
                  }}
                />

                <span
                  style={{
                    ...mobileTextStyle,
                    fontSize: "14px",
                    lineHeight: 1.55,
                    fontWeight: 600,
                    color: "#dce4ec",
                  }}
                >
                  Downloadable PDF included
                </span>
              </div>
            </div>

            <p
              style={{
                ...mobileTextStyle,
                marginTop: "26px",
                marginBottom: 0,
                fontSize: "13px",
                lineHeight: 1.7,
                fontWeight: 400,
                color: "#c8d3df",
              }}
            >
              By continuing, you agree to the{" "}
              <Link
                style={{
                  color: "#7cc4ff",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
                to="/terms"
              >
                Terms
              </Link>
              . Review the{" "}
              <Link
                style={{
                  color: "#7cc4ff",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
                to="/refund"
              >
                Refund Policy
              </Link>{" "}
              and{" "}
              <Link
                style={{
                  color: "#7cc4ff",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
                to="/privacy"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ORIGINAL TABLET AND DESKTOP LAYOUT */}
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