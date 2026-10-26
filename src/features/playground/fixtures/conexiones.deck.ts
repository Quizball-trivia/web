import type { CxBoard, CxTier } from "@/features/conexiones/conexiones.logic";

/** Invented players and links only: the public repo never carries real boards. */
const FIRST = ["Tomás", "Iker", "Bruno", "Nico", "Dante", "Lucas", "Mateo", "Julián", "Santi", "Álvaro", "Emi", "Fede", "Gael", "Hugo", "Ignacio", "Joaquín"];
const LAST = ["Varelo", "Montañés", "Salcedal", "Arrizábal", "Ferrolo", "Oyarzábal", "Quirogal", "Brizuelo", "Peñalosa", "Castañar", "Luquín", "Ortuzar", "Maldonar", "Retamal", "Zubeldo", "Iturbe"];
const LINKS: [string, string][] = [
  ["Played for Real Ficticio", "Jugaron en el Real Ficticio"], ["Won the Copa Inventada", "Ganaron la Copa Inventada"], ["Born in Villa Imaginaria", "Nacieron en Villa Imaginaria"],
  ["Wore the number 23", "Usaron la 23"], ["Coached by Ramón Nadie", "Dirigidos por Ramón Nadie"], ["Scored in the Final Falsa", "Marcaron en la Final Falsa"],
  ["Played for Atlético Ejemplo", "Jugaron en el Atlético Ejemplo"], ["Left-footed keepers", "Arqueros zurdos"],
];

export function inventedBoard(n: number): CxBoard {
  const tiles = Array.from({ length: 16 }, (_, i) => ({ id: `inv${n}-${i}`, name: `${FIRST[(i + n * 3) % 16]} ${LAST[(i * 5 + n) % 16]}`, portrait: null }));
  const groups = [0, 1, 2, 3].map((g) => ({
    id: `inv${n}-g${g}`, tier: (g + 1) as CxTier, link: { en: LINKS[(g + n) % 8][0], es: LINKS[(g + n) % 8][1] },
    members: [0, 1, 2, 3].map((k) => `inv${n}-${(k * 4 + g + n) % 16}`),
    decoys: [1, 2, 3].map((d) => ({ en: LINKS[(g + n + d * 2) % 8][0], es: LINKS[(g + n + d * 2) % 8][1] })),
  }));
  return { id: `inv${n}`, tiles, groups };
}

export const INVENTED_BOARDS: CxBoard[] = Array.from({ length: 6 }, (_, n) => inventedBoard(n));
