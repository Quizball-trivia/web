import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface QuestionArenaProps {
  question: string;
  category: string;
  categoryIcon: string;
  difficulty: string;
}

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
      className="w-full max-w-2xl mx-auto text-center font-fun"
    >
      {/* Category pill */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-base">{categoryIcon}</span>
          <span className="text-[11px] uppercase font-extrabold tracking-widest text-white/60">
            {category}
          </span>
          <div className="flex gap-0.5 ml-1">
            {[1, 2, 3].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  'size-1.5 rounded-full',
                  lvl <= difficultyLevel ? 'bg-emerald-400' : 'bg-white/15'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="relative rounded-3xl bg-[#1a1f2e] border-b-4 border-white/10 overflow-hidden">
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative px-8 py-10 md:px-12 md:py-12 flex items-center justify-center min-h-[160px]">
          <h2 className="text-xl md:text-2xl font-extrabold leading-relaxed text-white max-w-lg mx-auto">
            {question}
          </h2>
        </div>
      </div>
    </motion.div>
  );
}
