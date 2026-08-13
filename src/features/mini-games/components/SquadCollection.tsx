'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Sparkles } from 'lucide-react';
import { ClubCrest, FlagChip } from './Badges';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { TRIVIA } from '../data/trivia';
import {
  FORMATION,
  RARITY_META,
  drawCard,
  type PlayerCard,
  type CardPos,
} from '../data/squadCollection';

const POS_COLOR: Record<CardPos, string> = { GK: '#FFE500', DEF: '#1CB0F6', MID: '#58CC02', FWD: '#FB3101' };
const TOTAL = FORMATION.reduce((s, r) => s + r.slots, 0);
const lastName = (n: string) => n.split(' ').slice(-1)[0];

type Phase = 'question' | 'pack' | 'reveal' | 'complete';

export function SquadCollection({ backHref }: { backHref?: string } = {}) {
  const [filled, setFilled] = useState<Record<CardPos, PlayerCard[]>>({ GK: [], DEF: [], MID: [], FWD: [] });
  const [phase, setPhase] = useState<Phase>('question');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [card, setCard] = useState<PlayerCard | null>(null);

  const question = TRIVIA[qIndex % TRIVIA.length];
  const collected = filled.GK.length + filled.DEF.length + filled.MID.length + filled.FWD.length;
  const openPositions = useMemo<CardPos[]>(
    () => FORMATION.filter((r) => filled[r.pos].length < r.slots).map((r) => r.pos),
    [filled],
  );

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    window.setTimeout(() => {
      if (i === question.answer) {
        setCard(drawCard(openPositions));
        setPhase('pack');
      } else {
        setShake((n) => n + 1);
        setSelected(null);
        setQIndex((q) => q + 1);
      }
    }, 750);
  };

  const addToSquad = () => {
    if (!card) return;
    const next = { ...filled, [card.pos]: [...filled[card.pos], card] };
    setFilled(next);
    setCard(null);
    setSelected(null);
    const nowCollected = collected + 1;
    if (nowCollected >= TOTAL) {
      setPhase('complete');
    } else {
      setQIndex((q) => q + 1);
      setPhase('question');
    }
  };

  const reset = () => {
    setFilled({ GK: [], DEF: [], MID: [], FWD: [] });
    setPhase('question');
    setQIndex(0);
    setSelected(null);
    setCard(null);
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title="Squad Collection"
      subtitle="Answer to pull cards. Build your XI."
      accent="#CE82FF"
      headerRight={<StatPill label="Squad" value={`${collected}/${TOTAL}`} color="#CE82FF" />}
    >
      {/* Formation grid */}
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e2f14]/40 to-transparent p-3">
        <div className="space-y-2">
          {FORMATION.map((row) => (
            <div key={row.pos} className="flex justify-center gap-2">
              {Array.from({ length: row.slots }).map((_, i) => (
                <Slot key={i} pos={row.pos} card={filled[row.pos][i]} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {phase === 'question' && (
            <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <motion.div key={shake} animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.3 }} className="rounded-2xl border border-white/[0.08] bg-surface-card/60 p-4">
                <div className="mb-2 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-purple">Answer to earn a pack</div>
                <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{question.q}</p>
                <div className="grid grid-cols-1 gap-2">
                  {question.options.map((opt, i) => {
                    const isAnswer = i === question.answer;
                    const isPicked = selected === i;
                    const state = selected === null ? 'idle' : isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim';
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={selected !== null}
                        onClick={() => answer(i)}
                        className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                          state === 'idle'
                            ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-purple/50'
                            : state === 'correct'
                              ? 'border-brand-green bg-brand-green/15 text-white'
                              : state === 'wrong'
                                ? 'border-brand-red bg-brand-red/15 text-white'
                                : 'border-white/5 bg-white/[0.02] text-white/35'
                        }`}
                      >
                        {opt}
                        {state === 'correct' && <Check className="size-4 text-brand-green" />}
                        {state === 'wrong' && <X className="size-4 text-brand-red" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {phase === 'pack' && card && (
            <motion.button
              key="pack"
              type="button"
              onClick={() => setPhase('reveal')}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-col items-center gap-3 py-4"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1], boxShadow: ['0 0 20px rgba(206,130,255,0.3)', '0 0 45px rgba(206,130,255,0.6)', '0 0 20px rgba(206,130,255,0.3)'] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex h-56 w-40 items-center justify-center rounded-2xl border-2 border-brand-purple/60 bg-gradient-to-b from-[#2a1240] to-[#12081f]"
              >
                <span className="font-poppins text-6xl font-black text-brand-purple/70">?</span>
              </motion.div>
              <span className="font-poppins text-sm font-black uppercase tracking-[0.2em] text-brand-purple">Tap to open</span>
            </motion.button>
          )}

          {phase === 'reveal' && card && (
            <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-2">
              <div className="relative">
                <PackBurst color={RARITY_META[card.rarity].glow} />
                <BigCard card={card} />
              </div>
              <button type="button" onClick={addToSquad} className="h-14 w-full rounded-2xl bg-brand-purple font-poppins text-lg font-black uppercase tracking-wide text-white">
                Add to squad
              </button>
            </motion.div>
          )}

          {phase === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="text-5xl">🏅</div>
              <div className="font-poppins text-2xl font-black uppercase text-brand-purple">Squad complete!</div>
              <div className="rounded-2xl border-2 border-brand-gold/40 bg-brand-gold/10 px-6 py-3 font-poppins text-lg font-black text-brand-gold">
                Reward: +2,000 🪙
              </div>
              <button type="button" onClick={reset} className="mt-2 h-14 w-full rounded-2xl bg-brand-purple font-poppins text-lg font-black uppercase tracking-wide text-white">
                Start a new squad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}

function Slot({ pos, card }: { pos: CardPos; card?: PlayerCard }) {
  if (!card) {
    return (
      <div className="flex h-14 w-[62px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/12">
        <span className="font-poppins text-[11px] font-black" style={{ color: `${POS_COLOR[pos]}99` }}>{pos}</span>
      </div>
    );
  }
  const meta = RARITY_META[card.rarity];
  return (
    <motion.div
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className="flex h-14 w-[62px] flex-col items-center justify-center rounded-lg border-2 px-0.5"
      style={{ background: `linear-gradient(160deg, ${meta.from}, ${meta.to})`, borderColor: meta.glow, color: meta.text }}
    >
      <span className="font-poppins text-base font-black leading-none">{card.rating}</span>
      <span className="mt-0.5 max-w-full truncate font-poppins text-[8px] font-black uppercase leading-tight">{lastName(card.name)}</span>
    </motion.div>
  );
}

function BigCard({ card }: { card: PlayerCard }) {
  const meta = RARITY_META[card.rarity];
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 90 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="relative flex h-64 w-44 flex-col items-center rounded-2xl border-2 px-3 pt-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      style={{ background: `linear-gradient(160deg, ${meta.from}, ${meta.to})`, borderColor: meta.glow, color: meta.text }}
    >
      <div className="absolute left-3 top-3 flex flex-col items-center leading-none">
        <span className="font-poppins text-3xl font-black">{card.rating}</span>
        <span className="font-poppins text-xs font-black uppercase">{card.pos}</span>
      </div>
      <div className="absolute right-3 top-3">
        <ClubCrest club={card.club} size={26} />
      </div>
      <div className="mt-9 flex size-20 items-center justify-center rounded-full bg-black/20 text-3xl">👤</div>
      <div className="mt-auto w-full pb-4 text-center">
        <div className="truncate font-poppins text-base font-black uppercase">{lastName(card.name)}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <FlagChip country={card.nation} width={18} height={12} />
          <span className="font-poppins text-[10px] font-black uppercase tracking-wide opacity-80">{meta.label}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PackBurst({ color }: { color: string }) {
  const parts = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 z-[-1] flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="absolute size-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
      />
      {parts.map((i) => {
        const a = (i / parts.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full"
            style={{ background: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 120, y: Math.sin(a) * 120, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
