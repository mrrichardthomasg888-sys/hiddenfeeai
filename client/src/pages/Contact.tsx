import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Mail, Clock, HelpCircle, MessageSquare } from "lucide-react";

const supportTopics = [
  {
    title: "Document Upload Issues",
    description: "Problems uploading PDFs, images, or other supported file formats.",
  },
  {
    title: "Questions About a Finding",
    description: "Questions about what appears in your audit report or what it means.",
  },
  {
    title: "Payment & Report Access",
    description: "Payment questions or trouble opening your private report link.",
  },
  {
    title: "Technical Support",
    description: "Website errors, bugs, or technical difficulties using the service.",
  },
  {
    title: "Privacy & Data",
    description: "Questions about document handling, data deletion, or privacy practices.",
  },
  {
    title: "Feature Requests",
    description: "Suggestions for new features or improvements to existing ones.",
  },
];

export function Contact() {
  return (
    <div className="premium-page min-h-screen bg-[#050911]">
      <Nav />
      <main className="py-20 sm:py-24">
        <Container className="max-w-4xl">
          <header className="mb-14 space-y-5 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
              Need help with an upload, payment, or report?
            </h1>
            <p className="text-violet-300/80 max-w-2xl mx-auto text-lg">
              We're here to help. Whether you have a question about your audit report, 
              need technical support, or want to share feedback, we'd love to hear from you.
            </p>
          </header>

          <section className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="glass-panel space-y-3 rounded-2xl p-7 text-center">
              <Mail className="h-8 w-8 text-violet-400 mx-auto" />
              <h3 className="font-semibold text-white">Email Us</h3>
              <a href="mailto:support@hiddenfeehub.com" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-400 transition-colors hover:text-violet-300">
                support@hiddenfeehub.com
              </a>
            </div>
            <div className="glass-panel space-y-3 rounded-2xl p-7 text-center">
              <Clock className="h-8 w-8 text-violet-400 mx-auto" />
              <h3 className="font-semibold text-white">Response Time</h3>
              <p className="text-violet-300/70 text-sm">We typically respond within 24 hours during business days</p>
            </div>
            <div className="glass-panel space-y-3 rounded-2xl p-7 text-center">
              <MessageSquare className="h-8 w-8 text-violet-400 mx-auto" />
              <h3 className="font-semibold text-white">Support Hours</h3>
              <p className="text-violet-300/70 text-sm">Monday - Friday, 9:00 AM - 6:00 PM EST</p>
            </div>
          </section>

          <section className="glass-panel mb-14 rounded-2xl p-7 sm:p-9">
            <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-violet-300">Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    className="min-h-12 w-full rounded-xl border border-violet-500/25 bg-midnight-800 px-4 py-3 text-violet-100 placeholder:text-[#c8d3df] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-violet-300">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="min-h-12 w-full rounded-xl border border-violet-500/25 bg-midnight-800 px-4 py-3 text-violet-100 placeholder:text-[#c8d3df] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-violet-300">Subject</label>
                <select
                  id="subject"
                  className="min-h-12 w-full rounded-xl border border-violet-500/25 bg-midnight-800 px-4 py-3 text-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="" className="bg-midnight-800">Select a topic</option>
                  <option value="general" className="bg-midnight-800">General Inquiry</option>
                  <option value="support" className="bg-midnight-800">Technical Support</option>
                  <option value="billing" className="bg-midnight-800">Billing Question</option>
                  <option value="feedback" className="bg-midnight-800">Feedback</option>
                  <option value="other" className="bg-midnight-800">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-violet-300">Message</label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full resize-y rounded-xl border border-violet-500/25 bg-midnight-800 px-4 py-3 text-violet-100 placeholder:text-[#c8d3df] focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <Button variant="violet" size="lg" className="w-full">
                Send Message
              </Button>
              <p className="text-xs text-violet-400/50 text-center">
                For now, please email us directly at support@hiddenfeehub.com. The contact form is for demonstration.
              </p>
            </form>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-violet-400" />
              Common Support Topics
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {supportTopics.map((topic) => (
                <div key={topic.title} className="glass-panel p-5 rounded-xl space-y-2">
                  <h3 className="font-semibold text-white">{topic.title}</h3>
                  <p className="text-sm text-violet-300/70">{topic.description}</p>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
