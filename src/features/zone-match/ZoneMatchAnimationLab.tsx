'use client';

/**
 * Dev animation lab (/dev/zone-match/lab): play any one of the zone match's animations on its own — outcomes, shots
 * and celebrations, every card's effect, the duel stances and the tiebreak, the body moves — on the real 3D view, with
 * replay, pause, a scrubbable timeline and slow motion. The catalog is zoneMatch.lab.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, RotateCcw, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from './AvatarFullBody';
import { BallArt, REACTION_BALL_R, type ReactionFrame } from './ZoneMatchFutReactions';
import { BALL_STYLES, setBallStyle, useBallStyle } from './zoneMatch3d.balls';
import { FULL_GROUND, FULL_H, FULL_W, footOf, runStep } from './zoneMatch.fullBody';
import { CardFace } from './ZoneMatchCardFace';
import { ZoneMatch3DView, type ZoneMatch3DSeat } from './ZoneMatch3D';
import { SkyShot } from './ZoneMatchSkyShot';
import { CardsInPlay, McqPanel, NumericPanel, STEP_CARD_BG, numericLightsOut } from './ZoneMatchStage';
import { FLOODLIGHT_MS, type CardId } from './zoneMatch.cards';
import { DEMO_NUMBER, LAB_ENTRIES, LAB_GROUPS, emptyFx, type LabEntry, type LabGroup, type LabScene } from './zoneMatch.lab';
import { otherZoneSide, type ZoneSide } from './zoneMatch.rules';
import type { SceneClock } from './zoneMatch3d.clock';
import type { DirectorInput } from './zoneMatch3d.director';
import type { CardFx } from './zoneMatch3d.fx';

const PLAYER: ZoneMatch3DSeat = { name: 'You', avatarCustomization: { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' } };
const OPPONENT: ZoneMatch3DSeat = { name: 'Rival', avatarCustomization: { skin: 'skin_male_dark', jersey: 'jersey_red', hair: 'hair_wave' } };
const SPEEDS = [0.1, 0.25, 0.5, 1, 2];
const INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const SKY_QUESTION = DEMO_NUMBER;

/** Virtual time the lab can slow, pause and scrub; the 3D view reads it instead of the real clock. */
class LabClock implements SceneClock {
  private real = performance.now() / 1000;
  private virtual = 100;
  speed = 1;
  paused = false;
  now() {
    const real = performance.now() / 1000;
    if (!this.paused) this.virtual += (real - this.real) * this.speed;
    this.real = real;
    return this.virtual;
  }
  rate() {
    return this.paused ? 0 : this.speed;
  }
  seek(t: number) {
    this.now();
    this.virtual = t;
  }
  set(speed: number, paused: boolean) {
    this.now();
    this.speed = speed;
    this.paused = paused;
  }
}

function idleInput(scene: LabScene, key: string, cut: boolean): DirectorInput {
  return { mode: scene.mode === 'outcome' ? 'idle' : scene.mode, possession: scene.from, from: null, outcome: null, key, seed: scene.seed, cards: scene.cards, cut };
}

function runInput(scene: LabScene, key: string): DirectorInput {
  if (scene.mode !== 'outcome' || !scene.outcome) return { ...idleInput(scene, key, false), possession: scene.moveTo ?? scene.from };
  return { mode: 'outcome', possession: scene.outcome.next, from: scene.from, outcome: scene.outcome, key, seed: scene.seed, cards: scene.cards };
}

function runFx(scene: LabScene, duelNo: number, momentId: number): CardFx {
  const fx: CardFx = { ...emptyFx(duelNo), ...scene.fx, results: scene.cards.results };
  if (scene.moment) {
    const { side, card } = scene.moment;
    fx.moment = { id: momentId, duelNo, side, card, effect: '', phase: 'reveal' };
    // Floodlight Failure runs on the wall clock (as in the match).
    if (card === 'floodlight-failure') fx.dark = { victim: otherZoneSide(side), from: Date.now(), until: Date.now() + FLOODLIGHT_MS };
  }
  return fx;
}

