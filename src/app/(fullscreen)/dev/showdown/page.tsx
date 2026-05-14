'use client';

import { useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { ShowdownScreen } from '@/features/game/components/ShowdownScreen';
import { clubs } from '@/lib/clubs';

/**
 * Dev-only preview of the showdown screen. Lets you swap player/opponent
 * tier, club, RP, country, and match type without playing a match.
 *
 * Local-env gated — calling notFound() on prod renders 404 server-side too.
 */
export default function ShowdownPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <ShowdownPreview />;
}

const TIER_OPTIONS = [
  'Academy',
  'Youth Prospect',
  'Reserve',
  'Bench',
  'Rotation',
  'Starting11',
  'Key Player',
  'Captain',
  'World-Class',
  'Legend',
  'GOAT',
] as const;

const COUNTRY_OPTIONS = [
  { code: 'gb', label: 'United Kingdom' },
  { code: 'ge', label: 'Georgia' },
  { code: 'es', label: 'Spain' },
  { code: 'de', label: 'Germany' },
  { code: 'it', label: 'Italy' },
  { code: 'fr', label: 'France' },
  { code: 'br', label: 'Brazil' },
  { code: 'ar', label: 'Argentina' },
  { code: 'us', label: 'United States' },
] as const;

const MATCH_TYPES = ['ranked', 'friendly'] as const;
type MatchType = (typeof MATCH_TYPES)[number];

type FormLetter = 'W' | 'L' | 'D';
const FORM_OPTIONS: FormLetter[] = ['W', 'L', 'D'];

interface Side {
  username: string;
  rankPoints: number;
  tier: typeof TIER_OPTIONS[number];
  country: string;
  club: string;
  form: [FormLetter, FormLetter, FormLetter];
}

const DEFAULT_LEFT: Side = {
  username: 'Kosta',
  rankPoints: 950,
  tier: 'Captain',
  country: 'ge',
  club: 'Manchester City',
  form: ['W', 'W', 'L'],
};

const DEFAULT_RIGHT: Side = {
  username: 'Tazi',
  rankPoints: 1200,
  tier: 'Legend',
  country: 'ge',
  club: 'Manchester United',
  form: ['L', 'W', 'W'],
};

function ShowdownPreview() {
  const [matchType, setMatchType] = useState<MatchType>('ranked');
  const [left, setLeft] = useState<Side>(DEFAULT_LEFT);
  const [right, setRight] = useState<Side>(DEFAULT_RIGHT);
  const [renderKey, setRenderKey] = useState(0);

  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.value, label: `${c.label} (${c.league})` })),
    [],
  );

  return (
    <div className="relative min-h-screen bg-surface-page">
      {/* Showdown — keyed so changing controls re-fires the entrance animations.
          wrapperClassName shrinks the screen height to leave room for the
          fixed control panel at the bottom (it's ~340px tall on desktop). */}
      <ShowdownScreen
        key={renderKey}
        wrapperClassName="min-h-[calc(100vh-360px)] pt-8"
        matchType={matchType}
        playerUsername={left.username}
        playerAvatar="avatar-1"
        opponentUsername={right.username}
        opponentAvatar="avatar-2"
        onComplete={() => {}}
        playerInfo={{
          username: left.username,
          avatar: 'avatar-1',
          rankPoints: left.rankPoints,
          tier: left.tier,
          countryCode: left.country,
          favoriteClub: left.club,
          recentForm: left.form ?? DEFAULT_LEFT.form,
        }}
        opponentInfo={{
          username: right.username,
          avatar: 'avatar-2',
          rankPoints: right.rankPoints,
          tier: right.tier,
          countryCode: right.country,
          favoriteClub: right.club,
          recentForm: right.form ?? DEFAULT_RIGHT.form,
        }}
      />

      {/* Floating control panel */}
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(900px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/85 p-4 text-xs text-white shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-poppins text-sm font-semibold uppercase tracking-wide text-white/80">
            Showdown Preview · dev only
          </span>
          <button
            type="button"
            onClick={() => setRenderKey((k) => k + 1)}
            className="rounded-md bg-brand-blue px-3 py-1 font-poppins text-[11px] font-semibold uppercase text-white hover:brightness-110"
          >
            Replay animation
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SidePanel title="Player (left)" value={left} onChange={setLeft} clubOptions={clubOptions} />
          <SidePanel title="Opponent (right)" value={right} onChange={setRight} clubOptions={clubOptions} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="font-poppins text-[11px] font-semibold uppercase text-white/60">Match type</label>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as MatchType)}
            className="rounded-md bg-white/10 px-2 py-1 text-[11px] uppercase outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {MATCH_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {mt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  title,
  value,
  onChange,
  clubOptions,
}: {
  title: string;
  value: Side;
  onChange: (next: Side) => void;
  clubOptions: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 font-poppins text-[11px] font-semibold uppercase text-white/70">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <input
            value={value.username}
            onChange={(e) => onChange({ ...value, username: e.target.value })}
            className="w-full rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Field>
        <Field label="RP">
          <input
            type="number"
            value={value.rankPoints}
            onChange={(e) => onChange({ ...value, rankPoints: Number(e.target.value) || 0 })}
            className="w-full rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Field>
        <Field label="Tier">
          <select
            value={value.tier}
            onChange={(e) => onChange({ ...value, tier: e.target.value as Side['tier'] })}
            className="w-full rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Country">
          <select
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className="w-full rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>{c.code.toUpperCase()} · {c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Club" wide>
          <select
            value={value.club}
            onChange={(e) => onChange({ ...value, club: e.target.value })}
            className="w-full rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {clubOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Last 3 (most recent first)" wide>
          <div className="flex gap-1">
            {[0, 1, 2].map((idx) => {
              const current: [FormLetter, FormLetter, FormLetter] = value.form ?? ['W', 'W', 'W'];
              return (
                <select
                  key={idx}
                  value={current[idx]}
                  onChange={(e) => {
                    const next: [FormLetter, FormLetter, FormLetter] = [...current];
                    next[idx] = e.target.value as FormLetter;
                    onChange({ ...value, form: next });
                  }}
                  className="flex-1 rounded bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  {FORM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'col-span-2' : ''}`}>
      <span className="mb-1 block font-poppins text-[10px] font-semibold uppercase text-white/50">{label}</span>
      {children}
    </label>
  );
}
