/** Four-language text as the pool stores it. */
export type SampleText = { en: string; ka: string; es: string; tr: string };

/** One MCQ from the frozen bank (Trivia Mines, Free Kicks, Road to Goal samples). */
export interface SampleQuestion {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  category: SampleText;
  prompt: SampleText;
  options: Array<{ id: string; text: SampleText }>;
  correctOptionId: string;
}

export interface SampleSquadSpinReel {
  family: "club" | "country" | "league" | "manager" | "trophy_award" | "position";
  id: string;
  key: string;
  label_en: string;
  label_ka: string;
  asset_key: string | null;
}

/** One frozen Squad Spin combo: the reels the player sees, every valid answer, and the reviewed aliases. */
export interface SampleSquadSpinCombo {
  id: string;
  tier: "t3e" | "t3m" | "t4" | "t5";
  reels: SampleSquadSpinReel[];
  answers: Array<{ id: string; name_en: string; name_ka: string | null; image_url: string | null }>;
  aliases: Array<{ player_id: string; alias: string; locale: string; policy: string }>;
}
