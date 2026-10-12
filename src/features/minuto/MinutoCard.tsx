"use client";

/* eslint-disable @next/next/no-img-element -- crests, faces and photos come from our storage bucket at their own sizes */
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/CountryFlag";
import { footballGridStorageImageUrl } from "@/lib/football-grid/assets";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinute, type MinuteValue, type MinutoGoalCard, type MinutoTeam } from "./minuto.logic";
import { minutoCopy, nameFor } from "./minuto.copy";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** "Cuartos de final · Mundial 2022", "Octavos de final (vuelta) · Champions League 2019". */
export function stageLine(goal: MinutoGoalCard, locale: Locale): string {
  const c = minutoCopy(locale);
  const stage = goal.stage === "group" && goal.group ? c.group(goal.group) : c.stages[goal.stage];
  const leg = goal.leg ? ` (${c.leg[goal.leg].toLowerCase()})` : "";
  return [stage ? `${stage}${leg}` : "", `${c.comps[goal.comp]} ${goal.year}`].filter(Boolean).join(" · ");
}

const FLAG_FILL = { position: "absolute", inset: 0, width: "100%", height: "100%", backgroundSize: "cover", lineHeight: 0 } as const;

/** `fluid` sizes from the enclosing `@container` (the picture), so the badges shrink with it instead of overflowing. */
function TeamBadge({ team, size = "md" }: { team: MinutoTeam; size?: "sm" | "md" | "fluid" }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const flagBox = { sm: "h-7 w-10", md: "h-12 w-[4.5rem] lg:h-16 lg:w-24", fluid: "aspect-[3/2] w-[20cqw]" }[size];
  const crestBox = { sm: "size-7", md: "size-14 lg:size-20", fluid: "size-[17cqw]" }[size];
  if (team.kind === "nation") {
    // Pin the local flag artwork to its wrapper instead of downloading a
    // global stylesheet for every country's flag.
    return (
      <span aria-hidden className={cn("relative inline-block shrink-0 overflow-hidden rounded-md shadow-md ring-1 ring-black/10", flagBox)}>
        <CountryFlag code={team.flag ?? ""} style={FLAG_FILL} />
      </span>
    );
  }
  const src = team.crest ? footballGridStorageImageUrl(team.crest) : null;
  if (!src || failedSrc === src) {
    const initials = team.name.en.split(/\s+/).filter((w) => !/^(fc|cf|ac|sc|afc|club)$/i.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const text = { sm: "text-[10px]", md: "text-base lg:text-xl", fluid: "text-[5cqw]" }[size];
    return <span aria-hidden className={cn("flex items-center justify-center rounded-full bg-surface-page font-black text-white", crestBox, text)} style={poppins}>{initials}</span>;
  }
  return <img src={src} alt="" aria-hidden className={cn("object-contain drop-shadow", crestBox)} onError={() => setFailedSrc(src)} />;
}

/** The match scoreline: "(4) 1-1 (2)" after a shootout; on narrow phones the shootout goes under the score to leave the names room. */
function Scoreline({ goal }: { goal: MinutoGoalCard }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-surface-page px-2.5 py-1.5 text-xl font-black tabular-nums text-white min-[400px]:px-3.5 min-[400px]:py-2 min-[400px]:text-2xl lg:px-5 lg:text-4xl" style={poppins}>
      {goal.pens && <span className="hidden text-base text-white/70 min-[400px]:inline lg:text-2xl">({goal.pens[0]})</span>}
      <span className="flex flex-col items-center leading-none">
        <span>{goal.score[0]}-{goal.score[1]}</span>
        {goal.pens && <span className="mt-1 text-[10px] font-bold text-white/70 min-[400px]:hidden">({goal.pens[0]}) ({goal.pens[1]})</span>}
      </span>
      {goal.pens && <span className="hidden text-base text-white/70 min-[400px]:inline lg:text-2xl">({goal.pens[1]})</span>}
    </span>
  );
}

/**
 * The goal to guess, like the stream's scoreboard: both teams, the final score, the stage and the scorer, with the
 * minute hidden ("??'") until it is revealed. `minute` null keeps it hidden.
 */
