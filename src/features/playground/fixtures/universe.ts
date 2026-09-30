/**
 * An invented football universe for the playground: no real player, club or answer list may appear here (the repository is
 * public, and the games' answers are private). Names deliberately include shared surnames, diacritics and long names.
 */
export const CLUB = { aurora: "Atlético Aurora", brisa: "Real Brisa", nube: "Deportivo Nube" } as const;

export const PLAYERS = [
  "Tomás Varelo", "Iker Montañés", "Bruno Salcedal", "Nico Arrizábal", "Dante Ferrolo", "Lucas Oyarzábal",
  "Mateo Quirogal", "Julián Brizuelo", "Santi Varelo", "Álvaro Peñalosa-Ibarrondo", "Emi Castañar", "Fede Luquín",
  "Gael Ortuzar", "Hugo Maldonar", "Ignacio Retamal", "Joaquín Zubeldo",
] as const;

export const NAMES: [string, string] = ["Vos", "Rival Inventado 4821"];

/** A portrait path that does not exist: every card shows its missing-image fallback, never a real face. */
export const NO_PORTRAIT = "/playground/no-portrait.webp";
