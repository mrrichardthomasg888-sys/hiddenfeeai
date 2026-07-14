import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustSection } from "@/components/landing/TrustSection";
import { BrandStatement } from "@/components/landing/BrandStatement";
import { DocumentTypes } from "@/components/landing/DocumentTypes";
import { AuditPreview } from "@/components/landing/AuditPreview";
import { ReportShowcase } from "@/components/landing/ReportShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SecurityCard } from "@/components/landing/SecurityCard";
import { PricingCard } from "@/components/landing/PricingCard";

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <TrustSection />
      <BrandStatement />
      <DocumentTypes />
      <AuditPreview />
      <ReportShowcase />
      <HowItWorks />
      <SecurityCard />
      <PricingCard />
      <Footer />
    </div>
  );
}
