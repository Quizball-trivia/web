'use client';

/**
 * Zone match 3D duel view: the current duel as a 1v1 on a floodlit pitch (see ZoneMatch3DScene / zoneMatch3d.director),
 * with the playstyle cards playing out in it (zoneMatch3d.fx / ZoneMatch3DEffects). WebGL is lazy-loaded on the client
 * only; without WebGL (or if the scene fails) the `fallback` (the 2D ball strip) shows instead. Nameplates and the
 * speed-line / mud overlays are plain DOM driven from the scene.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import type { CardEvent, MatchState } from './zoneMatch.machine';
import { otherZoneSide, type ZoneSide } from './zoneMatch.rules';
import type { DirectorInput } from './zoneMatch3d.director';
import type { SceneInsets } from './ZoneMatch3DScene';
import { cardFx, type CardFx } from './zoneMatch3d.fx';
import type { Mark } from './zoneMatch.reason';
import { CutoutLayer, createCutoutRegistry } from './ZoneMatch3DCutouts';
import { useWebGL } from './zoneMatch3d.webgl';
import { SIDE_COLOR } from './zoneMatch3d.layout';

// Raw colours live in style objects: the brand-colour audit forbids hex Tailwind classes.
const MUD_BROWN = '#4a2e17';
const YOU_INK = '#1645FF';
const FRAME_BG = '#07111d';
const MARK_RIGHT = '#58CC02';
const BOOKED_YELLOW = '#FFD60A';
const MARK_WRONG = '#FF4B4B';

const ZoneMatch3DScene = dynamic(() => import('./ZoneMatch3DScene'), { ssr: false, loading: () => null });

export interface ZoneMatch3DSeat {
  name: string;
  avatarCustomization: AvatarCustomization | null;
}

const FALLBACK_AVATAR: AvatarCustomization = { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' };

/** What the director needs from the match: which duel, the step it is at, and the cards that shape the result. */
export function directorInput(
  state: Pick<MatchState, 'battleStep' | 'possession' | 'outcome' | 'outcomeFrom' | 'outcomeNote' | 'duelNo'>,
  fx: Pick<CardFx, 'results' | 'gloves' | 'goldenBoot'>,
): DirectorInput {
  if (state.battleStep === 'outcome' && state.outcome && state.outcomeFrom) {
    const attacker = state.outcomeFrom.attacker;
    return {
      mode: 'outcome',
      possession: state.possession,
      from: state.outcomeFrom,
      outcome: state.outcome,
      key: `outcome-${state.duelNo}-${state.outcome.kind}`,
      seed: state.duelNo,
      cards: {
        results: fx.results,
        note: state.outcomeNote,
        keeperGloves: fx.gloves[otherZoneSide(attacker)],
        goldenBoot: fx.goldenBoot === attacker,
      },
    };
  }
  const mode = state.battleStep === 'numeric' ? 'bullet' : state.battleStep === 'numericReveal' ? 'sky' : 'idle';
  return {
    mode,
    possession: state.possession,
    from: null,
    outcome: null,
    key: `${mode}-${state.duelNo}`,
    seed: state.duelNo,
    cards: { results: [], note: null, keeperGloves: false, goldenBoot: false },
  };
}

/** Muddy Pitch: mud slaps onto the "lens" as the card fires. */
const MUD = [
  { left: '14%', top: '22%', size: 74, r: '58% 42% 63% 37% / 45% 55% 45% 55%' },
  { left: '64%', top: '14%', size: 52, r: '41% 59% 38% 62% / 60% 35% 65% 40%' },
  { left: '72%', top: '58%', size: 88, r: '63% 37% 52% 48% / 38% 62% 38% 62%' },
  { left: '30%', top: '66%', size: 44, r: '50% 50% 35% 65% / 62% 40% 60% 38%' },
];
function MudSplat() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[5]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.5, times: [0, 0.08, 0.7, 1] }}
    >
      {MUD.map((blob) => (
        <motion.span
          key={blob.left}
          className="absolute block shadow-[inset_-6px_-8px_0_rgba(0,0,0,0.25)]"
          style={{ left: blob.left, top: blob.top, width: blob.size, height: blob.size * 0.8, borderRadius: blob.r, background: MUD_BROWN }}
          initial={{ scale: 0.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        />
      ))}
    </motion.div>
  );
}

/** ✓ / ✗ over a player at a result: who was right. */
function MarkBadge({ mark, delay }: { mark: Mark; delay: number }) {
  if (!mark) return null;
  const right = mark === 'right';
  return (
    <motion.span
      className="absolute -left-10 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white text-xl font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
      style={{ background: right ? MARK_RIGHT : MARK_WRONG }}
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: [0, 1.35, 1], rotate: 0 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
    >
      {right ? '✓' : '✗'}
    </motion.span>
  );
}

