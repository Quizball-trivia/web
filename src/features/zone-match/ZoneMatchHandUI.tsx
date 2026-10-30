'use client';

/**
 * Your playstyles where you are already looking, in place of a docked hand: big choice tiles in the card window (tap to
 * pick, confirm to lock in), a row of live-card chips under the question (tap, then confirm), and in the HUD each
 * side's playstyles as three small badges (used ones greyed and ticked; tap for the details), and under each score the
 * attacks that side has left. There is no energy in the match: it was spent building the loadout.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, type CardId, type CardPhase } from './zoneMatch.cards';
import { ATTACKS_EACH, attacksLeft, opponentPublicView, type MatchState } from './zoneMatch.machine';
import { SIDE_COLOR } from './zoneMatch3d.layout';
import { CardInspector, OpponentDeckSheet, handBlocker } from './ZoneMatchCards';
import { PlaystyleBadge } from './ZoneMatchCardFace';
import { TYPE_INK } from './ZoneMatchPlaystyleRow';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

/**
 * The card window: your three playstyles as choice tiles. Tap one to select it (tap it again to drop it), then lock it
 * in with the Play button. A tile that can't be played now says why.
 */
export function PlaystyleChoices({ state, onChoose }: { state: MatchState; onChoose: (card: CardId) => void }) {
  // The selection belongs to this duel's window.
  const [picked, setPicked] = useState<{ duel: number; id: CardId } | null>(null);
  const selected = picked && picked.duel === state.duelNo ? picked.id : null;
  const blockers = state.deck.player.map((id) => handBlocker(state, id, 'blind'));
  const selectedCard = selected ? CARD_BY_ID[selected] : null;

  return (
    <div className="mt-3 flex flex-col gap-2" data-zm-choices>
      <div className="grid grid-cols-3 gap-2">
        {state.deck.player.map((id, i) => {
          const card = CARD_BY_ID[id];
          const blocker = blockers[i];
          const used = state.used.player.includes(id);
          const on = selected === id;
          return (
            <motion.button
              key={id}
              type="button"
              disabled={blocker !== null}
              onClick={() => setPicked(on ? null : { duel: state.duelNo, id })}
              whileTap={blocker === null ? { scale: 0.96 } : undefined}
              aria-pressed={on}
              aria-label={`${card.name}: ${card.short}${blocker ? ` (${blocker})` : ''}`}
              className={cn(
                'relative flex min-h-[44px] flex-col items-center gap-1 rounded-2xl border-2 px-1.5 pb-2 pt-1.5 text-center transition-colors',
                on ? 'border-brand-yellow bg-brand-yellow/15' : 'border-white/10 bg-white/[0.05]',
                blocker === null ? 'hover:border-white/30' : 'opacity-55',
              )}
              data-zm-choice={id}
            >
              <PlaystyleBadge id={id} size={46} showName={false} showCost={false} playable={blocker === null} selected={on} used={used} dimmed={blocker !== null && !used} />
              <span className="flex items-center gap-1">
                <span className="text-[11px] uppercase leading-tight text-white sm:text-xs" style={poppins}>{card.name}</span>
              </span>
              <span className="line-clamp-2 text-[10px] uppercase leading-tight sm:text-[11px]" style={{ ...poppins, color: TYPE_INK[card.type] }}>
                {card.short}
              </span>
              {blocker && (
                <span className="text-[9px] uppercase leading-tight text-white/60 sm:text-[10px]" style={poppins}>
                  {used ? 'Used' : blocker}
                </span>
              )}
              {on && (
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand-yellow text-surface-page">
                  <Check className="size-3" strokeWidth={4} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {selectedCard && selected && (
          <motion.button
            key={selected}
            type="button"
            onClick={() => onChoose(selected)}
            initial={{ opacity: 0, y: 6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 48 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-green text-base uppercase text-white shadow-[0_4px_0_#2D950B] hover:bg-brand-green-deep active:translate-y-0.5 active:shadow-none"
            style={poppins}
            data-zm-confirm
          >
            Play {selectedCard.name}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** During the question: the live cards you can play now, as chips; tap one, then confirm, and it fires. */
export function LiveCardChips({ state, onPlay }: { state: MatchState; onPlay: (card: CardId) => void }) {
  const [armed, setArmed] = useState<{ key: number; id: CardId } | null>(null);
  const key = state.mcq?.key ?? -1;
  const playable = state.deck.player.filter((id) => CARD_BY_ID[id].phase === 'live' && handBlocker(state, id, 'live') === null);
  if (playable.length === 0) return null;
  const current = armed && armed.key === key ? armed.id : null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-2.5" data-zm-live-chips>
      <span className="text-[10px] uppercase tracking-[0.12em] text-white/50" style={poppins}>Live card</span>
      {playable.map((id) => {
        const card = CARD_BY_ID[id];
        if (current === id) {
          return (
            <span key={id} className="flex items-center gap-1 rounded-full bg-brand-yellow/15 p-1 pl-2.5 ring-2 ring-brand-yellow">
              <span className="text-[11px] uppercase text-white" style={poppins}>Play {card.name}?</span>
              <button
                type="button"
                onClick={() => {
                  setArmed(null);
                  onPlay(id);
                }}
                className="flex h-9 min-w-[44px] items-center justify-center gap-1 rounded-full bg-brand-green px-3 text-xs uppercase text-white"
                style={poppins}
                aria-label={`Confirm: play ${card.name}`}
                data-zm-live-confirm={id}
              >
                <Check className="size-4" strokeWidth={3} /> Play
              </button>
              <button
                type="button"
                onClick={() => setArmed(null)}
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </span>
          );
        }
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => setArmed({ key, id })}
            whileTap={{ scale: 0.95 }}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-brand-yellow/60 bg-white/[0.06] py-1 pl-1 pr-3 text-[12px] uppercase text-white hover:bg-white/[0.12]"
            style={poppins}
            data-zm-live-chip={id}
          >
            <PlaystyleBadge id={id} size={30} showName={false} showCost={false} playable />
            Play {card.name}
          </motion.button>
        );
      })}
    </div>
  );
}

/** One side's playstyles, small, under its score in the HUD. Tap a badge for the card. */
function SideLoadout({
  side,
  deck,
  used,
  align,
  onOpen,
}: {
  side: 'player' | 'opponent';
  deck: CardId[];
  used: CardId[];
  align: 'left' | 'right';
  onOpen: (id: CardId) => void;
}) {
  return (
    <div className={cn('flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')} data-zm-loadout={side}>
      {deck.map((id) => {
        const spent = used.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            className={cn('relative grid place-items-center rounded-lg', spent && 'opacity-45 grayscale')}
            aria-label={`${side === 'player' ? 'Your' : 'Their'} ${CARD_BY_ID[id].name}${spent ? ' (used)' : ''}`}
            data-zm-loadout-card={id}
          >
            {/* Greyed (not the badge's own USED stamp, too busy at this size) with a tick. */}
            <PlaystyleBadge id={id} size={24} showName={false} showCost={false} />
            {spent && (
              <span className="absolute -bottom-0.5 -right-0.5 grid size-3 place-items-center rounded-full bg-brand-green text-white">
                <Check className="size-2" strokeWidth={4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Under the HUD's scores: both sides' playstyles. Your badges open the card (and play it from there when its
 * window is open); theirs open their deck.
 */
export function HudLoadouts({
  state,
  opponentName,
  phase,
  onPlay,
}: {
  state: MatchState;
  opponentName: string;
  /** The window open now (the card can be played from its details), or null. */
  phase: CardPhase | null;
  onPlay: (card: CardId) => void;
}) {
  const [mine, setMine] = useState<CardId | null>(null);
  const [theirs, setTheirs] = useState(false);
  const them = opponentPublicView(state);
  const blocker = mine ? handBlocker(state, mine, phase) : null;
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6">
        <SideLoadout side="player" deck={state.deck.player} used={state.used.player} align="left" onOpen={setMine} />
        <SideLoadout side="opponent" deck={state.deck.opponent} used={them.used} align="right" onOpen={() => setTheirs(true)} />
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {mine && (
              <CardInspector
                key="inspector"
                id={mine}
                blocker={blocker}
                onPlay={() => {
                  onPlay(mine);
                  setMine(null);
                }}
                onClose={() => setMine(null)}
              />
            )}
            {theirs && <OpponentDeckSheet key="theirs" state={state} name={opponentName} used={them.used} onClose={() => setTheirs(false)} />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/**
 * Under a side's score: one ball per attack it gets. Spent attacks fade out, the attack being played pulses in the
 * side's colour, and the line under them says how many are left.
 */
export function AttackCounter({ state, side }: { state: MatchState; side: 'player' | 'opponent' }) {
  const left = attacksLeft(state, side);
  const done = ATTACKS_EACH - left;
  const result = state.battleStep === 'outcome';
  const attacker = result && state.outcomeFrom ? state.outcomeFrom.attacker : state.possession.attacker;
  // The attack in progress still counts as left until its round is over.
  const live = state.stage === 'play' && left > 0 && attacker === side && !(result && state.outcome?.roundOver);
  const label = left === 0 ? 'No attacks left' : live ? (left === 1 ? 'Last attack!' : `Attack ${done + 1} of ${ATTACKS_EACH}`) : left === 1 ? '1 attack left' : `${left} attacks left`;
  // Phones have under 50px beside the clock: the count only (the pulsing ball marks the attack under way).
  const short = left === 0 ? 'None left' : live && left === 1 ? 'Last one' : `${left} left`;
  const right = side === 'opponent';
  return (
    <div
      className={cn('mt-0.5 flex flex-col gap-0.5', right ? 'items-end' : 'items-start')}
      title={`${side === 'player' ? 'You have' : 'They have'} ${left} of ${ATTACKS_EACH} attacks left`}
      data-zm-attacks={side}
      data-zm-attacks-left={left}
    >
      <div className={cn('flex items-center gap-[2px] sm:gap-1', right && 'flex-row-reverse')}>
        {Array.from({ length: ATTACKS_EACH }, (_, i) => {
          const spent = i < done;
          const current = live && i === done;
          return (
            <motion.span
              key={i}
              className={cn('relative grid size-2 place-items-center rounded-full border sm:size-3', spent ? 'border-white/20 bg-transparent' : 'border-white/80')}
              style={spent ? undefined : { background: current ? SIDE_COLOR[side] : 'rgba(255,255,255,0.9)' }}
              animate={current ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={current ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            >
              {spent && <span className="h-px w-1.5 rotate-[-35deg] bg-white/35" />}
            </motion.span>
          );
        })}
      </div>
      <div
        className={cn(
          'whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-[0.02em] sm:text-[10px] sm:tracking-[0.06em]',
          live && left === 1 ? 'text-brand-yellow' : left === 0 ? 'text-white/40' : 'text-white/75',
        )}
      >
        <span className="sm:hidden">{short}</span>
        <span className="max-sm:hidden">{label}</span>
      </div>
    </div>
  );
}
