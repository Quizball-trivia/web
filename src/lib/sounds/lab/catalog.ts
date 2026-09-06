import originals from "./original-assets.json";
import kenney from "./kenney-assets.json";
import existing from "./existing-assets.json";
import quizup from "./quizup-assets.json";

export interface SoundAsset {
  id: string;
  label: string;
  description: string;
  source: string;
  path: string;
  duration: number;
  bars: number[];
  previewSeconds?: number;
}
export const SOUND_ASSETS: SoundAsset[] = [
  ...originals,
  ...kenney,
  ...existing,
  ...quizup,
];
export const ASSET_BY_ID = Object.fromEntries(
  SOUND_ASSETS.map((asset) => [asset.id, asset]),
);
export const SOURCE_LABELS: Record<string, string> = {
  original: "Quizball original",
  kenney: "Kenney · CC0",
  existing: "Current game audio",
  quizup: "QuizUp · reference",
};
export const STORAGE_KEY = "quizball-sound-lab-v1";
export type SoundAssignments = Record<string, string>;

/** Ignore outdated/unknown IDs, including data from older lab versions. */
export function parseAssignments(raw: string | null): SoundAssignments {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, id]) =>
          key.length < 160 &&
          typeof id === "string" &&
          (id === "silent" ||
            Object.prototype.hasOwnProperty.call(ASSET_BY_ID, id)),
      ),
    );
  } catch {
    return {};
  }
}
