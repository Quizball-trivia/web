'use client';

import { useState } from 'react';
import { BookOpen, FileText, Flame, Lock, Pencil, X } from 'lucide-react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getClub } from '@/lib/clubs';
import { MyAvatar, TD_AVATAR_COLORS, tdAvatarCustomization } from '../components/Avatar';
import { ClubCrest } from '../components/ClubCrest';
import { TdClubSelect } from '../components/ClubSelect';
import { TD } from '../lib/copy';
import { getMatches, matchStats, seedMatches, type MatchRecord, type TdAvatarColor } from '../lib/state';
import { AvatarRing, BsButton, BsDialog, BsGroup, BsRow, GroupLabel, SectionTitle } from './ui';

export function ProfileScreen({
  name,
  points,
  rank,
  tickets,
  favClub,
  onFavClub,
  onAvatar,
  onResetTickets,
  onReplayOnboarding,
}: {
  name: string;
  points: number;
  rank: number;
  tickets: number | null;
  favClub: string | null;
  onFavClub: (v: string | null) => void;
  onAvatar: (c: TdAvatarColor) => void;
  onResetTickets: () => void;
  onReplayOnboarding: () => void;
}) {
  const [matches, setMatches] = useState<MatchRecord[]>(() => (typeof window === 'undefined' ? [] : getMatches()));
  const stats = matchStats(matches);
  const [avatarPicker, setAvatarPicker] = useState(false);
  const [clubPicker, setClubPicker] = useState(false);
  const club = getClub(favClub);

  return (
    <>
      <SectionTitle>{TD.profileTitle}</SectionTitle>
      {/* hero card — Betsson's profile band with the show mural behind */}
      <div
        className="relative flex items-center gap-4 overflow-hidden rounded-[14px] p-4"
        style={{ background: 'var(--bs-surface)' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: 'url(/assets/table-derby/bg-mural-dark.png)', backgroundSize: '520px auto', backgroundPosition: 'right center' }}
        />
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(13,14,15,0.92), rgba(13,14,15,0.6))' }} />
        <button type="button" onClick={() => setAvatarPicker(true)} className="relative" aria-label={TD.chooseAvatar}>
          <AvatarRing size={64}>
            <MyAvatar size={64} />
          </AvatarRing>
        </button>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <span className="bs-display text-[18px] text-[var(--bs-text)]">{name}</span>
          <span className="bs-text text-[11.5px] text-[var(--bs-text-2)]">
            {points} {TD.qpShort} · #{rank} · {tickets ?? '·'} {TD.tickets.toLowerCase()}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAvatarPicker(true)}
          className="relative flex size-10 items-center justify-center rounded-full bg-black text-white"
          aria-label={TD.chooseAvatar}
        >
          <Pencil size={16} />
        </button>
      </div>

      <SectionTitle>{TD.profileFavClub}</SectionTitle>
      <div className="flex items-start gap-4">
        <button type="button" onClick={() => setClubPicker(true)} className="flex w-16 flex-col items-center gap-1.5">
          <span
            className="flex size-14 items-center justify-center rounded-full text-white"
            style={{ background: 'var(--bs-surface)', boxShadow: '0 0 0 1.5px var(--bs-toggle-off)' }}
          >
            +
          </span>
          <span className="bs-text text-center text-[10.5px] leading-tight text-[var(--bs-text-2)]">{TD.profileChangeClub}</span>
        </button>
        {club && (
          <div className="relative flex w-16 flex-col items-center gap-1.5">
            <ClubCrest src={club.logo} size={56} ring />
            <button
              type="button"
              onClick={() => onFavClub(null)}
              className="absolute -top-1 right-1 flex size-[18px] items-center justify-center rounded-full text-white"
              style={{ background: 'var(--bs-primary)', border: '2px solid var(--bs-page)' }}
              aria-label={TD.close}
            >
              <X size={10} strokeWidth={3} />
            </button>
            <span className="bs-text line-clamp-2 text-center text-[10.5px] leading-tight text-[var(--bs-text-2)]">{club.label}</span>
          </div>
        )}
      </div>

      <SectionTitle>{TD.statsTitle}</SectionTitle>
      <StatsGrid stats={stats} />

      <SectionTitle>{TD.matchesTitle}</SectionTitle>
      <MatchList matches={matches} />

      <GroupLabel>{TD.profileInfo}</GroupLabel>
      <BsGroup>
        <BsRow icon={<BookOpen size={20} />} label={TD.profileRules} onClick={() => {}} />
        <BsRow icon={<Lock size={20} />} label={TD.profilePrivacy} onClick={() => {}} />
        <BsRow icon={<FileText size={20} />} label={TD.profileTerms} onClick={() => {}} />
      </BsGroup>

      {process.env.NODE_ENV !== 'production' && (
        <>
          <GroupLabel>{TD.devTools}</GroupLabel>
          <BsGroup>
            <BsRow label={TD.devResetTickets} onClick={onResetTickets} chevron={false} />
            <BsRow label={TD.devReplayOnboarding} onClick={onReplayOnboarding} chevron={false} />
            <BsRow
              label={TD.devSeedMatches}
              onClick={() => {
                seedMatches();
                setMatches(getMatches());
              }}
              chevron={false}
            />
          </BsGroup>
        </>
      )}

      <BsButton variant="danger" onClick={() => {}} className="mt-2">
        {TD.logout}
      </BsButton>

      {avatarPicker && (
        <BsDialog title={TD.chooseAvatar} onClose={() => setAvatarPicker(false)} className="max-w-[300px]">
          <p className="bs-display mb-5 text-center text-[15px] text-[var(--bs-text)]">{TD.chooseAvatar}</p>
          <div className="grid grid-cols-3 gap-4">
            {TD_AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => {
                  onAvatar(color);
                  setAvatarPicker(false);
                }}
                className="flex size-16 items-center justify-center overflow-hidden rounded-full"
                style={{ background: 'var(--bs-page)' }}
              >
                <AvatarPreview customization={tdAvatarCustomization(color)} width={48} className="translate-y-[6%]" />
              </button>
            ))}
          </div>
        </BsDialog>
      )}
      {clubPicker && (
        <BsDialog title={TD.onbClubTitle} onClose={() => setClubPicker(false)}>
          <p className="bs-display mb-4 text-center text-[15px] text-[var(--bs-text)]">{TD.onbClubTitle}</p>
          <TdClubSelect
            value={favClub ?? ''}
            onChange={(v) => {
              onFavClub(v || null);
              setClubPicker(false);
            }}
          />
        </BsDialog>
      )}
    </>
  );
}

