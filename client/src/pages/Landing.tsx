import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { ReportShowcase } from "@/components/landing/ReportShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SecurityCard } from "@/components/landing/SecurityCard";
import { PricingCard } from "@/components/landing/PricingCard";
import { ConversionFAQ } from "@/components/landing/ConversionFAQ";
import { DocumentCoverage } from "@/components/landing/DocumentCoverage";
import { CapabilityGrid } from "@/components/landing/CapabilityGrid";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { useSearchParams } from "react-router-dom";

export function Landing() {
  const [searchParams] = useSearchParams();
  const paymentCanceled = searchParams.get("canceled") === "true";
  return (
    <div className="premium-page min-h-screen bg-midnight-950">
      <Nav />
      {paymentCanceled && <div role="status" className="border-b border-[#fbbf24]/25 bg-[#fbbf24]/10 px-5 py-3 text-center text-sm font-bold text-[#ffe8a3]">Checkout was canceled. You were not charged. Upload your document again when you are ready.</div>}
      <Hero />
      <ReportShowcase />
      <HowItWorks />
      <CapabilityGrid />
      <SecurityCard />
      <PricingCard />
      <DocumentCoverage />
      <ConversionFAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
