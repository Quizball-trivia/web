import type { HTMLAttributes } from 'react';
import { Gavel, Trophy } from 'lucide-react';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import type { AvatarCustomization } from '@/types/game';
import type { RankedTier } from '@/utils/rankedTier';

export type RecentMatchRowResult = 'win' | 'loss' | 'draw';

interface RecentMatchRowPill {
  label: string;
  tone: string;
  kind?: 'metadata' | 'result';
}

interface RecentMatchRowScore {
  value: string;
  suffix?: string | null;
  badge?: string | null;
  badgeVariant?: 'red' | 'muted' | null;
}

export interface RecentMatchRowProps {
  result: RecentMatchRowResult;
  opponent: string;
  opponentTier?: RankedTier | null;
  avatarUrl?: string | null;
  avatarCustomization?: AvatarCustomization | null;
  modeLabel: string;
  modeIcon?: 'auction' | 'ranked' | 'none';
  time: string;
  pill?: RecentMatchRowPill | null;
  score?: RecentMatchRowScore | null;
  interactionProps?: HTMLAttributes<HTMLDivElement>;
  interactionClassName?: string;
}

const rowBorder = (result: RecentMatchRowResult) => {
  if (result === 'win') return 'border-brand-green';
  if (result === 'loss') return 'border-brand-red-deep';
  return 'border-brand-slate-deep';
};

const Pill = ({ label, tone, className = '' }: RecentMatchRowPill & { className?: string }) => (
  <span
    className={`w-fit max-w-full rounded-[8px] px-2 py-1.5 font-poppins text-[10px] font-semibold uppercase leading-tight [overflow-wrap:anywhere] @min-[430px]:px-3 @min-[430px]:py-2 @min-[430px]:text-[11px] ${tone} ${className}`}
  >
    {label}
  </span>
);

export function RecentMatchRow({
  result,
  opponent,
  opponentTier,
  avatarUrl,
  avatarCustomization,
  modeLabel,
  modeIcon = 'none',
  time,
  pill,
  score,
  interactionProps,
  interactionClassName = '',
}: RecentMatchRowProps) {
  const visiblePill = pill?.label.trim().toLocaleLowerCase() === modeLabel.trim().toLocaleLowerCase()
    ? null
    : pill;
  const metadataPill = visiblePill?.kind === 'metadata' ? visiblePill : null;
  const resultPill = visiblePill && visiblePill.kind !== 'metadata' ? visiblePill : null;

  return (
    <div
      {...interactionProps}
      className={`@container grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-2 rounded-[16px] border-2 bg-surface-row-deep px-3.5 py-3 @min-[430px]:min-h-[76px] @min-[430px]:gap-x-3 @min-[430px]:gap-y-0 @min-[430px]:px-4 @min-[430px]:py-2 md:min-h-[82px] md:px-5 ${rowBorder(result)} ${interactionClassName}`}
    >
      <TierFrameAvatar
        tier={opponentTier ?? 'Academy'}
        avatarCustomization={avatarCustomization ?? { base: avatarUrl ?? undefined }}
        size="sm"
        className="row-span-2 shrink-0"
      />

      <div
        className="min-w-0 truncate font-poppins text-[12px] font-semibold uppercase leading-none text-white md:text-[14px]"
        title={opponent}
      >
        {opponent}
      </div>

      {(resultPill || score) && (
        <div className="col-start-3 row-start-1 ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5 @min-[430px]:row-span-2 @min-[430px]:gap-2 md:gap-5">
          {resultPill && <Pill {...resultPill} className="shrink-0" />}
          {score && (
            <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-1 gap-y-0.5">
              <span className="font-poppins text-[20px] font-semibold leading-none tabular-nums text-white md:text-[22px]">
                {score.value}
              </span>
              {score.suffix && (
                <span className="whitespace-nowrap font-poppins text-[9px] font-medium text-white/70 md:text-[11px]">
                  {score.suffix}
                </span>
              )}
              {score.badge && (
                <span
                  className={`shrink-0 whitespace-normal rounded-[8px] px-1.5 py-1 font-poppins text-[9px] font-semibold uppercase leading-tight [overflow-wrap:anywhere] md:px-2 md:text-[10px] ${
                    score.badgeVariant === 'red'
                      ? 'bg-brand-red-rust-deep text-brand-red-light'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {score.badge}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="col-start-2 col-end-4 row-start-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 font-poppins text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-white/85 @min-[430px]:col-end-3 @min-[430px]:text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          {modeIcon === 'auction' ? (
            <Gavel className="size-3.5 shrink-0 text-brand-yellow" />
          ) : modeIcon === 'ranked' ? (
            <Trophy className="size-3.5 shrink-0 text-brand-yellow" />
          ) : null}
          <span>{modeLabel}</span>
        </span>
        <span className="whitespace-nowrap text-white/40">· {time}</span>
        {metadataPill && <Pill {...metadataPill} className="@min-[430px]:hidden" />}
      </div>

      {metadataPill && (
        <div className="col-start-3 row-span-2 row-start-1 ml-auto hidden items-center @min-[430px]:flex">
          <Pill {...metadataPill} />
        </div>
      )}
    </div>
  );
}
