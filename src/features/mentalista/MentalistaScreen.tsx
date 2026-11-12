"use client";

import { type ReactNode } from "react";
import { Crown, Eye, EyeOff, WifiOff } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";
import { Frame, TopBar, poppins } from "@/features/wordgames/ui";
import { PartyStandingsSidebar, PartyStandingsPill, PartyResultsScreen } from "@/features/party-kit";
import type { PartyStandingViewModel } from "@/features/party/realtime/partyQuizScreen.types";
import type { MatchFinalResultsPayload, MatchParticipant } from "@/lib/realtime/socket.types";
import type { AvatarCustomization } from "@/types/game";
import type { MentalistaState, PublicView, StandingRow } from "./mentalista.engine";
import { mentalistaCopy, type MentalistaCopy } from "./mentalista.copy";

export interface SeatMeta {
  name: string;
  avatar: AvatarCustomization;
}

const idOf = (seat: number) => `seat-${seat}`;

/**
 * Reads (matches) each seat actually earned, counted from the banked round history — the truthful "reads" stat. It is
 * independent of points: deriving reads from `points / matchPoints` overcounts whenever the chooser earns a bonus
 * (`chooserPointsPerMatch > 0`), so the results table takes this instead.
 */
export function readsFromState(state: MentalistaState): Record<number, number> {
  const reads: Record<number, number> = {};
  for (const round of state.history) for (const seat of round.matched) reads[seat] = (reads[seat] ?? 0) + 1;
  return reads;
}

/** The view's seats as party-kit standings (rank by points, shared on ties; dropped seats greyed and ranked last). */
export function toPartyStandings(view: PublicView, meta: SeatMeta[], deltas?: Map<number, number>): PartyStandingViewModel[] {
  const active = view.seats.filter((s) => s.status === "active");
  const top = Math.max(0, ...active.map((s) => s.points));
  const rankOf = (s: PublicView["seats"][number]) =>
    s.status === "dropped"
      ? active.length + 1 + view.seats.filter((o) => o.status === "dropped" && o.points > s.points).length
      : 1 + active.filter((o) => o.points > s.points).length;
  return [...view.seats]
    .sort((a, b) => Number(a.status === "dropped") - Number(b.status === "dropped") || b.points - a.points || a.seat - b.seat)
    .map((s) => ({
      userId: idOf(s.seat),
      username: meta[s.seat]?.name ?? `Seat ${s.seat + 1}`,
      avatarUrl: null,
      avatarCustomization: meta[s.seat]?.avatar ?? null,
      rank: rankOf(s),
      totalPoints: s.points,
      // "answered" = has acted this round: a predictor with a guess on file, or the chooser *once they have committed*
      // (an un-committed chooser has not acted yet — isChooser alone must not flip the dot).
      answered: s.hasPredicted || (s.isChooser && s.hasCommitted),
      status: s.status === "active" ? "active" : "dropped",
      isLeader: s.status === "active" && top > 0 && s.points === top,
      isSelf: s.seat === view.viewerSeat,
      rankShift: 0,
      roundDelta: deltas?.get(s.seat) ?? null,
    }));
}

function SeatDot({ on, tone }: { on: boolean; tone: "committed" | "predicted" }) {
  return <span className={cn("size-2.5 rounded-full", on ? (tone === "committed" ? "bg-brand-yellow" : "bg-brand-green-light") : "bg-white/20")} />;
}

