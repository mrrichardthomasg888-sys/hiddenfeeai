import { motion } from "framer-motion";
import { Book, ExternalLink } from "lucide-react";

interface EducationTopic {
  topic: string;
  whatIsIt: string;
  whyItMatters: string;
  questionsToAsk: string[];
  learnMore: string;
  category: string;
}

interface EducationSectionProps {
  topics: EducationTopic[];
}

export function EducationSection({ topics }: EducationSectionProps) {
  if (topics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-5 sm:p-6 glow-purple"
    >
      <div className="flex items-center gap-2 mb-4">
        <Book className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-violet-100">Understand the Charges and Terms</h2>
      </div>

      <p className="text-xs text-violet-400/60 mb-4">
        Plain-English context for the fees and terms in your document.
      </p>

      <div className="space-y-3">
        {topics.map((topic, i) => (
          <motion.div
            key={topic.topic}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4"
          >
            <p className="text-sm font-semibold text-violet-200">{topic.topic}</p>
            <p className="mt-1.5 text-xs text-violet-300/70 leading-relaxed">
              {topic.whatIsIt}
            </p>
            <p className="mt-1.5 text-xs font-medium text-violet-400/60">
              Why it matters: <span className="text-violet-300/70 font-normal">{topic.whyItMatters}</span>
            </p>
            {topic.questionsToAsk.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold text-violet-400/50 mb-1">
                  Questions to ask:
                </p>
                <ul className="space-y-0.5">
                  {topic.questionsToAsk.slice(0, 3).map((q, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px] text-violet-300/60">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-500/50" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-400/40">
              <ExternalLink className="h-3 w-3" />
              {topic.learnMore}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
