import { Link } from "react-router-dom";
import { Container } from "@/components/layout/Container";
import { BrandIdentity } from "@/components/brand/BrandIdentity";

const homeLinks = [["Upload Document", "upload"], ["How It Works", "how-it-works"], ["What We Find", "what-we-find"], ["Sample Report", "sample-report"], ["Pricing", "pricing"], ["Supported Documents", "documents"]] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#050911] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-14 sm:pb-14">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div><BrandIdentity /><p className="mt-5 max-w-md text-base font-medium leading-[1.7] text-[#dce4ec]">Find hidden fees, duplicate charges, billing mistakes, and costly clauses—then see exactly what to question.</p><p className="mt-5 max-w-md text-sm leading-[1.7] text-[#c8d3df]">Informational review only. HiddenFeeAI is not a law firm, accounting firm, financial adviser, insurer, or government agency.</p></div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div><h2 className="text-sm font-extrabold uppercase tracking-[.14em] text-white">Product</h2><div className="mt-4 flex flex-col gap-3">{homeLinks.map(([label,id]) => <a key={id} href={`/#${id}`} className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">{label}</a>)}</div></div>
            <div><h2 className="text-sm font-extrabold uppercase tracking-[.14em] text-white">Resources</h2><div className="mt-4 flex flex-col gap-3"><Link to="/faq" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">FAQ</Link><Link to="/hidden-fees-car-purchase" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Car Purchase Fees</Link><Link to="/hidden-charges-medical-bills" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Medical Bill Charges</Link><Link to="/review-contracts-hidden-costs" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Contract Review</Link><Link to="/hidden-fees-utility-subscription-bills" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Utility and Subscription Fees</Link></div></div>
            <div><h2 className="text-sm font-extrabold uppercase tracking-[.14em] text-white">Company</h2><div className="mt-4 flex flex-col gap-3"><Link to="/about" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">About</Link><Link to="/security" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Security</Link><Link to="/methodology" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Methodology</Link><Link to="/accuracy" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Accuracy</Link><Link to="/changelog" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Changelog</Link><Link to="/privacy" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Privacy Policy</Link><Link to="/terms" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Terms</Link><Link to="/refund" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Refund Policy</Link><Link to="/contact" className="text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">Contact</Link><a href="mailto:support@hiddenfeehub.com" className="break-all text-[15px] font-semibold text-[#dce4ec] hover:text-[#7cc4ff]">support@hiddenfeehub.com</a></div></div>
          </div>
        </div>
        <div className="mt-12 border-t border-white/[0.1] pt-6 text-sm text-[#c8d3df]">© {new Date().getFullYear()} HiddenFeeAI. All rights reserved.</div>
      </Container>
    </footer>
  );
}
