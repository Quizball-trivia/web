'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FootballGridDevPreview, PREVIEW_STATE } from '@/features/football-grid/FootballGridDevPreview';
import { MatchBoard, FootballGridTurnPanel } from '@/features/football-grid/FootballGridFlowScreen';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { useDevGameAudio } from './DevGameAudio';

const ANSWERS = ['Thierry Henry', 'Gabriel Jesus', 'Santi Cazorla', 'Antoine Griezmann', 'Neymar', 'Xavi', 'Karim Benzema', 'Vinicius Junior', 'Sergio Ramos'];
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const SELF = 'preview-self';
const RIVAL = 'preview-rival';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function initialState(): FootballGridState { return { ...PREVIEW_STATE, claims: [], turnNumber: 1, stateVersion: 1, turnRemainingMs: 20000 }; }
function outcome(claims: FootballGridState['claims']) {
  for (const user of [SELF, RIVAL]) if (LINES.some(line => line.every(cell => claims.some(c => c.cellIndex === cell && c.claimantUserId === user)))) return user === SELF ? 'win' : 'lose';
  return claims.length === 9 ? 'draw' : null;
}

export function TicTacToeSoundHarness() {
  const [scenarios, setScenarios] = useState(false);
  const audio = useDevGameAudio();
  return <><div className="relative z-[230] flex gap-3 bg-[#111813] p-3 text-sm text-white"><button className="rounded border border-white/30 px-3 py-2" onClick={() => { audio?.cancel(); setScenarios(false); }}>Play sound match</button><button className="rounded border border-white/30 px-3 py-2" onClick={() => { audio?.cancel(); setScenarios(true); }}>UI scenarios</button></div>{scenarios ? <FootballGridDevPreview /> : <PlayableGrid />}</>;
}

function PlayableGrid() {
  const audio = useDevGameAudio();
  const audioRef = useRef(audio);
  useEffect(() => { audioRef.current = audio; }, [audio]);
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [seconds, setSeconds] = useState(20);
  const [started, setStarted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const locked = useRef(false);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, delay: number) => { timers.current.push(setTimeout(fn, delay)); };
  function finish(value: 'win' | 'lose' | 'draw') {
    setResult(value); setBusy(false); audioRef.current?.emit(value);
  }
  function rivalTurn(current: FootballGridState) {
    const terminal = outcome(current.claims);
    if (terminal) { finish(terminal); return; }
    const cell = [4, 8, 6, 3, 5, 7, 0, 1, 2].find(index => !current.claims.some(c => c.cellIndex === index));
    if (cell === undefined) { finish('draw'); return; }
    const next: FootballGridState = { ...current, turnNumber: current.turnNumber + 1, currentPlayerUserId: SELF, claims: [...current.claims, { cellIndex: cell, footballPlayerId: `fixture-${cell}`, displayName: ANSWERS[cell], claimantUserId: RIVAL, turnNumber: current.turnNumber }] };
    setState(next); audioRef.current?.emit('reveal');
    const end = outcome(next.claims);
    later(() => {
      if (end) { finish(end); return; }
      setBusy(false); locked.current = false; setSelected(null); setAnswer(''); setFeedback(undefined); setSeconds(20); audioRef.current?.emit('turn');
    }, 750);
  }
  function takeTurn(correct: boolean, timeout = false) {
    if (locked.current || !started || result) return;
    locked.current = true; setBusy(true);
    setFeedback(timeout ? undefined : correct ? 'correct' : 'wrong');
    audioRef.current?.emit(timeout ? 'timeout' : correct ? 'correct' : 'wrong');
    const next: FootballGridState = { ...state, turnNumber: state.turnNumber + 1, currentPlayerUserId: RIVAL, claims: correct && selected !== null ? [...state.claims, { cellIndex: selected, footballPlayerId: `fixture-${selected}`, displayName: ANSWERS[selected], claimantUserId: SELF, turnNumber: state.turnNumber }] : state.claims };
    setState(next);
    later(() => rivalTurn(next), 1500);
  }
  const timeoutRef = useRef(() => {});
  useEffect(() => { timeoutRef.current = () => takeTurn(false, true); });
  useEffect(() => {
    if (!started || busy || result) return;
    const timer = setInterval(() => { if (!document.hidden) setSeconds(value => Math.max(0, value - 1)); }, 1000);
    return () => clearInterval(timer);
  }, [started, busy, result]);
  useEffect(() => {
    if (!started || busy || result) return;
    if (seconds === 0) timeoutRef.current();
    else if (seconds <= 3) audioRef.current?.emit('tick');
  }, [seconds, started, busy, result]);
  function restart() {
    clear(); audio?.cancel(); locked.current = false; setState(initialState()); setSelected(null); setAnswer(''); setFeedback(undefined); setResult(null); setBusy(false); setSeconds(20); setStarted(true); audio?.emit('start');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === null || !answer.trim() || busy) return;
    const expected = normalize(ANSWERS[selected]);
    const value = normalize(answer);
    takeTurn(value === expected || value === expected.split(' ').at(-1));
  }
  return <main className="min-h-dvh bg-[#101b23] px-4 pb-72 pt-6 text-white"><div className="mx-auto max-w-xl">
    <p className="text-xs font-bold uppercase tracking-widest text-lime-300">Tic Tac Toe · sound playground</p>
    <h1 className="mt-2 text-2xl font-bold">Play a quick match</h1>
    <p className="my-3 text-sm text-white/60">Local practice with a scripted rival. Enable the sound mix, then start. This fixture accepts the names in the answer key.</p>
    <div className="my-4 flex items-center justify-between"><button className="rounded-xl bg-lime-300 px-4 py-2 font-bold text-black" onClick={restart}>{started ? 'Restart match' : 'Start match'}</button><strong role="status">{result ? result === 'win' ? 'You won!' : result === 'lose' ? 'Rival won' : 'Draw' : !started ? 'Ready when you are' : busy ? 'Rival turn…' : `Your turn · ${seconds}s`}</strong></div>
    <MatchBoard state={{ ...state, currentPlayerUserId: started && !busy && !result ? SELF : RIVAL }} selfUserId={SELF} locale="en" selectedCell={selected} onSelect={cell => { if (!started || busy || result) return; setSelected(cell); setAnswer(''); setFeedback(undefined); audio?.emit('select'); }} />
    {started && !result && <FootballGridTurnPanel state={state} locale="en" isMyTurn={!busy} selectedCell={selected} answer={answer} onAnswerChange={setAnswer} onSubmit={submit} feedback={feedback} pending={busy} onCancel={() => { setSelected(null); setAnswer(''); audio?.emit('select'); }} />}
    <details className="mt-5 rounded-xl border border-white/20 p-4 text-sm"><summary>Practice answer key</summary><ol className="mt-3 grid grid-cols-3 gap-3">{ANSWERS.map((name, i) => <li key={name}>{i + 1}. {name}</li>)}</ol><p className="mt-3 text-white/50">Cell numbers run left to right, top to bottom. Wrong answers spend your turn.</p></details>
    <details className="mt-4 text-sm"><summary>Test result sounds</summary><div className="mt-3 flex gap-3">{(['win', 'lose', 'draw'] as const).map(value => <button className="rounded border border-white/20 px-4 py-2" key={value} onClick={() => { clear(); locked.current = true; finish(value); }}>{value}</button>)}</div></details>
  </div></main>;
}
