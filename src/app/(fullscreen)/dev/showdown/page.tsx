'use client';

/**
 * Dev playground for iterating on the pre-match ShowdownScreen — the
 * "player VS opponent" intro card that plays right before a ranked or
 * friendly match begins.
 *
 * Mounts the real `ShowdownScreen` component with dummy player/opponent
 * data. A side panel exposes the most visually-relevant knobs (match
 * type, ranks, tier, country/club, recent form) so the layout can be
 * iterated on without running an actual matchmaking flow. Side panel
 * is hidden on mobile so the showdown reads full-screen for previewing
 * the responsive layout.
 *
 * Guarded by NODE_ENV — production code paths are untouched.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShowdownScreen } from '@/components/ShowdownScreen';

type MatchType = 'ranked' | 'friendly';
type FormResult = 'W' | 'L' | 'D';

const TIERS = [
  'Youth Prospect',
  'Reserve',
  'Bench',
  'Starter',
  'Captain',
  'Legend',
  'Icon',
  'GOAT',
] as const;

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'GE', name: 'Georgia' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
];

// Club IDs match the kebab-case slugs in `src/data/top5leagues-clubs.json`
// so `getClub()` resolves them and the showdown card renders the logo.
const CLUBS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'None' },
  { value: 'real-madrid', label: 'Real Madrid' },
  { value: 'fc-barcelona', label: 'Barcelona' },
  { value: 'manchester-united', label: 'Man United' },
  { value: 'manchester-city', label: 'Man City' },
  { value: 'liverpool-fc', label: 'Liverpool' },
  { value: 'arsenal-fc', label: 'Arsenal' },
];

export default function DevShowdownPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevShowdownContent />;
}

function DevShowdownContent() {
  const router = useRouter();

  const [matchType, setMatchType] = useState<MatchType>('ranked');
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'auto'>('auto');
  // Force remount when knobs change so the entrance animation replays.
  const [replayKey, setReplayKey] = useState(0);

  const [playerUsername, setPlayerUsername] = useState('Konstantine');
  const [playerRp, setPlayerRp] = useState(495);
  const [playerTier, setPlayerTier] = useState<string>('Youth Prospect');
  const [playerCountry, setPlayerCountry] = useState<string>('GE');
  const [playerClub, setPlayerClub] = useState<string | null>('real-madrid');
  const [playerForm, setPlayerForm] = useState<FormResult[]>(['W', 'L', 'W']);

  const [oppUsername, setOppUsername] = useState('Mock Opponent');
  const [oppRp, setOppRp] = useState(985);
  const [oppTier, setOppTier] = useState<string>('Bench');
  const [oppCountry, setOppCountry] = useState<string>('US');
  const [oppClub, setOppClub] = useState<string | null>('fc-barcelona');
  const [oppForm, setOppForm] = useState<FormResult[]>(['W', 'W', 'D']);

  const playerInfo = useMemo(
    () => ({
      username: playerUsername,
      avatar: 'avatar-1',
      avatarCustomization: null,
      rankPoints: matchType === 'ranked' ? playerRp : undefined,
      tier: matchType === 'ranked' ? playerTier : undefined,
      countryCode: playerCountry,
      favoriteClub: playerClub,
      recentForm: playerForm,
    }),
    [playerUsername, playerRp, playerTier, playerCountry, playerClub, playerForm, matchType]
  );

  const opponentInfo = useMemo(
    () => ({
      username: oppUsername,
      avatar: 'avatar-2',
      avatarCustomization: { jersey: 'jersey_red' } as const,
      rankPoints: matchType === 'ranked' ? oppRp : undefined,
      tier: matchType === 'ranked' ? oppTier : undefined,
      countryCode: oppCountry,
      favoriteClub: oppClub,
      recentForm: oppForm,
    }),
    [oppUsername, oppRp, oppTier, oppCountry, oppClub, oppForm, matchType]
  );

  return (
    <div className="relative min-h-dvh bg-surface-page">
      {/* Stage — the actual ShowdownScreen */}
      <div className="lg:pl-72">
        <ShowdownScreen
          key={`${replayKey}-${layout}`}
          playerUsername={playerUsername}
          playerAvatar="avatar-1"
          opponentUsername={oppUsername}
          opponentAvatar="avatar-2"
          matchType={matchType}
          onComplete={() => setReplayKey((k) => k + 1)}
          playerInfo={playerInfo}
          opponentInfo={opponentInfo}
          wrapperClassName="min-h-dvh"
          variant={layout}
        />
      </div>

      {/* Side panel — desktop only so mobile preview reads clean. */}
      <aside className="fixed left-4 top-4 bottom-4 z-[60] hidden w-64 overflow-y-auto rounded-2xl border border-surface-card-light bg-surface-card/95 p-4 shadow-2xl backdrop-blur font-fun lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-yellow-400">
            Showdown Lab
          </h2>
          <button
            onClick={() => router.push('/play')}
            className="text-[10px] font-bold uppercase tracking-wider text-brand-slate hover:text-white"
          >
            exit
          </button>
        </div>

        <Group label="Match type">
          <Segmented
            options={['ranked', 'friendly'] as const}
            value={matchType}
            onChange={setMatchType}
          />
        </Group>

        <Group label="Layout">
          <Segmented
            options={['auto', 'horizontal', 'vertical'] as const}
            value={layout}
            onChange={setLayout}
          />
          <p className="mt-1 text-[9px] text-brand-slate">
            Auto = vertical on mobile, horizontal on desktop (production
            default). Override to either to preview both layouts at the
            same viewport.
          </p>
        </Group>

        <Group label="Player (you)">
          <Input value={playerUsername} onChange={setPlayerUsername} placeholder="Username" />
          {matchType === 'ranked' && (
            <Slider min={0} max={3500} step={5} value={playerRp} onChange={setPlayerRp} label="RP" />
          )}
          {matchType === 'ranked' && (
            <Select value={playerTier} onChange={setPlayerTier} options={TIERS as unknown as string[]} label="Tier" />
          )}
          <Select
            value={playerCountry}
            onChange={setPlayerCountry}
            options={COUNTRIES.map((c) => c.code)}
            label="Country"
            labels={Object.fromEntries(COUNTRIES.map((c) => [c.code, `${c.code} · ${c.name}`]))}
          />
          <Select
            value={playerClub ?? 'none'}
            onChange={(v) => setPlayerClub(v === 'none' ? null : v)}
            options={CLUBS.map((c) => c.value ?? 'none')}
            label="Club"
            labels={Object.fromEntries(CLUBS.map((c) => [c.value ?? 'none', c.label]))}
          />
          <FormPicker value={playerForm} onChange={setPlayerForm} />
        </Group>

        <Group label="Opponent">
          <Input value={oppUsername} onChange={setOppUsername} placeholder="Username" />
          {matchType === 'ranked' && (
            <Slider min={0} max={3500} step={5} value={oppRp} onChange={setOppRp} label="RP" />
          )}
          {matchType === 'ranked' && (
            <Select value={oppTier} onChange={setOppTier} options={TIERS as unknown as string[]} label="Tier" />
          )}
          <Select
            value={oppCountry}
            onChange={setOppCountry}
            options={COUNTRIES.map((c) => c.code)}
            label="Country"
            labels={Object.fromEntries(COUNTRIES.map((c) => [c.code, `${c.code} · ${c.name}`]))}
          />
          <Select
            value={oppClub ?? 'none'}
            onChange={(v) => setOppClub(v === 'none' ? null : v)}
            options={CLUBS.map((c) => c.value ?? 'none')}
            label="Club"
            labels={Object.fromEntries(CLUBS.map((c) => [c.value ?? 'none', c.label]))}
          />
          <FormPicker value={oppForm} onChange={setOppForm} />
        </Group>

        <button
          onClick={() => setReplayKey((k) => k + 1)}
          className="mt-2 w-full rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_var(--color-brand-green-deep)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-brand-green-deep)]"
        >
          ▶ Replay animation
        </button>

        <p className="mt-3 text-[10px] leading-tight text-brand-slate">
          Auto-loops every 4.5s (onComplete fires a remount). Resize the
          browser to ≤640px to preview the mobile layout — side panel
          hides at &lt;1024px so the showdown reads full-screen.
        </p>
      </aside>

      <div className="lg:hidden fixed top-2 left-2 right-2 z-[60] rounded-lg bg-brand-yellow/95 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-surface-page">
        Mobile preview · open ≥1024px for controls
      </div>
    </div>
  );
}

