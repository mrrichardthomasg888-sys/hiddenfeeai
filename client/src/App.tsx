import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { AuditReport } from "@/pages/AuditReport";
import { NotFound } from "@/pages/NotFound";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";
import { Refund } from "@/pages/Refund";
import { Contact } from "@/pages/Contact";
import { FAQ } from "@/pages/FAQ";
import { HiddenFeesCarPurchase } from "@/pages/HiddenFeesCarPurchase";
import { HiddenChargesMedicalBills } from "@/pages/HiddenChargesMedicalBills";
import { ReviewContractsHiddenCosts } from "@/pages/ReviewContractsHiddenCosts";
import { HiddenFeesUtilityBills } from "@/pages/HiddenFeesUtilityBills";

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
