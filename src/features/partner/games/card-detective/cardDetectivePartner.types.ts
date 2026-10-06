/** Mirrors backend-node src/modules/partners/games/card-detective/cd-partner.service.ts (CdPlayState). */
import type { ClueKey } from "@/features/fifa-universe/components/DetectiveCard";

type Stats = Record<"pac" | "sho" | "pas" | "dri" | "def" | "phy", number>;

export interface CdClues {
  rating?: number;
  position?: string;
  nation?: { name: string; code: string };
  league?: string;
  club?: string;
  pac?: number;
  sho?: number;
  pas?: number;
  dri?: number;
  def?: number;
  phy?: number;
}

export interface CdRevealedCard {
  name: string;
  editionLabel: string;
  overall: number;
  position: string;
  nation: string;
  nationCode: string;
  league: string;
  club: string;
  stats: Stats;
  faceUrl: string | null;
}

export interface CdPlayState {
  playId: string;
  version: number;
  state: "active" | "finished";
  cardCount: number;
  index: number;
  score: number;
  startPoints: number;
  clueCosts: Record<ClueKey, number>;
  wrongGuessCost: number;
  current: {
    ref: string;
    points: number;
    wrongGuesses: number;
    open: ClueKey[];
    clues: CdClues;
  } | null;
  resolved: Array<{ ref: string; solved: boolean; points: number; card: CdRevealedCard }>;
  finished: { playId: string; score: number; sent: boolean } | null;
}
