'use client';

/**
 * Dev (/dev/zone-match/picker): playstyle-picker layouts to choose from, phone first. Every variant shares the same
 * loadout rules (5⚡ budget, up to 3, max 1 sabotage), the same compact tile and the same detail sheet:
 *   A · Icon grid (Clash Royale / Marvel Snap)       B · Rows by type, swipe sideways (Brawl Stars)
 *   C · Slot-first (EA FC Ultimate Team)            D · Big card carousel (FUT chemistry styles)
 *   E · Presets + grid                               F · Recommended: card + slots + presets + grid + sheet
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Repeat, Trash2, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import { CARDS, CARD_BY_ID, DECK_SIZE, LOADOUT_BUDGET, STARTER_DECKS, completeDeck, deckBlocker, legalDeck, deckCost, type CardDef, type CardId, type CardType } from '../zoneMatch.cards';
import { CARD_TYPE_THEME, PlaystyleBadge } from '../ZoneMatchCardFace';
import { PlaystyleRules, TYPE_INK } from '../ZoneMatchPlaystyleRow';
import { FutCard, reactionFor, type FutReaction, type FutSeat } from '../ZoneMatchFutCard';
import { useMediaQuery } from '../ZoneMatchCards';
import { isPlaystyleUnlocked } from '../zoneMatch.playtest';
import { deckBlockerText, zoneMatchCopy } from '../zoneMatch.copy';
import { useZoneCopy } from '../useZoneCopy';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;
const TYPES: CardType[] = ['boost', 'sabotage', 'defense', 'tactical'];
/** Only the dev lab's own seat (an unnamed seat in the match flow is the player's). */
const SEAT: FutSeat = { name: 'You', avatarCustomization: { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' } as AvatarCustomization, rankPoints: 250 };

/* ── shared loadout state ─────────────────────────────────────────────── */

/** The loadout and its edits; `external` makes it controlled (the match flow owns the deck). */
function useLoadout(external?: { deck: CardId[]; setDeck: (deck: CardId[]) => void }) {
  const [own, setOwn] = useState<CardId[]>([]);
  const deck = external ? external.deck : own;
  const setDeck = external ? external.setDeck : setOwn;
  const [reaction, setReaction] = useState<FutReaction | null>(null);
  const [shine, setShine] = useState(0);
  const react = (id: CardId, next: CardId[]) => {
    const key = Date.now();
    setReaction(reactionFor(CARD_BY_ID[id].type, key, key, id, next.length === DECK_SIZE));
    setShine(key);
  };
  return {
    deck,
    reaction,
    shine,
    slots: Array.from({ length: DECK_SIZE }, (_, i) => deck[i] ?? null),
    left: LOADOUT_BUDGET - deckCost(deck),
    blocker: (id: CardId) => deckBlocker(deck, id),
    add(id: CardId) {
      if (deck.includes(id) || deckBlocker(deck, id)) return;
      const next = [...deck, id];
      setDeck(next);
      react(id, next);
    },
    remove(id: CardId) {
      setDeck(deck.filter((c) => c !== id));
    },
    /** The picks `id` could replace (the loadout stays legal). */
    swapsFor(id: CardId) {
      return deck.filter((out) => deckBlocker(deck.filter((c) => c !== out), id) === null);
    },
    swap(out: CardId, id: CardId) {
      const next = deck.map((c) => (c === out ? id : c));
      setDeck(next);
      react(id, next);
    },
    /** A preset, or [] for Auto (a random legal loadout). */
    set(cards: CardId[]) {
      const next = cards.length ? legalDeck(cards) : completeDeck([]);
      setDeck(next);
      if (next.length) react(next[next.length - 1], next);
    },
    clear() {
      setDeck([]);
    },
  };
}
type Loadout = ReturnType<typeof useLoadout>;

/* ── shared pieces ────────────────────────────────────────────────────── */

/** A compact tile: badge with its cost, name, the effect in two words. Selected: yellow ring; can't join: dimmed. */
function Tile({ card, loadout, onOpen, size = 52, wide = false }: { card: CardDef; loadout: Loadout; onOpen: () => void; size?: number; wide?: boolean }) {
  const { c } = useZoneCopy();
  const text = c.cards[card.id];
  const selected = loadout.deck.includes(card.id);
  const blocked = !selected && loadout.blocker(card.id) !== null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-2xl p-1.5 pb-2 text-center transition',
        wide ? 'w-[88px] shrink-0' : 'w-full',
        selected ? 'bg-brand-yellow/15 ring-2 ring-brand-yellow' : 'bg-white/[0.05] ring-1 ring-white/10 hover:bg-white/[0.09]',
        blocked && 'opacity-45',
      )}
    >
      <PlaystyleBadge id={card.id} size={size} showName={false} selected={selected} unaffordable={blocked && card.energy > loadout.left} />
      <span className="line-clamp-2 min-h-[2.2em] w-full text-[10px] uppercase leading-tight text-white [overflow-wrap:anywhere]" style={poppins}>
        {text.name}
      </span>
      <span className="line-clamp-2 min-h-[2.1em] text-[8.5px] font-black uppercase leading-[1.05]" style={{ color: TYPE_INK[card.type] }}>
        {text.short}
      </span>
      {selected && <span className="absolute right-1 top-1 rounded-full bg-brand-yellow px-1 text-[9px] font-black text-surface-page">✓</span>}
    </button>
  );
}

