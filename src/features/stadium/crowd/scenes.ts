import {
  devilReveal, roaringLion, boxerVictory, powerHero,
  lisbonTribute, cannonGoal, giantScarf, matrixSave,
} from "./famous-tifos";
import {
  balloons,
  banner,
  confetti,
  emptySeats,
  flags,
  idle,
  mosaic,
  paper,
  poznan,
  pyro,
  scarfTwirl,
  scarfWall,
  surfBanner,
  thunderclap,
  torches,
  wave,
  type Mechanic,
} from "./mechanics";
import {
  binocularsMan,
  crescentStar,
  eyes,
  fiveCrossFlag,
  flamesWithText,
  hoops,
  shirtTwelve,
  textSprite,
  type MosaicSprite,
} from "./sprites";

export type CrowdScene = {
  id: string;
  label: string;
  /** Team or occasion the scene is modelled on. */
  team: string;
  blurb: string;
  mechanic: Mechanic;
  /** Card / scarf / flag / particle colours. Index 0 is the background or first colour. */
  palette: string[];
  sprite?: MosaicSprite | ((text: string) => MosaicSprite);
  /** Default text for scenes that render a line of text. */
  text?: string;
  /** The scene shows the free-text field and uses its value. */
  usesText?: boolean;
  variant?: string;
  /** Jitter the whole stage on a beat. */
  shake?: boolean;
};

export type SceneGroup = { id: string; label: string; scenes: CrowdScene[] };

const BLACK = "#0B0B0B";
const WHITE = "#FFFFFF";
const YELLOW = "#FFE500";

// Give story tifos time to finish before reduced motion freezes their final tableau.
const storyMosaic: Mechanic = { ...mosaic, stillAt: 5, duration: 6, loops: false };

