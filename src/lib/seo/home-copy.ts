import type { Locale } from "@/lib/i18n/locale";

export interface HomeCopy {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  accessLine: string;
  nav: { games: string; quizzes: string; signIn: string };
  sections: { competitive: string; daily: string; dailyHint: string; dailyAll: string; whyAccount: string; quizzes: string; faq: string };
  cards: { practice: string; accountRequired: string; guest: string; playLabel: string; rankedTitle: string; rankedText: string; rankedCta: string; wlTitle: string; wlText: string; wlCta: string; quizPage: string };
  whyAccount: string[];
  about: { title: string; text: string };
  quizLinks: { hub: string; guessPlayer: string; careerPath: string };
  faq: Array<{ q: string; a: string }>;
}

export const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    metaTitle: "Free Football Games and Multiplayer Online Trivia — QuizBall",
    metaDescription: "Play football trivia games online, including Tic Tac Toe, Auction and friendly matches. Start as a guest, then join Ranked play and Weekend League.",
    h1: "Free Football Games and Multiplayer Online Trivia",
    intro: "Play football trivia games in your browser. Try a practice round of Football Tic Tac Toe or Football Auction without creating an account. Friendly matches, Ranked play and Weekend League need a Quizball account. Ready to compete? Sign up for Ranked play and Weekend League, where eligible players can compete for real voucher prizes under the competition rules.",
    accessLine: "Guest games need no account. Ranked play and Weekend League require sign-in.",
    nav: { games: "Football Games", quizzes: "Football Quizzes", signIn: "Sign in" },
    sections: { competitive: "Compete for prizes", daily: "Daily challenges", dailyHint: "A new set every day. Practice here, play the real one in the app.", dailyAll: "All daily challenges", whyAccount: "Why create a Quizball account", quizzes: "Football quizzes", faq: "Questions" },
    cards: { practice: "Practice round", accountRequired: "Account required", guest: "Play as guest", playLabel: "Play", rankedTitle: "Ranked Play", rankedText: "Test your football knowledge against other players and build your rank. Account required.", rankedCta: "Sign up for Ranked", wlTitle: "Weekend League", wlText: "Enter Quizball's weekend competition and compete for the available voucher prizes. Account required; eligibility and event rules apply.", wlCta: "View Weekend League details", quizPage: "Open the quiz" },
    whyAccount: [
      "Guest games let you try Quizball straight away. Create an account when you want to compete in Ranked play and Weekend League.",
      "Build your rank, follow the standings and compete for the voucher prizes available under each competition's rules. Check the current eligibility, schedule and prize details before entering.",
      "Guest practice results do not award Ranked points, coins or prize qualification.",
    ],
    about: { title: "About the games", text: "Quizball brings football knowledge into games you can play online. Match players to categories in Football Tic Tac Toe, make your choices in Auction, or answer football trivia in a friendly match with an account. Pick the format you enjoy and read its rules on the game page. You can also explore football quizzes about players, clubs and leagues, then move into account-based competitions when you are ready." },
    quizLinks: { hub: "All football quizzes", guessPlayer: "Guess the Player", careerPath: "Career Path quiz" },
    faq: [
      { q: "Can I play without an account?", a: "Yes. The guest games shown here can be played without signing up. Ranked play and Weekend League require an account." },
      { q: "Can I win real prizes?", a: "Eligible players can compete for voucher prizes in the competitions that offer them. Read the current Ranked and Weekend League rules for the available prizes and how to qualify." },
      { q: "Do mini-game scores count toward Ranked play?", a: "Guest mini-game results do not award Ranked points or qualify you for voucher prizes. Ranked progression follows the competitive mode's own rules." },
      { q: "What happens if I register after a game?", a: "You return to the game you were playing." },
    ],
  },
  es: {
    metaTitle: "Juegos de Fútbol Gratis y Trivia Online — QuizBall",
    metaDescription: "Juega a juegos de trivia de fútbol online: Tiki Taka Toe, subasta y partidos amistosos. Empieza como invitado y luego únete al modo clasificatorio y a la Weekend League.",
    h1: "Juegos de Fútbol Gratis y Trivia Online",
    intro: "Juega a juegos de trivia de fútbol en tu navegador. Prueba una ronda de práctica de Tiki Taka Toe o de la subasta sin crear cuenta. Los amistosos, el modo clasificatorio y la Weekend League requieren una cuenta de Quizball. ¿Listo para competir? Regístrate para el modo clasificatorio y la Weekend League, donde los jugadores elegibles compiten por premios en vales según las reglas de cada competición.",
    accessLine: "Los juegos de invitado no necesitan cuenta. El modo clasificatorio y la Weekend League requieren iniciar sesión.",
    nav: { games: "Juegos de fútbol", quizzes: "Quizzes de fútbol", signIn: "Iniciar sesión" },
    sections: { competitive: "Compite por premios", daily: "Retos diarios", dailyHint: "Un set nuevo cada día. Practica aquí, juega el real en la app.", dailyAll: "Todos los retos diarios", whyAccount: "Por qué crear una cuenta de Quizball", quizzes: "Quizzes de fútbol", faq: "Preguntas" },
    cards: { practice: "Ronda de práctica", accountRequired: "Requiere cuenta", guest: "Jugar como invitado", playLabel: "Jugar", rankedTitle: "Modo clasificatorio", rankedText: "Pon a prueba tu fútbol contra otros jugadores y construye tu rango. Requiere cuenta.", rankedCta: "Regístrate para clasificatorio", wlTitle: "Weekend League", wlText: "Entra en la competición de fin de semana de Quizball y compite por los vales disponibles. Requiere cuenta; se aplican reglas de elegibilidad y del evento.", wlCta: "Ver detalles de la Weekend League", quizPage: "Abrir el quiz" },
    whyAccount: [
      "Los juegos de invitado te permiten probar Quizball al instante. Crea una cuenta cuando quieras competir en clasificatorio y en la Weekend League.",
      "Construye tu rango, sigue la clasificación y compite por los vales disponibles según las reglas de cada competición. Consulta la elegibilidad, el calendario y los premios vigentes antes de participar.",
      "Los resultados de práctica como invitado no dan puntos de clasificación, monedas ni acceso a premios.",
    ],
    about: { title: "Sobre los juegos", text: "Quizball convierte el conocimiento futbolero en juegos online. Empareja jugadores con categorías en Tiki Taka Toe, decide en la subasta o responde trivia en un amistoso. Elige el formato que te guste y lee sus reglas en la página del juego. También puedes explorar quizzes sobre jugadores, clubes y ligas, y pasar a las competiciones con cuenta cuando quieras." },
    quizLinks: { hub: "Todos los quizzes de fútbol", guessPlayer: "Adivina el jugador", careerPath: "Quiz de trayectoria" },
    faq: [
      { q: "¿Puedo jugar sin cuenta?", a: "Sí. Los juegos de invitado que ves aquí se juegan sin registrarse. El modo clasificatorio y la Weekend League requieren cuenta." },
      { q: "¿Puedo ganar premios reales?", a: "Los jugadores elegibles compiten por vales en las competiciones que los ofrecen. Lee las reglas vigentes del clasificatorio y de la Weekend League para conocer los premios y cómo clasificarte." },
      { q: "¿Los minijuegos cuentan para el clasificatorio?", a: "Los resultados de invitado no dan puntos de clasificación ni acceso a vales. La progresión clasificatoria sigue sus propias reglas." },
      { q: "¿Qué pasa si me registro después de una partida?", a: "Vuelves al juego que estabas jugando." },
    ],
  },
  ka: {
    metaTitle: "უფასო საფეხბურთო თამაშები და ქვიზები — QuizBall",
    metaDescription: "ითამაშე საფეხბურთო ტრივია ონლაინ: იქს-ნული, აუქციონი და მეგობრული მატჩები. დაიწყე სტუმრად, შემდეგ შეუერთდი რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას.",
    h1: "უფასო საფეხბურთო თამაშები და ქვიზები",
    intro: "ითამაშე საფეხბურთო ტრივია ბრაუზერში. სცადე იქს-ნულის ან აუქციონის სავარჯიშო რაუნდი ანგარიშის გარეშე. მეგობრულ მატჩებს, რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას Quizball-ის ანგარიში სჭირდება. მზად ხარ შეჯიბრისთვის? დარეგისტრირდი რეიტინგული თამაშისა და შაბათ-კვირის ლიგისთვის, სადაც უფლებამოსილი მოთამაშეები კონკურსის წესებით ვაუჩერებზე იბრძვიან.",
    accessLine: "სტუმრის თამაშებს ანგარიში არ სჭირდება. რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას შესვლა სჭირდება.",
    nav: { games: "საფეხბურთო თამაშები", quizzes: "საფეხბურთო ქვიზები", signIn: "შესვლა" },
    sections: { competitive: "იბრძოლე პრიზებისთვის", daily: "ყოველდღიური გამოწვევები", dailyHint: "ყოველდღე ახალი ნაკრები. ივარჯიშე აქ, ნამდვილი აპლიკაციაში ითამაშე.", dailyAll: "ყველა ყოველდღიური გამოწვევა", whyAccount: "რატომ შექმნა Quizball-ის ანგარიში", quizzes: "საფეხბურთო ქვიზები", faq: "კითხვები" },
    cards: { practice: "სავარჯიშო რაუნდი", accountRequired: "ანგარიშია საჭირო", guest: "ითამაშე სტუმრად", playLabel: "თამაში", rankedTitle: "რეიტინგული თამაში", rankedText: "შეამოწმე ცოდნა სხვა მოთამაშეების წინააღმდეგ და აიწიე რეიტინგში. ანგარიშია საჭირო.", rankedCta: "დარეგისტრირდი რეიტინგულისთვის", wlTitle: "შაბათ-კვირის ლიგა", wlText: "შეუერთდი Quizball-ის შაბათ-კვირის შეჯიბრს და იბრძოლე ხელმისაწვდომი ვაუჩერებისთვის. ანგარიშია საჭირო; მოქმედებს უფლებამოსილებისა და ტურნირის წესები.", wlCta: "ლიგის დეტალები", quizPage: "ქვიზის გახსნა" },
    whyAccount: [
      "სტუმრის თამაშები Quizball-ს მაშინვე გაცნობს. შექმენი ანგარიში, როცა რეიტინგულ თამაშსა და შაბათ-კვირის ლიგაში შეჯიბრი გინდა.",
      "აიწიე რეიტინგში, ადევნე თვალი ცხრილს და იბრძოლე ვაუჩერებისთვის თითოეული კონკურსის წესებით. მონაწილეობამდე გადაამოწმე უფლებამოსილება, განრიგი და პრიზები.",
      "სტუმრის სავარჯიშო შედეგები რეიტინგულ ქულებს, ქოინებს ან პრიზებზე უფლებას არ იძლევა.",
    ],
    about: { title: "თამაშების შესახებ", text: "Quizball საფეხბურთო ცოდნას ონლაინ თამაშებად აქცევს. დაუკავშირე ფეხბურთელები კატეგორიებს იქს-ნულში, გააკეთე არჩევანი აუქციონზე ან უპასუხე ტრივიას მეგობრულ მატჩში. აირჩიე ფორმატი და წაიკითხე წესები თამაშის გვერდზე. შეგიძლია ასევე ფეხბურთელების, კლუბებისა და ლიგების ქვიზები გაიარო და მზადყოფნისას ანგარიშიან შეჯიბრებზე გადახვიდე." },
    quizLinks: { hub: "ყველა საფეხბურთო ქვიზი", guessPlayer: "გამოიცანი ფეხბურთელი", careerPath: "კარიერის გზის ქვიზი" },
    faq: [
      { q: "შემიძლია ანგარიშის გარეშე თამაში?", a: "დიახ. აქ ნაჩვენები სტუმრის თამაშები რეგისტრაციის გარეშე თამაშდება. რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას ანგარიში სჭირდება." },
      { q: "შემიძლია ნამდვილი პრიზების მოგება?", a: "უფლებამოსილი მოთამაშეები ვაუჩერებზე იბრძვიან იმ შეჯიბრებში, სადაც ისინი გათვალისწინებულია. წაიკითხე რეიტინგული და შაბათ-კვირის ლიგის მოქმედი წესები პრიზებისა და კვალიფიკაციის შესახებ." },
      { q: "ითვლება მინი-თამაშების ქულები რეიტინგულში?", a: "სტუმრის შედეგები რეიტინგულ ქულებს ან ვაუჩერებზე უფლებას არ იძლევა. რეიტინგული პროგრესი თავისი წესებით მიდის." },
      { q: "რა ხდება, თუ თამაშის შემდეგ დავრეგისტრირდები?", a: "იმავე თამაშს უბრუნდები, რომელსაც თამაშობდი." },
    ],
  },
};

