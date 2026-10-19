// An invented football universe for the playground: made-up players and clubs, so no real fact (or fake) ever sits in
// this public repository. The real deck the owner reviewed lives in public/dev-data/dato-falso.json (never committed);
// the live playground uses it when it is there.
import type { SimCard } from "@/features/dato-falso/datoFalso.sim";
import type { DfOption } from "@/features/dato-falso/datoFalso.view";

const G = "/assets/football-grid";
const club = (id: string, label: string): DfOption => ({ id, label, art: { kind: "text" } });
const flag = (id: string, label: string): DfOption => ({ id, label, art: { kind: "flag", src: `${G}/flags/${id}.svg` } });
const shirt = (n: string): DfOption => ({ id: `n${n}`, label: n, art: { kind: "shirt", number: n } });
const cup = (id: string, label: string): DfOption => ({ id, label, art: { kind: "text" } });
const player = (name: string) => ({ name, portrait: null, kind: "player" as const });

export const INVENTED_DECK: SimCard[] = [
  {
    id: "ardo-clubs", category: "clubs", level: 1, subject: player("Tomás Ardoveri"),
    options: [club("puerto-azul", "Puerto Azul FC"), club("real-caliza", "Real Caliza"), club("norte-united", "Norte United"), club("athletic-brisa", "Athletic Brisa"), club("ciudad-roja", "Ciudad Roja")], fake: "ciudad-roja",
    explain: { en: "Played for Puerto Azul, Real Caliza, Norte United and Athletic Brisa. Never for Ciudad Roja.", es: "Jugó en Puerto Azul, Real Caliza, Norte United y Athletic Brisa. Nunca en Ciudad Roja." },
  },
  {
    id: "velani-leagues", category: "leagues", level: 1, subject: player("Marco Velani"),
    options: [flag("it", "Italy"), flag("es", "Spain"), flag("gb-eng", "England"), flag("fr", "France"), flag("jp", "Japan")], fake: "jp",
    explain: { en: "Invented career: Italy, Spain, England and France. Never Japan.", es: "Carrera inventada: Italia, España, Inglaterra y Francia. Nunca Japón." },
  },
  {
    id: "okon-numbers", category: "numbers", level: 2, subject: player("Duke Okonmara"),
    options: [shirt("9"), shirt("19"), shirt("11"), shirt("7"), shirt("99")], fake: "n7",
    explain: { en: "Invented career: 9, 19, 11 and 99. Never 7.", es: "Carrera inventada: 9, 19, 11 y 99. Nunca la 7." },
  },
  {
    id: "lindqvist-trophies", category: "trophies", level: 2, subject: player("Erik Lindqvist"),
    options: [cup("league-north", "Northern League"), cup("cup-silver", "Silver Cup"), cup("continental", "Continental Trophy"), cup("super-shield", "Super Shield"), cup("golden-boot", "Golden Boot")], fake: "golden-boot",
    explain: { en: "Won the Northern League, Silver Cup, Continental Trophy and Super Shield. Never the Golden Boot.", es: "Ganó la Liga del Norte, la Copa de Plata, el Trofeo Continental y el Supercampeón. Nunca la Bota de Oro." },
  },
  {
    id: "salas-clubs", category: "clubs", level: 2, subject: player("Iker Salaberri"),
    options: [club("montes-sc", "Montes SC"), club("isla-verde", "Isla Verde"), club("deportivo-faro", "Deportivo Faro"), club("union-sierra", "Unión Sierra"), club("racing-mar", "Racing Mar")], fake: "deportivo-faro",
    explain: { en: "Played for Montes, Isla Verde, Unión Sierra and Racing Mar. Never for Deportivo Faro.", es: "Jugó en Montes, Isla Verde, Unión Sierra y Racing Mar. Nunca en Deportivo Faro." },
  },
  {
    id: "kowal-leagues", category: "leagues", level: 3, subject: player("Piotr Kowalczan"),
    options: [flag("pl", "Poland"), flag("de", "Germany"), flag("nl", "Netherlands"), flag("pt", "Portugal"), flag("gr", "Greece")], fake: "pt",
    explain: { en: "Invented career: Poland, Germany, Netherlands and Greece. Never Portugal.", es: "Carrera inventada: Polonia, Alemania, Países Bajos y Grecia. Nunca Portugal." },
  },
  {
    id: "mbeki-clubs", category: "clubs", level: 1, subject: player("Samuel Mbekani"),
    options: [club("lagoa-fc", "Lagoa FC"), club("estrella-sur", "Estrella del Sur"), club("castelo", "Castelo AC"), club("riverside", "Riverside Town"), club("valle-alto", "Valle Alto")], fake: "lagoa-fc",
    explain: { en: "Played for Estrella del Sur, Castelo, Riverside and Valle Alto. Never for Lagoa.", es: "Jugó en Estrella del Sur, Castelo, Riverside y Valle Alto. Nunca en Lagoa." },
  },
  {
    id: "rossi-numbers", category: "numbers", level: 3, subject: player("Luca Rossanno"),
    options: [shirt("4"), shirt("14"), shirt("5"), shirt("24"), shirt("15")], fake: "n15",
    explain: { en: "Invented career: 4, 14, 5 and 24. Never 15.", es: "Carrera inventada: 4, 14, 5 y 24. Nunca la 15." },
  },
  {
    id: "duarte-trophies", category: "trophies", level: 3, subject: player("Rui Duartino"),
    options: [cup("cup-bronze", "Bronze Cup"), cup("league-west", "Western League"), cup("continental", "Continental Trophy"), cup("super-shield", "Super Shield"), cup("cup-silver", "Silver Cup")], fake: "continental",
    explain: { en: "Won the Bronze Cup, Western League, Super Shield and Silver Cup. Never the Continental Trophy.", es: "Ganó la Copa de Bronce, la Liga del Oeste, el Supercampeón y la Copa de Plata. Nunca el Trofeo Continental." },
  },
  {
    id: "brekke-clubs", category: "clubs", level: 3, subject: player("Nils Brekkestad"),
    options: [club("fjord-if", "Fjord IF"), club("nordby", "Nordby BK"), club("alpenstadt", "Alpenstadt 04"), club("borussia-kalt", "Borussia Kalt"), club("city-of-gales", "City of Gales")], fake: "alpenstadt",
    explain: { en: "Played for Fjord, Nordby, Borussia Kalt and City of Gales. Never for Alpenstadt.", es: "Jugó en Fjord, Nordby, Borussia Kalt y City of Gales. Nunca en Alpenstadt." },
  },
];
