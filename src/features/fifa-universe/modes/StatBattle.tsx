'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Swords } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { BATTLE_STATS, CARDS_BY_EDITION, PLAYABLE_EDITIONS, STAT_LABEL, editionLabel, rand, shuffle, statValue, type BattleStat, type FifaCard, type FifaEdition } from '../lib/data';
import { MiniFutCard } from '../components/MiniFutCard';
import { Callout, FifaShell, Intro, PrimaryButton, RivalBar, StatPill, Summary, TimerBar, GOLD, GREEN, RED } from '../components/ui';

const HAND = 5;
const PICK_MS = 5000;

interface Game {
  edition: FifaEdition;
  you: FifaCard[];
  rival: FifaCard[];
  stats: BattleStat[];
}

function deal(): Game {
  const edition = rand(PLAYABLE_EDITIONS);
  const pool = shuffle(CARDS_BY_EDITION[edition]);
  return { edition, you: pool.slice(0, HAND), rival: pool.slice(HAND, HAND * 2), stats: shuffle(BATTLE_STATS).slice(0, HAND) };
}

/** Rival strategy: usually plays its best remaining card for the category, sometimes bluffs low to save the big ones. */
function rivalPick(hand: FifaCard[], stat: BattleStat): FifaCard {
  const sorted = hand.slice().sort((a, b) => statValue(b, stat) - statValue(a, stat));
  return Math.random() < 0.65 ? sorted[0] : rand(sorted);
}

