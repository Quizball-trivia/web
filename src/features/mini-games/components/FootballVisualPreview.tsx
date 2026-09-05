'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ROAD_FINISH_MS } from '../lib/footballMotion';
import type { RoadPitchPhase } from './RoadToGoalPitch';

import type { KeeperSaveStyle } from '../lib/keeperSaves';
import { FOOTBALL_STYLES, FREE_KICK_PLAYERS, type FootballStyle } from '../lib/footballActions';

const ModelStudio = dynamic(() => import('./FootballModelStudio').then(m => m.FootballModelStudio), { ssr: false });
const RoadPitch = dynamic(() => import('./RoadToGoalPitch').then(m => m.RoadToGoalPitch), { ssr: false });
const FreeKickPitch = dynamic(() => import('./FinalThirdPitch3D').then(m => m.FinalThirdPitch3D), { ssr: false });
const labels = { liveRoute: 'LIVE RUN', safe: 'CLEARED', target: 'NEXT DEFENDER' };
const button = 'rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:border-lime-300 hover:text-lime-300 disabled:opacity-30';

/** Local art review: exercises the actual game scenes without starting a run. */
export function FootballVisualPreview() {
  const [mode, setMode] = useState<'road' | 'kicks' | 'studio'>('road');
  const [road, setRoad] = useState<{ progress: number; phase: RoadPitchPhase }>({ progress: 0, phase: 'idle' });
  const [shot, setShot] = useState<{ id: string; x: number; y: number } | null>(null);
  const [save, setSave] = useState(false);
  const [saveStyle, setSaveStyle] = useState<KeeperSaveStyle>('catch');
  const [settled, setSettled] = useState(false);
  const [seed, setSeed] = useState(0);
  const [actionStyle, setActionStyle] = useState<FootballStyle>('power');
  useEffect(() => {
    if (road.phase !== 'correct' && road.phase !== 'tackle') return;
    const timer = window.setTimeout(() => setRoad(previous => previous.phase === 'correct'
      ? { progress: previous.progress + 1, phase: previous.progress === 10 ? 'complete' : 'decision' }
      : { ...previous, phase: 'tackled' }), road.progress === 10 ? ROAD_FINISH_MS : 1150);
    return () => window.clearTimeout(timer);
  }, [road.phase, road.progress]);
  useEffect(() => {
    if (!shot) return;
    const timer = window.setTimeout(() => setSettled(true), 2300);
    return () => window.clearTimeout(timer);
  }, [shot]);
  const resetShot = () => { setShot(null); setSettled(false); };
  const busy = road.phase === 'correct' || road.phase === 'tackle';
  return (
    <main className="min-h-dvh bg-surface-page px-4 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.3em] text-lime-300">Quizball / Stadium sessions</p><h1 className="font-poppins text-3xl font-bold sm:text-4xl">Under the lights.</h1><p className="mt-2 text-sm text-slate-400">Player models, match lighting and motion. Pick a game and try the action.</p></div>
          <nav aria-label="Game" className="flex flex-wrap gap-2">
            <button className={button} aria-pressed={mode === 'road'} onClick={() => setMode('road')}>Road to Goal</button>
            <button className={button} aria-pressed={mode === 'kicks'} onClick={() => setMode('kicks')}>Free Kicks</button>
            <button className={button} aria-pressed={mode === 'studio'} onClick={() => setMode('studio')}>Model studio</button>
          </nav>
        </header>
        {mode === 'studio' ? <ModelStudio /> : mode === 'road' ? <RoadPitch key={actionStyle} {...road} labels={labels} actionStyle={actionStyle} /> : <FreeKickPitch picking={!shot} showZones={!shot} revealedSave={null} scouting={false} shotZone={shot} willSave={shot ? save : null} resolving={!!shot && !settled} settled={settled} scored={shot ? !save : null} kickSeed={seed} saveStyle={saveStyle} onPick={setShot} />}
        <div className={`mt-5 flex-wrap items-center gap-3 ${mode === 'studio' ? 'hidden' : 'flex'}`}>
          {mode === 'road' ? <>
            <label className="flex w-full items-center gap-3 text-sm text-slate-300">Player style<select aria-label="Player style" disabled={busy} value={actionStyle} onChange={event => { setActionStyle(event.target.value as FootballStyle); setRoad({ progress: 10, phase: 'question' }); }} className="min-w-0 rounded-xl border border-white/20 bg-surface-input px-3 py-2 text-white">{Object.entries(FOOTBALL_STYLES).map(([value, style]) => <option key={value} value={value}>{style.label}</option>)}</select></label>
            <button className={button} disabled={busy || road.progress >= 11 || road.phase === 'tackled'} onClick={() => setRoad(p => ({ ...p, phase: 'correct' }))}>{road.progress === 10 ? 'Shoot · goal' : 'Beat defender'}</button>
            <button className={button} disabled={busy || road.progress >= 11 || road.phase === 'tackled'} onClick={() => setRoad(p => ({ ...p, phase: 'tackle' }))}>{road.progress === 10 ? 'Shoot · saved' : 'Play tackle'}</button>
            <button className={button} disabled={busy} onClick={() => setRoad({ progress: 10, phase: 'question' })}>Final keeper</button>
            <button className={button} onClick={() => setRoad({ progress: 0, phase: 'idle' })}>Reset run</button>
            <span className="ml-auto text-sm text-slate-400">Zone {Math.min(11, road.progress + 1)} / 11</span>
          </> : <>
            <label className="flex w-full items-center gap-3 text-sm text-slate-300">Player<select aria-label="Free-kick player" value={seed % FREE_KICK_PLAYERS.length} onChange={event => { resetShot(); setSeed(Number(event.target.value)); }} className="rounded-xl border border-white/20 bg-surface-input px-3 py-2 text-white">{FREE_KICK_PLAYERS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
            <label className="flex w-full items-center gap-3 text-sm text-slate-300">Keeper save<select aria-label="Keeper save" disabled={!!shot} value={saveStyle} onChange={event => { setSaveStyle(event.target.value as KeeperSaveStyle); setSave(true); }} className="rounded-xl border border-white/20 bg-surface-input px-3 py-2 text-white"><option value="catch">Catch and hold</option><option value="parry">Strong-hand parry</option><option value="tip">Fingertip deflection</option></select></label>
            <button className={button} onClick={resetShot}>Reset shot</button>
            <button className={button} disabled={!!shot} aria-pressed={save} onClick={() => setSave(s => !s)}>Outcome: {save ? 'save' : 'goal'}</button>
            <button className={button} onClick={() => { resetShot(); setSeed(s => s + 1); }}>Next player</button>
            <span className="ml-auto text-sm text-slate-400">Choose a target in the goal.</span>
          </>}
        </div>
      </div>
    </main>
  );
}
