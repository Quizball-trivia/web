"use client";

import { cn } from "@/lib/utils";
import type { LabAccent } from "../registry";

interface DuelHudProps {
  accent: LabAccent;
  youValue: React.ReactNode;
  oppValue: React.ReactNode;
  /** "you" | "opp" | null — highlights whose turn it is. */
  turn?: "you" | "opp" | null;
  /** Shows animated "thinking…" dots under the opponent. */
  oppThinking?: boolean;
  centerLabel?: React.ReactNode;
}

/** You-vs-Opponent scoreboard used across all duel prototypes. */
export function DuelHud({
  accent,
  youValue,
  oppValue,
  turn = null,
  oppThinking = false,
  centerLabel,
}: DuelHudProps) {
  return (
    <div className="mb-4 flex items-stretch gap-2">
      <SidePanel
        label="You"
        initial="Y"
        value={youValue}
        active={turn === "you"}
        accent={accent}
        avatarClass="bg-brand-blue"
      />
      <div className="flex min-w-14 flex-col items-center justify-center px-1 text-center">
        {centerLabel ?? <span className="text-xs font-bold text-brand-slate">VS</span>}
      </div>
      <SidePanel
        label="Rival"
        initial="R"
        value={oppValue}
        active={turn === "opp"}
        accent={accent}
        avatarClass="bg-brand-red-soft"
        thinking={oppThinking}
        alignRight
      />
    </div>
  );
}

function SidePanel({
  label,
  initial,
  value,
  active,
  accent,
  avatarClass,
  thinking = false,
  alignRight = false,
}: {
  label: string;
  initial: string;
  value: React.ReactNode;
  active: boolean;
  accent: LabAccent;
  avatarClass: string;
  thinking?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2.5 rounded-2xl border bg-surface-card px-3 py-2.5 transition-colors",
        active ? accent.border : "border-transparent",
        alignRight && "flex-row-reverse",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
          avatarClass,
        )}
      >
        {initial}
      </div>
      <div className={cn("min-w-0 flex-1", alignRight && "text-right")}>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-light">
          {label}
        </div>
        {thinking ? (
          <div
            className={cn("flex items-center gap-1 pt-1", alignRight && "justify-end")}
            aria-label="Opponent is thinking"
          >
            <ThinkingDot delay="0s" />
            <ThinkingDot delay="0.15s" />
            <ThinkingDot delay="0.3s" />
          </div>
        ) : (
          <div className="truncate text-sm font-bold text-white">{value}</div>
        )}
      </div>
    </div>
  );
}

function ThinkingDot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-brand-slate-light"
      style={{ animationDelay: delay }}
    />
  );
}
