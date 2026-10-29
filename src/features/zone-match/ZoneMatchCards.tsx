'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, Check, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import {
  CARD_BY_ID,
  DECK_SIZE,
  deckCost,
  type CardId,
  type CardPhase,
} from './zoneMatch.cards';
import { PHASE_CURTAIN_MS, cardBlocker, reactionBlocker, revealedCard, unusedCategories, type MatchState } from './zoneMatch.machine';
import { CARD_TYPE_THEME, CardBack, CardFace, CardGlyph, PHASE_INFO, PlaystyleBadge, ROLE_INFO } from './ZoneMatchCardFace';
import { FutCard, reactionFor, type FutReaction, type SlotBurst } from './ZoneMatchFutCard';
import { PlaystyleRow } from './ZoneMatchPlaystyleRow';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

function EnergyCost({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full bg-brand-yellow px-1.5 py-0.5 text-[10px] font-black text-surface-page', className)}>
      <Zap className="size-2.5 fill-current" />
      {value}
    </span>
  );
}

/** Desktop layout (card beside the list) from Tailwind's lg breakpoint. */
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (onChange: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

export interface RevealSeat {
  name: string;
  avatarCustomization: AvatarCustomization | null;
  rankPoints: number | null;
}

const SIDES = ['player', 'opponent'] as const;
/** Each side's column in the showdown grid (the VS sits in column 2). */
const SIDE_COLUMN: Record<DuelSide, number> = { player: 1, opponent: 3 };
/** When each side's panel and rows pop in (s): yours first, theirs a beat later. */
const PANEL_DELAY: Record<DuelSide, number> = { player: 0.15, opponent: 0.45 };
/** The FUT cards' width range at the showdown (px), and the room kept under the screen when fitting them. */
const REVEAL_CARD_MIN = 96;
const REVEAL_CARD_MAX = 232;
const REVEAL_FIT_MARGIN = 12;

/**
 * The FUT cards' width at the showdown: as wide as their column allows (up to REVEAL_CARD_MAX) while the whole screen
 * still fits the viewport's height. Everything else in the grid keeps its height whatever the cards' width, so one
 * measurement settles it. Paused while a row's rules are open, so opening one doesn't shrink the cards.
 */
function useRevealCardWidth(paused: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const [width, setWidth] = useState(140);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const cell = cellRef.current;
    if (!root || !cell) return;
    const measure = () => {
      const card = cell.firstElementChild as HTMLElement | null;
      if (pausedRef.current || !card) return;
      const aspect = card.offsetHeight / Math.max(1, card.offsetWidth);
      const rest = root.offsetHeight - cell.offsetHeight;
      const top = root.getBoundingClientRect().top + window.scrollY;
      const byHeight = (window.innerHeight - top - rest - REVEAL_FIT_MARGIN) / aspect;
      setWidth(Math.round(Math.max(REVEAL_CARD_MIN, Math.min(REVEAL_CARD_MAX, cell.clientWidth, byHeight))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return { rootRef, cellRef, width };
}

/**
 * The showdown's second beat: both loadouts face to face, always the same size. One grid holds both sides — the cards
 * on one row, then a row per playstyle slot — so row i on the left and row i on the right always share a height, and
 * the panels are drawn behind those rows. Tap a playstyle for its full rule. Ready skips the rest of the wait.
 */
export function DeckReveal({
  decks,
  seats,
  timeLeft,
  onReady,
}: {
  decks: Record<DuelSide, CardId[]>;
  seats: Record<DuelSide, RevealSeat>;
  timeLeft: number | null;
  onReady: () => void;
}) {
  const [ready, setReady] = useState(false);
  /** The open row, as `side:index`. */
  const [open, setOpen] = useState<string | null>(null);
  const desktop = useDesktop();
  const { rootRef, cellRef, width } = useRevealCardWidth(open !== null);
  const rows = Math.max(DECK_SIZE, decks.player.length, decks.opponent.length);

  return (
    <div ref={rootRef} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-2 pb-4 sm:gap-x-4">
      <header className="col-span-3 mb-1 text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">Showdown</div>
        <h1 className="text-2xl uppercase leading-tight text-white sm:text-3xl" style={poppins}>Playstyles</h1>
        <div className="mt-0.5 text-[11px] text-white/55 sm:text-xs">
          Each works once<span className="max-sm:hidden"> · tap theirs at the top during the match</span>
        </div>
      </header>

      {/* Both player cards facing off, the same size, their playstyles landing one by one once the phase curtain has lifted. */}
      <div ref={cellRef} className="flex justify-center" style={{ gridColumn: 1, gridRow: 2 }}>
        <RevealCard seat={seats.player} cards={decks.player} width={width} startMs={PHASE_CURTAIN_MS + 300} />
      </div>
      <div className="self-center text-2xl font-black italic text-white/30 sm:text-4xl" style={{ ...poppins, gridColumn: 2, gridRow: 2 }}>
        VS
      </div>
      <div className="flex justify-center" style={{ gridColumn: 3, gridRow: 2 }}>
        <RevealCard seat={seats.opponent} cards={decks.opponent} width={width} startMs={PHASE_CURTAIN_MS + 1900} mirror />
      </div>

      {/* The two panels, behind their header and slot rows. */}
      {SIDES.map((side) => (
        <motion.div
          key={`panel-${side}`}
          aria-hidden
          data-reveal-panel={side}
          className={cn('rounded-[24px] bg-surface-page/90 ring-1', side === 'player' ? 'ring-brand-blue/40' : 'ring-brand-red-soft/40')}
          style={{ gridColumn: SIDE_COLUMN[side], gridRow: `3 / span ${rows + 1}` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: PANEL_DELAY[side], type: 'spring', stiffness: 220, damping: 24 }}
        />
      ))}
      {SIDES.map((side) => (
        <motion.div
          key={`head-${side}`}
          className="relative flex min-w-0 items-center gap-2 px-2 pt-2 sm:px-3 sm:pt-3"
          style={{ gridColumn: SIDE_COLUMN[side], gridRow: 3 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: PANEL_DELAY[side] + 0.1 }}
        >
          <PanelHeader side={side} seat={seats[side]} cards={decks[side]} />
        </motion.div>
      ))}
      {SIDES.flatMap((side) =>
        Array.from({ length: rows }, (_, i) => {
          const id = decks[side][i];
          const key = `${side}:${i}`;
          return (
            <div
              key={key}
              className={cn('relative min-w-0 px-1.5 sm:px-3', i === rows - 1 && 'pb-1.5 sm:pb-3')}
              style={{ gridColumn: SIDE_COLUMN[side], gridRow: 4 + i }}
            >
              {id && (
                <PlaystyleRow
                  id={id}
                  dense
                  fill
                  badgeSize={desktop ? 52 : 36}
                  open={open === key}
                  onToggle={() => setOpen((current) => (current === key ? null : key))}
                  reveal={{ delay: PANEL_DELAY[side] + 0.2 + i * 0.18, from: side === 'player' ? -16 : 16 }}
                />
              )}
            </div>
          );
        }),
      )}

      {/* What's next on the left, Ready on the right — as wide as the panels. */}
      <div className="col-span-3 mt-2 flex items-center gap-3" style={{ gridRow: 4 + rows }}>
        <div className="min-w-0 flex-1 text-[11px] font-black uppercase tracking-wide text-white/55">
          Your categories{timeLeft !== null ? ` in ${timeLeft}` : ' next'}
        </div>
        <button
          type="button"
          disabled={ready}
          onClick={() => {
            setReady(true);
            onReady();
          }}
          className="rounded-2xl bg-brand-green px-8 py-3 text-base uppercase text-white shadow-[0_4px_0_rgba(45,149,11,1)] hover:bg-brand-green-deep active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          style={poppins}
        >
          Ready
        </button>
      </div>
    </div>
  );
}

/** A seat's FUT card at the showdown: its three playstyles land on it one after another. */
function RevealCard({ seat, cards, width, startMs, mirror = false }: { seat: RevealSeat; cards: CardId[]; width: number; startMs: number; mirror?: boolean }) {
  const [landed, setLanded] = useState(0);
  // Keyed on the loadout's contents, not the array: the screen re-renders every clock tick.
  const count = cards.length;
  const loadout = cards.join(',');
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => setLanded(i + 1), startMs + i * 520));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [loadout, count, startMs]);
  const last = landed > 0 ? cards[landed - 1] : null;
  const bursts: SlotBurst[] = last ? [{ slot: landed - 1, key: landed, type: CARD_BY_ID[last].type }] : [];
  const reaction: FutReaction | null = last ? reactionFor(landed === cards.length ? 'complete' : CARD_BY_ID[last].type, landed, startMs) : null;
  return (
    <FutCard
      seat={seat}
      width={width}
      slots={Array.from({ length: DECK_SIZE }, (_, i) => (i < landed ? cards[i] ?? null : null))}
      bursts={bursts}
      shineKey={landed}
      reaction={reaction}
      mirror={mirror}
    />
  );
}

/** Who the panel is, and (from sm) what the loadout cost and its mix of types. */
function PanelHeader({ side, seat, cards }: { side: DuelSide; seat: RevealSeat; cards: CardId[] }) {
  const types = (['boost', 'sabotage', 'defense', 'tactical'] as const)
    .map((type) => ({ type, count: cards.filter((id) => CARD_BY_ID[id].type === type).length }))
    .filter((entry) => entry.count > 0);
  return (
    <>
      <SeatName seat={seat} side={side} />
      <EnergyCost value={deckCost(cards)} className="max-sm:hidden" />
      <div className="ml-auto flex shrink-0 gap-1 max-sm:hidden">
        {types.map(({ type, count }) => {
          const theme = CARD_TYPE_THEME[type];
          return (
            <span key={type} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ ...poppins, background: `${theme.color}26`, color: theme.color }}>
              <theme.Icon className="size-3" /> {count}
            </span>
          );
        })}
      </div>
    </>
  );
}

