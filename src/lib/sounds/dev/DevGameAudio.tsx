'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ASSET_BY_ID, SOUND_ASSETS } from '../lab/catalog';
import { PreviewPlayer } from '../lab/previewPlayer';
import { GameSoundOverrideContext } from '../GameSoundOverrideContext';
import { stopBgm, type SoundName } from '../gameSounds';
import { DEV_SOUND_PROFILES, EVENT_LABELS, EXISTING_EVENT_MAP, HARNESS_LINKS, type DevSoundEvent, type DevSoundMode } from './profiles';
import { useDevSoundMix } from './useDevSoundMix';
import styles from './devAudio.module.css';

interface DevAudio {
  emit: (event: DevSoundEvent, key?: string) => void;
  cancel: () => void;
}
const DevAudioContext = createContext<DevAudio | null>(null);
export const useDevGameAudio = () => useContext(DevAudioContext);
const noMusic = () => {};

export function DevGameAudioProvider({ mode, children }: { mode: DevSoundMode; children: ReactNode }) {
  // The provider is used only by development routes, and cannot replace live audio.
  if (process.env.NODE_ENV !== 'development') return <>{children}</>;
  return <DevGameAudioSession key={mode} mode={mode}>{children}</DevGameAudioSession>;
}

function DevGameAudioSession({ mode, children }: { mode: DevSoundMode; children: ReactNode }) {
  const [player] = useState(() => new PreviewPlayer());
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [volume, setVolume] = useState(30);
  const [mix, setMix] = useDevSoundMix(mode);
  const [log, setLog] = useState<Array<{ event: DevSoundEvent; sound: string; time: string }>>([]);
  const [error, setError] = useState('');
  const seen = useRef(new Set<string>());
  const generation = useRef(0);
  const lastEvent = useRef<{ event: string; at: number } | null>(null);

  const cancel = useCallback(() => { generation.current++; player.stop(); }, [player]);
  useEffect(() => { player.setVolume(volume / 100); }, [player, volume]);
  useEffect(() => {
    // Keep music out of the audition; does not change saved music preferences.
    stopBgm(0);
    const hidden = () => { if (document.hidden) cancel(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { cancel(); document.removeEventListener('visibilitychange', hidden); };
  }, [cancel]);

  const emit = useCallback((event: DevSoundEvent, key?: string) => {
    if (!enabled || document.hidden || !window.location.pathname.startsWith('/dev/')) return;
    if (key) {
      const dedupe = `${event}:${key}`;
      if (seen.current.has(dedupe)) return;
      if (seen.current.size > 500) seen.current.clear();
      seen.current.add(dedupe);
    }
    const now = performance.now();
    if (!key && lastEvent.current?.event === event && now - lastEvent.current.at < 100) return;
    lastEvent.current = { event, at: now };
    const id = mix[event];
    if (!id || id === 'silent') return;
    const asset = ASSET_BY_ID[id];
    if (!asset) return;
    setError('');
    setLog(previous => [{ event, sound: asset.label, time: new Date().toLocaleTimeString() }, ...previous].slice(0, 8));
    const token = ++generation.current;
    // Game feedback stays short even if a long source recording is selected.
    const maxSeconds = ['win', 'lose', 'draw', 'goal', 'auctionWon', 'finish'].includes(event) ? 4 : 2;
    void player.play(asset.path, maxSeconds).then(result => {
      if (token === generation.current && result === 'error') setError('Playback failed. Press Enable sound mix again to unlock audio.');
    });
  }, [enabled, mix, player]);
  const playSfx = useCallback((name: SoundName) => {
    const event = EXISTING_EVENT_MAP[name];
    if (event) emit(event);
  }, [emit]);
  const togglePreviewMute = useCallback(() => {
    cancel(); seen.current.clear(); setEnabled(!enabled);
    if (!enabled) setOpen(false);
    if (!enabled) { player.setVolume(volume / 100); void player.play('/sounds/quizup-reference/quizup-cue-14.wav', 1); }
    return enabled;
  }, [cancel, enabled, player, volume]);
  const isPreviewMuted = useCallback(() => !enabled, [enabled]);
  const override = useMemo(() => ({ playSfx, playEvent: emit, playBgm: noMusic, stopBgm: noMusic, toggleMute: togglePreviewMute, isMuted: isPreviewMuted }), [playSfx, emit, togglePreviewMute, isPreviewMuted]);
  const api = useMemo(() => ({ emit, cancel }), [emit, cancel]);

  return <GameSoundOverrideContext.Provider value={override}><DevAudioContext.Provider value={api}>
    {children}
    <div className={styles.dock}>
      <button className={styles.toggle} onClick={() => setOpen(value => !value)} aria-expanded={open}>{enabled ? '♫' : '♪'} {mode === 'grid' ? 'Tic Tac Toe' : mode === 'auction' ? 'Auction' : 'Ranked'} · sound mix {open ? '−' : '+'}</button>
      {open && <aside className={styles.panel} aria-label="Game sound mix">
        <div className={styles.heading}><strong>QuizUp {mode === 'auction' ? '+ Auction' : 'gameplay mix'}</strong><span>DEV ONLY</span></div>
        <p>Plays from game events. Cue names are proposed mappings; original QuizUp action names are unverified.</p>
        <div className={styles.controls}>
          <button className={styles.primary} onClick={togglePreviewMute}>{enabled ? 'Mute sound mix' : 'Enable sound mix'}</button>
          <button onClick={cancel}>Stop clip</button>
        </div>
        <label className={styles.volume}>Volume <input aria-label="Game preview volume" type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} />{volume}%</label>
        {mode === 'auction' && <p>Kept: bid coins, fold, sold bell and lot-win flourish. QuizUp: scouting reveal, urgency and match finish.</p>}
        {error && <p role="alert">{error}</p>}
        <details><summary>Change action sounds ({Object.keys(mix).length})</summary>
          {Object.entries(mix).map(([event, sound]) => <label className={styles.mapping} key={event}><button onClick={() => emit(event as DevSoundEvent)} aria-label={`Preview ${EVENT_LABELS[event as DevSoundEvent]}`}>▶ {EVENT_LABELS[event as DevSoundEvent]}</button><select aria-label={`Sound for ${EVENT_LABELS[event as DevSoundEvent]}`} value={sound} onChange={change => { cancel(); setMix(previous => ({ ...previous, [event]: change.target.value })); }}><option value="silent">Silent</option>{SOUND_ASSETS.filter(asset => asset.id !== 'quizup-full-recording').map(asset => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>)}
          <button onClick={() => { cancel(); setMix({ ...DEV_SOUND_PROFILES[mode] }); }}>Reset this mix</button>
        </details>
        <div className={styles.log} aria-live="polite"><strong>Last game cues</strong>{log.length ? log.map((entry, i) => <div key={`${entry.time}-${i}`}><span>{EVENT_LABELS[entry.event]}</span><small>{entry.sound}</small></div>) : <p>Enable audio, then play or trigger a scenario.</p>}</div>
        <nav>{Object.entries(HARNESS_LINKS).map(([id, href]) => <Link key={id} href={href}>{id === 'grid' ? 'Tic Tac Toe' : id}</Link>)}<Link href="/dev/sounds/play">Hub ↗</Link></nav>
      </aside>}
    </div>
  </DevAudioContext.Provider></GameSoundOverrideContext.Provider>;
}
