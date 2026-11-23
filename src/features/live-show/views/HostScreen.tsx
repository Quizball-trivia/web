'use client';

import { Component, memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { Crown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SMASH_IMPACT_S } from '@/features/orshabatoba/studio/acting';
import type { HostId } from '@/features/orshabatoba/studio/studioLayout';
import { KIND_LABEL, L, SHOW_COPY } from '../show.copy';
import type { ShowLocale } from '../show.types';
import { directStudio, type CrowdMood, type StudioCue, type StudioLine } from '../studioDirector';
import type { ShowState } from '../useShowSim';
import { QuestionView } from './QuestionViews';
import { mmss } from './ShowScreens';

/** A stand-in QR: a seeded grid, so the layout has its real footprint before the join link exists. */
function qrCells(seed: string): boolean[] {
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < 21 * 21; i += 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const x = i % 21;
    const y = Math.floor(i / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (finder) {
      const fx = x > 13 ? x - 14 : x;
      const fy = y > 13 ? y - 14 : y;
      cells.push(fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4));
    } else {
      cells.push((h >>> 16) % 2 === 0);
    }
  }
  return cells;
}

function FakeQr({ seed }: { seed: string }) {
  const cells = qrCells(seed);
  return (
    <div className="grid size-36 shrink-0 grid-cols-[repeat(21,1fr)] rounded-xl bg-white p-2">
      {cells.map((on, i) => <span key={i} className={on ? 'bg-black' : 'bg-white'} />)}
    </div>
  );
}

const OrshabatobaStudio = dynamic(
  () => import('@/features/orshabatoba/studio/OrshabatobaStudio').then((m) => m.OrshabatobaStudio),
  { ssr: false },
);

type Anchors = Record<HostId, RefObject<HTMLDivElement | null>>;

function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A still of the same set: shown at once while three.js and the host models load, then the live scene fades in over
 * it. Without WebGL (old phones, blocked GPU) the show goes on over this still. */
function StudioPoster() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size local still behind a WebGL canvas
    <img src="/assets/orshabatoba/events/studio-wide-tripo.webp" alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
  );
}

class StudioBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The 3D set. Memoised: the show clock re-renders the host screen ten times a second, the cue changes far less. */
const StudioLayer = memo(function StudioLayer({ cue, anchors }: { cue: StudioCue; anchors: Anchors }) {
  const [webgl] = useState(canUseWebGL);
  // The laptop breaks when the palm lands: timed from when the smash gesture starts, in real time like the gesture.
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (!cue.impact) return;
    const timer = window.setTimeout(() => setLanded(cue.impact), SMASH_IMPACT_S * 1000);
    return () => {
      window.clearTimeout(timer);
      // A replay of the same smash must wait for its own impact.
      setLanded(0);
    };
  }, [cue.impact]);
  const hit = cue.impact !== 0 && landed === cue.impact ? cue.impact : 0;
  const smash = useMemo(() => ({ tato: hit }), [hit]);
  // The still sits outside the scene's error boundary: no WebGL, or a model that fails to load, keeps the picture.
  if (!webgl) return <StudioPoster />;
  return (
    <>
    <StudioPoster />
    <StudioBoundary>
      <OrshabatobaStudio shot={cue.shot} acts={cue.acts} smash={smash} shake={hit} anchors={anchors} className="absolute inset-0" fadeIn />
    </StudioBoundary>
    </>
  );
});

const BUBBLE_TONE: Record<StudioLine['tone'], string> = {
  ask: 'bg-white text-black',
  angry: 'bg-red-600 text-white',
  happy: 'bg-amber-300 text-black',
};

const PANEL = 'rounded-3xl border border-white/10 bg-black/65 backdrop-blur-md';

/** The overlay is laid out for a 1280×720 frame and zoomed to whatever size the screen is shown at. */
const DESIGN_WIDTH = 1280;

function useFrameZoom(frame: RefObject<HTMLDivElement | null>): number {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setZoom(entry.contentRect.width / DESIGN_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [frame]);
  return zoom;
}

