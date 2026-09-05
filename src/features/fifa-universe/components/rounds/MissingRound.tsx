'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { matchesName } from '@/features/mini-games/lib/matching';
import { SQUADS, editionLabel, positionGroup, rand, shuffle, type FifaCard } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard } from '../MiniFutCard';
import { NameInput, ResultBanner, TimerBar, GREEN, RED } from '../ui';

const ROUND_MS = 30000;
const SQUAD_SIZE = 7;
const HIDDEN = 2;
const POINTS_EACH = 50;

/** Who's Missing? — a club's strongest seven from one edition, two of them blanked out. Name them. */
export function MissingRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [{ squad, cards, hidden }] = useState(() => {
    const easy = level < 1;
    const pool = SQUADS.filter((s) => !used.has(`${s.edition}|${s.club}`) && (easy ? s.cards.slice(0, SQUAD_SIZE).every((c) => c.difficulty !== 'veryHard') : true));
    const squad = rand(pool.length ? pool : SQUADS);
    const cards = squad.cards.slice(0, SQUAD_SIZE);
    const hidden = new Set(shuffle(cards).slice(0, HIDDEN).map((c) => c.id));
    return { squad, cards, hidden };
  });
  useEffect(() => { used.add(`${squad.edition}|${squad.club}`); }, [used, squad]);
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (over) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= ROUND_MS) setOver(true);
    }, 100);
    return () => window.clearInterval(id);
  }, [over]);

  const guess = (v: string) => {
    if (over) return;
    const hit = cards.find((c) => hidden.has(c.id) && !found.has(c.id) && matchesName(v, c.accepted).ok);
    if (!hit) {
      setWrong(v);
      return;
    }
    setWrong(null);
    const next = new Set(found).add(hit.id);
    setFound(next);
    if (next.size >= HIDDEN) setOver(true);
  };

  const timeBonus = Math.round(((ROUND_MS - Math.min(elapsed, ROUND_MS)) / ROUND_MS) * 40);
  const points = found.size * POINTS_EACH + (found.size === HIDDEN ? timeBonus : 0);
  const rows: Array<{ label: string; cards: FifaCard[] }> = [
    { label: 'ATT', cards: cards.filter((c) => positionGroup(c.position) === 'ATT') },
    { label: 'MID', cards: cards.filter((c) => positionGroup(c.position) === 'MID') },
    { label: 'DEF', cards: cards.filter((c) => positionGroup(c.position) === 'DEF') },
  ].filter((r) => r.cards.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-poppins text-sm font-black text-white"><ClubCrest club={squad.club} size={22} /> {squad.club} · {editionLabel(squad.edition)}</span>
        <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">{Math.ceil(Math.max(0, ROUND_MS - elapsed) / 1000)}s</span>
      </div>
      <TimerBar progress={Math.min(1, elapsed / ROUND_MS)} />
      <div className="mt-3 space-y-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface-mode-card to-surface-mode-trough-deep p-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-end justify-center gap-2">
            {r.cards.map((c) => {
              const isHidden = hidden.has(c.id);
              const got = found.has(c.id);
              return (
                <motion.div key={c.id} animate={isHidden && !got && !over ? { y: [0, -3, 0] } : { y: 0 }} transition={{ repeat: Infinity, duration: 1.6 }}>
                  <MiniFutCard card={c} size="xs" showEdition={false} masked={isHidden && !got && !over} highlight={isHidden ? (got ? 'correct' : over ? 'wrong' : 'pick') : null} />
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {!over ? (
          <>
            <NameInput onSubmit={guess} placeholder={t('Who is missing?')} />
            <p className="text-center font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: wrong ? RED : GREEN }}>
              {wrong ? t('{name} is not one of them', { name: wrong }) : t('{n}/{total} found · +{pts} each', { n: found.size, total: HIDDEN, pts: POINTS_EACH })}
            </p>
          </>
        ) : (
          <ResultBanner correct={found.size === HIDDEN} points={points} headline={found.size === HIDDEN ? t('Squad complete!') : found.size ? t('Found {n} of {total}', { n: found.size, total: HIDDEN }) : t("Time's up")} answer={cards.filter((c) => hidden.has(c.id)).map((c) => c.name).join(' · ')} onNext={() => onDone({ correct: found.size === HIDDEN, points, label: `${squad.club} ${editionLabel(squad.edition)}`, tag: t('Squad'), maxPoints: HIDDEN * POINTS_EACH + 40 })} />
        )}
      </div>
    </div>
  );
}
