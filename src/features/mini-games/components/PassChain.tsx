'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, Check, RefreshCw } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import {
  CHAIN_PUZZLES,
  getPlayer,
  shareClub,
  findChainPlayer,
  solve,
  type ChainPlayer,
} from '../data/passChain';
import { useMiniT } from '../lib/i18n';

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

export function PassChain({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [chain, setChain] = useState<Link[]>([]);
  const [endClub, setEndClub] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [lastScore, setLastScore] = useState<{ links: number; par: number; score: number } | null>(null);

  const puzzle = CHAIN_PUZZLES[puzzleIndex % CHAIN_PUZZLES.length];
  const start = getPlayer(puzzle.startId)!;
  const end = getPlayer(puzzle.endId)!;
  const par = useMemo(() => solve(puzzle.startId, puzzle.endId), [puzzle.startId, puzzle.endId]);

  const submit = useCallback(() => {
    if (done || !input.trim()) return;
    const p = findChainPlayer(input);
    if (!p) {
      setError(t('Unknown player — try another'));
      return;
    }
    if (p.id === start.id || p.id === end.id || chain.some((l) => l.player.id === p.id)) {
      setError(t('Already in the chain'));
      return;
    }
    const last = chain.length ? chain[chain.length - 1].player : start;
    const via = shareClub(last, p);
    if (!via) {
      setError(t('{a} never played with {b}', { a: p.name, b: last.name }));
      return;
    }
    const nextChain = [...chain, { player: p, viaClub: via }];
    setChain(nextChain);
    setInput('');
    setError(null);

    const toEnd = shareClub(p, end);
    if (toEnd) {
      const links = nextChain.length + 1;
      const score = Math.max(100, Math.round(500 - (links - par) * 120));
      setEndClub(toEnd);
      setDone(true);
      setPoints((v) => v + score);
      setLastScore({ links, par, score });
    }
  }, [done, input, chain, start, end, par, t]);

  const nextPuzzle = () => {
    setPuzzleIndex((i) => i + 1);
    setChain([]);
    setEndClub(null);
    setDone(false);
    setInput('');
    setError(null);
    setLastScore(null);
  };

  const resetPuzzle = () => {
    setChain([]);
    setEndClub(null);
    setDone(false);
    setInput('');
    setError(null);
    setLastScore(null);
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Pass Chain')}
      subtitle={t('Link the two players through shared clubs')}
      accent="#1CB0F6"
      headerRight={<StatPill label={t('Points')} value={points.toLocaleString()} color="#1CB0F6" />}
    >
      <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-surface-card/50 px-4 py-2.5">
        <span className="font-poppins text-xs font-semibold text-white/50">
          {t('Fewer links score higher')}
        </span>
        <span className="font-poppins text-xs font-black uppercase tracking-wide text-brand-cyan">
          {par === Infinity ? t('Par —') : t('Par {par} links', { par })}
        </span>
      </div>

      {/* Chain */}
      <div className="mt-4 flex flex-col items-center">
        <ChainNode player={start} tone="start" />

        <AnimatePresence initial={false}>
          {chain.map((link) => (
            <motion.div
              key={link.player.id}
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex w-full flex-col items-center"
            >
              <Connector club={link.viaClub} />
              <ChainNode player={link.player} tone="mid" />
            </motion.div>
          ))}
        </AnimatePresence>

        <Connector club={endClub} pending={!done} />
        <ChainNode player={end} tone={done ? 'end-done' : 'end'} />
      </div>

      {/* Input / result */}
      <div className="mt-5 flex-1">
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
                placeholder={t('Who links to {name}?', { name: (chain.length ? chain[chain.length - 1].player : start).name.split(' ').slice(-1)[0] })}
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-2xl border-2 border-white/10 bg-surface-input px-4 font-poppins text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-brand-cyan/60"
              />
              <button type="button" onClick={submit} className="flex h-14 shrink-0 items-center rounded-2xl bg-brand-cyan px-5 font-poppins text-base font-black uppercase text-white">
                {t('Add')}
              </button>
            </div>
            <div className="flex min-h-[20px] items-center justify-between">
              <span className="font-poppins text-xs font-bold text-brand-red">{error ?? ''}</span>
              <button type="button" onClick={resetPuzzle} className="flex items-center gap-1 font-poppins text-[11px] font-black uppercase text-white/40 hover:text-white/70">
                <RefreshCw className="size-3" /> {t('Reset')}
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-2xl border-2 border-brand-green/40 bg-brand-green/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 font-poppins text-lg font-black uppercase text-brand-green">
                <Check className="size-5" /> {t('Linked!')}
              </div>
              {lastScore && (
                <div className="mt-2 flex items-center justify-center gap-3 font-poppins text-xs font-bold text-white/60">
                  <span>{t('{n} links', { n: lastScore.links })}</span>
                  {lastScore.links === lastScore.par ? (
                    <span className="rounded-full bg-brand-yellow/15 px-2 py-1 text-brand-yellow">{t('Par — perfect!')}</span>
                  ) : (
                    <span>{t('par {n}', { n: lastScore.par })}</span>
                  )}
                  <span className="font-black text-brand-green">+{lastScore.score}</span>
                </div>
              )}
            </div>
            <button type="button" onClick={nextPuzzle} className="h-14 w-full rounded-2xl bg-brand-cyan font-poppins text-lg font-black uppercase tracking-wide text-white">
              {t('Next chain')}
            </button>
          </motion.div>
        )}
      </div>
    </MiniGameShell>
  );
}

function ChainNode({ player, tone }: { player: ChainPlayer; tone: 'start' | 'mid' | 'end' | 'end-done' }) {
  const t = useMiniT();
  const styles: Record<string, string> = {
    start: 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow',
    mid: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    end: 'border-white/15 bg-white/[0.03] text-white/35',
    'end-done': 'border-brand-green bg-brand-green/10 text-brand-green',
  };
  return (
    <div className={`flex w-full max-w-[280px] items-center gap-3 rounded-2xl border-2 px-3 py-2.5 ${styles[tone]}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/30 font-poppins text-sm font-black">
        {initials(player.name)}
      </span>
      <div className="min-w-0">
        <div className="truncate font-poppins text-sm font-black text-white">{player.name}</div>
        <div className="truncate font-poppins text-[10px] font-semibold text-white/40">
          {tone === 'start' ? t('START') : tone === 'end' || tone === 'end-done' ? t('TARGET') : player.clubs.slice(0, 3).join(' · ')}
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