/** The seat's name in its side's colour (the FUT card right above already shows who they are). */
function SeatName({ seat, side }: { seat: RevealSeat; side: DuelSide }) {
  return (
    <span className={cn('min-w-0 truncate text-sm uppercase sm:text-lg', side === 'player' ? 'text-brand-blue' : 'text-brand-red-soft')} style={poppins}>
      {side === 'player' ? 'You' : seat.name}
    </span>
  );
}

/** A loadout as compact rows (badge, name, cost, what it does, when / who); tap one for its full rule. */
export function DeckDetails({ cards, used = [] }: { cards: CardId[]; used?: CardId[] }) {
  const [open, setOpen] = useState<CardId | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {cards.map((id) => (
        <PlaystyleRow key={id} id={id} used={used.includes(id)} open={open === id} onToggle={() => setOpen((current) => (current === id ? null : id))} />
      ))}
    </div>
  );
}

// ── In play ──────────────────────────────────────────────────────────────────

/** Why the player can't play `id` in the open window, or null when they can. */
export function handBlocker(state: MatchState, id: CardId, phase: CardPhase | null): string | null {
  if (state.used.player.includes(id)) return 'Already used this match';
  if (!phase) return 'No card window right now';
  if (CARD_BY_ID[id].phase === 'reaction' && phase === 'reaction') return reactionBlocker(state, 'player', id);
  return cardBlocker(state, 'player', id, phase);
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(360);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * A modal overlay takes every key first (capture) so the match underneath never sees them — Escape closing the overlay
 * must not also clear a guess typed on the number pad — and keeps focus (and Tab) inside itself. Attach the returned
 * ref to the overlay's content.
 */
function useModalKeys(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  // Callers pass a fresh onClose on every clock tick: keep the latest without re-running the focus effect below.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const focusables = () =>
      Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    // Focus moves into the overlay once, as it opens, so Enter can't press a control of the match underneath.
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : index === items.length - 1 ? 0 : index + 1;
      event.preventDefault();
      items[next].focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return ref;
}

/** One card at full size over a dimmed screen: what it does, when it works, and Play when it can be played now. */
export function CardInspector({
  id,
  blocker,
  onPlay,
  onClose,
}: {
  id: CardId;
  blocker: string | null;
  onPlay: () => void;
  onClose: () => void;
}) {
  const card = CARD_BY_ID[id];
  const phase = PHASE_INFO[card.phase];
  const role = ROLE_INFO[card.role];
  const [width] = useState(() => Math.round(Math.min(250, window.innerWidth * 0.62, (window.innerHeight - 230) * (63 / 88))));
  const trapRef = useModalKeys(onClose);

  return (
    <>
      <motion.div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div ref={trapRef} className="pointer-events-none fixed inset-0 z-[81] flex flex-col items-center justify-center gap-4 px-4">
        <motion.div layoutId={`hand-card-${id}`} className="pointer-events-auto" transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
          <PlaystyleBadge id={id} size={Math.min(140, width * 0.6)} showCost={false} playable={blocker === null} />
        </motion.div>
        <motion.p
          className="pointer-events-auto max-w-[320px] text-center text-sm leading-snug text-white/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.1 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {card.effect}
        </motion.p>
        <motion.div
          className="pointer-events-auto flex w-full max-w-[320px] flex-col gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.1 } }}
        >
          <div className="grid grid-cols-2 gap-1.5 text-[10px] uppercase leading-tight text-white/75" style={poppins}>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-2.5 py-2">
              <phase.Icon className="size-3.5 shrink-0 text-brand-yellow" /> {phase.long}
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-2.5 py-2">
              <role.Icon className="size-3.5 shrink-0" style={{ color: CARD_TYPE_THEME[card.type].color }} /> {role.long}
            </span>
          </div>
          {blocker === null ? (
            <button
              type="button"
              onClick={onPlay}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-green text-lg uppercase text-white shadow-[0_4px_0_#2D950B] transition hover:bg-brand-green-deep active:translate-y-0.5 active:shadow-none"
              style={poppins}
            >
              Use {card.name}
            </button>
          ) : (
            <div className="rounded-2xl bg-white/[0.08] px-4 py-3 text-center text-xs uppercase text-white/60" style={poppins}>
              {blocker}
            </div>
          )}
          <button type="button" onClick={onClose} className="h-11 rounded-2xl border-2 border-white/15 text-sm uppercase text-white/80 hover:border-white/30" style={poppins}>
            Close
          </button>
        </motion.div>
      </div>
    </>
  );
}

export function OpponentDeckSheet({ state, name, used, onClose }: { state: MatchState; name: string; used: CardId[]; onClose: () => void }) {
  const trapRef = useModalKeys(onClose);
  return (
    <>
      <motion.div key="backdrop" className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        key="sheet"
        className="fixed inset-x-0 bottom-0 z-[81] max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-surface-page px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        <div ref={trapRef} className="mx-auto max-w-[1000px]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg uppercase text-brand-red-soft" style={poppins}>{name}&apos;s deck</div>
              <div className="text-[11px] uppercase tracking-wide text-white/45" style={poppins}>Each card once per match · faded ones are already played</div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3">
            <DeckDetails cards={state.deck.opponent} used={used} />
          </div>
        </div>
      </motion.div>
    </>
  );
}

type SlotFace =
  | { kind: 'pick' }
  | { kind: 'waiting' }
  | { kind: 'back' }
  | { kind: 'none' }
  | { kind: 'card'; id: CardId };

const slotKey = (face: SlotFace) => (face.kind === 'card' ? `card-${face.id}` : face.kind);

/** At the end of the reveal, the cards still standing light up as activated. */
const ACTIVATE_LEAD_MS = 1100;

/**
 * The blind cards side by side: you on the left, them on the right. Face down while choosing, then both flip in place
 * at the reveal. A VAR Review or Shin Pads flies onto the card it cancels (it cracks and greys out, with who did it in
 * the title); just before the question every card still standing lights up as activated. Reactions and Home
 * Advantage's category pick sit underneath.
 */
export function CardClash({
  state,
  now,
  opponentName,
  onNoCard,
  onReaction,
  onHomeCategory,
  children,
}: {
  state: MatchState;
  now: number;
  opponentName: string;
  onNoCard: () => void;
  onReaction: (card: CardId) => void;
  onHomeCategory: (categoryId: string) => void;
  /** Your playstyle choices (the card window), between the two slots and "No playstyle". */
  children?: ReactNode;
}) {
  const revealed = state.battleStep === 'reveal';
  const mine = state.choice.player;
  const mineFace: SlotFace = mine === undefined ? { kind: 'pick' } : mine === null ? { kind: 'none' } : { kind: 'card', id: mine };
  // Their bluff is exposed once a reaction has hit it.
  const theirBluffHit = revealed && state.cancelled.opponent && state.choice.opponent === 'dummy-run';
  const theirSeen = theirBluffHit ? 'dummy-run' : revealedCard(state, 'opponent');
  const theirFace: SlotFace = revealed
    ? theirSeen
      ? { kind: 'card', id: theirSeen }
      : { kind: 'none' }
    : state.choice.opponent === undefined
      ? { kind: 'waiting' }
      : { kind: 'back' };
  const reactionOf = (side: DuelSide) => state.played[side].find((id) => CARD_BY_ID[id].phase === 'reaction') ?? null;
  const cancelledBy: Record<DuelSide, CardId | null> = {
    player: state.cancelled.player ? reactionOf('opponent') : null,
    opponent: state.cancelled.opponent ? reactionOf('player') : null,
  };
  const activating = revealed && state.advanceAt !== null && now >= state.advanceAt - ACTIVATE_LEAD_MS;
  const reactions = (['shin-pads', 'var-review'] as const).filter((id) => state.deck.player.includes(id) && reactionBlocker(state, 'player', id) === null);
  const homePick = revealed && state.choice.player === 'home-advantage' && !state.cancelled.player;
  const [panelRef, panelWidth] = useElementWidth<HTMLDivElement>();
  const slotWidth = Math.max(84, Math.min(124, Math.round((panelWidth - 60) * 0.36)));
  // On a phone the panel can start under the docked hand: bring it up once per duel.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [panelRef, state.duelNo]);

  const verb = (card: CardId) => (card === 'shin-pads' ? 'blocked' : 'cancelled');
  let headline: { title: string; tone: string };
  let subtitle: string;
  if (cancelledBy.opponent && theirSeen) {
    headline = theirBluffHit
      ? { title: 'Just a bluff!', tone: 'text-brand-red-soft' }
      : { title: `You ${verb(cancelledBy.opponent)} their ${CARD_BY_ID[theirSeen].name}`, tone: 'text-brand-blue' };
    subtitle = theirBluffHit ? `It was a Dummy Run — your ${CARD_BY_ID[cancelledBy.opponent].name} was wasted` : `With ${CARD_BY_ID[cancelledBy.opponent].name}`;
  } else if (cancelledBy.player && mine) {
    headline = mine === 'dummy-run'
      ? { title: 'Your bluff worked!', tone: 'text-brand-green' }
      : { title: `${opponentName} ${verb(cancelledBy.player)} your ${CARD_BY_ID[mine].name}`, tone: 'text-brand-red-soft' };
    subtitle = mine === 'dummy-run' ? `They wasted ${CARD_BY_ID[cancelledBy.player].name} on a Dummy Run` : `With ${CARD_BY_ID[cancelledBy.player].name}`;
  } else if (activating) {
    const any = mineFace.kind === 'card' || theirFace.kind === 'card';
    headline = { title: any ? 'Cards activated' : 'No cards this duel', tone: 'text-brand-green' };
    subtitle = 'The question is next';
  } else if (revealed) {
    headline = { title: 'Cards revealed', tone: 'text-white' };
    subtitle = reactions.length > 0 ? 'Answer their card — or let it stand' : 'The question is next';
  } else {
    headline = { title: mine === undefined ? 'Use a playstyle?' : 'Locked in', tone: 'text-white' };
    subtitle = mine === undefined ? 'Tap a playstyle below · both pick at once' : `Waiting for ${opponentName} · then both cards flip`;
  }

  return (
    <div ref={panelRef} className="rounded-[24px] bg-surface-page p-3 sm:p-4" style={{ scrollMarginBottom: 'calc(var(--party-dock-height) + 12px)' }}>
      <div className="text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={headline.title}
            className={cn('text-base uppercase sm:text-lg', headline.tone)}
            style={poppins}
            initial={{ y: 8, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {headline.title}
          </motion.div>
        </AnimatePresence>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/50 sm:text-[11px]" style={poppins}>{subtitle}</div>
      </div>

      <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <ClashSlot
          label="You"
          tone="text-brand-blue"
          face={mineFace}
          width={slotWidth}
          canceller={cancelledBy.player}
          cancellerFrom="right"
          bluff={mine === 'dummy-run'}
          activated={activating && !cancelledBy.player}
        />
        <div className="grid place-items-center self-center text-xl font-black italic text-white/25" style={poppins}>VS</div>
        <ClashSlot
          label={opponentName}
          tone="text-brand-red-soft"
          face={theirFace}
          width={slotWidth}
          canceller={cancelledBy.opponent}
          cancellerFrom="left"
          bluff={theirBluffHit}
          activated={activating && !cancelledBy.opponent}
        />
      </div>

      {children}

      {!revealed && mine === undefined && (
        <button
          type="button"
          onClick={onNoCard}
          className="mt-2.5 h-10 w-full rounded-[16px] border-2 border-white/15 text-sm uppercase text-white/75 transition hover:border-white/30 hover:text-white"
          style={poppins}
        >
          No playstyle this duel
        </button>
      )}

      {revealed && reactions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {reactions.map((id) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => onReaction(id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm uppercase text-white shadow-[0_4px_0_#1645FF] hover:bg-brand-blue/90 active:translate-y-0.5 active:shadow-none"
              style={poppins}
            >
              <span className="text-lg"><CardGlyph id={id} /></span>
              React: {CARD_BY_ID[id].name}
              <span className="text-[11px] normal-case text-white/80">{id === 'shin-pads' ? 'block their sabotage' : 'cancel their card'}</span>
            </motion.button>
          ))}
        </div>
      )}

      {homePick && (
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="text-center text-xs font-black uppercase tracking-wide text-brand-yellow">Home Advantage · this question from one of your categories</div>
          <div className="grid grid-cols-2 gap-1.5">
            {unusedCategories(state, 'player').map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onHomeCategory(category.id)}
                className={cn(
                  'truncate rounded-xl px-3 py-2 text-left text-xs font-black uppercase',
                  state.homeCategoryId === category.id ? 'bg-brand-yellow text-surface-page' : 'bg-white/[0.08] hover:bg-white/[0.14]',
                )}
              >
                {category.icon ? `${category.icon} ` : ''}{category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClashSlot({
  label,
  tone,
  face,
  width,
  canceller,
  cancellerFrom,
  bluff,
  activated,
}: {
  label: string;
  tone: string;
  face: SlotFace;
  width: number;
  /** The reaction that cancelled this slot's card, if any. */
  canceller: CardId | null;
  cancellerFrom: 'left' | 'right';
  /** The cancelled card was a Dummy Run. */
  bluff: boolean;
  activated: boolean;
}) {
  const height = Math.round((width * 88) / 63);
  const card = face.kind === 'card' ? CARD_BY_ID[face.id] : null;
  let body: ReactNode;
  let caption: ReactNode = null;
  switch (face.kind) {
    case 'pick':
      body = (
        <div className="grid h-full w-full place-items-center rounded-[18px] border-2 border-dashed border-brand-yellow/50 text-center">
          <div className="flex flex-col items-center gap-1 px-2 text-[10px] uppercase leading-tight text-brand-yellow" style={poppins}>
            Pick a playstyle
            <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity }}>
              <ArrowDown className="size-5" />
            </motion.span>
          </div>
        </div>
      );
      break;
    case 'waiting':
      body = <CardBack width={width} waiting />;
      caption = 'Choosing…';
      break;
    case 'back':
      body = <CardBack width={width} />;
      caption = (
        <span className="inline-flex items-center gap-1">
          <Check className="size-3" /> Locked in
        </span>
      );
      break;
    case 'none':
      body = (
        <div className="grid h-full w-full place-items-center rounded-[18px] border-2 border-dashed border-white/15 text-xs font-black uppercase text-white/35">
          No card
        </div>
      );
      break;
    case 'card':
      body = <CardFace id={face.id} width={width} size="compact" showCost={false} />;
      caption = CARD_BY_ID[face.id].effect;
      break;
  }
  if (canceller) {
    caption = (
      <span className="font-semibold text-brand-red-soft">
        {bluff ? 'Bluff — ' : ''}
        {canceller === 'shin-pads' ? 'Blocked' : 'Cancelled'} by {CARD_BY_ID[canceller].name}
      </span>
    );
  }

  return (
    <div className="relative flex min-w-0 flex-col items-center text-center">
      <div className={cn('mb-1.5 max-w-full truncate text-[11px] uppercase tracking-[0.08em]', tone)} style={poppins}>{label}</div>
      <div className="relative" style={{ width, height }}>
        {activated && card && !canceller && <Activation key="on" color={CARD_TYPE_THEME[card.type].color} />}
        {/* Shaken by the hit, then greyed out. */}
        <motion.div
          className="relative z-[1] h-full w-full"
          animate={canceller ? { x: [0, -9, 9, -6, 6, 0] } : activated && card ? { scale: [1, 1.1, 1] } : { x: 0, scale: 1 }}
          transition={canceller ? { delay: 0.4, duration: 0.45 } : { duration: 0.5 }}
        >
          <motion.div
            className="h-full w-full"
            style={{ perspective: 700 }}
            animate={{ filter: canceller ? 'grayscale(1) brightness(0.55)' : 'grayscale(0) brightness(1)' }}
            transition={{ delay: canceller ? 0.5 : 0, duration: 0.4 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slotKey(face)}
                className="h-full w-full"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {body}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
        {canceller && <CancelHit key={canceller} canceller={canceller} from={cancellerFrom} width={width} height={height} bluff={bluff} />}
      </div>
      {caption && <div className="mt-1.5 text-[10px] leading-snug text-white/60">{caption}</div>}
    </div>
  );
}

/** A reaction card flying in from its owner's side and slamming onto the card it cancels: flash, crack, stamp. */
function CancelHit({ canceller, from, width, height, bluff }: { canceller: CardId; from: 'left' | 'right'; width: number; height: number; bluff: boolean }) {
  const dir = from === 'right' ? 1 : -1;
  return (
    <>
      <motion.div
        className="pointer-events-none absolute z-20"
        style={{ top: -width * 0.16, [from === 'right' ? 'right' : 'left']: -width * 0.16 }}
        initial={{ x: dir * width * 1.5, y: height * 0.9, rotate: dir * 40, scale: 1.8, opacity: 0 }}
        animate={{ x: 0, y: 0, rotate: dir * 12, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 17 }}
      >
        <CardFace id={canceller} width={Math.round(width * 0.5)} size="mini" showCost={false} playable />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[18px] bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0] }}
        transition={{ delay: 0.36, duration: 0.4 }}
      />
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
        {['M54 0 L46 30 L60 52 L40 80 L57 104 L47 140', 'M60 52 L82 60 L94 74', 'M40 80 L20 88 L8 102'].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="#FF4B4B"
            strokeWidth={i === 0 ? 3.5 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.45 + i * 0.08, duration: 0.3 }}
          />
        ))}
      </svg>
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-[40%] z-20 flex justify-center"
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 420, damping: 16 }}
      >
        <span className="-rotate-12 rounded-lg bg-brand-red-soft px-2.5 py-1 text-[11px] font-black uppercase text-white shadow-lg">
          {bluff ? 'Bluff!' : canceller === 'shin-pads' ? 'Blocked' : 'Cancelled'}
        </span>
      </motion.div>
    </>
  );
}

/** A card switching on: a burst in its colour and an Activated badge. */
function Activation({ color }: { color: string }) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[190%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}aa 0%, transparent 60%)` }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 1.15, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 -bottom-2.5 z-20 flex justify-center"
        initial={{ y: 10, scale: 0.4, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.12 }}
      >
        <span className="flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[10px] font-black uppercase text-white shadow-lg">
          <Check className="size-3" strokeWidth={4} /> Activated
        </span>
      </motion.div>
    </>
  );
}
