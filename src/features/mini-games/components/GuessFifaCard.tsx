'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Trophy, RotateCw, Flag, Lightbulb } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { FutCard } from './FutCard';
import { useMiniT } from '../lib/i18n';
import { matchesName } from '../lib/matching';
import { PLAYABLE_EDITIONS } from '../data/guessFifaCard';
import { pickIcon } from '../data/guessFifaIcons';
import { EditionSpinner, type SpinTarget } from './EditionSpinner';
import { POINTS_PER_SOLVE, ROUND_SIZE, MAX_SCORE, rand, pickCard, IDENTITY_CLUES, type IdentityClue, type RoundResult, type GuessableCard } from '../lib/guessCard';

type Status = 'spin' | 'clue' | 'result';
type Screen = 'play' | 'summary';

/** Chance a spin lands on ICONS (a legend) instead of an edition. */
const ICON_CHANCE = 0.2;

export function GuessFifaCard({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const [card, setCard] = useState<GuessableCard | null>(null);
  const [targetEdition, setTargetEdition] = useState<SpinTarget>(PLAYABLE_EDITIONS[0]);
  const [spinKey, setSpinKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>('spin');
  const [shownClue, setShownClue] = useState<IdentityClue>('nation');
  const [manualReveals, setManualReveals] = useState<IdentityClue[]>([]);
  const [screen, setScreen] = useState<Screen>('play');
  const [results, setResults] = useState<RoundResult[]>([]);
  const [outcome, setOutcome] = useState<{ solved: boolean; points: number; wrong: boolean } | null>(null);
  const [input, setInput] = useState('');

  const usedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<GuessableCard | null>(null); // card drawn by the spin, revealed when it lands
  const cardRef = useRef(card);
  const indexRef = useRef(index);
  const advanceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const score = useMemo(() => results.reduce((s, r) => s + r.points, 0), [results]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { cardRef.current = card; }, [card]);

  const clearAdvance = () => {
    if (advanceRef.current) { window.clearTimeout(advanceRef.current); advanceRef.current = null; }
  };

  // Spin to draw the next card: pick an edition (or ICONS), then a card from it.
  // The card stays hidden (pendingRef) until the reel lands.
  const beginCard = useCallback(() => {
    let drawn: GuessableCard | null = null;
    let target: SpinTarget;
    if (Math.random() < ICON_CHANCE) {
      drawn = pickIcon(usedRef.current);
      target = 'ICONS';
    } else {
      target = rand(PLAYABLE_EDITIONS);
    }
    if (!drawn) {
      const edition = target === 'ICONS' ? rand(PLAYABLE_EDITIONS) : target;
      drawn = pickCard(usedRef.current, edition);
      target = edition;
    }
    if (drawn) usedRef.current.add(drawn.name);
    pendingRef.current = drawn;
    setTargetEdition(target);
    setShownClue(rand(IDENTITY_CLUES)); // one clue shown, the other two hidden
    setManualReveals([]);
    setOutcome(null);
    setInput('');
    setStatus('spin');
    setSpinKey((k) => k + 1);
  }, []);

  // First card — deferred a tick (avoids sync setState in the effect); guard
  // INSIDE the timeout so StrictMode's mount→cleanup→mount can't cancel it.
  const startedRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (startedRef.current) return;
      startedRef.current = true;
      beginCard();
    }, 0);
    return () => window.clearTimeout(id);
  }, [beginCard]);

  const nextCard = useCallback(() => {
    clearAdvance();
    if (indexRef.current + 1 >= ROUND_SIZE) {
      setStatus('result');
      setScreen('summary');
      return;
    }
    setIndex((i) => i + 1);
    beginCard();
  }, [beginCard]);

  const resolveCard = useCallback(
    (solved: boolean, wrong = false) => {
      const c = cardRef.current;
      const pts = solved ? POINTS_PER_SOLVE : 0;
      setStatus('result');
      setOutcome({ solved, points: pts, wrong });
      if (c) setResults((r) => [...r, { card: c, points: pts, solved }]);
      clearAdvance();
      advanceRef.current = window.setTimeout(nextCard, solved ? 1500 : 2200);
    },
    [nextCard],
  );

  const onSpinDone = useCallback(() => {
    setCard(pendingRef.current);
    setStatus((s) => (s === 'spin' ? 'clue' : s));
  }, []);

  // Focus the input when a card's guessing phase begins.
  useEffect(() => {
    if (screen === 'play' && status === 'clue') {
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [status, screen, index]);

  useEffect(() => () => clearAdvance(), []);

  // One try: a wrong guess reveals the answer and moves on.
  const submit = () => {
    if (status !== 'clue' || !card || !input.trim()) return;
    const ok = matchesName(input, card.accepted).ok;
    resolveCard(ok, !ok);
  };
  const giveUp = () => { if (status === 'clue') resolveCard(false, false); };

  // One clue reveal per card — unlock whichever hidden clue you prefer.
  const revealClue = (clue: IdentityClue) => {
    if (status !== 'clue' || manualReveals.length >= 1) return;
    if (clue === shownClue) return;
    setManualReveals([clue]);
  };

  const playAgain = () => {
    clearAdvance();
    usedRef.current = new Set();
    setResults([]);
    setCard(null);
    setIndex(0);
    setScreen('play');
    beginCard();
  };

  const revealedClues = {
    nation: status === 'result' || shownClue === 'nation' || manualReveals.includes('nation'),
    league: status === 'result' || shownClue === 'league' || manualReveals.includes('league'),
    club: status === 'result' || shownClue === 'club' || manualReveals.includes('club'),
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title="Guess the Card"
      subtitle={t('Spin for a FIFA edition, then name the player from the card')}
      accent="#FFD54A"
      headerRight={
        <div className="flex items-center gap-2">
          <StatPill label={t('Card')} value={`${Math.min(index + 1, ROUND_SIZE)}/${ROUND_SIZE}`} color="#FFD54A" />
          <StatPill label={t('Score')} value={score} color="#38B60E" />
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {screen === 'summary' ? (
          <Summary key="summary" results={results} score={score} onPlayAgain={playAgain} />
        ) : status === 'spin' || !card ? (
          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center">
            {spinKey > 0 && <EditionSpinner key={spinKey} target={targetEdition} onDone={onSpinDone} />}
          </motion.div>
        ) : (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col">
            <div className="mt-2">
              {/* one identity clue shown while playing; tap a lock (or answer) to reveal the rest */}
              <FutCard
                card={card}
                revealed={revealedClues}
                revealName={status === 'result'}
                highlight={status === 'result' ? (outcome?.solved ? 'correct' : 'reveal') : null}
                revealable={status === 'clue' && manualReveals.length < 1}
                onRevealClue={revealClue}
              />
            </div>

            <div className="mt-4 flex-1">
              <AnimatePresence mode="wait">
                {status === 'clue' ? (
                  <motion.div key="input" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <Lightbulb className={`size-6 shrink-0 ${manualReveals.length < 1 ? 'text-brand-yellow' : 'text-white/25'}`} />
                      <span className="font-poppins text-[14px] font-bold text-white/80">
                        {manualReveals.length < 1 ? t('Tap a lock to reveal a clue') : t('Clue revealed')}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder={t('Name the player…')}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/50 placeholder:normal-case placeholder:tracking-normal focus:outline-none"
                        style={{ fontWeight: 600 }}
                      />
                      <button type="button" onClick={submit} disabled={!input.trim()} aria-label={t('Go')} className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40">
                        <Send className="size-4" />
                      </button>
                    </div>
                    <button type="button" onClick={giveUp} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] font-poppins text-sm font-black uppercase tracking-wide text-white/65 transition-colors hover:bg-white/10">
                      <Flag className="size-4" /> {t('Give up')}
                    </button>
                  </motion.div>
                ) : (
                  <ResultBanner key="result" outcome={outcome} card={card} onNext={nextCard} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}

function ResultBanner({
  outcome,
  card,
  onNext,
}: {
  outcome: { solved: boolean; points: number; wrong: boolean } | null;
  card: GuessableCard;
  onNext: () => void;
}) {
  const t = useMiniT();
  const solved = !!outcome?.solved;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="space-y-3">
      <div className="rounded-2xl border-2 p-3 text-center" style={{ borderColor: solved ? '#38B60E66' : '#FB310166', background: solved ? 'rgba(56,182,14,0.08)' : 'rgba(251,49,1,0.06)' }}>
        {solved ? (
          <>
            <div className="font-poppins text-sm font-black uppercase tracking-wide text-brand-green">{t('Correct!')}</div>
            <div className="mt-0.5 font-poppins text-2xl font-black text-white">+{outcome?.points}</div>
            <div className="mt-0.5 font-poppins text-sm font-bold text-white/70">{card.name}</div>
          </>
        ) : (
          <>
            <div className={`font-poppins text-sm font-black uppercase tracking-wide ${outcome?.wrong ? 'text-brand-red' : 'text-white/45'}`}>
              {outcome?.wrong ? t('Wrong!') : t('The answer')}
            </div>
            <div className="mt-0.5 font-poppins text-lg font-black text-white">{card.name}</div>
            <div className="mt-0.5 font-poppins text-[11px] font-semibold text-white/50">{card.club} · {card.editionLabel}</div>
          </>
        )}
      </div>
      <button type="button" onClick={onNext} className="h-12 w-full rounded-2xl bg-brand-yellow font-poppins text-base font-black uppercase tracking-wide text-black active:scale-[0.98]">
        {t('Next')}
      </button>
    </motion.div>
  );
}

function Summary({
  results,
  score,
  onPlayAgain,
}: {
  results: RoundResult[];
  score: number;
  onPlayAgain: () => void;
}) {
  const t = useMiniT();
  const solvedCount = results.filter((r) => r.solved).length;
  return (
    <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col pt-2">
      <div className="rounded-3xl border-2 border-brand-yellow/40 bg-brand-yellow/[0.06] p-5 text-center">
        <Trophy className="mx-auto size-9 text-brand-yellow" />
        <div className="mt-2 font-poppins text-sm font-black uppercase tracking-wide text-white/60">{t('Round complete')}</div>
        <div className="mt-1 font-poppins text-5xl font-black text-brand-yellow">{score}</div>
        <div className="mt-1 font-poppins text-xs font-semibold text-white/50">
          {t('of {max} · {n}/{total} named', { max: MAX_SCORE, n: solvedCount, total: results.length })}
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: '46vh' }}>
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <span className="w-12 shrink-0 rounded-md bg-[#3a2c08]/50 px-1.5 py-0.5 text-center font-poppins text-[9px] font-black uppercase tracking-wider text-[#f4e3a2]">
              {r.card.editionLabel}
            </span>
            <span className="min-w-0 flex-1 truncate font-poppins text-sm font-bold text-white">{r.card.name}</span>
            <span className={`font-poppins text-sm font-black ${r.solved ? 'text-brand-green' : 'text-brand-red'}`}>
              {r.solved ? `+${r.points}` : t('Missed')}
            </span>
          </div>
        ))}
      </div>

      <button type="button" onClick={onPlayAgain} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black active:scale-[0.98]">
        <RotateCw className="size-5" /> {t('Play again')}
      </button>
    </motion.div>
  );
}
