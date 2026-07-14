import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-violet-500/5 bg-midnight-950 py-10">
      <Container className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between w-full">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-violet-400" strokeWidth={2} />
            <span className="text-base font-bold text-violet-100">HiddenFeeAI</span>
          </div>
          <p className="max-w-md text-xs text-violet-400/50 text-center sm:text-left">
            Your documents are analyzed privately and automatically deleted after
            processing. Never sold. Never used to train AI models.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 w-full text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-violet-200 text-xs uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-1.5">
              <Link to="/terms" className="text-violet-400/70 hover:text-violet-300 transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="text-violet-400/70 hover:text-violet-300 transition-colors">Privacy Policy</Link>
              <Link to="/refund" className="text-violet-400/70 hover:text-violet-300 transition-colors">Refund Policy</Link>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-violet-200 text-xs uppercase tracking-wider">Support</h4>
            <div className="flex flex-col gap-1.5">
              <Link to="/contact" className="text-violet-400/70 hover:text-violet-300 transition-colors">Contact Us</Link>
              <Link to="/faq" className="text-violet-400/70 hover:text-violet-300 transition-colors">FAQ</Link>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-violet-200 text-xs uppercase tracking-wider">Resources</h4>
            <div className="flex flex-col gap-1.5">
              <Link to="/hidden-fees-car-purchase" className="text-violet-400/70 hover:text-violet-300 transition-colors">Car Purchase Fees</Link>
              <Link to="/hidden-charges-medical-bills" className="text-violet-400/70 hover:text-violet-300 transition-colors">Medical Bill Charges</Link>
              <Link to="/review-contracts-hidden-costs" className="text-violet-400/70 hover:text-violet-300 transition-colors">Contract Review</Link>
              <Link to="/hidden-fees-utility-subscription-bills" className="text-violet-400/70 hover:text-violet-300 transition-colors">Utility & Subscription Fees</Link>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-violet-200 text-xs uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-1.5">
              <Link to="/" className="text-violet-400/70 hover:text-violet-300 transition-colors">Home</Link>
              <a href="mailto:support@hiddenfeehub.com" className="text-violet-400/70 hover:text-violet-300 transition-colors">support@hiddenfeehub.com</a>
            </div>
          </div>
        </div>

        <p className="text-xs text-violet-400/30">
          © {new Date().getFullYear()} HiddenFeeAI. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
