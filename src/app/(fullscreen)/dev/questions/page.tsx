'use client';

/**
 * Dev-only preview: compare MCQ answer-card SIZES.
 *
 * The "adaptive MCQ answer layout (Variant C)" commit (6753281) grew the cards
 * (taller min-heights, more padding, bigger font) while also adding the useful
 * long-answer vertical stack. This page renders the SAME card markup at three
 * size presets so we can pick one without touching the live game panel:
 *
 *   - OLD       → pre-Variant-C sizing (what we want to go back to)
 *   - CURRENT   → what ships today (too big)
 *   - PROPOSED  → smaller cards, but KEEP the adaptive stack for long answers
 *
 * Each preset is shown with a SHORT answer set (2×2 grid) and a LONG answer set
 * (auto-stacks). Use the browser at mobile width (~390px) to judge.
 */

import { useState } from 'react';
import { isLongAnswerSet } from '@/components/game/AdaptiveAnswerText';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
} as const;

const SHORT = ['ხორვატია', 'ნიდერლანდები', 'საფრანგეთი', 'ავსტრალია'];
// Medium: a few words each, still under the long-answer stack threshold so it
// stays a 2×2 grid (the common multi-word case).
const MEDIUM = [
  'მანჩესტერ იუნაიტედი',
  'რეალ მადრიდი',
  'ბორუსია დორტმუნდი',
  'პარი სენ-ჟერმენი',
];
const LONG = [
  'არგენტინამ მოიგო ფინალი პენალტების სერიაში საფრანგეთთან',
  'საფრანგეთი',
  'ბრაზილიამ მოიგო მსოფლიო ჩემპიონატი 2002 წელს იაპონიაში',
  'ხორვატია',
];

type SizePreset = {
  /** Card min-height classes for the 2×2 grid (non-image). */
  gridMinH: string;
  /** Inner text padding. */
  pad: string;
};

// The shipping MCQ card chrome (mirrors PossessionQuestionPanel).
const CURRENT_PRESET: SizePreset = {
  gridMinH: 'min-h-[68px] sm:min-h-[86px] md:min-h-[100px] lg:min-h-[120px]',
  pad: 'px-3.5 py-2.5 sm:px-4 sm:py-3',
};

function CardGrid({ options, preset }: { options: string[]; preset: SizePreset }) {
  const stacked = isLongAnswerSet(options);
  return (
    <div
      className={`mt-2.5 gap-2.5 ${stacked ? 'flex flex-col' : 'grid grid-cols-2 items-stretch'}`}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className={`relative flex items-center justify-center overflow-hidden rounded-[16px] ${
            stacked ? 'min-h-[64px]' : preset.gridMinH
          }`}
          style={{
            ...poppins,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            backgroundColor: 'transparent',
            border: '2px solid #FFE500',
            boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
          }}
        >
          <span
            className={`relative z-[1] flex w-full items-center justify-center ${preset.pad} ${
              stacked ? '' : 'h-full overflow-hidden'
            }`}
          >
            {/* Fixed uniform font for every option (matches the shipping
                PossessionQuestionPanel) — no per-answer auto-fit. */}
            <span
              className="block w-full text-center leading-[1.15] [overflow-wrap:anywhere]"
              style={{ fontSize: 'clamp(14px, 3.8vw, 20px)' }}
            >
              {opt}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function DevQuestionsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }

  return <DevQuestionsContent />;
}

function DevQuestionsContent() {
  const [answerSet, setAnswerSet] = useState<'short' | 'medium' | 'long'>('short');
  const options = answerSet === 'short' ? SHORT : answerSet === 'medium' ? MEDIUM : LONG;

  return (
    <div className="min-h-dvh bg-surface-page px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-poppins text-lg font-black uppercase tracking-wide">
            MCQ answer cards
          </h1>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setAnswerSet('short')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                answerSet === 'short' ? 'bg-brand-cyan text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Short
            </button>
            <button
              type="button"
              onClick={() => setAnswerSet('medium')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                answerSet === 'medium' ? 'bg-brand-yellow text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setAnswerSet('long')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                answerSet === 'long' ? 'bg-brand-orange text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Long
            </button>
          </div>
        </div>
        <p className="mb-6 text-sm text-white/60">
          The shipping MCQ answer cards (uniform fixed font). View at mobile
          width (~390px) to judge. Short / Medium = 2×2 grid; Long = auto-stacks.
        </p>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <CardGrid options={options} preset={CURRENT_PRESET} />
        </div>
      </div>
    </div>
  );
}
