'use client';

/**
 * The loadout screen before the search: where you are in getting into a match (pick → find → showdown → kick-off),
 * the few rules that matter as chips, and the 20 playstyles as scannable tiles (badge, name, cost, what it does, when
 * and who) with the full rule text behind an info button. Picks fly onto your player card's PlayStyle slots (a
 * compact slot header on phones); once the loadout is full, tapping another playstyle starts a swap.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, CircleHelp, Eye, Info, Shuffle, Ticket, WandSparkles, X, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CARDS,
  CARD_BY_ID,
  DECK_SIZE,
  LOADOUT_BUDGET,
  MAX_SABOTAGE_IN_DECK,
  completeDeck,
  deckBlocker,
  deckCost,
  deckFull,
  legalDeck,
  type CardDef,
  type CardId,
  type CardType,
} from './zoneMatch.cards';
import { CARD_TYPE_THEME, PHASE_INFO, PlaystyleBadge, ROLE_INFO } from './ZoneMatchCardFace';
import { InfoMark, PlaystyleRules, PlaystyleText } from './ZoneMatchPlaystyleRow';
import { FutCard, reactionFor, type FutReaction, type FutSeat, type SlotBurst } from './ZoneMatchFutCard';
import { useDesktop } from './ZoneMatchCards';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const TYPES = ['boost', 'sabotage', 'defense', 'tactical'] as const;
const HEX = 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)';

// ── Fly-in / fly-out ─────────────────────────────────────────────────────────

interface Flight {
  key: number;
  id: CardId;
  dir: 'in' | 'out';
  from: DOMRect;
  to: DOMRect;
}

const FLIGHT_S = 0.62;
/** A landing burst's lifetime (its animation runs 0.65 s). */
const BURST_KEEP_MS = 1000;

/** A playstyle badge flying between its tile and its slot (fixed, over everything). */
function FlyingBadge({ flight, onDone }: { flight: Flight; onDone: (flight: Flight) => void }) {
  const { from, to } = flight;
  const base = Math.max(1, from.width);
  const endScale = to.width / base;
  const peak = Math.min(from.y, to.y) - 70;
  const color = CARD_TYPE_THEME[CARD_BY_ID[flight.id].type].color;
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[90]"
      style={{ transformOrigin: '0 0', filter: `drop-shadow(0 0 14px ${color})` }}
      initial={{ x: from.x, y: from.y, scale: 1, rotate: 0, opacity: 1 }}
      animate={{
        x: [from.x, (from.x + to.x) / 2, to.x],
        y: [from.y, peak, to.y],
        scale: [1, Math.max(1.3, endScale * 1.4), endScale],
        rotate: [0, flight.dir === 'in' ? -14 : 14, 0],
        opacity: flight.dir === 'out' ? [1, 1, 0.2] : 1,
      }}
      transition={{ duration: FLIGHT_S, ease: 'easeInOut', times: [0, 0.45, 1] }}
      onAnimationComplete={() => onDone(flight)}
    >
      <PlaystyleBadge id={flight.id} size={base} showName={false} />
    </motion.div>
  );
}

function rectOf(element: HTMLElement | null | undefined): DOMRect | null {
  const rect = element?.getBoundingClientRect();
  return rect && rect.width > 0 ? rect : null;
}

// ── The screen ───────────────────────────────────────────────────────────────

/**
 * Spend the energy budget (LOADOUT_BUDGET) on up to 3 of the 20 playstyles (at most 1 sabotage), FUT-style: each pick
 * flies onto a slot of your player card, which answers with a shine and a reaction from your avatar. A playstyle that
 * doesn't fit (no slot, or over budget) is swapped in instead: you choose the slot it replaces, among those where it
 * fits (a second sabotage just replaces the first). Your opponent sees your loadout at the showdown, and you see theirs.
 */
