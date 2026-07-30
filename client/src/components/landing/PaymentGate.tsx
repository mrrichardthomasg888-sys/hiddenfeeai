import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/config/api";

interface PaymentGateProps {
  auditId: string;
  onPaymentComplete: () => void;
}

export function PaymentGate({ auditId, onPaymentComplete }: PaymentGateProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/checkout/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, origin: window.location.origin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Payment failed. Please try again.");
      }

      const data = await res.json();

      if (data.testMode) {
        // Test mode — payment bypassed, start analysis
        onPaymentComplete();
      } else if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl rounded-3xl border border-mist-200 bg-white p-7 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.35)] sm:p-9"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-900/5">
          <Lock className="h-8 w-8 text-ink-900" strokeWidth={1.75} />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-ink-900">
          Your document is ready for a full review
        </h2>
        <p className="mt-2 text-sm text-mist-500">
          Get a complete report showing what deserves attention, where it appears, and what you can ask next.
        </p>

        <div className="mt-6 w-full rounded-2xl bg-mist-50 p-5">
          <p className="text-3xl font-bold text-ink-900">$15</p>
          <p className="text-sm text-mist-500">one-time payment</p>
        </div>

        <div className="mt-5 space-y-2.5 text-left">
          {[
            "No subscription — pay once, get the full report",
            "No account required",
            "Private processing — document deleted after the review",
            "Every finding includes evidence and a clear next step",
          ].map((point) => (
            <div key={point} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" strokeWidth={2.5} />
              <span className="text-sm text-ink-900">{point}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 w-full rounded-xl bg-risk-critical/10 px-4 py-3 text-sm font-medium text-risk-critical">
            {error}
          </div>
        )}

        <Button
          variant="savings"
          size="lg"
          className="mt-6 w-full"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Get My Full Audit Report — $15"
          )}
        </Button>

        <div className="mt-4 flex items-start justify-center gap-2 text-sm text-mist-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" />
          <span>
            <span className="font-medium text-ink-900">Your original file is temporary.</span>{" "}
            It is deleted after analysis completes or fails. See the Privacy Policy for processor and retention details.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