function Nameplate({ side, seat, plateRef, mark, markKey, booked }: { side: ZoneSide; seat: ZoneMatch3DSeat; plateRef: RefObject<HTMLDivElement | null>; mark: Mark; markKey: string; booked: boolean }) {
  const mine = side === 'player';
  return (
    <div
      ref={plateRef}
      className="pointer-events-none absolute left-0 top-0 z-10 flex items-center gap-1 rounded-full border-2 border-white/70 py-[2px] pl-[2px] pr-2 shadow-[0_3px_10px_rgba(0,0,0,0.45)] transition-opacity duration-200 will-change-transform"
      style={{ background: SIDE_COLOR[side], opacity: 0, transform: 'translate3d(-200px, -200px, 0)' }}
    >
      <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-black/25">
        <AvatarDisplay customization={seat.avatarCustomization ?? FALLBACK_AVATAR} size="xs" className="size-6" />
      </span>
      <span className="max-w-[92px] truncate text-[11px] uppercase leading-none text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
        {seat.name}
      </span>
      {mine && seat.name.toLowerCase() !== 'you' && (
        <span className="rounded-full bg-white px-1 text-[9px] font-black leading-[14px]" style={{ color: YOU_INK }}>YOU</span>
      )}
      {/* Yellow Card: booked — no cards for now. */}
      {booked && (
        <motion.span
          className="absolute -right-8 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-sm shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
          style={{ background: BOOKED_YELLOW }}
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          title="No cards"
        >
          🔒
        </motion.span>
      )}
      <MarkBadge key={markKey} mark={mark} delay={side === 'player' ? 0.05 : 0.2} />
    </div>
  );
}

export function ZoneMatch3D({
  state,
  player,
  opponent,
  insets,
  fallback,
  moment,
}: {
  state: MatchState;
  /** The card moment the 2D pop-up shows right now (CardMoments); the scene plays its effect alongside. */
  moment: CardEvent | null;
  player: ZoneMatch3DSeat;
  opponent: ZoneMatch3DSeat;
  /**
   * The view fills its box (the whole screen); these px at the top (HUD) and bottom (question sheet, hand) are covered
   * by overlays, so the camera frames the players in the open band between them.
   */
  insets: SceneInsets;
  /** Shown when WebGL is unavailable or the scene fails. */
  fallback: ReactNode;
}) {
  const webgl = useWebGL();
  const [failed, setFailed] = useState(false);
  const onFailure = useCallback(() => setFailed(true), []);
  const fx = useMemo(() => cardFx(state, moment), [state, moment]);
  const input = useMemo(() => directorInput(state, fx), [state, fx]);
  const inputRef = useRef<DirectorInput>(input);
  const fxRef = useRef<CardFx>(fx);
  useLayoutEffect(() => {
    inputRef.current = input;
    fxRef.current = fx;
  }, [input, fx]);
  const insetsRef = useRef<SceneInsets>(insets);
  useLayoutEffect(() => {
    insetsRef.current = insets;
  }, [insets]);
  const speedRef = useRef<HTMLDivElement>(null);
  const overlays = useMemo(() => ({ speed: speedRef }), []);

  // The players' cut-outs: DOM avatar art the scene positions every frame.
  const [cutouts] = useState(createCutoutRegistry);
  const customizations = useMemo(
    () => ({ player: player.avatarCustomization, opponent: opponent.avatarCustomization }),
    [player.avatarCustomization, opponent.avatarCustomization],
  );
  const playerPlate = useRef<HTMLDivElement>(null);
  const opponentPlate = useRef<HTMLDivElement>(null);
  const plates = useMemo(() => ({ player: playerPlate, opponent: opponentPlate }), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [webgl, failed]);

  if (webgl === false || failed) return <>{fallback}</>;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: FRAME_BG }}
      data-zm-3d
      // Decorative: the duel banner and the result card say the same in words.
      aria-hidden
    >
      {webgl && (
        <ZoneMatch3DScene input={inputRef} fx={fxRef} cutouts={cutouts} plates={plates} overlays={overlays} insets={insetsRef} visible={visibleRef} onFailure={onFailure} />
      )}
      {/* Speed lines for a sprint or a break; the scene sets their opacity. */}
      <div
        ref={speedRef}
        className="pointer-events-none absolute inset-0 z-[4] opacity-0"
        style={{
          background: 'repeating-conic-gradient(from 3deg at 50% 50%, transparent 0deg 5deg, rgba(255,255,255,0.5) 5deg 5.6deg, transparent 5.6deg 11deg)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 42%, black 80%)',
          maskImage: 'radial-gradient(ellipse at center, transparent 42%, black 80%)',
        }}
      />
      {fx.moment?.card === 'muddy-pitch' && <MudSplat key={fx.moment.id} />}
      {webgl && <CutoutLayer registry={cutouts} customizations={customizations} />}
      {/* The sky shot labels each ball itself: the nameplates step out of its sky. */}
      <div className="transition-opacity duration-300" style={{ opacity: state.battleStep === 'numericReveal' ? 0 : 1 }}>
        <Nameplate side="player" seat={player} plateRef={playerPlate} mark={fx.reason?.marks.player ?? null} markKey={`m-${state.duelNo}`} booked={fx.booked.includes('player')} />
        <Nameplate side="opponent" seat={opponent} plateRef={opponentPlate} mark={fx.reason?.marks.opponent ?? null} markKey={`m-${state.duelNo}`} booked={fx.booked.includes('opponent')} />
      </div>
      {/* A soft vignette; the reason line and the result title are the match screen's overlays. */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]" />
    </div>
  );
}
