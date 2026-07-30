import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { faqs } from "@/content/faqs";

export function FAQ() {
  return (
    <div className="premium-page min-h-screen bg-[#050911]">
      <Nav />
      <main className="py-20 sm:py-24">
        <Container className="max-w-4xl">
          <header className="mb-14 space-y-5 text-center">
            <p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Questions before you upload</p>
            <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
              Know exactly what you're paying for.
            </h1>
            <p className="text-violet-300/80 max-w-2xl mx-auto text-lg">
              Everything you need to know about HiddenFeeAI. Can't find what you're looking for? 
              Email us at <a href="mailto:support@hiddenfeehub.com" className="inline-flex min-h-11 items-center font-semibold text-violet-400 underline hover:text-violet-300">support@hiddenfeehub.com</a>.
            </p>
          </header>

          <section className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="glass-panel overflow-hidden rounded-2xl"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between p-6 transition-colors hover:bg-violet-500/5">
                    <h3 className="pr-4 text-[17px] font-extrabold leading-7 text-white" itemProp="name">
                      {faq.q}
                    </h3>
                    <span className="text-violet-400 shrink-0 transition-transform duration-200 group-open:rotate-180">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div
                    className="px-6 pb-6 text-base font-medium leading-[1.7] text-violet-200/80"
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <div itemProp="text">{faq.a}</div>
                  </div>
                </details>
              </div>
            ))}
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
