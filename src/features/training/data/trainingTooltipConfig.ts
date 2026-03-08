export type TooltipTrigger =
  | { type: "stage"; stage: string }
  | { type: "questionIndex"; index: number }
  | { type: "zone"; zone: string }
  | { type: "phase"; phase: string }
  | { type: "event"; event: string };

export interface TooltipDefinition {
  id: string;
  trigger: TooltipTrigger;
  title: string;
  message: string;
  position: "top" | "center" | "bottom";
}

export const TOOLTIP_DEFINITIONS: TooltipDefinition[] = [
  // ── Pre-match stages ──────────────────────────────────────
  {
    id: "matchmaking",
    trigger: { type: "stage", stage: "matchmaking" },
    title: "FINDING OPPONENT",
    message:
      "We're searching for an opponent. In real matches you'll face real players in a head-to-head trivia battle on the football pitch!",
    position: "center",
  },
  {
    id: "showdown",
    trigger: { type: "stage", stage: "showdown" },
    title: "MEET YOUR OPPONENT",
    message:
      "Here's who you're up against! Each match is a 1v1 battle — answer trivia questions to move the ball and score goals.",
    position: "center",
  },
  {
    id: "banning",
    trigger: { type: "stage", stage: "banning" },
    title: "BAN A CATEGORY",
    message:
      "Each player bans one category — questions from banned categories won't appear this half. Ban a topic you're weak in!",
    position: "center",
  },

  // ── Playing phase — first questions ───────────────────────
  {
    id: "playing-q1",
    trigger: { type: "questionIndex", index: 0 },
    title: "HOW POSSESSION WORKS",
    message:
      "Both players answer the same question at the same time. If you're correct and your opponent is wrong, you advance toward their goal. If they're correct and you're wrong, they push you back!",
    position: "bottom",
  },
  {
    id: "playing-q2",
    trigger: { type: "questionIndex", index: 1 },
    title: "SPEED MATTERS",
    message:
      "When both players answer correctly, the faster answer gets a bigger advance. Answer quickly to gain the edge! The pitch shows your position — push all the way to the opponent's goal to take a shot.",
    position: "top",
  },

  // ── Zone triggers ─────────────────────────────────────────
  {
    id: "att-zone",
    trigger: { type: "zone", zone: "ATT" },
    title: "ATTACK ZONE",
    message:
      "You've pushed into the attack zone! Keep answering correctly to build momentum and trigger a shot on goal. The closer you get, the more dangerous you become!",
    position: "top",
  },

  // ── Shot phase ────────────────────────────────────────────
  {
    id: "shot-phase",
    trigger: { type: "phase", phase: "shot" },
    title: "SHOT ON GOAL!",
    message:
      "A shot has been triggered! In real matches, both players answer one more question — the attacker must answer correctly to score. If the defender also answers correctly, the shot is saved!",
    position: "center",
  },

  // ── Goal scored ───────────────────────────────────────────
  {
    id: "goal-scored",
    trigger: { type: "phase", phase: "goal" },
    title: "GOOOL!",
    message:
      "The attacker answered correctly and beat the keeper — that's a goal! After a goal, the ball resets to midfield and play continues.",
    position: "center",
  },

  // ── Shot saved ────────────────────────────────────────────
  {
    id: "shot-saved",
    trigger: { type: "phase", phase: "saved" },
    title: "SAVED!",
    message:
      "The keeper answered correctly and stopped the shot! A save pushes the attacker back to midfield. Both answering and defending matter in this game!",
    position: "center",
  },

  // ── Halftime ──────────────────────────────────────────────
  {
    id: "halftime",
    trigger: { type: "stage", stage: "halftime" },
    title: "HALF TIME",
    message:
      "That's the end of the first half! Now you'll each ban one more category for the second half. In real matches, you can also pick a tactical card to change your play style.",
    position: "center",
  },

  // ── Results ───────────────────────────────────────────────
  {
    id: "results",
    trigger: { type: "stage", stage: "results" },
    title: "FULL TIME!",
    message:
      "That's the final whistle! The team with the most goals wins. In real ranked matches you'll earn points and climb the leaderboard. Ready to play for real?",
    position: "center",
  },
];