/** The leaders along the bottom edge, over the desk. */
function LeaderStrip({ state, locale }: { state: ShowState; locale: ShowLocale }) {
  const copy = SHOW_COPY[locale];
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/90 to-transparent px-5 pb-3 pt-8">
      {state.board.slice(0, 5).map((r) => (
        <motion.div layout key={r.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <span className={cn('font-poppins text-base font-black tabular-nums', r.rank <= 3 ? 'text-brand-yellow' : 'text-white/60')}>{r.rank}</span>
          <span className="min-w-0 flex-1 truncate font-poppins text-sm font-black uppercase text-white">{r.name}</span>
          <span className="font-poppins text-sm font-black tabular-nums text-white">{r.points}</span>
        </motion.div>
      ))}
      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-yellow px-3 py-1.5 font-poppins text-sm font-black uppercase text-black">
        <Users className="size-4" /> {state.aliveCount} {copy.host.left}
      </span>
    </div>
  );
}

function TopTen({ state }: { state: ShowState }) {
  return (
    <div className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-3 gap-y-1.5">
      {state.board.slice(0, 10).map((r) => (
        <motion.div layout key={r.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5">
          <span className={cn('w-6 font-poppins text-base font-black tabular-nums', r.rank <= 3 ? 'text-brand-yellow' : 'text-white/60')}>{r.rank}</span>
          <span className="min-w-0 flex-1 truncate font-poppins text-base font-black uppercase text-white">{r.name}</span>
          <span className="font-poppins text-base font-black tabular-nums text-white">{r.points}</span>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * The 16:9 page the creator adds to OBS. It runs live; viewers see it on the stream a few seconds late.
 * The ორშაბათობა studio plays behind everything: Tato and Kala sit at the edges and react to how the crowd did.
 */
/** The real night: no stand-in QR or simulated join clock, and the question can live outside the frame. */
export interface HostScreenLive {
  /** The interactive question is rendered beside the frame; the frame keeps the studio, title and leaders. */
  hideQuestion?: boolean;
  /** Before kickoff: a line under the title (e.g. "starts when the hosts press Start"). */
  lobbyLine: string;
  /** The Start countdown's target (server clock); null until the hosts press Start. */
  countdownTo: number | null;
  joined: number | null;
  /** What Kala says in the lobby (the sim's line is about a QR code the site doesn't show). */
  joinLine?: string;
  /** Background only (the /orshabatoba page): the studio and hosts, none of the frame's own text, panels or bubbles. */
  bare?: boolean;
}

export function HostScreen({ state, locale, moodOverride, live }: { state: ShowState; locale: ShowLocale; moodOverride?: CrowdMood | null; live?: HostScreenLive }) {
  const copy = SHOW_COPY[locale];
  const { screen } = state;
  const stageCount = state.pack.stages.length;

  const cueNow = directStudio({ screen, now: state.now, speed: state.speed, correctShare: state.reveal?.correctShare ?? null, moodOverride });
  const cueKey = JSON.stringify(cueNow);
  const cue = useMemo(() => JSON.parse(cueKey) as StudioCue, [cueKey]);

  const tatoAnchor = useRef<HTMLDivElement>(null);
  const kalaAnchor = useRef<HTMLDivElement>(null);
  const anchors = useMemo<Anchors>(() => ({ tato: tatoAnchor, kala: kalaAnchor }), []);
  const frame = useRef<HTMLDivElement>(null);
  const zoom = useFrameZoom(frame);

  const pct = Math.round((state.reveal?.correctShare ?? 0) * 100);
  const lineText = !cue.say
    ? null
    : cue.say.line === 'join'
      ? live?.joinLine ?? copy.host.sayJoin
      : cue.say.line === 'great'
        ? copy.host.sayGreat(pct)
        : cue.say.line === 'bad'
          ? copy.host.sayBad(pct)
          : copy.host.sayDisaster(pct);
  // The smash plays in the left half of the frame; the panel steps aside for it.
  const docked = cue.shot === 'tato-smash';

  if (live?.bare) {
    return (
      <div ref={frame} className="relative h-full w-full overflow-hidden bg-black">
        <StudioLayer cue={cue} anchors={anchors} />
        {(['tato', 'kala'] as HostId[]).map((host) => (
          <div key={host} ref={anchors[host]} className="pointer-events-none absolute left-0 top-0" style={{ visibility: 'hidden' }} />
        ))}
      </div>
    );
  }

  return (
    <div ref={frame} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black font-fun text-white">
      <StudioLayer cue={cue} anchors={anchors} />

      {/* Speech bubbles: the studio moves each anchor to just above its host's head every frame. */}
      {(['tato', 'kala'] as HostId[]).map((host) => (
        <div key={host} ref={anchors[host]} className="pointer-events-none absolute left-0 top-0 z-10" style={{ visibility: 'hidden' }}>
          {cue.say?.host === host && lineText && (
            <div
              key={lineText}
              style={{ zoom }}
              className={cn(
                'absolute bottom-0 left-0 w-max max-w-[18rem] -translate-x-1/2 rounded-2xl px-4 py-2.5 font-poppins text-lg font-black leading-snug shadow-xl duration-200 animate-in fade-in zoom-in-95',
                BUBBLE_TONE[cue.say.tone],
              )}
            >
              {lineText}
            </div>
          )}
        </div>
      ))}

      <div className="absolute inset-0" style={{ zoom }}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/85 to-transparent px-8 pb-8 pt-5">
          <span className="font-poppins text-2xl font-black uppercase tracking-wide">{state.settings.title}</span>
          {state.stage && (
            <span className="rounded-full bg-brand-blue px-4 py-1.5 font-poppins text-sm font-black uppercase">
              {state.stage.final ? copy.finalStage : copy.host.roundOf((('stage' in screen ? screen.stage : 0) ?? 0) + 1, stageCount)} · {L(state.stage.title, locale)}
            </span>
          )}
        </div>

        {live && screen.kind === 'lobby' && (
          <div className="absolute inset-x-[23%] bottom-[7%] top-[20%] flex items-center justify-center">
            <div className={cn(PANEL, 'flex flex-col items-center gap-3 px-10 py-7 text-center')}>
              {live.countdownTo != null ? (
                <>
                  <div className="font-poppins text-sm font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.startsIn}</div>
                  <div className="font-poppins text-[96px] font-black leading-none tabular-nums">{mmss(live.countdownTo - state.now)}</div>
                </>
              ) : (
                <div className="max-w-[30rem] font-poppins text-3xl font-black uppercase leading-tight">{live.lobbyLine}</div>
              )}
              {live.joined != null && (
                <div className="mt-1 flex items-center justify-center gap-2 font-poppins text-2xl font-black">
                  <Users className="size-6 text-brand-yellow" />
                  {live.joined} {copy.joined}
                </div>
              )}
            </div>
          </div>
        )}

        {!live && (screen.kind === 'creator' || screen.kind === 'lobby') && (
          <div className="absolute inset-x-[23%] bottom-[7%] top-[20%] flex items-center justify-center">
            <div className={cn(PANEL, 'flex items-center gap-8 px-8 py-6')}>
              <div className="flex flex-col items-center gap-2">
                <FakeQr seed={state.settings.title} />
                <span className="font-poppins text-sm font-black uppercase">{copy.host.scanToJoin}</span>
                <span className="font-poppins text-xs font-bold text-white/70">{copy.joinWith}</span>
              </div>
              <div className="text-center">
                <div className="font-poppins text-sm font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.startsIn}</div>
                <div className="font-poppins text-[88px] font-black leading-none tabular-nums">
                  {screen.kind === 'lobby' ? mmss(screen.closesAt - state.now) : mmss(state.settings.joinMinutes * 60_000)}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 font-poppins text-2xl font-black">
                  <Users className="size-6 text-brand-yellow" />
                  {screen.kind === 'lobby' ? joinedCount(state) : 0} {copy.joined}
                </div>
              </div>
            </div>
          </div>
        )}

        {screen.kind === 'stage_intro' && state.stage && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-8 pb-8 pt-24">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center font-poppins text-[72px] font-black uppercase leading-none">
              {L(state.stage.title, locale)}
            </motion.div>
            <div className="flex flex-wrap justify-center gap-2">
              {[...new Set(state.stage.questions.map((q) => q.kind))].map((k) => (
                <span key={k} className="rounded-full bg-white/15 px-4 py-1.5 font-poppins text-base font-bold uppercase backdrop-blur-sm">{L(KIND_LABEL[k], locale)}</span>
              ))}
            </div>
          </div>
        )}

        {(screen.kind === 'question' || screen.kind === 'reveal') && state.question && (
          <>
            {!live?.hideQuestion && <motion.div
              initial={false}
              animate={{ left: docked ? '47%' : '22%', right: docked ? '2%' : '22%' }}
              transition={{ type: 'spring', stiffness: 170, damping: 24 }}
              className={cn(PANEL, 'absolute top-[10%] flex max-h-[81%] flex-col overflow-hidden px-5 py-4')}
            >
              <div className="flex items-center justify-between font-poppins text-sm font-black uppercase tracking-widest text-brand-yellow">
                <span>{L(KIND_LABEL[state.question.kind], locale)}</span>
                {screen.kind === 'question' && (
                  <span className="flex items-center gap-4 tabular-nums text-white">
                    <span className="text-brand-green-light">{state.answeredCount} / {state.aliveCount} {copy.host.answeredNow}</span>
                    <span>{Math.max(0, Math.ceil((screen.deadline - Math.max(state.now, screen.startsAt)) / 1000))}s</span>
                  </span>
                )}
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                <QuestionView
                  key={state.question.id}
                  q={state.question}
                  locale={locale}
                  now={state.now}
                  startsAt={screen.kind === 'question' ? screen.startsAt : 0}
                  deadline={screen.kind === 'question' ? screen.deadline : 0}
                  answer={null}
                  reveal={screen.kind === 'reveal' ? state.reveal : null}
                  variant="host"
                />
              </div>
            </motion.div>}
            <LeaderStrip state={state} locale={locale} />
          </>
        )}

        {screen.kind === 'stage_result' && (
          <div className={cn(PANEL, 'absolute inset-x-[22%] bottom-[9%] top-[14%] flex flex-col justify-center gap-4 px-6 py-5')}>
            <div className="flex items-end justify-center gap-4 text-center">
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poppins text-[84px] font-black leading-none tabular-nums text-brand-green-light">
                {screen.keep}
              </motion.span>
              <span className="pb-2 text-left">
                <span className="block font-poppins text-lg font-black uppercase leading-tight">{copy.throughSub(screen.keep)}</span>
                <span className="block font-poppins text-base font-bold text-brand-red">−{screen.board.length - screen.keep} {copy.host.out}</span>
              </span>
            </div>
            <TopTen state={state} />
          </div>
        )}

        {screen.kind === 'champion' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(PANEL, 'flex flex-col items-center gap-3 px-16 py-8')}>
              <motion.div initial={{ y: -40, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}>
                <Crown className="size-24 text-brand-yellow drop-shadow-[0_0_30px_rgba(255,229,0,0.6)]" />
              </motion.div>
              <div className="font-poppins text-xl font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.champion}</div>
              <div className="font-poppins text-[84px] font-black uppercase leading-none">{screen.board[0]?.name}</div>
              <div className="font-poppins text-2xl font-bold tabular-nums text-white/80">{copy.points(screen.board[0]?.points ?? 0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Lobby head-count: joins arrive fast at first and taper off before the window closes. */
export function joinedCount(state: ShowState): number {
  if (state.screen.kind !== 'lobby') return state.fieldSize;
  const { openedAt, closesAt } = state.screen;
  const t = Math.min(1, ((state.now - openedAt) / Math.max(1, closesAt - openedAt)) * 1.6);
  return Math.max(1, Math.round(state.fieldSize * (1 - (1 - t) ** 2)));
}