/** Bottom sheet: the full rule, and Add / Remove / Swap (or why it can't join). */
function DetailSheet({ id, loadout, onClose }: { id: CardId | null; loadout: Loadout; onClose: () => void }) {
  const { c } = useZoneCopy();
  const card = id ? CARD_BY_ID[id] : null;
  return (
    <AnimatePresence>
      {card && (
        <>
          <motion.div className="fixed inset-0 z-[80] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-[480px] rounded-t-[28px] bg-[#0f1824] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] ring-1 ring-white/10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5" aria-label={c.common.close}>
              <X className="size-4" />
            </button>
            <SheetBody card={card} loadout={loadout} onDone={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SheetBody({ card, loadout, onDone }: { card: CardDef; loadout: Loadout; onDone: () => void }) {
  const { c } = useZoneCopy();
  const text = c.cards[card.id];
  const selected = loadout.deck.includes(card.id);
  const blocker = loadout.blocker(card.id);
  const swaps = !selected && blocker ? loadout.swapsFor(card.id) : [];
  const theme = CARD_TYPE_THEME[card.type];
  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="flex items-center gap-4">
        <PlaystyleBadge id={card.id} size={84} showName={false} selected={selected} />
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.color }}>
            {c.cardTypes[card.type]}
          </div>
          <div className="text-2xl uppercase leading-tight" style={poppins}>
            {text.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-sm font-black uppercase" style={{ color: TYPE_INK[card.type] }}>
            {text.short} · <Zap className="size-3.5 fill-brand-yellow text-brand-yellow" />
            <span className="text-brand-yellow">{card.energy}</span>
          </div>
        </div>
      </div>
      <PlaystyleRules card={card} className="rounded-2xl bg-white/[0.05] p-3 text-sm" />
      {selected ? (
        <button type="button" onClick={() => (loadout.remove(card.id), onDone())} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/10 uppercase hover:bg-white/15" style={poppins}>
          <Trash2 className="size-4" /> {c.loadout.removeFromLoadout}
        </button>
      ) : !blocker ? (
        <button type="button" onClick={() => (loadout.add(card.id), onDone())} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-brand-green uppercase hover:bg-brand-green-deep" style={poppins}>
          <Plus className="size-5" strokeWidth={3} /> {c.loadout.addToLoadout}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs text-white/60">{deckBlockerText(c, loadout.deck, card.id, blocker)}</div>
          {swaps.length > 0 && (
            <>
              <div className="text-[11px] font-black uppercase tracking-wide text-white/50">{c.loadout.swapFor}</div>
              <div className="grid grid-cols-3 gap-2">
                {swaps.map((out) => (
                  <button key={out} type="button" onClick={() => (loadout.swap(out, card.id), onDone())} className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.06] p-2 ring-1 ring-white/10 hover:bg-white/10">
                    <PlaystyleBadge id={out} size={40} showName={false} />
                    <span className="flex items-center gap-1 text-[10px] uppercase" style={poppins}>
                      <Repeat className="size-3" /> {c.cards[out].name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Budget({ loadout }: { loadout: Loadout }) {
  const spent = LOADOUT_BUDGET - loadout.left;
  return (
    <div className="flex w-fit items-center gap-1 rounded-full bg-white/10 px-2 py-1">
      <Zap className="size-3.5 fill-brand-yellow text-brand-yellow" />
      {Array.from({ length: LOADOUT_BUDGET }, (_, i) => (
        <span key={i} className={cn('h-2.5 w-1.5 rounded-sm', i < spent ? 'bg-brand-yellow' : 'bg-white/20')} />
      ))}
      <span className="ml-1 text-xs font-black">
        {spent}/{LOADOUT_BUDGET}
      </span>
    </div>
  );
}

/** The three slots as a row (tap a filled one to open it). */
function SlotRow({ loadout, onOpen, size = 46 }: { loadout: Loadout; onOpen: (id: CardId) => void; size?: number }) {
  return (
    <div className="flex gap-1.5">
      {loadout.slots.map((id, i) =>
        id ? (
          <button key={i} type="button" onClick={() => onOpen(id)}>
            <PlaystyleBadge id={id} size={size} showName={false} selected />
          </button>
        ) : (
          <span key={i} className="grid place-items-center rounded-xl border-2 border-dashed border-white/20 text-sm font-black text-white/30" style={{ width: size, height: size }}>
            {i + 1}
          </span>
        ),
      )}
    </div>
  );
}

function FindBar({ loadout, onFindMatch, loading = false }: { loadout: Loadout; onFindMatch?: () => void; loading?: boolean }) {
  const { c } = useZoneCopy();
  const ready = loadout.deck.length > 0;
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t border-white/10 bg-surface-page/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
      <div className="flex gap-2">
        <button type="button" onClick={() => loadout.set([])} className="rounded-[14px] bg-white/10 px-4 text-sm uppercase hover:bg-white/15" style={poppins}>
          {c.loadout.auto}
        </button>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={onFindMatch}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-brand-green uppercase text-white hover:bg-brand-green-deep disabled:bg-white/10 disabled:text-white/40"
          style={poppins}
        >
          {loading ? (
            c.common.loading
          ) : ready ? (
            <>
              {c.common.findMatch} <ArrowRight className="size-5" strokeWidth={3} />
            </>
          ) : (
            c.common.pickPlaystyle
          )}
        </button>
      </div>
    </div>
  );
}

function Filters({ value, onChange }: { value: CardType | 'all'; onChange: (v: CardType | 'all') => void }) {
  const { c } = useZoneCopy();
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
      {(['all', ...TYPES] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn('shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase', value === t ? 'bg-white text-surface-page' : 'bg-white/10 text-white/80')}
          style={t !== 'all' && value !== t ? { color: TYPE_INK[t] } : undefined}
        >
          {t === 'all' ? c.common.all : c.cardTypes[t]}
        </button>
      ))}
    </div>
  );
}

function Grid({ loadout, onOpen, filter = 'all', cols = 4 }: { loadout: Loadout; onOpen: (id: CardId) => void; filter?: CardType | 'all'; cols?: number }) {
  const cards = CARDS.filter((c) => isPlaystyleUnlocked(c.id) && (filter === 'all' || c.type === filter));
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {cards.map((card) => (
        <Tile key={card.id} card={card} loadout={loadout} onOpen={() => onOpen(card.id)} size={cols >= 5 ? 44 : 52} />
      ))}
    </div>
  );
}

function Presets({ loadout }: { loadout: Loadout }) {
  const { c } = useZoneCopy();
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {STARTER_DECKS.map((p) => (
        <button key={p.id} type="button" onClick={() => loadout.set(p.cards)} className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/[0.06] px-3 py-2 text-left ring-1 ring-white/10 hover:bg-white/10">
          <div className="flex -space-x-2">
            {p.cards.slice(0, 3).map((id) => (
              <PlaystyleBadge key={id} id={id} size={26} showName={false} showCost={false} />
            ))}
          </div>
          <div>
            <div className="text-[11px] uppercase leading-tight" style={poppins}>
              {c.starterDecks[p.id].name}
            </div>
            <div className="text-[9.5px] text-white/50">{c.starterDecks[p.id].tagline}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Title({ children, loadout }: { children: ReactNode; loadout: Loadout }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-lg uppercase leading-tight" style={poppins}>
        {children}
      </h1>
      <Budget loadout={loadout} />
    </div>
  );
}

/* ── A · icon grid ────────────────────────────────────────────────────── */

function VariantGrid() {
  const loadout = useLoadout();
  const [open, setOpen] = useState<CardId | null>(null);
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  return (
    <>
      <Title loadout={loadout}>Pick your playstyles</Title>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-2">
        <span className="text-[11px] font-black uppercase text-white/50">Your loadout</span>
        <SlotRow loadout={loadout} onOpen={setOpen} size={40} />
      </div>
      <Filters value={filter} onChange={setFilter} />
      <Grid loadout={loadout} onOpen={setOpen} filter={filter} />
      <FindBar loadout={loadout} />
      <DetailSheet id={open} loadout={loadout} onClose={() => setOpen(null)} />
    </>
  );
}

/* ── B · rows by type ─────────────────────────────────────────────────── */

function VariantRows() {
  const loadout = useLoadout();
  const [open, setOpen] = useState<CardId | null>(null);
  return (
    <>
      <Title loadout={loadout}>Pick your playstyles</Title>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-2">
        <span className="text-[11px] font-black uppercase text-white/50">Your loadout</span>
        <SlotRow loadout={loadout} onOpen={setOpen} size={40} />
      </div>
      {TYPES.map((type) => (
        <section key={type} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm uppercase" style={{ ...poppins, color: CARD_TYPE_THEME[type].color }}>
              {zoneMatchCopy('en').cardTypes[type]}
            </span>
            <span className="text-[10px] uppercase text-white/40">swipe →</span>
          </div>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {CARDS.filter((c) => isPlaystyleUnlocked(c.id) && c.type === type).map((card) => (
              <div key={card.id} className="snap-start">
                <Tile card={card} loadout={loadout} onOpen={() => setOpen(card.id)} wide size={50} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <FindBar loadout={loadout} />
      <DetailSheet id={open} loadout={loadout} onClose={() => setOpen(null)} />
    </>
  );
}

/* ── C · slot-first ───────────────────────────────────────────────────── */

function VariantSlots() {
  const loadout = useLoadout();
  const [picking, setPicking] = useState<number | null>(null);
  // Picking for an empty slot: only what fits now. For a filled slot: what can replace it.
  const replacing = picking !== null ? loadout.deck[picking] ?? null : null;
  const fits = (card: CardDef) =>
    !loadout.deck.includes(card.id) && (replacing ? deckBlocker(loadout.deck.filter((c) => c !== replacing), card.id) === null : loadout.blocker(card.id) === null);
  return (
    <>
      <Title loadout={loadout}>Your loadout</Title>
      <div className="flex justify-center">
        <FutCard seat={SEAT} width={190} slots={loadout.slots} reaction={loadout.reaction} shineKey={loadout.shine} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {loadout.slots.map((id, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPicking(i)}
            className={cn('flex flex-col items-center gap-1 rounded-2xl p-2.5', id ? 'bg-brand-yellow/10 ring-2 ring-brand-yellow/70' : 'border-2 border-dashed border-white/25')}
          >
            {id ? <PlaystyleBadge id={id} size={52} showName={false} selected /> : <Plus className="my-3 size-7 text-white/50" />}
            <span className="text-[10px] uppercase" style={poppins}>
              {id ? CARD_BY_ID[id].name : `Slot ${i + 1}`}
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-white/50">Tap a slot to fill it — only playstyles that fit are offered</p>
      <FindBar loadout={loadout} />
      <AnimatePresence>
        {picking !== null && (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPicking(null)} />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[78dvh] max-w-[480px] flex-col rounded-t-[28px] bg-[#0f1824] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] ring-1 ring-white/10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="uppercase" style={poppins}>
                  {replacing ? `Replace ${CARD_BY_ID[replacing].name}` : `Slot ${picking + 1}`}
                </span>
                <div className="flex gap-2">
                  {replacing && (
                    <button type="button" onClick={() => (loadout.remove(replacing), setPicking(null))} className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase">
                      Empty slot
                    </button>
                  )}
                  <button type="button" onClick={() => setPicking(null)} className="rounded-full bg-white/10 p-1.5" aria-label="Close">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto">
                {CARDS.filter((c) => isPlaystyleUnlocked(c.id) && fits(c)).map((card) => (
                  <Tile
                    key={card.id}
                    card={card}
                    loadout={loadout}
                    onOpen={() => {
                      if (replacing) loadout.swap(replacing, card.id);
                      else loadout.add(card.id);
                      setPicking(null);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── D · big card carousel ────────────────────────────────────────────── */

function VariantCarousel() {
  const loadout = useLoadout();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const card = CARDS[index];
  const go = (d: number) => {
    setDir(d);
    setIndex((i) => (i + d + CARDS.length) % CARDS.length);
  };
  const touch = useRef<number | null>(null);
  return (
    <>
      <Title loadout={loadout}>Pick your playstyles</Title>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-2">
        <span className="text-[11px] font-black uppercase text-white/50">Your loadout</span>
        <SlotRow loadout={loadout} onOpen={(id) => setIndex(CARDS.findIndex((c) => c.id === id))} size={40} />
      </div>
      <div
        className="relative flex items-center gap-2"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <button type="button" onClick={() => go(-1)} className="rounded-full bg-white/10 p-2" aria-label="Previous">
          <ChevronLeft className="size-5" />
        </button>
        <div className="relative min-h-[420px] flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.div
              key={card.id}
              custom={dir}
              initial={{ x: dir * 220, opacity: 0, rotate: dir * 6 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: -dir * 220, opacity: 0, rotate: -dir * 6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 rounded-[26px] p-4 ring-1 ring-white/10"
              style={{ background: `linear-gradient(170deg, ${CARD_TYPE_THEME[card.type].color}44, #0f1824 55%)` }}
            >
              <SheetBody card={card} loadout={loadout} onDone={() => undefined} />
            </motion.div>
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => go(1)} className="rounded-full bg-white/10 p-2" aria-label="Next">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="flex justify-center gap-1">
        {CARDS.map((c, i) => (
          <button key={c.id} type="button" onClick={() => setIndex(i)} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-white' : loadout.deck.includes(c.id) ? 'w-1.5 bg-brand-yellow' : 'w-1.5 bg-white/25')} aria-label={c.name} />
        ))}
      </div>
      <FindBar loadout={loadout} />
    </>
  );
}

/* ── E · presets + grid ───────────────────────────────────────────────── */

function VariantPresets() {
  const loadout = useLoadout();
  const [open, setOpen] = useState<CardId | null>(null);
  return (
    <>
      <Title loadout={loadout}>Pick your playstyles</Title>
      <div className="text-[11px] font-black uppercase tracking-wide text-white/50">Quick loadouts</div>
      <Presets loadout={loadout} />
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-2">
        <span className="text-[11px] font-black uppercase text-white/50">Your loadout</span>
        <SlotRow loadout={loadout} onOpen={setOpen} size={40} />
      </div>
      <div className="text-[11px] font-black uppercase tracking-wide text-white/50">Or build your own</div>
      <Grid loadout={loadout} onOpen={setOpen} cols={5} />
      <FindBar loadout={loadout} />
      <DetailSheet id={open} loadout={loadout} onClose={() => setOpen(null)} />
    </>
  );
}

/* ── F · recommended combo ────────────────────────────────────────────── */

function VariantCombo() {
  return <PlaystylePicker />;
}

/**
 * The playstyle picker (variant F, chosen 2026-11-02): your FUT card (reacting to each pick) beside the title, budget
 * and three slots; one-tap quick loadouts; type filters; every playstyle as a compact tile in a grid; tap one for its
 * rule and Add / Remove / Swap. Phones get it in one column; wider screens a bigger card and more columns.
 * Uncontrolled in the lab; the match flow passes `deck` / `onDeckChange`.
 */
export function PlaystylePicker({
  seat = SEAT,
  deck,
  onDeckChange,
  onFindMatch,
  loading,
  steps,
  rules,
}: {
  seat?: FutSeat;
  deck?: CardId[];
  onDeckChange?: (deck: CardId[]) => void;
  onFindMatch?: () => void;
  loading?: boolean;
  /** Shown above (the step indicator). */
  steps?: ReactNode;
  /** Shown under the presets (rule chips / how it works). */
  rules?: ReactNode;
}) {
  const { c } = useZoneCopy();
  const loadout = useLoadout(deck && onDeckChange ? { deck, setDeck: onDeckChange } : undefined);
  const [open, setOpen] = useState<CardId | null>(null);
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const wide = useMediaQuery('(min-width: 860px)');
  return (
    <>
      {steps}
      <div className="flex items-start gap-3 sm:gap-5">
        <FutCard seat={seat} width={wide ? 200 : 118} slots={loadout.slots} reaction={loadout.reaction} shineKey={loadout.shine} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <h1 className={cn('uppercase leading-tight', wide ? 'text-3xl' : 'text-lg')} style={poppins}>
            {c.common.pickYourPlaystyles}
          </h1>
          <Budget loadout={loadout} />
          <SlotRow loadout={loadout} onOpen={setOpen} size={wide ? 58 : 42} />
          {loadout.deck.length > 0 && (
            <button type="button" onClick={loadout.clear} className="self-start text-[11px] uppercase text-white/50 underline">
              {c.loadout.clear}
            </button>
          )}
        </div>
      </div>
      <Presets loadout={loadout} />
      {rules}
      <Filters value={filter} onChange={setFilter} />
      <Grid loadout={loadout} onOpen={setOpen} filter={filter} cols={wide ? 6 : 4} />
      <FindBar loadout={loadout} onFindMatch={onFindMatch} loading={loading} />
      <DetailSheet id={open} loadout={loadout} onClose={() => setOpen(null)} />
    </>
  );
}

/* ── the lab ──────────────────────────────────────────────────────────── */

const VARIANTS = [
  { id: 'F', label: 'F · Recommended', about: 'Card + slots + quick loadouts + icon grid; tap for the rule', View: VariantCombo },
  { id: 'A', label: 'A · Icon grid', about: 'All 20 at a glance, 4 per row (Clash Royale / Marvel Snap)', View: VariantGrid },
  { id: 'B', label: 'B · Rows by type', about: 'Four rows, swipe sideways (Brawl Stars)', View: VariantRows },
  { id: 'C', label: 'C · Slot-first', about: 'Tap a slot, pick from what fits (EA FC Ultimate Team)', View: VariantSlots },
  { id: 'D', label: 'D · Big carousel', about: 'One big card at a time, swipe (FUT chemistry styles)', View: VariantCarousel },
  { id: 'E', label: 'E · Presets + grid', about: 'One-tap loadouts first, or build your own', View: VariantPresets },
] as const;

export function PickerLab() {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]['id']>('F');
  const active = useMemo(() => VARIANTS.find((v) => v.id === variant)!, [variant]);
  return (
    <div className="min-h-dvh bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover text-white">
      <div className="sticky top-0 z-[90] bg-black/80 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-[480px] gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariant(v.id)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase', variant === v.id ? 'bg-brand-yellow text-surface-page' : 'bg-white/10')}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-1 max-w-[480px] text-[10px] text-white/50">{active.about}</div>
      </div>
      <div key={variant} className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[480px] flex-col gap-3 px-4 pt-3">
        <active.View />
      </div>
    </div>
  );
}