function skyResult(winner: ZoneSide) {
  const answer = SKY_QUESTION.value;
  const loser = otherZoneSide(winner);
  const guesses = { [winner]: answer - 8, [loser]: answer + 31 } as Record<ZoneSide, number>;
  return { answer, guesses, diffs: { player: Math.abs(guesses.player - answer), opponent: Math.abs(guesses.opponent - answer) }, winner, reason: 'closer' as const };
}

const BALL_D = 85;

/** A football in the art's units (drawn at the feet, rolled by `ballRef`'s transform). */
function Ball({ ballRef }: { ballRef: React.RefObject<SVGGElement | null> }) {
  return (
    <svg viewBox="-50 -50 100 100" className="size-full overflow-visible" aria-hidden>
      <ellipse cx={0} cy={48} rx={40} ry={6} fill="rgba(0,0,0,0.35)" />
      <g ref={ballRef}>
        <circle r={47} fill="#f6f7f9" stroke="#1b1d22" strokeWidth={3} />
        <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#1b1d22" />
        {[0, 72, 144, 216, 288].map((a) => (
          <polygon key={a} points="-9,-46 9,-46 13,-34 0,-27 -13,-34" fill="#1b1d22" transform={`rotate(${a})`} />
        ))}
      </g>
    </svg>
  );
}

/** A wobbly band (x0 → x1 around height y, `w` thick): ragged like torn turf (deterministic). */
function raggedBand(x0: number, x1: number, y: number, w: number, seed: number): string {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 14));
  const at = (i: number, side: number) => {
    const x = x0 + ((x1 - x0) * i) / n;
    const wob = 0.35 * Math.sin(i * 2.3 + seed + side) + 0.2 * Math.sin(i * 5.1 + seed * 2 + side);
    return `${x.toFixed(1)},${(y + side * (w / 2) * (1 + wob)).toFixed(1)}`;
  };
  const top = Array.from({ length: n + 1 }, (_, i) => at(i, -1));
  const bottom = Array.from({ length: n + 1 }, (_, i) => at(n - i, 1));
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}

/** The knee slide's marks as SVG (art units): flattened grass, torn earth, a divot, a heap, blades, crumbs, dust. */
function grassMarks(g: NonNullable<ReactionFrame['grass']>): string {
  const o = g.skidOpacity;
  const parts: string[] = [];
  g.skids.forEach((k, i) => {
    if (Math.abs(k.x1 - k.x0) < 2) return;
    const lo = Math.min(k.x0, k.x1);
    const hi = Math.max(k.x0, k.x1);
    parts.push(`<path d="${raggedBand(lo, hi, k.y + 8, 30, i * 3)}" fill="#1F6B2D" opacity="${(0.8 * o).toFixed(2)}"/>`);
    parts.push(`<path d="${raggedBand(lo + 6, hi, k.y + 9, 13, i * 3 + 1)}" fill="#5B3A1D" opacity="${(0.9 * o).toFixed(2)}"/>`);
    parts.push(`<path d="${raggedBand(lo + 10, hi - 4, k.y + 7, 4, i * 3 + 2)}" fill="#7A5230" opacity="${(0.8 * o).toFixed(2)}"/>`);
    // The divot where the knee landed.
    parts.push(`<ellipse cx="${(k.x0 + 6).toFixed(1)}" cy="${(k.y + 9).toFixed(1)}" rx="16" ry="9" fill="#3E2611" opacity="${(0.9 * o).toFixed(2)}"/>`);
    // Turf heaped up in front of where the knee stopped.
    if (g.heap > 0.01) {
      parts.push(`<path d="M${(hi - 4).toFixed(1)} ${(k.y + 6).toFixed(1)} q 10 -${(12 * g.heap).toFixed(1)} 22 -2 q 6 4 10 6 Z" fill="#2E7D35" opacity="${(o * g.heap).toFixed(2)}"/>`);
      parts.push(`<circle cx="${(hi + 8).toFixed(1)}" cy="${(k.y + 4).toFixed(1)}" r="${(4 * g.heap).toFixed(1)}" fill="#5B3A1D" opacity="${(o * g.heap).toFixed(2)}"/>`);
    }
  });
  for (const p of g.puffs) parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}" fill="#D9CBB0" opacity="${p.opacity.toFixed(2)}"/>`);
  for (const c of g.turf) {
    parts.push(
      c.kind === 'blade'
        ? `<rect x="${(c.x - 2).toFixed(1)}" y="${(c.y - c.size / 2).toFixed(1)}" width="4" height="${c.size}" rx="2" fill="#3FA34D" opacity="${c.opacity.toFixed(2)}" transform="rotate(${c.rot.toFixed(0)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})"/>`
        : `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${(c.size / 2).toFixed(1)}" fill="#5B3A1D" opacity="${c.opacity.toFixed(2)}"/>`,
    );
  }
  return parts.join('');
}

