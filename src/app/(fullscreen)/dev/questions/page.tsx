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
import { AdaptiveAnswerText, AnswerFitGroup, isLongAnswerSet } from '@/components/game/AdaptiveAnswerText';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
} as const;

const SHORT = ['ხორვატია', 'ნიდერლანდები', 'საფრანგეთი', 'ავსტრალია'];
const LONG = [
  'არგენტინამ მოიგო ფინალი პენალტების სერიაში საფრანგეთთან',
  'საფრანგეთი',
  'ბრაზილიამ მოიგო მსოფლიო ჩემპიონატი 2002 წელს იაპონიაში',
  'ხორვატია',
];

type SizePreset = {
  key: string;
  label: string;
  /** Card min-height classes for the 2×2 grid (non-image). */
  gridMinH: string;
  /** Inner text padding. */
  pad: string;
  /** AdaptiveAnswerText grid font range. */
  gridMaxFontSize: number;
  gridMinFontSize: number;
};

const PRESETS: SizePreset[] = [
  {
    key: 'old',
    label: 'OLD (pre-Variant-C)',
    gridMinH: 'h-[68px] sm:h-[86px] md:h-[100px] lg:h-[120px]',
    pad: 'px-3 py-2 sm:px-4 sm:py-2.5',
    gridMaxFontSize: 26,
    gridMinFontSize: 10,
  },
  {
    key: 'current',
    label: 'CURRENT (ships today — too big)',
    gridMinH: 'min-h-[88px] sm:min-h-[104px] md:min-h-[116px] lg:min-h-[136px]',
    pad: 'px-5 py-4',
    gridMaxFontSize: 28,
    gridMinFontSize: 11,
  },
  {
    key: 'proposed',
    label: 'PROPOSED (old size + keep adaptive stack)',
    gridMinH: 'min-h-[68px] sm:min-h-[86px] md:min-h-[100px] lg:min-h-[120px]',
    pad: 'px-3.5 py-2.5 sm:px-4 sm:py-3',
    gridMaxFontSize: 26,
    gridMinFontSize: 10,
  },
];

function CardGrid({ options, preset }: { options: string[]; preset: SizePreset }) {
  const stacked = isLongAnswerSet(options);
  return (
    <div
      className={`mt-2.5 gap-2.5 ${stacked ? 'flex flex-col' : 'grid grid-cols-2 items-stretch'}`}
    >
      <AnswerFitGroup>
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
            <AdaptiveAnswerText
              stacked={stacked}
              gridMaxFontSize={preset.gridMaxFontSize}
              gridMinFontSize={preset.gridMinFontSize}
              stackedFontSize={16}
            >
              {opt}
            </AdaptiveAnswerText>
          </span>
        </button>
      ))}
      </AnswerFitGroup>
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
  const [answerSet, setAnswerSet] = useState<'short' | 'long'>('short');
  const options = answerSet === 'short' ? SHORT : LONG;

  return (
    <div className="min-h-dvh bg-surface-page px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-poppins text-lg font-black uppercase tracking-wide">
            MCQ card size comparison
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
          Same card markup, three size presets. View at mobile width (~390px) to judge. Short =
          2×2 grid; Long = auto-stacks (the adaptive behavior we keep).
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRESETS.map((preset) => (
            <div key={preset.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-brand-yellow">
                {preset.label}
              </div>
              <CardGrid options={options} preset={preset} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
