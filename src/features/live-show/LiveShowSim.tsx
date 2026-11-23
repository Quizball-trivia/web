'use client';

/**
 * /dev/live-show: the whole Live Show night on a simulated crowd. The bar at the top is for us, not players: restart,
 * skip, speed, jump to a round, play as a knocked-out spectator, phone / host screen / both, English or Georgian,
 * invented or real questions.
 */

import { useEffect, useState } from 'react';
import { Eye, FastForward, Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INVENTED_SHOW_PACK } from '@/features/playground/fixtures/liveShow';
import { YOU_ID } from './show.sim';
import type { ShowLocale, ShowPack } from './show.types';
import type { CrowdMood } from './studioDirector';
import { useShowSim, type ShowState } from './useShowSim';
import { HostScreen, joinedCount } from './views/HostScreen';
import { QuestionView } from './views/QuestionViews';
import {
  ChampionScreen, CreatorPanel, Lobby, RevealSplash, ShowHeader, StageIntro, StageResult,
} from './views/ShowScreens';

type ViewMode = 'phone' | 'host' | 'both';

let realPack: Promise<ShowPack | null> | null = null;
function loadRealPack(): Promise<ShowPack | null> {
  realPack ??= fetch('/dev-data/live-show.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: ShowPack | null) => (d && Array.isArray(d.stages) ? d : null), () => null);
  return realPack;
}

function PlayerView({ state, locale, sim }: { state: ShowState; locale: ShowLocale; sim: ReturnType<typeof useShowSim> }) {
  const { screen, you } = state;
  switch (screen.kind) {
    case 'creator':
      return <CreatorPanel locale={locale} initial={state.settings} onCreate={sim.create} />;
    case 'lobby':
      return (
        <Lobby
          locale={locale}
          title={state.settings.title}
          now={state.now}
          openedAt={screen.openedAt}
          closesAt={screen.closesAt}
          joined={joinedCount(state)}
          isHost
          onStartNow={sim.startNow}
        />
      );
    case 'stage_intro':
      return state.stage ? <StageIntro locale={locale} stage={state.stage} index={screen.stage} count={state.pack.stages.length} /> : null;
    case 'question':
    case 'reveal': {
      if (!state.stage || !state.question) return null;
      const rank = state.board.find((r) => r.id === YOU_ID)?.rank ?? null;
      const points = state.stage.final ? you.finalPoints : you.points;
      const secondsLeft = screen.kind === 'question'
        ? Math.max(0, Math.ceil((screen.deadline - Math.max(state.now, screen.startsAt)) / 1000))
        : null;
      return (
        <div className="relative pb-16">
          <ShowHeader
            locale={locale}
            stageIndex={screen.stage}
            stageCount={state.pack.stages.length}
            stage={state.stage}
            qIndex={screen.q}
            secondsLeft={secondsLeft}
            points={points}
            rank={state.youAlive ? rank : null}
            alive={state.aliveCount}
            spectating={!state.youAlive}
          />
          <div className="mx-auto mt-4 w-full max-w-xl px-4">
            <QuestionView
              key={state.question.id}
              q={state.question}
              locale={locale}
              now={state.now}
              startsAt={screen.kind === 'question' ? screen.startsAt : 0}
              deadline={screen.kind === 'question' ? screen.deadline : 0}
              answer={state.yourAnswer}
              onAnswer={state.youAlive ? sim.answer : undefined}
              reveal={screen.kind === 'reveal' ? state.reveal : null}
            />
          </div>
          {state.youAlive && (
            <RevealSplash
              show={screen.kind === 'reveal'}
              points={state.yourResult?.points ?? null}
              correct={state.yourResult?.correct ?? false}
            />
          )}
        </div>
      );
    }
    case 'stage_result':
      return (
        <StageResult
          locale={locale}
          board={screen.board}
          keep={screen.keep}
          youId={YOU_ID}
          youThrough={you.alive}
          wasPlaying={you.alive || you.outAfterStage === screen.stage}
        />
      );
    case 'champion':
      return <ChampionScreen locale={locale} board={screen.board} youId={YOU_ID} onRestart={sim.restart} />;
  }
}

function BarButton({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-poppins text-[11px] font-bold uppercase',
        active ? 'bg-brand-yellow text-black' : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {children}
    </button>
  );
}

export function LiveShowSim() {
  const [locale, setLocale] = useState<ShowLocale>('ka');
  const [view, setView] = useState<ViewMode>('both');
  const [real, setReal] = useState<ShowPack | null>(null);
  const [useReal, setUseReal] = useState(false);

  useEffect(() => {
    let live = true;
    void loadRealPack().then((p) => {
      if (!live || !p) return;
      setReal(p);
      setUseReal(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const pack = useReal && real ? real : INVENTED_SHOW_PACK;
  return <LiveShowSimInner key={pack.id} pack={pack} locale={locale} setLocale={setLocale} view={view} setView={setView} real={real} useReal={useReal} setUseReal={setUseReal} />;
}

function LiveShowSimInner({ pack, locale, setLocale, view, setView, real, useReal, setUseReal }: {
  pack: ShowPack;
  locale: ShowLocale;
  setLocale: (l: ShowLocale) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  real: ShowPack | null;
  useReal: boolean;
  setUseReal: (v: boolean) => void;
}) {
  const sim = useShowSim(pack, { crowd: 300, youName: 'You' });
  const { state } = sim;
  // Dev: force how the studio hosts react on every reveal (null = follow the crowd).
  const [mood, setMood] = useState<CrowdMood | null>(null);
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-fixed font-fun">
      <div className="sticky top-0 z-[80] flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-black/85 px-3 py-2 backdrop-blur">
        <span className="mr-1 font-poppins text-[11px] font-black uppercase tracking-widest text-brand-yellow">Live show · dev</span>
        <BarButton onClick={sim.restart} title="Restart"><RotateCcw className="size-3.5" /></BarButton>
        <BarButton onClick={() => sim.setPaused(!state.paused)}>{state.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</BarButton>
        <BarButton onClick={sim.skip} title="Skip to the next step"><FastForward className="size-3.5" /> skip</BarButton>
        {[1, 2, 4].map((s) => (
          <BarButton key={s} active={state.speed === s} onClick={() => sim.setSpeed(s)}>{s}×</BarButton>
        ))}
        <span className="mx-1 h-5 w-px bg-white/15" />
        {state.pack.stages.map((st, i) => (
          <BarButton key={st.id} onClick={() => sim.jumpToStage(i)} title={`Jump to round ${i + 1}`}>R{i + 1}</BarButton>
        ))}
        <BarButton onClick={() => sim.jumpToStage(1, { asSpectator: true })} title="Knocked out after round 1"><Eye className="size-3.5" /> out</BarButton>
        <span className="mx-1 h-5 w-px bg-white/15" />
        {(['phone', 'host', 'both'] as const).map((v) => (
          <BarButton key={v} active={view === v} onClick={() => setView(v)}>{v}</BarButton>
        ))}
        <span className="mx-1 h-5 w-px bg-white/15" />
        {(['ka', 'en'] as const).map((l) => (
          <BarButton key={l} active={locale === l} onClick={() => setLocale(l)}>{l}</BarButton>
        ))}
        <span className="mx-1 h-5 w-px bg-white/15" />
        <BarButton active={!useReal} onClick={() => setUseReal(false)}>invented</BarButton>
        <BarButton active={useReal} onClick={() => real && setUseReal(true)} title={real ? 'Real questions from the private pack' : 'No public/dev-data/live-show.json'}>
          real{real ? '' : ' (none)'}
        </BarButton>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <BarButton active={mood === null} onClick={() => setMood(null)} title="Hosts react to how the crowd really did">hosts: auto</BarButton>
        <BarButton active={mood === 'great'} onClick={() => setMood('great')}>cheer</BarButton>
        <BarButton active={mood === 'bad'} onClick={() => setMood('bad')}>angry</BarButton>
        <BarButton active={mood === 'disaster'} onClick={() => setMood('disaster')}>smash</BarButton>
      </div>

      <div className={cn('mx-auto flex w-full gap-6 px-4 py-6', view === 'both' ? 'max-w-[1600px] flex-col xl:flex-row xl:items-start' : 'max-w-5xl flex-col')}>
        {view !== 'host' && (
          <div className={cn('mx-auto w-full shrink-0', view === 'both' ? 'max-w-[430px] overflow-hidden rounded-[32px] border-4 border-white/10 bg-black/30' : 'max-w-xl')}>
            <div className={view === 'both' ? 'max-h-[86vh] min-h-[720px] overflow-y-auto' : ''}>
              <PlayerView state={state} locale={locale} sim={sim} />
            </div>
          </div>
        )}
        {view !== 'phone' && (
          <div className="w-full min-w-0 flex-1">
            <HostScreen state={state} locale={locale} moodOverride={mood} />
            <p className="mt-2 font-poppins text-xs font-bold text-white/40">Host screen (16:9 for OBS). Viewers see it on the stream a few seconds late; they answer on their phones.</p>
          </div>
        )}
      </div>
    </div>
  );
}
