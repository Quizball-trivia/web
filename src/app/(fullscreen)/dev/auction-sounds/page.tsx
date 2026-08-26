'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Howl } from 'howler';
import {
  BellRing,
  Check,
  CircleDollarSign,
  Eye,
  Flag,
  Gavel,
  Music2,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { isMuted, subscribeMuted, type SoundName } from '@/lib/sounds/gameSounds';

type AuctionCueName = Extract<SoundName, `auction${string}`>;

interface SoundCandidate {
  id: string;
  label: string;
  asset: string;
  soundName?: AuctionCueName;
  src?: string;
  volume?: number;
}

interface Cue {
  name: AuctionCueName;
  title: string;
  moment: string;
  accent: string;
  icon: LucideIcon;
  recommended: string;
  candidates: SoundCandidate[];
}

const MIXKIT_SOUND_ROOT = '/sounds/auction/mixkit-free';

const CUES: Cue[] = [
  {
    name: 'auctionClue',
    title: 'Stat revealed',
    moment: 'Each new scouting stat lands',
    accent: '#22D3EE',
    icon: Eye,
    recommended: 'stat-player-select',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Selected player', soundName: 'auctionClue' },
      { id: 'stat-select', label: 'A · Paddle selected', asset: 'Modern technology select · Mixkit', src: `${MIXKIT_SOUND_ROOT}/stat-select.mp3`, volume: 0.3 },
      { id: 'stat-player-select', label: 'B · Player selected', asset: 'Player select notification · Mixkit', src: `${MIXKIT_SOUND_ROOT}/stat-player-select.mp3`, volume: 0.3 },
    ],
  },
  {
    name: 'auctionBid',
    title: 'Bid accepted',
    moment: 'The highest bid increases',
    accent: '#FFE500',
    icon: CircleDollarSign,
    recommended: 'bid-coins-handling',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Money handled', soundName: 'auctionBid' },
      { id: 'bid-clinking-coins', label: 'A · Bid coins', asset: 'Clinking coins · Mixkit', src: `${MIXKIT_SOUND_ROOT}/bid-clinking-coins.mp3`, volume: 0.36 },
      { id: 'bid-coins-handling', label: 'B · Money handled', asset: 'Coins handling · Mixkit', src: `${MIXKIT_SOUND_ROOT}/bid-coins-handling.mp3`, volume: 0.34 },
    ],
  },
  {
    name: 'auctionFold',
    title: 'Player folds',
    moment: 'A bidder leaves the current lot',
    accent: '#A78BFA',
    icon: Flag,
    recommended: 'fold-paper-slide',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Paddle put down', soundName: 'auctionFold' },
      { id: 'fold-paper-slide', label: 'A · Paddle put down', asset: 'Paper slide · Mixkit', src: `${MIXKIT_SOUND_ROOT}/fold-paper-slide.mp3`, volume: 0.32 },
      { id: 'fold-short-whoosh', label: 'B · Exit sweep', asset: 'Short wind swoosh · Mixkit', src: `${MIXKIT_SOUND_ROOT}/fold-short-whoosh.mp3`, volume: 0.28 },
    ],
  },
  {
    name: 'auctionWarning',
    title: 'Decision warning',
    moment: 'Solo pick or final decision begins',
    accent: '#FF8A00',
    icon: Timer,
    recommended: 'warning-racing-countdown',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Racing countdown', soundName: 'auctionWarning' },
      { id: 'warning-clock-tick', label: 'A · Final clock tick', asset: 'Clock ticker single · Mixkit', src: `${MIXKIT_SOUND_ROOT}/warning-clock-tick.mp3`, volume: 0.34 },
      { id: 'warning-racing-countdown', label: 'B · Racing countdown', asset: 'Racing countdown timer · Mixkit', src: `${MIXKIT_SOUND_ROOT}/warning-racing-countdown.mp3`, volume: 0.28 },
    ],
  },
  {
    name: 'auctionReveal',
    title: 'Lot sold',
    moment: 'The footballer and winning bid reveal',
    accent: '#FF4B4B',
    icon: Gavel,
    recommended: 'sold-service-bell',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Auction bell', soundName: 'auctionReveal' },
      { id: 'sold-wood-hit', label: 'A · Sold! Gavel', asset: 'Wood hard hit · Mixkit', src: `${MIXKIT_SOUND_ROOT}/sold-wood-hit.mp3`, volume: 0.46 },
      { id: 'sold-service-bell', label: 'B · Auction bell', asset: 'Service bell · Mixkit', src: `${MIXKIT_SOUND_ROOT}/sold-service-bell.mp3`, volume: 0.34 },
    ],
  },
  {
    name: 'auctionWon',
    title: 'You win the player',
    moment: 'Your bid wins the current lot',
    accent: '#58CC02',
    icon: Trophy,
    recommended: 'won-casino-bling',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Big acquisition', soundName: 'auctionWon' },
      { id: 'won-casino-bling', label: 'A · Big acquisition', asset: 'Casino bling achievement · Mixkit', src: `${MIXKIT_SOUND_ROOT}/won-casino-bling.mp3`, volume: 0.3 },
      { id: 'won-payout-ding', label: 'B · Winning payout', asset: 'Payout award ding · Mixkit', src: `${MIXKIT_SOUND_ROOT}/won-payout-ding.mp3`, volume: 0.28 },
    ],
  },
  {
    name: 'auctionFinished',
    title: 'Auction complete',
    moment: 'Final squads and results are ready',
    accent: '#FFFFFF',
    icon: BellRing,
    recommended: 'finish-crowd-ovation',
    candidates: [
      { id: 'current', label: 'Current', asset: 'Winner ovation', soundName: 'auctionFinished' },
      { id: 'finish-crowd-cheer', label: 'A · Room celebrates', asset: 'Male crowd cheering short · Mixkit', src: `${MIXKIT_SOUND_ROOT}/finish-crowd-cheer.mp3`, volume: 0.24 },
      { id: 'finish-crowd-ovation', label: 'B · Winner ovation', asset: 'Small crowd ovation · Mixkit', src: `${MIXKIT_SOUND_ROOT}/finish-crowd-ovation.mp3`, volume: 0.22 },
    ],
  },
];

