'use client';

/**
 * Dev comparison route for MCQ answer-card layouts. Renders the SAME worst-case
 * Georgian questions in three candidate layouts so we can pick the best one for
 * long-sentence answers across screen sizes. No backend — pure layout preview.
 *
 *   A) 2×2 grid, UNIFORM font  — all four cards share one font (current).
 *   B) 2×2 grid, PER-CARD font — each card uses the biggest font that fits it.
 *   C) AUTO 1-column when long — full-width stacked cards when any answer is long.
 */
import { useState } from 'react';
import { UniformFitOptionsProvider, UniformFitOption } from '@/components/game/UniformFitOptions';
import { FitText } from '@/components/game/FitText';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const SAMPLES: Array<{ label: string; prompt: string; options: string[] }> = [
  {
    label: 'Worst case — 89-char option',
    prompt:
      '1950 წლის მსოფლიო ჩემპიონატზე რატომ გაემგზავრა მოქმედი ჩემპიონი იტალია ბრაზილიაში გემით და არა თვითმფრინავით?',
    options: [
      'ფულის დაზოგვა სურდათ',
      'ფრენის შიში სუპერგას ავიაკატასტროფის შემდეგ, რომელმაც ტორინოს გუნდის უმეტესობა იმსხვერპლა',
      'ფიფამ აიძულა',
      'თვითმფრინავისთვის ზედმეტად ბევრი აღჭურვილობა ჰქონდათ',
    ],
  },
  {
    label: 'Mid-length',
    prompt: 'რომელი გუნდი დაამარცხა საფრანგეთმა 2018 წლის ფიფას მსოფლიო ჩემპიონატის ფინალში?',
    options: ['ხორვატია', 'ბელგია', 'არგენტინა', 'ურუგვაი'],
  },
  {
    label: 'Short (English)',
    prompt: 'Which country won the 2018 FIFA World Cup?',
    options: ['Croatia', 'France', 'Belgium', 'England'],
  },
];

const CARD_BASE =
  'relative flex items-center justify-center overflow-hidden rounded-[16px] px-3 transition-shadow duration-150';
const CARD_STYLE: React.CSSProperties = {
  ...poppins,
  textTransform: 'uppercase',
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  border: '2px solid #FFE500',
  boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
};

const TEXT_WRAP = 'relative z-[1] flex h-full w-full items-center justify-center overflow-hidden px-3 py-2 sm:px-4 sm:py-2.5';
const TEXT_CLASS = 'text-center leading-[1.15] [word-break:keep-all] [overflow-wrap:normal]';

const LONG_THRESHOLD = 28; // chars — any option longer than this is "long"

// ── A) 2×2 grid, uniform font ─────────────────────────────────────────────
function VariantUniform({ options }: { options: string[] }) {
  return (
    <UniformFitOptionsProvider count={options.length} maxFontSize={30} minFontSize={10}>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt, i) => (
          <div key={i} className={`${CARD_BASE} h-[88px] sm:h-[104px] md:h-[116px] lg:h-[136px]`} style={CARD_STYLE}>
            <span className={TEXT_WRAP}>
              <UniformFitOption index={i} className={TEXT_CLASS}>{opt}</UniformFitOption>
            </span>
          </div>
        ))}
      </div>
    </UniformFitOptionsProvider>
  );
}

// ── B) 2×2 grid, per-card font ────────────────────────────────────────────
function VariantPerCard({ options }: { options: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt, i) => (
        <div key={i} className={`${CARD_BASE} h-[88px] sm:h-[104px] md:h-[116px] lg:h-[136px]`} style={CARD_STYLE}>
          <span className={TEXT_WRAP}>
            <FitText className={TEXT_CLASS} maxFontSize={30} minFontSize={10}>{opt}</FitText>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── C) ADAPTIVE: 2×2 when answers fit, vertical stack when any is long ─────
// Both layouts: AUTO-HEIGHT cards with even padding on every side (no fixed
// height, no edge-to-edge text). FitText shrinks the font ONLY as far as needed
// so the text never overflows the card width (fixes the horizontal cut-off) —
// short answers render large; long ones shrink/wrap inside the padded box.
function VariantAuto({ options }: { options: string[] }) {
  const anyLong = options.some((o) => o.length > LONG_THRESHOLD);

  if (anyLong) {
    // STACKED (long answers): FIXED font + the card AUTO-GROWS to wrapped text +
    // fixed padding. No FitText — so the font never expands to fill height and
    // eat the padding. Every card has the same top/bottom/left/right breathing
    // room; long answers just make their card taller.
    return (
      <div className="flex flex-col gap-2.5">
        {options.map((opt, i) => (
          <div
            key={i}
            className="relative flex min-h-[64px] items-center justify-center rounded-[16px] px-5 py-4 transition-shadow duration-150"
            style={CARD_STYLE}
          >
            <span
              className={`${TEXT_CLASS} block w-full text-[16px] sm:text-[18px]`}
            >
              {opt}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 2×2 (short/normal): FitText shrinks the font ONLY to fit the card width so
  // short answers stay big and never get cut off; the padded inner box keeps
  // even spacing. items-stretch keeps a row's two cards the same height.
  return (
    <div className="grid grid-cols-2 items-stretch gap-2.5">
      {options.map((opt, i) => (
        <div
          key={i}
          className="relative flex min-h-[72px] items-center justify-center rounded-[16px] transition-shadow duration-150"
          style={CARD_STYLE}
        >
          <div className="flex w-full items-center justify-center px-4 py-4">
            <FitText className={`${TEXT_CLASS} w-full`} maxFontSize={28} minFontSize={12}>
              {opt}
            </FitText>
          </div>
        </div>
      ))}
    </div>
  );
}

const VARIANTS = [
  { key: 'A', name: 'A · 2×2 uniform font', render: (o: string[]) => <VariantUniform options={o} /> },
  { key: 'B', name: 'B · 2×2 per-card font', render: (o: string[]) => <VariantPerCard options={o} /> },
  { key: 'C', name: 'C · auto 1-column when long', render: (o: string[]) => <VariantAuto options={o} /> },
];

export default function QuestionsLayoutDevPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [width, setWidth] = useState<number>(390); // emulate a phone width by default
  const sample = SAMPLES[sampleIdx];

  return (
    <div className="min-h-screen bg-surface-page text-white p-4 sm:p-6">
      <h1 className="font-poppins text-lg font-black uppercase mb-3">MCQ answer-layout comparison</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase text-white/50">Question:</span>
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            onClick={() => setSampleIdx(i)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${i === sampleIdx ? 'bg-brand-yellow text-black' : 'bg-white/10 text-white'}`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-4 text-xs uppercase text-white/50">Preview width:</span>
        {[360, 390, 430, 768, 1024].map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${w === width ? 'bg-brand-green-light text-black' : 'bg-white/10 text-white'}`}
          >
            {w}px
          </button>
        ))}
      </div>

      {/* Three variants side by side, each rendered at the chosen preview width */}
      <div className="flex flex-wrap gap-6">
        {VARIANTS.map((v) => (
          <div key={v.key} className="flex flex-col">
            <div className="mb-2 font-poppins text-sm font-black uppercase text-brand-yellow">{v.name}</div>
            <div
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
              style={{ width }}
            >
              <p className="mb-3 text-sm font-bold leading-snug">{sample.prompt}</p>
              {v.render(sample.options)}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-xs text-white/40">
        Tip: switch the preview width to test small phones (360) up to desktop (1024).
        Variant C only changes layout when an answer is long — short-answer questions
        render identically to A.
      </p>
    </div>
  );
}
