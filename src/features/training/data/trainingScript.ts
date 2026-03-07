/**
 * Per-question AI behaviour script.
 * Controls whether the bot answers correctly, how fast it answers (display delay + simulated time).
 * Script is designed so the player wins 2-1 or 3-1 if answering correctly.
 * If the player gets a question wrong, the bot also "misses" to keep it close.
 */
export interface TrainingScriptEntry {
  /** Whether the bot answers correctly when the player also answers correctly */
  botCorrectIfPlayerCorrect: boolean;
  /** Whether the bot answers correctly when the player gets it wrong */
  botCorrectIfPlayerWrong: boolean;
  /** Bot answer delay in ms (when the "opponent answered" indicator appears) */
  botDelayMs: number;
  /** Bot's simulated answer time in seconds (used for speed comparison) */
  botTimeSec: number;
}

export const TRAINING_SCRIPT: TrainingScriptEntry[] = [
  // ── Half 1 ──
  // Q1: Both correct, bot slower — teaches forward movement
  { botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 4000, botTimeSec: 5 },
  // Q2: Bot wrong — player gains big ground
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6 },
  // Q3: Bot wrong — push player into ATT zone, build momentum
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 6000, botTimeSec: 7 },
  // Q4: Bot correct but slower — player still advances, may trigger shot
  { botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 3500, botTimeSec: 5 },
  // Q5: Bot wrong — player scores or pushes further
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5500, botTimeSec: 6 },
  // Q6: Bot correct — end of half tension
  { botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: true, botDelayMs: 4000, botTimeSec: 4 },

  // ── Half 2 ──
  // Q7: Bot wrong — advantage early in 2nd half
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6 },
  // Q8: Bot correct — keep tension
  { botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 3000, botTimeSec: 3 },
  // Q9: Bot wrong — push toward goal
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 6000, botTimeSec: 7 },
  // Q10: Bot wrong — player should score
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6 },
  // Q11: Bot correct — opponent tension, pushes back
  { botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: true, botDelayMs: 2500, botTimeSec: 3 },
  // Q12: Bot wrong — let player finish strong
  { botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5500, botTimeSec: 6 },
];