export const SCENE_GROUPS: SceneGroup[] = [
  {
    id: "famous-tifos",
    label: "New · Famous tifo adaptations",
    scenes: [
      { id: "milan-devil", label: "Devil reveal", team: "Milan · 2023 inspiration", blurb: "Yellow eyes, horns and a red devil emerge; a red card wave spreads outwards.", mechanic: storyMosaic, palette: [BLACK, "#E32935", "#FFE500", WHITE], sprite: devilReveal },
      { id: "copenhagen-lion", label: "Roaring lion", team: "Copenhagen · 2023 inspiration", blurb: "Red eyes ignite, the golden mane forms and the lion opens its mouth.", mechanic: storyMosaic, palette: ["#071B36", "#AA641F", "#E6B349", "#FF332E", "#FFF0BD"], sprite: roaringLion },
      { id: "gala-boxer", label: "Boxer victory", team: "Galatasaray · Rocky inspiration", blurb: "A card-art boxer rises and lifts both gloves in victory, followed by gold card sparkles.", mechanic: storyMosaic, palette: [BLACK, "#D62932", "#DFA05B", "#39251C", "#FFE05A"], sprite: boxerVictory },
      { id: "psg-power-hero", label: "Power-up hero", team: "PSG · Dragon Ball inspiration", blurb: "A spiky-haired hero emerges in an orange kit as a gold aura grows and bursts across the cards.", mechanic: storyMosaic, palette: ["#071629", "#FFE14A", "#F57D24", "#F4BE83", "#1753AE", "#986518"], sprite: powerHero },
      { id: "celtic-lisbon", label: "Lisbon Lions", team: "Celtic · 2017 tribute inspiration", blurb: "Green hoops reveal a gold European cup, 1967 and LIONS across the stand.", mechanic: storyMosaic, palette: ["#F6F0DC", "#087347", "#E9BC46", "#B98420"], sprite: lisbonTribute },
      { id: "copenhagen-cannon", label: "Cannon to GOAL", team: "Copenhagen · cannon inspiration", blurb: "A cannon fires a football towards a goal. The impact changes the entire mosaic into GOAL.", mechanic: storyMosaic, palette: ["#071B36", "#3476B9", WHITE, "#FFD04A"], sprite: cannonGoal },
      { id: "lens-giant-scarf", label: "Giant scarf", team: "Lens · 2023 inspiration", blurb: "Two giant hands raise one red-and-gold QUIZBALL scarf, with fluttering fringes.", mechanic: storyMosaic, palette: ["#23130E", "#B9212D", "#FFD44B", "#E6AA71"], sprite: giantScarf },
      { id: "milan-matrix-save", label: "Matrix save", team: "Milan · 2023 inspiration", blurb: "A keeper in a long green coat stops a flying football with one raised palm, against falling green cards.", mechanic: storyMosaic, palette: ["#050E0A", "#151C19", "#EDFFE8", "#DCAE80", "#35A45D"], sprite: matrixSave },
    ],
  },
  {
    id: "mosaic",
    label: "Card mosaic",
    scenes: [
      {
        id: "dortmund-binoculars",
        label: "Binoculars man",
        team: "Dortmund vs Málaga, 2013",
        blurb:
          "Trophy cards rise first, then a gold-capped fan with round binoculars, gripping hands and a toothy grin emerges in card art.",
        mechanic: mosaic,
        palette: ["#101010", "#F5A623", "#28251D", "#FFF1C4", "#E9C54B", "#D99135", "#FFE994"],
        sprite: binocularsMan,
      },
      {
        id: "barca-shirt-12",
        label: 'Shirt "12"',
        team: "Barcelona vs Real Madrid, 2015",
        blurb: "Stadium-wide shirt with the twelfth man on the back.",
        mechanic: mosaic,
        palette: ["#A50044", "#004D98", "#FFD100"],
        sprite: shirtTwelve,
      },
      {
        id: "bayern-shirt",
        label: "Südkurve shirt",
        team: "Bayern vs Real Madrid, 2026",
        blurb:
          "Red-and-white shirt across three tiers, same sprite, club palette.",
        mechanic: mosaic,
        palette: ["#DC052D", WHITE, "#DC052D"],
        sprite: shirtTwelve,
      },
      {
        id: "text-wall",
        label: "Text wall",
        team: "Barcelona vs Liverpool, 2019",
        blurb:
          "90,000 cards spelling a line. Type your own, up to 15 characters.",
        mechanic: mosaic,
        palette: ["#004D98", "#FFD100"],
        sprite: textSprite,
        text: "COLOR EUROPE",
        usesText: true,
      },
      {
        id: "sponsor-wall",
        label: "Sponsor wall",
        team: "Quizball",
        blurb: "The same text mosaic in brand colours for a sponsor name.",
        mechanic: mosaic,
        palette: ["#071013", YELLOW],
        sprite: textSprite,
        text: "QUIZBALL",
        usesText: true,
      },
      {
        id: "gala-hell",
        label: "Welcome to Hell",
        team: "Galatasaray, RAMS Park",
        blurb: "Flames climb the stand under the famous greeting.",
        mechanic: mosaic,
        palette: [BLACK, "#E30613", "#FF6C0A", YELLOW, WHITE],
        sprite: flamesWithText("WELCOME TO HELL"),
      },
      {
        id: "ottoman-crescent",
        label: "Crescent and star",
        team: "Galatasaray, 2014 / Türkiye",
        blurb: "Ottoman flag mosaic. Doubles as a national-team scene.",
        mechanic: mosaic,
        palette: ["#E30A17", WHITE],
        sprite: crescentStar,
      },
      {
        id: "celtic-hoops",
        label: "Hoops",
        team: "Celtic Park",
        blurb: "Green and white hoops across the whole stand.",
        mechanic: mosaic,
        palette: [WHITE, "#00843D"],
        sprite: hoops,
      },
      {
        id: "georgia-flag",
        label: "Five-cross flag",
        team: "Georgia",
        blurb: "The home-market scene: white wall, red five-cross flag.",
        mechanic: mosaic,
        palette: [WHITE, "#FF0000"],
        sprite: fiveCrossFlag,
      },
      {
        id: "brondby-eyes",
        label: "Sinister eyes",
        team: "Brøndby vs Copenhagen, 2019",
        blurb: "Two narrowed eyes rising out of the stand.",
        mechanic: mosaic,
        palette: ["#003A70", "#FFD100", BLACK],
        sprite: eyes,
      },
    ],
  },
  {
    id: "scarves",
    label: "Scarves",
    scenes: [
      {
        id: "ynwa-liverpool",
        label: "Scarf wall",
        team: "Liverpool, Anfield",
        blurb:
          "You'll Never Walk Alone before kickoff, scarves swaying across the Kop.",
        mechanic: scarfWall,
        palette: ["#C8102E", WHITE],
      },
      {
        id: "ynwa-celtic",
        label: "Scarf wall",
        team: "Celtic Park",
        blurb: "Same anthem moment in green and white.",
        mechanic: scarfWall,
        palette: ["#00843D", WHITE],
      },
      {
        id: "ynwa-dortmund",
        label: "Scarf wall",
        team: "Dortmund Südtribüne",
        blurb: "Yellow on black.",
        mechanic: scarfWall,
        palette: [YELLOW, BLACK],
      },
      {
        id: "scarf-twirl",
        label: "Scarf twirl",
        team: "Any goal",
        blurb: "Scarves swung overhead after a goal. Alternative to the wave.",
        mechanic: scarfTwirl,
        palette: [YELLOW, WHITE],
      },
    ],
  },
  {
    id: "torches",
    label: "Phone torches",
    scenes: [
      {
        id: "torches-tribute",
        label: "Tribute minute",
        team: "Any club",
        blurb: "Lights down, torches on in random order.",
        mechanic: torches,
        palette: ["#FFF7D6"],
      },
      {
        id: "torches-kickoff",
        label: "Night kickoff",
        team: "Champions League night",
        blurb:
          "Torches under the presented-by lockup. Turn on the kickoff slot.",
        mechanic: torches,
        palette: ["#FFF7D6"],
      },
      {
        id: "torches-wave",
        label: "Torch wave",
        team: "Any club",
        blurb: "Torches come on in a wave that circles the bowl.",
        mechanic: torches,
        palette: ["#FFF7D6"],
        variant: "wave",
      },
    ],
  },
  {
    id: "paper",
    label: "Paper shower",
    scenes: [
      {
        id: "paper-river",
        label: "Papelitos",
        team: "River Plate, Monumental",
        blurb: "Red and white paper as the team walks out.",
        mechanic: paper,
        palette: [WHITE, "#E30613"],
      },
      {
        id: "paper-argentina",
        label: "Ticker tape",
        team: "Argentina, 1978",
        blurb: "Sky blue and white.",
        mechanic: paper,
        palette: ["#75AADB", WHITE],
      },
      {
        id: "paper-boca",
        label: "Bombonera",
        team: "Boca Juniors",
        blurb: "Paper plus the whole stand shaking.",
        mechanic: paper,
        palette: ["#0B3D91", "#FFD100"],
        shake: true,
      },
    ],
  },
  {
    id: "rhythm",
    label: "Beat and bounce",
    scenes: [
      {
        id: "thunderclap",
        label: "Viking clap",
        team: "Iceland, Euro 2016",
        blurb: "Arms up on a beat that speeds up, then the bowl bounces.",
        mechanic: thunderclap,
        palette: ["#02529C", "#DC1E35"],
        shake: true,
      },
      {
        id: "poznan-lech",
        label: "Poznań",
        team: "Lech Poznań",
        blurb: "Backs turned, arms linked, bouncing in unison.",
        mechanic: poznan,
        palette: ["#0B3D91", WHITE],
      },
      {
        id: "poznan-city",
        label: "Poznań",
        team: "Manchester City",
        blurb: "The adopted version, as a goal celebration.",
        mechanic: poznan,
        palette: ["#6CABDD", WHITE],
      },
    ],
  },
  {
    id: "pyro",
    label: "Pyro",
    scenes: [
      {
        id: "pyro-gala",
        label: "Red flares",
        team: "Galatasaray",
        blurb: "Flares in every corner, smoke rolling over the stands.",
        mechanic: pyro,
        palette: ["#FF2A1A", "#FFB000"],
      },
      {
        id: "pyro-brondby",
        label: "Yellow pyro",
        team: "Brøndby",
        blurb: "Back-lit derby night. Pair with the eyes mosaic.",
        mechanic: pyro,
        palette: ["#FFD100", "#FF8A00"],
      },
      {
        id: "pyro-redstar",
        label: "Marakana",
        team: "Red Star Belgrade",
        blurb: "Whole-bowl red.",
        mechanic: pyro,
        palette: ["#FF1F1F", "#FF6C0A"],
      },
    ],
  },
  {
    id: "flags",
    label: "Flags",
    scenes: [
      {
        id: "flags-marseille",
        label: "Flag sea",
        team: "Marseille vs Lyon, 2019",
        blurb: "All four stands, sky blue and white.",
        mechanic: flags,
        palette: ["#2FAEE0", WHITE],
      },
      {
        id: "flags-athletic",
        label: "Flag sea",
        team: "Athletic Bilbao, San Mamés",
        blurb: "Red and white from Herri Norte.",
        mechanic: flags,
        palette: ["#EE2523", WHITE],
      },
      {
        id: "flags-atletico",
        label: "Flag sea",
        team: "Atlético, Frente Atlético",
        blurb: "Red, white and navy.",
        mechanic: flags,
        palette: ["#CB3524", WHITE, "#272E61"],
      },
      {
        id: "flags-georgia",
        label: "Flag sea",
        team: "Georgia, Euro 2024",
        blurb: "The Georgian end in Dortmund.",
        mechanic: flags,
        palette: [WHITE, "#FF0000"],
      },
    ],
  },
  {
    id: "banners",
    label: "Banners",
    scenes: [
      {
        id: "banner-sponsor",
        label: "Sponsor banner",
        team: "Quizball",
        blurb:
          "A sheet unrolls over the south stand at kickoff and holds. The banner is the ad.",
        mechanic: banner,
        palette: ["#FF6C0A", WHITE],
        text: "QUIZBALL",
        usesText: true,
      },
      {
        id: "banner-tribute",
        label: "Tribute banner",
        team: "Lyon, 2023",
        blurb: "Farewell banner with a name on it.",
        mechanic: banner,
        palette: [BLACK, YELLOW],
        text: "MERCI",
        usesText: true,
      },
      {
        id: "surf-banner",
        label: "Crowd-surfing banner",
        team: "Germany / Italy",
        blurb:
          "Passed hand over hand across the stand. Can carry a sponsor line.",
        mechanic: surfBanner,
        palette: [YELLOW, BLACK],
        text: "QUIZBALL",
        usesText: true,
      },
    ],
  },
  {
    id: "celebration",
    label: "Celebration",
    scenes: [
      {
        id: "wave",
        label: "Mexican wave",
        team: "Any goal",
        blurb: "The existing goal celebration, now travelling round the bowl.",
        mechanic: wave,
        palette: [],
      },
      {
        id: "balloons-leverkusen",
        label: "Balloon release",
        team: "Leverkusen, 2024 title",
        blurb: "Balloons in club colours drift up out of the stands.",
        mechanic: balloons,
        palette: ["#E32221", BLACK, WHITE],
      },
      {
        id: "confetti-final",
        label: "Confetti cannons",
        team: "Cup final",
        blurb: "Bursts from the four track corners.",
        mechanic: confetti,
        palette: [YELLOW, "#FF6C0A", WHITE, "#1645FF"],
      },
    ],
  },
  {
    id: "misc",
    label: "Other",
    scenes: [
      {
        id: "idle",
        label: "Idle",
        team: "In play",
        blurb: "Crowd at rest.",
        mechanic: idle,
        palette: [],
      },
      {
        id: "empty-seats",
        label: "Shirts on seats",
        team: "Cologne, 2020 restart",
        blurb: "No fans, shirts and scarves laid over the seats.",
        mechanic: emptySeats,
        palette: [],
      },
    ],
  },
];

export const SCENES: CrowdScene[] = SCENE_GROUPS.flatMap((g) => g.scenes);

export function findScene(id: string): CrowdScene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
