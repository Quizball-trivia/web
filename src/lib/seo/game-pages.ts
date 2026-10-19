import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { DAILY_CHALLENGE_SLUGS, dailyChallengePlayPath } from "@/lib/domain/dailyChallengeSlugs";
import { PUBLIC_GAMES_FOLDER, DAILY_COLLECTION_SLUG } from "./game-page-paths";

export { PUBLIC_GAMES_FOLDER, DAILY_COLLECTION_SLUG } from "./game-page-paths";

/**
 * One public, indexable landing page per game mode. Every entry renders through
 * the same template (GameLandingScreen) at `/{locale}/{section}/{slug}`, so a
 * new mode is one object here plus a sitemap line — no new route code.
 */
export type GamePageSection = "daily" | "games";

export interface GamePageCopy {
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  howToPlay: string[];
  reward: string;
  cta: string;
}

export interface GamePageEntry {
  /** Canonical (English) slug; also the manifest key. */
  slug: string;
  section: GamePageSection;
  /** Where "Play" sends the visitor (the auth-gated app route). */
  playPath: string;
  /** DemoModeArt slug for the hero illustration. */
  artSlug: string;
  copy: Record<Locale, GamePageCopy>;
  /** Translated URL slugs; locales not listed use the canonical slug. */
  slugs?: Partial<Record<Locale, string>>;
}

/** Locales with a public game page body; the rest (tr today) get the hub only and English pages from the cards. */
export const SEO_PAGE_LOCALES = ["en", "ka", "es", "tr", "ru"] as const satisfies readonly Locale[];
export type SeoPageLocale = (typeof SEO_PAGE_LOCALES)[number];
export const isSeoPageLocale = (locale: Locale): locale is SeoPageLocale => (SEO_PAGE_LOCALES as readonly Locale[]).includes(locale);

/** Public games live under a localized folder: /en/football-games/…, /es/juegos-de-futbol/…, /tr/futbol-oyunlari/…. */

/**
 * Slugs follow docs/SEO-GAME-NAMING-AUDIT-2026-09-30.md: ES renames only where the old slug matched no
 * search intent, TR localizes only the searched names; KA follows EN. tiki-taka-toe stays (ranking URL).
 * RU (docs/SEO-GAME-NAMING-RU-2026-10-15.md): every page gets a Latin-transliterated Russian slug.
 */
const LOCALIZED_SLUGS: Record<string, Partial<Record<Locale, string>>> = {
  "football-tic-tac-toe": { es: "tiki-taka-toe", tr: "futbol-xox", ru: "futbolnye-krestiki-noliki" },
  auction: { es: "subasta", ru: "futbolnyy-auktsion" },
  friendly: { es: "partido-amistoso", ru: "viktorina-s-drugom" },
  "true-or-false-football": { es: "verdadero-o-falso", ru: "pravda-ili-lozh" },
  "higher-or-lower": { es: "higher-or-lower-futbolero", ru: "higher-or-lower" },
  "card-detective": { es: "cartas-de-jugadores", ru: "ugaday-po-kartochke" },
  "guess-the-goal": { es: "adivina-el-gol", ru: "ugaday-gol" },
  "who-am-i": { es: "quien-soy", ru: "ugaday-futbolista-po-faktam" },
  "career-path": { es: "trayectoria-del-jugador", ru: "ugaday-futbolista-po-karere" },
  "football-timeline": { es: "linea-de-tiempo", ru: "chto-bylo-ranshe" },
  "football-logic": { es: "logica-futbolera", ru: "futbolnye-zagadki" },
  "missing-xi": { es: "adivina-el-11", ru: "ugaday-sostav" },
  "pass-chain": { es: "conectando-jugadores", ru: "soedini-futbolistov" },
  // en/tr renamed 2026-10-05 to what people search ("closest wins", "en yakın tahmin oyunu"); ka keeps the brand slug.
  "stat-sniper": { es: "aproximado-futbolero", en: "closest-wins", tr: "en-yakin-tahmin-oyunu", ru: "ugaday-statistiku" },
  ranked: { es: "quien-sabe-mas-de-futbol", ru: "viktorina-s-sopernikom" },
  "free-kicks": { es: "tiros-libres", ru: "shtrafnye-udary" },
  "road-to-goal": { es: "camino-al-gol", ru: "doroga-k-golu" },
  "trivia-mines": { es: "minas-con-preguntas", ru: "minnoe-pole" },
  "football-minesweeper": { es: "buscaminas-futbolero", tr: "futbol-mayin-tarlasi", ru: "futbolnyy-saper" },
  "football-clues": { es: "pistas-futboleras", tr: "futbolcu-tahmin-etme-oyunu", ru: "ugaday-futbolista-po-podskazkam" },
  "last-answer-standing": { es: "ultimo-en-pie-futbolero", tr: "futbolcu-sayma-oyunu", ru: "kto-bolshe-nazovet" },
  "guess-the-goal-minute": { es: "adivina-el-minuto-exacto-del-gol", tr: "gol-dakikasi-tahmin-oyunu", ru: "na-kakoy-minute-gol" },
  "squad-spin": { es: "ruleta-futbolera", tr: "futbol-carki", ru: "futbolnaya-ruletka" },
  // Names follow what people search (2026-10-08): "played for both clubs", "jugador en común", "ortak futbolcu oyunu",
  // "football name chain", "son harfle futbolcu". KA follows EN.
  "played-for-both-clubs": { es: "jugador-en-comun", tr: "ortak-futbolcu-oyunu", ru: "igravshie-za-oba-kluba" },
  "football-name-chain": { es: "cadena-de-futbolistas", tr: "son-harfle-futbolcu", ru: "futbolisty-na-poslednyuyu-bukvu" },
  "money-drop": { ru: "monety-na-otvety" },
  countdown: { ru: "nazovi-futbolistov" },
  imposter: { ru: "naydi-lishnego" },
  // Google Suggest 2026-10-15: "adivina el top 10 de fútbol" (ar/es/mx), "futbol top 10" (tr); en/ka "football tenable"; ru "угадай топ-10".
  "football-tenable": { es: "adivina-el-top-10", tr: "futbol-top-10", ru: "ugaday-top-10" },
  "football-horserace": { es: "carrera-de-caballos-futbolera", tr: "futbol-at-yarisi", ru: "futbolnye-skachki" },
  "football-odd-one-out": { es: "dato-falso-futbolero", tr: "hangisi-yanlis", ru: "najdi-lishnee" },
};

/** Earlier ES slugs; the middleware 308s them so indexed pages keep their ranking. */
const PREVIOUS_SLUGS: Record<string, Partial<Record<Locale, string>>> = {
  "higher-or-lower": { es: "mas-o-menos" },
  // The in-game title ("¿En qué minuto?") as a second address: it 308s to the one page that ranks.
  "guess-the-goal-minute": { es: "en-que-minuto-futbolero" },
  "missing-xi": { es: "once-perdido" },
  "pass-chain": { es: "cadena-de-pases" },
  "stat-sniper": { es: "francotirador-de-datos", en: "stat-sniper", tr: "stat-sniper" },
  ranked: { es: "clasificatoria" },
  "squad-spin": { es: "ruleta-de-plantilla" },
};

/** TR pages used the EN folder and slugs until 2026-09-30. */
const PREVIOUS_FOLDER: Partial<Record<Locale, { folder: string; dailyCollection: string }>> = {
  tr: { folder: "football-games", dailyCollection: "daily-challenges" },
};

const cta = { en: "Play now", ka: "ითამაშე ახლავე", es: "Jugar ahora", tr: "Hemen oyna", ru: "Играть" } as const;

function daily(
  type: keyof typeof DAILY_CHALLENGE_SLUGS,
  copy: Record<Locale, Omit<GamePageCopy, "cta">>,
): GamePageEntry {
  return {
    slug: DAILY_CHALLENGE_SLUGS[type],
    section: "daily",
    playPath: dailyChallengePlayPath(type),
    artSlug: `daily-${type}`,
    slugs: LOCALIZED_SLUGS[DAILY_CHALLENGE_SLUGS[type]],
    copy: {
      en: { ...copy.en, cta: cta.en },
      ka: { ...copy.ka, cta: cta.ka },
      es: { ...copy.es, cta: cta.es },
      tr: { ...copy.tr, cta: cta.tr },
      ru: { ...copy.ru, cta: cta.ru },
    },
  };
}

function mode(
  slug: string,
  playPath: string,
  artSlug: string,
  copy: Record<Locale, Omit<GamePageCopy, "cta">>,
): GamePageEntry {
  return {
    slug,
    section: "games",
    playPath,
    artSlug,
    slugs: LOCALIZED_SLUGS[slug],
    copy: {
      en: { ...copy.en, cta: cta.en },
      ka: { ...copy.ka, cta: cta.ka },
      es: { ...copy.es, cta: cta.es },
      tr: { ...copy.tr, cta: cta.tr },
      ru: { ...copy.ru, cta: cta.ru },
    },
  };
}