function StatTile({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] px-3.5 py-3" style={{ background: 'var(--bs-surface)' }}>
      <span
        className="flex items-center gap-1.5 font-[Poppins] text-[22px] font-bold leading-none tabular-nums"
        style={{ color: accent ? 'var(--bs-primary)' : 'var(--bs-text)' }}
      >
        {accent && <Flame size={18} strokeWidth={2.4} />}
        {value}
      </span>
      <span className="bs-text text-[11.5px] text-[var(--bs-text-2)]">{label}</span>
      {sub && <span className="bs-text text-[10.5px] text-[var(--bs-text-3)]">{sub}</span>}
    </div>
  );
}

function StatsGrid({ stats }: { stats: ReturnType<typeof matchStats> }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatTile value={String(stats.played)} label={TD.statPlayed} />
        <StatTile value={String(stats.wins)} label={TD.statWins} />
        <StatTile value={`${stats.winRate}%`} label={TD.statWinRate} />
        <StatTile value={String(stats.streak)} label={TD.statStreak} sub={TD.statBestStreak(stats.bestStreak)} accent={stats.streak > 0} />
      </div>
      <p className="bs-text px-1 text-[10.5px] text-[var(--bs-text-3)]">{TD.statsRankedOnly}</p>
    </div>
  );
}

// Browsers often lack Georgian date data, so format by hand in Tbilisi time (UTC+4, no DST).
const KA_MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
function formatMatchTime(at: number): string {
  const d = new Date(at + 4 * 3600_000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${KA_MONTHS[d.getUTCMonth()]} · ${hh}:${mm}`;
}

function MatchList({ matches }: { matches: MatchRecord[] }) {
  if (matches.length === 0) {
    return (
      <div className="bs-text rounded-[12px] px-4 py-5 text-center text-[13px] text-[var(--bs-text-3)]" style={{ background: 'var(--bs-surface)' }}>
        {TD.matchesEmpty}
      </div>
    );
  }
  return (
    <BsGroup>
      {matches.slice(0, 10).map((m) => (
        <div key={m.at} className="bs-row">
          <span
            className="bs-text w-[62px] shrink-0 rounded-full py-1 text-center text-[10.5px] font-bold"
            style={m.won ? { background: 'var(--bs-primary)', color: '#fff' } : { background: 'var(--bs-border)', color: 'var(--bs-text-2)' }}
          >
            {m.won ? TD.resultWin : TD.resultLoss}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="bs-text truncate text-[13.5px] font-bold">{TD.matchVs(m.opponent)}</span>
            <span className="bs-text truncate text-[11px] text-[var(--bs-text-3)]">
              {m.mode === 'ranked' ? TD.modeRanked : TD.modeSolo}
              {m.penalties ? ` · ${TD.onPenalties}` : ''} · {formatMatchTime(m.at)}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-[Poppins] text-[14px] font-bold tabular-nums text-[var(--bs-text)]">
              {m.me}–{m.op}
            </span>
            {m.mode === 'ranked' && (
              <span
                className="font-[Poppins] text-[11px] font-bold tabular-nums"
                style={{ color: m.rpDelta >= 0 ? 'var(--bs-primary)' : 'var(--bs-text-3)' }}
              >
                {m.rpDelta >= 0 ? `+${m.rpDelta}` : `−${-m.rpDelta}`}
              </span>
            )}
          </span>
        </div>
      ))}
    </BsGroup>
  );
}
