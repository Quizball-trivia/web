'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, Check, RefreshCw } from 'lucide-react';
import {
  findPromoChainPlayer,
  getPromoChainPlayer,
  promoShareClub,
  solvePromoChain,
  type ChainPlayer,
  type ChainPuzzle,
} from './promoPassChain.data';

// Fork of src/features/mini-games/components/PassChain.tsx for the promo
// quiz: data comes in via props, all copy is Georgian, no header/par chrome
// (the promo shell owns the page chrome), player headshots instead of
// initials, ranked-style input, and completion reported the moment the
// chain closes — the promo shell then shows its standard green next button.

interface Link {
  player: ChainPlayer;
  viaClub: string;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

import type { PromoChainLabels } from './promoContent';

export function PromoPassChain({
  players,
  puzzles,
  labels,
  onComplete,
}: {
  players: ChainPlayer[];
  puzzles: ChainPuzzle[];
  labels: PromoChainLabels;
  onComplete: (result: { solved: number; points: number }) => void;
}) {
  const [chain, setChain] = useState<Link[]>([]);
  const [endClub, setEndClub] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<{ links: number; par: number; score: number } | null>(null);
  const completedRef = useRef(false);

  const puzzle = puzzles[0];
  const start = getPromoChainPlayer(players, puzzle.startId)!;
  const end = getPromoChainPlayer(players, puzzle.endId)!;
  const par = useMemo(() => solvePromoChain(players, puzzle.startId, puzzle.endId), [players, puzzle.startId, puzzle.endId]);

  // Report completion as soon as the chain closes; the solved chain stays on
  // screen and the promo shell shows its own green next button.
  useEffect(() => {
    if (done && lastScore && !completedRef.current) {
      completedRef.current = true;
      onComplete({ solved: 1, points: lastScore.score });
    }
  }, [done, lastScore, onComplete]);

  const submit = useCallback(() => {
    if (done || !input.trim()) return;
    const p = findPromoChainPlayer(players, input);
    if (!p) {
      setError(labels.unknown);
      return;
    }
    if (p.id === start.id || p.id === end.id || chain.some((l) => l.player.id === p.id)) {
      setError(labels.already);
      return;
    }
    const last = chain.length ? chain[chain.length - 1].player : start;
    const via = promoShareClub(last, p);
    if (!via) {
      setError(labels.neverPlayed(p.name, last.name));
      return;
    }
    const nextChain = [...chain, { player: p, viaClub: via }];
    setChain(nextChain);
    setInput('');
    setError(null);

    const toEnd = promoShareClub(p, end);
    if (toEnd) {
      const links = nextChain.length + 1;
      const score = Math.max(100, Math.round(500 - (links - par) * 120));
      setEndClub(toEnd);
      setDone(true);
      setLastScore({ links, par, score });
    }
  }, [done, input, chain, start, end, par, players, labels]);

  const resetPuzzle = () => {
    setChain([]);
    setEndClub(null);
    setDone(false);
    setInput('');
    setError(null);
    setLastScore(null);
  };

  return (
    <div className="mx-auto w-full max-w-md px-1">
      {/* Chain */}
      <div className="mt-2 flex flex-col items-center">
        <ChainNode player={start} tone="start" labelsForNode={labels} />

        <AnimatePresence initial={false}>
          {chain.map((link) => (
            <motion.div
              key={link.player.id}
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex w-full flex-col items-center"
            >
              <Connector club={link.viaClub} />
              <ChainNode player={link.player} tone="mid" labelsForNode={labels} />
            </motion.div>
          ))}
        </AnimatePresence>

        <Connector club={endClub} pending={!done} />
        <ChainNode player={end} tone={done ? 'end-done' : 'end'} labelsForNode={labels} />
      </div>

      {/* Input / result */}
      <div className="mt-5">
        {!done ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder={`${labels.placeholderPrefix} ${(chain.length ? chain[chain.length - 1].player : start).name.split(' ').slice(-1)[0]}?`}
                autoComplete="off"
                spellCheck={false}
                className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base text-white outline-none placeholder:text-white/55 focus:outline-none"
                style={{
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
                }}
              />
              <button
                type="button"
                onClick={submit}
                className="font-poppins flex h-14 shrink-0 items-center rounded-[20px] bg-brand-yellow px-5 text-base font-black uppercase text-surface-deep"
                style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 229, 0, 0.25)' }}
              >
                {labels.add}
              </button>
            </div>
            <div className="flex min-h-[20px] items-center justify-between">
              <span className="font-poppins text-xs font-bold text-brand-red">{error ?? ''}</span>
              <button type="button" onClick={resetPuzzle} className="flex items-center gap-1 font-poppins text-[11px] font-black uppercase text-white/40 hover:text-white/70">
                <RefreshCw className="size-3" /> {labels.reset}
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border-2 border-brand-green/40 bg-brand-green/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 font-poppins text-lg font-black uppercase text-brand-green">
                <Check className="size-5" /> {labels.linked}
              </div>
              {lastScore && (
                <div className="mt-2 flex items-center justify-center gap-3 font-poppins text-xs font-bold text-white/60">
                  <span>{lastScore.links} {labels.linksWord}</span>
                  {lastScore.links === lastScore.par && (
                    <span className="rounded-full bg-brand-yellow/15 px-2 py-1 text-brand-yellow">{labels.perfect}</span>
                  )}
                  <span className="font-black text-brand-green">+{lastScore.score}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ChainNode({ player, tone, labelsForNode }: { player: ChainPlayer; tone: 'start' | 'mid' | 'end' | 'end-done'; labelsForNode: { start: string; target: string } }) {
  const [imgFailed, setImgFailed] = useState(false);
  const styles: Record<string, string> = {
    start: 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow',
    mid: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    end: 'border-white/15 bg-white/[0.03] text-white/35',
    'end-done': 'border-brand-green bg-brand-green/10 text-brand-green',
  };
  return (
    <div className={`flex w-full max-w-[300px] items-center gap-3 rounded-2xl border-2 px-3 py-2.5 ${styles[tone]}`}>
      {player.imageUrl && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.imageUrl}
          alt={player.name}
          onError={() => setImgFailed(true)}
          className="size-11 shrink-0 rounded-full border border-white/20 object-cover object-top"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/30 font-poppins text-sm font-black">
          {initials(player.name)}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate font-poppins text-sm font-black text-white">{player.name}</div>
        <div className="truncate font-poppins text-[10px] font-semibold text-white/40">
          {tone === 'start' ? labelsForNode.start : tone === 'end' || tone === 'end-done' ? labelsForNode.target : player.clubs.slice(0, 3).join(' · ')}
        </div>
      </div>
    </div>
  );
}

function Connector({ club, pending }: { club: string | null; pending?: boolean }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-3 w-0.5 bg-white/15" />
      {club ? (
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 font-poppins text-[10px] font-black uppercase tracking-wide text-white/70">
          {club}
        </span>
      ) : (
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-poppins text-[10px] font-black uppercase ${pending ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.08] text-white/70'}`}>
          <ArrowDown className="size-3" /> ?
        </span>
      )}
      <div className="h-3 w-0.5 bg-white/15" />
    </div>
  );
}
