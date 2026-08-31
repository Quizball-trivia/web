import type { Locale } from "@/lib/i18n/locale";

export type AboutModeId = "ranked" | "friendly" | "daily" | "auction";

interface AboutModeCopy {
  id: AboutModeId;
  title: string;
  body: string;
}

interface RankedStepCopy {
  title: string;
  body: string;
}

export interface AboutGameModesCopy {
  overviewEyebrow: string;
  overviewTitle: string;
  modesEyebrow: string;
  modesTitle: string;
  modesIntro: string;
  modes: AboutModeCopy[];
  rankedEyebrow: string;
  rankedTitle: string;
  rankedIntro: string;
  rankedSteps: RankedStepCopy[];
  rankedMeta: string;
}

export const ABOUT_GAME_MODES_COPY: Record<Locale, AboutGameModesCopy> = {
  en: {
    overviewEyebrow: "The game",
    overviewTitle: "Football knowledge that plays like a match",
    modesEyebrow: "Game modes",
    modesTitle: "Ways to play QuizBall",
    modesIntro:
      "Warm up with a daily challenge, play a friend without rank pressure, or enter a competitive 1v1 and climb the table. Each mode uses football knowledge differently.",
    modes: [
      {
        id: "ranked",
        title: "Ranked 1v1",
        body:
          "Play a live head-to-head match, win possession with correct answers, score goals and earn RP to move through the QuizBall ranks.",
      },
      {
        id: "friendly",
        title: "Friendly 1v1",
        body:
          "Create or join a private room and play a friend with custom rules. No Rank Points are at stake.",
      },
      {
        id: "daily",
        title: "Daily challenges",
        body:
          "Play a rotating set of short football games, including clues, true or false, career paths, high-low and Money Drop, then return for fresh challenges.",
      },
      {
        id: "auction",
        title: "Football auction",
        body:
          "Use a $350M budget to bid on mystery footballers and build a seven-player squad. Smart prices, profit and squad chemistry decide the winner.",
      },
    ],
    rankedEyebrow: "Competitive mode",
    rankedTitle: "How Ranked 1v1 works",
    rankedIntro:
      "Ranked turns the same football questions into a short live match against another player.",
    rankedSteps: [
      {
        title: "1. Block a category",
        body:
          "Three random football categories appear. Each player blocks one, and the match uses the category left on the pitch.",
      },
      {
        title: "2. Win possession",
        body:
          "Both players answer live questions. Correct answers move possession, build attacks and create chances to score.",
      },
      {
        title: "3. Score and climb",
        body:
          "Goals decide the result. After the match, Rank Points update your tier and position on the leaderboard.",
      },
    ],
    rankedMeta: "Usually 12–18 questions · Around 5 minutes · Rank Points at stake",
  },
  ka: {
    overviewEyebrow: "თამაში",
    overviewTitle: "საფეხბურთო ცოდნა, რომელიც ნამდვილ მატჩად იქცევა",
    modesEyebrow: "თამაშის რეჟიმები",
    modesTitle: "როგორ ითამაშო QuizBall",
    modesIntro:
      "დაიწყე ყოველდღიური გამოწვევით, ეთამაშე მეგობარს რეიტინგის რისკის გარეშე ან ჩაერთე რეიტინგულ 1v1-ში და დაწინაურდი ცხრილში. თითოეულ რეჟიმში საფეხბურთო ცოდნა განსხვავებულად მუშაობს.",
    modes: [
      {
        id: "ranked",
        title: "რეიტინგული 1v1",
        body:
          "ითამაშე ცოცხალი პირისპირ მატჩი, სწორი პასუხებით მოიპოვე ბურთი, გაიტანე გოლები და დააგროვე RP QuizBall-ის რეიტინგში დასაწინაურებლად.",
      },
      {
        id: "friendly",
        title: "მეგობრული 1v1",
        body:
          "შექმენი პირადი ოთახი ან შეუერთდი მეგობარს და ითამაშე მორგებული წესებით. ამ რეჟიმში სარეიტინგო ქულები არ იცვლება.",
      },
      {
        id: "daily",
        title: "ყოველდღიური გამოწვევები",
        body:
          "ითამაშე მოკლე, განახლებადი ფორმატები: მინიშნებები, სწორია თუ არა, კარიერის გზა, მეტი-ნაკლები და Money Drop — შემდეგ დაბრუნდი ახალი გამოწვევებისთვის.",
      },
      {
        id: "auction",
        title: "საფეხბურთო აუქციონი",
        body:
          "$350M ბიუჯეტით ივაჭრე უცნობ ფეხბურთელებზე და შექმენი შვიდკაციანი გუნდი. გამარჯვებულს ჭკვიანი ფასები, მოგება და გუნდის ქიმია განსაზღვრავს.",
      },
    ],
    rankedEyebrow: "შეჯიბრებითი რეჟიმი",
    rankedTitle: "როგორ მუშაობს რეიტინგული 1v1",
    rankedIntro:
      "რეიტინგულ რეჟიმში საფეხბურთო კითხვები სხვა მოთამაშესთან მოკლე, ცოცხალ მატჩად იქცევა.",
    rankedSteps: [
      {
        title: "1. დაბლოკე კატეგორია",
        body:
          "ჩნდება სამი შემთხვევითი საფეხბურთო კატეგორია. თითოეული მოთამაშე ბლოკავს ერთს და მატჩი დარჩენილ კატეგორიაში ტარდება.",
      },
      {
        title: "2. მოიპოვე ბურთი",
        body:
          "ორივე მოთამაშე ერთდროულად პასუხობს კითხვებს. სწორი პასუხები გაძლევს ბურთის ფლობას, ავითარებს შეტევას და ქმნის საგოლე შანსებს.",
      },
      {
        title: "3. გაიტანე და დაწინაურდი",
        body:
          "მატჩის შედეგს გოლები წყვეტს. თამაშის შემდეგ RP ცვლის შენს კატეგორიასა და ადგილს ლიდერბორდზე.",
      },
    ],
    rankedMeta: "ჩვეულებრივ 12–18 კითხვა · დაახლოებით 5 წუთი · RP თამაშშია",
  },
  es: {
    overviewEyebrow: "El juego",
    overviewTitle: "Conocimiento futbolístico que se juega como un partido",
    modesEyebrow: "Modos de juego",
    modesTitle: "Formas de jugar a QuizBall",
    modesIntro:
      "Empieza con un desafío diario, juega contra un amigo sin arriesgar tu rango o entra en un 1 contra 1 competitivo y sube en la clasificación. Cada modo usa tus conocimientos de una forma distinta.",
    modes: [
      {
        id: "ranked",
        title: "1 contra 1 clasificatorio",
        body:
          "Juega un partido en vivo, gana la posesión con respuestas correctas, marca goles y consigue RP para avanzar por los rangos de QuizBall.",
      },
      {
        id: "friendly",
        title: "1 contra 1 amistoso",
        body:
          "Crea una sala privada o únete a la de un amigo y juega con reglas personalizadas. No hay Puntos de Rango en juego.",
      },
      {
        id: "daily",
        title: "Desafíos diarios",
        body:
          "Prueba formatos cortos que van rotando: pistas, verdadero o falso, trayectorias, mayor o menor y Money Drop. Vuelve para descubrir nuevos desafíos.",
      },
      {
        id: "auction",
        title: "Subasta de fútbol",
        body:
          "Usa un presupuesto de $350M para pujar por futbolistas misteriosos y crear una plantilla de siete jugadores. El precio, el beneficio y la química deciden al ganador.",
      },
    ],
    rankedEyebrow: "Modo competitivo",
    rankedTitle: "Cómo funciona el 1 contra 1 clasificatorio",
    rankedIntro:
      "El modo clasificatorio convierte las preguntas de fútbol en un partido corto y en vivo contra otro jugador.",
    rankedSteps: [
      {
        title: "1. Bloquea una categoría",
        body:
          "Aparecen tres categorías de fútbol al azar. Cada jugador bloquea una y el partido se disputa con la categoría restante.",
      },
      {
        title: "2. Gana la posesión",
        body:
          "Los dos jugadores responden preguntas en vivo. Las respuestas correctas mueven la posesión, construyen ataques y crean ocasiones de gol.",
      },
      {
        title: "3. Marca y sube",
        body:
          "Los goles deciden el resultado. Al terminar, los Puntos de Rango actualizan tu nivel y tu posición en la clasificación.",
      },
    ],
    rankedMeta: "Normalmente 12–18 preguntas · Unos 5 minutos · Puntos de Rango en juego",
  },
};
