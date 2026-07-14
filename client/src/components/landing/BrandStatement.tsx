import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";

export function BrandStatement() {
  return (
    <section className="bg-ink-900 py-24">
      <Container>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-balance text-center text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl"
        >
          Most people only see the final price.
          <br />
          <span className="text-savings-400">
            HiddenFeeAI sees what is hidden underneath.
          </span>
        </motion.p>
      </Container>
    </section>
  );
}
