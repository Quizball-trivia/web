import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface QuestionArenaProps {
  question: string;
  category: string;
  categoryIcon: string;
  difficulty: string;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1.2,
} as const;

export function QuestionArena({
  question,
  category,
  categoryIcon,
  difficulty,
}: QuestionArenaProps) {
  const difficultyLevel =
    difficulty === 'Hard' ? 3 : difficulty === 'Medium' ? 2 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl text-center font-fun"
    >
      {/* Category meta — flat inline label, no pill chrome */}
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <span className="text-base">{categoryIcon}</span>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
          {category}
        </span>
        <div className="ml-1 flex gap-1">
          {[1, 2, 3].map((lvl) => (
            <div
              key={lvl}
              className={cn(
                'size-1.5 rounded-full',
                lvl <= difficultyLevel ? 'bg-brand-green' : 'bg-white/15',
              )}
            />
          ))}
        </div>
      </div>

      {/* Question text — no card chrome at all */}
      <h2
        className="mx-auto max-w-xl px-4 text-2xl text-white md:text-3xl"
        style={poppins}
      >
        {question}
      </h2>
    </motion.div>
  );
}
