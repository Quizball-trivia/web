import type { Locale } from "@/lib/i18n/locale";

export type HubKind = "home" | "daily" | "games";

export interface HubCopy {
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  ctaPlay: string;
  ctaSignIn: string;
  sectionDaily: string;
  sectionGames: string;
  sectionDailyHint: string;
  sectionGamesHint: string;
}

/** Copy for the three indexable hubs: the homepage and the two section indexes. */
export const HUB_COPY: Record<HubKind, Record<Locale, HubCopy>> = {
  home: {
    en: {
      metaTitle: "QuizBall — Football Trivia Games: 1v1 Matches, Daily Challenges & More",
      metaDescription: "Play football trivia online: live 1v1 ranked matches, daily challenges like Who Am I? and Higher or Lower, football tic tac toe, auctions and coin games. Free, in your browser.",
      title: "Football trivia, played like football",
      intro: "Live 1v1 matches, a fresh set of daily challenges every morning, and mini games you can play for coins. Pick a game below or jump straight in.",
      ctaPlay: "Play now",
      ctaSignIn: "Sign in",
      sectionDaily: "Daily challenges",
      sectionGames: "Game modes",
      sectionDailyHint: "A new one every day. Earn coins and XP.",
      sectionGamesHint: "Play any time, against real opponents or for coins.",
    },
    ka: {
      metaTitle: "QuizBall — საფეხბურთო ტრივია: 1v1 მატჩები, ყოველდღიური გამოწვევები და მეტი",
      metaDescription: "ითამაშე საფეხბურთო ტრივია ონლაინ: ლაივ 1v1 რეიტინგული მატჩები, ყოველდღიური გამოწვევები („ვინ ვარ მე?“, „მეტი თუ ნაკლები“), საფეხბურთო იქს-ნული, აუქციონი და თამაშები მონეტებზე. უფასოდ, ბრაუზერში.",
      title: "საფეხბურთო ტრივია, ფეხბურთივით",
      intro: "ლაივ 1v1 მატჩები, ყოველ დილით ახალი ყოველდღიური გამოწვევები და მინი-თამაშები მონეტებზე. აირჩიე თამაში ქვემოთ ან პირდაპირ დაიწყე.",
      ctaPlay: "ითამაშე ახლავე",
      ctaSignIn: "შესვლა",
      sectionDaily: "ყოველდღიური გამოწვევები",
      sectionGames: "თამაშის რეჟიმები",
      sectionDailyHint: "ყოველდღე ახალი. დააგროვე მონეტები და XP.",
      sectionGamesHint: "ითამაშე ნებისმიერ დროს, ნამდვილი მეტოქეების წინააღმდეგ ან მონეტებზე.",
    },
    es: {
      metaTitle: "QuizBall — Trivia de fútbol: partidos 1v1, retos diarios y más",
      metaDescription: "Juega trivia de fútbol online: partidos 1v1 clasificatorios en vivo, retos diarios como ¿Quién soy? y Más o menos, tres en raya futbolero, subastas y juegos por monedas. Gratis, en tu navegador.",
      title: "Trivia de fútbol, jugada como el fútbol",
      intro: "Partidos 1v1 en vivo, retos diarios nuevos cada mañana y minijuegos por monedas. Elige un juego abajo o entra directamente.",
      ctaPlay: "Jugar ahora",
      ctaSignIn: "Iniciar sesión",
      sectionDaily: "Retos diarios",
      sectionGames: "Modos de juego",
      sectionDailyHint: "Uno nuevo cada día. Gana monedas y XP.",
      sectionGamesHint: "Juega cuando quieras, contra rivales reales o por monedas.",
    },
  },
  daily: {
    en: {
      metaTitle: "Daily Football Challenges — A New Quiz Every Day",
      metaDescription: "Ten daily football games: Who Am I?, Money Drop, True or False, Countdown, Career Path, Higher or Lower, Imposter, Football Logic, Timeline and Guess the Card. Reset every day, earn coins and XP.",
      title: "Daily football challenges",
      intro: "Every day at midnight a fresh set unlocks. Play them all, keep your streak, and earn coins and XP for each one.",
      ctaPlay: "Play today's challenges",
      ctaSignIn: "Sign in",
      sectionDaily: "Today's challenges",
      sectionGames: "More game modes",
      sectionDailyHint: "Reset every day.",
      sectionGamesHint: "Play any time.",
    },
    ka: {
      metaTitle: "ყოველდღიური საფეხბურთო გამოწვევები — ახალი ქვიზი ყოველდღე",
      metaDescription: "ათი ყოველდღიური საფეხბურთო თამაში: ვინ ვარ მე?, ფულის ვარდნა, მართალი თუ მცდარი, უკუთვლა, კარიერის გზა, მეტი თუ ნაკლები, იმპოსტერი, საფეხბურთო ლოგიკა, ქრონოლოგია და გამოიცანი ბარათი. ყოველდღე ახლდება, დააგროვე მონეტები და XP.",
      title: "ყოველდღიური საფეხბურთო გამოწვევები",
      intro: "ყოველ შუაღამეს ახალი ნაკრები იხსნება. ითამაშე ყველა, შეინარჩუნე სერია და დააგროვე მონეტები და XP თითოეულზე.",
      ctaPlay: "ითამაშე დღევანდელი გამოწვევები",
      ctaSignIn: "შესვლა",
      sectionDaily: "დღევანდელი გამოწვევები",
      sectionGames: "სხვა რეჟიმები",
      sectionDailyHint: "ყოველდღე ახლდება.",
      sectionGamesHint: "ითამაშე ნებისმიერ დროს.",
    },
    es: {
      metaTitle: "Retos diarios de fútbol — Un quiz nuevo cada día",
      metaDescription: "Diez juegos diarios de fútbol: ¿Quién soy?, Money Drop, Verdadero o falso, Countdown, Trayectoria, Más o menos, Impostor, Lógica futbolera, Cronología y Adivina la carta. Se renuevan cada día, gana monedas y XP.",
      title: "Retos diarios de fútbol",
      intro: "Cada día a medianoche se desbloquea un set nuevo. Juégalos todos, mantén tu racha y gana monedas y XP por cada uno.",
      ctaPlay: "Jugar los retos de hoy",
      ctaSignIn: "Iniciar sesión",
      sectionDaily: "Retos de hoy",
      sectionGames: "Más modos de juego",
      sectionDailyHint: "Se renuevan cada día.",
      sectionGamesHint: "Juega cuando quieras.",
    },
  },
  games: {
    en: {
      metaTitle: "Football Trivia Games Online — Ranked 1v1, Auction, Tic Tac Toe & More",
      metaDescription: "Live football trivia game modes: ranked 1v1 matches, player auctions, football tic tac toe (Tiki-Taka-Toe), free kicks, road to goal and guess the goal. Play free in your browser.",
      title: "Football trivia game modes",
      intro: "Live matches against real opponents, and coin games you can play any time. Every mode rewards football knowledge, not luck.",
      ctaPlay: "Play now",
      ctaSignIn: "Sign in",
      sectionDaily: "Daily challenges",
      sectionGames: "All game modes",
      sectionDailyHint: "A new one every day.",
      sectionGamesHint: "Play any time.",
    },
    ka: {
      metaTitle: "საფეხბურთო ტრივია თამაშები ონლაინ — რეიტინგული 1v1, აუქციონი, იქს-ნული და მეტი",
      metaDescription: "ლაივ საფეხბურთო ტრივიის რეჟიმები: რეიტინგული 1v1 მატჩები, ფეხბურთელების აუქციონი, საფეხბურთო იქს-ნული (Tiki-Taka-Toe), საჯარიმო დარტყმები, გზა კარისკენ და გამოიცანი გოლი. ითამაშე უფასოდ ბრაუზერში.",
      title: "საფეხბურთო ტრივიის რეჟიმები",
      intro: "ლაივ მატჩები ნამდვილი მეტოქეების წინააღმდეგ და თამაშები მონეტებზე ნებისმიერ დროს. ყოველი რეჟიმი ცოდნას აჯილდოებს, არა იღბალს.",
      ctaPlay: "ითამაშე ახლავე",
      ctaSignIn: "შესვლა",
      sectionDaily: "ყოველდღიური გამოწვევები",
      sectionGames: "ყველა რეჟიმი",
      sectionDailyHint: "ყოველდღე ახალი.",
      sectionGamesHint: "ითამაშე ნებისმიერ დროს.",
    },
    es: {
      metaTitle: "Juegos de trivia de fútbol online — 1v1, Subasta, Tres en raya y más",
      metaDescription: "Modos de trivia de fútbol en vivo: partidos 1v1 clasificatorios, subastas de jugadores, tres en raya futbolero (Tiki-Taka-Toe), tiros libres, camino al gol y adivina el gol. Juega gratis en tu navegador.",
      title: "Modos de trivia de fútbol",
      intro: "Partidos en vivo contra rivales reales y juegos por monedas cuando quieras. Cada modo premia el conocimiento, no la suerte.",
      ctaPlay: "Jugar ahora",
      ctaSignIn: "Iniciar sesión",
      sectionDaily: "Retos diarios",
      sectionGames: "Todos los modos",
      sectionDailyHint: "Uno nuevo cada día.",
      sectionGamesHint: "Juega cuando quieras.",
    },
  },
};
