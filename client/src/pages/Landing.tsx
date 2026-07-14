import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ExampleReport } from "@/components/landing/ExampleReport";
import { SecurityCard } from "@/components/landing/SecurityCard";
import { SupportedDocuments } from "@/components/landing/SupportedDocuments";
import { PricingCard } from "@/components/landing/PricingCard";

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <HowItWorks />
      <ExampleReport />
      <SecurityCard />
      <SupportedDocuments />
      <PricingCard />
      <Footer />
    </div>
  );
}