export const COLLECTION_COPY: Record<Locale, { metaTitle: string; metaDescription: string; h1: string; intro: string; reset: string }> = {
  en: { metaTitle: "Daily Football Challenges — A New Set Every Day | QuizBall", metaDescription: "Quizball's daily football challenges: Money Drop, True or False, Countdown, Higher or Lower, Imposter and Card Detective. Practice as a guest; play the real daily in the app.", h1: "Daily football challenges", intro: "A fresh set of football puzzles every day. Try a practice round of each here without an account; the real daily set, coins and streaks live in the app.", reset: "Daily sets reset at midnight, Georgia time." },
  es: { metaTitle: "Retos diarios de fútbol — un set nuevo cada día | QuizBall", metaDescription: "Los retos diarios de Quizball: Money Drop, Verdadero o falso, Countdown, Más o menos, Impostor y Detective de cartas. Practica como invitado; juega el diario real en la app.", h1: "Retos diarios de fútbol", intro: "Un set nuevo de puzles futboleros cada día. Prueba aquí una ronda de práctica de cada uno sin cuenta; el set diario real, las monedas y las rachas están en la app.", reset: "Los sets diarios se renuevan a medianoche, hora de Georgia." },
  ka: { metaTitle: "ყოველდღიური საფეხბურთო გამოწვევები — ახალი ნაკრები ყოველდღე | QuizBall", metaDescription: "Quizball-ის ყოველდღიური გამოწვევები: Money Drop, სწორია თუ არა, Countdown, მეტი თუ ნაკლები, შემპარავი და ბარათის დეტექტივი. ივარჯიშე სტუმრად; ნამდვილი აპლიკაციაშია.", h1: "ყოველდღიური საფეხბურთო გამოწვევები", intro: "ყოველდღე ახალი საფეხბურთო თავსატეხები. სცადე თითოეულის სავარჯიშო რაუნდი აქ ანგარიშის გარეშე; ნამდვილი ყოველდღიური ნაკრები, ქოინები და სერიები აპლიკაციაშია.", reset: "ყოველდღიური ნაკრები შუაღამისას, საქართველოს დროით განახლდება." },
};
