import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HiddenFeesUtilityBills() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-12">
            <header className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-glow">
                Hidden Fees on Utility and Subscription Bills
              </h1>
              <p className="text-lg text-violet-300/80 max-w-3xl mx-auto leading-relaxed">
                Your utility and subscription bills are full of hidden fees. From service charges to regulatory fees 
                and automatic price increases, learn how to identify and eliminate these unnecessary costs.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Analyze Your Bill</Button>
                </Link>
                <Link to="/faq">
                  <Button variant="outline" size="lg">View FAQ</Button>
                </Link>
              </div>
            </header>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">The True Cost of Utilities and Subscriptions</h2>
              <p className="text-violet-200/80 leading-relaxed">
                The average American household spends hundreds of dollars per month on utilities and subscriptions, 
                but the advertised rates rarely tell the full story. Hidden fees buried in the fine print of utility 
                bills, streaming services, phone plans, internet packages, and insurance policies add up to thousands 
                of dollars per year.
              </p>
              <p className="text-violet-200/80 leading-relaxed">
                These fees are designed to be confusing. They use vague names, are buried deep in billing statements, 
                and are often presented as mandatory government charges or processing fees. In reality, many of these 
                charges are pure profit for the provider and can be challenged or avoided.
              </p>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Common Utility Bill Hidden Fees</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Service and Delivery Charges</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Electric and gas bills often include separate "delivery charges" that are calculated as a percentage 
                    of usage. These charges have increased dramatically in recent years and can account for 30-50% of 
                    your total bill. Some utilities also charge a flat "customer service fee" just for having an account.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Regulatory and Compliance Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Phone, internet, and cable bills are notorious for regulatory recovery fees, universal service fund 
                    charges, and compliance fees. While some are legitimate pass-through costs, providers often inflate 
                    these charges beyond actual regulatory costs.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Paper Billing Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Many providers charge $2-5 per month for receiving a paper bill by mail. Switching to electronic 
                    billing often eliminates this fee entirely. Some providers also charge fees for paying by phone 
                    or in person.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Late Payment and Returned Payment Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Late fees can range from $5 to $50 or more. While avoiding late payments is ideal, some providers 
                    charge excessively high fees that may violate state regulations. Returned payment fees for bounced 
                    checks or failed auto-payments can also be substantial.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Equipment Rental Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Cable and internet providers charge monthly rental fees for modems, routers, and cable boxes. 
                    These fees often cost $5-15 per device per month. Buying your own equipment can save you hundreds 
                    of dollars per year.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Administrative and Processing Fees</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Vague "administrative fees" appear on many utility and subscription bills. These fees have no 
                    standard definition and are often simply a way for providers to increase revenue without raising 
                    the advertised rate.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Subscription Service Traps</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Free Trial Auto-Conversions</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Free trials that automatically convert to paid subscriptions are the most common subscription trap. 
                    Many people forget to cancel and end up paying for services they don't use. Some providers make 
                    cancellation intentionally difficult.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Tier Creep</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Subscription services often introduce new tiers with higher prices and gradually deprecate lower-tier 
                    plans. You may find yourself pushed into a more expensive tier without actively choosing it.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Annual Price Increases</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Many subscription services quietly increase prices by small amounts each year. A $10/month service 
                    might become $12, then $15, then $18 over a few years — a significant cumulative increase that 
                    often goes unnoticed.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Add-On and Upsell Charges</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Subscriptions frequently offer add-on features that auto-enroll you after a free trial. Premium 
                    channels on streaming services, cloud storage upgrades, and priority support are common examples.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">How to Reduce Your Bills</h2>
              <ol className="list-decimal pl-6 space-y-3 text-violet-200/80">
                <li className="leading-relaxed"><strong className="text-white">Audit your bills monthly</strong> — Review every line item on your utility and subscription bills. Question anything you don't understand.</li>
                <li className="leading-relaxed"><strong className="text-white">Negotiate with providers</strong> — Call your internet, cable, and phone providers annually to ask about promotional rates. Loyalty is rarely rewarded — you often need to ask for discounts.</li>
                <li className="leading-relaxed"><strong className="text-white">Cancel unused subscriptions</strong> — Review your credit card and bank statements for subscriptions you no longer use. The average person pays for 2-3 unused subscriptions at any time.</li>
                <li className="leading-relaxed"><strong className="text-white">Bundle services carefully</strong> — While bundling can save money, some bundle contracts lock you in at higher rates. Compare bundle pricing to separate services.</li>
                <li className="leading-relaxed"><strong className="text-white">Use HiddenFeeAI</strong> — Upload your utility bills and subscription agreements to identify hidden fees and get recommendations for reducing your costs.</li>
              </ol>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-6">
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white">Are utility regulatory fees legitimate?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Some regulatory fees are legitimate pass-through costs from government programs. However, providers sometimes inflate these fees beyond actual costs, generating excess profit.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Can I negotiate my utility bills?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">While you can't negotiate the rate structure itself, you can often negotiate promotional rates, ask for fee waivers, and check if alternative pricing plans save you money.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">How do I find hidden subscription charges?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Review your bank and credit card statements monthly. Look for small recurring charges from companies you don't recognize. Services like HiddenFeeAI can help analyze billing statements for unusual patterns.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">What can HiddenFeeAI detect on utility bills?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">HiddenFeeAI can identify unusual fee patterns, inflated charges, duplicate line items, and terms buried in service agreements that allow price increases without notice.</p>
                </div>
              </div>
              <div className="text-center pt-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Upload Your Bill for Analysis</Button>
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