import { cn } from "@/lib/utils";

const block = "rounded-md bg-white/[0.07]";

/** Podium bar heights, avatar sizes and row heights mirror LeaderboardPodium and LeaderboardTable, so nothing moves when the board arrives. */
const PODIUM_BARS = [
  { key: 2, bar: "h-32 sm:h-40" },
  { key: 1, bar: "h-40 sm:h-52" },
  { key: 3, bar: "h-24 sm:h-32" },
] as const;

const ROWS = 8;

interface BoardSkeletonProps {
  /** Country and club boards show a "No.1 fan" badge above each podium bar. */
  withBadges?: boolean;
  /** Standings have no podium. */
  withPodium?: boolean;
}

export function BoardSkeleton({ withBadges = false, withPodium = true }: BoardSkeletonProps) {
  return (
    <div data-lb-skeleton aria-hidden className="animate-pulse space-y-5 sm:space-y-6">
      {withPodium && (
        <div className="px-4 pt-10 sm:px-6 sm:pt-14">
          <div className="mx-auto flex w-full max-w-md items-end justify-center gap-2 sm:gap-4">
            {PODIUM_BARS.map(({ key, bar }) => (
              <div key={key} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="mb-3 size-10 rounded-full bg-white/[0.07] sm:mb-4 sm:size-16" />
                {withBadges && <div className={cn(block, "mb-2 h-[17px] w-12")} />}
                <div className={cn("w-full rounded-[10px] bg-white/[0.07]", bar)} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        <div className={cn(block, "h-6 w-1/2 sm:h-[30px]")} />
        <div>
          <div className="h-[27px] sm:h-7" />
          <div className="divide-y divide-brand-green/25 overflow-hidden rounded-[10px] border-2 border-brand-green/40">
            {Array.from({ length: ROWS }, (_, index) => (
              <div
                key={index}
                data-lb-skeleton-row
                className="grid grid-cols-12 items-center gap-2 px-3 py-3.5 sm:gap-4 sm:px-4 sm:py-4"
              >
                <div className="col-span-3 flex justify-center">
                  <div className={cn(block, "h-6 w-8 sm:h-7 sm:w-10")} />
                </div>
                <div className="col-span-4 flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="h-[62px] w-[44px] shrink-0 rounded-md bg-white/[0.07] sm:h-[81px] sm:w-[58px]" />
                  <div className={cn(block, "h-3.5 min-w-0 flex-1")} />
                </div>
                <div className="col-span-2 flex justify-center sm:col-span-3">
                  <div className={cn(block, "h-3 w-10 sm:w-16")} />
                </div>
                <div className="col-span-3 flex justify-center sm:col-span-2">
                  <div className={cn(block, "h-4 w-10 sm:h-5 sm:w-14")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Holds the place of the viewer's own rank strip while the session and rank load. */
export function RankStripSkeleton() {
  return (
    <div
      data-lb-skeleton
      aria-hidden
      className="flex animate-pulse items-center gap-3 rounded-[10px] border-2 border-brand-green/40 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5"
    >
      <div className="h-[81px] w-[58px] shrink-0 rounded-md bg-white/[0.07]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={cn(block, "h-4 w-2/5 sm:h-5")} />
        <div className={cn(block, "h-3 w-1/4")} />
      </div>
      <div className={cn(block, "h-7 w-12 sm:h-8")} />
    </div>
  );
}

/** Same reserved space as the season picker, so the row does not appear late. */
export function SeasonSelectSkeleton() {
  return <div aria-hidden className="h-11 w-[124px] animate-pulse rounded-lg border border-white/10 bg-black/40" />;
}

/** First paint before the screen can read its URL: the page's own frame, board included. */
export function LeaderboardPageSkeleton() {
  return (
    <div className="relative flex flex-col bg-transparent font-fun" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="container mx-auto max-w-3xl flex-1 space-y-5 px-4 pb-6 pt-4 sm:space-y-6 sm:px-6 sm:pt-6">
        <div aria-hidden className="animate-pulse">
          <div className={cn(block, "h-9 w-56 sm:h-12 sm:w-80")} />
          <div className={cn(block, "mt-2 h-[15px] w-40 sm:h-[17px]")} />
        </div>
        <div aria-hidden className="animate-pulse space-y-4">
          <div className="flex gap-4 border-b border-white/10 pb-2 pt-1 sm:gap-7">
            {[0, 1, 2].map((tab) => (
              <div key={tab} className={cn(block, "h-[18px] w-16")} />
            ))}
          </div>
          <div className="h-[50px] rounded-xl border border-white/10 bg-black/40" />
        </div>
        <BoardSkeleton />
      </div>
    </div>
  );
}