/** FIFA Stat Battle — a hand of five cards each, five categories, best of five. */
export function StatBattle({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'pick' | 'reveal' | 'over'>('intro');
  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState(0);
  const [usedYou, setUsedYou] = useState<string[]>([]);
  const [usedRival, setUsedRival] = useState<string[]>([]);
  const [play, setPlay] = useState<{ you: FifaCard; rival: FifaCard } | null>(null);
  const [wins, setWins] = useState({ you: 0, rival: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState<Array<{ stat: BattleStat; you: FifaCard; rival: FifaCard; result: 'you' | 'rival' | 'tie' }>>([]);
  const commitRef = useRef<(card: FifaCard) => void>(() => {});

  const start = () => {
    setGame(deal());
    setRound(0);
    setUsedYou([]);
    setUsedRival([]);
    setWins({ you: 0, rival: 0 });
    setLog([]);
    setPlay(null);
    setPhase('pick');
  };

  const stat = game?.stats[round] ?? 'overall';
  const yourHand = game ? game.you.filter((c) => !usedYou.includes(c.id)) : [];
  const rivalHand = game ? game.rival.filter((c) => !usedRival.includes(c.id)) : [];

  const commit = (card: FifaCard) => {
    if (!game || phase !== 'pick') return;
    const r = rivalPick(rivalHand, stat);
    const vy = statValue(card, stat);
    const vr = statValue(r, stat);
    const result = vy > vr ? 'you' : vr > vy ? 'rival' : 'tie';
    setPlay({ you: card, rival: r });
    setUsedYou((u) => [...u, card.id]);
    setUsedRival((u) => [...u, r.id]);
    if (result !== 'tie') setWins((w) => ({ ...w, [result]: w[result] + 1 }));
    setLog((l) => [...l, { stat, you: card, rival: r, result }]);
    setPhase('reveal');
  };
  useEffect(() => { commitRef.current = commit; });

  // Pick timer: on expiry a random card is played for you.
  useEffect(() => {
    if (phase !== 'pick') return;
    const startedAt = Date.now();
    const hand = yourHand;
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= PICK_MS) {
        window.clearInterval(id);
        commitRef.current(rand(hand));
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const next = () => {
    if (round + 1 >= HAND) { setPhase('over'); return; }
    setRound((r) => r + 1);
    setPlay(null);
    setElapsed(0);
    setPhase('pick');
  };

  const outcome = wins.you > wins.rival ? 'win' : wins.you < wins.rival ? 'lose' : 'draw';

  return (
    <FifaShell
      title={t('Stat Battle')}
      subtitle={t('Five cards, five categories — play the right card at the right time')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? <StatPill label={t('Round')} value={`${Math.min(round + 1, HAND)}/${HAND}`} color={GOLD} /> : undefined}
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={Swords} title={t('Stat Battle')} tagline={t('Top Trumps with a hand — strategy, not just knowledge.')} chips={[t('1v1 vs rival'), t('Best of 5')]} onStart={start}
            steps={[t('You and the rival each get five cards from the same FIFA.'), t('A category is announced — PACE, SHOOTING, OVERALL… You have five seconds to play one card; the rival secretly plays one too.'), t("Higher value wins the round and both cards are gone. Don't waste your best card where a lesser one would do.")]} />
        ) : phase === 'over' && game ? (
          <Summary key="over" title={outcome === 'win' ? t('You win the battle!') : outcome === 'lose' ? t('Rival takes it') : t('All square')} score={`${wins.you} – ${wins.rival}`} subline={editionLabel(game.edition)} onPlayAgain={start}
            rows={log.map((l, i) => ({ key: String(i), label: `${STAT_LABEL[l.stat]}: ${l.you.name} ${statValue(l.you, l.stat)} vs ${l.rival.name} ${statValue(l.rival, l.stat)}`, right: l.result === 'you' ? t('Won') : l.result === 'rival' ? t('Lost') : t('Tie'), ok: l.result === 'you' ? true : l.result === 'rival' ? false : null }))} />
        ) : game ? (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col">
            <RivalBar you={`${wins.you} ${t('won')}`} rival={`${wins.rival} ${t('won')}`} center={<span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">{editionLabel(game.edition)}</span>} />
            <Callout k={`${round}-${stat}`}>⚡ {STAT_LABEL[stat]}</Callout>
            {phase === 'pick' && <div className="mt-2"><TimerBar progress={elapsed / PICK_MS} color={elapsed > PICK_MS * 0.7 ? RED : GOLD} /></div>}

            {/* the table: rival's face-down hand, then the played pair */}
            <div className="mt-3 flex justify-center gap-1.5">
              {rivalHand.map((c) => (
                <div key={c.id} className="h-[58px] w-[42px] rounded-md border border-fut-border/40" style={{ background: 'linear-gradient(157deg, #c9a84c 0%, #8a6a1f 100%)' }} />
              ))}
            </div>
            <div className="my-3 flex min-h-[210px] items-center justify-center gap-6">
              <AnimatePresence>
                {play && (
                  <>
                    <PlayedCard key="you" card={play.you} stat={stat} tone={statValue(play.you, stat) > statValue(play.rival, stat) ? GREEN : statValue(play.you, stat) < statValue(play.rival, stat) ? RED : GOLD} from={40} />
                    <PlayedCard key="rival" card={play.rival} stat={stat} tone={statValue(play.rival, stat) > statValue(play.you, stat) ? GREEN : statValue(play.rival, stat) < statValue(play.you, stat) ? RED : GOLD} from={-40} />
                  </>
                )}
              </AnimatePresence>
              {!play && <span className="font-poppins text-xs font-black uppercase tracking-[0.2em] text-white/30">{t('Play a card')}</span>}
            </div>

            {phase === 'reveal' && play ? (
              <div className="mb-3 text-center">
                <span className="font-poppins text-sm font-black uppercase tracking-wider" style={{ color: log[log.length - 1]?.result === 'you' ? GREEN : log[log.length - 1]?.result === 'rival' ? RED : GOLD }}>
                  {log[log.length - 1]?.result === 'you' ? t('You win the round') : log[log.length - 1]?.result === 'rival' ? t('Rival wins the round') : t('Tie — no point')}
                </span>
              </div>
            ) : null}

            <div className="flex justify-center gap-1.5">
              {yourHand.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <MiniFutCard card={c} size="xs" showEdition={false} onClick={phase === 'pick' ? () => commit(c) : undefined} dim={phase !== 'pick'} />
                  <span className="font-poppins text-sm font-black tabular-nums" style={{ color: GOLD }}>{statValue(c, stat)}</span>
                </div>
              ))}
            </div>
            {phase === 'reveal' && <PrimaryButton className="mt-4" onClick={next}>{round + 1 >= HAND ? t('See result') : t('Next category')}</PrimaryButton>}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FifaShell>
  );
}

function PlayedCard({ card, stat, tone, from }: { card: FifaCard; stat: BattleStat; tone: string; from: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: from, rotateY: 90 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="flex flex-col items-center gap-1.5">
      <MiniFutCard card={card} size="md" showEdition={false} />
      <span className="font-poppins text-3xl font-black tabular-nums" style={{ color: tone }}>{statValue(card, stat)}</span>
    </motion.div>
  );
}
