import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { faqs } from "@/content/faqs";

const pages = [["About HiddenFeeAI", "/about", "What the AI document audit product does and who it is for."], ["Security", "/security", "Temporary processing, payment separation, and operational controls."], ["Methodology", "/methodology", "How documents become evidence-led findings and next steps."], ["Accuracy and limitations", "/accuracy", "What improves or reduces audit completeness."], ["FAQ", "/faq", "Answers about uploads, privacy, payment, and reports."]] as const;
export function Search() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const results = pages.filter(([, , text]) => !query || text.toLowerCase().includes(query));
  const faqResults = faqs.filter((faq) => !query || `${faq.q} ${faq.a}`.toLowerCase().includes(query)).slice(0, 10);
  return <div className="premium-page min-h-screen bg-[#050911]"><Nav /><main className="py-20 sm:py-24"><Container className="max-w-4xl"><header><p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Product search</p><h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">Search HiddenFeeAI.</h1><form className="mt-8 flex gap-3" role="search"><input name="q" defaultValue={params.get("q") ?? ""} aria-label="Search HiddenFeeAI" placeholder="Search product, privacy, accuracy..." className="min-h-12 flex-1 rounded-xl border border-white/15 bg-[#111d30] px-4 text-white outline-none focus:border-[#4da3ff]" /><button className="rounded-xl bg-[#f4c542] px-5 font-extrabold text-[#08111f]" type="submit">Search</button></form></header><div className="mt-12 space-y-4">{results.map(([title, href, description]) => <Link key={href} to={href} className="block rounded-2xl border border-white/[0.12] bg-[#111d30] p-6 hover:border-[#4da3ff]/60"><h2 className="text-xl font-extrabold text-white">{title}</h2><p className="mt-2 text-[#dce4ec]">{description}</p></Link>)}{faqResults.map((faq) => <Link key={faq.q} to="/faq" className="block rounded-2xl border border-white/[0.12] bg-[#111d30] p-6 hover:border-[#4da3ff]/60"><h2 className="text-xl font-extrabold text-white">{faq.q}</h2><p className="mt-2 text-[#dce4ec]">{faq.a}</p></Link>)}{!results.length && !faqResults.length && <p className="text-lg text-[#dce4ec]">No matching product resources found.</p>}</div></Container></main><Footer /></div>;
}
