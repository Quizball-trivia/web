'use client';

/**
 * Searching direction "Keepy-uppy warm-up": while the search runs you warm up on the grass — your full-body avatar
 * juggling, and you keep the ball up yourself: tap (or Space) as it drops below the knee to flick it back up. Your
 * count and best show; drop it and it rolls back to your foot. When someone is found, he volleys it away and the VS
 * comes in.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from '../AvatarFullBody';
import { FOOT, FULL_H, FULL_W, STAND, idlePose, mixPose } from '../zoneMatch.fullBody';
import { BallArt } from '../ZoneMatchFutReactions';
import { CancelButton, VersusReveal, clockText, useSearchSeconds, type SearchScreenProps } from './searchShared';

/** In the figure's art units (496 × 840, ground at 830). */
const BALL_R = 34;
const GROUND = 830;
const REST = { x: FOOT.R + 40, y: 780 };
/** A tap counts while the ball is dropping through this band (between the waist and the boot). */
const KICK_ZONE = 560;
const GRAVITY = 2600;
const KICK_V = -1500;

export function SearchKeepyUppy({ self, deck, startedAt, opponent, opponentDeck, onCancel }: SearchScreenProps) {
  const seconds = useSearchSeconds(startedAt);
  const [els, setEls] = useState<FullBodyEls | null>(null);
  const ballEl = useRef<HTMLDivElement>(null);
  const sim = useRef({ x: REST.x, y: REST.y, vx: 0, vy: 0, resting: true, kickAt: -10, count: 0, volley: false });
  const [count, setCount] = useState(0);
  const [best, setBest] = useState(0);
  const [versus, setVersus] = useState(false);

  const kick = useCallback(() => {
    const b = sim.current;
    if (b.volley) return;
    const now = performance.now() / 1000;
    if (b.resting || (b.vy > 0 && b.y > KICK_ZONE)) {
      b.resting = false;
      b.vy = KICK_V - Math.random() * 200;
      b.vx = (REST.x - b.x) * 1.8 + (Math.random() - 0.5) * 120;
      b.kickAt = now;
      b.count += 1;
      setCount(b.count);
      setBest((v) => Math.max(v, b.count));
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        kick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kick]);

  // Found: one last volley out of the picture, then the VS.
  useEffect(() => {
    if (!opponent) return;
    const b = sim.current;
    b.volley = true;
    b.resting = false;
    b.vy = -2300;
    b.vx = 2600;
    b.kickAt = performance.now() / 1000;
    const id = window.setTimeout(() => setVersus(true), 1100);
    return () => window.clearTimeout(id);
  }, [opponent]);

  useEffect(() => {
    if (!els) return;
    let raf = 0;
    let last = performance.now();
    const loop = (ms: number) => {
      const dt = Math.min(0.033, (ms - last) / 1000);
      last = ms;
      const now = ms / 1000;
      const b = sim.current;
      if (!b.resting) {
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > GROUND - BALL_R && !b.volley) {
          // Dropped: a bounce, then it rolls back to the boot.
          b.y = GROUND - BALL_R;
          b.vy *= -0.35;
          b.vx *= 0.6;
          if (Math.abs(b.vy) < 120) {
            b.vy = 0;
            b.x += (REST.x - b.x) * Math.min(1, dt * 4);
            if (Math.abs(b.x - REST.x) < 3) {
              b.resting = true;
              b.y = REST.y;
            }
          }
          if (b.count) {
            b.count = 0;
            setCount(0);
          }
        }
      }
      // The kicking leg flicks up for a moment after each touch.
      const k = Math.max(0, 1 - Math.abs(now - b.kickAt - 0.08) / 0.18);
      const pose = mixPose(idlePose(now), { ...STAND, hipR: STAND.hipR + 58, kneeR: STAND.kneeR + 30, ankleR: -12, lean: -3 }, k);
      applyFullBodyPose(els, pose);
      if (ballEl.current) {
        ballEl.current.style.left = `${((b.x - BALL_R) / FULL_W) * 100}%`;
        ballEl.current.style.top = `${((b.y - BALL_R) / FULL_H) * 100}%`;
        ballEl.current.style.transform = `rotate(${(b.x * 2) % 360}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [els]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden font-poppins text-white" style={{ background: 'radial-gradient(120% 80% at 50% 10%, #2f8f5b 0%, #1d5c3a 55%, #0f3322 100%)' }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%]" style={{ background: 'repeating-linear-gradient(90deg, #2c8a52 0 90px, #298049 90px 180px)' }} />
      <AnimatePresence mode="wait">
        {!versus ? (
          <motion.div key="warm" exit={{ opacity: 0 }} className="relative z-10 flex w-full flex-1 flex-col items-center">
            <div className="mt-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow">Ranked · finding an opponent {clockText(seconds)}</p>
              <h1 className="mt-1 text-3xl font-black uppercase">{opponent ? 'Opponent found!' : 'Warm up'}</h1>
              <p className="mt-1 text-sm text-white/70">Tap (or Space) as the ball drops to keep it up</p>
            </div>
            <div className="mt-2 flex gap-6 text-center">
              <div>
                <div className="text-5xl font-black tabular-nums">{count}</div>
                <div className="text-[11px] font-bold uppercase text-white/60">Touches</div>
              </div>
              <div>
                <div className="text-5xl font-black tabular-nums text-brand-yellow">{best}</div>
                <div className="text-[11px] font-bold uppercase text-white/60">Best</div>
              </div>
            </div>
            <button type="button" onPointerDown={kick} className="relative mt-auto mb-[6vh] h-[52vh] cursor-pointer touch-none select-none" style={{ aspectRatio: `${FULL_W} / ${FULL_H}` }} aria-label="Keep the ball up">
              <AvatarFullBody customization={self.avatarCustomization} seed={0} onEls={setEls} style={{ height: '100%' }} />
              <div ref={ballEl} className="absolute" style={{ width: `${((BALL_R * 2) / FULL_W) * 100}%`, aspectRatio: '1' }}>
                <BallArt />
              </div>
            </button>
            {!opponent && <CancelButton onCancel={onCancel} className="absolute bottom-6 right-6" />}
          </motion.div>
        ) : (
          opponent && (
            <motion.div key="vs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 my-auto">
              <VersusReveal self={self} deck={deck} opponent={opponent} opponentDeck={opponentDeck} width={210} />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
