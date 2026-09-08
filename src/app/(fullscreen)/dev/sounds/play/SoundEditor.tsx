'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Square, GripVertical, VolumeX, X, ArrowUpRight } from 'lucide-react';
import { ASSET_BY_ID, SOUND_ASSETS, SOURCE_LABELS } from '@/lib/sounds/lab/catalog';
import { DEV_SOUND_PROFILES, EVENT_LABELS, HARNESS_LINKS, type DevSoundMode, type DevSoundEvent } from '@/lib/sounds/dev/profiles';
import { useDevSoundMix } from '@/lib/sounds/dev/useDevSoundMix';
import { SoundPreviewProvider, useSoundPreview } from './SoundPreviews';
import styles from './editor.module.css';

const MODES: Record<DevSoundMode, string> = { ranked: 'Ranked', grid: 'Tic Tac Toe', auction: 'Auction' };
const MIME = 'application/x-quizball-sound';
export default function SoundEditor() {
  return <SoundPreviewProvider><Editor /></SoundPreviewProvider>;
}
function PreviewButton({ id, itemKey, label }: { id: string; itemKey: string; label: string }) {
  const preview = useSoundPreview();
  const playing = preview?.active === itemKey;
  return <button className={styles.play} disabled={id === 'silent'} aria-label={`${playing ? 'Stop' : 'Play'} ${label}`} aria-pressed={playing} onClick={() => preview?.toggle(itemKey, id)}>{playing ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>;
}
function Editor() {
  const [mode, setMode] = useState<DevSoundMode>('ranked');
  const [mix, setMix] = useDevSoundMix(mode);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [notice, setNotice] = useState('Your choices apply to the dev games and save on this device.');
  const preview = useSoundPreview();
  const filtered = SOUND_ASSETS.filter(asset => (source === 'all' || asset.source === source) && `${asset.label} ${asset.description}`.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = selected === 'silent' ? 'Silence' : selected ? ASSET_BY_ID[selected]?.label : null;
  function assign(event: string, id: string) {
    if (id !== 'silent' && !Object.hasOwn(ASSET_BY_ID, id)) return;
    preview?.stop();
    setMix(previous => ({ ...previous, [event]: id }));
    setNotice(`${MODES[mode]} · ${EVENT_LABELS[event as DevSoundEvent]} → ${id === 'silent' ? 'Silent' : ASSET_BY_ID[id].label}`);
  }
  return <>
    <header className={styles.header}><div><p className={styles.eyebrow}>THE SOUND DESK</p><h1>Give every action<br /><em>its own sound.</em></h1><p className={styles.intro}>Drag a sound onto an event. Or select a sound, then tap an event to assign it. Press ▶ to listen.</p></div><Link className={styles.libraryLink} href="/dev/sounds?view=library">Full sound library <ArrowUpRight size={16} /></Link></header>
    <div className={styles.status} role="status"><span className={styles.dot} />{notice}</div>
    <div className={styles.workspace}>
      <section className={styles.events} aria-label="Game events">
        <div className={styles.tabs} role="tablist" aria-label="Game mode">{Object.entries(MODES).map(([id, label]) => <button role="tab" aria-selected={mode === id} key={id} onClick={() => { preview?.stop(); setMode(id as DevSoundMode); setOver(null); }}>{label}</button>)}</div>
        <div className={styles.sectionHeader}><div><h2>{MODES[mode]} events <small>{Object.keys(mix).length}</small></h2><p>Drop here to assign · × makes an event silent</p></div><Link href={HARNESS_LINKS[mode]} className={styles.gameLink}>Test game <ArrowUpRight size={15} /></Link></div>
        {selected && <div className={styles.selectedNotice}><span>Selected: <strong>{selectedLabel}</strong><br />Tap any event below to use it.</span><button aria-label="Clear selected sound" onClick={() => setSelected(null)}><X size={16} /></button></div>}
        <div className={styles.eventList}>{Object.entries(mix).map(([event, id], index) => {
          const label = EVENT_LABELS[event as DevSoundEvent];
          return <div key={`${mode}:${event}`} data-event={event} className={`${styles.event} ${over === event ? styles.over : ''} ${selected ? styles.assignable : ''}`}
            onDragOver={e => { if (e.dataTransfer.types.includes(MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(event); } }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}
            onDrop={e => { e.preventDefault(); setOver(null); assign(event, e.dataTransfer.getData(MIME)); }}>
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            <button className={styles.eventTarget} aria-label={`Assign selected sound to ${label}`} aria-disabled={!selected} onClick={() => { if (selected) assign(event, selected); }}><strong>{label}</strong><span>{id === 'silent' ? 'Silent · drop a sound here' : ASSET_BY_ID[id]?.label}</span></button>
            <PreviewButton id={id} itemKey={`${mode}:${event}`} label={label} />
            <button className={styles.clear} disabled={id === 'silent'} aria-label={`Silence ${label}`} onClick={() => assign(event, 'silent')}><X size={15} /></button>
          </div>;
        })}</div>
        <div className={styles.footer}><button onClick={() => { preview?.stop(); setMix({ ...DEV_SOUND_PROFILES[mode] }); setNotice(`${MODES[mode]} reset to the latest defaults.`); }}>Reset {MODES[mode]}</button><span>Reusing a sound is fine. Assign it to as many events as you like.</span></div>
      </section>
      <aside className={styles.library} aria-label="Sounds to assign">
        <div className={styles.sectionHeader}><div><h2>All sounds <small>{SOUND_ASSETS.length}</small></h2><p>Drag by the grip, or select with a tap</p></div></div>
        <div className={styles.filters}><input aria-label="Search sounds" placeholder="Search sounds…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Sound source" value={source} onChange={e => setSource(e.target.value)}><option value="all">All sources</option>{Object.entries(SOURCE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
        <button className={`${styles.silence} ${selected === 'silent' ? styles.chosen : ''}`} aria-pressed={selected === 'silent'} draggable onDragStart={e => { e.dataTransfer.setData(MIME, 'silent'); e.dataTransfer.effectAllowed = 'copy'; }} onDragEnd={() => setOver(null)} onClick={() => setSelected('silent')}><VolumeX size={17} /><span>Silence <small>No sound for this event</small></span><GripVertical size={17} /></button>
        <div className={styles.soundList}>{filtered.map(asset => <div key={asset.id} data-sound={asset.id} className={`${styles.sound} ${selected === asset.id ? styles.chosen : ''}`} draggable onDragStart={e => { e.dataTransfer.setData(MIME, asset.id); e.dataTransfer.effectAllowed = 'copy'; }} onDragEnd={() => setOver(null)}>
          <GripVertical size={17} className={styles.grip} />
          <button className={styles.soundSelect} aria-label={`Select ${asset.label}`} aria-pressed={selected === asset.id} onClick={() => setSelected(asset.id)}><strong>{asset.label}</strong><small>{SOURCE_LABELS[asset.source]} · {asset.duration.toFixed(2)}s</small></button>
          <PreviewButton id={asset.id} itemKey={`library:${asset.id}`} label={asset.label} />
        </div>)}{!filtered.length && <p className={styles.empty}>No sounds match. Try another search or source.</p>}</div>
      </aside>
    </div>
    <p className={styles.note}>Dev previews only. QuizUp reference recordings have no verified release permission. Cue 15 is now the wrong-answer default; submit and new-question events are silent.</p>
  </>;
}
