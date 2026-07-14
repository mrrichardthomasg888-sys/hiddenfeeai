import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, Trash2, Lock } from "lucide-react";
import { Container } from "@/components/layout/Container";

const points = [
  { icon: Lock, title: "Private processing", desc: "Your document is analyzed in a secure, encrypted pipeline." },
  { icon: EyeOff, title: "No AI training", desc: "Your files are never used to train any AI model." },
  { icon: Trash2, title: "Automatic deletion", desc: "Uploaded documents are permanently deleted after your report is generated." },
];

export function SecurityCard() {
  return (
    <section className="bg-white py-20">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl rounded-3xl border border-mist-200 bg-white p-8 shadow-card sm:p-10"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-savings-500/10">
              <ShieldCheck className="h-5 w-5 text-savings-600" />
            </div>
            <h2 className="text-xl font-semibold text-ink-900">
              Your privacy matters
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {points.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <Icon className="mb-2 h-5 w-5 text-mist-500" strokeWidth={1.75} />
                <p className="text-sm font-medium text-ink-900">{title}</p>
                <p className="mt-1 text-sm text-mist-500">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
