import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

export function Refund() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-8">
            <header className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
                Refund Policy
              </h1>
              <p className="text-violet-400/70 text-sm">
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </header>

            <section className="space-y-6">
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Overview</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  HiddenFeeAI provides AI-powered document analysis as a digital service. Because each analysis requires 
                  computational resources and AI processing, we maintain a limited refund policy as described below.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Digital Service Refunds</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  HiddenFeeAI delivers digital audit reports based on AI analysis of uploaded documents. Due to the 
                  immediate nature of the service, all completed analyses are generally non-refundable.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">When Refunds May Apply</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  We may issue a refund at our discretion in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                  <li>The service fails to process your document due to a technical error on our end</li>
                  <li>You are charged for a service that you were unable to access or use</li>
                  <li>Duplicate charges occur due to a payment processing error</li>
                </ul>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">When Refunds Are Not Available</h2>
                <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                  <li>You are dissatisfied with the analysis results</li>
                  <li>The AI did not detect issues you expected it to find</li>
                  <li>You uploaded the wrong document</li>
                  <li>You changed your mind after the analysis was completed</li>
                  <li>Your document was in an unsupported format</li>
                </ul>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">How to Request a Refund</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  To request a refund, please contact us at support@hiddenfeehub.com within 14 days of your purchase. 
                  Include your transaction details and the reason for your request. We will review your request and 
                  respond within 5-7 business days.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Processing Time</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  If a refund is approved, it will be processed back to your original payment method within 5-10 
                  business days. The time it takes for the refund to appear in your account may vary depending on 
                  your payment provider.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Contact</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  For any questions about this refund policy, please contact us at:
                </p>
                <p className="text-violet-400 font-medium">support@hiddenfeehub.com</p>
              </div>
            </section>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}