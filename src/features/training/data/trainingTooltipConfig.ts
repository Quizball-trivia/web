import type { MessageKey } from "@/lib/i18n/messages";

export type TooltipTrigger =
  | { type: "stage"; stage: string }
  | { type: "questionIndex"; index: number }
  | { type: "zone"; zone: string }
  | { type: "phase"; phase: string }
  | { type: "event"; event: string };

export interface TooltipDefinition {
  id: string;
  trigger: TooltipTrigger;
  titleKey: MessageKey;
  messageKey: MessageKey;
  position: "top" | "center" | "bottom";
  /** CSS selector of the element to spotlight while this tooltip is up.
   *  When multiple matches exist (desktop + mobile layouts), the largest
   *  visible one is highlighted. Omit for a plain dimmed backdrop. */
  highlight?: string;
}

export const TOOLTIP_DEFINITIONS: TooltipDefinition[] = [
  // ── Pre-match stages ──────────────────────────────────────
  {
    id: "matchmaking",
    trigger: { type: "stage", stage: "matchmaking" },
    titleKey: "training.tipMatchmakingTitle",
    messageKey: "training.tipMatchmakingBody",
    position: "center",
  },
  {
    id: "showdown",
    trigger: { type: "stage", stage: "showdown" },
    titleKey: "training.tipShowdownTitle",
    messageKey: "training.tipShowdownBody",
    position: "center",
  },
  {
    id: "banning",
    trigger: { type: "stage", stage: "banning" },
    titleKey: "training.tipBanningTitle",
    messageKey: "training.tipBanningBody",
    position: "center",
  },

  // ── Playing phase — first questions ───────────────────────
  {
    id: "playing-q1",
    highlight: "[data-pitch-root]",
    trigger: { type: "questionIndex", index: 0 },
    titleKey: "training.tipPossessionTitle",
    messageKey: "training.tipPossessionBody",
    position: "bottom",
  },
  // Fires right after the player has SEEN their first bar battle + score flight.
  {
    id: "bar-battle",
    highlight: "[data-pitch-root]",
    trigger: { type: "questionIndex", index: 1 },
    titleKey: "training.tipBarBattleTitle",
    messageKey: "training.tipBarBattleBody",
    position: "top",
  },
  {
    id: "goal-meter",
    highlight: "[data-goal-progress-bar]",
    trigger: { type: "questionIndex", index: 2 },
    titleKey: "training.tipGoalMeterTitle",
    messageKey: "training.tipGoalMeterBody",
    position: "top",
  },
  {
    id: "speed",
    highlight: "[data-question-panel]",
    trigger: { type: "questionIndex", index: 3 },
    titleKey: "training.tipSpeedTitle",
    messageKey: "training.tipSpeedBody",
    position: "bottom",
  },

  // ── The scripted perfect-round showcase ───────────────────
  {
    id: "goal-demo",
    highlight: "[data-pitch-root]",
    trigger: { type: "event", event: "goal-demo" },
    titleKey: "training.tipGoalDemoTitle",
    messageKey: "training.tipGoalDemoBody",
    position: "bottom",
  },

  // ── Zone triggers ─────────────────────────────────────────
  {
    id: "att-zone",
    highlight: "[data-pitch-root]",
    trigger: { type: "zone", zone: "ATT" },
    titleKey: "training.tipAttZoneTitle",
    messageKey: "training.tipAttZoneBody",
    position: "top",
  },

  // ── Shot phase ────────────────────────────────────────────
  // NOTE: deliberately no tooltip on the shot itself — pausing there cuts the
  // charge → kick → goal sequence in half. The goal/saved tooltips below fire
  // AFTER the animation lands.
  {
    id: "goal-scored",
    highlight: "[data-pitch-root]",
    trigger: { type: "phase", phase: "goal" },
    titleKey: "training.tipGoalTitle",
    messageKey: "training.tipGoalBody",
    position: "center",
  },
  {
    id: "shot-saved",
    highlight: "[data-pitch-root]",
    trigger: { type: "phase", phase: "saved" },
    titleKey: "training.tipSavedTitle",
    messageKey: "training.tipSavedBody",
    position: "center",
  },

  // ── Halftime ──────────────────────────────────────────────
  {
    id: "halftime",
    trigger: { type: "stage", stage: "halftime" },
    titleKey: "training.tipHalftimeTitle",
    messageKey: "training.tipHalftimeBody",
    position: "center",
  },

  // ── Penalties ─────────────────────────────────────────────
  {
    id: "penalties",
    trigger: { type: "stage", stage: "penalties" },
    titleKey: "training.tipPenaltiesTitle",
    messageKey: "training.tipPenaltiesBody",
    position: "center",
  },
  {
    id: "penalty-shooter",
    highlight: "[data-pitch-root]",
    trigger: { type: "event", event: "penalty-shooter" },
    titleKey: "training.tipPenShooterTitle",
    messageKey: "training.tipPenShooterBody",
    position: "bottom",
  },
  {
    id: "penalty-keeper",
    highlight: "[data-pitch-root]",
    trigger: { type: "event", event: "penalty-keeper" },
    titleKey: "training.tipPenKeeperTitle",
    messageKey: "training.tipPenKeeperBody",
    position: "bottom",
  },
  {
    id: "penalty-sudden-death",
    highlight: "[data-pitch-root]",
    trigger: { type: "event", event: "penalty-sudden-death" },
    titleKey: "training.tipPenSuddenDeathTitle",
    messageKey: "training.tipPenSuddenDeathBody",
    position: "bottom",
  },

  // ── Results ───────────────────────────────────────────────
  {
    id: "results",
    trigger: { type: "stage", stage: "results" },
    titleKey: "training.tipResultsTitle",
    messageKey: "training.tipResultsBody",
    position: "center",
  },
];
