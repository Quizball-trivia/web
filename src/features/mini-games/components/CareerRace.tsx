'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ArrowRight } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { ClubCrest } from './Badges';
import { CAREER_PLAYERS, buzzPoints, type CareerPlayer } from '../data/careerRace';
import { matchesName } from '../lib/matching';
import { useMiniT } from '../lib/i18n';

const ROUNDS = 3;
const REVEAL_MS = 2_600;
const TYPE_MS = 8_000;

type Phase = 'idle' | 'revealing' | 'typing' | 'ai-buzz' | 'round-over' | 'over';

interface RoundResult {
  winner: 'you' | 'ai' | 'none';
  points: number;
  revealedAt: number;
}

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function CareerRace({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const [players, setPlayers] = useState<CareerPlayer[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealed, setRevealed] = useState(1);
  const [aiBuzzStep, setAiBuzzStep] = useState(99);
  const [aiOut, setAiOut] = useState(false);
  const [youOut, setYouOut] = useState(false);
  const [input, setInput] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [remaining, setRemaining] = useState(TYPE_MS);
  const deadlineRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const player = players[roundIdx];
  const total = player?.clubs.length ?? 0;

  const beginGame = () => {
    const deck = shuffled(CAREER_PLAYERS).slice(0, ROUNDS);
    setPlayers(deck);
    setRoundIdx(0);
    setYouScore(0);
    setAiScore(0);
    setResult(null);
    setupRound(0, deck);
  };

  const setupRound = (idx: number, deck: CareerPlayer[]) => {
    const p = deck[idx];
    setRevealed(1);
    setAiOut(false);
    setYouOut(false);
    setInput('');
    setWrongFlash(false);
    setAiBuzzStep(p.aiStep[0] + Math.floor(Math.random() * (p.aiStep[1] - p.aiStep[0] + 1)));
    setPhase('revealing');
  };

  const endRound = (r: RoundResult) => {
    setResult(r);
    if (r.winner === 'you') setYouScore((s) => s + r.points);
    if (r.winner === 'ai') setAiScore((s) => s + r.points);
    setPhase('round-over');
    later(() => {
      if (roundIdx + 1 >= ROUNDS) {
        setPhase('over');
      } else {
        setRoundIdx((i) => i + 1);
        setupRound(roundIdx + 1, players);
      }
    }, 2600);
  };

  // Auto-reveal + AI buzz trigger + dead-end handling.
  useEffect(() => {
    if (phase !== 'revealing' || !player) return;
    if (revealed >= aiBuzzStep && !aiOut) {
      setPhase('ai-buzz');
      return;
    }
    if (revealed >= total) {
      // Everything on the table — a last grace window, then nobody scores.
      const id = window.setTimeout(() => endRound({ winner: 'none', points: 0, revealedAt: total }), youOut ? 1200 : 5000);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setRevealed((r) => r + 1), REVEAL_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, aiBuzzStep, aiOut, youOut, player]);

  // AI buzz resolution.
  useEffect(() => {
    if (phase !== 'ai-buzz' || !player) return;
    const id = window.setTimeout(() => {
      if (Math.random() < player.aiSuccess) {
        endRound({ winner: 'ai', points: buzzPoints(revealed), revealedAt: revealed });
      } else {
        setAiOut(true);
        setPhase('revealing');
        setRevealed((r) => (r < total ? r + 1 : r));
      }
    }, 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, player]);

  // Typing countdown.
  useEffect(() => {
    if (phase !== 'typing') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        failBuzz();
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const buzz = () => {
    if (phase !== 'revealing' || youOut) return;
    deadlineRef.current = Date.now() + TYPE_MS;
    setRemaining(TYPE_MS);
    setPhase('typing');
    later(() => inputRef.current?.focus(), 50);
  };

  const failBuzz = () => {
    setWrongFlash(true);
    later(() => {
      setWrongFlash(false);
      setYouOut(true);
      setInput('');
      setPhase('revealing');
    }, 1100);
  };

  const submit = () => {
    if (phase !== 'typing' || !input.trim() || !player) return;
    if (matchesName(input, [player.name, ...player.accepted]).ok) {
      endRound({ winner: 'you', points: buzzPoints(revealed), revealedAt: revealed });
    } else {
      failBuzz();
    }
  };

  const typeBar = remaining / TYPE_MS;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Career Race')}
      subtitle={t('The transfer trail reveals — buzz before your rival')}
      accent="#1CB0F6"
      headerRight={<StatPill label={t('You · AI')} value={`${youScore} · ${aiScore}`} color="#1CB0F6" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">🛤️</div>
            <div className="font-poppins text-xl font-black uppercase text-brand-cyan">{t('Career Race')}</div>
            <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('Clubs appear one by one. Buzz early for 100 points — every extra club cuts the prize. Wrong buzz and you are out of the round. Best of {n}.', { n: ROUNDS })}
            </p>
            <button type="button" onClick={beginGame} className="h-14 w-full max-w-xs rounded-2xl bg-brand-cyan font-poppins text-lg font-black uppercase tracking-wide text-black">
              {t('Start race')}
            </button>
          </motion.div>
        )}

        {phase !== 'idle' && phase !== 'over' && player && (
          <motion.div key={`round-${roundIdx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">{t('Round {n} / {total}', { n: roundIdx + 1, total: ROUNDS })}</span>
              <span className="rounded-full bg-brand-yellow/15 px-2.5 py-0.5 font-poppins text-[10px] font-black uppercase text-brand-yellow">
                {t('Buzz now: {pts} pts', { pts: buzzPoints(revealed) })}
              </span>
            </div>

            {/* Trail */}
            <div className="flex flex-col gap-1.5">
              {player.clubs.map((club, i) => {
                const shown = i < revealed;
                return (
                  <motion.div
                    key={club + i}
                    initial={false}
                    animate={{ opacity: shown ? 1 : 0.25 }}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${shown ? 'border-brand-cyan/40 bg-brand-cyan/[0.07]' : 'border-white/5 bg-white/[0.02]'}`}
                  >
                    <span className="font-poppins text-[10px] font-black tabular-nums text-white/35">{i + 1}</span>
                    {shown ? (
                      <>
                        <ClubCrest club={club} size={20} />
                        <span className="font-poppins text-sm font-bold text-white">{club}</span>
                      </>
                    ) : (
                      <span className="font-poppins text-sm font-bold text-white/20">???</span>
                    )}
                    {shown && i === revealed - 1 && <ArrowRight className="ml-auto size-3.5 text-brand-cyan/60" />}
                  </motion.div>
                );
              })}
            </div>

            {/* Action area */}
            <div className="mt-3 flex-1">
              <AnimatePresence mode="wait">
                {phase === 'revealing' && (
                  <motion.div key="rev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={buzz}
                      disabled={youOut}
                      className={`flex h-14 items-center justify-center gap-2 rounded-2xl font-poppins text-lg font-black uppercase tracking-wide ${
                        youOut ? 'bg-white/[0.04] text-white/25' : 'bg-brand-yellow text-black'
                      }`}
                    >
                      <Zap className="size-5" /> {youOut ? t('Locked out') : t('BUZZ!')}
                    </button>
                    <p className="text-center font-poppins text-[10px] font-semibold text-white/35">
                      {aiOut ? t('Rival buzzed wrong — they are out!') : t('Your rival is watching the same trail…')}
                    </p>
                  </motion.div>
                )}

                {phase === 'typing' && (
                  <motion.div key="type" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-2xl border-2 p-3 ${wrongFlash ? 'border-brand-red bg-brand-red/10' : 'border-brand-yellow/50 bg-white/[0.04]'}`}>
                    <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full transition-[width] duration-100 ${typeBar < 0.3 ? 'bg-brand-red' : 'bg-brand-yellow'}`} style={{ width: `${typeBar * 100}%` }} />
                    </div>
                    {wrongFlash ? (
                      <div className="py-1.5 text-center font-poppins text-sm font-black uppercase text-brand-red">{t('Wrong — locked out!')}</div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submit()}
                          placeholder={t('Whose career is this?')}
                          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-white/10 bg-surface-input px-3 font-poppins text-sm font-bold text-white placeholder:text-white/30 focus:border-brand-yellow focus:outline-none"
                        />
                        <button type="button" onClick={submit} className="h-11 shrink-0 rounded-xl bg-brand-yellow px-4 font-poppins text-sm font-black uppercase text-black">
                          {t('Go')}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {phase === 'ai-buzz' && (
                  <motion.div key="aibuzz" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-red-soft/40 bg-brand-red-soft/[0.07] p-4 text-center">
                    <span className="font-poppins text-sm font-black uppercase tracking-wide text-brand-red-soft">{t('⚡ Rival buzzes…')}</span>
                  </motion.div>
                )}

                {phase === 'round-over' && result && (
                  <motion.div key="ro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className={`font-poppins text-lg font-black uppercase ${result.winner === 'you' ? 'text-brand-green-light' : result.winner === 'ai' ? 'text-brand-red' : 'text-white/60'}`}>
                      {result.winner === 'you' ? t('+{pts} — yours!', { pts: result.points }) : result.winner === 'ai' ? t('Rival takes {pts}', { pts: result.points }) : t('Nobody got it')}
                    </div>
                    <p className="font-poppins text-xs font-semibold text-white/55">
                      {t('It was {name}', { name: player.name })}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {phase === 'over' && (
          <motion.div key="over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">{youScore > aiScore ? '🏆' : youScore < aiScore ? '🤖' : '🤝'}</div>
            <div className={`font-poppins text-2xl font-black uppercase ${youScore > aiScore ? 'text-brand-green-light' : youScore < aiScore ? 'text-brand-red' : 'text-white/70'}`}>
              {youScore > aiScore ? t('You win the race!') : youScore < aiScore ? t('Rival wins') : t('Draw')}
            </div>
            <p className="font-poppins text-sm font-bold text-white">{youScore} · {aiScore}</p>
            <button type="button" onClick={beginGame} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-cyan py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('Race again')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}
