'use client';

/**
 * Dev lab: every playstyle as a showdown duet (both avatars play it out) next to today's solo reaction, to decide how
 * the reveal should work with two avatars. Pick a card, who plays it, duet or solo; replay or let it run through all.
 */

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import { CARDS, CARD_BY_ID, type CardId, type CardType } from '../zoneMatch.cards';
import { DUETS, duetLength, type DuetActor } from '../zoneMatch.duets';
import { DUET_MOVE_S } from '../zoneMatch.duetMoves';
import { CARD_REACTION_S } from '../zoneMatch.reveal';
import { CARD_TYPE_THEME, CardArt } from '../ZoneMatchCardFace';
import type { FutSeat } from '../ZoneMatchFutCard';
import { useElementWidth } from '../ZoneMatchCards';
import { DuetStage } from './DuetStage';

const SEATS: Record<DuelSide, FutSeat> = {
  player: { name: 'You', avatarCustomization: { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' } as AvatarCustomization, rankPoints: 640 },
  opponent: { name: 'Rival', avatarCustomization: { skin: 'skin_male_dark', jersey: 'jersey_red', hair: 'hair_wave' } as AvatarCustomization, rankPoints: 710 },
};
const TYPES: CardType[] = ['boost', 'defense', 'sabotage', 'tactical'];
const NEW_CARDS: CardId[] = ['nutmeg', 'bicycle-kick', 'high-press', 'time-wasting', 'super-sub', 'feint', 'poker-face'];
const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const actorLength = (a: DuetActor) => ('card' in a ? CARD_REACTION_S[a.card] : DUET_MOVE_S[a.move]);
const actorLabel = (a: DuetActor) => ('card' in a ? `${CARD_BY_ID[a.card].name} reaction` : a.move.replace('-', ' '));

export function DuetLab() {
  const [card, setCard] = useState<CardId>('golden-boot');
  const [owner, setOwner] = useState<DuelSide>('player');
  const [solo, setSolo] = useState(false);
  const [auto, setAuto] = useState(false);
  const [playKey, setPlayKey] = useState(1);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const cardWidth = Math.min(250, Math.floor((width - 8) / 2.22));
  const duet = DUETS[card];
  const length = solo ? CARD_REACTION_S[card] : duetLength(duet, actorLength);

  const play = (next: Partial<{ card: CardId; owner: DuelSide; solo: boolean }>) => {
    if (next.card) setCard(next.card);
    if (next.owner) setOwner(next.owner);
    if (next.solo !== undefined) setSolo(next.solo);
    setPlayKey((k) => k + 1);
  };

  // Run through every card, one after another.
  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => {
      const i = CARDS.findIndex((c) => c.id === card);
      setCard(CARDS[(i + 1) % CARDS.length].id);
      setPlayKey((k) => k + 1);
    }, (length + 1.2) * 1000);
    return () => window.clearTimeout(id);
  }, [auto, card, playKey, length]);

  return (
    <div className="min-h-dvh bg-surface-page px-4 pb-16 pt-6 font-poppins text-white">
      <div className="mx-auto max-w-[980px]">
        <header className="mb-4">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">Showdown · dev</div>
          <h1 className="text-2xl uppercase sm:text-3xl" style={poppins}>Playstyle duets</h1>
          <p className="mt-1 max-w-[640px] text-sm text-white/60">
            When a playstyle lands, both avatars play it out. Drafts for all {CARDS.length} cards — compare with today&rsquo;s solo reaction.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
          <section className="min-w-0 flex-1">
            <div ref={ref} className="flex justify-center overflow-hidden rounded-[24px] bg-black/30 px-1 pb-6 pt-16 ring-1 ring-white/10">
              <DuetStage card={card} owner={owner} seats={SEATS} width={cardWidth} playKey={playKey} solo={solo} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => play({})} className="flex items-center gap-1.5 rounded-[12px] bg-brand-green px-4 py-2 text-sm uppercase transition-colors hover:bg-brand-green-deep" style={poppins}>
                <RotateCcw className="size-4" /> Replay
              </button>
              <Toggle options={[['player', 'You play it'], ['opponent', 'They play it']]} value={owner} onChange={(v) => play({ owner: v })} />
              <Toggle options={[['duet', 'Duet (new)'], ['solo', 'Solo (today)']]} value={solo ? 'solo' : 'duet'} onChange={(v) => play({ solo: v === 'solo' })} />
              <button
                type="button"
                onClick={() => setAuto((a) => !a)}
                className={cn('flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-sm uppercase ring-1 transition-colors', auto ? 'bg-white text-surface-page ring-white' : 'ring-white/20 hover:bg-white/10')}
                style={poppins}
              >
                {auto ? <Pause className="size-4" /> : <Play className="size-4" />} All cards
              </button>
            </div>

            <div className="mt-4 rounded-[20px] bg-white/[0.05] p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0">
                  <CardArt id={card} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg uppercase" style={poppins}>{CARD_BY_ID[card].name}</span>
                    {NEW_CARDS.includes(card) && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-black uppercase text-surface-page">New</span>}
                  </div>
                  <div className="text-xs text-white/55">{CARD_BY_ID[card].effect}</div>
                </div>
              </div>
              <p className="mt-3 text-base text-white" style={poppins}>{solo ? 'Today: only the owner’s card reacts.' : duet.line}</p>
              {!solo && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-white/60">
                  <dt className="font-black uppercase text-white/40">{owner === 'player' ? 'You' : 'Rival'}</dt>
                  <dd>{actorLabel(duet.owner)} · at {duet.owner.at.toFixed(2)} s</dd>
                  <dt className="font-black uppercase text-white/40">{owner === 'player' ? 'Rival' : 'You'}</dt>
                  <dd>{actorLabel(duet.rival)} · at {duet.rival.at.toFixed(2)} s</dd>
                  {duet.props.length > 0 && (
                    <>
                      <dt className="font-black uppercase text-white/40">Props</dt>
                      <dd>{duet.props.map((p) => p.kind === 'icon' && p.card ? `${CARD_BY_ID[p.card].name} sticker` : p.kind).join(', ')}{duet.blackout ? ', blackout' : ''}</dd>
                    </>
                  )}
                  <dt className="font-black uppercase text-white/40">Length</dt>
                  <dd>{length.toFixed(1)} s</dd>
                </dl>
              )}
            </div>
          </section>

          <aside className="lg:w-[300px] lg:shrink-0">
            {TYPES.map((type) => {
              const theme = CARD_TYPE_THEME[type];
              return (
                <div key={type} className="mb-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide" style={{ color: theme.color }}>
                    <theme.Icon className="size-3.5" /> {theme.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
                    {CARDS.filter((c) => c.type === type).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => play({ card: c.id })}
                        className={cn('flex min-w-0 items-center gap-2 rounded-[12px] px-2 py-1.5 text-left ring-1 transition-colors', c.id === card ? 'bg-white/15 ring-white/60' : 'bg-white/[0.04] ring-white/10 hover:bg-white/10')}
                      >
                        <span className="size-8 shrink-0">
                          <CardArt id={c.id} />
                        </span>
                        <span className="min-w-0 truncate text-xs uppercase" style={poppins}>{c.name}</span>
                        {NEW_CARDS.includes(c.id) && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-yellow" aria-label="new" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Toggle<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[12px] bg-white/[0.06] p-1 ring-1 ring-white/10">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn('rounded-[9px] px-3 py-1.5 text-xs uppercase transition-colors', v === value ? 'bg-white text-surface-page' : 'text-white/70 hover:text-white')}
          style={poppins}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
