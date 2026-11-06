'use client';

/**
 * The number tiebreak's reveal as a sky shot: both players kick a ball straight up (the 3D director's `sky` mode), and
 * the balls climb a number scale towards the answer, glowing across the sky. Each ball's counter runs up and stops at
 * its owner's guess — the higher the guess, the harder the kick, so it flies on longer — then both distances to the
 * answer are measured and the closer ball wins the duel.
 *
 * Everything is drawn over the scene (DOM), launched from the players' feet as the cut-outs stand on screen, and timed
 * from the moment it mounts (the director's sky clock starts then too).
 */

import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatValue } from '@/features/aproximado/aproximado.copy';
import type { DuelReason, DuelSide } from '@/features/numeric-question/numericDuel';
import { CUTOUT_BASE, SKY_KICK_AT } from './zoneMatch3d.director';
import { SIDE_COLOR } from './zoneMatch3d.layout';
import type { NumericDuel } from './zoneMatch.machine';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 700 } as const;
const SIDES = ['player', 'opponent'] as const;
const GOLD = '#FFE500';
const INK = '#0E1E27';
const WIN_GREEN = '#58CC02';
/** Room kept at the screen edge for a value pill. */
const PILL_ROOM = 104;

/** Seconds: the slowest ball's climb (the highest guess); lower guesses take less, as if kicked softer. */
const CLIMB_S = 2.3;
const CLIMB_MIN_S = 0.7;
/** After the last ball stops: the distances, then the winner's burst, then the verdict. */
const GAPS_AFTER = 0.25;
const WINNER_AFTER = 0.75;
const VERDICT_AFTER = 1.15;

const REASON_KEY = {
  closer: 'numericDraft.reasonCloser',
  faster: 'numericDraft.reasonFaster',
  onlyAnswer: 'numericDraft.reasonOnlyAnswer',
  coinFlip: 'numericDraft.reasonCoinFlip',
} as const satisfies Record<DuelReason, string>;

const STAMP: Record<DuelReason, string> = { closer: 'Closer!', faster: 'Faster!', onlyAnswer: 'Only answer', coinFlip: 'Lucky!' };

type Result = NonNullable<NumericDuel['result']>;

interface Lanes {
  /** Each ball's column (the player's centre) and launch height (their feet), in px. */
  x: Record<DuelSide, number>;
  launch: number;
}

/** The scale: the value at the launch height and at the top of the sky, and its tick step. */
export function skyScale(result: Pick<Result, 'answer' | 'guesses'>, precision: number): { bottom: number; top: number; step: number } {
  const values = [result.answer, ...SIDES.map((side) => result.guesses[side]).filter((v): v is number => v !== null)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(result.answer) * 0.04, 10 ** -precision * 4, 1e-9);
  // Small positive numbers count up from zero; anything else starts well under the lowest value, so even the lower
  // guess climbs clear of the players' heads.
  const bottom = lo >= 0 && lo <= span * 2.5 ? 0 : lo - span * 1.1;
  const top = hi + span * 0.18;
  return { bottom, top, step: niceStep((top - bottom) / 5) };
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * power;
}

/** The kick's flight: fast off the boot, slowing to a stop (constant deceleration). */
const decelerate = (k: number) => 1 - (1 - k) ** 2;
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/** Where each player's feet are on screen, from their cut-outs (or fixed columns without the 3D view). */
function measureLanes(): Lanes {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const fallback: Lanes = { x: { player: width * 0.36, opponent: width * 0.64 }, launch: height * 0.86 };
  const rects = SIDES.map((side) => document.querySelector(`[data-zm-cutout="${side}"]`)?.getBoundingClientRect() ?? null);
  if (rects.some((rect) => !rect || rect.width === 0)) return fallback;
  const [p, o] = rects as DOMRect[];
  const feet = (rect: DOMRect) => rect.top + rect.height * CUTOUT_BASE;
  return { x: { player: p.left + p.width / 2, opponent: o.left + o.width / 2 }, launch: Math.min(height - 24, Math.max(feet(p), feet(o)) - 8) };
}

/**
 * Seconds since mount, every frame until `until`, and the launch lanes: followed while the figures glide into place for
 * the kick, then held where the balls left the boots.
 */