const DEFAULT_SELECTIONS = Object.fromEntries(
  CUES.map((cue) => [cue.name, cue.recommended]),
) as Record<AuctionCueName, string>;

const SEQUENCE: Array<{ delay: number; cue: AuctionCueName }> = [
  { delay: 0, cue: 'auctionClue' },
  { delay: 850, cue: 'auctionClue' },
  { delay: 1750, cue: 'auctionBid' },
  { delay: 2500, cue: 'auctionBid' },
  { delay: 3350, cue: 'auctionFold' },
  { delay: 4250, cue: 'auctionWarning' },
  { delay: 5400, cue: 'auctionReveal' },
  { delay: 6500, cue: 'auctionWon' },
  { delay: 7500, cue: 'auctionFinished' },
];

function findCandidate(cueName: AuctionCueName, candidateId: string): SoundCandidate | undefined {
  return CUES.find((cue) => cue.name === cueName)?.candidates.find((candidate) => candidate.id === candidateId);
}

export default function AuctionSoundsPage() {
  const { playBgm, playSfx, stopBgm, setBgmVolume, toggleMute } = useGameSounds();
  const [musicPlaying, setMusicPlaying] = useState(false);
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const [volume, setVolume] = useState(0.025);
  const [activeChoice, setActiveChoice] = useState<string | null>(null);
  const [selections, setSelections] = useState(DEFAULT_SELECTIONS);
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const timersRef = useRef<number[]>([]);
  const previewRef = useRef<Howl | null>(null);

  const stopPreview = useCallback(() => {
    previewRef.current?.stop();
    previewRef.current?.unload();
    previewRef.current = null;
  }, []);

  const clearSequence = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    stopPreview();
    setSequencePlaying(false);
    setActiveChoice(null);
  }, [stopPreview]);

  useEffect(() => {
    return () => {
      clearSequence();
      stopBgm(250);
    };
  }, [clearSequence, stopBgm]);

  const audition = useCallback((cueName: AuctionCueName, candidateId: string) => {
    const candidate = findCandidate(cueName, candidateId);
    if (!candidate) return;

    stopPreview();
    const activeId = `${cueName}:${candidateId}`;
    setActiveChoice(activeId);

    if (candidate.soundName) {
      playSfx(candidate.soundName);
      const timer = window.setTimeout(
        () => setActiveChoice((current) => current === activeId ? null : current),
        1100,
      );
      timersRef.current.push(timer);
      return;
    }

    if (!candidate.src) return;
    const sound = new Howl({
      src: [candidate.src],
      volume: candidate.volume ?? 0.3,
      preload: true,
      onend: () => {
        setActiveChoice((current) => current === activeId ? null : current);
        sound.unload();
        if (previewRef.current === sound) previewRef.current = null;
      },
      onloaderror: () => setActiveChoice(null),
      onplayerror: () => setActiveChoice(null),
    });
    previewRef.current = sound;
    sound.play();
  }, [playSfx, stopPreview]);

  const chooseAndPlay = useCallback((cueName: AuctionCueName, candidateId: string) => {
    setSelections((current) => ({ ...current, [cueName]: candidateId }));
    audition(cueName, candidateId);
  }, [audition]);

  const startMusic = useCallback(() => {
    playBgm('auction');
    setBgmVolume(volume);
    setMusicPlaying(true);
  }, [playBgm, setBgmVolume, volume]);

  const stopMusic = useCallback(() => {
    stopBgm(350);
    setMusicPlaying(false);
  }, [stopBgm]);

  const runSequence = useCallback(() => {
    clearSequence();
    setSequencePlaying(true);
    for (const item of SEQUENCE) {
      const timer = window.setTimeout(
        () => audition(item.cue, selections[item.cue]),
        item.delay,
      );
      timersRef.current.push(timer);
    }
    const doneTimer = window.setTimeout(() => {
      setSequencePlaying(false);
      setActiveChoice(null);
    }, 8500);
    timersRef.current.push(doneTimer);
  }, [audition, clearSequence, selections]);

  const handleVolume = useCallback((next: number) => {
    setVolume(next);
    setBgmVolume(next);
  }, [setBgmVolume]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070B1A] px-4 py-8 font-poppins text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden="true">
        <div className="absolute -left-28 top-8 size-[34rem] rounded-full bg-[#6D28D9]/30 blur-[130px]" />
        <div className="absolute -right-32 top-48 size-[30rem] rounded-full bg-[#1645FF]/25 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-48 w-[36rem] bg-[#FFE500]/10 blur-[110px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black, transparent 72%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-yellow">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-yellow text-[#070B1A]">
                <Music2 className="size-4" />
              </span>
              Auction audio lab
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] sm:text-6xl">
              Choose the sounds that <span className="text-brand-yellow">earn the bid.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
              Compare today’s sound with two auction-room candidates for every action. All new sounds are free for commercial use under the Mixkit Sound Effects licence.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-black uppercase transition ${
              muted
                ? 'border-brand-red/50 bg-brand-red/15 text-brand-red'
                : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/10'
            }`}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            {muted ? 'Audio muted' : 'Audio on'}
          </button>
        </header>

        <section className="mb-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#111936]/90 shadow-[0_24px_80px_rgba(0,0,0,.38)]">
          <div className="grid lg:grid-cols-[1.25fr_.75fr]">
            <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-[#1645FF] via-[#243FC6] to-[#6D28D9] p-6 sm:p-8">
              <div className="absolute -right-10 -top-16 size-64 rounded-full border-[36px] border-white/[0.06]" aria-hidden="true" />
              <div className="relative flex h-full flex-col justify-between gap-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">Background music</p>
                    <h2 className="mt-2 text-3xl font-black">Ranked stadium loop</h2>
                    <p className="mt-2 text-sm font-semibold text-white/65">The same low-volume competitive bed used by ranked matches.</p>
                  </div>
                  <div className={`flex h-14 items-end gap-1 rounded-xl bg-black/25 px-3 py-3 ${musicPlaying ? '' : 'opacity-40'}`} aria-hidden="true">
                    {[14, 26, 18, 32, 22, 29, 16].map((height, index) => (
                      <span
                        key={height + index}
                        className={`w-1.5 rounded-full bg-brand-yellow ${musicPlaying ? 'animate-pulse' : ''}`}
                        style={{ height, animationDelay: `${index * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={musicPlaying ? stopMusic : startMusic}
                      className="flex h-12 items-center gap-2 rounded-xl bg-brand-yellow px-5 text-sm font-black uppercase text-[#070B1A] transition hover:-translate-y-0.5"
                    >
                      {musicPlaying ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                      {musicPlaying ? 'Stop loop' : 'Play loop'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolume(0.025)}
                      className="flex size-12 items-center justify-center rounded-xl bg-black/25 text-white/75 transition hover:bg-black/40 hover:text-white"
                      title="Reset ranked volume"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  </div>
                  <label className="min-w-52 flex-1">
                    <span className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-wider text-white/55">
                      Music volume <span>{Math.round(volume * 1000) / 10}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="0.1"
                      step="0.005"
                      value={volume}
                      onChange={(event) => handleVolume(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer accent-brand-yellow"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-7 bg-[#0C1229] p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2 text-brand-yellow">
                  <Sparkles className="size-5" />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Your selected mix</p>
                </div>
                <h2 className="mt-3 text-2xl font-black">Hear one complete lot</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/50">
                  The sequence uses whichever candidate is currently selected on each action card below.
                </p>
              </div>
              <button
                type="button"
                onClick={sequencePlaying ? clearSequence : runSequence}
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-brand-blue text-sm font-black uppercase transition hover:bg-[#2F57FF]"
              >
                {sequencePlaying ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                {sequencePlaying ? 'Stop sequence' : 'Play selected mix'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">A/B listening board</p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">Pick one sound per action</h2>
            </div>
            <p className="hidden text-right text-xs font-bold uppercase tracking-wider text-white/35 sm:block">7 actions · 21 choices</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {CUES.map((cue) => {
              const Icon = cue.icon;
              return (
                <article
                  key={cue.name}
                  className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#101831] p-5 sm:p-6"
                >
                  <div
                    className="absolute -right-12 -top-14 size-40 rounded-full opacity-10 blur-2xl"
                    style={{ backgroundColor: cue.accent }}
                    aria-hidden="true"
                  />
                  <div className="relative mb-5 flex items-start gap-4">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ color: cue.accent, backgroundColor: `${cue.accent}18` }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black">{cue.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/45">{cue.moment}</p>
                    </div>
                  </div>

                  <div className="relative grid gap-2 sm:grid-cols-3">
                    {cue.candidates.map((candidate) => {
                      const selected = selections[cue.name] === candidate.id;
                      const active = activeChoice === `${cue.name}:${candidate.id}`;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => chooseAndPlay(cue.name, candidate.id)}
                          className={`group flex min-h-24 flex-col rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                            selected
                              ? 'border-white/35 bg-white/[0.09]'
                              : 'border-white/[0.08] bg-black/15 hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                          style={{ boxShadow: active ? `0 0 0 2px ${cue.accent}` : undefined }}
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="text-xs font-black">{candidate.label}</span>
                            <span
                              className="flex size-6 shrink-0 items-center justify-center rounded-full"
                              style={{ color: selected ? '#070B1A' : cue.accent, backgroundColor: selected ? cue.accent : `${cue.accent}18` }}
                            >
                              {selected ? <Check className="size-3.5 stroke-[3]" /> : <Play className="size-3 fill-current" />}
                            </span>
                          </span>
                          <span className="mt-auto pt-3 text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-white/35">
                            {candidate.asset}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 py-6 text-xs font-semibold text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>Dev-only listening room · audio follows the global mute preference</span>
          <a
            href="https://mixkit.co/license/"
            target="_blank"
            rel="noreferrer"
            className="font-black uppercase tracking-wider text-brand-yellow transition hover:text-white"
          >
            New candidates: Mixkit Free License
          </a>
        </footer>
      </div>
    </main>
  );
}
