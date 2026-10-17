"use client";
import "@/styles/application-utilities.css";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { DuelAvatar, seatAvatar } from "@/features/duel/DuelAvatar";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { DailyEnd, WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import { poppins } from "@/features/wordgames/ui";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { peekGuestToken } from "@/lib/guest/guestSession";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { raceCopy } from "./race.copy";
import { asNation, dailyShareLine, FOOTBALL_RACE_CALENDAR, footballRaceDailyApi, footballRaceDailyGame, loadRaceBoard, toDailyView, toDailyWording, type RaceDailyState, type RaceMove } from "./race.daily";
import { l10n } from "./race.rules";
import type { RaceView, RaceWording } from "./race.views";
import { NationFlag } from "./RaceRoom";
import { ChooseNation, LanesTrack, SoloBoard } from "./RaceSolo";

export { footballRaceDailyGame };

function usePlayerAvatar() {
  const { player } = usePlayer();
  const signedIn = useAuthStore((s) => s.status) === "authenticated";
  const userId = useAuthStore((s) => s.user?.id);
  const [guestSeed] = useState(() => peekGuestToken() ?? "guest");
  return seatAvatar({ userId: signedIn ? userId ?? "member" : guestSeed, avatarCustomization: signedIn ? player?.avatarCustomization ?? null : null, avatarUrl: null, isGuest: !signedIn });
}

/** The end card: won or lost, the share line, the pitch as it finished, and every pick with the nation it moved. */
function ResultCard({ state, view, wording, locale, number }: { state: RaceDailyState; view: RaceView; wording: RaceWording; locale: string; number: number }) {
  const copy = raceCopy(locale);
  const won = state.result === "won";
  const winner = view.seats.find((s) => s.seat !== 0 && s.position >= view.target);
  const metricOf = new Map(wording.metrics.map((m) => [m.id, m]));
  const scopeOf = new Map(wording.scopes.map((x) => [x.id, x]));
  const statOf = new Map(view.stats.map((x) => [x.id, x]));
  const line = dailyShareLine(state);
  const headline = won ? (state.picks === view.target ? copy.soloPerfect : copy.soloWon(state.picks)) : copy.soloLost(winner ? l10n(winner.nation.name, locale) : "");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70" style={poppins}>{view.tournament ? l10n(view.tournament, locale) : copy.dailyTitle} · #{number}</p>
        <span className="relative">
          {view.seats[0].avatar && <DuelAvatar size="lg" customization={view.seats[0].avatar} />}
          <NationFlag nation={view.seats[0].nation} round className="absolute -bottom-1 -right-2 size-9 ring-2 ring-surface-page-alt" />
        </span>
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("text-3xl font-black leading-tight", won ? "text-brand-yellow" : "text-white")} style={poppins} data-daily-final>{headline}</motion.p>
        <p aria-label={line} className="text-2xl tracking-wider">{line}</p>
      </div>
      <LanesTrack view={view} locale={locale} rivalTarget={state.rivalTarget} />
      <section>
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.recap}</h2>
        <ol className="flex flex-col gap-1.5">
          {view.history.map((p, i) => {
            const stat = statOf.get(p.statId);
            const good = p.leaders.includes(0);
            return (
              <li key={p.statId} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-black", good ? "bg-brand-green" : "bg-brand-red-soft")} style={poppins}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black leading-tight break-words" style={poppins}>{stat ? l10n(metricOf.get(stat.metric)!.label, locale) : p.statId}</span>
                  {stat && <span className="block text-[11px] text-white/55">{l10n(scopeOf.get(stat.scope)!.label, locale)}</span>}
                </span>
                <span className="flex shrink-0 -space-x-1.5">{p.leaders.map((seat) => <NationFlag key={seat} nation={view.seats[seat].nation} round className="size-6 ring-2 ring-surface-page-alt" />)}</span>
                <span className="sr-only">{copy.movedBy(p.leaders.map((seat) => l10n(view.seats[seat].nation.name, locale)).join(", "), good)}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** A finished run whose day was corrected afterwards: its outcome and share line (the race it was played on is gone). */
function BareResult({ state, locale, number }: { state: RaceDailyState; locale: string; number: number }) {
  const copy = raceCopy(locale);
  const line = dailyShareLine(state);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70" style={poppins}>{copy.dailyTitle} · #{number}</p>
      <p className={cn("text-3xl font-black leading-tight", state.result === "won" ? "text-brand-yellow" : "text-white")} style={poppins} data-daily-final>
        {state.result === "won" ? copy.soloWon(state.picks) : copy.soloLostPlain}
      </p>
      <p aria-label={line} className="text-2xl tracking-wider">{line}</p>
    </div>
  );
}

/** Football Horserace's daily race on the shared daily screens (intro, archive, end, ranking). */
export function FootballRaceDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = footballRaceDailyGame(locale);
  const copy = raceCopy(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<RaceDailyState, RaceMove>({ api: footballRaceDailyApi, calendar: FOOTBALL_RACE_CALENDAR, locale, initialDay, onDay, onEvent, resendLostAnswers: true });
  const { state, day, run } = daily;
  const avatar = usePlayerAvatar();
  // Picks already seen on this run; the one after them is on its reveal card until "Next". A run opened (or
  // reopened) shows no reveal: only a pick made here does.
  const [ack, setAck] = useState<{ run: string; seen: number } | null>(null);
  const seen = ack && run && ack.run === run.run.id ? ack.seen : state?.results.length ?? 0;
  const showing = Boolean(state && state.results.length > seen);
  // A run kept from before a correction of its day comes back without the race (no nations, no stats): only its result.
  const hasRace = Boolean(state && state.racers.length === state.positions.length);
  // Before the first pick the player chooses a nation of the four; the tap is local until Start sends it.
  const choosing = Boolean(state && hasRace && !state.done && state.nation === null && state.results.length === 0);
  const [tapped, setTapped] = useState<{ run: string; nation: string } | null>(null);
  const chosen = choosing && run && tapped?.run === run.run.id && state!.racers.some((r) => r.id === tapped.nation) ? tapped.nation : null;
  const shown = state && chosen ? asNation(state, chosen) : state;
  const wording = useMemo(() => (shown && hasRace ? toDailyWording(shown, locale) : null), [shown, hasRace, locale]);
  const view = shown && wording ? toDailyView(shown, wording, { name: copy.you, avatar }, showing, locale) : null;
  const dayOrder = useMemo(() => (state && hasRace && choosing ? toDailyWording(state, locale).nations : []), [state, hasRace, choosing, locale]);
  const busy = daily.pending !== null;

  const pick = (stat: string) => {
    if (!run || !state || busy) return;
    setAck({ run: run.run.id, seen: state.results.length });
    void daily.answer(stat);
  };
  const next = () => {
    if (!run || !state) return;
    setAck({ run: run.run.id, seen: state.results.length });
    if (state.done) daily.setView("end");
  };
  const status: "new" | "started" | "done" = state?.done ? "done" : state && state.results.length > 0 ? "started" : "new";

  const exit = () => (onExit ? onExit() : daily.setView("intro"));
  const play = view && wording && day && state ? (choosing ? (
    <ChooseNation view={view} nations={dayOrder} chosen={chosen} locale={locale} rivalTarget={state.rivalTarget} busy={busy}
      notice={daily.notice ? d.notices[daily.notice] : null} onExit={exit}
      onChoose={(nation) => run && setTapped({ run: run.run.id, nation })}
      onStart={() => { if (chosen && !busy) void daily.answer(chosen, { move: "choose" }); }} />
  ) : (
    <SoloBoard view={view} wording={wording} locale={locale} rivalTarget={state.rivalTarget} busy={busy} notice={daily.notice ? d.notices[daily.notice] : null} onPick={pick} onNext={next} onExit={exit} />
  )) : null;
  const number = day ? puzzleNumber(FOOTBALL_RACE_CALENDAR, day) : 0;
  const end = state?.done && day ? (
    <DailyEnd game={game} locale={locale} day={day} shareText={`${copy.shareTitle(number)}\n${dailyShareLine(state)}`} guestOnPastBoard={daily.guestOnPastBoard}
      ranked={state.ranked} rank={state.rank} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadRaceBoard} pointsLabel={copy.picksLabel} day={isLiveDay(FOOTBALL_RACE_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />}>
      {view && wording ? <ResultCard state={state} view={{ ...view, phase: "over", reveal: null }} wording={wording} locale={locale} number={number} />
        : <BareResult state={state} locale={locale} number={number} />}
    </DailyEnd>
  ) : null;

  return <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void daily.play()} onExit={onExit} play={play} end={end} wide />;
}