function useSkyClock(until: number): { t: number; lanes: Lanes | null } {
  const [clock, setClock] = useState<{ t: number; lanes: Lanes | null }>({ t: 0, lanes: null });
  useEffect(() => {
    const start = performance.now();
    let lanes: Lanes | null = null;
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (!lanes || t < SKY_KICK_AT) lanes = measureLanes();
      setClock({ t, lanes });
      if (t < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [until]);
  return clock;
}

export function SkyShot({
  result,
  precision,
  unit,
  opponentName,
  top,
}: {
  result: Result;
  precision: number;
  unit: string;
  opponentName: string;
  /** The sky's ceiling: just under the HUD. */
  top: number;
}) {
  const { t: translate, locale } = useLocale();
  const fmt = (value: number, withUnit = false) => formatValue(value, withUnit ? unit : '', precision, locale).trim();
  const scale = skyScale(result, precision);

  const { t, lanes } = useSkyClock(SKY_KICK_AT + CLIMB_S + VERDICT_AFTER + 0.6);
  if (!lanes) return null;

  // Room under the HUD for the verdict.
  const ceiling = top + 78;
  const floor = Math.max(ceiling + 120, lanes.launch);
  const yOf = (value: number) => floor - ((value - scale.bottom) / (scale.top - scale.bottom)) * (floor - ceiling);
  const answerY = yOf(result.answer);

  // Each ball's flight: the higher it goes, the longer (and harder) the kick.
  const heights = SIDES.map((side) => (result.guesses[side] === null ? 0 : result.guesses[side]! - scale.bottom));
  const highest = Math.max(...heights, 1e-9);
  const flights = Object.fromEntries(
    SIDES.map((side, i) => {
      const guess = result.guesses[side];
      const duration = guess === null ? 0 : CLIMB_MIN_S + (CLIMB_S - CLIMB_MIN_S) * Math.sqrt(heights[i] / highest);
      const k = guess === null ? 0 : clamp01((t - SKY_KICK_AT) / duration);
      const value = guess === null ? scale.bottom : scale.bottom + (guess - scale.bottom) * decelerate(k);
      return [side, { guess, duration, k, value, landed: guess !== null && k >= 1 }];
    }),
  ) as Record<DuelSide, { guess: number | null; duration: number; k: number; value: number; landed: boolean }>;
  const allLanded = SKY_KICK_AT + Math.max(...SIDES.map((side) => flights[side].duration));
  const showGaps = t >= allLanded + GAPS_AFTER;
  const showWinner = t >= allLanded + WINNER_AFTER;
  const showVerdict = t >= allLanded + VERDICT_AFTER;
  // The answer line flares as a ball flies through it.
  const flare = SIDES.some((side) => {
    const f = flights[side];
    return f.guess !== null && f.guess > result.answer && Math.abs(f.value - result.answer) < (scale.top - scale.bottom) * 0.05 && f.k < 1;
  });

  const left = Math.min(lanes.x.player, lanes.x.opponent);
  const right = Math.max(lanes.x.player, lanes.x.opponent);
  const lineFrom = left - 70;
  const lineTo = right + 70;
  const ticks: number[] = [];
  for (let v = Math.ceil(scale.bottom / scale.step) * scale.step; v <= scale.top + 1e-9; v += scale.step) ticks.push(v);
  const mid = (left + right) / 2;
  const winner = result.winner;
  const winnerName = winner === 'player' ? 'You win the duel' : `${opponentName} wins the duel`;
  // The settled guesses, read out with the verdict (the flying numbers are hidden from screen readers).
  const guessLine = (side: DuelSide) => {
    const who = side === 'player' ? 'You' : opponentName;
    const guess = result.guesses[side];
    const diff = result.diffs[side];
    if (guess === null) return `${who}: no answer.`;
    return `${who}: ${fmt(guess, true)}${diff === null ? '' : diff === 0 ? ', spot on' : `, ${fmt(diff)} off`}.`;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[38] overflow-hidden" data-zm-skyshot>
      {/* Screen readers hear the verdict once; the running numbers below are decoration. */}
      <div className="sr-only" aria-live="polite">
        {showVerdict ? `${winnerName}. ${translate(REASON_KEY[result.reason])}. Answer ${fmt(result.answer, true)}. ${SIDES.map(guessLine).join(' ')}` : ''}
      </div>
      <div aria-hidden className="absolute inset-0">
        {/* Night falls over the stands so the flight reads. */}
        <div
          className="absolute inset-x-0 top-0 transition-opacity duration-500"
          style={{ height: floor, opacity: t > 0.05 ? 1 : 0, background: 'linear-gradient(to bottom, rgba(4,10,24,0.92) 0%, rgba(6,16,34,0.78) 55%, rgba(6,16,34,0) 100%)' }}
        />
        {STARS.map((star) => (
          <span
            key={star.left}
            className="absolute rounded-full bg-white"
            style={{
              left: star.left,
              top: ceiling + (floor - ceiling) * star.top,
              width: star.size,
              height: star.size,
              opacity: 0.25 + 0.5 * Math.abs(Math.sin(t * star.speed + star.phase)),
            }}
          />
        ))}

        {/* The scale up the middle. */}
        <div className="absolute" style={{ left: mid, top: ceiling - 8, height: floor - ceiling + 8, width: 2, background: 'rgba(255,255,255,0.12)' }} />
        {ticks.map((value) => (
          <div key={value} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5" style={{ left: mid, top: yOf(value) }}>
            <span className="h-px w-3 bg-white/30" />
            <span className="text-[11px] tabular-nums text-white/45" style={poppins}>{fmt(value)}</span>
            <span className="h-px w-3 bg-white/30" />
          </div>
        ))}

        {/* The answer: a gold line across both flights. */}
        <div
          className="absolute h-[3px] -translate-y-1/2 rounded-full"
          style={{
            left: lineFrom,
            width: lineTo - lineFrom,
            top: answerY,
            background: GOLD,
            opacity: clamp01(t / 0.4),
            boxShadow: `0 0 ${flare ? 28 : 14}px ${GOLD}`,
            transform: `translateY(-50%) scaleY(${flare ? 2 : 1})`,
          }}
        />
        {/* A compact flag between the two flights, so a ball landing on the line stays clear of it. */}
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl px-2 py-0.5 text-center tabular-nums shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{ ...poppins, left: mid, top: answerY, background: GOLD, color: INK, opacity: clamp01(t / 0.4), transform: `translate(-50%, -50%) scale(${flare ? 1.12 : 1})`, maxWidth: Math.max(64, right - left - 56) }}
          data-zm-sky-answer
        >
          <span className="text-[8px] uppercase leading-none tracking-[0.12em] opacity-75">Answer</span>
          <span className="text-sm leading-tight">{fmt(result.answer)}</span>
        </div>

        {SIDES.map((side) => {
          const f = flights[side];
          const x = lanes.x[side];
          const y = yOf(f.value);
          const color = SIDE_COLOR[side];
          const outer = side === 'player' ? -1 : 1;
          const won = showWinner && side === winner;
          const lost = showWinner && side !== winner;
          const launched = t >= SKY_KICK_AT && f.guess !== null;
          const diff = result.diffs[side];
          // The pills sit beside the ball, on the outside, kept on screen (PILL_ROOM for the widest number).
          const pillStyle = side === 'player' ? { right: Math.min(window.innerWidth - x + 26, window.innerWidth - PILL_ROOM) } : { left: Math.min(x + 26, window.innerWidth - PILL_ROOM) };
          return (
            <div key={side} data-zm-sky-ball={side} data-zm-sky-value={f.landed ? f.guess : undefined}>
              {/* Launch puff at the boot. */}
              {launched && t < SKY_KICK_AT + 0.5 && (
                <span
                  className="absolute rounded-full border-2"
                  style={{
                    left: x,
                    top: lanes.launch,
                    width: 60 * (0.4 + (t - SKY_KICK_AT) * 2.4),
                    height: 18 * (0.4 + (t - SKY_KICK_AT) * 2.4),
                    borderColor: color,
                    opacity: 1 - (t - SKY_KICK_AT) * 2,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              {/* The trail: a streak from the boot to the ball, fading below. */}
              {launched && (
                <span
                  className="absolute w-2 -translate-x-1/2 rounded-full"
                  style={{
                    left: x,
                    top: y,
                    height: Math.max(0, lanes.launch - y),
                    background: `linear-gradient(to bottom, ${color}cc, ${color}00)`,
                    opacity: lost ? 0.25 : f.landed ? 0.55 : 0.9,
                    filter: 'blur(1px)',
                  }}
                />
              )}
              {/* The gap to the answer, once both have landed. */}
              {showGaps && f.guess !== null && diff !== null && (
                <div
                  className="absolute flex items-center"
                  style={{
                    left: x + outer * 18 - (outer < 0 ? 2 : 0),
                    top: Math.min(y, answerY),
                    height: Math.max(2, Math.abs(answerY - y)),
                  }}
                >
                  <span className="h-full border-l-2 border-dashed" style={{ borderColor: won ? WIN_GREEN : 'rgba(255,255,255,0.45)' }} />
                </div>
              )}
              {showGaps && f.guess !== null && diff !== null && (
                <span
                  className="absolute -translate-y-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] uppercase tabular-nums"
                  style={{
                    ...poppins,
                    ...pillStyle,
                    top: (y + answerY) / 2,
                    background: won ? WIN_GREEN : 'rgba(255,255,255,0.14)',
                    color: 'white',
                    // Under the value pill when the ball sits right on the line.
                    marginTop: Math.abs(answerY - y) < 40 ? 30 : 0,
                  }}
                >
                  {diff === 0 ? 'Spot on' : `${fmt(diff)} off`}
                </span>
              )}
              {/* The ball, spinning as it climbs; the winner's flares, the other's fades. */}
              {f.guess !== null && (
                <span
                  aria-hidden
                  className="absolute size-10 bg-cover"
                  style={{
                    backgroundImage: 'url(/assets/brand/ball.webp)',
                    left: x,
                    top: launched ? y : lanes.launch,
                    opacity: lost ? 0.45 : 1,
                    transform: `translate(-50%, -50%) rotate(${f.k * 900}deg) scale(${f.landed && t < SKY_KICK_AT + f.duration + 0.18 ? 1.18 : won ? 1.15 : 1})`,
                    filter: won ? `drop-shadow(0 0 14px ${WIN_GREEN}) drop-shadow(0 0 4px white)` : `drop-shadow(0 0 10px ${color})`,
                  }}
                />
              )}
              {won && (
                <span
                  className="absolute rounded-full border-[3px]"
                  style={{
                    left: x,
                    top: y,
                    width: 40 + (t - allLanded - WINNER_AFTER) * 160,
                    height: 40 + (t - allLanded - WINNER_AFTER) * 160,
                    borderColor: WIN_GREEN,
                    opacity: clamp01(1 - (t - allLanded - WINNER_AFTER) * 1.6),
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              {/* Who, and the number running up as it flies (nothing before the kick: no spoilers). */}
              {(launched || f.guess === null) && (
                <div
                  className="absolute -translate-y-1/2 whitespace-nowrap rounded-full border-2 px-2.5 py-0.5 text-center tabular-nums shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
                  style={{
                    ...poppins,
                    ...pillStyle,
                    top: f.guess === null ? lanes.launch - 30 : y,
                    background: f.landed ? color : 'rgba(5,11,18,0.85)',
                    borderColor: color,
                    color: 'white',
                    opacity: lost ? 0.6 : 1,
                  }}
                >
                  <div className="text-[9px] uppercase leading-tight opacity-80">{side === 'player' ? 'You' : opponentName}</div>
                  <div className="text-base leading-tight sm:text-lg">{f.guess === null ? 'No answer' : fmt(f.value)}</div>
                </div>
              )}
              {won && (
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-sm uppercase text-white shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
                  style={{
                    ...poppins,
                    left: x,
                    top: y - 58,
                    background: WIN_GREEN,
                    transform: `translateX(-50%) rotate(-8deg) scale(${Math.min(1, 0.4 + (t - allLanded - WINNER_AFTER) * 4)})`,
                  }}
                  data-zm-sky-stamp
                >
                  {STAMP[result.reason]}
                </span>
              )}
            </div>
          );
        })}

        {/* The verdict, under the sky. */}
        {showVerdict && (
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-[18px] border-2 border-white/70 px-5 py-1.5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            style={{
              left: mid,
              top: top + 6,
              background: SIDE_COLOR[winner],
              transform: `translateX(-50%) scale(${Math.min(1, 0.5 + (t - allLanded - VERDICT_AFTER) * 5)})`,
            }}
            data-zm-sky-verdict={winner}
          >
            <div className="text-lg uppercase leading-tight text-white sm:text-xl" style={poppins}>{winnerName}</div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-white/85" style={poppins}>
              {translate(REASON_KEY[result.reason])} · answer {fmt(result.answer, true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A few fixed stars (shares of the sky's width and height), each twinkling at its own pace. */
const STARS = [
  { left: '8%', top: 0.12, size: 2, speed: 2.1, phase: 0.3 },
  { left: '17%', top: 0.42, size: 3, speed: 1.4, phase: 1.1 },
  { left: '27%', top: 0.08, size: 2, speed: 2.8, phase: 2.2 },
  { left: '41%', top: 0.3, size: 2, speed: 1.9, phase: 0.8 },
  { left: '58%', top: 0.16, size: 3, speed: 1.2, phase: 2.9 },
  { left: '69%', top: 0.48, size: 2, speed: 2.5, phase: 1.7 },
  { left: '79%', top: 0.1, size: 2, speed: 1.6, phase: 0.1 },
  { left: '91%', top: 0.36, size: 3, speed: 2.2, phase: 2.5 },
  { left: '50%', top: 0.62, size: 2, speed: 1.8, phase: 1.4 },
];
