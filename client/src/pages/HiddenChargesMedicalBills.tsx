import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HiddenChargesMedicalBills() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-12">
            <header className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-glow">
                Hidden Charges on Medical Bills
              </h1>
              <p className="text-lg text-violet-300/80 max-w-3xl mx-auto leading-relaxed">
                Medical billing errors and hidden charges affect 80% of patients. 
                Learn how to identify overcharges, fight billing mistakes, and save money on healthcare.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Analyze Your Medical Bill</Button>
                </Link>
                <Link to="/faq">
                  <Button variant="outline" size="lg">View FAQ</Button>
                </Link>
              </div>
            </header>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">The Medical Billing Problem</h2>
              <p className="text-violet-200/80 leading-relaxed">
                Medical billing is notoriously complex and error-prone. Studies consistently show that up to 80% of medical 
                bills contain errors, and many of those errors result in overcharges. The healthcare billing system is so 
                complicated that even insurance companies struggle to catch every mistake.
              </p>
              <p className="text-violet-200/80 leading-relaxed">
                From incorrect billing codes to duplicate charges and charges for services not rendered, hidden fees and 
                errors on medical bills cost patients billions of dollars each year. The good news is that many of these 
                errors can be identified and challenged with the right tools and knowledge.
              </p>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Common Medical Bill Overcharges</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Upcoding</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Providers use billing codes for more expensive services than what was actually performed. For example, 
                    billing a comprehensive exam when a brief visit occurred, or charging for a higher level of care than 
                    was provided.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Duplicate Charges</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    The same service appears multiple times on your bill. This can happen accidentally due to billing system 
                    errors, but it's shockingly common. A single lab test might appear two or three times.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Unbundled Services</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Services that should be billed together as a package are billed separately at higher individual rates. 
                    Surgery packages, for instance, include many ancillary services that should not be separately itemized.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Charges for Cancelled Services</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Bills often include charges for tests, procedures, or appointments that were scheduled but later cancelled 
                    or never performed. These charges slip through billing system audits.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Out-of-Network Balance Billing</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Even at in-network facilities, you may be treated by out-of-network providers (anesthesiologists, 
                    radiologists, assistants) who then bill you for the balance not covered by insurance.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Facility Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    More hospitals are charging separate "facility fees" for outpatient services. These fees, which can 
                    be hundreds or thousands of dollars, are charged on top of the actual medical service fees.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">How to Review Your Medical Bill</h2>
              <ol className="list-decimal pl-6 space-y-3 text-violet-200/80">
                <li className="leading-relaxed"><strong className="text-white">Get an itemized bill</strong> — Always request a detailed, itemized bill rather than a summary. Summary bills hide individual charges.</li>
                <li className="leading-relaxed"><strong className="text-white">Check dates and services</strong> — Verify that you actually received each service on the date listed. Cross-reference with your calendar or appointment records.</li>
                <li className="leading-relaxed"><strong className="text-white">Look for duplicate CPT codes</strong> — The same billing code appearing multiple times may indicate a duplicate charge.</li>
                <li className="leading-relaxed"><strong className="text-white">Compare to your EOB</strong> — Your Explanation of Benefits from insurance should match the provider's bill. Discrepancies need investigation.</li>
                <li className="leading-relaxed"><strong className="text-white">Use HiddenFeeAI</strong> — Upload your medical bill and EOB for AI-powered analysis to identify potential errors and overcharges.</li>
              </ol>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">What to Do When You Find an Error</h2>
              <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                <li><strong className="text-white">Contact the billing department</strong> — Start by calling the provider's billing department. Many errors can be resolved with a phone call.</li>
                <li><strong className="text-white">Dispute in writing</strong> — For complex issues, send a formal written dispute. Include copies of your evidence and keep records of all correspondence.</li>
                <li><strong className="text-white">Involve your insurance company</strong> — Your insurer has a vested interest in correct billing. They can help investigate and resolve disputes.</li>
                <li><strong className="text-white">Negotiate the balance</strong> — For legitimate charges that are still unaffordable, many providers will accept a reduced payment or offer a payment plan.</li>
                <li><strong className="text-white">Seek professional help</strong> — For large bills, consider hiring a medical billing advocate who can negotiate on your behalf.</li>
              </ul>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-6">
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white">How common are medical billing errors?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Studies by the American Medical Association and others find that 70-80% of medical bills contain errors. Not all errors result in overcharges, but a significant portion do.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Can I negotiate my medical bill?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Yes. Many hospitals and providers will negotiate bills, especially for uninsured or underinsured patients. Cash discounts of 20-50% are common. Always ask.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">How long do I have to dispute a medical bill?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">This varies by state and insurance plan. Generally, you have 30-180 days from the date of the bill. Check your insurance policy for specific deadlines.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">What can HiddenFeeAI detect on medical bills?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">HiddenFeeAI can identify potential duplicate charges, unusual billing codes, prices that seem out of range, and patterns that suggest upcoding or unbundling. It provides a starting point for your investigation.</p>
                </div>
              </div>
              <div className="text-center pt-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Analyze Your Medical Bill Now</Button>
                </Link>
              </div>
            </section>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}