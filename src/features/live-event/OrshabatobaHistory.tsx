'use client';

/**
 * ორშაბათობა history on the Events tab: the next show night (podcast episode number + date) for the entry card, and
 * past show nights with their podium below it. Georgian only, like the rest of the show.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getOrshabatobaHistory, getOrshabatobaLeaderboard, type OrshabatobaHistoryResponse } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth.store';
import { queryKeys } from '@/lib/queries/queryKeys';
import { cn } from '@/lib/utils';

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const MEDAL = ['🥇', '🥈', '🥉'] as const;

/** "2026-11-30" → "30 ნოემბერი" (the year only when it isn't this year). */
export function orshabatobaDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const year = y === new Date().getFullYear() ? '' : ` ${y}`;
  return `${d} ${MONTHS[m - 1]}${year}`;
}

/** Today's date in Georgia, as YYYY-MM-DD. */
function todayInGeorgia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tbilisi' }).format(new Date());
}

export function useOrshabatobaHistory() {
  return useQuery({
    queryKey: queryKeys.weekendLeague.orshabatobaHistory(),
    queryFn: getOrshabatobaHistory,
    staleTime: 60_000,
    // The page can stay open across a show night: the finished episode must move into history on its own.
    refetchInterval: 60_000,
  });
}

/** One line for the card and the studio lobby: tonight's or the next episode, and when it airs (22:00 Georgian). */
export function OrshabatobaNextLine({ next, className }: { next: OrshabatobaHistoryResponse['next']; className?: string }) {
  const tonight = next.event_date === todayInGeorgia();
  return (
    <p className={cn('mt-2 font-poppins text-[14px] text-white/85', className)}>
      <span className="font-bold text-brand-yellow">ორშაბათობა #{next.episode}</span>
      {' · '}{tonight ? 'დღეს' : orshabatobaDate(next.event_date)}, 22:00
    </p>
  );
}

export function OrshabatobaPastNights({ editions }: { editions: OrshabatobaHistoryResponse['editions'] }) {
  const [open, setOpen] = useState<OrshabatobaHistoryResponse['editions'][number] | null>(null);
  // The buttons sit outside the Dialog (no DialogTrigger), so closing must hand focus back to the one that opened it.
  const opener = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useCallback((event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  }, []);
  if (editions.length === 0) return null;
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Trophy className="size-5 text-brand-gold" aria-hidden />
        <h2 className="font-poppins text-[17px] font-bold text-white">წინა ორშაბათობები</h2>
      </div>
      <div className="space-y-2.5">
        {editions.map((e) => (
          <article key={e.episode} className="rounded-[16px] bg-white/[0.05] px-4 py-3 ring-1 ring-white/[0.06]">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="font-poppins text-[15px] font-bold text-white">ორშაბათობა #{e.episode}</span>
              <span className="flex shrink-0 items-center gap-1 font-poppins text-[12px] text-white/50">
                {orshabatobaDate(e.event_date)} · <Users className="size-3.5" aria-hidden /> {e.players}
              </span>
            </div>
            <ol className="space-y-1">
              {e.podium.map((p) => (
                <li key={p.rank} className="flex items-center gap-2.5">
                  <span className="w-5 shrink-0 text-center text-[15px]" aria-label={`${p.rank} ადგილი`}>{MEDAL[p.rank - 1]}</span>
                  <span className={cn('min-w-0 flex-1 truncate font-poppins text-[14px]', p.rank === 1 ? 'font-bold text-white' : 'text-white/75')}>
                    {p.nickname ?? '—'}
                  </span>
                  <span className="shrink-0 font-poppins text-[13px] tabular-nums text-white/50">{p.points} ქულა</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={(ev) => { opener.current = ev.currentTarget; setOpen(e); }}
              className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-[12px] bg-white/[0.07] py-2.5 font-poppins text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              სრული ლიდერბორდი <ChevronRight className="size-4" aria-hidden />
            </button>
          </article>
        ))}
      </div>
      <Dialog open={open != null} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        {open && <FullBoard edition={open} onCloseAutoFocus={restoreFocus} />}
      </Dialog>
    </section>
  );
}

function FullBoard({ edition, onCloseAutoFocus }: {
  edition: OrshabatobaHistoryResponse['editions'][number];
  onCloseAutoFocus: (event: Event) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const board = useQuery({
    queryKey: queryKeys.weekendLeague.orshabatobaBoard(edition.episode, userId),
    queryFn: () => getOrshabatobaLeaderboard(edition.episode),
    staleTime: 60_000,
  });
  // Open on your own row when you played: scroll when that row actually mounts (the dialog portal mounts late).
  const youRef = useCallback((el: HTMLLIElement | null) => { el?.scrollIntoView({ block: 'center' }); }, []);

  return (
    <DialogContent
      onCloseAutoFocus={onCloseAutoFocus}
      className="flex max-h-[min(85dvh,720px)] flex-col gap-0 overflow-hidden border-white/10 bg-game-stadium-night p-0 text-white sm:max-w-md">
      <div className="border-b border-white/10 px-5 pb-3 pt-5 pr-12">
        <DialogTitle className="font-poppins text-[18px] font-bold">ორშაბათობა #{edition.episode}</DialogTitle>
        <DialogDescription className="mt-1 font-poppins text-[13px] text-white/55">
          {orshabatobaDate(edition.event_date)} · {edition.players} მოთამაშე
        </DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {board.isLoading && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-[10px] bg-white/[0.05]" />)}
          </div>
        )}
        {board.isError && (
          <div className="py-8 text-center">
            <p className="font-poppins text-[14px] text-white/60">ლიდერბორდი ვერ ჩაიტვირთა.</p>
            <button
              type="button"
              onClick={() => void board.refetch()}
              className="mt-3 rounded-full bg-white/[0.08] px-4 py-1.5 font-poppins text-[13px] text-white/80 hover:text-white"
            >
              თავიდან ცდა
            </button>
          </div>
        )}
        {board.data && (
          <ol>
            {board.data.rows.map((r) => (
              <li
                key={r.rank}
                ref={r.is_you ? youRef : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5',
                  r.is_you ? 'bg-brand-green/25 ring-1 ring-brand-green' : 'odd:bg-white/[0.03]',
                )}
              >
                <span className="w-8 shrink-0 text-center font-poppins text-[14px] tabular-nums text-white/55">
                  {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
                </span>
                <span className={cn('min-w-0 flex-1 truncate font-poppins text-[14px]', r.rank <= 3 || r.is_you ? 'font-bold text-white' : 'text-white/85')}>
                  {r.nickname ?? '—'}
                  {r.is_you && <span className="ml-1.5 text-[12px] font-semibold text-brand-green-light">(შენ)</span>}
                </span>
                <span className="shrink-0 font-poppins text-[13px] tabular-nums text-white/60">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </DialogContent>
  );
}