// ─── Side panel primitives ──────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-brand-slate-light">
        {label}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md bg-surface-deep px-2 py-1.5 text-[12px] text-white font-mono"
    />
  );
}

function Slider({
  min, max, step, value, onChange, label,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-[10px] text-brand-slate">
        {label && <span>{label}</span>}
        <span className="ml-auto font-mono text-white">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-brand-cyan"
      />
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      {label && (
        <div className="text-[10px] text-brand-slate">{label}</div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md bg-surface-deep px-2 py-1.5 text-[12px] text-white font-mono"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels?.[opt] ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-surface-deep p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            value === opt ? 'bg-brand-cyan text-surface-page' : 'text-brand-slate hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FormPicker({ value, onChange }: { value: FormResult[]; onChange: (v: FormResult[]) => void }) {
  function cycle(idx: number) {
    const next: FormResult = value[idx] === 'W' ? 'L' : value[idx] === 'L' ? 'D' : 'W';
    onChange(value.map((r, i) => (i === idx ? next : r)));
  }
  return (
    <div>
      <div className="text-[10px] text-brand-slate">Recent form (click to cycle)</div>
      <div className="mt-1 flex gap-1">
        {value.map((r, i) => (
          <button
            key={i}
            onClick={() => cycle(i)}
            className={`flex size-7 items-center justify-center rounded-md text-[11px] font-black uppercase text-white ${
              r === 'W' ? 'bg-brand-green' : r === 'L' ? 'bg-brand-red' : 'bg-brand-slate'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
