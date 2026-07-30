import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { PageMetadata } from "@/components/seo/PageMetadata";
import { MobileAuditBar } from "@/components/landing/MobileAuditBar";

const AuditReport = lazy(() => import("@/pages/AuditReport").then((m) => ({ default: m.AuditReport })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const Privacy = lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const Refund = lazy(() => import("@/pages/Refund").then((m) => ({ default: m.Refund })));
const Contact = lazy(() => import("@/pages/Contact").then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => import("@/pages/FAQ").then((m) => ({ default: m.FAQ })));
const HiddenFeesCarPurchase = lazy(() => import("@/pages/HiddenFeesCarPurchase").then((m) => ({ default: m.HiddenFeesCarPurchase })));
const HiddenChargesMedicalBills = lazy(() => import("@/pages/HiddenChargesMedicalBills").then((m) => ({ default: m.HiddenChargesMedicalBills })));
const ReviewContractsHiddenCosts = lazy(() => import("@/pages/ReviewContractsHiddenCosts").then((m) => ({ default: m.ReviewContractsHiddenCosts })));
const HiddenFeesUtilityBills = lazy(() => import("@/pages/HiddenFeesUtilityBills").then((m) => ({ default: m.HiddenFeesUtilityBills })));

function RouteFallback() {
  return <div className="min-h-screen bg-midnight-950" aria-label="Loading page" />;
}

function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <Suspense fallback={<RouteFallback />}><Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/report/:auditId" element={<AuditReport />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/hidden-fees-car-purchase" element={<HiddenFeesCarPurchase />} />
        <Route path="/hidden-charges-medical-bills" element={<HiddenChargesMedicalBills />} />
        <Route path="/review-contracts-hidden-costs" element={<ReviewContractsHiddenCosts />} />
        <Route path="/hidden-fees-utility-subscription-bills" element={<HiddenFeesUtilityBills />} />
        <Route path="*" element={<NotFound />} />
      </Routes></Suspense>
      <MobileAuditBar />
    </BrowserRouter>
  );
}

export default App;