export function GoalCard({ goal, locale, minute, className }: { goal: MinutoGoalCard; locale: Locale; minute: MinuteValue | null; className?: string }) {
  const c = minutoCopy(locale);
  const scorerTeam = goal.side === "home" ? goal.home : goal.away;
  return (
    <div className={cn("rounded-3xl bg-white px-3 pb-4 pt-4 text-surface-page shadow-lg min-[400px]:px-4 lg:px-8 lg:pb-5 lg:pt-6", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 min-[400px]:gap-2 lg:gap-6">
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <TeamBadge team={goal.home} />
          <span className="line-clamp-3 w-full hyphens-auto break-words text-[13px] font-black leading-tight min-[360px]:text-sm min-[400px]:text-base lg:text-2xl" style={poppins}>{nameFor(goal.home.name, locale)}</span>
        </div>
        <Scoreline goal={goal} />
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <TeamBadge team={goal.away} />
          <span className="line-clamp-3 w-full hyphens-auto break-words text-[13px] font-black leading-tight min-[360px]:text-sm min-[400px]:text-base lg:text-2xl" style={poppins}>{nameFor(goal.away.name, locale)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <p className="text-center text-[11px] font-bold uppercase tracking-wide text-surface-page/55 lg:text-sm" style={poppins}>
          {stageLine(goal, locale)}{goal.aet ? ` · ${c.aet}` : ""}
        </p>
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <TeamBadge team={scorerTeam} size="sm" />
          <motion.span
            key={minute ? "shown" : "hidden"}
            initial={minute ? { scale: 1.4 } : false}
            animate={{ scale: 1 }}
            className={cn(
              "shrink-0 rounded-lg border-2 px-2 py-0.5 text-lg font-black tabular-nums lg:text-2xl",
              minute ? "border-brand-orange bg-brand-orange text-white" : "border-dashed border-brand-orange bg-brand-orange/10 text-brand-orange",
            )}
            style={poppins}
            aria-label={minute ? formatMinute(minute) : undefined}
          >
            {minute ? formatMinute(minute) : "??'"}
          </motion.span>
          <span className="line-clamp-2 min-w-0 break-words text-center text-base font-black leading-tight min-[400px]:text-lg lg:text-2xl" style={poppins}>{nameFor(goal.scorer.name, locale)}</span>
          {goal.penalty && <span className="shrink-0 text-[11px] font-bold uppercase text-surface-page/50 lg:text-sm">({c.penalty})</span>}
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] font-semibold text-surface-page/50 lg:text-sm">{c.goalOf(goal.scoreAfter[0], goal.scoreAfter[1])}</p>
    </div>
  );
}

/**
 * The goal's photo when we have one; otherwise a match poster: both teams' flags or crests on the stadium art with the
 * scorer's face between them. `minute` (after the reveal) is stamped in the corner, like the stream.
 */
export function GoalPicture({ goal, locale, minute = null, className }: { goal: MinutoGoalCard; locale: Locale; minute?: MinuteValue | null; className?: string }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [failedFace, setFailedFace] = useState<string | null>(null);
  const photo = goal.image ? footballGridStorageImageUrl(goal.image.src) : null;
  const credit = goal.image ? `${goal.image.credit} · ${goal.image.license}` : "";
  const face = goal.scorer.photo ? footballGridStorageImageUrl(goal.scorer.photo) : null;
  const scorer = nameFor(goal.scorer.name, locale);
  const stamp = minute && (
    <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="absolute bottom-[3cqw] right-[3cqw] rounded-[2.5cqw] bg-brand-orange px-[2.5cqw] py-[1cqw] text-[7cqw] font-black leading-none tabular-nums text-white shadow-xl" style={poppins}>
      {formatMinute(minute)}
    </motion.span>
  );
  if (photo && failedPhoto !== photo) {
    return (
      <figure className={cn("@container relative flex aspect-video w-full flex-col overflow-hidden rounded-3xl bg-black ring-1 ring-white/10", className)}>
        {/* Any shape fits whole and centred; a blurred copy fills the sides (a portrait photo is not cut to a torso). */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <img src={photo} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
          <img src={photo} alt={scorer} className="relative size-full object-contain object-center" onError={() => setFailedPhoto(photo)} />
          {stamp}
        </div>
        <figcaption className="shrink-0 break-words px-2 py-1 text-[9px] leading-tight text-white/80">{credit}</figcaption>
      </figure>
    );
  }
  const scorerSide = goal.side;
  return (
    <div className={cn("@container relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-3xl bg-game-art-night bg-[url('/assets/stadium-green.webp')] bg-cover bg-center ring-1 ring-white/10", className)}>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
      <div className="relative grid w-full grid-cols-[1fr_auto_1fr] items-center gap-[3cqw] px-[4cqw]">
        <div className={cn("flex justify-center transition-opacity", scorerSide === "home" ? "opacity-100" : "opacity-60")}><TeamBadge team={goal.home} size="fluid" /></div>
        <div className="flex flex-col items-center gap-[1.5cqw]">
          {face && failedFace !== face ? (
            <img src={face} alt={scorer} onError={() => setFailedFace(face)} className="size-[28cqw] rounded-full bg-white/15 object-cover shadow-2xl ring-[0.8cqw] ring-brand-orange" />
          ) : (
            <span aria-hidden className="flex size-[28cqw] items-center justify-center rounded-full bg-white/15 text-[12cqw] ring-[0.8cqw] ring-brand-orange">⚽</span>
          )}
          <span className="max-w-[34cqw] truncate rounded-full bg-black/55 px-[2cqw] py-[0.6cqw] text-[2.6cqw] font-black uppercase tracking-wide text-white" style={poppins}>{scorer}</span>
        </div>
        <div className={cn("flex justify-center transition-opacity", scorerSide === "away" ? "opacity-100" : "opacity-60")}><TeamBadge team={goal.away} size="fluid" /></div>
      </div>
      {stamp}
    </div>
  );
}