export const GAME_PAGES: GamePageEntry[] = [
  daily("clues", {
    en: {
      metaTitle: "Who Am I? — Guess the Footballer (Who Are Ya style) Daily Game",
      metaDescription: "Guess the footballer from five clues. Fewer clues used, more points. A new Who Am I? challenge every day.",
      title: "Who Am I? — Guess the Footballer",
      intro: "Five clues about one footballer. Name the player as early as you can: the fewer clues you need, the more points you score.",
      howToPlay: ["Read the first clue and type your guess.", "Wrong? The next clue unlocks, worth fewer points.", "Solve all five players before the clock runs out."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "ვინ ვარ მე? — ყოველდღიური ფეხბურთელის გამოცნობა",
      metaDescription: "გამოიცანი ფეხბურთელი ხუთი მინიშნებით. ნაკლები მინიშნება — მეტი ქულა. ახალი გამოწვევა ყოველდღე.",
      title: "ვინ ვარ მე?",
      intro: "ხუთი მინიშნება ერთ ფეხბურთელზე. დაასახელე რაც შეიძლება ადრე: რაც ნაკლები მინიშნება დაგჭირდება, მით მეტ ქულას მიიღებ.",
      howToPlay: ["წაიკითხე პირველი მინიშნება და ჩაწერე ვარაუდი.", "შეცდი? იხსნება შემდეგი მინიშნება, ნაკლები ქულით.", "გამოიცანი ხუთივე ფეხბურთელი დროის ამოწურვამდე."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "¿Quién soy? — Adivina el futbolista cada día",
      metaDescription: "Adivina al futbolista con cinco pistas. Menos pistas, más puntos. Un reto nuevo cada día.",
      title: "¿Quién soy?",
      intro: "Cinco pistas sobre un futbolista. Nómbralo lo antes posible: cuantas menos pistas necesites, más puntos ganas.",
      howToPlay: ["Lee la primera pista y escribe tu respuesta.", "¿Fallaste? Se desbloquea la siguiente pista, con menos puntos.", "Resuelve los cinco jugadores antes de que acabe el tiempo."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Ben Kimim? — Futbolcuyu Tahmin Et (Who Are Ya tarzı) Günlük Oyun",
      metaDescription: "Beş ipucundan futbolcuyu tahmin et. Ne kadar az ipucu kullanırsan o kadar çok puan. Her gün yeni bir Ben Kimim? görevi.",
      title: "Ben Kimim? — Futbolcuyu Tahmin Et",
      intro: "Bir futbolcu hakkında beş ipucu. Oyuncuyu mümkün olduğunca erken söyle: ne kadar az ipucuna ihtiyaç duyarsan o kadar çok puan alırsın.",
      howToPlay: ["İlk ipucunu oku ve tahminini yaz.", "Yanlış mı? Sonraki ipucu açılır, daha az puan değerinde.", "Süre bitmeden beş oyuncuyu da çöz."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Кто я? Угадай футболиста по фактам — ежедневная игра",
      metaDescription: "Угадай футболиста по пяти фактам. Чем меньше фактов понадобится, тем больше очков. Новое ежедневное испытание каждый день.",
      title: "Кто я? Угадай футболиста по фактам",
      intro: "Пять фактов об одном футболисте. Назови его как можно раньше: чем меньше подсказок тебе понадобится, тем больше очков получишь.",
      howToPlay: ["Прочитай первый факт и введи свой ответ.", "Не угадал? Откроется следующая подсказка, но очков за ответ будет меньше.", "Угадай всех пятерых, пока не вышло время."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("moneyDrop", {
    en: {
      metaTitle: "Money Drop — Daily Football Quiz",
      metaDescription: "Stake your cash across four answers and keep what lands on the right one. Five football questions, one daily pot.",
      title: "Money Drop",
      intro: "You start with a pot of cash. Spread it across the answers you trust; whatever sits on the correct one carries to the next question.",
      howToPlay: ["Read the question and its four options.", "Drop your money on one or more answers.", "Only the cash on the right answer survives. Keep it through five questions."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "ფულის ვარდნა — ყოველდღიური საფეხბურთო ქვიზი",
      metaDescription: "გაანაწილე ფული ოთხ პასუხზე და შეინარჩუნე ის, რაც სწორზეა. ხუთი კითხვა, ერთი ყოველდღიური ბანკი.",
      title: "ფულის ვარდნა",
      intro: "იწყებ ფულის ბანკით. გაანაწილე პასუხებზე, რომლებსაც ენდობი; რაც სწორ პასუხზეა, შემდეგ კითხვაზე გადადის.",
      howToPlay: ["წაიკითხე კითხვა და ოთხი ვარიანტი.", "დადე ფული ერთ ან რამდენიმე პასუხზე.", "მხოლოდ სწორ პასუხზე დადებული ფული რჩება. გაატარე ხუთ კითხვაზე."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Money Drop — Quiz de fútbol diario",
      metaDescription: "Reparte tu dinero entre cuatro respuestas y conserva lo que caiga en la correcta. Cinco preguntas, un bote diario.",
      title: "Money Drop",
      intro: "Empiezas con un bote. Repártelo entre las respuestas que creas correctas; lo que esté sobre la buena pasa a la siguiente pregunta.",
      howToPlay: ["Lee la pregunta y sus cuatro opciones.", "Coloca tu dinero en una o más respuestas.", "Solo sobrevive el dinero de la respuesta correcta. Aguanta cinco preguntas."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Money Drop — Günlük Futbol Quizi",
      metaDescription: "Paranı dört cevaba dağıt ve doğru olanın üzerindekini koru. Beş futbol sorusu, günlük bir pot.",
      title: "Money Drop",
      intro: "Bir pot parayla başlarsın. Güvendiğin cevaplara dağıt; doğru cevabın üzerindeki para sonraki soruya taşınır.",
      howToPlay: ["Soruyu ve dört seçeneği oku.", "Paranı bir veya daha fazla cevaba koy.", "Yalnızca doğru cevaptaki para hayatta kalır. Beş soru boyunca koru."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Разложи монеты по ответам — ежедневная футбольная игра",
      metaDescription: "Распредели монеты между четырьмя ответами и сохрани те, что окажутся у правильного. Пять футбольных вопросов каждый день.",
      title: "Разложи монеты по ответам",
      intro: "В начале у тебя есть запас монет. Распредели их между ответами, которым доверяешь: монеты на правильном ответе перейдут к следующему вопросу.",
      howToPlay: ["Прочитай вопрос и выбери один из четырёх ответов.", "Разложи монеты на один или несколько ответов.", "Сохранятся только монеты на правильном ответе. Пронеси их через пять вопросов."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("trueFalse", {
    en: {
      metaTitle: "Football True or False — Daily Football Facts Quiz",
      metaDescription: "Fast football facts, fifteen seconds each. True or false? A new set every day.",
      title: "True or False",
      intro: "One football statement, fifteen seconds, two buttons. Trust your instinct and rack up correct calls.",
      howToPlay: ["Read the statement.", "Hit True or False before the clock ends.", "Every correct call counts toward your daily score."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "მართალი თუ მცდარი — ყოველდღიური საფეხბურთო ფაქტები",
      metaDescription: "სწრაფი საფეხბურთო ფაქტები, თხუთმეტი წამი თითოეულზე. მართალია თუ მცდარი? ახალი ნაკრები ყოველდღე.",
      title: "მართალი თუ მცდარი",
      intro: "ერთი საფეხბურთო მტკიცება, თხუთმეტი წამი, ორი ღილაკი. ენდე ინსტინქტს და დააგროვე სწორი პასუხები.",
      howToPlay: ["წაიკითხე მტკიცება.", "დააჭირე „მართალია“ ან „მცდარია“ დროის ამოწურვამდე.", "ყოველი სწორი პასუხი ითვლება დღიურ ქულაში."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Verdadero o falso futbolero — Quiz diario de fútbol",
      metaDescription: "Datos de fútbol rápidos, quince segundos cada uno. ¿Verdadero o falso? Un set nuevo cada día.",
      title: "Verdadero o falso futbolero",
      intro: "Una afirmación de fútbol, quince segundos, dos botones. Confía en tu instinto y acumula aciertos.",
      howToPlay: ["Lee la afirmación.", "Pulsa Verdadero o Falso antes de que acabe el tiempo.", "Cada acierto suma a tu puntuación diaria."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Futbol Doğru mu Yanlış mı — Günlük Futbol Bilgi Quizi",
      metaDescription: "Hızlı futbol bilgileri, her biri on beş saniye. Doğru mu yanlış mı? Her gün yeni bir set.",
      title: "Doğru mu Yanlış mı",
      intro: "Bir futbol ifadesi, on beş saniye, iki buton. İçgüdüne güven ve doğru kararları biriktir.",
      howToPlay: ["İfadeyi oku.", "Süre bitmeden Doğru ya da Yanlış'a bas.", "Her doğru karar günlük skoruna eklenir."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Правда или ложь: футбольная викторина — факты каждый день",
      metaDescription: "Быстрые футбольные факты: по пятнадцать секунд на каждый. Правда или ложь? Новый набор каждый день.",
      title: "Правда или ложь: футбольная викторина",
      intro: "Один футбольный факт, пятнадцать секунд и две кнопки. Доверься интуиции и набирай верные ответы.",
      howToPlay: ["Прочитай утверждение.", "Нажми «Правда» или «Ложь», пока не вышло время.", "Каждый верный ответ идёт в твой дневной счёт."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("countdown", {
    en: {
      metaTitle: "Name as Many Football Players as You Can — Countdown",
      metaDescription: "Beat the clock: type as many valid football answers as you can for each category. A new Countdown every day.",
      title: "Countdown",
      intro: "A category, a ticking clock, and a blank box. Type every valid answer you can think of before time runs out.",
      howToPlay: ["Read the category, for example Manchester United's 2008 final XI.", "Type answers one by one; each correct one appears in your list.", "Score is the number of valid answers across all rounds."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "უკუთვლა — დაასახელე რაც შეიძლება მეტი",
      metaDescription: "დაამარცხე საათი: ჩაწერე რაც შეიძლება მეტი სწორი პასუხი თითო კატეგორიაზე. ახალი უკუთვლა ყოველდღე.",
      title: "უკუთვლა",
      intro: "კატეგორია, მიმდინარე საათი და ცარიელი ველი. ჩაწერე ყველა სწორი პასუხი, რაც გაგახსენდება, დროის ამოწურვამდე.",
      howToPlay: ["წაიკითხე კატეგორია, მაგალითად მანჩესტერ იუნაიტედის 2008 წლის ფინალის შემადგენლობა.", "ჩაწერე პასუხები სათითაოდ; ყოველი სწორი სიაში ჩნდება.", "ქულა = სწორი პასუხების რაოდენობა ყველა რაუნდში."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Contrarreloj — Nombra todos los jugadores que puedas",
      metaDescription: "Vence al reloj: escribe tantas respuestas válidas de fútbol como puedas por categoría. Una contrarreloj nueva cada día.",
      title: "Contrarreloj futbolera",
      intro: "Una categoría, un reloj en marcha y una casilla vacía. Escribe todas las respuestas válidas que recuerdes antes de que se acabe el tiempo.",
      howToPlay: ["Lee la categoría, por ejemplo el once del Manchester United en la final de 2008.", "Escribe respuestas una a una; cada acierto aparece en tu lista.", "La puntuación es el número de respuestas válidas en todas las rondas."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Countdown — Olabildiğince Çok İsim Say",
      metaDescription: "Zamana karşı yarış: her kategori için olabildiğince çok geçerli futbol cevabı yaz. Her gün yeni bir Countdown.",
      title: "Countdown",
      intro: "Bir kategori, işleyen bir saat ve boş bir kutu. Süre dolmadan aklına gelen her geçerli cevabı yaz.",
      howToPlay: ["Kategoriyi oku, örneğin Manchester United'ın 2008 final on biri.", "Cevapları tek tek yaz; her doğru cevap listende görünür.", "Skor, tüm turlardaki geçerli cevap sayısıdır."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Назови футболистов на время — ежедневная игра",
      metaDescription: "Успей до конца времени: введи как можно больше правильных футбольных ответов для каждой категории. Новая игра каждый день.",
      title: "Назови футболистов на время",
      intro: "Категория, тикающий таймер и пустое поле. Введи все подходящие ответы, какие вспомнишь, пока не вышло время.",
      howToPlay: ["Прочитай категорию, например стартовый состав «Манчестер Юнайтед» в финале 2008 года.", "Вводи ответы по одному: каждый верный появится в списке.", "Очки равны числу правильных ответов за все раунды."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("careerPath", {
    en: {
      metaTitle: "Career Path — Guess the Footballer by His Clubs",
      metaDescription: "See the club crests in order, name the player who walked that path. A new Career Path challenge every day.",
      title: "Career Path",
      intro: "A trail of club crests, oldest to newest. Which footballer's career is it? Type the name and find out.",
      howToPlay: ["Study the sequence of clubs.", "Type the player you think it is.", "Correct answers count toward your daily score."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "კარიერის გზა — გამოიცანი ფეხბურთელი კლუბებით",
      metaDescription: "ნახე კლუბების ემბლემები თანმიმდევრობით და დაასახელე ფეხბურთელი, რომელმაც ეს გზა გაიარა. ახალი გამოწვევა ყოველდღე.",
      title: "კარიერის გზა",
      intro: "კლუბების ემბლემების ჯაჭვი, ძველიდან ახლისკენ. ვისი კარიერაა? ჩაწერე სახელი და გაიგე.",
      howToPlay: ["დააკვირდი კლუბების თანმიმდევრობას.", "ჩაწერე ფეხბურთელი, რომელიც გგონია.", "სწორი პასუხები ითვლება დღიურ ქულაში."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Trayectoria — Adivina al futbolista por sus clubes",
      metaDescription: "Mira los escudos en orden y nombra al jugador que recorrió ese camino. Un reto nuevo cada día.",
      title: "Trayectoria",
      intro: "Una cadena de escudos, del más antiguo al más reciente. ¿De qué futbolista es esa carrera? Escribe el nombre y descúbrelo.",
      howToPlay: ["Estudia la secuencia de clubes.", "Escribe el jugador que crees que es.", "Los aciertos suman a tu puntuación diaria."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Kariyer Yolu — Kulüplerinden Futbolcuyu Tahmin Et",
      metaDescription: "Kulüp armalarını sırayla gör, o yolu yürüyen oyuncuyu söyle. Her gün yeni bir Kariyer Yolu görevi.",
      title: "Kariyer Yolu",
      intro: "Eskiden yeniye bir kulüp arması dizisi. Bu hangi futbolcunun kariyeri? İsmi yaz ve öğren.",
      howToPlay: ["Kulüp sırasını incele.", "Olduğunu düşündüğün oyuncuyu yaz.", "Doğru cevaplar günlük skoruna eklenir."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Угадай футболиста по карьере — ежедневная игра",
      metaDescription: "Смотри на эмблемы клубов по порядку и угадай футболиста, который прошёл этот путь. Новое испытание каждый день.",
      title: "Угадай футболиста по карьере",
      intro: "Эмблемы клубов от ранних к поздним. Чья это карьера? Введи имя и проверь себя.",
      howToPlay: ["Изучи последовательность клубов.", "Введи имя футболиста, о котором думаешь.", "Верные ответы идут в твой дневной счёт."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("highLow", {
    en: {
      metaTitle: "Higher or Lower — Football Stats Game",
      metaDescription: "Two players, one stat. Which is higher? Keep the streak alive in the daily Higher or Lower challenge.",
      title: "Higher or Lower",
      intro: "Two footballers side by side and one statistic. Call which one is higher and build your streak.",
      howToPlay: ["Read the stat being compared.", "Pick the player you think has the higher value.", "Correct picks continue the round."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "მეტი თუ ნაკლები — საფეხბურთო სტატისტიკის თამაში",
      metaDescription: "ორი ფეხბურთელი, ერთი სტატისტიკა. რომელია მეტი? შეინარჩუნე სერია ყოველდღიურ გამოწვევაში.",
      title: "მეტი თუ ნაკლები",
      intro: "ორი ფეხბურთელი გვერდიგვერდ და ერთი მაჩვენებელი. თქვი, რომელია მეტი, და ააგე სერია.",
      howToPlay: ["წაიკითხე, რომელი მაჩვენებელი დარდება.", "აირჩიე ფეხბურთელი, რომელსაც მეტი აქვს.", "სწორი არჩევანი რაუნდს აგრძელებს."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Higher or Lower futbolero — ¿Más o menos? Juego de fútbol",
      metaDescription: "Dos jugadores, una estadística. ¿Cuál es mayor? Mantén la racha en el reto diario Higher or Lower futbolero.",
      title: "Higher or Lower futbolero",
      intro: "Dos futbolistas lado a lado y una estadística. Di cuál es mayor y construye tu racha.",
      howToPlay: ["Lee la estadística que se compara.", "Elige al jugador que crees que tiene el valor más alto.", "Los aciertos continúan la ronda."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Higher or Lower Futbolcu — Hangisi Daha Yüksek?",
      metaDescription: "İki oyuncu, bir istatistik. Hangisi daha yüksek? Günlük Higher or Lower görevinde seriyi sürdür.",
      title: "Higher or Lower Futbolcu",
      intro: "Yan yana iki futbolcu ve bir istatistik. Hangisinin daha yüksek olduğunu söyle ve serini büyüt.",
      howToPlay: ["Karşılaştırılan istatistiği oku.", "Değerinin daha yüksek olduğunu düşündüğün oyuncuyu seç.", "Doğru seçimler turu sürdürür."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Higher or Lower: кто дороже, у кого больше голов — игра",
      metaDescription: "Два футболиста и одна статистика. У кого показатель выше? Продолжай серию в ежедневном испытании Higher or Lower.",
      title: "Higher or Lower: кто дороже, у кого больше голов",
      intro: "Два футболиста рядом и один статистический показатель. Выбери, у кого он выше, и продолжай серию.",
      howToPlay: ["Прочитай, какой показатель сравнивается.", "Выбери футболиста, у которого, по-твоему, значение выше.", "Верный выбор продолжит раунд."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("imposter", {
    en: {
      metaTitle: "Football Imposter — Spot the Odd Ones Out",
      metaDescription: "A list of answers, some are imposters. Select exactly the correct set. A new Imposter challenge every day.",
      title: "Football Imposter: Find the Odd Ones Out",
      intro: "Every option looks plausible, but some do not belong. Select exactly the right ones and nothing else.",
      howToPlay: ["Read the question and the option list.", "Tap every option you believe is correct.", "Submit; only an exact match scores."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "იმპოსტერი — იპოვე მცდარი პასუხები",
      metaDescription: "პასუხების სია, ზოგი მათგანი იმპოსტერია. მონიშნე ზუსტად სწორი ნაკრები. ახალი გამოწვევა ყოველდღე.",
      title: "იმპოსტერი",
      intro: "ყველა ვარიანტი დამაჯერებელია, მაგრამ ზოგი აქ არ ეკუთვნის. მონიშნე ზუსტად სწორები და მეტი არაფერი.",
      howToPlay: ["წაიკითხე კითხვა და ვარიანტების სია.", "მონიშნე ყველა, რაც სწორად მიგაჩნია.", "დაადასტურე; მხოლოდ ზუსტი დამთხვევა ითვლება."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Impostor — Detecta las respuestas falsas",
      metaDescription: "Una lista de respuestas, algunas son impostoras. Selecciona exactamente el conjunto correcto. Un reto nuevo cada día.",
      title: "Impostor",
      intro: "Todas las opciones parecen plausibles, pero algunas no encajan. Selecciona exactamente las correctas y nada más.",
      howToPlay: ["Lee la pregunta y la lista de opciones.", "Marca cada opción que creas correcta.", "Envía; solo puntúa una coincidencia exacta."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Futbol Sahtekârı — Uymayanları Bul",
      metaDescription: "Bir cevap listesi, bazıları sahtekâr. Tam olarak doğru kümeyi seç. Her gün yeni bir Sahtekâr görevi.",
      title: "Futbol Sahtekârı: Uymayanları Bul",
      intro: "Her seçenek makul görünür ama bazıları oraya ait değil. Tam olarak doğru olanları seç, başka hiçbir şeyi seçme.",
      howToPlay: ["Soruyu ve seçenek listesini oku.", "Doğru olduğuna inandığın her seçeneğe dokun.", "Gönder; yalnızca tam eşleşme puan kazandırır."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Найди лишнего: футбольная викторина — игра каждый день",
      metaDescription: "В списке ответов есть лишние. Выбери ровно все правильные варианты. Новое футбольное испытание каждый день.",
      title: "Найди лишнего: футбольная викторина",
      intro: "Каждый вариант кажется правдоподобным, но некоторые не подходят. Выбери все правильные и ничего лишнего.",
      howToPlay: ["Прочитай вопрос и список вариантов.", "Нажми на каждый вариант, который считаешь правильным.", "Отправь ответ: очки начислятся, только если совпадут все варианты."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("statSniper", {
    en: {
      metaTitle: "Closest Wins Football Quiz — Guess the Transfer Fee & Stats",
      metaDescription: "Guess real football numbers: transfer fees, market values, season goals, attendances. Play the daily solo, or live with 2–6 friends where the closest guess wins.",
      title: "Closest Wins: Football Stats Guessing Game",
      intro: "Ten real football numbers, from transfer fees to cup-final crowds. Guess as close as you can: solo in the daily, or against friends, where the closest guess takes the round.",
      howToPlay: ["Read the number question: a transfer fee, a market value, a player's goals, a crowd.", "Give your guess: slide to it in the daily, type it when you play friends.", "The closest guess scores most; an exact hit pays extra."],
      reward: "Earn coins and XP in the daily and climb its leaderboard; with friends you play for the podium.",
    },
    ka: {
      metaTitle: "სტატ სნაიპერი — ფეხბურთის ქვიზი: გამოიცანი ტრანსფერის ფასი და გოლები",
      metaDescription: "ქვიზი ფეხბურთზე რიცხვებით: ტრანსფერის ფასები, საბაზრო ღირებულებები, სეზონის გოლები, დამსწრეები. ითამაშე ყოველდღიური გამოწვევა ან 2–6 მეგობართან ერთად — იგებს, ვინც უფრო ახლოსაა.",
      title: "სტატ სნაიპერი",
      intro: "ათი ნამდვილი ფეხბურთის რიცხვი — ტრანსფერის ფასიდან ფინალის დამსწრეებამდე. ეს ქვიზი ფეხბურთზე რიცხვებით თამაშდება: მარტო ყოველდღიურ გამოწვევაში ან მეგობრებთან, სადაც რაუნდს ყველაზე ახლოს მოხვედრილი იგებს.",
      howToPlay: ["წაიკითხე კითხვა: ტრანსფერის ფასი, საბაზრო ღირებულება, გოლები ან დამსწრეები.", "დაასახელე რიცხვი: ყოველდღიურ თამაშში სლაიდერით, მეგობრებთან — ჩაწერით.", "ყველაზე ახლოს მყოფი მეტ ქულას იღებს; ზუსტი მოხვედრა ბონუსია."],
      reward: "ყოველდღიურ თამაშში დააგროვე მონეტები და XP და აიწიე ლიდერბორდში; მეგობრებთან პოდიუმისთვის თამაშობ.",
    },
    es: {
      metaTitle: "Aproximado futbolero — Juego online: gana el que más se acerca",
      metaDescription: "Adivina cifras reales del fútbol: el precio de los fichajes, valores de mercado, goles por temporada, asistencia. Juega el reto diario o con 2 a 6 amigos: quién se acerca más gana.",
      title: "Aproximado futbolero",
      intro: "Diez cifras reales del fútbol, del precio justo de un fichaje al público de una final. Acércate todo lo que puedas: solo en el reto diario o contra tus amigos, donde gana el que más se acerca.",
      howToPlay: ["Lee la pregunta: el precio de un jugador, un valor de mercado, unos goles, un aforo.", "Da tu cifra: deslízala en el reto diario o escríbela cuando juegas con amigos.", "El que más se acerca suma más; el pleno da bonus."],
      reward: "Gana monedas y XP en el reto diario y sube en su clasificación; con amigos se juega por el podio.",
    },
    tr: {
      metaTitle: "En Yakın Tahmin Oyunu — Futbol: Bonservis, Gol, Piyasa Değeri",
      metaDescription: "Gerçek futbol sayılarını tahmin et: bonservis bedelleri, piyasa değerleri, sezon golleri, seyirci sayıları. Günlük oyunu tek başına ya da 2–6 arkadaşla oyna: en yakın tahmin eden kazanır.",
      title: "En Yakın Tahmin Oyunu: Futbol Sayılarını Tahmin Et",
      intro: "Bonservis bedelinden final seyircisine on gerçek futbol sayısı. Olabildiğince yaklaş: günlük oyunda tek başına ya da arkadaşlarınla, en yakın tahmin eden turu kazanır.",
      howToPlay: ["Soruyu oku: bir bonservis bedeli, piyasa değeri, gol sayısı ya da seyirci.", "Tahminini ver: günlük oyunda kaydır, arkadaşlarla oynarken yaz.", "En yakın tahmin en çok puanı alır; tam isabet ekstra kazandırır."],
      reward: "Günlük oyunda jeton ve XP kazan, liderlik tablosunda yüksel; arkadaşlarla kürsü için oynarsın.",
    },
    ru: {
      metaTitle: "Угадай статистику: кто ближе, тот и выиграл — футбольная викторина",
      metaDescription: "Угадывай реальные футбольные цифры: трансферные суммы, рыночную стоимость, голы за сезон и посещаемость. Играй в ежедневное испытание или с 2–6 друзьями: побеждает самый точный.",
      title: "Угадай статистику: кто ближе, тот и выиграл",
      intro: "Десять настоящих футбольных цифр: от трансферных сумм до зрителей на финале кубка. Угадывай как можно точнее — в одиночку в ежедневном испытании или с друзьями, где самый точный забирает раунд.",
      howToPlay: ["Прочитай вопрос о цифрах: трансферная сумма, рыночная стоимость, голы игрока или число зрителей.", "Дай свой ответ: выбери число ползунком в ежедневном испытании или введи его в игре с друзьями.", "Самый точный ответ приносит больше очков, а точное попадание — дополнительную награду."],
      reward: "Зарабатывай монеты и XP в ежедневном испытании и поднимайся в рейтинге; с друзьями играй за место на пьедестале.",
    },
  }),
  daily("passChain", {
    en: {
      metaTitle: "Connect Footballers Through Teammates — Pass Chain",
      metaDescription: "Two chains a day. Connect the start player to the target through team-mates who shared a club. Fewer links score higher.",
      title: "Pass Chain",
      intro: "Two players, one chain. Pass through team-mates who shared a club until you reach the target.",
      howToPlay: ["Type a player who shared a club with the last player in the chain.", "Keep passing until someone in the chain shared a club with the target.", "Match par, the shortest possible chain, for a perfect score."],
      reward: "Earn coins and XP for every chain you close.",
    },
    ka: {
      metaTitle: "პასების ჯაჭვი — დააკავშირე ორი ფეხბურთელი საერთო კლუბებით",
      metaDescription: "დღეში ორი ჯაჭვი. დააკავშირე საწყისი ფეხბურთელი სამიზნესთან საერთო კლუბის თანაგუნდელებით. ნაკლები რგოლი — მეტი ქულა.",
      title: "პასების ჯაჭვი",
      intro: "ორი ფეხბურთელი, ერთი ჯაჭვი. გადაეცი პასი თანაგუნდელებს, სანამ სამიზნემდე მიხვალ.",
      howToPlay: ["ჩაწერე ფეხბურთელი, რომელიც ჯაჭვის ბოლო მოთამაშესთან ერთ კლუბში თამაშობდა.", "გააგრძელე, სანამ ჯაჭვის ვინმე სამიზნესთან საერთო კლუბს გაიზიარებს.", "მიაღწიე პარს — უმოკლეს ჯაჭვს — სრული ქულისთვის."],
      reward: "დააგროვე მონეტები და XP ყოველი დახურული ჯაჭვისთვის.",
    },
    es: {
      metaTitle: "Conectando jugadores de fútbol — Conecta a dos futbolistas por sus clubes",
      metaDescription: "Conecta jugadores de fútbol: dos cadenas al día. Une al jugador inicial con el objetivo a través de compañeros que compartieron club. Menos eslabones, más puntos.",
      title: "Conectando jugadores",
      intro: "Dos jugadores, una cadena. Pasa por compañeros que compartieron club hasta llegar al objetivo.",
      howToPlay: ["Escribe un jugador que compartió club con el último de la cadena.", "Sigue pasando hasta que alguien de la cadena comparta club con el objetivo.", "Iguala el par, la cadena más corta posible, para la puntuación perfecta."],
      reward: "Gana monedas y XP por cada cadena que cierres.",
    },
    tr: {
      metaTitle: "Futbolcu Bağlantı Zinciri — İki Futbolcuyu Ortak Kulüplerle Bağla",
      metaDescription: "Günde iki zincir. Başlangıç oyuncusunu aynı kulüpte oynamış takım arkadaşları üzerinden hedefe bağla. Daha az halka, daha yüksek puan.",
      title: "Futbolcu Bağlantı Zinciri",
      intro: "İki oyuncu, bir zincir. Hedefe ulaşana kadar aynı kulüpte oynamış takım arkadaşları üzerinden pas ver.",
      howToPlay: ["Zincirdeki son oyuncuyla aynı kulüpte oynamış bir oyuncu yaz.", "Zincirdeki biri hedefle aynı kulüpte oynayana kadar pas vermeye devam et.", "Mükemmel skor için mümkün olan en kısa zincir olan par'ı tuttur."],
      reward: "Kapattığın her zincir için jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Соедини футболистов через партнёров — футбольная игра",
      metaDescription: "Две цепочки каждый день. Соедини начального игрока с целью через партнёров по команде, игравших в одном клубе. Чем короче цепочка, тем выше счёт.",
      title: "Соедини футболистов через партнёров",
      intro: "Два игрока — одна цепочка. Передавай пас через партнёров, игравших в одном клубе, пока не доберёшься до цели.",
      howToPlay: ["Введи игрока, который играл в одном клубе с последним футболистом в цепочке.", "Продолжай пасовать, пока кто-то из цепочки не окажется одноклубником цели.", "Для идеального результата собери цепочку не длиннее пар — минимально возможной длины."],
      reward: "Зарабатывай монеты и XP за каждую завершённую цепочку.",
    },
  }),
  daily("missingXi", {
    en: {
      metaTitle: "Missing XI — Name the Famous Starting Line-ups",
      metaDescription: "Three famous starting XIs a day. Tap a shirt, name the player who started there, and complete the line-up before the clock runs out.",
      title: "Missing XI",
      intro: "A legendary line-up with the names hidden. Fill every shirt from memory.",
      howToPlay: ["Tap an empty shirt on the pitch.", "Type the player who started there — surname is enough.", "Complete all 11 before time or your three misses run out."],
      reward: "Earn coins and XP for every shirt you name.",
    },
    ka: {
      metaTitle: "დაკარგული XI — ცნობილი შემადგენლობების გამოცნობა",
      metaDescription: "დღეში სამი ცნობილი შემადგენლობა. დააჭირე მაისურს, დაასახელე ფეხბურთელი და შეავსე შემადგენლობა დროის ამოწურვამდე.",
      title: "დაკარგული XI",
      intro: "ლეგენდარული შემადგენლობა დამალული სახელებით. შეავსე ყველა მაისური მეხსიერებიდან.",
      howToPlay: ["დააჭირე ცარიელ მაისურს მოედანზე.", "ჩაწერე, ვინ დაიწყო იქ — გვარიც საკმარისია.", "შეავსე 11-ვე, სანამ დრო ან სამი შეცდომა ამოგეწურება."],
      reward: "დააგროვე მონეტები და XP ყოველი გამოცნობილი მაისურისთვის.",
    },
    es: {
      metaTitle: "Adivina el 11 — Completa las alineaciones famosas",
      metaDescription: "Adivina el once titular de tres alineaciones famosas al día. Toca una camiseta, nombra al titular y completa la alineación antes de que acabe el tiempo.",
      title: "Adivina el 11",
      intro: "Una alineación legendaria con los nombres ocultos. Rellena cada camiseta de memoria.",
      howToPlay: ["Toca una camiseta vacía en el campo.", "Escribe quién fue titular ahí; basta con el apellido.", "Completa las 11 antes de que se acabe el tiempo o los tres fallos."],
      reward: "Gana monedas y XP por cada camiseta que aciertes.",
    },
    tr: {
      metaTitle: "İlk 11 Tahmin Etme — Efsane Kadroları Bil",
      metaDescription: "Günde üç ünlü ilk on bir. Bir formaya dokun, orada başlayan oyuncuyu söyle ve süre bitmeden kadroyu tamamla.",
      title: "İlk 11 Tahmin Etme",
      intro: "İsimleri gizlenmiş efsanevi bir kadro. Her formayı hafızandan doldur.",
      howToPlay: ["Sahadaki boş bir formaya dokun.", "Orada başlayan oyuncuyu yaz — soyadı yeterli.", "Süre veya üç hata hakkın bitmeden 11'ini de tamamla."],
      reward: "Söylediğin her forma için jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Угадай состав: легендарные составы команд — футбольная игра",
      metaDescription: "Каждый день — три знаменитых стартовых состава. Нажми на футболку, назови игрока, который вышел на этой позиции, и заполни состав до конца времени.",
      title: "Угадай состав: легендарные составы команд",
      intro: "Легендарный состав со скрытыми именами. Заполни все футболки по памяти.",
      howToPlay: ["Нажми на пустую футболку на поле.", "Введи имя игрока, который вышел на этой позиции, — достаточно фамилии.", "Назови всех 11 до конца времени или пока не израсходуешь три ошибки."],
      reward: "Зарабатывай монеты и XP за каждого угаданного игрока.",
    },
  }),
  daily("footballLogic", {
    en: {
      metaTitle: "Guess the Footballer from Pictures — Football Logic",
      metaDescription: "Two pictures point to one footballer. Decode the visual riddle in the daily Football Logic challenge.",
      title: "Football Logic",
      intro: "Two images, one hidden footballer. Put the clues together and type the name.",
      howToPlay: ["Look at both pictures.", "Work out the player they point to.", "Type the name before the timer ends."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "საფეხბურთო ლოგიკა — ვიზუალური თავსატეხები",
      metaDescription: "ორი სურათი ერთ ფეხბურთელზე მიუთითებს. ამოხსენი ვიზუალური თავსატეხი ყოველდღიურ გამოწვევაში.",
      title: "საფეხბურთო ლოგიკა",
      intro: "ორი სურათი, ერთი დამალული ფეხბურთელი. შეაერთე მინიშნებები და ჩაწერე სახელი.",
      howToPlay: ["დააკვირდი ორივე სურათს.", "გამოიცანი, რომელ ფეხბურთელზე მიუთითებენ.", "ჩაწერე სახელი დროის ამოწურვამდე."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Acertijos de fútbol — Adivina al futbolista con dos imágenes",
      metaDescription: "Dos imágenes señalan a un futbolista. Descifra el acertijo visual en el reto diario.",
      title: "Acertijos de fútbol",
      intro: "Dos imágenes, un futbolista oculto. Une las pistas y escribe el nombre.",
      howToPlay: ["Observa ambas imágenes.", "Deduce al jugador al que apuntan.", "Escribe el nombre antes de que acabe el tiempo."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Futbol Bilmeceleri — Resimden Futbolcuyu Tahmin Et",
      metaDescription: "İki resim bir futbolcuyu işaret eder. Günlük Futbol Bilmeceleri görevinde görsel bilmeceyi çöz.",
      title: "Futbol Bilmeceleri",
      intro: "İki görsel, bir gizli futbolcu. İpuçlarını birleştir ve ismi yaz.",
      howToPlay: ["İki resme de bak.", "İşaret ettikleri oyuncuyu bul.", "Süre bitmeden ismi yaz."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Футбольные загадки на логику — угадай игрока по картинкам",
      metaDescription: "Две картинки указывают на одного футболиста. Разгадай визуальную загадку в ежедневном испытании «Футбольные загадки на логику».",
      title: "Футбольные загадки на логику",
      intro: "Две картинки — один загаданный футболист. Соедини подсказки и введи имя.",
      howToPlay: ["Рассмотри обе картинки.", "Определи, на какого игрока они указывают.", "Введи имя до конца времени."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("putInOrder", {
    en: {
      metaTitle: "Football Timeline — Put the Events in Order",
      metaDescription: "Drag football events, transfers and records into the right order. A new Put in Order challenge every day.",
      title: "Football Timeline",
      intro: "Four football items in the wrong order. Drag them into the correct sequence before the timer ends.",
      howToPlay: ["Read what the round is ordering, for example transfer fees.", "Drag the items into order.", "Submit; each fully correct round scores."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "დაალაგე რიგის მიხედვით — საფეხბურთო ქრონოლოგია",
      metaDescription: "დაალაგე საფეხბურთო მოვლენები, ტრანსფერები და რეკორდები სწორი თანმიმდევრობით. ახალი გამოწვევა ყოველდღე.",
      title: "დაალაგე რიგის მიხედვით",
      intro: "ოთხი საფეხბურთო ელემენტი არეული რიგით. გადაათრიე სწორ თანმიმდევრობაში დროის ამოწურვამდე.",
      howToPlay: ["წაიკითხე, რას ალაგებ ამ რაუნდში, მაგალითად ტრანსფერის ფასებს.", "გადაათრიე ელემენტები რიგზე.", "დაადასტურე; მხოლოდ სრულად სწორი რაუნდი ითვლება."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Ordena — Reto cronológico de fútbol",
      metaDescription: "Arrastra eventos, traspasos y récords de fútbol al orden correcto. Un reto nuevo cada día.",
      title: "Ordena",
      intro: "Cuatro elementos de fútbol desordenados. Arrástralos a la secuencia correcta antes de que acabe el tiempo.",
      howToPlay: ["Lee qué se ordena en la ronda, por ejemplo traspasos.", "Arrastra los elementos al orden correcto.", "Envía; cada ronda totalmente correcta puntúa."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Futbol Zaman Çizelgesi — Olayları Sıraya Koy",
      metaDescription: "Futbol olaylarını, transferleri ve rekorları doğru sıraya sürükle. Her gün yeni bir Sıraya Koy görevi.",
      title: "Futbol Zaman Çizelgesi",
      intro: "Yanlış sırada dört futbol öğesi. Süre bitmeden doğru sıraya sürükle.",
      howToPlay: ["Turun neyi sıraladığını oku, örneğin transfer ücretleri.", "Öğeleri sıraya sürükle.", "Gönder; tamamen doğru her tur puan kazandırır."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Что было раньше? Футбольная хронология — события по порядку",
      metaDescription: "Расставляй футбольные события, трансферы и рекорды в правильном порядке. Каждый день — новое испытание «Что было раньше?».",
      title: "Что было раньше? Футбольная хронология",
      intro: "Четыре футбольных факта перепутаны. Расставь их по порядку до конца времени.",
      howToPlay: ["Прочитай, что нужно упорядочить в этом раунде, например трансферные суммы.", "Перетащи пункты в нужном порядке.", "Отправь ответ: за каждый раунд без ошибок начисляются очки."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  daily("cardDetective", {
    en: {
      metaTitle: "Guess the Player from His Card — Card Detective",
      metaDescription: "Every slot on the player card is a locked clue with a price. Buy the clues you need and name the footballer with the most coins left. Ten cards a day.",
      title: "Card Detective",
      intro: "A player card with every slot locked. Each clue costs coins: reveal as little as you can, then name the player.",
      howToPlay: ["Open a clue: rating, position, club or nation each has a price.", "Type the player as soon as you know.", "The more coins you keep, the more you score."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "ბარათის დეტექტივი — გახსენი მინიშნებები, დაასახელე ფეხბურთელი",
      metaDescription: "ბარათის ყველა უჯრა დახურული მინიშნებაა ფასით. იყიდე საჭირო მინიშნებები და გამოიცანი ფეხბურთელი მაქსიმალური ქოინების შენარჩუნებით. ათი ბარათი ყოველდღე.",
      title: "ბარათის დეტექტივი",
      intro: "ფეხბურთელის ბარათი დახურული უჯრებით. ყოველი მინიშნება ქოინები ღირს: გახსენი რაც შეიძლება ცოტა და დაასახელე მოთამაშე.",
      howToPlay: ["გახსენი მინიშნება: რეიტინგს, პოზიციას, კლუბს და ქვეყანას თავისი ფასი აქვს.", "ჩაწერე ფეხბურთელი, როგორც კი მიხვდები.", "რაც მეტი ქოინი დაგრჩება, მით მეტი ქულა."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Adivina el jugador por su carta — Desbloquea pistas y nómbralo",
      metaDescription: "Cada casilla de la carta es una pista bloqueada con precio. Compra las pistas que necesites y nombra al futbolista con más monedas restantes. Diez cartas al día.",
      title: "Adivina el jugador por su carta",
      intro: "Una carta de jugador con todas las casillas bloqueadas. Cada pista cuesta monedas: revela lo mínimo y nombra al jugador.",
      howToPlay: ["Abre una pista: valoración, posición, club o país tienen su precio.", "Escribe el jugador en cuanto lo sepas.", "Cuantas más monedas conserves, más puntos."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Kart Dedektifi — İpuçlarını Aç, Futbolcuyu Söyle",
      metaDescription: "Oyuncu kartındaki her kutu fiyatı olan kilitli bir ipucu. Sana gereken ipuçlarını satın al ve elinde en çok jeton kalacak şekilde futbolcuyu söyle. Her gün on kart.",
      title: "Kart Dedektifi",
      intro: "Bütün kutuları kilitli bir oyuncu kartı. Her ipucu jetona mal olur: olabildiğince az aç, sonra oyuncuyu söyle.",
      howToPlay: ["Bir ipucu aç: reyting, mevki, kulüp ve ülkenin her birinin bir fiyatı var.", "Oyuncuyu bilir bilmez yaz.", "Ne kadar çok jeton kalırsa o kadar çok puan alırsın."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Угадай футболиста по карточке — открой подсказки",
      metaDescription: "Каждая ячейка карточки игрока — закрытая подсказка с ценой. Купи нужные подсказки и назови футболиста, сохранив побольше монет. Десять карточек в день.",
      title: "Угадай футболиста по карточке",
      intro: "Все ячейки карточки игрока закрыты. Каждая подсказка стоит монет: открой как можно меньше, а потом назови игрока.",
      howToPlay: ["Открой подсказку: рейтинг, позиция, клуб или сборная — у каждой своя цена.", "Введи имя игрока, как только догадаешься.", "Чем больше монет сохранишь, тем больше очков получишь."],
      reward: "Зарабатывай монеты и XP каждый день, когда играешь.",
    },
  }),
  mode("ranked", "/play", "match", {
    en: {
      metaTitle: "1v1 Football Trivia — Ranked Live Matches",
      metaDescription: "Face a real opponent in live 1v1 football trivia. Possession-style rounds, penalties, ranked points and leaderboards.",
      title: "Ranked 1v1",
      intro: "The core of QuizBall: live head-to-head football trivia against a real opponent, with possession, penalties and a ranked ladder.",
      howToPlay: ["Queue up and get matched in seconds.", "Answer faster and more accurately to keep possession.", "Win to climb divisions and the leaderboard."],
      reward: "Earn ranked points, coins and XP per match.",
    },
    ka: {
      metaTitle: "რეიტინგული 1v1 საფეხბურთო ტრივია — ლაივ მატჩები",
      metaDescription: "შეხვდი ნამდვილ მეტოქეს ლაივ 1v1 საფეხბურთო ტრივიაში. ფლობის რაუნდები, პენალტები, რეიტინგული ქულები და ლიდერბორდი.",
      title: "რეიტინგული 1v1",
      intro: "QuizBall-ის გული: ლაივ საფეხბურთო ტრივია ნამდვილი მეტოქის წინააღმდეგ, ფლობით, პენალტებითა და რეიტინგული კიბით.",
      howToPlay: ["შედი რიგში და წამებში იპოვე მეტოქე.", "უპასუხე უფრო სწრაფად და ზუსტად, რომ ფლობა შეინარჩუნო.", "მოიგე, რომ დივიზიონებში და ლიდერბორდზე აიწიო."],
      reward: "დააგროვე რეიტინგული ქულები, მონეტები და XP მატჩზე.",
    },
    es: {
      metaTitle: "¿Quién sabe más de fútbol? Trivia 1v1 en vivo",
      metaDescription: "Enfréntate a un rival real en trivia de fútbol 1v1 en vivo. Rondas de posesión, penaltis, puntos y clasificación.",
      title: "¿Quién sabe más de fútbol? 1v1",
      intro: "El corazón de QuizBall: trivia de fútbol en vivo contra un rival real, con posesión, penaltis y una escalera clasificatoria.",
      howToPlay: ["Entra en la cola y emparéjate en segundos.", "Responde más rápido y mejor para mantener la posesión.", "Gana para subir de división y en la clasificación."],
      reward: "Gana puntos, monedas y XP por partido.",
    },
    tr: {
      metaTitle: "1v1 Futbol Bilgi Yarışması — Dereceli Canlı Maçlar",
      metaDescription: "Canlı 1v1 futbol bilgi yarışmasında gerçek bir rakiple karşılaş. Top hakimiyeti turları, penaltılar, dereceli puanlar ve liderlik tabloları.",
      title: "1v1 Futbol Bilgi Yarışması",
      intro: "QuizBall'un özü: gerçek bir rakibe karşı top hakimiyeti, penaltılar ve dereceli bir sıralamayla canlı futbol bilgi yarışması.",
      howToPlay: ["Sıraya gir ve saniyeler içinde eşleş.", "Topu elinde tutmak için daha hızlı ve daha doğru cevapla.", "Liglerde ve liderlik tablosunda yükselmek için kazan."],
      reward: "Maç başına dereceli puan, jeton ve XP kazan.",
    },
    ru: {
      metaTitle: "Футбольная викторина онлайн с соперником (1 на 1) — рейтинговые матчи",
      metaDescription: "Сразись с реальным соперником в футбольной викторине онлайн 1 на 1. Раунды на владение мячом, пенальти, рейтинговые очки и таблицы лидеров.",
      title: "Футбольная викторина онлайн с соперником (1 на 1)",
      intro: "Суть QuizBall: живая футбольная викторина против реального соперника — владение мячом, пенальти и рейтинговая таблица.",
      howToPlay: ["Встань в очередь и найди соперника за несколько секунд.", "Отвечай быстрее и точнее, чтобы сохранить владение мячом.", "Побеждай, чтобы подняться в дивизионах и рейтинге."],
      reward: "Зарабатывай рейтинговые очки, монеты и XP за каждый матч.",
    },
  }),
  mode("auction", "/auction", "auction", {
    en: {
      metaTitle: "Football Auction Game | QuizBall",
      metaDescription: "Play Quizball's Football Auction game online. Bid for footballers and build your team, with guest play available without creating an account.",
      title: "Football Auction Game",
      intro: "Build a football team through an auction. Make your bids, watch the available budget and choose the players you want. Read the round's rules before starting and play as a guest without creating an account.",
      howToPlay: ["Players come up one by one with clues about who they are.", "Bid against the other managers; the highest bid signs the player.", "Fill your line-up within the budget.", "The best-rated complete team wins."],
      reward: "Coin rewards and rank need an account; guest auctions are practice.",
    },
    ka: {
      metaTitle: "საფეხბურთო აუქციონი | QuizBall",
      metaDescription: "ითამაშე Quizball-ის საფეხბურთო აუქციონი ონლაინ. ივაჭრე ფეხბურთელებზე და ააწყვე გუნდი; სტუმრად თამაში ანგარიშის გარეშე.",
      title: "საფეხბურთო აუქციონი",
      intro: "ააწყვე გუნდი აუქციონით. დადე ფსონები, უყურე ბიუჯეტს და აირჩიე შენი ფეხბურთელები. წაიკითხე რაუნდის წესები და ითამაშე სტუმრად.",
      howToPlay: ["ფეხბურთელები სათითაოდ გამოდიან მინიშნებებით.", "ივაჭრე სხვა მენეჯერების წინააღმდეგ; მაქსიმალური ფსონი ფეხბურთელს იძენს.", "შეავსე შემადგენლობა ბიუჯეტის ფარგლებში.", "საუკეთესო რეიტინგის სრული გუნდი იგებს."],
      reward: "ქოინების ჯილდოებს და რეიტინგს ანგარიში სჭირდება; სტუმრის აუქციონი სავარჯიშოა.",
    },
    es: {
      metaTitle: "Subasta futbolera: juego de subasta de jugadores de fútbol | QuizBall",
      metaDescription: "Juega a la subasta futbolera online, la subasta de jugadores de fútbol: puja por futbolistas y forma tu equipo, con partidas de invitado sin crear cuenta.",
      title: "Subasta futbolera",
      intro: "Forma un equipo de fútbol en una subasta. Haz tus pujas, vigila el presupuesto y elige a los jugadores que quieres. Lee las reglas de la ronda antes de empezar y juega como invitado.",
      howToPlay: ["Los jugadores salen uno a uno con pistas sobre quiénes son.", "Puja contra los demás mánagers; la puja más alta ficha al jugador.", "Completa tu once dentro del presupuesto.", "Gana el equipo completo mejor valorado."],
      reward: "Las monedas y el rango requieren cuenta; las subastas de invitado son de práctica.",
    },
    tr: {
      metaTitle: "Futbol Açık Artırma Oyunu | QuizBall",
      metaDescription: "Quizball'un futbol açık artırma oyununu çevrimiçi oyna. Futbolculara teklif ver, kadronu kur; hesap açmadan misafir olarak dene.",
      title: "Futbol Açık Artırma Oyunu",
      intro: "Açık artırmayla bir futbol takımı kur. Teklif ver, bütçeni takip et ve istediğin oyuncuları seç. Başlamadan önce tur kurallarını oku; hesap açmadan misafir olarak oynayabilirsin.",
      howToPlay: ["Oyuncular kim olduklarına dair ipuçlarıyla tek tek gelir.", "Diğer menajerlere karşı teklif ver; en yüksek teklif oyuncuyu alır.", "Kadronu bütçenin içinde tamamla.", "En yüksek puanlı tam kadro kazanır."],
      reward: "Jeton ödülleri ve sıralama hesap gerektirir; misafir açık artırmaları alıştırmadır.",
    },
    ru: {
      metaTitle: "Футбольный аукцион: собери команду мечты | QuizBall",
      metaDescription: "Играй в футбольный аукцион Quizball онлайн: выбирай футболистов и собирай команду. Можно играть гостем, без регистрации.",
      title: "Футбольный аукцион: собери команду мечты",
      intro: "Собери футбольную команду на аукционе. Делай предложения, следи за бюджетом и выбирай нужных игроков. Перед началом прочитай правила раунда. Можно играть гостем, без регистрации.",
      howToPlay: ["Игроки появляются по одному, вместе с подсказками о том, кто они.", "Соревнуйся с другими менеджерами: игрок достанется тому, кто предложит больше.", "Собери состав, не выходя за бюджет.", "Побеждает команда с самым высоким рейтингом среди полных составов."],
      reward: "Монеты и место в рейтинге доступны после входа в аккаунт; игра гостем — тренировка.",
    },
  }),
  mode("friendly", "/friend", "match", {
    en: {
      metaTitle: "Friendly Football Trivia Matches | QuizBall",
      metaDescription: "Challenge a friend to a football trivia match on Quizball. Create or join a friendly game in your browser and play without registering first.",
      title: "Play a Friendly Football Trivia Match",
      intro: "Play a football trivia match with a friend. Create a room or join one using the invite option, then answer head to head. Ranked points and Weekend League prizes belong to their separate competitive modes.",
      howToPlay: ["Create a room and share the invite link, or join a friend's room.", "Both players answer the same football questions under the clock.", "Faster correct answers score more.", "The higher total after the final question wins."],
      reward: "Friendly matches award no ranked points; play for bragging rights.",
    },
    ka: {
      metaTitle: "მეგობრული საფეხბურთო მატჩი | QuizBall",
      metaDescription: "გამოიწვიე მეგობარი საფეხბურთო ტრივიაში Quizball-ზე. შექმენი ან შეუერთდი მეგობრულ თამაშს ბრაუზერში.",
      title: "ითამაშე მეგობრული საფეხბურთო მატჩი",
      intro: "ითამაშე საფეხბურთო ტრივია მეგობართან. შექმენი ოთახი ან შეუერთდი მოწვევით და უპასუხე პირისპირ. რეიტინგული ქულები და შაბათ-კვირის ლიგის პრიზები ცალკე რეჟიმებს ეკუთვნის.",
      howToPlay: ["შექმენი ოთახი და გააზიარე მოწვევა, ან შეუერთდი მეგობრის ოთახს.", "ორივე მოთამაშე ერთსა და იმავე კითხვებს პასუხობს დროზე.", "სწრაფი სწორი პასუხი მეტ ქულას იძლევა.", "ბოლო კითხვის შემდეგ მეტი ქულა იგებს."],
      reward: "მეგობრული მატჩი რეიტინგულ ქულებს არ იძლევა.",
    },
    es: {
      metaTitle: "Partidos amistosos de trivia futbolera | QuizBall",
      metaDescription: "Reta a un amigo a un partido de trivia de fútbol en Quizball. Crea o únete a una partida amistosa en tu navegador.",
      title: "Juega un partido amistoso de trivia de fútbol",
      intro: "Juega un partido de trivia futbolera con un amigo. Crea una sala o únete con la invitación y responded cara a cara. Los puntos de clasificación y los premios de la Weekend League pertenecen a sus modos competitivos.",
      howToPlay: ["Crea una sala y comparte la invitación, o únete a la sala de un amigo.", "Los dos respondéis las mismas preguntas contrarreloj.", "Las respuestas correctas más rápidas puntúan más.", "Gana quien tenga más puntos tras la última pregunta."],
      reward: "Los amistosos no dan puntos de clasificación.",
    },
    tr: {
      metaTitle: "Arkadaşınla Futbol Bilgi Maçı | QuizBall",
      metaDescription: "Quizball'da bir arkadaşını futbol bilgi maçına davet et. Tarayıcında oda kur ya da bir odaya katıl.",
      title: "Arkadaşınla futbol bilgi maçı oyna",
      intro: "Bir arkadaşınla futbol bilgi maçı oyna. Oda kur ya da davet bağlantısıyla katıl, sonra aynı soruları karşılıklı cevapla. Sıralama puanları ve Hafta Sonu Ligi ödülleri ayrı rekabet modlarına aittir.",
      howToPlay: ["Oda kur ve daveti paylaş ya da arkadaşının odasına katıl.", "İki oyuncu da aynı futbol sorularını süreye karşı cevaplar.", "Daha hızlı doğru cevaplar daha çok puan getirir.", "Son sorudan sonra toplamı yüksek olan kazanır."],
      reward: "Dostluk maçları sıralama puanı vermez.",
    },
    ru: {
      metaTitle: "Футбольная викторина с другом онлайн | QuizBall",
      metaDescription: "Сыграй с другом в футбольную викторину на Quizball. Создай комнату или присоединись к игре в браузере без регистрации.",
      title: "Футбольная викторина с другом онлайн",
      intro: "Сыграй с другом в футбольную викторину. Создай комнату или присоединись по приглашению, а затем отвечайте друг против друга. Очки рейтинга и призы Лиги выходного дня доступны в отдельных соревновательных режимах.",
      howToPlay: ["Создай комнату и отправь ссылку-приглашение или присоединись к комнате друга.", "Оба игрока отвечают на одинаковые футбольные вопросы на время.", "За быстрые правильные ответы дают больше очков.", "После последнего вопроса побеждает тот, у кого больше очков."],
      reward: "В дружеских матчах не начисляются очки рейтинга — играй ради победы и похвалы друзей.",
    },
  }),
  mode("football-tic-tac-toe", "/tic-tac-toe", "mini-football-grid", {
    en: {
      metaTitle: "Football Tic Tac Toe Online | QuizBall",
      metaDescription: "Play Football Tic Tac Toe online. Name players who match both grid categories, claim squares and compete for three in a row. Start without an account.",
      title: "Football Tic Tac Toe",
      intro: "Match your football knowledge against the grid. Choose a square, name a player who fits both categories, and aim for three in a row. Start as a guest and use the available setup options to choose your game.",
      howToPlay: ["Pick a square: its row and column are two categories, such as a club and a nation.", "Name a player who fits both. Surnames and small typos are accepted.", "A correct name claims the square; three in a row wins the game.", "Best-of-three series decide close matches."],
      reward: "Ranked-points rewards need an account; guest games are practice.",
    },
    ka: {
      metaTitle: "საფეხბურთო იქს-ნული ონლაინ | QuizBall",
      metaDescription: "ითამაშე საფეხბურთო იქს-ნული ონლაინ. დაასახელე ფეხბურთელები, რომლებიც ორივე კატეგორიას ერგებიან, დაიკავე უჯრები და შეაგროვე სამი ზედიზედ. დაწყება ანგარიშის გარეშე.",
      title: "საფეხბურთო იქს-ნული",
      intro: "შეამოწმე ცოდნა ბადეზე. აირჩიე უჯრა, დაასახელე ფეხბურთელი, რომელიც ორივე კატეგორიას ერგება, და შეაგროვე სამი ზედიზედ. დაიწყე სტუმრად.",
      howToPlay: ["აირჩიე უჯრა: მისი სტრიქონი და სვეტი ორი კატეგორიაა, მაგალითად კლუბი და ქვეყანა.", "დაასახელე ფეხბურთელი, რომელიც ორივეს ერგება. გვარი და მცირე შეცდომები მიიღება.", "სწორი პასუხი უჯრას იკავებს; სამი ზედიზედ იგებს.", "თანაბარ მატჩებს სამიდან საუკეთესო სერია წყვეტს."],
      reward: "რეიტინგული ჯილდოებისთვის ანგარიშია საჭირო; სტუმრის თამაში სავარჯიშოა.",
    },
    es: {
      metaTitle: "Tic Tac Toe futbolero (tatetí y tres en raya) online | QuizBall",
      metaDescription: "Juega al tic tac toe futbolero online, también llamado Tiki Taka Toe, tatetí o tres en raya de fútbol. Nombra jugadores que cumplan ambas categorías, conquista casillas y consigue tres en línea. Empieza sin cuenta.",
      title: "Tic Tac Toe futbolero",
      intro: "Pon a prueba tu fútbol contra la cuadrícula. Elige una casilla, nombra un jugador que encaje en ambas categorías y busca tres en línea. Empieza como invitado.",
      howToPlay: ["Elige una casilla: su fila y su columna son dos categorías, por ejemplo un club y un país.", "Nombra un jugador que cumpla ambas. Se aceptan apellidos y erratas pequeñas.", "Un nombre correcto conquista la casilla; tres en línea gana.", "Los partidos igualados se deciden al mejor de tres."],
      reward: "Las recompensas de puntos requieren cuenta; las partidas de invitado son de práctica.",
    },
    tr: {
      metaTitle: "Futbol XOX — Futbol Tic Tac Toe Oyna (1v1)",
      metaDescription: "Canlı 1v1 futbol tic tac toe: her hücre iki kriteri kesiştirir, ikisine de uyan bir oyuncu söyle, üçü yan yana kazanır. Üç maçın en iyisi.",
      title: "Futbol XOX",
      intro: "Kulüpler, ülkeler, kupalar ve takım arkadaşlarından oluşan 3×3 bir ızgara. İki kritere de uyan bir futbolcu söyleyerek hücreyi al. Üçü yan yana tahtayı, üç maçın en iyisi seriyi kazanır.",
      howToPlay: ["Sıran geldiğinde boş bir hücre seç.", "Satıra ve sütuna uyan bir oyuncu yaz.", "Doğru cevap hücreyi alır; bir sırada üç kazanır."],
      reward: "Seri başına jeton ve Tic Tac Toe puanı kazan.",
    },
    ru: {
      metaTitle: "Футбольные крестики-нолики онлайн | QuizBall",
      metaDescription: "Играй в футбольные крестики-нолики онлайн: называй игроков, подходящих под категории поля, занимай клетки и собери три в ряд. Начни без аккаунта.",
      title: "Футбольные крестики-нолики онлайн",
      intro: "Проверь свои знания футбола на игровом поле. Выбери клетку, назови игрока, который подходит под обе категории, и собери три в ряд. Начни гостем и выбери игру в настройках.",
      howToPlay: ["Выбери клетку: её строка и столбец задают две категории, например клуб и страну.", "Назови игрока, который подходит под обе. Можно отвечать фамилией, небольшие опечатки допустимы.", "Правильный ответ занимает клетку; три в ряд принесут победу.", "В равной серии победит тот, кто выиграет два матча из трёх."],
      reward: "Очки рейтинга начисляются после входа в аккаунт; игра гостем — тренировка.",
    },
  }),
  mode("free-kicks", "/free-kicks", "mini-final-third", {
    en: {
      metaTitle: "Free Kicks — Football Trivia Shootout for Coins",
      metaDescription: "Answer football questions to open scoring zones, then take your free kick. Play for coins in QuizBall Free Kicks.",
      title: "Free Kicks",
      intro: "Each correct answer opens a zone in the goal. Then step up and take the kick for coins.",
      howToPlay: ["Stake coins to start a round.", "Answer questions to open zones.", "Shoot; more open zones, better odds."],
      reward: "Win coins on every converted kick.",
    },
    ka: {
      metaTitle: "საჯარიმო დარტყმები — საფეხბურთო ტრივია მონეტებზე",
      metaDescription: "უპასუხე საფეხბურთო კითხვებს, გახსენი კარის ზონები და შეასრულე საჯარიმო. ითამაშე მონეტებზე.",
      title: "საჯარიმო დარტყმები",
      intro: "ყოველი სწორი პასუხი კარის ერთ ზონას ხსნის. შემდეგ დადექი ბურთთან და დაარტყი მონეტებზე.",
      howToPlay: ["დადე მონეტები რაუნდის დასაწყებად.", "უპასუხე კითხვებს ზონების გასახსნელად.", "დაარტყი; მეტი ღია ზონა — უკეთესი შანსი."],
      reward: "მოიგე მონეტები ყოველ გატანილ დარტყმაზე.",
    },
    es: {
      metaTitle: "Tiros libres — Tanda de trivia de fútbol por monedas",
      metaDescription: "Responde preguntas de fútbol para abrir zonas de la portería y lanza tu tiro libre. Juega por monedas.",
      title: "Tiros libres",
      intro: "Cada acierto abre una zona de la portería. Luego lanza el tiro por monedas.",
      howToPlay: ["Apuesta monedas para empezar una ronda.", "Responde preguntas para abrir zonas.", "Dispara; más zonas abiertas, mejores probabilidades."],
      reward: "Gana monedas en cada tiro convertido.",
    },
    tr: {
      metaTitle: "Frikikler — Jeton İçin Futbol Bilgi Yarışması Şutları",
      metaDescription: "Skor bölgelerini açmak için futbol sorularını yanıtla, sonra frikiğini kullan. QuizBall Frikikler'de jeton için oyna.",
      title: "Frikikler",
      intro: "Her doğru cevap kalede bir bölge açar. Sonra öne çık ve jeton için şutunu kullan.",
      howToPlay: ["Bir tura başlamak için jeton yatır.", "Bölgeleri açmak için soruları yanıtla.", "Şut çek; ne kadar çok açık bölge, o kadar iyi şans."],
      reward: "Gole dönüşen her şutta jeton kazan.",
    },
    ru: {
      metaTitle: "Штрафные удары: пробей легендарные штрафные",
      metaDescription: "Отвечай на футбольные вопросы, чтобы открыть зоны ворот, а затем пробей штрафной. Играй в «Штрафные удары» в QuizBall.",
      title: "Штрафные удары: пробей легендарные штрафные",
      intro: "Каждый правильный ответ открывает зону ворот. Затем выходи на удар и получай монеты за гол.",
      howToPlay: ["Потрать монеты, чтобы начать раунд.", "Отвечай на вопросы и открывай зоны ворот.", "Бей по воротам: чем больше открытых зон, тем выше шанс забить."],
      reward: "Получай монеты за каждый забитый штрафной.",
    },
  }),
  mode("road-to-goal", "/road-to-goal", "mini-road-to-goal", {
    en: {
      metaTitle: "Road to Goal — Advance the Ball with Football Knowledge",
      metaDescription: "Move the ball up the pitch one correct answer at a time, cash out or push for the goal. Play Road to Goal for coins.",
      title: "Road to Goal",
      intro: "Start in your own half. Each correct answer moves the ball forward; each step raises the payout. Cash out or go for the goal.",
      howToPlay: ["Stake coins and kick off.", "Answer to advance zone by zone.", "Cash out anytime or score for the top multiplier."],
      reward: "Win coins with every step forward.",
    },
    ka: {
      metaTitle: "გზა კარისკენ — წაიყვანე ბურთი ცოდნით",
      metaDescription: "ბურთი წინ ერთი სწორი პასუხით მიდის, აიღე მოგება ან იბრძოლე გოლისთვის. ითამაშე მონეტებზე.",
      title: "გზა კარისკენ",
      intro: "იწყებ საკუთარ ნახევარზე. ყოველი სწორი პასუხი ბურთს წინ წევს; ყოველი ნაბიჯი ზრდის მოგებას. აიღე ან იბრძოლე გოლისთვის.",
      howToPlay: ["დადე მონეტები და დაიწყე.", "უპასუხე, რომ ზონა-ზონა წინ წახვიდე.", "აიღე მოგება ნებისმიერ დროს ან გაიტანე გოლი მაქსიმალური კოეფიციენტისთვის."],
      reward: "მოიგე მონეტები ყოველ წინ ნაბიჯზე.",
    },
    es: {
      metaTitle: "Camino al gol — Avanza el balón con conocimiento",
      metaDescription: "Mueve el balón campo arriba con cada acierto, retira o ve a por el gol. Juega Camino al gol por monedas.",
      title: "Camino al gol",
      intro: "Empiezas en tu campo. Cada acierto avanza el balón; cada paso sube el premio. Retira o ve a por el gol.",
      howToPlay: ["Apuesta monedas y saca.", "Responde para avanzar zona a zona.", "Retira cuando quieras o marca para el multiplicador máximo."],
      reward: "Gana monedas con cada paso adelante.",
    },
    tr: {
      metaTitle: "Gole Giden Yol — Futbol Bilgisiyle Topu İlerlet",
      metaDescription: "Her doğru cevapla topu sahada ilerlet, parayı çek ya da gole git. Gole Giden Yol'u jeton için oyna.",
      title: "Gole Giden Yol",
      intro: "Kendi yarı sahanda başla. Her doğru cevap topu ileri taşır; her adım ödemeyi yükseltir. Parayı çek ya da gole git.",
      howToPlay: ["Jeton yatır ve başlama vuruşunu yap.", "Bölge bölge ilerlemek için cevapla.", "İstediğin zaman parayı çek ya da en yüksek çarpan için gol at."],
      reward: "İleriye attığın her adımda jeton kazan.",
    },
    ru: {
      metaTitle: "Дорога к голу: отвечай и забивай",
      metaDescription: "Продвигай мяч по полю каждым правильным ответом, забирай монеты или продолжай путь к голу. Играй в «Дорогу к голу» в QuizBall.",
      title: "Дорога к голу: отвечай и забивай",
      intro: "Начни на своей половине поля. Каждый правильный ответ продвигает мяч вперёд и увеличивает награду. Забери монеты или продолжай путь к голу.",
      howToPlay: ["Используй монеты и начинай игру.", "Отвечай на вопросы и продвигайся от зоны к зоне.", "Забери монеты в любой момент или забей гол, чтобы получить наибольший множитель."],
      reward: "Получай монеты за каждый шаг вперёд.",
    },
  }),
  mode("guess-the-goal", "/guess-the-goal", "mini-guess-the-goal", {
    en: {
      metaTitle: "Guess the Goal — Name the Famous Goal from the Tactics Board",
      metaDescription: "A legendary goal replays on a coaching board: passes, runs and the finish. Name the goal, then watch the real clip. Five goals a day, free to play.",
      title: "Guess the Goal",
      intro: "A famous goal replays on a coaching board, move by move, with the names hidden. Read the passes and the runs, then pick which goal it is before the finish gives it away.",
      howToPlay: ["Watch the move build on the board.", "Pick the goal from four options.", "See the real clip, then answer the bonus question.", "Five goals a day."],
      reward: "Play free without an account; sign in to earn coins and XP for every goal you name first time.",
    },
    ka: {
      metaTitle: "გამოიცანი გოლი — ცნობილი გოლი სამწვრთნელო დაფაზე",
      metaDescription: "ლეგენდარული გოლი სამწვრთნელო დაფაზე მეორდება: პასები, გარღვევები და დარტყმა. გამოიცანი გოლი და უყურე ნამდვილ ვიდეოს. ხუთი გოლი დღეში, უფასოდ.",
      title: "გამოიცანი გოლი",
      intro: "ცნობილი გოლი სამწვრთნელო დაფაზე სვლა-სვლა მეორდება, სახელების გარეშე. წაიკითხე პასები და გარღვევები და აირჩიე, რომელი გოლია, სანამ დარტყმა გასცემს.",
      howToPlay: ["უყურე, როგორ იწყობა შეტევა დაფაზე.", "აირჩიე გოლი ოთხი ვარიანტიდან.", "ნახე ნამდვილი ვიდეო და უპასუხე ბონუს კითხვას.", "ხუთი გოლი დღეში."],
      reward: "ითამაშე უფასოდ ანგარიშის გარეშე; შედი ანგარიშზე, რომ ყოველ პირველად გამოცნობილ გოლზე ქოინები და XP მიიღო.",
    },
    es: {
      metaTitle: "Adivina el gol — El gol famoso en la pizarra táctica",
      metaDescription: "Un gol legendario se repite en una pizarra táctica: pases, desmarques y el remate. Adivina el gol y mira el clip real. Cinco goles al día, gratis.",
      title: "Adivina el gol",
      intro: "Un gol famoso se repite jugada a jugada en una pizarra táctica, sin nombres. Lee los pases y los desmarques y elige qué gol es antes de que el remate lo delate.",
      howToPlay: ["Mira cómo se arma la jugada en la pizarra.", "Elige el gol entre cuatro opciones.", "Mira el clip real y responde la pregunta extra.", "Cinco goles al día."],
      reward: "Juega gratis sin cuenta; inicia sesión para ganar monedas y XP por cada gol que aciertes por primera vez.",
    },
    tr: {
      metaTitle: "Golü Tahmin Et — Taktik Tahtasındaki Ünlü Golü Bil",
      metaDescription: "Efsane bir gol taktik tahtasında yeniden oynanıyor: paslar, koşular ve bitiriş. Golü bil, sonra gerçek klibi izle. Günde beş gol, ücretsiz.",
      title: "Golü Tahmin Et",
      intro: "Ünlü bir gol, isimler gizli olarak taktik tahtasında hamle hamle yeniden oynanır. Pasları ve koşuları oku, bitiriş ele vermeden hangi gol olduğunu seç.",
      howToPlay: ["Atağın tahtada nasıl kurulduğunu izle.", "Dört seçenek arasından golü seç.", "Gerçek klibi izle ve bonus soruyu cevapla.", "Günde beş gol."],
      reward: "Hesapsız ücretsiz oyna; ilk kez bildiğin her gol için coin ve XP kazanmak üzere giriş yap.",
    },
    ru: {
      metaTitle: "Угадай гол: узнай легендарный гол по тактической доске",
      metaDescription: "Легендарный гол разыгрывается на тактической доске: передачи, рывки и удар. Угадай гол, а потом посмотри настоящее видео. Пять голов в день, бесплатно.",
      title: "Угадай гол",
      intro: "Знаменитый гол разыгрывается на тренерской доске ход за ходом, имена скрыты. Следи за передачами и рывками и выбери, что это за гол, пока удар его не выдал.",
      howToPlay: ["Смотри, как атака складывается на доске.", "Выбери гол из четырёх вариантов.", "Посмотри настоящее видео и ответь на бонусный вопрос.", "Пять голов в день."],
      reward: "Играй бесплатно без аккаунта; войди, чтобы получать монеты и XP за каждый гол, угаданный впервые.",
    },
  }),
  mode("football-minesweeper", "/buscaminas", "buscaminas", {
    en: {
      metaTitle: "Football Minesweeper — Find the 12, Dodge the 4 Mines | QuizBall",
      metaDescription: "A daily football minesweeper: 20 rounds of 16 players. Tap the 12 who fit the clue and avoid the 4 mines. A new board every day.",
      title: "Football Minesweeper",
      intro: "Each round shows 16 footballers and one clue. Twelve fit it, four are mines. Find the right ones, bank your hits before you step on a mine, and survive 20 rounds that get harder as you go.",
      howToPlay: ["Read the clue: a club season, a final's matchday squad, a birthplace…", "Tap the players who fit. Each hit adds a point to the round's pot.", "Hit a mine and you lose that round's points. Bank whenever you like to keep them.", "Find all 12 for a perfect round and a +3 bonus. Share your 20 squares."],
      reward: "Play yesterday's board without an account; sign in to play today's board, keep your streak and get on the daily leaderboard.",
    },
    ka: {
      metaTitle: "საფეხბურთო მაღაროები — იპოვე 12, აარიდე 4 მაღაროს | QuizBall",
      metaDescription: "ყოველდღიური საფეხბურთო მაღაროების მძებნელი: 20 რაუნდი, 16 მოთამაშე. მონიშნე 12, ვინც პირობას აკმაყოფილებს, და აარიდე 4 მაღაროს. ყოველდღე ახალი დაფა.",
      title: "საფეხბურთო მაღაროები",
      intro: "ყოველ რაუნდში 16 ფეხბურთელი და ერთი პირობაა. თორმეტი შეესაბამება, ოთხი მაღაროა. იპოვე სწორები, შეინახე ქულები მაღაროზე დაბიჯებამდე და გაიარე 20 რაუნდი.",
      howToPlay: ["წაიკითხე პირობა: კლუბის სეზონი, ფინალის შემადგენლობა, დაბადების ადგილი…", "დააჭირე მოთამაშეებს, ვინც შეესაბამება. ყოველი სწორი რაუნდის ბანკს ქულას უმატებს.", "მაღარო რაუნდის ქულებს გაკარგვინებს. შეინახე ნებისმიერ დროს.", "იპოვე 12-ვე — სრულყოფილი რაუნდი და +3 ბონუსი."],
      reward: "გუშინდელი დაფა ანგარიშის გარეშე ითამაშე; დღევანდელისთვის, სერიისა და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Buscaminas futbolero — Encontrá a los 12 y esquivá las 4 minas | QuizBall",
      metaDescription: "El buscaminas futbolero de jugadores (buscaminas de fútbol): 20 rondas de 16 futbolistas. Tocá a los 12 que cumplen la consigna y esquivá las 4 minas. Un tablero nuevo cada día.",
      title: "Buscaminas futbolero",
      intro: "Cada ronda muestra 16 futbolistas y una consigna. Doce la cumplen y cuatro son minas. Encontrá a los correctos, plantate antes de pisar una mina y sobreviví 20 rondas que se ponen cada vez más difíciles.",
      howToPlay: ["Leé la consigna: una temporada de un club, la planilla de una final, dónde nacieron…", "Tocá a los jugadores que la cumplen. Cada acierto suma un punto al pozo de la ronda.", "Si tocás una mina perdés los puntos de esa ronda. Plantate cuando quieras para guardarlos.", "Encontrá a los 12 para una ronda perfecta con +3 de bonus. Compartí tus 20 cuadraditos."],
      reward: "Sin cuenta jugás el tablero de ayer; con tu cuenta, el de hoy, tu racha y el ranking del día.",
    },
    tr: {
      metaTitle: "Futbol Mayın Tarlası — 12'yi Bul, 4 Mayından Kaç | QuizBall",
      metaDescription: "Günlük futbol mayın tarlası: 16 oyunculu 20 tur. İpucuna uyan 12 oyuncuyu seç, 4 mayından kaç. Giderek zorlaşan turlar, her gün yeni tahta.",
      title: "Futbol Mayın Tarlası",
      intro: "Her turda 16 futbolcu ve bir ipucu var. On ikisi uyar, dördü mayındır. Doğruları bul, mayına basmadan puanlarını kasaya al ve giderek zorlaşan 20 turu tamamla.",
      howToPlay: ["İpucunu oku: bir kulüp sezonu, bir finalin maç kadrosu, doğum yeri…", "Uyan oyunculara dokun. Her isabet turun kasasına bir puan ekler.", "Mayına basarsan o turun puanlarını kaybedersin. İstediğin an kasaya al.", "12'sini de bul: mükemmel tur ve +3 bonus."],
      reward: "Dünün tahtasını hesapsız oyna; bugünün tahtası, seri ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Футбольный сапёр: найди 12 из 16 | QuizBall",
      metaDescription: "Ежедневная игра «сапер» про футбол: 20 раундов по 16 игроков. Найди 12 подходящих по подсказке и обойди 4 мины. Каждый день — новое поле.",
      title: "Футбольный сапёр",
      intro: "В каждом раунде — 16 футболистов и одна подсказка. Двенадцать подходят, четверо — мины. Выбирай верных, забирай очки до того, как попадёшь на мину, и пройди 20 раундов, которые становятся всё сложнее.",
      howToPlay: ["Прочитай подсказку: сезон клуба, состав на финал, место рождения…", "Выбирай подходящих игроков. Каждое попадание добавляет очко в копилку раунда.", "Попадёшь на мину — потеряешь очки за раунд. Забирай их в любой момент.", "Найди всех 12 для идеального раунда и бонуса +3. Поделись результатом из 20 клеток."],
      reward: "Играй в поле за вчера без аккаунта; войди, чтобы сыграть в сегодняшнее, сохранить серию и попасть в ежедневный рейтинг.",
    },
  }),
  mode("football-clues", "/pistas", "pistas", {
    en: {
      metaTitle: "Guess the Footballer from 10 Clues — Football Clues | QuizBall",
      metaDescription: "A daily football clues game: 10 hidden players, 10 clues each. Guess on the first clue for 10 points, or play 1v1 against a friend online.",
      title: "Football Clues",
      intro: "One hidden footballer and ten clues that go from hardest to easiest. Reveal them one at a time, type the surname when you know it and score up to 10 points per player. Ten new players every day.",
      howToPlay: ["The first clue is free: nationality, position, a vague fact…", "Reveal clues one at a time. Every clue you open lowers the points in play from 10 to 1.", "Type the surname (accents don't matter). A wrong guess leaves you one more try and at most three more clues.", "Ten players a day, 100 points maximum. Share your ten squares."],
      reward: "Play past days without an account; sign in for today's clues, your streak and the daily leaderboard.",
    },
    ka: {
      metaTitle: "საფეხბურთო მინიშნებები — გამოიცანი მოთამაშე 10 მინიშნებით | QuizBall",
      metaDescription: "ყოველდღიური საფეხბურთო თამაში: 10 დამალული მოთამაშე, თითოეულს 10 მინიშნება რთულიდან მარტივისკენ. პირველივე მინიშნებით გამოცნობა 10 ქულაა.",
      title: "საფეხბურთო მინიშნებები",
      intro: "ერთი დამალული ფეხბურთელი და ათი მინიშნება — რთულიდან მარტივისკენ. გახსენი სათითაოდ, ჩაწერე გვარი, როცა მიხვდები, და მიიღე 10 ქულამდე თითო მოთამაშეზე.",
      howToPlay: ["პირველი მინიშნება უფასოა.", "ყოველი გახსნილი მინიშნება ქულას 10-დან 1-მდე ამცირებს.", "ჩაწერე გვარი. შეცდომის შემდეგ გაქვს კიდევ 1 მცდელობა და მაქსიმუმ 3 მინიშნება.", "დღეში ათი მოთამაშე, მაქსიმუმ 100 ქულა."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელისთვის, სერიისა და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Pistas futboleras — Adiviná el jugador con 10 pistas | QuizBall",
      metaDescription: "Pistas futboleras online: 10 jugadores por día con 10 pistas cada uno. Adiviná con la primera y ganás 10 puntos, o jugá 1 vs 1 contra un amigo.",
      title: "Pistas futboleras",
      intro: "Un futbolista oculto y diez pistas que van de lo más difícil a lo más fácil. Pedí las pistas de a una, escribí el apellido cuando lo tengas y sumá hasta 10 puntos por jugador. Diez jugadores nuevos cada día.",
      howToPlay: ["La primera pista es gratis: de dónde es, en qué puesto juega, un dato vago…", "Revelá pistas de a una. Cada pista que abrís baja los puntos en juego de 10 a 1.", "Escribí el apellido (las tildes no importan). Si le errás, tenés un intento más y como máximo tres pistas.", "Diez jugadores por día, 100 puntos como máximo. Compartí tus diez cuadraditos."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, las pistas de hoy, tu racha y el ranking del día.",
    },
    tr: {
      metaTitle: "Futbolcu Tahmin Etme Oyunu — 10 İpucuyla Oyuncuyu Bil | QuizBall",
      metaDescription: "Günlük futbol ipucu oyunu: her gün 10 gizli oyuncu, her birine zordan kolaya 10 ipucu. İlk ipucunda bilirsen 10 puan.",
      title: "Futbolcu Tahmin Etme Oyunu",
      intro: "Gizli bir futbolcu ve zordan kolaya giden on ipucu. İpuçlarını tek tek aç, bildiğinde soyadını yaz ve oyuncu başına 10 puana kadar kazan.",
      howToPlay: ["İlk ipucu bedava.", "Açtığın her ipucu oyundaki puanı 10'dan 1'e düşürür.", "Soyadını yaz. Yanlış tahminden sonra 1 hakkın ve en fazla 3 ipucun kalır.", "Günde on oyuncu, en fazla 100 puan."],
      reward: "Önceki günleri hesapsız oyna; bugünün ipuçları, seri ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Угадай футболиста по подсказкам | QuizBall",
      metaDescription: "Ежедневная игра с футбольными подсказками: 10 загаданных игроков, по 10 подсказок на каждого. Угадай с первой подсказки и получи 10 очков или сыграй 1 на 1 с другом.",
      title: "Угадай футболиста по подсказкам",
      intro: "Загаданный футболист и десять подсказок — от самой сложной к самой простой. Открывай их по одной, когда догадаешься, вводи фамилию и набирай до 10 очков за игрока. Каждый день — десять новых футболистов.",
      howToPlay: ["Первая подсказка бесплатная: гражданство, позиция, общий факт…", "Открывай подсказки по одной. Каждая открытая подсказка снижает возможные очки с 10 до 1.", "Введи фамилию — ударения не важны. Если ошибёшься, останется ещё одна попытка и не больше трёх подсказок.", "Десять игроков в день, максимум — 100 очков. Поделись результатом из десяти клеток."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы получить сегодняшние подсказки, сохранить серию и попасть в ежедневный рейтинг.",
    },
  }),
  mode("guess-the-goal-minute", "/minuto", "minuto", {
    en: {
      metaTitle: "Guess the Minute of the Goal — What Minute? Football Quiz | QuizBall",
      metaDescription: "An online football game: 10 famous goals a day from the World Cup, the Champions League and the Copa América. Guess the minute each goal went in: the exact minute scores 3 points. Play alone or 1v1 with a friend.",
      title: "Guess the Minute of the Goal",
      intro: "A famous goal, the match and the scorer: you say the minute. Ten goals a day from World Cup finals, Champions League nights and Copa América classics. The exact minute is worth 3 points, a near miss still scores, and you can challenge a friend to a 1v1 duel where the closest guess wins the goal.",
      howToPlay: ["Read the card: the match, the final score, the stage and who scored.", "Type the minute you think the goal went in. Added time counts on: 90+3 is minute 93.", "Exact minute: 3 points. Within 2 minutes: 2. Within 5: 1.", "Ten goals a day, 30 points at most. Share your ten squares or duel a friend 1v1."],
      reward: "Play past days without an account; sign in for today's goals, your streak and the daily leaderboard.",
    },
    ka: {
      metaTitle: "გამოიცანი გოლის წუთი — რომელ წუთზე? საფეხბურთო ქვიზი | QuizBall",
      metaDescription: "ონლაინ საფეხბურთო თამაში: დღეში 10 ცნობილი გოლი მსოფლიო ჩემპიონატიდან, ჩემპიონთა ლიგიდან და კოპა ამერიკიდან. გამოიცანი, რომელ წუთზე გავიდა თითოეული. ითამაშე მეგობართანაც.",
      title: "გამოიცანი გოლის წუთი",
      intro: "ცნობილი გოლი, მატჩი და ავტორი: შენ ასახელებ წუთს. დღეში ათი გოლი მსოფლიო ჩემპიონატის ფინალებიდან, ჩემპიონთა ლიგიდან და კოპა ამერიკიდან. ზუსტი წუთი 3 ქულაა, ახლოს მოხვედრაც ითვლება, ხოლო მეგობართან დუელში უახლოესი პასუხი იგებს გოლს.",
      howToPlay: ["წაიკითხე ბარათი: მატჩი, საბოლოო ანგარიში, ეტაპი და გოლის ავტორი.", "ჩაწერე წუთი, როცა გოლი გავიდა. დამატებითი დრო ემატება: 90+3 არის 93-ე წუთი.", "ზუსტი წუთი: 3 ქულა. 2 წუთის სიზუსტით: 2. 5 წუთის სიზუსტით: 1.", "დღეში ათი გოლი, მაქსიმუმ 30 ქულა. გააზიარე შედეგი ან გამოიწვიე მეგობარი."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელისთვის, სერიისა და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Adivina el minuto exacto del gol — ¿En qué minuto? futbolero | QuizBall",
      metaDescription: "Juego online de fútbol: 10 goles famosos por día del Mundial, la Champions y la Copa América. Adiviná en qué minuto entró cada gol: el minuto exacto vale 3 puntos. Jugá solo o 1 vs 1 con un amigo.",
      title: "Adivina el minuto exacto del gol",
      intro: "¿En qué minuto? Un gol famoso, el partido y el goleador: vos decís el minuto. Diez goles por día de finales del Mundial, noches de Champions y clásicos de la Copa América. El minuto exacto vale 3 puntos, quedar cerca también suma, y podés desafiar a un amigo a un duelo 1 vs 1 donde el que más se acerca se lleva el gol.",
      howToPlay: ["Mirá la tarjeta: el partido, el resultado final, la instancia y quién hizo el gol.", "Escribí el minuto en que creés que entró. El tiempo añadido se suma: 90+3 es el minuto 93.", "Minuto exacto: 3 puntos. A 2 minutos o menos: 2. A 5 o menos: 1.", "Diez goles por día, 30 puntos como máximo. Compartí tus diez cuadraditos o jugá 1 vs 1 con un amigo."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, los goles de hoy, tu racha y el ranking del día.",
    },
    tr: {
      metaTitle: "Gol Dakikası Tahmin Oyunu — Kaçıncı Dakika? | QuizBall",
      metaDescription: "Online futbol oyunu: her gün Dünya Kupası, Şampiyonlar Ligi ve Copa América'dan 10 ünlü gol. Her golün kaçıncı dakikada atıldığını tahmin et: tam dakika 3 puan. Tek başına ya da bir arkadaşınla 1'e 1 oyna.",
      title: "Gol Dakikası Tahmin Oyunu",
      intro: "Ünlü bir gol, maç ve golü atan: dakikayı sen söylersin. Her gün Dünya Kupası finallerinden, Şampiyonlar Ligi gecelerinden ve Copa América klasiklerinden on gol. Tam dakika 3 puan, yakın tahmin de puan getirir; bir arkadaşınla 1'e 1 düelloda en yakın tahmin golü kazanır.",
      howToPlay: ["Kartı oku: maç, final skoru, tur ve golü atan.", "Golün atıldığını düşündüğün dakikayı yaz. Uzatma eklenir: 90+3, 93. dakikadır.", "Tam dakika: 3 puan. En fazla 2 dakika fark: 2. En fazla 5 dakika fark: 1.", "Günde on gol, en fazla 30 puan. Sonucunu paylaş ya da bir arkadaşınla 1'e 1 oyna."],
      reward: "Önceki günleri hesapsız oyna; bugünün golleri, seri ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "На какой минуте забит гол? Угадай минуту | QuizBall",
      metaDescription: "Онлайн-игра про футбол: каждый день — 10 знаменитых голов с чемпионата мира, из Лиги чемпионов и Кубка Америки. Угадай минуту каждого гола: точный ответ принесёт 3 очка. Играй один или 1 на 1 с другом.",
      title: "На какой минуте забит гол? Угадай минуту",
      intro: "Знаменитый гол, матч и автор — угадай минуту. Каждый день — десять голов из финалов чемпионата мира, матчей Лиги чемпионов и классических игр Кубка Америки. Точный ответ стоит 3 очка, близкий тоже принесёт очки. А ещё можно вызвать друга на дуэль 1 на 1: гол достанется тому, чей ответ ближе.",
      howToPlay: ["Прочитай карточку: матч, итоговый счёт, этап и автор гола.", "Введи минуту, на которой, как тебе кажется, забили гол. Добавленное время учитывается: 90+3 — это 93-я минута.", "Точная минута: 3 очка. Разница до 2 минут: 2. До 5 минут: 1.", "Десять голов в день, максимум — 30 очков. Поделись результатом из десяти клеток или сыграй с другом 1 на 1."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы увидеть сегодняшние голы, сохранить серию и попасть в ежедневный рейтинг.",
    },
  }),
  mode("last-answer-standing", "/ultimo", "ultimo", {
    en: {
      metaTitle: "Last Answer Standing — Name Every Answer Before the Clock Runs Out | QuizBall",
      metaDescription: "A daily football list game: 5 categories with closed lists, like a World Cup squad or Libertadores champions. Name answers as the clock shrinks from 20 to 6 seconds, or duel a friend 1v1.",
      title: "Last Answer Standing",
      intro: "Every day brings five football categories with a closed list: a World Cup squad, the Copa Libertadores champions, a club's top scorers. Name the answers one after another while the clock gets shorter with each one, from 20 seconds down to 6. Three misses in a row or a timeout ends the category.",
      howToPlay: ["Read the category: the list is closed, so every answer is either right or wrong.", "Name answers one after another. The clock starts at 20 seconds and shrinks with every answer, down to 6.", "Three misses in a row or a timeout ends the category. Each answer scores 1 point.", "Name the whole list for a +5 bonus. Share your five squares."],
      reward: "Play past days without an account; sign in for today's categories, your streak and the daily leaderboard.",
    },
    ka: {
      metaTitle: "ბოლომდე დარჩენილი — დაასახელე პასუხები, სანამ დრო ამოიწურება | QuizBall",
      metaDescription: "ყოველდღიური საფეხბურთო თამაში: 5 კატეგორია დახურული სიით, მაგალითად მსოფლიო ჩემპიონატის შემადგენლობა. დრო 20-დან 6 წამამდე მცირდება. ითამაშე მეგობართანაც.",
      title: "ბოლომდე დარჩენილი",
      intro: "ყოველდღე ხუთი საფეხბურთო კატეგორიაა დახურული სიით: მსოფლიო ჩემპიონატის შემადგენლობა, ლიბერტადორესის ჩემპიონები, კლუბის ბომბარდირები. დაასახელე პასუხები ერთმანეთის მიყოლებით, ხოლო დრო ყოველ პასუხზე მცირდება — 20 წამიდან 6-მდე. სამი შეცდომა ზედიზედ ან დროის ამოწურვა კატეგორიას ამთავრებს.",
      howToPlay: ["წაიკითხე კატეგორია: სია დახურულია, ამიტომ ყოველი პასუხი ან სწორია, ან არა.", "დაასახელე პასუხები სათითაოდ. საათი 20 წამით იწყება და ყოველ პასუხზე მცირდება, 6 წამამდე.", "სამი შეცდომა ზედიზედ ან დროის ამოწურვა კატეგორიას ამთავრებს. ყოველი პასუხი 1 ქულაა.", "მთელი სიის დასახელება +5 ბონუსს გაძლევს. გააზიარე შენი ხუთი კვადრატი."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელისთვის, სერიისა და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Último en pie futbolero — Nombrá todas las respuestas | QuizBall",
      metaDescription: "5 categorías por día con listas cerradas: un plantel mundialista, los campeones de la Libertadores. Nombrá respuestas con el reloj cada vez más corto, o jugá 1 vs 1 con un amigo.",
      title: "Último en pie futbolero",
      intro: "Cada día llegan cinco categorías futboleras con lista cerrada: un plantel mundialista, los campeones de la Libertadores, los goleadores de un club. Nombrá las respuestas una tras otra mientras el reloj se acorta con cada acierto, de 20 segundos a 6. Tres errores seguidos o el reloj en cero y se termina la categoría.",
      howToPlay: ["Leé la categoría: la lista es cerrada, así que cada respuesta está bien o está mal.", "Nombrá respuestas una tras otra. El reloj arranca en 20 segundos y se acorta con cada acierto, hasta 6.", "Tres errores seguidos o el reloj en cero terminan la categoría. Cada respuesta suma 1 punto.", "Nombrá la lista completa y te llevás +5 de bonus. Compartí tus cinco cuadraditos."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, las categorías de hoy, tu racha y el ranking del día.",
    },
    tr: {
      metaTitle: "Futbolcu Sayma Oyunu — Süre Bitmeden Listeyi Say | QuizBall",
      metaDescription: "Günlük futbol liste oyunu: her gün kapalı listeli 5 kategori, örneğin bir Dünya Kupası kadrosu. Süre 20 saniyeden 6'ya kısalırken cevapları say ya da bir arkadaşınla 1'e 1 oyna.",
      title: "Futbolcu Sayma Oyunu",
      intro: "Her gün kapalı listeli beş futbol kategorisi gelir: bir Dünya Kupası kadrosu, Libertadores şampiyonları, bir kulübün en çok gol atanları. Cevapları art arda say; süre her cevapla kısalır, 20 saniyeden 6'ya iner. Üst üste üç yanlış ya da süre bitince kategori sona erer.",
      howToPlay: ["Kategoriyi oku: liste kapalıdır, yani her cevap ya doğrudur ya yanlış.", "Cevapları art arda say. Süre 20 saniyeyle başlar ve her cevapla kısalır, 6 saniyeye kadar.", "Üst üste üç yanlış ya da süre bitince kategori sona erer. Her cevap 1 puan.", "Listenin tamamını say, +5 bonus kazan. Beş karelik sonucunu paylaş."],
      reward: "Önceki günleri hesapsız oyna; bugünün kategorileri, seri ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Кто больше назовёт футболистов | QuizBall",
      metaDescription: "Ежедневная футбольная игра со списками: 5 категорий с закрытыми списками, например состав чемпионата мира или победители Кубка Либертадорес. Называй игроков, пока таймер сокращается с 20 до 6 секунд, или сыграй 1 на 1 с другом.",
      title: "Кто больше назовёт футболистов",
      intro: "Каждый день — пять футбольных категорий с закрытыми списками: состав чемпионата мира, победители Кубка Либертадорес, лучшие бомбардиры клуба. Называй игроков одного за другим, пока таймер с каждым ответом сокращается с 20 до 6 секунд. Три ошибки подряд или истёкшее время завершат категорию.",
      howToPlay: ["Прочитай категорию: список закрытый, поэтому каждый ответ либо верный, либо неверный.", "Называй игроков одного за другим. Таймер начинается с 20 секунд и сокращается с каждым ответом — до 6.", "Три ошибки подряд или истёкшее время завершат категорию. Каждый ответ приносит 1 очко.", "Назови весь список и получи бонус +5. Поделись результатом из пяти клеток."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы получить сегодняшние категории, сохранить серию и попасть в ежедневный рейтинг.",
    },
  }),
  mode("played-for-both-clubs", "/ortak-futbolcu", "shared-player", {
    en: {
      metaTitle: "Played for Both — Name a Footballer Who Played for Both Clubs | QuizBall",
      metaDescription: "A daily football game: two clubs appear and you have 20 seconds to name a player who played for both. 10 pairs a day, or race up to 5 friends online in a room.",
      title: "Played for Both",
      intro: "Two clubs appear on screen: Arsenal and Barcelona, Milan and Inter, Galatasaray and Fenerbahçe. You have 20 seconds to type a footballer who played for both. Ten pairs every day, a point for each one you find, and a daily leaderboard for the fastest.",
      howToPlay: ["Two club crests are revealed at the same moment.", "Type any footballer who played for both clubs. The surname is enough, and small typos are forgiven.", "You have 20 seconds per pair. A wrong answer blocks you for 1 second, so guessing wildly does not pay.", "Find a pair for 1 point. With equal scores, the faster player ranks higher. Share your result or challenge your friends in a room."],
      reward: "Play past days without an account; sign in for today's ten pairs and the daily leaderboard.",
    },
    ka: {
      metaTitle: "საერთო ფეხბურთელი — დაასახელე ფეხბურთელი, რომელმაც ორივე კლუბში ითამაშა | QuizBall",
      metaDescription: "ყოველდღიური საფეხბურთო თამაში: ჩნდება ორი კლუბი და 20 წამში უნდა დაასახელო ფეხბურთელი, რომელმაც ორივეში ითამაშა. დღეში 10 წყვილი, ან ითამაშე მეგობრებთან ოთახში.",
      title: "საერთო ფეხბურთელი",
      intro: "ეკრანზე ორი კლუბი ჩნდება: არსენალი და ბარსელონა, მილანი და ინტერი, გალათასარაი და ფენერბაჰჩე. 20 წამი გაქვს, რომ დაწერო ფეხბურთელი, რომელმაც ორივეში ითამაშა. ყოველდღე ათი წყვილი, ყოველ ნაპოვნზე ერთი ქულა და დღის რეიტინგი ყველაზე სწრაფებისთვის.",
      howToPlay: ["ორი კლუბის ემბლემა ერთდროულად ჩნდება.", "დაწერე ნებისმიერი ფეხბურთელი, რომელმაც ორივე კლუბში ითამაშა. გვარიც საკმარისია, მცირე შეცდომები გეპატიება.", "თითო წყვილზე 20 წამი გაქვს. არასწორი პასუხი 1 წამით გაჩერებს.", "ნაპოვნი წყვილი 1 ქულაა. თანაბარი ქულებისას უფრო სწრაფი მაღლა დგას. გააზიარე შედეგი ან გამოიწვიე მეგობრები ოთახში."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი ათი წყვილისთვის და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Jugador en común — Nombrá un futbolista que jugó en los dos clubes | QuizBall",
      metaDescription: "Juego diario de fútbol: aparecen dos clubes y tenés 20 segundos para nombrar a un jugador que pasó por los dos. 10 pares por día, o competí con hasta 5 amigos en una sala.",
      title: "Jugador en común",
      intro: "Aparecen dos clubes en pantalla: Boca y River, Real Madrid y Barcelona, América y Chivas. Tenés 20 segundos para escribir un futbolista que jugó en los dos. Diez pares cada día, un punto por cada uno que encontrás y un ranking diario para los más rápidos.",
      howToPlay: ["Los dos escudos aparecen al mismo tiempo.", "Escribí cualquier futbolista que jugó en los dos clubes. Alcanza con el apellido y se perdonan errores de tipeo.", "Tenés 20 segundos por par. Una respuesta incorrecta te frena 1 segundo, así que tirar nombres al azar no sirve.", "Cada par encontrado vale 1 punto. Con el mismo puntaje, el más rápido queda arriba. Compartí tu resultado o desafiá a tus amigos en una sala."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, los diez pares de hoy y el ranking del día.",
    },
    tr: {
      metaTitle: "Ortak Futbolcu Bulma Oyunu — İki Takımda da Oynayan Futbolcuyu Bul | QuizBall",
      metaDescription: "Günlük futbol oyunu: iki kulüp gösterilir ve ikisinde de oynamış bir futbolcuyu yazmak için 20 saniyen var. Günde 10 eşleşme; ya da arkadaşlarınla odada yarış.",
      title: "Ortak Futbolcu Bulma Oyunu",
      intro: "Ekrana iki kulüp gelir: Galatasaray ve Fenerbahçe, Beşiktaş ve Trabzonspor, Real Madrid ve Barcelona. İkisinde de oynamış bir futbolcuyu yazmak için 20 saniyen var. Her gün on eşleşme, bulduğun her biri için bir puan ve en hızlılar için günlük sıralama.",
      howToPlay: ["İki kulübün arması aynı anda açılır.", "İkisinde de oynamış herhangi bir futbolcuyu yaz. Soyadı yeterli; küçük yazım hataları kabul edilir.", "Her eşleşme için 20 saniyen var. Yanlış cevap seni 1 saniye bekletir, yani rastgele isim yazmak işe yaramaz.", "Bulduğun her eşleşme 1 puan. Puanlar eşitse hızlı olan üstte yer alır. Sonucunu paylaş ya da arkadaşlarını odada yarışa çağır."],
      reward: "Önceki günleri hesapsız oyna; bugünün on eşleşmesi ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Футболисты, игравшие за оба клуба | QuizBall",
      metaDescription: "Ежедневная футбольная игра: появляются два клуба, и за 20 секунд нужно назвать футболиста, игравшего за оба. 10 пар в день или гонка с друзьями в комнате.",
      title: "Футболисты, игравшие за оба клуба",
      intro: "На экране появляются два клуба: «Арсенал» и «Барселона», «Милан» и «Интер», «Галатасарай» и «Фенербахче». За 20 секунд назови футболиста, игравшего за оба. Каждый день — десять пар, очко за каждый верный ответ и ежедневный рейтинг самых быстрых.",
      howToPlay: ["Эмблемы двух клубов появляются одновременно.", "Назови любого футболиста, игравшего за оба клуба. Достаточно фамилии, небольшие опечатки не страшны.", "На каждую пару даётся 20 секунд. Неверный ответ задержит тебя на 1 секунду, так что угадывать наугад невыгодно.", "За каждую найденную пару — 1 очко. При равном счёте выше тот, кто ответил быстрее. Поделись результатом или позови друзей посоревноваться в комнате."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы пройти сегодняшние десять пар и попасть в ежедневный рейтинг.",
    },
  }),
  mode("football-name-chain", "/son-harfle", "name-chain", {
    en: {
      metaTitle: "Football Name Chain — Last Letter Footballer Game | QuizBall",
      metaDescription: "The football word chain game: name a footballer who starts with the last letter of the previous one. 10 seconds per name, three chains a day, or play with up to 5 friends.",
      title: "Football Name Chain",
      intro: "We give you a footballer; you answer with another one whose name starts with the last letter of his. Kane, then Eto'o, then Ozil, then Lewandowski. You have 10 seconds per name and the clock gets shorter as the chain grows. Three chains a day: how many footballers can you name?",
      howToPlay: ["The game gives you a starting footballer and shows the letter you need.", "Type a footballer whose first name or surname starts with that letter. Anthony Martial counts for A and for M.", "You have 10 seconds per name; every five names the clock gets a second shorter. No footballer can be used twice.", "When the clock runs out the chain ends and a new one starts. Three chains a day; your score is every footballer you named."],
      reward: "Play past days without an account; sign in for today's chains and the daily leaderboard.",
    },
    ka: {
      metaTitle: "ფეხბურთელობანა — ფეხბურთელების ჯაჭვის თამაში | QuizBall",
      metaDescription: "საფეხბურთო სიტყვების ჯაჭვი: დაასახელე ფეხბურთელი, რომლის სახელი წინა ფეხბურთელის ბოლო ასოთი იწყება. თითო სახელზე 10 წამი, დღეში სამი ჯაჭვი, ან ითამაშე მეგობრებთან.",
      title: "ფეხბურთელობანა",
      intro: "ჩვენ გაძლევთ ფეხბურთელს; შენ პასუხობ სხვით, რომლის სახელი მისი სახელის ბოლო ასოთი იწყება. თითო სახელზე 10 წამი გაქვს და ჯაჭვის ზრდასთან ერთად დრო მოკლდება. დღეში სამი ჯაჭვი: რამდენ ფეხბურთელს დაასახელებ?",
      howToPlay: ["თამაში გაძლევს საწყის ფეხბურთელს და გიჩვენებს საჭირო ასოს.", "დაწერე ფეხბურთელი, რომლის სახელი ან გვარი ამ ასოთი იწყება. სახელები ლათინური ასოებით იწერება.", "თითო სახელზე 10 წამი გაქვს; ყოველ ხუთ სახელზე დრო ერთი წამით მოკლდება. ერთი ფეხბურთელი ორჯერ არ ითვლება.", "დროის ამოწურვისას ჯაჭვი მთავრდება და ახალი იწყება. დღეში სამი ჯაჭვი; შენი ქულა ყველა დასახელებული ფეხბურთელია."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი ჯაჭვებისთვის და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Cadena de futbolistas — El juego de la última letra | QuizBall",
      metaDescription: "El juego de palabras encadenadas del fútbol: nombrá un futbolista que empiece con la última letra del anterior. 10 segundos por nombre, tres cadenas por día, o jugá con amigos.",
      title: "Cadena de futbolistas",
      intro: "Te damos un futbolista; vos respondés con otro cuyo nombre empiece con la última letra del suyo. Tenés 10 segundos por nombre y el reloj se acorta a medida que la cadena crece. Tres cadenas por día: ¿cuántos futbolistas podés nombrar?",
      howToPlay: ["El juego te da un futbolista para empezar y te muestra la letra que necesitás.", "Escribí un futbolista cuyo nombre o apellido empiece con esa letra. Anthony Martial sirve para la A y para la M.", "Tenés 10 segundos por nombre; cada cinco nombres el reloj se acorta un segundo. Ningún futbolista vale dos veces.", "Cuando se acaba el reloj termina la cadena y empieza otra. Tres cadenas por día; tu puntaje es cada futbolista que nombraste."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, las cadenas de hoy y el ranking del día.",
    },
    tr: {
      metaTitle: "Son Harfle Futbolcu — Son Harften Futbolcu Bulma Oyunu | QuizBall",
      metaDescription: "Futbolun kelime zinciri oyunu: bir önceki futbolcunun son harfiyle başlayan bir futbolcu yaz. Her isim için 10 saniye, günde üç zincir; ya da arkadaşlarınla oyna.",
      title: "Son Harfle Futbolcu",
      intro: "Biz bir futbolcu veriyoruz; sen, adının son harfiyle başlayan başka bir futbolcuyla cevap veriyorsun. Her isim için 10 saniyen var ve zincir uzadıkça süre kısalır. Günde üç zincir: kaç futbolcu sayabilirsin?",
      howToPlay: ["Oyun başlangıç için bir futbolcu verir ve gereken harfi gösterir.", "Adı ya da soyadı o harfle başlayan bir futbolcu yaz. Anthony Martial hem A hem M için geçerlidir.", "Her isim için 10 saniyen var; her beş isimde süre bir saniye kısalır. Aynı futbolcu iki kez söylenemez.", "Süre bitince zincir biter ve yenisi başlar. Günde üç zincir; puanın saydığın bütün futbolculardır."],
      reward: "Önceki günleri hesapsız oyna; bugünün zincirleri ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Футболисты на последнюю букву: игра в слова | QuizBall",
      metaDescription: "Футбольная игра в слова: назови футболиста на последнюю букву имени предыдущего. 10 секунд на ответ, три цепочки в день или игра с друзьями.",
      title: "Футболисты на последнюю букву: игра в слова",
      intro: "Мы называем футболиста, а ты отвечаешь другим — его имя должно начинаться на последнюю букву имени предыдущего. Как в игре в города: Кейн, затем Неймар, Рамос и Салах. Й, ь, ъ и ы в конце пропускаются: после «Пуйоль» нужна буква Л. На ответ даётся 10 секунд, и время сокращается по мере роста цепочки. Три цепочки в день: сколько футболистов назовёшь?",
      howToPlay: ["Игра называет первого футболиста и показывает нужную букву.", "Назови футболиста, имя или фамилия которого начинается на эту букву. Антони Марсьяль подойдёт и на А, и на М.", "На ответ даётся 10 секунд; после каждых пяти имён времени становится на секунду меньше. Одного футболиста нельзя назвать дважды.", "Когда время закончится, цепочка завершится и начнётся новая. Три цепочки в день; очки начисляются за каждого названного футболиста."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы пройти сегодняшние цепочки и попасть в ежедневный рейтинг.",
    },
  }),
  mode("football-horserace", "/horserace", "football-horserace", {
    en: {
      metaTitle: "Football Horserace — Pick the Stat, Race Your Nation | QuizBall",
      metaDescription: "The Football Horserace game: your nation against three in one tournament. Pick the stats it leads and race to the line. One race a day, or 2 to 4 friends in a room.",
      title: "Football Horserace",
      intro: "Choose a nation in a tournament: Denmark at the Euros, Morocco at the World Cup. Three rival nations race against you. Pick a stat you think your nation leads, like most goals in a single match or fewest goals conceded, and if you are right your flag moves one space. Pick wrong and the nation that really leads it moves instead.",
      howToPlay: ["Each day's race is one tournament and four nations, the same for everyone: choose yours, the other three are your rivals. You need five spaces, each rival needs three.", "Pick a stat from the list or type one: wins, penalties, clean sheets, red cards, comebacks and more. Every stat is a real record of that tournament.", "The nation that leads the stat moves one space, whoever picked it. A tie moves every nation that shares the lead.", "Reach the goal before the rivals, in as few picks as you can. Five out of five is a perfect race."],
      reward: "Play past days without an account; sign in for today's race and the daily leaderboard.",
    },
    ka: {
      metaTitle: "ფეხბურთის დოღი — აირჩიე სტატისტიკა და გაასწარი ნაკრებით | QuizBall",
      metaDescription: "ფეხბურთის დოღი: შენი ნაკრები სამის წინააღმდეგ ერთ ტურნირში. აირჩიე სტატისტიკა, რომელშიც ლიდერობს, და მიდი ფინიშისკენ. ერთი დოღი დღეში ან 2-4 მეგობარი ოთახში.",
      title: "ფეხბურთის დოღი",
      intro: "აირჩიე ნაკრები ტურნირში: დანია ევროპის ჩემპიონატზე, მაროკო მსოფლიო ჩემპიონატზე. სამი მეტოქე ნაკრები შენთან ერთად რბის. აირჩიე სტატისტიკა, რომელშიც შენი ნაკრები ლიდერობს, მაგალითად ყველაზე მეტი გოლი ერთ მატჩში, და თუ მართალი ხარ, შენი დროშა ერთი უჯრით წინ მიდის. თუ შეცდები, წინ ის ნაკრები წავა, რომელიც სინამდვილეში ლიდერობს.",
      howToPlay: ["დღის დოღი ერთი ტურნირი და ოთხი ნაკრებია, ყველასთვის ერთი და იგივე: აირჩიე შენი, დანარჩენი სამი შენი მეტოქეა. შენ ხუთი უჯრა გჭირდება, თითო მეტოქეს სამი.", "აირჩიე სტატისტიკა სიიდან ან დაწერე: მოგებები, პენალტები, მშრალი მატჩები, წითელი ბარათები და სხვა. ყველა სტატისტიკა ამ ტურნირის ნამდვილი მონაცემია.", "ნაკრები, რომელიც სტატისტიკაში ლიდერობს, ერთი უჯრით მიდის წინ, ვინც არ უნდა აირჩიოს. თანაბრობისას წინ ყველა ლიდერი მიდის.", "მიაღწიე ფინიშს მეტოქეებზე ადრე, რაც შეიძლება ნაკლები არჩევანით. 5-დან 5 იდეალური დოღია."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი დოღისთვის და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Carrera de caballos futbolera — Elegí la estadística y corré | QuizBall",
      metaDescription: "La carrera de caballos futbolera: tu selección contra tres en un torneo. Elegí las estadísticas que lidera y llegá primero a la meta. Una carrera por día, o de 2 a 4 amigos en una sala.",
      title: "Carrera de caballos futbolera",
      intro: "Elegí una selección en un torneo: Uruguay en la Copa América, Marruecos en el Mundial. Tres selecciones rivales corren contra vos. Elegí una estadística que creas que lidera tu selección, como más goles en un partido o menos goles recibidos, y si acertás tu bandera avanza un casillero. Si te equivocás, avanza la selección que de verdad la lidera.",
      howToPlay: ["La carrera del día es un torneo y cuatro selecciones, las mismas para todos: elegí la tuya y las otras tres son tus rivales. Vos necesitás cinco casilleros, cada rival tres.", "Elegí una estadística de la lista o escribila: victorias, penales, vallas invictas, tarjetas rojas, remontadas y más. Cada estadística es un dato real de ese torneo.", "La selección que lidera la estadística avanza un casillero, la haya elegido quien la haya elegido. Si hay empate, avanzan todas las que comparten el primer lugar.", "Llegá a la meta antes que las rivales, con la menor cantidad de elecciones. Cinco de cinco es una carrera perfecta."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, la carrera de hoy y el ranking del día.",
    },
    tr: {
      metaTitle: "Futbol At Yarışı — İstatistiği Seç, Milli Takımınla Yarış | QuizBall",
      metaDescription: "Futbol At Yarışı: milli takımın tek bir turnuvada üç rakibe karşı. Önde olduğu istatistikleri seç ve çizgiye ilk sen ulaş. Günde bir yarış ya da odada 2-4 arkadaş.",
      title: "Futbol At Yarışı",
      intro: "Bir turnuvada milli takımını seç: Avrupa Şampiyonası'nda Türkiye, Dünya Kupası'nda Fas. Üç rakip milli takım seninle yarışır. Takımının önde olduğunu düşündüğün bir istatistik seç, örneğin tek maçta en çok gol ya da en az yenilen gol; haklıysan bayrağın bir kare ilerler. Yanılırsan o istatistikte gerçekten önde olan takım ilerler.",
      howToPlay: ["Günün yarışı bir turnuva ve herkes için aynı dört milli takımdır: kendininkini seç, diğer üçü rakiplerin olur. Sana beş kare gerekir, her rakibe üç.", "Listeden bir istatistik seç ya da yaz: galibiyetler, penaltılar, gol yemeden biten maçlar, kırmızı kartlar, geri dönüşler ve daha fazlası. Her istatistik o turnuvanın gerçek bir verisidir.", "İstatistikte önde olan takım, kim seçmiş olursa olsun bir kare ilerler. Eşitlikte önde olan bütün takımlar ilerler.", "Rakiplerden önce, olabildiğince az seçimle kaleye ulaş. 5'te 5 kusursuz bir yarıştır."],
      reward: "Önceki günleri hesapsız oyna; bugünün yarışı ve günün sıralaması için giriş yap.",
    },    ru: {
      metaTitle: "Футбольные скачки: выбери статистику и веди сборную к финишу | QuizBall",
      metaDescription: "Футбольные скачки: твоя сборная против трёх в одном турнире. Выбирай статистику, где она лидирует, и мчись к финишу. Одна гонка в день или комната на 2–4 друзей.",
      title: "Футбольные скачки",
      intro: "Выбери сборную на турнире: Дания на Евро, Марокко на чемпионате мира. Против тебя бегут три сборные-соперницы. Выбери статистику, в которой, как тебе кажется, лидирует твоя сборная, например больше всего голов в одном матче или меньше всего пропущенных, и если ты прав, твой флаг делает шаг вперёд. Ошибёшься — шаг сделает та сборная, которая лидирует на самом деле.",
      howToPlay: ["Гонка дня — это один турнир и четыре сборные, одинаковые для всех: выбери свою, остальные три — твои соперницы. Тебе нужно пять шагов, каждой сопернице три.", "Выбери статистику из списка или введи её сам: победы, пенальти, сухие матчи, красные карточки, камбэки и многое другое. Каждая статистика — настоящий рекорд этого турнира.", "Шаг вперёд делает сборная, которая лидирует по статистике, кто бы её ни выбрал. При равенстве вперёд идут все лидеры.", "Доберись до ворот раньше соперниц и за как можно меньше ходов. Пять из пяти — идеальная гонка."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы пройти сегодняшнюю гонку и попасть в ежедневный рейтинг.",
    },

  }),
  mode({
    en: {
      intro: "Twenty football picture cards: caricatures of legends, famous stadiums and football memes. Your Scout gives one football clue and a number, like “Ferguson · 2” or “Hand of God · 1”, and you find the cards it points to. Eight cards belong to your team and one is the Own Goal: flip it and the game is over.",
      howToPlay: ["Each day's board is 20 cards, the same for everyone: 8 are yours, 7 the rival's, 4 neutral and one is the Own Goal. Only the Scout knows which is which.", "The bot Scout gives you three clues, one at a time: a football word and a number, like “Real Madrid · 3”. The number says how many of your cards it points to.", "Flip a card you think fits. A right card keeps the clue going; a rival or neutral card ends that clue and the next one comes.", "Find all 8 before the clues run out. The Own Goal ends the run at once. Share your board and climb the daily leaderboard."],
      reward: "Play past days without an account; sign in for today's board and the daily leaderboard.",
    },
    ka: {
      intro: "ოცი საფეხბურთო სურათიანი ბარათი: ლეგენდების კარიკატურები, ცნობილი სტადიონები და საფეხბურთო მემები. შენი სკაუტი ასახელებს ერთ საფეხბურთო მინიშნებას და რიცხვს, მაგალითად „ფერგიუსონი · 2“ ან „ღმერთის ხელი · 1“, შენ კი პოულობ ბარათებს, რომლებზეც ის მიანიშნებს. რვა ბარათი შენი გუნდისაა, ერთი კი ავტოგოლია: გადააბრუნებ და თამაში დასრულდა.",
      howToPlay: ["დღის დაფა 20 ბარათია, ყველასთვის ერთი და იგივე: 8 შენია, 7 მეტოქის, 4 ნეიტრალური და ერთი ავტოგოლია. რომელი ვისია, მხოლოდ სკაუტმა იცის.", "ბოტი სკაუტი სამ მინიშნებას გაძლევს, თითო-თითოდ: საფეხბურთო სიტყვას და რიცხვს, მაგალითად „რეალ მადრიდი · 3“. რიცხვი გეუბნება, შენს რამდენ ბარათზე მიანიშნებს.", "გადააბრუნე ბარათი, რომელიც გგონია, რომ ერგება. სწორი ბარათი მინიშნებას აგრძელებს; მეტოქის ან ნეიტრალური ბარათი ამ მინიშნებას ამთავრებს და შემდეგი მოდის.", "იპოვე 8-ვე ბარათი, სანამ მინიშნებები ამოიწურება. ავტოგოლი თამაშს მაშინვე ამთავრებს. გააზიარე შედეგი და აიწიე დღის რეიტინგში."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი დაფისთვის და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      intro: "Veinte cartas con dibujos de fútbol: caricaturas de leyendas, estadios famosos y memes futboleros. Tu Ojeador da una pista futbolera y un número, como “Ferguson · 2” o “Mano de Dios · 1”, y vos encontrás las cartas que señala. Ocho cartas son de tu equipo y una es el Autogol: si la das vuelta, se termina la partida.",
      howToPlay: ["El tablero del día son 20 cartas, las mismas para todos: 8 son tuyas, 7 del rival, 4 neutrales y una es el Autogol. Solo el Ojeador sabe cuál es cuál.", "El Ojeador bot te da tres pistas, de a una: una palabra de fútbol y un número, como “Real Madrid · 3”. El número dice a cuántas de tus cartas apunta.", "Da vuelta una carta que creas que encaja. Si acertás, seguís con la pista; una carta rival o neutral la termina y llega la siguiente.", "Encontrá las 8 antes de que se acaben las pistas. El Autogol termina la partida al instante. Compartí tu tablero y subí en el ranking del día."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, el tablero de hoy y el ranking del día.",
    },
    tr: {
      intro: "Yirmi resimli futbol kartı: efsanelerin karikatürleri, ünlü stadyumlar ve futbol capsleri. Gözlemcin bir futbol ipucu ve bir sayı verir, örneğin “Ferguson · 2” ya da “Tanrı'nın Eli · 1”; sen de işaret ettiği kartları bulursun. Sekiz kart senin takımının, biri ise Kendi Kalesine Gol: onu açarsan oyun biter.",
      howToPlay: ["Günün tahtası herkes için aynı 20 karttır: 8'i senin, 7'si rakibin, 4'ü nötr, biri Kendi Kalesine Gol. Hangisinin kime ait olduğunu yalnızca Gözlemci bilir.", "Bot Gözlemci sana tek tek üç ipucu verir: bir futbol kelimesi ve bir sayı, örneğin “Real Madrid · 3”. Sayı, ipucunun senin kaç kartını işaret ettiğini söyler.", "Uyduğunu düşündüğün kartı aç. Doğru kart ipucunu sürdürür; rakip ya da nötr kart o ipucunu bitirir ve sıradaki gelir.", "İpuçları bitmeden 8 kartın hepsini bul. Kendi Kalesine Gol oyunu anında bitirir. Tahtanı paylaş ve günün sıralamasında yüksel."],
      reward: "Önceki günleri hesapsız oyna; bugünün tahtası ve günün sıralaması için giriş yap.",
    },
    ru: {
      intro: "Двадцать футбольных карточек с картинками: карикатуры на легенд, знаменитые стадионы и футбольные мемы. Твой Скаут даёт одну футбольную подсказку и число, например «Фергюсон · 2» или «Рука Бога · 1», а ты ищешь карточки, на которые она указывает. Восемь карточек принадлежат твоей команде, а одна — Автогол: откроешь её, и игра окончена.",
      howToPlay: ["Поле дня — это 20 карточек, одинаковых для всех: 8 твоих, 7 соперника, 4 нейтральные и одна — Автогол. Где какая, знает только Скаут.", "Бот-Скаут даёт тебе три подсказки по очереди: футбольное слово и число, например «Реал Мадрид · 3». Число показывает, на сколько твоих карточек указывает подсказка.", "Открой карточку, которая, как тебе кажется, подходит. Верная карточка продлевает подсказку, чужая или нейтральная заканчивает её, и приходит следующая.", "Найди все 8 карточек, пока не закончились подсказки. Автогол сразу заканчивает игру. Поделись результатом и поднимайся в ежедневном рейтинге."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы пройти сегодняшнее поле и попасть в ежедневный рейтинг.",
    },
  }),
  mode("football-odd-one-out", "/dato-falso-futbolero", "dato-falso", {
    en: {
      metaTitle: "Football Odd One Out — Spot the Fake Football Fact | QuizBall",
      metaDescription: "Football Odd One Out: one footballer, a claim and five options. Four are true, one is fake. 10 cards a day, two jokers, or 2 to 6 friends in a room.",
      title: "Football Odd One Out",
      intro: "One footballer, one claim and five options: “played for ALL these clubs”, “wore ALL these shirt numbers”. Four are true and one is fake. Find the odd one out before the 30 seconds run down.",
      howToPlay: ["Each card shows a footballer and a claim, such as every club he played for, the leagues he played in, the World Cup squads he was in, his shirt numbers or his trophies, with five options under it.", "Four options are true and one is fake. Tap the one you think is fake and confirm it. You have 30 seconds a card.", "A right answer is +1. Two jokers, once each per day: Remove 2 greys out two true options, Double or nothing is +2 if you are right and −1 if you are wrong.", "Ten cards a day, the same for everyone. Finish to see your score, share your grid and climb the daily leaderboard."],
      reward: "Play past days without an account; sign in for today's cards and the daily leaderboard.",
    },
    ka: {
      metaTitle: "ყალბი ფაქტი — იპოვე ყალბი საფეხბურთო ფაქტი | QuizBall",
      metaDescription: "ყალბი ფაქტი: ერთი ფეხბურთელი, ერთი მტკიცება და ხუთი ვარიანტი. ოთხი სწორია, ერთი ყალბი. დღეში 10 ბარათი, ორი ჯოკერი ან 2-6 მეგობარი ოთახში.",
      title: "ყალბი ფაქტი",
      intro: "ერთი ფეხბურთელი, ერთი მტკიცება და ხუთი ვარიანტი: „ითამაშა ყველა ამ კლუბში“, „ატარა ყველა ეს ნომერი“. ოთხი ვარიანტი სწორია, ერთი ყალბი. იპოვე ის, სანამ 30 წამი ამოიწურება.",
      howToPlay: ["ყოველ ბარათზე ფეხბურთელი და მტკიცებაა, მაგალითად ყველა კლუბი, რომელშიც ითამაშა, ლიგები, მსოფლიო ჩემპიონატები, რომლებზეც განაცხადში იყო, მისი ნომრები ან ტიტულები. ქვემოთ ხუთი ვარიანტია.", "ოთხი ვარიანტი სწორია, ერთი ყალბი. შეეხე იმას, რომელიც ყალბი გგონია, და დაადასტურე. თითო ბარათზე 30 წამი გაქვს.", "სწორი პასუხი +1-ია. ორი ჯოკერია, თითოს დღეში ერთხელ იყენებ: „2-ის მოშორება“ ამუქებს ორ სწორ ვარიანტს, „ორმაგი ან არაფერი“ კი სწორ პასუხზე +2-ს იძლევა, შეცდომაზე — −1-ს.", "დღეში 10 ბარათია, ყველასთვის ერთი და იგივე. დასრულების შემდეგ ნახავ შედეგს, გააზიარებ ბადეს და აიწევ დღის რეიტინგში."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი ბარათებისა და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Dato falso futbolero — Encontrá el dato falso | QuizBall",
      metaDescription: "Dato falso futbolero: un futbolista, una afirmación y cinco opciones. Cuatro son verdaderas y una es falsa. 10 cartas por día, dos comodines, o de 2 a 6 amigos en una sala.",
      title: "Dato falso futbolero",
      intro: "Un futbolista, una afirmación y cinco opciones: “jugó en TODOS estos clubes”, “usó TODOS estos dorsales”. Cuatro son verdaderas y una es falsa. Encontrá la que no encaja antes de que se acaben los 30 segundos.",
      howToPlay: ["Cada carta muestra a un futbolista y una afirmación, como todos los clubes en los que jugó, las ligas, los Mundiales a los que fue convocado, sus dorsales o sus títulos, con cinco opciones debajo.", "Cuatro opciones son verdaderas y una es falsa. Tocá la que creés que es falsa y confirmala. Tenés 30 segundos por carta.", "Acertar vale +1. Dos comodines, uno de cada por día: Descartar 2 tacha dos opciones verdaderas y Doble o nada da +2 si acertás y −1 si fallás.", "Son diez cartas por día, las mismas para todos. Al terminar ves tu puntaje, compartís tu grilla y subís en el ranking del día."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, las cartas de hoy y el ranking del día.",
    },
    tr: {
      metaTitle: "Hangisi Yanlış? — Yanlış Futbol Bilgisini Bul | QuizBall",
      metaDescription: "Hangisi Yanlış?: bir futbolcu, bir iddia ve beş seçenek. Dördü doğru, biri yanlış. Günde 10 kart, iki joker ya da bir odada 2-6 arkadaş.",
      title: "Hangisi Yanlış?",
      intro: "Bir futbolcu, bir iddia ve beş seçenek: “bu kulüplerin HEPSİNDE oynadı”, “bu forma numaralarının HEPSİNİ giydi”. Dördü doğru, biri yanlış. 30 saniye dolmadan yanlış olanı bul.",
      howToPlay: ["Her kart bir futbolcuyu ve bir iddiayı gösterir; örneğin oynadığı tüm kulüpler, ligler, kadrosunda yer aldığı Dünya Kupaları, forma numaraları ya da kupaları. Altında beş seçenek vardır.", "Seçeneklerin dördü doğru, biri yanlıştır. Yanlış olduğunu düşündüğüne dokun ve onayla. Kart başına 30 saniyen var.", "Doğru cevap +1 puan. Günde birer kez kullanabileceğin iki joker var: 2 Şık Sil iki doğru seçeneği soluklaştırır, Ya Hep Ya Hiç doğru bilirsen +2, yanlış bilirsen −1 verir.", "Günde 10 kart var, herkes için aynı. Bitirince puanını gör, ızgaranı paylaş ve günün sıralamasında yüksel."],
      reward: "Önceki günleri hesapsız oyna; bugünün kartları ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Найди лишнее: какой футбольный факт ложный | QuizBall",
      metaDescription: "Найди лишнее: один футболист, одно утверждение и пять вариантов. Четыре верных, один ложный. 10 карточек в день, две подсказки или комната на 2–6 друзей.",
      title: "Найди лишнее: ложный футбольный факт",
      intro: "Один футболист, одно утверждение и пять вариантов: «играл во ВСЕХ этих клубах», «носил ВСЕ эти номера». Четыре варианта верные, один ложный. Найди его, пока не вышли 30 секунд.",
      howToPlay: ["На каждой карточке футболист и утверждение: все клубы, в которых он играл, чемпионаты, чемпионаты мира в заявке, игровые номера или трофеи. Под ним пять вариантов.", "Четыре варианта верные, один ложный. Нажми на тот, что кажется ложным, и подтверди. На карточку даётся 30 секунд.", "Верный ответ — +1. Две подсказки, каждую можно использовать раз в день: «Убрать 2» затемняет два верных варианта, «Всё или ничего» даёт +2, если угадал, и −1, если ошибся.", "Десять карточек в день, одинаковых для всех. В конце ты увидишь результат, сможешь поделиться сеткой и подняться в ежедневном рейтинге."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы пройти сегодняшние карточки и попасть в ежедневный рейтинг.",
    },
  }),
  mode("football-tenable", "/football-tenable", "tenable", {
    en: {
      metaTitle: "Football Tenable — Guess the Top 10 Daily Football Quiz | QuizBall",
      metaDescription: "Football Tenable: one hidden top 10 a day. Name the players, managers, clubs or countries on the list before the tower beats you. 3 lives, a daily leaderboard, or play friends in rooms of 2 to 6.",
      title: "Football Tenable",
      intro: "One hidden top 10 list every day: the Champions League's top scorers, the most expensive transfers, the managers with the most titles. Name who is on it. Every right answer climbs into its place on the tower; three wrong answers and the tower wins. Can you get all ten?",
      howToPlay: ["Read today's list title: it tells you exactly what the ten have in common.", "Type a name, or pick it from the suggestions. A right answer appears in its ranked slot with its figure.", "A real player who is not on the list costs a life. Something already on the tower, or a name we do not know, costs nothing. You have 3 lives.", "Your score is how many of the ten you found. Share your tower, or play the same game with friends: take turns on one tower, and each slot is worth its number."],
      reward: "Play past days without an account; sign in for today's list and the daily leaderboard.",
    },
    ka: {
      metaTitle: "ფეხბურთის ტოპ 10 — გამოიცანი დამალული სია | QuizBall",
      metaDescription: "ფეხბურთის ტოპ 10: ყოველდღე ერთი დამალული სია. დაასახელე ფეხბურთელები, მწვრთნელები, კლუბები ან ქვეყნები, სანამ კოშკი გაიმარჯვებს. 3 სიცოცხლე, დღის რეიტინგი ან თამაში მეგობრებთან.",
      title: "ფეხბურთის ტოპ 10",
      intro: "ყოველდღე ერთი დამალული ტოპ 10 სია: ჩემპიონთა ლიგის საუკეთესო ბომბარდირები, ყველაზე ძვირადღირებული ტრანსფერები, ყველაზე ტიტულოვანი მწვრთნელები. დაასახელე, ვინ არის მასში. ყოველი სწორი პასუხი კოშკზე თავის ადგილას ადის; სამი შეცდომა და კოშკი იგებს. ათივეს გამოიცნობ?",
      howToPlay: ["წაიკითხე დღის სიის სათაური: ის ზუსტად გეუბნება, რა აერთიანებს ათეულს.", "დაწერე სახელი ან აირჩიე მინიშნებიდან. სწორი პასუხი თავის ადგილას ჩნდება თავისი მაჩვენებლით.", "ნამდვილი ფეხბურთელი, რომელიც სიაში არ არის, ერთ სიცოცხლეს გაკარგვინებს. უკვე გახსნილი ან უცნობი სახელი არაფერი ჯდება. 3 სიცოცხლე გაქვს.", "შენი ქულა ნაპოვნი ადგილების რაოდენობაა. გააზიარე შენი კოშკი ან ითამაშე მეგობრებთან: რიგრიგობით ერთ კოშკზე, ყოველი ადგილი იმდენი ქულა ღირს, რა ნომერიც აქვს."],
      reward: "წინა დღეები ანგარიშის გარეშე ითამაშე; დღევანდელი სიისთვის და დღის რეიტინგისთვის შედი ანგარიშში.",
    },
    es: {
      metaTitle: "Adivina el Top 10 de fútbol — Un top 10 oculto por día | QuizBall",
      metaDescription: "Adivina el Top 10 de fútbol: una lista oculta por día. Nombrá a los jugadores, técnicos, clubes o selecciones que están en ella antes de que te gane la torre. 3 vidas, ranking diario o salas con amigos.",
      title: "Adivina el Top 10 de fútbol",
      intro: "Una lista top 10 oculta cada día: los goleadores de la Champions, los fichajes más caros, los técnicos con más títulos. Nombrá a los que están. Cada acierto sube a su puesto en la torre; con tres errores gana la torre. ¿Llegás a los diez?",
      howToPlay: ["Leé el título de la lista de hoy: dice exactamente qué tienen en común los diez.", "Escribí un nombre o elegilo de las sugerencias. Un acierto aparece en su puesto con su número.", "Un futbolista real que no está en la lista te cuesta una vida. Repetir uno que ya está, o un nombre que no conocemos, no cuesta nada. Tenés 3 vidas.", "Tu puntaje es cuántos de los diez encontraste. Compartí tu torre o jugá lo mismo con amigos: por turnos sobre una misma torre, cada puesto vale su número."],
      reward: "Sin cuenta jugás los días anteriores; con tu cuenta, la lista de hoy y el ranking del día.",
    },
    tr: {
      metaTitle: "Futbol Top 10 — Gizli İlk 10 Listesini Tahmin Et | QuizBall",
      metaDescription: "Futbol Top 10: her gün gizli bir İlk 10 listesi. Kule seni yenmeden listedeki futbolcuları, teknik direktörleri, kulüpleri ya da milli takımları bul. 3 can, günlük sıralama ya da arkadaşlarınla odada oyna.",
      title: "Futbol Top 10",
      intro: "Her gün gizli bir İlk 10 listesi: Şampiyonlar Ligi'nin en golcüleri, en pahalı transferler, en çok kupa kazanan teknik direktörler. Listede kim var, bul. Her doğru cevap kuledeki sırasına çıkar; üç yanlışta kule kazanır. Onunu da bulabilir misin?",
      howToPlay: ["Günün liste başlığını oku: ondaki on ismin ortak noktasını tam olarak söyler.", "Bir isim yaz ya da önerilerden seç. Doğru cevap, rakamıyla birlikte kendi sırasında görünür.", "Listede olmayan gerçek bir futbolcu bir cana mal olur. Zaten kulede olan ya da tanımadığımız bir isim hiçbir şey götürmez. 3 canın var.", "Puanın, ondan kaçını bulduğundur. Kuleni paylaş ya da aynı oyunu arkadaşlarınla oyna: sırayla tek bir kulede, her sıra kendi numarası kadar puan."],
      reward: "Önceki günleri hesapsız oyna; bugünün listesi ve günün sıralaması için giriş yap.",
    },
    ru: {
      metaTitle: "Угадай футбольный топ-10 — ежедневная викторина | QuizBall",
      metaDescription: "Угадай футбольный топ-10: каждый день один скрытый список. Назови игроков, тренеров, клубы или сборные из списка, пока башня не победила. 3 жизни, ежедневный рейтинг или комнаты с друзьями на 2–6 игроков.",
      title: "Угадай футбольный топ-10",
      intro: "Каждый день — один скрытый список топ-10: лучшие бомбардиры Лиги чемпионов, самые дорогие трансферы, самые титулованные тренеры. Назови тех, кто в нём. Каждый верный ответ встаёт на своё место в башне; три ошибки — и башня побеждает. Сможешь найти всех десятерых?",
      howToPlay: ["Прочитай название сегодняшнего списка: оно точно говорит, что объединяет эту десятку.", "Напиши имя или выбери его из подсказок. Верный ответ появляется на своём месте вместе со своим показателем.", "Настоящий футболист, которого нет в списке, стоит одной жизни. Уже открытый ответ или незнакомое нам имя ничего не стоят. У тебя 3 жизни.", "Твои очки — сколько из десяти ты нашёл. Поделись своей башней или сыграй с друзьями: по очереди на одной башне, и каждое место стоит столько очков, какой у него номер."],
      reward: "Играй в прошлые дни без аккаунта; войди, чтобы сыграть в сегодняшний список и попасть в ежедневный рейтинг.",
    },
  }),
  mode("trivia-mines", "/trivia-mines", "mini-trivia-mines", {
    en: {
      metaTitle: "Trivia Mines — Football Minesweeper with Questions | QuizBall",
      metaDescription: "Open tiles, dodge the four defenders and grow the pot. Answer football questions to scout where they hide. Practice as a guest, play for coins with an account.",
      title: "Trivia Mines",
      intro: "Twenty-five tiles hide four defenders. Open safe tiles to grow the pot, answer football questions to scout the danger, and bank before you get tackled.",
      howToPlay: ["Choose a stake (practice points as a guest).", "Open a tile: safe grows the pot, a defender ends the round.", "Scout up to three times by answering a football question.", "Cash out whenever you like after your first safe tile."],
      reward: "Real coins need an account; guest rounds use practice points only.",
    },
    ka: {
      metaTitle: "ტრივია-მაღაროები — საფეხბურთო კითხვებით | QuizBall",
      metaDescription: "გახსენი უჯრები, აარიდე ოთხი მცველი და გაზარდე ბანკი. უპასუხე კითხვებს დაზვერვისთვის. სტუმრად სავარჯიშოდ, ანგარიშით ქოინებზე.",
      title: "ტრივია-მაღაროები",
      intro: "25 უჯრაში ოთხი მცველი იმალება. გახსენი უსაფრთხო უჯრები, უპასუხე კითხვებს დაზვერვისთვის და აიღე ბანკი, სანამ დაგიჭერენ.",
      howToPlay: ["აირჩიე ფსონი (სტუმრად — სავარჯიშო ქულები).", "გახსენი უჯრა: უსაფრთხო ბანკს ზრდის, მცველი რაუნდს ამთავრებს.", "დაზვერვა სამჯერ — უპასუხე საფეხბურთო კითხვას.", "აიღე ბანკი ნებისმიერ დროს პირველი უსაფრთხო უჯრის შემდეგ."],
      reward: "ნამდვილ ქოინებს ანგარიში სჭირდება; სტუმრის რაუნდი სავარჯიშოა.",
    },
    es: {
      metaTitle: "Minas de trivia — esquivá a los defensas con preguntas de fútbol | QuizBall",
      metaDescription: "Abre casillas, esquiva a los cuatro defensas y haz crecer el bote. Responde preguntas de fútbol para descubrir dónde se esconden. Practica como invitado, juega por monedas con cuenta.",
      title: "Minas de trivia",
      intro: "Veinticinco casillas esconden cuatro defensas. Abre casillas seguras, responde preguntas para explorar y retira antes de que te entren.",
      howToPlay: ["Elige una apuesta (puntos de práctica como invitado).", "Abre una casilla: segura hace crecer el bote, un defensa termina la ronda.", "Explora hasta tres veces respondiendo una pregunta de fútbol.", "Retira cuando quieras tras tu primera casilla segura."],
      reward: "Las monedas reales requieren cuenta; las rondas de invitado usan puntos de práctica.",
    },
    tr: {
      metaTitle: "Bilgi Mayınları — Sorulu Futbol Mayın Tarlası | QuizBall",
      metaDescription: "Kareleri aç, dört defanstan kaç ve kasayı büyüt. Nerede saklandıklarını bulmak için futbol sorularını cevapla. Misafir olarak alıştır, hesapla jeton için oyna.",
      title: "Bilgi Mayınları",
      intro: "Yirmi beş karede dört defans saklanır. Güvenli kareleri açarak kasayı büyüt, tehlikeyi keşfetmek için futbol sorularını cevapla ve yakalanmadan kasayı al.",
      howToPlay: ["Bir bahis seç (misafir olarak alıştırma puanı).", "Bir kare aç: güvenliyse kasa büyür, defans turu bitirir.", "Bir futbol sorusu cevaplayarak en fazla üç kez keşif yap.", "İlk güvenli kareden sonra istediğin zaman kasayı al."],
      reward: "Gerçek jeton hesap gerektirir; misafir turları yalnızca alıştırma puanı kullanır.",
    },
    ru: {
      metaTitle: "Минное поле: футбольная викторина | QuizBall",
      metaDescription: "Открывай клетки, обходи четырёх защитников и увеличивай банк. Отвечай на вопросы о футболе, чтобы искать опасность. Тренируйся гостем или играй за монеты с аккаунтом.",
      title: "Минное поле: футбольная викторина",
      intro: "Под 25 клетками скрываются четыре защитника. Открывай безопасные клетки, увеличивай банк, отвечай на вопросы о футболе, чтобы найти опасность, и забирай выигрыш, пока тебя не перехватили.",
      howToPlay: ["Выбери сумму на раунд (гостю доступны тренировочные очки).", "Открой клетку: безопасная увеличит банк, а защитник завершит раунд.", "До трёх раз выясняй, где опасность, отвечая на вопрос о футболе.", "После первой безопасной клетки можешь забрать выигрыш в любой момент."],
      reward: "Чтобы играть за настоящие монеты, нужен аккаунт; гостям доступны только тренировочные очки.",
    },
  }),
  mode("squad-spin", "/squad-spin", "mini-squad-spin", {
    en: {
      metaTitle: "Spin the Wheel Football Game — Squad Spin | QuizBall",
      metaDescription: "Spin club, position and nation, then name a footballer who fits all three within 15 seconds. Practice as a guest; real coins with an account.",
      title: "Squad Spin",
      intro: "The reels land on a club, a position and a nation. Name a player who fits every reel before the clock runs out; each correct answer multiplies the pot.",
      howToPlay: ["Pick 3, 4 or 5 reels: more reels, tighter clues, bigger multiplier.", "Type a player who matches every reel within 15 seconds.", "Cash out or spin again before the next reels show.", "One miss ends the run."],
      reward: "Real coins need an account; guest runs use practice points only.",
    },
    ka: {
      metaTitle: "Squad Spin — დაასახელე ფეხბურთელი ყველა ბორბლისთვის | QuizBall",
      metaDescription: "დაატრიალე კლუბი, პოზიცია და ქვეყანა და 15 წამში დაასახელე ფეხბურთელი, რომელიც სამივეს ერგება. სტუმრად სავარჯიშოდ, ანგარიშით ქოინებზე.",
      title: "Squad Spin",
      intro: "ბორბლები ჩერდება კლუბზე, პოზიციასა და ქვეყანაზე. დაასახელე ფეხბურთელი, სანამ დრო ამოიწურება; ყოველი სწორი პასუხი ბანკს ამრავლებს.",
      howToPlay: ["აირჩიე 3, 4 ან 5 ბორბალი: მეტი ბორბალი — მეტი მულტიპლიკატორი.", "15 წამში ჩაწერე ფეხბურთელი, რომელიც ყველა ბორბალს ერგება.", "აიღე ბანკი ან დაატრიალე ისევ, სანამ შემდეგ ბორბლებს დაინახავ.", "ერთი შეცდომა სერიას ამთავრებს."],
      reward: "ნამდვილ ქოინებს ანგარიში სჭირდება; სტუმრის სერია სავარჯიშოა.",
    },
    es: {
      metaTitle: "Ruleta futbolera — nombra un jugador que encaje en cada carrete | QuizBall",
      metaDescription: "La ruleta futbolera, también llamada ruleta mágica: gira club, posición y país y nombra en 15 segundos un futbolista que encaje en los tres. Practica como invitado; monedas reales con cuenta.",
      title: "Ruleta futbolera",
      intro: "Los carretes caen en un club, una posición y un país. Nombra un jugador que encaje en todos antes de que acabe el tiempo; cada acierto multiplica el bote.",
      howToPlay: ["Elige 3, 4 o 5 carretes: más carretes, mayor multiplicador.", "Escribe en 15 segundos un jugador que cumpla todos los carretes.", "Retira o vuelve a girar antes de ver los siguientes carretes.", "Un fallo termina la racha."],
      reward: "Las monedas reales requieren cuenta; las rachas de invitado usan puntos de práctica.",
    },
    tr: {
      metaTitle: "Futbol Çarkı — Çarkı Çevir, Futbolcuyu Bul | QuizBall",
      metaDescription: "Kulüp, mevki ve ülkeyi çevir, 15 saniye içinde üçüne de uyan bir futbolcu söyle. Misafir olarak alıştır; hesapla gerçek jeton.",
      title: "Futbol Çarkı",
      intro: "Makaralar bir kulüp, bir mevki ve bir ülkede durur. Süre bitmeden her makaraya uyan bir oyuncu söyle; her doğru cevap kasayı katlar.",
      howToPlay: ["3, 4 ya da 5 makara seç: daha çok makara, daha dar ipucu, daha büyük çarpan.", "15 saniye içinde her makaraya uyan bir oyuncu yaz.", "Sonraki makaralar görünmeden kasayı al ya da tekrar çevir.", "Tek bir hata seriyi bitirir."],
      reward: "Gerçek jeton hesap gerektirir; misafir serileri yalnızca alıştırma puanı kullanır.",
    },
    ru: {
      metaTitle: "Футбольная рулетка: собери состав | QuizBall",
      metaDescription: "Крути клуб, позицию и страну и за 15 секунд называй футболиста, которому подходят все три подсказки. Тренируйся гостем или играй за монеты с аккаунтом.",
      title: "Футбольная рулетка: собери состав",
      intro: "Барабаны останавливаются на клубе, позиции и стране. До конца времени назови игрока, которому подходят все три подсказки: каждый верный ответ увеличивает банк.",
      howToPlay: ["Выбери 3, 4 или 5 барабанов: чем их больше, тем точнее подсказки и выше множитель.", "За 15 секунд назови игрока, которому подходят все подсказки.", "Забери выигрыш или крути ещё раз, пока не появились новые барабаны.", "Одна ошибка завершит серию."],
      reward: "Чтобы играть за настоящие монеты, нужен аккаунт; гостям доступны только тренировочные очки.",
    },
  }),
];

export function findGamePage(section: GamePageSection, slug: string): GamePageEntry | null {
  return GAME_PAGES.find((entry) => entry.section === section && entry.slug === slug) ?? null;
}

export function gamePageSlug(entry: GamePageEntry, locale: Locale): string {
  return entry.slugs?.[locale] ?? entry.slug;
}

/** /{locale}/{localized folder}/{localized slug} */
export function gamePagePath(entry: GamePageEntry, locale: Locale): string {
  return `/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/${gamePageSlug(entry, locale)}`;
}

export function dailyCollectionPath(locale: Locale): string {
  return `/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/${DAILY_COLLECTION_SLUG[locale]}`;
}

/** Retired public URL → current URL, for every published page whose folder or slug changed. */
export function previousGamePagePaths(pages: readonly GamePageEntry[]): Record<string, string> {
  const redirects: Record<string, string> = {};
  for (const locale of SEO_PAGE_LOCALES) {
    const moved = PREVIOUS_FOLDER[locale];
    const folder = moved?.folder ?? PUBLIC_GAMES_FOLDER[locale];
    for (const entry of pages) {
      const previous = PREVIOUS_SLUGS[entry.slug]?.[locale];
      const slug = previous ?? (moved ? entry.slug : undefined);
      if (!slug) continue;
      // A locale whose folder moved: the old folder redirects, and a slug renamed after the move also redirects from
      // the current folder (e.g. /tr/futbol-oyunlari/stat-sniper → its new Turkish slug).
      const froms = [`/${locale}/${folder}/${slug}`];
      if (moved && previous) froms.push(`/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/${previous}`);
      // Bare default-locale URLs (/football-games/<slug>) existed for the old slug too.
      if (locale === DEFAULT_LOCALE && previous) froms.push(`/${PUBLIC_GAMES_FOLDER[locale]}/${previous}`);
      for (const from of froms) if (from !== gamePagePath(entry, locale)) redirects[from] = gamePagePath(entry, locale);
    }
    if (moved) {
      redirects[`/${locale}/${moved.folder}`] = `/${locale}`;
      redirects[`/${locale}/${moved.folder}/${moved.dailyCollection}`] = dailyCollectionPath(locale);
    }
  }
  return redirects;
}

/** Resolves a localized public URL (folder must match the locale) to its manifest entry. */
export function findGamePageByLocalizedSlug(locale: Locale, folder: string, slug: string): GamePageEntry | null {
  if (folder !== PUBLIC_GAMES_FOLDER[locale]) return null;
  return GAME_PAGES.find((entry) => gamePageSlug(entry, locale) === slug) ?? null;
}
