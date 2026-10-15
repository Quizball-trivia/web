"use client";

import { Component, Suspense, lazy, useState, type ComponentProps, type ReactNode } from "react";
import { useLocale } from "@/contexts/LocaleContext";

type Table = typeof import("@/features/leaderboard/components/LeaderboardTable").LeaderboardTable;
type Props = Omit<ComponentProps<Table>, "compact"> & { compact: true };
let loaded: Table | undefined;
let pending: Promise<{ default: Table }> | undefined;

/** Cache code only, never player, locale or ranking data. Failed chunks can retry. */
export const wordLeaderboardTableCode = {
  load: (): Promise<{ default: Table }> => {
    if (loaded) return Promise.resolve({ default: loaded });
    if (pending) return pending;
    const request = import(/* webpackChunkName: "qb-word-daily-table" */ "./WordDailyLeaderboardTable")
      .then(module => { loaded = module.default; return { default: loaded }; })
      .finally(() => { if (pending === request) pending = undefined; });
    pending = request;
    return request;
  },
};

class RowsBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Match compact table geometry: 62px avatar +20px padding, 1px dividers. */
function RowsPlaceholder({ count, pointsLabel }: { count: number; pointsLabel?: string }) {
  const { t } = useLocale();
  return <div role="status" aria-label={t("common.loading")}>
    <div aria-hidden="true" className="grid grid-cols-12 gap-2 px-3 pb-3 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/45">
      <div className="col-span-2 text-center">{t("leaderboard.colRank")}</div>
      <div className="col-span-5 text-left">{t("leaderboard.colPlayer")}</div>
      <div className="col-span-3 text-center">{t("leaderboard.colTier")}</div>
      <div className="col-span-2 text-center">{pointsLabel ?? t("leaderboard.colRP")}</div>
    </div>
    <div aria-hidden="true" className="animate-pulse rounded-[10px] border-2 border-brand-green/25 bg-white/5" style={{ height: count * 83 + 3 }} />
  </div>;
}

/** Only mounted for nonempty boards; keep a failed table inside this widget. */
export function WordDailyLeaderboardRows(props: Props) {
  const { t } = useLocale();
  const [attempt, setAttempt] = useState(() => ({ Table: loaded ?? lazy(() => wordLeaderboardTableCode.load()), number: 0 }));
  const retry = () => setAttempt(previous => ({ Table: loaded ?? lazy(() => wordLeaderboardTableCode.load()), number: previous.number + 1 }));
  return <RowsBoundary key={attempt.number} fallback={
    <div role="alert" className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">
      <p>{t("errors.EXTERNAL_SERVICE_ERROR")}</p>
      <button type="button" onClick={retry} className="mt-3 rounded-xl bg-brand-yellow px-4 py-2 font-bold text-black">{t("common.tryAgain")}</button>
    </div>
  }>
    <Suspense fallback={<RowsPlaceholder count={props.entries.length} pointsLabel={props.pointsLabel} />}>
      <attempt.Table {...props} />
    </Suspense>
  </RowsBoundary>;
}