/** The row of seats with their status (the chooser carries the crown; a dot shows committed / predicted, never the content). */
function SeatStrip({ view, meta }: { view: PublicView; meta: SeatMeta[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-hidden={false}>
      {view.seats.map((s) => {
        const name = meta[s.seat]?.name ?? `Seat ${s.seat + 1}`;
        return (
          <li key={s.seat}
            className={cn("flex items-center gap-2 rounded-full px-2.5 py-1.5", s.isChooser ? "bg-brand-yellow/15 ring-1 ring-brand-yellow/60" : "bg-white/[0.06]", s.status === "dropped" && "opacity-50 grayscale")}>
            <AvatarDisplay customization={meta[s.seat]?.avatar ?? {}} size="xs" className="size-7" />
            <span className="max-w-[9rem] truncate text-xs font-bold text-white/85">{name}</span>
            {s.isChooser ? <Crown className="size-3.5 text-brand-yellow" aria-hidden /> : <SeatDot on={s.hasPredicted} tone="predicted" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Tap-to-choose grid for the category's valid names (the engine still validates every pick on the server). */
function Options({ answers, selected, disabled, onPick, label }: { answers: readonly string[]; selected: string | null; disabled?: boolean; onPick: (a: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {answers.map((a) => {
        const on = selected === a;
        return (
          <button key={a} type="button" disabled={disabled} onClick={() => onPick(a)} aria-pressed={on}
            className={cn("min-h-12 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              on ? "bg-brand-green text-white" : "bg-white/[0.06] text-white/85 hover:bg-white/[0.12]", disabled && "opacity-50")}
            style={poppins}>
            {a}
          </button>
        );
      })}
    </div>
  );
}

function Banner({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-4 py-3 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-black text-white" style={poppins}>{icon}{title}</p>
      {hint && <p className="mt-1 text-xs text-white/60">{hint}</p>}
    </div>
  );
}

/** The reveal panel: the chooser's pick, then each predictor's guess with a hit / miss mark. */
function Reveal({ view, meta, copy }: { view: PublicView; meta: SeatMeta[]; copy: MentalistaCopy }) {
  const round = view.round!;
  const chooserName = meta[round.chooserSeat]?.name ?? `Seat ${round.chooserSeat + 1}`;
  const predictors = view.seats.filter((s) => !s.isChooser);
  return (
    <div className="space-y-4">
      {round.voided ? (
        <Banner icon={<EyeOff className="size-4 text-brand-red-light" aria-hidden />} title={copy.noPick}
          hint={round.voided === "chooser_dropped" ? copy.voidDropped : copy.voidTimeout} />
      ) : (
        <div className="rounded-3xl bg-brand-blue/25 px-5 py-6 text-center ring-2 ring-brand-blue">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{copy.pickWas(chooserName)}</p>
          {/* The exact pick must stay fully legible at 320/390 — wrap, never ellipsise a name a player needs to read. */}
          <p className="mt-2 break-words text-2xl font-black text-white" style={poppins}>{round.pick}</p>
        </div>
      )}
      <ul className="space-y-2">
        {predictors.map((s) => {
          const hit = round.matched.includes(s.seat);
          const name = meta[s.seat]?.name ?? `Seat ${s.seat + 1}`;
          return (
            <li key={s.seat} className={cn("space-y-1.5 rounded-2xl px-3 py-2.5", hit ? "bg-brand-green/15 ring-1 ring-brand-green" : "bg-white/[0.05]", s.status === "dropped" && "opacity-50")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <AvatarDisplay customization={meta[s.seat]?.avatar ?? {}} size="xs" className="size-7 shrink-0" />
                <span className="min-w-[4rem] flex-1 break-words text-xs font-bold text-white/85">{name}</span>
                {hit ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-black text-brand-green-light" style={poppins}><Eye className="size-4" aria-hidden />{copy.plusTwo(view.config.matchPoints)}</span>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-white/45">{copy.missed}</span>
                )}
              </div>
              <p className="break-words text-sm text-white/70">{s.prediction ?? "—"}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface MentalistaScreenProps {
  view: PublicView;
  seats: SeatMeta[];
  categoryLabel: string;
  /** Tappable valid names for the choosing / guessing step (prototype input). */
  answers: readonly string[];
  secondsLeft: number | null;
  locale: string;
  connected?: boolean;
  myPrediction?: string | null;
  myPick?: string | null;
  onPick: (answer: string) => void;
  onPredict: (answer: string) => void;
  onExit: () => void;
  /** Begin the match from the lobby/intro (the rules screen's Start button). Omit to show the rules without a control. */
  onStart?: () => void;
}

/** The whole Mentalista room screen for one seat's projected view. Desktop: standings sidebar; phone: the me-vs-leader pill. */
export function MentalistaScreen(props: MentalistaScreenProps) {
  const { view, seats, categoryLabel, answers, secondsLeft, locale, connected = true, myPrediction, myPick, onPick, onPredict, onExit, onStart } = props;
  const copy = mentalistaCopy(locale);
  const round = view.round;
  const standings = toPartyStandings(view, seats, undefined);
  const amChooser = round?.chooserSeat === view.viewerSeat;
  const chooserName = round ? seats[round.chooserSeat]?.name ?? `Seat ${round.chooserSeat + 1}` : "";
  // A disconnected socket or a seat already dropped cannot act: its choose/guess buttons must be inert, not merely styled.
  const amDropped = view.seats.find((s) => s.seat === view.viewerSeat)?.status === "dropped";
  const inputLocked = !connected || amDropped;

  let body: ReactNode = null;
  if (!round) {
    // Lobby / intro: the rules, and (when wired) a real Start control so the intro is reachable before play begins.
    body = (
      <div className="space-y-3">
        <Banner title={copy.rules} />
        {onStart && (
          <button type="button" onClick={onStart} disabled={view.phase !== "lobby"}
            className="mx-auto block min-h-12 rounded-2xl bg-brand-green px-8 py-3 text-sm font-black text-white transition-colors hover:bg-brand-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
            style={poppins}>
            {copy.start}
          </button>
        )}
      </div>
    );
  } else if (round.phase === "choosing") {
    body = amChooser
      ? <><Banner title={copy.youChoose} hint={copy.youChooseHint} /><Options answers={answers} selected={myPick ?? null} disabled={inputLocked} onPick={onPick} label={copy.youChoose} /></>
      : <Banner icon={<EyeOff className="size-4 text-brand-yellow" aria-hidden />} title={copy.waitChoose(chooserName)} />;
  } else if (round.phase === "guessing") {
    body = amChooser
      ? <Banner icon={<Eye className="size-4 text-brand-cyan" aria-hidden />} title={copy.beingRead} />
      : <><Banner title={copy.youPredict(chooserName)} hint={copy.youPredictHint} />
          <Options answers={answers} selected={myPrediction ?? null} disabled={inputLocked} onPick={onPredict} label={copy.youPredict(chooserName)} />
          {myPrediction && <p className="text-center text-xs text-white/55">{copy.locked}: <span className="font-bold text-white/80">{myPrediction}</span> · {copy.revise}</p>}
        </>;
  } else {
    body = <Reveal view={view} meta={seats} copy={copy} />;
  }

  return (
    <Frame lang={locale} wide>
      <div className="lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 pb-28 lg:pb-0">
          <TopBar brand={copy.brand} seconds={secondsLeft} exitLabel={copy.exit} onExit={onExit} wrap
            right={round ? <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-white/50" style={poppins}>{copy.round(round.index + 1, view.config.rounds)}</span> : undefined} />
          {!connected && (
            <p className="flex items-center justify-center gap-2 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-xs font-bold text-brand-red-light">
              <WifiOff className="size-4" aria-hidden />{copy.offline}
            </p>
          )}
          {round && (
            <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{copy.chooserTag}: {chooserName}</p>
              <p className="mt-0.5 text-sm font-black text-white" style={poppins}>{categoryLabel}</p>
            </div>
          )}
          <SeatStrip view={view} meta={seats} />
          {body}
        </div>
        <PartyStandingsSidebar standings={standings} roundResolved={round?.phase === "reveal"} showOptions={round?.phase !== "reveal"} />
      </div>
      <PartyStandingsPill standings={standings} />
    </Frame>
  );
}

/** The final table on the party-kit results screen (shared places, no XP, "reads" as the second stat). */
export function MentalistaResults({ table, seats, viewerSeat, locale, reads, onRoom, onExit }: {
  table: StandingRow[]; seats: SeatMeta[]; viewerSeat: number; locale: string;
  /** Real reads per seat (from `readsFromState`); when omitted, falls back to points/2 (valid only at chooserPointsPerMatch 0). */
  reads?: Record<number, number>; onRoom: () => void; onExit: () => void;
}) {
  const copy = mentalistaCopy(locale);
  const mine = table.find((r) => r.seat === viewerSeat);
  const firsts = table.filter((r) => r.rank === 1);
  const headline = mine?.rank === 1 ? (firsts.length > 1 ? copy.tieFirst : copy.youWon) : copy.youPlace(mine?.rank ?? table.length);
  const nameOf = (seat: number) => seats[seat]?.name ?? `Seat ${seat + 1}`;
  const participants: MatchParticipant[] = table.map((r) => ({
    userId: idOf(r.seat), seat: r.seat, avatarUrl: null, avatarCustomization: seats[r.seat]?.avatar ?? null,
    username: r.status === "dropped" ? `${nameOf(r.seat)} · ${copy.left}` : nameOf(r.seat),
  }));
  const readsOf = (r: StandingRow) => reads?.[r.seat] ?? Math.round(r.points / 2);
  const finalResults: MatchFinalResultsPayload = {
    matchId: "room",
    winnerId: firsts.length === 1 ? idOf(firsts[0].seat) : null,
    players: {},
    standings: table.map((r) => ({ userId: idOf(r.seat), rank: r.rank, totalPoints: r.points, correctAnswers: readsOf(r), avgTimeMs: null })),
    durationMs: 0,
    resultVersion: 1,
  };
  return (
    <PartyResultsScreen finalResults={finalResults} participants={participants} selfUserId={idOf(viewerSeat)}
      onPlayAgain={onRoom} onMainMenu={onExit} headline={headline} hideXp correctLabel={copy.colReads} useGivenRanks
      notOnPodium={table.filter((r) => r.status === "dropped").map((r) => idOf(r.seat))} />
  );
}