function BodyStage({ entry, clock, start, customization, left }: { entry: LabEntry; clock: LabClock; start: number; customization: AvatarCustomization | null; left: boolean }) {
  const [els, setEls] = useState<FullBodyEls | null>(null);
  const ballBox = useRef<HTMLDivElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const grassRef = useRef<SVGGElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const moveBall = useRef<HTMLDivElement>(null);
  const moveBallSpin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!els || !entry.body) return;
    const { pose, loop, dribble, frame, caption } = entry.body;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (clock.now() - start) % loop;
      const f = frame?.(t);
      const body = f ? f.body : pose(t);
      applyFullBodyPose(els, body);
      if (figRef.current) {
        // A whole move (a save): the figure tilts, lifts and travels as on the player card. (The card's shift is a
        // share of a box 1.32× the figure's width.)
        figRef.current.style.transform = f
          ? `translate(${(f.shift * 1.32).toFixed(1)}%, ${(-f.lift).toFixed(1)}%) rotate(${f.tilt.toFixed(1)}deg) rotateY(${f.spin.toFixed(0)}deg) scale(${(f.scale ?? 1).toFixed(3)})`
          : '';
      }
      if (captionRef.current) {
        const c = caption?.(t);
        captionRef.current.style.opacity = c ? c.opacity.toFixed(2) : '0';
        if (c) {
          captionRef.current.textContent = c.text;
          // (Facing left the whole figure is mirrored: the words are mirrored back.)
          captionRef.current.style.transform = `${left ? 'scaleX(-1) ' : ''}translateX(-50%) scale(${c.scale.toFixed(2)})`;
        }
      }
      // Marks the move leaves on the grass (knee slide): torn grooves, a divot, churned turf, flying bits, dust.
      if (grassRef.current) {
        const g = f?.grass;
        grassRef.current.innerHTML = g ? grassMarks(g) : '';
      }
      if (moveBall.current && moveBallSpin.current) {
        const b = f?.ball;
        moveBall.current.style.display = b ? '' : 'none';
        if (b) {
          moveBall.current.style.left = `${(((b.x - REACTION_BALL_R) / FULL_W) * 100).toFixed(2)}%`;
          moveBall.current.style.top = `${(((b.y - REACTION_BALL_R) / FULL_H) * 100).toFixed(2)}%`;
          moveBall.current.style.opacity = b.opacity.toFixed(2);
          moveBallSpin.current.style.transform = `rotate(${b.rot.toFixed(0)}deg)`;
        }
      }
      if (dribble && ballBox.current && ballRef.current) {
        // One touch a stride, when the front boot is furthest forward: the ball rolls on ahead, the player catches up.
        const u = t * dribble.cycles;
        const samples = Array.from({ length: 24 }, (_, i) => i / 24);
        const toes = samples.map((v) => footOf(pose(v / dribble.cycles), 'R').x);
        const touchAt = samples[toes.indexOf(Math.max(...toes))];
        const front = Math.max(...toes) + 75;
        const since = (((u - touchAt) % 1) + 1) % 1;
        const x = front + 110 * Math.sin(Math.PI * since);
        const travel = 2 * runStep(dribble.speed) * u + x;
        ballBox.current.style.left = `${(((x - BALL_D / 2) / FULL_W) * 100).toFixed(2)}%`;
        ballRef.current.setAttribute('transform', `rotate(${((travel / (BALL_D / 2)) * (180 / Math.PI)) % 360})`);
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [els, entry, clock, start, left]);
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,#1d6b3a_0%,#0b2a17_70%)]">
      {/* Facing left: the whole figure (and its ball) mirrors, as the cut-out does on the pitch. */}
      <div className="relative" style={{ height: '70%', marginTop: '-6%', aspectRatio: `${FULL_W} / ${FULL_H}`, transform: left ? 'scaleX(-1)' : undefined }}>
        {/* The grass he stands on (marks show on it): mowing stripes, a ragged edge of blades. */}
        <div
          className="pointer-events-none absolute inset-x-[-120%] bottom-[-14%]"
          style={{
            top: `${(FULL_GROUND * 100).toFixed(1)}%`,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%), repeating-linear-gradient(90deg, #2F8F3F 0 90px, #28803A 90px 180px)',
          }}
        >
          <svg className="absolute inset-x-0 top-[-7px] h-[9px] w-full" preserveAspectRatio="none" viewBox="0 0 120 9" aria-hidden>
            <defs>
              <pattern id="lab-blades" width="6" height="9" patternUnits="userSpaceOnUse">
                <path d="M0 9 L1.5 2 L3 9 Z M3 9 L4.6 0 L6 9 Z" fill="#37A148" />
                <path d="M1.5 9 L2.8 4 L4 9 Z" fill="#2A8A3B" />
              </pattern>
            </defs>
            <rect width="120" height="9" fill="url(#lab-blades)" />
          </svg>
        </div>
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${FULL_W} ${FULL_H}`} aria-hidden>
          <g ref={grassRef} />
        </svg>
        <div
          ref={captionRef}
          className="pointer-events-none absolute left-1/2 top-[-13%] z-10 whitespace-nowrap font-black text-brand-yellow"
          style={{ opacity: 0, fontSize: 'clamp(28px, 7vh, 64px)', textShadow: '0 3px 0 #14213D, 0 0 18px rgba(0,0,0,0.5)', transform: left ? 'scaleX(-1) translateX(-50%)' : 'translateX(-50%)' }}
        />
        <div ref={figRef} className="relative size-full" style={{ transformOrigin: `50% ${(FULL_GROUND * 100).toFixed(1)}%` }}>
          <AvatarFullBody customization={customization} seed={0} onEls={setEls} style={{ height: '100%' }} gloves={entry.body?.gloves} movingArms={entry.body?.arms} />
          <div ref={moveBall} className="absolute" style={{ display: 'none', width: `${((2 * REACTION_BALL_R) / FULL_W) * 100}%`, aspectRatio: '1' }}>
            <div ref={moveBallSpin} className="size-full">
              <BallArt />
            </div>
          </div>
        </div>
        {entry.body?.dribble && (
          <div
            ref={ballBox}
            className="absolute"
            style={{ width: `${(BALL_D / FULL_W) * 100}%`, top: `${((FULL_GROUND * FULL_H - BALL_D) / FULL_H) * 100}%` }}
          >
            <Ball ballRef={ballRef} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The question sheet as the match shows it (McqPanel / NumericPanel and the cards-in-play chips), from the entry's
 * scripted state. Its clock is the lab's, offset to the wall clock at the run's start, so pause and slow motion hold the
 * card timings (the panels' own enter / exit animations still run in real time).
 */
function QuestionSheet({ question, clock, startAt, wall }: { question: NonNullable<LabEntry['question']>; clock: LabClock; startAt: number; wall: number }) {
  const [now, setNow] = useState(wall);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      setNow(wall + (clock.now() - startAt) * 1000);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [clock, startAt, wall]);
  const state = question.state(Math.max(0, now - wall), wall);
  const noop = useCallback(() => {}, []);
  return (
    <div className="pointer-events-auto mx-auto w-full max-w-[600px] rounded-[26px] border border-white/10 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md" style={{ background: STEP_CARD_BG }}>
      <div className="flex flex-col gap-2">
        <CardsInPlay state={state} now={now} opponentName={OPPONENT.name} />
        {state.mcq && (
          <McqPanel state={state} mcq={state.mcq} now={now} revealed={state.battleStep === 'mcqReveal'} timeLeft={state.battleStep === 'mcq' ? Math.max(0, Math.ceil((state.mcq.deadline - now) / 1000)) : null} onAnswer={noop} />
        )}
        {state.numeric && <NumericPanel numeric={state.numeric} dark={numericLightsOut(state, now)} opponentName={OPPONENT.name} onGuess={noop} />}
      </div>
    </div>
  );
}

export function ZoneMatchAnimationLab() {
  const [clock] = useState(() => new LabClock());
  const [entryId, setEntryId] = useState(LAB_ENTRIES[0].id);
  const [group, setGroup] = useState<LabGroup>(LAB_ENTRIES[0].group);
  const [attacker, setAttacker] = useState<ZoneSide>('player');
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [loop, setLoop] = useState(true);
  const [run, setRun] = useState(0);
  const ballStyle = useBallStyle();
  /** The run that is playing and when it started (lab clock); until then the run's first frame snaps to the spots. */
  const [started, setStarted] = useState<{ run: number; at: number; wall: number } | null>(null);
  const [popupDone, setPopupDone] = useState(-1);
  const timeRef = useRef<HTMLInputElement>(null);
  const timeLabel = useRef<HTMLSpanElement>(null);
  // The question sheet covers the bottom of the view: the camera frames the players above it, as in the match.
  const [sheetH, setSheetH] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const sheetRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) {
      setSheetH(0);
      return;
    }
    observer.current = new ResizeObserver(([entry]) => setSheetH(entry.contentRect.height));
    observer.current.observe(el);
  }, []);

  const entry = LAB_ENTRIES.find((e) => e.id === entryId) ?? LAB_ENTRIES[0];
  const scene = useMemo(() => entry.scene?.(attacker) ?? null, [entry, attacker]);
  const length = entry.question?.length ?? scene?.length ?? entry.body?.loop ?? 3;

  const replay = useCallback(() => setRun((n) => n + 1), []);

  const phase = started?.run === run ? 'run' : 'cut';
  const start = started?.at ?? 0;
  const popup: { id: number; card: CardId; side: ZoneSide } | null = phase === 'run' && scene?.moment && popupDone !== run ? { id: run, ...scene.moment } : null;

  // Each run: one frame snapping everyone to the duel spots, then the animation from its first frame.
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setStarted({ run, at: clock.now(), wall: Date.now() }));
    });
    return () => cancelAnimationFrame(raf);
  }, [run, scene, clock]);

  const popupRun = popup?.id ?? null;
  useEffect(() => {
    if (popupRun === null) return;
    const id = window.setTimeout(() => setPopupDone(popupRun), 1600 / Math.max(0.25, speed));
    return () => window.clearTimeout(id);
  }, [popupRun, speed]);

  useEffect(() => {
    clock.set(speed, paused);
  }, [clock, speed, paused]);

  // Timeline readout, and the loop back to the start.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (phase !== 'run') return;
      const t = clock.now() - start;
      if (timeRef.current && document.activeElement !== timeRef.current) timeRef.current.value = String(Math.min(t, length));
      if (timeLabel.current) timeLabel.current.textContent = `${Math.min(t, length).toFixed(2)} / ${length.toFixed(2)} s`;
      if (t > length + 0.4 && loop && !clock.paused && !entry.body) replay();
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [clock, start, length, loop, phase, entry.body, replay]);

  const insets = useMemo(() => (entry.question && sheetH > 0 ? { ...INSETS, bottom: sheetH + 12 } : INSETS), [entry.question, sheetH]);
  const duelNo = run + 1;
  const input = useMemo(
    () => (scene ? (phase === 'cut' ? idleInput(scene, `cut-${run}`, true) : runInput(scene, `run-${run}`)) : null),
    [scene, phase, run],
  );
  const fx = useMemo(() => (scene ? (phase === 'cut' ? emptyFx(duelNo) : runFx(scene, duelNo, run + 1)) : emptyFx(duelNo)), [scene, phase, duelNo, run]);

  const select = (id: string) => {
    setEntryId(id);
    replay();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'r') replay();
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && clock.paused) {
        clock.seek(clock.now() + (e.key === 'ArrowRight' ? 1 : -1) / 30);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clock, replay]);

  const visible = LAB_ENTRIES.filter((e) => e.group === group);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-page font-poppins text-white md:flex-row">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-white/10 md:order-1 md:w-[320px] md:flex-none md:border-r">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          {LAB_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase', group === g.id ? 'bg-white text-black' : 'bg-white/10 text-white/70')}
            >
              {g.label}
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => select(e.id)}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm', e.id === entryId ? 'bg-white/15 font-bold' : 'hover:bg-white/5')}
              >
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="order-1 flex h-[62dvh] flex-none flex-col md:order-2 md:h-auto md:flex-1">
        <div className="relative min-h-0 flex-1">
          {entry.body ? (
            <BodyStage entry={entry} clock={clock} start={start} customization={PLAYER.avatarCustomization} left={attacker === 'opponent'} />
          ) : (
            input && (
              <ZoneMatch3DView
                input={input}
                fx={fx}
                player={PLAYER}
                opponent={OPPONENT}
                insets={insets}
                plates={scene?.sky == null}
                clock={clock}
                fallback={<div className="grid h-full place-items-center text-white/60">WebGL unavailable</div>}
              />
            )
          )}
          {scene?.sky && phase === 'run' && (
            <SkyShot key={`sky-${run}`} result={skyResult(scene.sky)} precision={SKY_QUESTION.precision} unit={SKY_QUESTION.unit.en ?? ''} opponentName={OPPONENT.name} top={12} />
          )}
          {entry.question && started?.run === run && (
            <div ref={sheetRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-10 max-h-[78%] overflow-y-auto p-3">
              <QuestionSheet key={run} question={entry.question} clock={clock} startAt={started.at} wall={started.wall} />
            </div>
          )}
          <AnimatePresence>
            {popup && (
              <motion.div
                key={popup.id}
                className="pointer-events-none absolute inset-x-0 top-[8%] z-20 flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.4, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <CardFace id={popup.card} width={110} showCost={false} />
                <span className="mt-1 rounded-full bg-black/60 px-2 text-[11px] font-bold uppercase">{popup.side === 'player' ? PLAYER.name : OPPONENT.name}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className={cn('pointer-events-none absolute left-3 z-20 max-w-[70%] rounded-xl bg-black/55 px-3 py-2 backdrop-blur', entry.question || entry.body ? 'top-3' : 'bottom-3')}>
            <div className="text-sm font-bold">{entry.label}</div>
            <div className="text-xs text-white/75">{entry.about}</div>
            <div className="mt-1 font-mono text-[10px] text-white/45">{entry.source}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/40 px-3 py-2">
          <button type="button" onClick={replay} className="grid size-9 place-items-center rounded-full bg-white/10" aria-label="Replay (R)">
            <RotateCcw className="size-4" />
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} className="grid size-9 place-items-center rounded-full bg-white text-black" aria-label="Pause (space)">
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLoop((l) => !l)}
            className={cn('grid size-9 place-items-center rounded-full', loop ? 'bg-white/25' : 'bg-white/5 text-white/40')}
            aria-label="Loop"
          >
            <Repeat className="size-4" />
          </button>
          <input
            ref={timeRef}
            type="range"
            min={0}
            max={length}
            step={0.01}
            defaultValue={0}
            onChange={(e) => {
              setPaused(true);
              clock.set(clock.speed, true);
              clock.seek(start + Number(e.target.value));
            }}
            className="min-w-[120px] flex-1 accent-white"
            aria-label="Timeline"
          />
          <span ref={timeLabel} className="w-[104px] text-right font-mono text-xs text-white/70" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase text-white/50">Ball</span>
            {BALL_STYLES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBallStyle(b.id)}
                className={cn('rounded-full px-2 py-1 text-[11px] font-bold', ballStyle === b.id ? 'bg-brand-yellow text-black' : 'bg-white/10')}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn('rounded-full px-2 py-1 font-mono text-xs', speed === s ? 'bg-white text-black' : 'bg-white/10')}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['player', 'opponent'] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => {
                  setAttacker(side);
                  replay();
                }}
                className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase', attacker === side ? 'bg-white text-black' : 'bg-white/10')}
              >
                {entry.group === 'card' ? `${side === 'player' ? 'You' : 'Rival'} play it` : entry.body ? (side === 'player' ? 'Faces right' : 'Faces left') : `${side === 'player' ? 'You' : 'Rival'} attack`}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