export function DeckPicker({
  deck,
  seat,
  loading,
  onToggle,
  onRandom,
  onFindMatch,
}: {
  deck: CardId[];
  seat: FutSeat;
  loading: boolean;
  onToggle: (id: CardId) => void;
  onRandom: () => void;
  onFindMatch: () => void;
}) {
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const [swapIn, setSwapIn] = useState<CardId | null>(null);
  const [info, setInfo] = useState<CardId | null>(null);
  const desktop = useDesktop();
  const reduceMotion = useReducedMotion();
  // Nothing else fits (3 picked, or the budget is used up); any pick at all is enough to play.
  const full = deckFull(deck);
  const ready = deck.length > 0;
  const left = LOADOUT_BUDGET - deckCost(deck);
  const sabotageAt = deck.findIndex((id) => CARD_BY_ID[id].type === 'sabotage');
  const shown = CARDS.filter((card) => filter === 'all' || card.type === filter);
  // A swap waits for a slot while the newcomer is still out of the loadout.
  const pending = swapIn && !deck.includes(swapIn) ? swapIn : null;
  const [notice, setNotice] = useState<string | null>(null);
  /** `id` can take slot `index`'s place: the loadout stays legal (budget and sabotage limit). */
  const fitsAt = (index: number, id: CardId) => legalDeck(deck.map((c, i) => (i === index ? id : c))).length === deck.length;

  // Fly-in / fly-out, and what the card does when a playstyle lands.
  const tileBadges = useRef(new Map<CardId, HTMLElement | null>());
  const slotEls = useRef<(HTMLElement | null)[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bursts, setBursts] = useState<SlotBurst[]>([]);
  const burstBorn = useRef(new Map<number, number>());
  const [shineKey, setShineKey] = useState(0);
  const [reaction, setReaction] = useState<FutReaction | null>(null);
  const counter = useRef(0);
  const deckRef = useRef(deck);
  const initiated = useRef(new Set<CardId>());
  const prevDeck = useRef(deck);

  const land = useCallback((ids: CardId[]) => {
    const current = deckRef.current;
    const now = ++counter.current;
    // Keep only bursts still animating (they last ~0.65 s): finished ones would otherwise pile up in the DOM.
    const bornAt = performance.now();
    setBursts((list) => [
      ...list.filter((b) => bornAt - burstBorn.current.get(b.key)! < BURST_KEEP_MS),
      ...ids.map((id, i) => {
        const key = now * 10 + i;
        burstBorn.current.set(key, bornAt);
        return { slot: current.indexOf(id), key, type: CARD_BY_ID[id].type };
      }),
    ]);
    for (const [key, born] of burstBorn.current) if (bornAt - born >= BURST_KEEP_MS) burstBorn.current.delete(key);
    setShineKey((k) => k + 1);
    const lastId = ids[ids.length - 1];
    setReaction(reactionFor(CARD_BY_ID[lastId].type, now, now, lastId, current.length === DECK_SIZE));
  }, []);

  // Picks that did not fly in (auto-pick, reduced motion): land them in place.
  useEffect(() => {
    deckRef.current = deck;
    const added = deck.filter((id) => !prevDeck.current.includes(id) && !initiated.current.has(id));
    prevDeck.current = deck;
    if (added.length > 0) land(added);
  }, [deck, land]);

  // Esc backs out of a swap.
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSwapIn(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const fly = (id: CardId, dir: Flight['dir'], from: DOMRect | null, to: DOMRect | null) => {
    if (reduceMotion || !from) return;
    const target = to ?? new DOMRect(from.x, from.y + 160, from.width, from.height);
    if (dir === 'in') initiated.current.add(id);
    setFlights((list) => [...list, { key: ++counter.current, id, dir, from, to: target }]);
  };
  const tileRect = (id: CardId) => rectOf(tileBadges.current.get(id));
  const slotRect = (index: number) => rectOf(slotEls.current[index]);

  const remove = (index: number) => {
    const id = deck[index];
    if (!id) return;
    fly(id, 'out', slotRect(index), tileRect(id));
    onToggle(id);
  };

  /** Puts `id` in slot `index` in place of what is there. */
  const replace = (index: number, id: CardId) => {
    const tail = deck.slice(index);
    fly(tail[0], 'out', slotRect(index), tileRect(tail[0]));
    fly(id, 'in', tileRect(id), slotRect(index));
    // onToggle only adds at the end: lift the slot and those after it, add the newcomer, then put the rest back, so the
    // newcomer keeps the replaced slot (the parent applies these in order).
    for (const c of tail) onToggle(c);
    onToggle(id);
    for (const c of tail.slice(1)) onToggle(c);
    setSwapIn(null);
  };

  const pick = (id: CardId) => {
    if (deck.includes(id)) {
      setSwapIn(null);
      remove(deck.indexOf(id));
      return;
    }
    if (pending === id) {
      setSwapIn(null);
      return;
    }
    setNotice(null);
    const blocker = deckBlocker(deck, id);
    if (blocker !== null) {
      // A second sabotage can only take the first one's place.
      if (CARD_BY_ID[id].type === 'sabotage' && sabotageAt !== -1) {
        if (fitsAt(sabotageAt, id)) replace(sabotageAt, id);
        else setNotice(`${CARD_BY_ID[id].name} costs ${CARD_BY_ID[id].energy}⚡ — too much in place of ${CARD_BY_ID[deck[sabotageAt]].name}`);
        return;
      }
      // Otherwise swap it in where it fits; if it fits nowhere, say why.
      if (deck.some((_, index) => fitsAt(index, id))) setSwapIn(id);
      else setNotice(`${CARD_BY_ID[id].name} costs ${CARD_BY_ID[id].energy}⚡ — take more out first`);
      return;
    }
    setSwapIn(null);
    fly(id, 'in', tileRect(id), slotRect(deck.length));
    onToggle(id);
  };

  const onSlot = (index: number) => {
    setNotice(null);
    if (!pending) remove(index);
    else if (fitsAt(index, pending)) replace(index, pending);
  };

  // Not full: top up what you have; full: a fresh random loadout.
  const autoPick = () => {
    setSwapIn(null);
    setNotice(null);
    if (full) {
      onRandom();
      return;
    }
    for (const id of completeDeck(deck)) if (!deck.includes(id)) onToggle(id);
  };

  const onFlightDone = useCallback(
    (flight: Flight) => {
      setFlights((list) => list.filter((f) => f.key !== flight.key));
      if (flight.dir !== 'in') return;
      initiated.current.delete(flight.id);
      if (deckRef.current.includes(flight.id)) land([flight.id]);
    },
    [land],
  );

  const flyingIn = new Set(flights.filter((f) => f.dir === 'in').map((f) => f.id));
  const slots = Array.from({ length: DECK_SIZE }, (_, i) => (deck[i] && !flyingIn.has(deck[i]) ? deck[i] : null));
  const registerSlot = (index: number, element: HTMLElement | null) => {
    slotEls.current[index] = element;
  };

  const hint = <LoadoutHint deck={deck} pending={pending} notice={notice} onCancel={() => setSwapIn(null)} />;
  // Mid-swap, the slots the newcomer can't take are greyed.
  const swappable = pending ? deck.map((_, index) => fitsAt(index, pending)) : null;

  return (
    <div className="flex flex-col gap-4 pb-36">
      <LoadoutSteps ready={ready} />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {desktop ? (
          // Your card, pinned beside the list.
          <aside className="sticky top-6 flex flex-col items-center gap-4">
            <FutCard
              seat={seat}
              width={280}
              slots={slots}
              slotRef={registerSlot}
              onSlotClick={(index) => deck[index] && onSlot(index)}
              blockedSlots={swappable ? swappable.map((ok) => !ok) : undefined}
              emptyClosed={full}
              bursts={bursts}
              shineKey={shineKey}
              reaction={reaction}
            />
            <div className="flex w-full flex-col items-center gap-3">
              {pending && <SlotRow slots={slots} size={56} pending={pending} swappable={swappable} closed={full} onSlot={onSlot} />}
              {hint}
            </div>
          </aside>
        ) : (
          // Phones: the card collapses to its three slots, pinned while you scroll the list.
          <aside className="sticky top-0 z-30 -mx-4 flex flex-col gap-2 bg-surface-page-alt/95 px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Your loadout</div>
                <Progress deck={deck} />
              </div>
              <SlotRow slots={slots} size={46} pending={pending} swappable={swappable} closed={full} onSlot={onSlot} registerSlot={registerSlot} />
            </div>
            {hint}
          </aside>
        )}

        <div className="flex min-w-0 flex-col gap-4">
          {desktop && (
            <div>
              <h1 className="text-3xl uppercase text-white" style={poppins}>Pick your playstyles</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
                {full ? (
                  <span className="flex items-center gap-1.5 text-brand-green-light">
                    <Check className="size-4" strokeWidth={3.5} /> Loadout ready — find a match
                  </span>
                ) : (
                  `Spend up to ${LOADOUT_BUDGET}⚡ on up to ${DECK_SIZE} playstyles`
                )}
                <BudgetMeter spent={deckCost(deck)} />
              </div>
            </div>
          )}

          <RuleChips />

          <section className="flex flex-col gap-2.5">
            <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
              {(['all', ...TYPES] as const).map((type) => {
                const active = filter === type;
                const theme = type === 'all' ? null : CARD_TYPE_THEME[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(type)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition',
                      active ? 'bg-white text-surface-page' : 'bg-white/10 text-white/70 hover:bg-white/20',
                    )}
                    style={active && theme ? { background: theme.color, color: theme.ink } : undefined}
                  >
                    {theme && <theme.Icon className="size-3" style={active ? undefined : { color: theme.color }} />}
                    {type === 'all' ? 'All' : theme!.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2">
              {shown.map((card) => (
                <PlaystyleTile
                  key={card.id}
                  card={card}
                  slot={deck.indexOf(card.id)}
                  pending={pending === card.id}
                  muted={full && !deck.includes(card.id) && pending !== card.id}
                  overBudget={!deck.includes(card.id) && card.energy > left}
                  open={info === card.id}
                  onPick={() => pick(card.id)}
                  onInfo={() => setInfo((current) => (current === card.id ? null : card.id))}
                  badgeRef={(element) => {
                    tileBadges.current.set(card.id, element);
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Auto-pick and Find match: always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-page/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            onClick={autoPick}
            title={full ? 'Swap your whole loadout for a random one' : 'Fill what is left of the budget at random'}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm uppercase text-white hover:bg-white/15"
            style={poppins}
          >
            {full ? <Shuffle className="size-4" /> : <WandSparkles className="size-4" />}
            {full ? 'Re-roll' : 'Auto-pick'}
          </button>
          {ready ? (
            <button
              type="button"
              disabled={loading}
              onClick={onFindMatch}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 py-3 text-base uppercase text-white shadow-[0_4px_0_rgba(45,149,11,1)] hover:bg-brand-green-deep active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              style={poppins}
            >
              {loading ? 'Loading…' : (
                <>
                  Find match <ArrowRight className="size-5" strokeWidth={3} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 rounded-2xl bg-white/[0.06] px-4 py-3 text-base uppercase text-white/55 ring-1 ring-inset ring-white/10"
              style={poppins}
            >
              Pick a playstyle
            </button>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          flights.map((flight) => <FlyingBadge key={flight.key} flight={flight} onDone={onFlightDone} />),
          document.body,
        )}
    </div>
  );
}

// ── Steps and rules ──────────────────────────────────────────────────────────

const STEPS = ['Pick playstyles', 'Find a match', 'Showdown', 'Kick-off'] as const;
/** Shorter labels where four have to share a phone's width. */
const STEPS_SHORT = ['Pick', 'Find match', 'Showdown', 'Kick-off'] as const;

/** Where you are on the way into a match. Step 1 is this screen; once the loadout is full, step 2 is up next. */
function LoadoutSteps({ ready }: { ready: boolean }) {
  return (
    <ol className="flex items-start" aria-label="Getting into a match">
      {STEPS.map((label, i) => {
        const done = i === 0 && ready;
        const current = i === 0 && !ready;
        const next = i === 1 && ready;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:gap-2" aria-current={i === 0 ? 'step' : undefined}>
            <div className="flex w-full items-center sm:w-auto">
              <span className={cn('h-0.5 flex-1 rounded-full sm:hidden', i === 0 ? 'opacity-0' : 'bg-white/15')} />
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-black',
                  done && 'bg-brand-green text-white',
                  current && 'bg-brand-yellow text-surface-page shadow-[0_0_0_4px_rgba(255,229,0,0.2)]',
                  next && 'bg-white text-surface-page shadow-[0_0_0_4px_rgba(255,255,255,0.15)]',
                  !done && !current && !next && 'bg-white/10 text-white/45',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3.5} /> : i + 1}
              </span>
              <span className={cn('h-0.5 flex-1 rounded-full sm:hidden', i === STEPS.length - 1 ? 'opacity-0' : 'bg-white/15')} />
            </div>
            <span
              className={cn(
                'truncate text-center text-[10px] uppercase tracking-wide sm:text-xs',
                current || next ? 'text-white' : done ? 'text-brand-green-light' : 'text-white/40',
              )}
              style={poppins}
            >
              <span className="sm:hidden">{STEPS_SHORT[i]}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="hidden h-0.5 min-w-4 flex-1 rounded-full bg-white/15 sm:mx-1 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

function RuleChip({ Icon, color, children }: { Icon: LucideIcon; color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-inset ring-white/10">
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      {children}
    </span>
  );
}

/** The rules that shape a loadout, once, as chips; the rest behind "How it works". */
function RuleChips() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <RuleChip Icon={Zap} color="#FFE500">
          {LOADOUT_BUDGET}⚡ budget · up to {DECK_SIZE}
        </RuleChip>
        <RuleChip Icon={Ticket} color="#7FD6FF">Each works once</RuleChip>
        <RuleChip Icon={CARD_TYPE_THEME.sabotage.Icon} color={CARD_TYPE_THEME.sabotage.color}>
          Max {MAX_SABOTAGE_IN_DECK} sabotage
        </RuleChip>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide text-brand-yellow hover:bg-white/[0.06]"
        >
          <CircleHelp className="size-3.5" /> How it works
        </button>
      </div>
      {open && (
        <div className="grid gap-3 rounded-2xl bg-surface-page/85 p-3 text-xs leading-snug text-white/75 ring-1 ring-white/10 sm:grid-cols-2">
          <HowRow Icon={Zap} color="#FFE500" title="Energy">
            Your loadout can cost up to {LOADOUT_BUDGET}⚡ in all — say a 3⚡ and a 2⚡, or a 1⚡ and two 2⚡. That is all the energy there is:
            in the match each playstyle simply works once.
          </HowRow>
          <HowRow Icon={Eye} color="#7FD6FF" title="No secrets">
            Both loadouts are shown at the showdown. A playstyle turns into a card when you use it.
          </HowRow>
          <HowRow Icon={PHASE_INFO.blind.Icon} color="#9CB6C2" title="When">
            <b className="text-white">{PHASE_INFO.blind.label}</b>: both pick at once, then reveal ·{' '}
            <b className="text-white">{PHASE_INFO.live.label}</b>: while the question is up ·{' '}
            <b className="text-white">{PHASE_INFO.reaction.label}</b>: answer the card they just showed
          </HowRow>
          <HowRow Icon={ROLE_INFO.attack.Icon} color="#58CC02" title="Who">
            <b className="text-white">{ROLE_INFO.attack.label}</b>: you attack · <b className="text-white">{ROLE_INFO.defend.label}</b>: they
            attack · <b className="text-white">{ROLE_INFO.shot.label}</b>: attacking from their side · <b className="text-white">{ROLE_INFO.any.label}</b>: any time
          </HowRow>
        </div>
      )}
    </div>
  );
}

function HowRow({ Icon, color, title, children }: { Icon: LucideIcon; color: string; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Slots and the status line ────────────────────────────────────────────────

function Progress({ deck }: { deck: CardId[] }) {
  if (deckFull(deck)) {
    return (
      <div className="flex items-center gap-1.5 text-base uppercase text-brand-green-light" style={poppins}>
        <Check className="size-4" strokeWidth={3.5} /> Ready
        <BudgetMeter spent={deckCost(deck)} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-white" style={poppins}>
      <span className="text-base uppercase">{deck.length === 0 ? 'Pick' : 'Add more?'}</span>
      <BudgetMeter spent={deckCost(deck)} />
    </div>
  );
}

/** The budget as five pips: spent ones lit. */
function BudgetMeter({ spent }: { spent: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-1.5 pr-2 text-xs font-black text-white" title={`${spent} of ${LOADOUT_BUDGET}⚡ spent`} data-zm-budget={spent}>
      <Zap className="size-3 fill-brand-yellow text-brand-yellow" />
      <span className="flex items-center gap-[2px]">
        {Array.from({ length: LOADOUT_BUDGET }, (_, i) => (
          <span key={i} className={cn('h-2.5 w-1.5 rounded-[2px]', i < spent ? 'bg-brand-yellow' : 'bg-white/20')} />
        ))}
      </span>
      {spent}/{LOADOUT_BUDGET}
    </span>
  );
}

/**
 * The three slots as buttons: tap one to take it out, or — mid-swap — to put the pending playstyle there. Phones show
 * these instead of the player card; on desktop they appear under the card while choosing a slot to swap.
 */
function SlotRow({
  slots,
  size,
  pending,
  swappable,
  closed,
  onSlot,
  registerSlot,
}: {
  slots: (CardId | null)[];
  size: number;
  pending: CardId | null;
  /** Mid-swap: which slots the pending playstyle may take (it fits the budget there). */
  swappable: boolean[] | null;
  /** The budget is spent: empty slots can't be filled, so they grey out. */
  closed: boolean;
  onSlot: (index: number) => void;
  registerSlot?: (index: number, element: HTMLElement | null) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {slots.map((id, index) => (
        <div key={index} ref={(element) => registerSlot?.(index, element)} className="relative" style={{ width: size, height: size * 0.9 }}>
          {id ? (
            <button
              type="button"
              onClick={() => onSlot(index)}
              disabled={pending !== null && swappable?.[index] === false}
              aria-label={pending ? `Replace ${CARD_BY_ID[id].name} with ${CARD_BY_ID[pending].name}` : `Remove ${CARD_BY_ID[id].name}`}
              className="relative block disabled:opacity-35"
            >
              {pending && swappable?.[index] !== false && (
                <span aria-hidden className="absolute inset-[-7%] motion-safe:animate-pulse" style={{ clipPath: HEX, background: 'rgba(255,229,0,0.75)' }} />
              )}
              <PlaystyleBadge id={id} size={size} showName={false} />
            </button>
          ) : (
            <EmptySlot index={index} size={size} closed={closed} />
          )}
        </div>
      ))}
    </div>
  );
}

function EmptySlot({ index, size, closed }: { index: number; size: number; closed: boolean }) {
  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size * 0.9}
      aria-label={closed ? `Slot ${index + 1}, closed: budget spent` : `Slot ${index + 1}, empty`}
      className={cn('transition-opacity', closed && 'opacity-30')}
    >
      <polygon points="26,4 74,4 97,45 74,86 26,86 3,45" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.3)" strokeWidth={3} strokeDasharray="7 6" strokeLinejoin="round" />
      <text x="50" y="47" textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.45)" fontSize="30" fontWeight={800} fontFamily="Poppins, sans-serif">
        {closed ? '–' : index + 1}
      </text>
    </svg>
  );
}

/** One line under the slots: what to do next, and the budget / sabotage rule when it bites. */
function LoadoutHint({ deck, pending, notice, onCancel }: { deck: CardId[]; pending: CardId | null; notice: string | null; onCancel: () => void }) {
  const full = deckFull(deck);
  const sabotage = deck.find((id) => CARD_BY_ID[id].type === 'sabotage');
  const left = LOADOUT_BUDGET - deckCost(deck);

  let message: ReactNode;
  if (notice) {
    message = <span className="text-brand-yellow">{notice}</span>;
  } else if (pending) {
    message = (
      <span className="text-brand-yellow">
        Tap a slot to swap in <b>{CARD_BY_ID[pending].name}</b> ({CARD_BY_ID[pending].energy}⚡)
      </span>
    );
  } else if (full) {
    message = left === 0 ? 'Budget spent — tap another playstyle to swap' : 'Full — tap another playstyle to swap';
  } else if (sabotage) {
    message = (
      <>
        {MAX_SABOTAGE_IN_DECK} sabotage max — another replaces <span className="text-brand-red-soft">{CARD_BY_ID[sabotage].name}</span>
      </>
    );
  } else if (deck.length > 0) {
    message = `${left}⚡ left — add more, or find a match`;
  } else {
    message = 'Tap a playstyle to add it';
  }

  return (
    <div className="flex w-full items-center gap-2 text-xs leading-snug text-white/65">
      <Info className="size-3.5 shrink-0 text-white/40" />
      <span className="min-w-0 flex-1">{message}</span>
      {pending ? (
        <button type="button" onClick={onCancel} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase text-white hover:bg-white/20">
          <X className="size-3" strokeWidth={3} /> Cancel
        </button>
      ) : null}
    </div>
  );
}

// ── A playstyle tile ─────────────────────────────────────────────────────────

/**
 * One playstyle: badge, name, cost, what it does in a few words, and when / who chips — the type's colour down the
 * left edge. The info button opens the full rule text; tapping anywhere else picks it (or swaps it in, or out).
 */
function PlaystyleTile({
  card,
  slot,
  pending,
  muted,
  overBudget,
  open,
  onPick,
  onInfo,
  badgeRef,
}: {
  card: CardDef;
  /** Its slot in the loadout, or -1. */
  slot: number;
  /** Waiting for a slot to swap into. */
  pending: boolean;
  /** The loadout is full and this one is out: lightly dimmed. */
  muted: boolean;
  /** Costs more than is left of the budget: its cost turns red (tapping it offers a swap). */
  overBudget: boolean;
  open: boolean;
  onPick: () => void;
  onInfo: () => void;
  badgeRef: (element: HTMLElement | null) => void;
}) {
  const theme = CARD_TYPE_THEME[card.type];
  const selected = slot !== -1;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] border-2 bg-surface-page/85 transition motion-safe:hover:-translate-y-0.5',
        selected ? 'border-brand-yellow' : pending ? 'border-dashed border-brand-yellow' : 'border-white/10 hover:border-white/25',
        muted && 'opacity-80 hover:opacity-100',
      )}
      style={{ backgroundImage: `linear-gradient(90deg, ${theme.color}2b, transparent 42%)` }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: theme.color }} />
      <button
        type="button"
        data-playstyle={card.id}
        onClick={onPick}
        aria-pressed={selected}
        title={card.effect}
        className="flex w-full items-center gap-3 py-3 pl-3.5 pr-11 text-left"
      >
        <span ref={badgeRef} className="shrink-0">
          <PlaystyleBadge id={card.id} size={60} showName={false} selected={selected} unaffordable={overBudget} />
        </span>
        <PlaystyleText
          card={card}
          tags={
            <>
              {selected && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-yellow px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-surface-page">
                  <Check className="size-2.5" strokeWidth={4} /> Slot {slot + 1}
                </span>
              )}
              {pending && <span className="text-[10px] font-black uppercase text-brand-yellow">Choose a slot</span>}
            </>
          }
        />
      </button>
      <button
        type="button"
        data-playstyle-info={card.id}
        onClick={onInfo}
        aria-expanded={open}
        aria-label={`${card.name}: full rules`}
        className="absolute right-2 top-2 rounded-full hover:bg-white/10"
      >
        <InfoMark open={open} className="size-8" />
      </button>
      {open && <PlaystyleRules card={card} className="border-t border-white/10 px-3.5 pb-3 pt-2.5" />}
    </div>
  );
}
