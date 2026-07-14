import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

export function Privacy() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <article className="space-y-8">
            <header className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
                Privacy Policy
              </h1>
              <p className="text-violet-400/70 text-sm">
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </header>

            <section className="space-y-6">
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Overview</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  HiddenFeeAI provides AI-powered document analysis to identify hidden fees, billing errors, and contract risks. 
                  We take your privacy seriously. This policy describes what information we collect, how we use it, and how we protect it.
                </p>
                <p className="text-violet-200/80 leading-relaxed">
                  By using HiddenFeeAI, you agree to the data practices described in this policy.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Information We Collect</h2>
                <h3 className="text-lg font-semibold text-violet-300">Account Information</h3>
                <p className="text-violet-200/80 leading-relaxed">
                  When you use HiddenFeeAI, we may collect an email address and basic account information if you choose to create an account. 
                  Payment processing information is handled by our third-party payment processor and is not stored on our servers.
                </p>
                <h3 className="text-lg font-semibold text-violet-300">Uploaded Documents</h3>
                <p className="text-violet-200/80 leading-relaxed">
                  HiddenFeeAI processes the documents you upload (PDFs, images, DOCX, TXT, CSV, XLSX files) solely for the purpose of 
                  analyzing them for hidden fees, billing errors, and contract risks. Your documents are processed temporarily and are 
                  automatically deleted after analysis is complete.
                </p>
                <h3 className="text-lg font-semibold text-violet-300">Usage Data</h3>
                <p className="text-violet-200/80 leading-relaxed">
                  We may collect anonymous usage statistics such as page views, feature usage, and performance metrics to improve our service. 
                  This data cannot be used to identify you personally.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">How We Use Your Information</h2>
                <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                  <li>To analyze uploaded documents for hidden fees, billing errors, and contract risks</li>
                  <li>To generate audit reports based on document analysis</li>
                  <li>To improve the accuracy and performance of our AI analysis</li>
                  <li>To communicate with you about your account and our service</li>
                  <li>To process payments through our third-party payment processor</li>
                </ul>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Document Processing and Deletion</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  Uploaded documents are processed in temporary storage during analysis. The extracted text is analyzed by our AI system, 
                  and both the original files and extracted text are permanently deleted from our servers after the analysis is complete. 
                  We do not retain copies of your uploaded documents.
                </p>
                <p className="text-violet-200/80 leading-relaxed">
                  Audit reports generated from your documents are stored temporarily and can be downloaded as PDF. You control the 
                  retention of these reports.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Cookies</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  HiddenFeeAI uses essential cookies for basic functionality such as session management. We may use analytics cookies 
                  to understand how our website is used. You can control cookie preferences through your browser settings.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Analytics</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  We use anonymous analytics to understand usage patterns and improve our service. These analytics do not include 
                  personal information or document contents. No document data is ever shared with analytics providers.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Payment Processing</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  Payments are processed securely through our third-party payment processor. HiddenFeeAI does not store credit card 
                  numbers, bank account details, or other payment credentials. All payment data is handled by our payment processor 
                  in accordance with their security standards.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Security</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  We implement industry-standard security measures including encryption in transit and at rest, secure temporary 
                  storage for document processing, and regular security assessments. However, no method of electronic storage or 
                  transmission is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Your Rights</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  Depending on your jurisdiction, you may have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-violet-200/80">
                  <li>Access personal information we hold about you</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Withdraw consent at any time</li>
                  <li>Lodge a complaint with a data protection authority</li>
                </ul>
                <p className="text-violet-200/80 leading-relaxed mt-4">
                  To exercise any of these rights, please contact us at support@hiddenfeehub.com.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h2 className="text-2xl font-bold text-white">Contact</h2>
                <p className="text-violet-200/80 leading-relaxed">
                  For questions about this privacy policy or our data practices, please contact us at:
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