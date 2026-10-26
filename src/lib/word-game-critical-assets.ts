import fontAssets from "./word-game-font-assets.json";

// Public word-game pages only: do not add speculative preloads to other screens.
const WORD_GAME_PATHS = new Set([
  "/en/football-games/football-name-chain",
  "/en/football-games/played-for-both-clubs",
  "/es/juegos-de-futbol/cadena-de-futbolistas",
  "/es/juegos-de-futbol/jugador-en-comun",
  "/ka/football-games/football-name-chain",
  "/ka/football-games/played-for-both-clubs",
  "/tr/futbol-oyunlari/son-harfle-futbolcu",
  "/tr/futbol-oyunlari/ortak-futbolcu-oyunu",
  "/en/football-games/football-horserace",
  "/es/juegos-de-futbol/carrera-de-caballos-futbolera",
  "/ka/football-games/football-horserace",
  "/tr/futbol-oyunlari/futbol-at-yarisi",
  "/en/football-games/football-codenames",
  "/es/juegos-de-futbol/codenames-futbolero",
  "/ka/football-games/football-codenames",
  "/tr/futbol-oyunlari/futbol-codenames",
  "/en/football-games/football-odd-one-out",
  "/es/juegos-de-futbol/dato-falso-futbolero",
  "/ka/football-games/football-odd-one-out",
  "/tr/futbol-oyunlari/hangisi-yanlis",
  "/en/football-games/football-connections",
  "/es/juegos-de-futbol/conexiones-futboleras",
  "/ka/football-games/football-connections",
  "/tr/futbol-oyunlari/futbol-connections",
  "/ru/futbolnye-igry/futbolnye-svyazi",
  "/pt/jogos-de-futebol/conexoes-do-futebol",
  "/de/fussballspiele/fussball-connections",
]);

export function isWordGameLandingPath(pathname: string): boolean {
  return WORD_GAME_PATHS.has(pathname.replace(/\/$/, ""));
}

export function wordGameFontPreloads(pathname: string): string[] {
  if (!isWordGameLandingPath(pathname)) return [];
  // This page's Georgian copy uses the existing system glyph fallback. Let
  // CSS discover any Latin fragments/digits it actually renders, rather than
  // speculating on all four Latin weights. Keep its word-shell classification.
  if (pathname.replace(/\/$/, "") === "/ka/football-games/played-for-both-clubs") return [];
  // These four weights were requested above the fold in the mobile traces.
  const subsets = pathname.startsWith("/tr/") ? ["latin", "latin-ext"] : ["latin"];
  return subsets.flatMap((subset) => [400, 600, 700, 900].map((weight) =>
    fontAssets[`poppins-${subset}-${weight}` as keyof typeof fontAssets],
  ));
}
