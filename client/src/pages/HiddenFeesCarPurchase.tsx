import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HiddenFeesCarPurchase() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-12">
            {/* HERO */}
            <header className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-glow">
                Hidden Fees in Car Purchase Agreements
              </h1>
              <p className="text-lg text-violet-300/80 max-w-3xl mx-auto leading-relaxed">
                Dealerships add thousands in hidden fees to car purchase agreements. 
                Learn how to identify, challenge, and remove these charges before you sign.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Audit Your Agreement</Button>
                </Link>
                <Link to="/faq">
                  <Button variant="outline" size="lg">View FAQ</Button>
                </Link>
              </div>
            </header>

            {/* SECTION 1 */}
            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">The True Cost of Buying a Car</h2>
              <p className="text-violet-200/80 leading-relaxed">
                When you buy a car, the advertised price is rarely what you actually pay. Dealerships have perfected the art of 
                adding hidden fees throughout the purchase process. Studies show that the average car buyer pays between $1,000 
                and $5,000 more than the advertised price due to hidden and unnecessary charges.
              </p>
              <p className="text-violet-200/80 leading-relaxed">
                These fees are buried in the fine print of purchase agreements, financing contracts, and add-on documents. 
                Many buyers sign without realizing they're agreeing to charges that are either inflated, unnecessary, or 
                completely fabricated. HiddenFeeAI was built to help you catch these charges before you sign.
              </p>
            </section>

            {/* SECTION 2 */}
            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Common Hidden Fees in Car Deals</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Documentation Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Dealerships charge "doc fees" for processing paperwork. While a reasonable fee ($100-200) is expected, 
                    many dealers charge $500-1,000 or more. These fees are almost entirely profit and are often negotiable.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Dealer Preparation Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Charging you for "prepping" the car — cleaning, inspection, and fueling. This is a standard cost of 
                    doing business that should not be passed to the customer as a separate line item.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">VIN Etching</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Many dealers add a fee for etching the VIN into the windows, claiming theft protection. This service 
                    costs the dealer under $10 but is often charged at $200-500. It is rarely requested by buyers.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Extended Warranties and Service Plans</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Dealers often bury expensive extended warranties and prepaid service plans into financing agreements. 
                    These can add thousands to your monthly payment and are frequently unnecessary.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">GAP Insurance Markup</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    While GAP insurance can be valuable, dealers often charge 2-3 times the market rate. You can usually 
                    purchase GAP coverage through your auto insurance provider for much less.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Credit Life and Disability Insurance</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    These high-commission products are often slipped into financing agreements without clear explanation. 
                    They pay off your loan if you die or become disabled, but they are expensive and often duplicative of 
                    existing coverage.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 3 */}
            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">How to Spot Hidden Fees</h2>
              <ol className="list-decimal pl-6 space-y-3 text-violet-200/80">
                <li className="leading-relaxed">
                  <strong className="text-white">Review the total price</strong> — not just the monthly payment. Dealers 
                  love to focus on monthly payments to obscure the total cost.
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">Request an itemized quote</strong> — Ask for every single fee in writing 
                  before you agree to anything. If a fee seems vague, challenge it.
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">Compare financing terms</strong> — Get pre-approved by your bank or credit 
                  union before visiting the dealer. This gives you a baseline to compare.
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">Watch for packed payments</strong> — Dealers may bundle taxes, fees, 
                  and add-ons into your monthly payment without itemizing them.
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">Use HiddenFeeAI to scan the contract</strong> — Upload your purchase 
                  agreement before signing and let AI flag potential issues.
                </li>
              </ol>
            </section>

            {/* SECTION 4 */}
            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Negotiation Strategies</h2>
              <p className="text-violet-200/80 leading-relaxed">
                Knowing about hidden fees is only half the battle. You also need to know how to negotiate them away.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                <li><strong className="text-white">Be willing to walk away</strong> — The single most powerful negotiation tool is your ability to leave. Dealers know this and will often remove fees to keep you.</li>
                <li><strong className="text-white">Focus on the "out the door" price</strong> — Negotiate the total price including all fees, not individual line items. This forces the dealer to be transparent.</li>
                <li><strong className="text-white">Request fee removal in writing</strong> — Some fees are presented as "non-negotiable" but can be removed if you insist. Get any removal in writing.</li>
                <li><strong className="text-white">Time your purchase strategically</strong> — End of month, end of quarter, and end of year are when dealers are most motivated to make deals and drop fees.</li>
              </ul>
            </section>

            {/* SECTION 5 - FAQ */}
            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-6">
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white">Are all dealer fees illegal?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">No, but many are inflated or unnecessary. Dealers are required to disclose fees, but they can charge what the market will bear. Some fees may violate state consumer protection laws if they are deceptive.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Can I dispute fees after signing?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">It's much harder after signing. Your best opportunity to challenge fees is before you sign the contract. Some states have cooling-off periods, but these are limited for auto purchases.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">What is a reasonable documentation fee?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">This varies by state. Some states regulate doc fees (e.g., California caps at $85). In unregulated states, $100-200 is reasonable. Anything over $500 is likely excessive.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">How can HiddenFeeAI help with car purchases?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Upload your purchase agreement or financing contract to HiddenFeeAI before signing. Our AI will analyze the document for hidden fees, inflated charges, and unfavorable terms, giving you leverage in negotiations.</p>
                </div>
              </div>
              <div className="text-center pt-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Upload Your Car Purchase Agreement</Button>
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