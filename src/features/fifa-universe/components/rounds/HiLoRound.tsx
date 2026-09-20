'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { ArrowDown, ArrowUp, Equal } from 'lucide-react';
import {
  BATTLE_STATS,
  CARDS_BY_EDITION,
  STAT_LABEL,
  drawJourney,
  editionLabel,
  rand,
  shuffle,
  statValue,
  tierAtLeast,
  type BattleStat,
  type FifaCard,
} from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard } from '../MiniFutCard';
import { ResultBanner, GOLD, GREEN, RED } from '../ui';

export type Call = 'higher' | 'same' | 'lower';

export interface HiLoStep {
  /** The known side. */
  a: FifaCard;
  /** The side to call. */
  b: FifaCard;
  stat: BattleStat;
  /** "seasons" = same player, next edition; "players" = two players, same edition. */
  kind: 'seasons' | 'players';
}

/** Build one comparison. Alternates between a player's own next season and a peer in the same edition. */
export function makeHiLoStep(level: number, used: Set<string>, kind?: HiLoStep['kind']): HiLoStep {
  const k = kind ?? (Math.random() < 0.55 ? 'seasons' : 'players');
  const stat: BattleStat = level < 1 ? 'overall' : rand(BATTLE_STATS);
  if (k === 'seasons') {
    const j = drawJourney({ tiers: tierAtLeast(level), minCards: 2, exclude: used });
    const i = Math.floor(Math.random() * (j.cards.length - 1));
    return { a: j.cards[i], b: j.cards[i + 1], stat, kind: k };
  }
  const j = drawJourney({ tiers: tierAtLeast(level), minCards: 1, exclude: used });
  const a = rand(j.cards);
  const peers = shuffle((CARDS_BY_EDITION[a.edition] ?? []).filter((c) => c.name !== a.name && !used.has(c.name)));
  const b = peers.find((c) => Math.abs(statValue(c, stat) - statValue(a, stat)) <= 6) ?? peers[0];
  return { a, b, stat, kind: k };
}

export function judge(step: HiLoStep, call: Call): boolean {
  const va = statValue(step.a, step.stat);
  const vb = statValue(step.b, step.stat);
  return call === 'higher' ? vb > va : call === 'lower' ? vb < va : vb === va;
}

/** The comparison UI on its own — Higher/Lower survival composes many of these. */
export function HiLoBoard({ step, picked, onCall }: { step: HiLoStep; picked: Call | null; onCall: (c: Call) => void }) {
  const t = useMiniT();
  const va = statValue(step.a, step.stat);
  const vb = statValue(step.b, step.stat);
  const revealed = picked !== null;
  const ok = revealed && judge(step, picked);
  const buttons: Array<{ id: Call; label: string; icon: typeof ArrowUp }> = [
    { id: 'higher', label: t('Higher'), icon: ArrowUp },
    { id: 'same', label: t('Same'), icon: Equal },
    { id: 'lower', label: t('Lower'), icon: ArrowDown },
  ];
  return (
    <div>
      <p className="mb-3 text-center font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">
        {STAT_LABEL[step.stat]} · {step.kind === 'seasons' ? t('next season') : editionLabel(step.a.edition)}
      </p>
      <div className="flex items-stretch justify-center gap-3">
        <Side card={step.a} value={va} label={step.kind === 'seasons' ? editionLabel(step.a.edition) : step.a.name} />
        <div className="flex items-center font-poppins text-sm font-black text-white/30">VS</div>
        <Side card={step.b} hideOverall={!revealed} value={revealed ? vb : null} label={step.kind === 'seasons' ? editionLabel(step.b.edition) : step.b.name} tone={revealed ? (ok ? GREEN : RED) : undefined} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {buttons.map((b) => {
          const isPick = picked === b.id;
          const bg = isPick ? (ok ? GREEN : RED) : 'rgba(22,69,255,0.6)';
          return (
            <motion.button key={b.id} type="button" disabled={revealed} onClick={() => onCall(b.id)} whileTap={revealed ? undefined : { scale: 0.96 }} animate={{ backgroundColor: bg, opacity: revealed && !isPick ? 0.45 : 1 }} className="flex h-14 flex-col items-center justify-center rounded-2xl font-poppins text-xs font-black uppercase tracking-wider text-white">
              <b.icon className="size-5" />
              {b.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function Side({ card, value, label, tone, hideOverall = false }: { card: FifaCard; value: number | null; label: string; tone?: string; hideOverall?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <MiniFutCard card={card} size="md" showEdition={false} hideOverall={hideOverall} />
      <span className="max-w-[124px] truncate font-poppins text-[11px] font-black uppercase tracking-wide text-white/70">{label}</span>
      <motion.span key={value ?? 'q'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poppins text-4xl font-black tabular-nums" style={{ color: tone ?? (value === null ? 'rgba(255,255,255,0.3)' : GOLD) }}>
        {value ?? '?'}
      </motion.span>
    </div>
  );
}

/** One Higher / Same / Lower call as a chainable round (Survival, Gauntlet). */
export function HiLoRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [step] = useState(() => makeHiLoStep(level, used));
  useEffect(() => { used.add(step.a.name); used.add(step.b.name); }, [used, step]);
  const [picked, setPicked] = useState<Call | null>(null);
  const ok = picked !== null && judge(step, picked);
  const points = ok ? 80 : 0;
  return (
    <div className="flex flex-1 flex-col">
      <HiLoBoard step={step} picked={picked} onCall={setPicked} />
      {picked !== null && (
        <div className="mt-4">
          <ResultBanner correct={ok} points={points} answer={`${statValue(step.a, step.stat)} → ${statValue(step.b, step.stat)}`} detail={step.kind === 'seasons' ? `${step.a.name} · ${editionLabel(step.a.edition)} → ${editionLabel(step.b.edition)}` : `${step.a.name} vs ${step.b.name} · ${editionLabel(step.a.edition)}`} onNext={() => onDone({ correct: ok, points, label: step.kind === 'seasons' ? step.a.name : `${step.a.name} vs ${step.b.name}`, tag: t('Hi-Lo'), maxPoints: 80 })} />
        </div>
      )}
    </div>
  );
}
