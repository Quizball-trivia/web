/**
 * Invented-universe fixtures for the Mentalista playground: categories and their answer sets are made up (drawn from the
 * shared invented `PLAYERS`), never real football content. The server build reads a private pool instead.
 */
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import type { AvatarCustomization } from "@/types/game";
import type { Category } from "@/features/mentalista/mentalista.engine";
import { PLAYERS } from "./universe";

interface CategoryFixture {
  id: string;
  labels: Record<string, string>;
  answers: readonly string[];
}

/** Six invented categories (one per default round). Answer lists overlap names on purpose (shared surnames, diacritics). */
export const MENTALISTA_CATEGORIES: readonly CategoryFixture[] = [
  { id: "aurora-xi", labels: { en: "Atlético Aurora — a starter", es: "Atlético Aurora — un titular", ka: "Atlético Aurora — ძირითადი", tr: "Atlético Aurora — bir ilk 11" }, answers: PLAYERS.slice(0, 5) },
  { id: "brisa-xi", labels: { en: "Real Brisa — a midfielder", es: "Real Brisa — un mediocampista", ka: "Real Brisa — ნახევარმცველი", tr: "Real Brisa — bir orta saha" }, answers: PLAYERS.slice(4, 9) },
  { id: "nube-xi", labels: { en: "Deportivo Nube — a defender", es: "Deportivo Nube — un defensor", ka: "Deportivo Nube — მცველი", tr: "Deportivo Nube — bir defans" }, answers: PLAYERS.slice(8, 13) },
  { id: "captains", labels: { en: "Ever wore the captain's armband", es: "Alguna vez fue capitán", ka: "ოდესმე იყო კაპიტანი", tr: "Hiç kaptanlık yaptı" }, answers: [PLAYERS[0], PLAYERS[3], PLAYERS[6], PLAYERS[9], PLAYERS[12]] },
  { id: "left-foot", labels: { en: "A left-footed forward", es: "Un delantero zurdo", ka: "მემარცხენე თავდამსხმელი", tr: "Solak bir forvet" }, answers: PLAYERS.slice(10, 15) },
  { id: "homegrown", labels: { en: "Came through the academy", es: "Salió de la cantera", ka: "აკადემიიდან მოვიდა", tr: "Altyapıdan geldi" }, answers: [PLAYERS[1], PLAYERS[5], PLAYERS[8], PLAYERS[11], PLAYERS[14]] },
];

/** Build the engine categories for one locale (the engine stores a single localised label; answers are locale-agnostic). */
export const categoriesFor = (locale: string): Category[] =>
  MENTALISTA_CATEGORIES.map((c) => ({ id: c.id, label: c.labels[locale] ?? c.labels.en, answers: c.answers }));

export interface SeatMeta {
  name: string;
  avatar: AvatarCustomization;
}

const SEAT_NAMES = ["Vos", "Zoe M.", "Ravi K.", "Nadia P.", "Tomé L.", "Ira G."] as const;

export const SEAT_META: SeatMeta[] = SEAT_NAMES.map((name, i) => ({ name, avatar: randomBotAvatar(`mentalista-seat-${i}`) }));
