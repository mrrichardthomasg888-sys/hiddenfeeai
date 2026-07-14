import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ReviewContractsHiddenCosts() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-12">
            <header className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-glow">
                How to Review Contracts for Hidden Costs
              </h1>
              <p className="text-lg text-violet-300/80 max-w-3xl mx-auto leading-relaxed">
                Hidden costs lurk in every contract. Learn how to systematically review service agreements, 
                subscription terms, and vendor contracts for hidden fees and unfavorable terms.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Scan Your Contract</Button>
                </Link>
                <Link to="/faq">
                  <Button variant="outline" size="lg">View FAQ</Button>
                </Link>
              </div>
            </header>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Why You Need to Review Contracts Carefully</h2>
              <p className="text-violet-200/80 leading-relaxed">
                Contracts are designed by the party that writes them. Whether it's a service agreement, a subscription 
                contract, a vendor agreement, or a terms of service document, the language is carefully crafted to 
                protect the provider's interests — often at your expense.
              </p>
              <p className="text-violet-200/80 leading-relaxed">
                Hidden costs in contracts aren't always obvious fee line items. They can be buried in clauses about 
                automatic renewals, minimum commitments, price adjustment mechanisms, and termination penalties. 
                Learning to identify these clauses is essential for protecting your finances.
              </p>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Red Flag Clauses to Watch For</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Automatic Renewal Clauses</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Many contracts automatically renew unless you cancel within a specific window — often 30-60 days 
                    before the renewal date. Missing this window locks you in for another term. Some clauses also 
                    include automatic price increases upon renewal.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Unilateral Price Change Clauses</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    These clauses allow the provider to change prices at any time without your consent. Some require 
                    notice, others don't. A contract that lets the provider raise prices without your approval is 
                    a significant financial risk.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Minimum Commitment and Volume Requirements</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Some contracts require you to purchase a minimum volume of services or products each period. 
                    If you don't meet the minimum, you still pay for it. These clauses can be extremely costly if 
                    your needs change.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Termination Penalties</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    The cost of leaving a contract can be surprisingly high. Look for early termination fees, 
                    penalties for canceling before a minimum term, and requirements to pay remaining contract 
                    value upon termination.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Liquidated Damages Clauses</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    These clauses pre-determine the damages you must pay if you breach the contract. While legal, 
                    they can be set at unreasonable levels that far exceed actual damages.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-300">Arbitration and Waiver of Class Action</h3>
                  <p className="text-violet-200/80 leading-relaxed">
                    Many contracts require binding arbitration and prohibit class action lawsuits. This makes it 
                    difficult to challenge unfair fees collectively and often favors the provider in disputes.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Step-by-Step Contract Review Process</h2>
              <ol className="list-decimal pl-6 space-y-3 text-violet-200/80">
                <li className="leading-relaxed"><strong className="text-white">Read the entire contract</strong> — Every page, including fine print and exhibits. Hidden costs are often in sections that seem less important.</li>
                <li className="leading-relaxed"><strong className="text-white">Focus on the fee schedule</strong> — Identify every charge you'll incur: base fees, usage fees, overage fees, late fees, service fees, and any "miscellaneous" charges.</li>
                <li className="leading-relaxed"><strong className="text-white">Look for price adjustment mechanisms</strong> — Can they raise prices? How much notice is required? Is there a cap on increases?</li>
                <li className="leading-relaxed"><strong className="text-white">Examine renewal and termination terms</strong> — When does it renew? How do you cancel? What are the penalties?</li>
                <li className="leading-relaxed"><strong className="text-white">Check for liability and indemnification</strong> — Some contracts shift all liability to you, creating hidden financial risk.</li>
                <li className="leading-relaxed"><strong className="text-white">Use HiddenFeeAI</strong> — Upload the contract for AI analysis to flag problematic clauses and hidden cost risks.</li>
              </ol>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold text-white">Negotiating Better Terms</h2>
              <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                <li><strong className="text-white">Strike renewal clauses</strong> — Replace automatic renewal with mutual agreement to renew. If they insist, negotiate longer notice periods and no price increases on renewal.</li>
                <li><strong className="text-white">Cap price increases</strong> — If the provider insists on the ability to raise prices, negotiate a cap (e.g., no more than 3-5% annually) and require 60-90 days written notice.</li>
                <li><strong className="text-white">Reduce minimum commitments</strong> — Negotiate lower minimum volume requirements or ask for a "best efforts" clause instead of a hard minimum.</li>
                <li><strong className="text-white">Limit termination penalties</strong> — Push for a flat, reasonable termination fee or no penalty at all after the initial term.</li>
                <li><strong className="text-white">Request transparency</strong> — Demand that all fees be disclosed in the contract with specific amounts, not vague terms like "standard fees" or "market rates."</li>
              </ul>
            </section>

            <section className="glass-panel p-6 md:p-8 rounded-xl space-y-6">
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white">What types of contracts are most likely to have hidden costs?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Service agreements, subscription contracts, vendor agreements, software licensing, telecommunications contracts, and commercial leases are among the most common contracts with hidden cost clauses.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Can I negotiate standard form contracts?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Yes. While providers often present contracts as non-negotiable, many terms can be negotiated, especially for business contracts. The key is to ask and be willing to walk away.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">What is the most dangerous hidden cost clause?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">Unilateral price change clauses without notice requirements are particularly dangerous because they allow the provider to increase costs at any time without your knowledge or consent.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">How can HiddenFeeAI help with contract review?</h3>
                  <p className="text-violet-200/80 text-sm leading-relaxed">HiddenFeeAI analyzes your contract text to identify clauses commonly associated with hidden costs, unfair terms, and provider-favorable language. It provides a risk assessment and specific recommendations for negotiation.</p>
                </div>
              </div>
              <div className="text-center pt-4">
                <Link to="/">
                  <Button variant="violet" size="lg">Upload Your Contract for Review</Button>
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