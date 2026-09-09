import type { Locale } from "@/lib/i18n/locale";
import { DAILY_CHALLENGE_SLUGS, dailyChallengePlayPath } from "@/lib/domain/dailyChallengeSlugs";

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
  slug: string;
  section: GamePageSection;
  /** Where "Play" sends the visitor (the auth-gated app route). */
  playPath: string;
  /** DemoModeArt slug for the hero illustration. */
  artSlug: string;
  copy: Record<Locale, GamePageCopy>;
}

const cta = { en: "Play now", ka: "ითამაშე ახლავე", es: "Jugar ahora", tr: "Hemen oyna" } as const;

function daily(
  type: keyof typeof DAILY_CHALLENGE_SLUGS,
  copy: Record<Locale, Omit<GamePageCopy, "cta">>,
): GamePageEntry {
  return {
    slug: DAILY_CHALLENGE_SLUGS[type],
    section: "daily",
    playPath: dailyChallengePlayPath(type),
    artSlug: `daily-${type}`,
    copy: {
      en: { ...copy.en, cta: cta.en },
      ka: { ...copy.ka, cta: cta.ka },
      es: { ...copy.es, cta: cta.es },
      tr: { ...copy.tr, cta: cta.tr },
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
    copy: {
      en: { ...copy.en, cta: cta.en },
      ka: { ...copy.ka, cta: cta.ka },
      es: { ...copy.es, cta: cta.es },
      tr: { ...copy.tr, cta: cta.tr },
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
      metaTitle: "Verdadero o falso — Quiz diario de fútbol",
      metaDescription: "Datos de fútbol rápidos, quince segundos cada uno. ¿Verdadero o falso? Un set nuevo cada día.",
      title: "Verdadero o falso",
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
  }),
  daily("countdown", {
    en: {
      metaTitle: "Countdown — Name as Many as You Can",
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
      metaTitle: "Countdown — Nombra tantos como puedas",
      metaDescription: "Vence al reloj: escribe tantas respuestas válidas de fútbol como puedas por categoría. Un Countdown nuevo cada día.",
      title: "Countdown",
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
      metaTitle: "Más o menos — Juego de estadísticas de fútbol",
      metaDescription: "Dos jugadores, una estadística. ¿Cuál es mayor? Mantén la racha en el reto diario Más o menos.",
      title: "Más o menos",
      intro: "Dos futbolistas lado a lado y una estadística. Di cuál es mayor y construye tu racha.",
      howToPlay: ["Lee la estadística que se compara.", "Elige al jugador que crees que tiene el valor más alto.", "Los aciertos continúan la ronda."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Daha Yüksek mi Düşük mü — Futbol İstatistik Oyunu",
      metaDescription: "İki oyuncu, bir istatistik. Hangisi daha yüksek? Günlük Daha Yüksek mi Düşük mü görevinde seriyi sürdür.",
      title: "Daha Yüksek mi Düşük mü",
      intro: "Yan yana iki futbolcu ve bir istatistik. Hangisinin daha yüksek olduğunu söyle ve serini büyüt.",
      howToPlay: ["Karşılaştırılan istatistiği oku.", "Değerinin daha yüksek olduğunu düşündüğün oyuncuyu seç.", "Doğru seçimler turu sürdürür."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
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
  }),
  daily("statSniper", {
    en: {
      metaTitle: "Stat Sniper — Guess the Football Number",
      metaDescription: "Ten football numbers a day: transfer fees, season goals, final attendances. Slide to your guess; the closer you land, the more you score.",
      title: "Stat Sniper",
      intro: "Ten real football numbers. Slide to your best guess and land as close as you can.",
      howToPlay: ["Read the stat and drag the slider to your guess.", "Lock it in — the true number is revealed with your points.", "The closer you land, the more you score; a bullseye pays extra."],
      reward: "Earn coins and XP for your accuracy, and climb the day's leaderboard.",
    },
    ka: {
      metaTitle: "სტატ-სნაიპერი — გამოიცანი ფეხბურთის რიცხვი",
      metaDescription: "დღეში ათი ფეხბურთის რიცხვი: ტრანსფერის ფასები, სეზონის გოლები, ფინალის დამსწრეები. მიიტანე სლაიდერი შენს ვარაუდამდე — რაც უფრო ახლოს, მით მეტი ქულა.",
      title: "სტატ-სნაიპერი",
      intro: "ათი ნამდვილი ფეხბურთის რიცხვი. მიიტანე სლაიდერი შენს ვარაუდამდე და მოხვდი რაც შეიძლება ახლოს.",
      howToPlay: ["წაიკითხე სტატისტიკა და გადაიტანე სლაიდერი შენს ვარაუდზე.", "დააფიქსირე — ნამდვილი რიცხვი და შენი ქულა გამოჩნდება.", "რაც უფრო ახლოს, მით მეტი ქულა; ზუსტი მოხვედრა ბონუსია."],
      reward: "დააგროვე მონეტები და XP სიზუსტისთვის და აიწიე დღის ლიდერბორდში.",
    },
    es: {
      metaTitle: "Francotirador de datos — Adivina la cifra del fútbol",
      metaDescription: "Diez cifras del fútbol al día: traspasos, goles por temporada, asistencia a finales. Desliza hasta tu estimación; cuanto más cerca, más puntos.",
      title: "Francotirador de datos",
      intro: "Diez cifras reales del fútbol. Desliza hasta tu mejor estimación y acércate todo lo que puedas.",
      howToPlay: ["Lee el dato y arrastra el deslizador hasta tu estimación.", "Confírmala: se revela la cifra real con tus puntos.", "Cuanto más cerca, más puntos; el pleno da bonus."],
      reward: "Gana monedas y XP por tu precisión y sube en la clasificación del día.",
    },
    tr: {
      metaTitle: "Stat Sniper — Futbol Sayısını Tahmin Et",
      metaDescription: "Günde on futbol sayısı: transfer ücretleri, sezon golleri, final seyirci sayıları. Tahminine kaydır; ne kadar yaklaşırsan o kadar çok puan.",
      title: "Stat Sniper",
      intro: "On gerçek futbol sayısı. En iyi tahminine kaydır ve olabildiğince yaklaş.",
      howToPlay: ["İstatistiği oku ve kaydırıcıyı tahminine sürükle.", "Kilitle — gerçek sayı puanınla birlikte açıklanır.", "Ne kadar yaklaşırsan o kadar çok puan; tam isabet ekstra kazandırır."],
      reward: "İsabetin için jeton ve XP kazan, günün liderlik tablosunda yüksel.",
    },
  }),
  daily("passChain", {
    en: {
      metaTitle: "Pass Chain — Link Two Footballers Through Shared Clubs",
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
      metaTitle: "Cadena de pases — Conecta a dos futbolistas por clubes compartidos",
      metaDescription: "Dos cadenas al día. Conecta al jugador inicial con el objetivo a través de compañeros que compartieron club. Menos eslabones, más puntos.",
      title: "Cadena de pases",
      intro: "Dos jugadores, una cadena. Pasa por compañeros que compartieron club hasta llegar al objetivo.",
      howToPlay: ["Escribe un jugador que compartió club con el último de la cadena.", "Sigue pasando hasta que alguien de la cadena comparta club con el objetivo.", "Iguala el par, la cadena más corta posible, para la puntuación perfecta."],
      reward: "Gana monedas y XP por cada cadena que cierres.",
    },
    tr: {
      metaTitle: "Pas Zinciri — İki Futbolcuyu Ortak Kulüplerle Bağla",
      metaDescription: "Günde iki zincir. Başlangıç oyuncusunu aynı kulüpte oynamış takım arkadaşları üzerinden hedefe bağla. Daha az halka, daha yüksek puan.",
      title: "Pas Zinciri",
      intro: "İki oyuncu, bir zincir. Hedefe ulaşana kadar aynı kulüpte oynamış takım arkadaşları üzerinden pas ver.",
      howToPlay: ["Zincirdeki son oyuncuyla aynı kulüpte oynamış bir oyuncu yaz.", "Zincirdeki biri hedefle aynı kulüpte oynayana kadar pas vermeye devam et.", "Mükemmel skor için mümkün olan en kısa zincir olan par'ı tuttur."],
      reward: "Kapattığın her zincir için jeton ve XP kazan.",
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
      metaTitle: "XI perdido — Adivina las alineaciones famosas",
      metaDescription: "Tres onces iniciales famosos al día. Toca una camiseta, nombra al titular y completa la alineación antes de que acabe el tiempo.",
      title: "XI perdido",
      intro: "Una alineación legendaria con los nombres ocultos. Rellena cada camiseta de memoria.",
      howToPlay: ["Toca una camiseta vacía en el campo.", "Escribe quién fue titular ahí; basta con el apellido.", "Completa las 11 antes de que se acabe el tiempo o los tres fallos."],
      reward: "Gana monedas y XP por cada camiseta que aciertes.",
    },
    tr: {
      metaTitle: "Eksik XI — Ünlü İlk On Birleri Say",
      metaDescription: "Günde üç ünlü ilk on bir. Bir formaya dokun, orada başlayan oyuncuyu söyle ve süre bitmeden kadroyu tamamla.",
      title: "Eksik XI",
      intro: "İsimleri gizlenmiş efsanevi bir kadro. Her formayı hafızandan doldur.",
      howToPlay: ["Sahadaki boş bir formaya dokun.", "Orada başlayan oyuncuyu yaz — soyadı yeterli.", "Süre veya üç hata hakkın bitmeden 11'ini de tamamla."],
      reward: "Söylediğin her forma için jeton ve XP kazan.",
    },
  }),
  daily("footballLogic", {
    en: {
      metaTitle: "Football Logic — Visual Football Riddles",
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
      metaTitle: "Lógica futbolera — Acertijos visuales de fútbol",
      metaDescription: "Dos imágenes señalan a un futbolista. Descifra el acertijo visual en el reto diario.",
      title: "Lógica futbolera",
      intro: "Dos imágenes, un futbolista oculto. Une las pistas y escribe el nombre.",
      howToPlay: ["Observa ambas imágenes.", "Deduce al jugador al que apuntan.", "Escribe el nombre antes de que acabe el tiempo."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Futbol Mantığı — Görsel Futbol Bilmeceleri",
      metaDescription: "İki resim bir futbolcuyu işaret eder. Günlük Futbol Mantığı görevinde görsel bilmeceyi çöz.",
      title: "Futbol Mantığı",
      intro: "İki görsel, bir gizli futbolcu. İpuçlarını birleştir ve ismi yaz.",
      howToPlay: ["İki resme de bak.", "İşaret ettikleri oyuncuyu bul.", "Süre bitmeden ismi yaz."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
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
  }),
  daily("fifaCards", {
    en: {
      metaTitle: "Guess the Card — Name the Player from a FUT-Style Card",
      metaDescription: "A gold card with stats only. Name the footballer before the clues run out. A new card set every day.",
      title: "Guess the Card",
      intro: "A FUT-style gold card, stats revealed one by one, no name and no face. Who is it?",
      howToPlay: ["Watch the card spin and reveal its stats.", "Type the player as soon as you know.", "Fewer reveals, more points."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "გამოიცანი ბარათი — დაასახელე ფეხბურთელი FIFA ბარათით",
      metaDescription: "ოქროს ბარათი მხოლოდ სტატისტიკით. დაასახელე ფეხბურთელი, სანამ მინიშნებები ამოიწურება. ახალი ნაკრები ყოველდღე.",
      title: "გამოიცანი ბარათი",
      intro: "FIFA-ს სტილის ოქროს ბარათი, სტატისტიკა სათითაოდ იხსნება, სახელისა და სახის გარეშე. ვინ არის?",
      howToPlay: ["უყურე, როგორ ტრიალებს ბარათი და იხსნება სტატისტიკა.", "ჩაწერე ფეხბურთელი, როგორც კი მიხვდები.", "ნაკლები გახსნა — მეტი ქულა."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Adivina la carta — Nombra al jugador por su carta FIFA",
      metaDescription: "Una carta dorada solo con estadísticas. Nombra al futbolista antes de que se acaben las pistas. Un set nuevo cada día.",
      title: "Adivina la carta",
      intro: "Una carta dorada estilo FIFA, estadísticas reveladas una a una, sin nombre ni cara. ¿Quién es?",
      howToPlay: ["Mira cómo gira la carta y revela sus estadísticas.", "Escribe el jugador en cuanto lo sepas.", "Menos revelaciones, más puntos."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Kartı Tahmin Et — FUT Tarzı Karttan Oyuncuyu Söyle",
      metaDescription: "Yalnızca istatistikleri olan altın bir kart. İpuçları bitmeden futbolcuyu söyle. Her gün yeni bir kart seti.",
      title: "Kartı Tahmin Et",
      intro: "FUT tarzı altın bir kart, istatistikler tek tek açılıyor, isim yok, yüz yok. Kim bu?",
      howToPlay: ["Kartın dönüp istatistiklerini açmasını izle.", "Bilir bilmez oyuncuyu yaz.", "Daha az açılış, daha çok puan."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
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
      metaTitle: "Trivia de fútbol 1v1 clasificatoria — Partidos en vivo",
      metaDescription: "Enfréntate a un rival real en trivia de fútbol 1v1 en vivo. Rondas de posesión, penaltis, puntos y clasificación.",
      title: "Clasificatoria 1v1",
      intro: "El corazón de QuizBall: trivia de fútbol en vivo contra un rival real, con posesión, penaltis y una escalera clasificatoria.",
      howToPlay: ["Entra en la cola y emparéjate en segundos.", "Responde más rápido y mejor para mantener la posesión.", "Gana para subir de división y en la clasificación."],
      reward: "Gana puntos, monedas y XP por partido.",
    },
    tr: {
      metaTitle: "1v1 Futbol Bilgi Yarışması — Dereceli Canlı Maçlar",
      metaDescription: "Canlı 1v1 futbol bilgi yarışmasında gerçek bir rakiple karşılaş. Top hakimiyeti turları, penaltılar, dereceli puanlar ve liderlik tabloları.",
      title: "Dereceli 1v1",
      intro: "QuizBall'un özü: gerçek bir rakibe karşı top hakimiyeti, penaltılar ve dereceli bir sıralamayla canlı futbol bilgi yarışması.",
      howToPlay: ["Sıraya gir ve saniyeler içinde eşleş.", "Topu elinde tutmak için daha hızlı ve daha doğru cevapla.", "Liglerde ve liderlik tablosunda yükselmek için kazan."],
      reward: "Maç başına dereceli puan, jeton ve XP kazan.",
    },
  }),
  mode("auction", "/auction", "auction", {
    en: {
      metaTitle: "Auction — Build Your Squad by Bidding on Mystery Players",
      metaDescription: "Bid coins on mystery footballers revealed clue by clue, build the strongest squad and beat your opponent.",
      title: "Auction",
      intro: "A mystery player goes on sale each round. Clues reveal their career step by step. Bid smart, build a squad, win.",
      howToPlay: ["Watch the clues and stats reveal.", "Place bids with your coins against your opponent.", "The better squad at the end wins."],
      reward: "Win coins and XP per match.",
    },
    ka: {
      metaTitle: "აუქციონი — შეკრიბე შემადგენლობა იდუმალ ფეხბურთელებზე ტორგით",
      metaDescription: "იტორგე მონეტებით იდუმალ ფეხბურთელებზე, რომლებიც მინიშნებებით იხსნებიან, შეკრიბე უძლიერესი შემადგენლობა და დაამარცხე მეტოქე.",
      title: "აუქციონი",
      intro: "ყოველ რაუნდში იყიდება იდუმალი ფეხბურთელი. მინიშნებები ეტაპობრივად ხსნიან მის კარიერას. იტორგე ჭკვიანურად, შეკრიბე გუნდი, მოიგე.",
      howToPlay: ["უყურე მინიშნებებისა და სტატისტიკის გახსნას.", "დადე ფსონები მონეტებით მეტოქის წინააღმდეგ.", "ბოლოს უკეთესი შემადგენლობა იმარჯვებს."],
      reward: "მოიგე მონეტები და XP მატჩზე.",
    },
    es: {
      metaTitle: "Subasta — Arma tu plantilla pujando por jugadores misteriosos",
      metaDescription: "Puja monedas por futbolistas misteriosos revelados pista a pista, arma la mejor plantilla y vence a tu rival.",
      title: "Subasta",
      intro: "Cada ronda sale a la venta un jugador misterioso. Las pistas revelan su carrera paso a paso. Puja con cabeza, arma tu equipo, gana.",
      howToPlay: ["Mira cómo se revelan pistas y estadísticas.", "Puja con tus monedas contra tu rival.", "Gana la mejor plantilla al final."],
      reward: "Gana monedas y XP por partido.",
    },
    tr: {
      metaTitle: "Açık Artırma — Gizemli Oyunculara Teklif Vererek Kadronu Kur",
      metaDescription: "İpucu ipucu açıklanan gizemli futbolculara jetonla teklif ver, en güçlü kadroyu kur ve rakibini yen.",
      title: "Açık Artırma",
      intro: "Her tur gizemli bir oyuncu satışa çıkar. İpuçları kariyerini adım adım açıklar. Akıllıca teklif ver, bir kadro kur, kazan.",
      howToPlay: ["İpuçlarının ve istatistiklerin açılmasını izle.", "Rakibine karşı jetonlarınla teklif ver.", "Sonunda daha iyi kadro kazanır."],
      reward: "Maç başına jeton ve XP kazan.",
    },
  }),
  mode("football-tic-tac-toe", "/tic-tac-toe", "mini-football-grid", {
    en: {
      metaTitle: "Football Tic Tac Toe (Tiki-Taka-Toe) — 1v1 Grid Game",
      metaDescription: "Live 1v1 football tic tac toe: each cell crosses two criteria, name a player who fits both, three in a row wins. Best of three.",
      title: "Football Tic Tac Toe (Tiki-Taka-Toe)",
      intro: "A 3×3 grid of clubs, nations, trophies and teammates. Claim a cell by naming a footballer who fits both criteria. Three in a row wins the board, best of three wins the series.",
      howToPlay: ["Pick an open cell on your turn.", "Type a player who matches the row and the column.", "Correct claims the cell; three in a line wins."],
      reward: "Earn coins and Tic Tac Toe points per series.",
    },
    ka: {
      metaTitle: "საფეხბურთო იქს-ნული (Tiki-Taka-Toe) — 1v1 ბადის თამაში",
      metaDescription: "ლაივ 1v1 საფეხბურთო იქს-ნული: ყოველი უჯრა ორ კრიტერიუმს კვეთს, დაასახელე ფეხბურთელი, რომელიც ორივეს ერგება, სამი ზედიზედ იგებს. სამიდან ორი.",
      title: "საფეხბურთო იქს-ნული",
      intro: "3×3 ბადე კლუბებით, ნაკრებებით, თასებითა და თანაგუნდელებით. დაიკავე უჯრა ფეხბურთელის დასახელებით, რომელიც ორივე კრიტერიუმს ერგება. სამი ზედიზედ იგებს დაფას, სამიდან ორი — სერიას.",
      howToPlay: ["შენს სვლაზე აირჩიე თავისუფალი უჯრა.", "ჩაწერე ფეხბურთელი, რომელიც სტრიქონსაც და სვეტსაც ერგება.", "სწორი პასუხი უჯრას იკავებს; სამი ერთ ხაზზე იგებს."],
      reward: "დააგროვე მონეტები და იქს-ნულის ქულები სერიაზე.",
    },
    es: {
      metaTitle: "Tres en raya futbolero (Tiki-Taka-Toe) — Juego 1v1",
      metaDescription: "Tres en raya de fútbol 1v1 en vivo: cada casilla cruza dos criterios, nombra un jugador que cumpla ambos, tres en raya gana. Al mejor de tres.",
      title: "Tres en raya futbolero",
      intro: "Una cuadrícula 3×3 de clubes, selecciones, trofeos y compañeros. Ocupa una casilla nombrando a un futbolista que cumpla ambos criterios. Tres en raya gana el tablero; al mejor de tres.",
      howToPlay: ["Elige una casilla libre en tu turno.", "Escribe un jugador que encaje con la fila y la columna.", "El acierto ocupa la casilla; tres en línea gana."],
      reward: "Gana monedas y puntos de Tres en raya por serie.",
    },
    tr: {
      metaTitle: "Futbol Tic Tac Toe (Tiki-Taka-Toe) — 1v1 Izgara Oyunu",
      metaDescription: "Canlı 1v1 futbol tic tac toe: her hücre iki kriteri kesiştirir, ikisine de uyan bir oyuncu söyle, üçü yan yana kazanır. Üç maçın en iyisi.",
      title: "Futbol Tic Tac Toe (Tiki-Taka-Toe)",
      intro: "Kulüpler, ülkeler, kupalar ve takım arkadaşlarından oluşan 3×3 bir ızgara. İki kritere de uyan bir futbolcu söyleyerek hücreyi al. Üçü yan yana tahtayı, üç maçın en iyisi seriyi kazanır.",
      howToPlay: ["Sıran geldiğinde boş bir hücre seç.", "Satıra ve sütuna uyan bir oyuncu yaz.", "Doğru cevap hücreyi alır; bir sırada üç kazanır."],
      reward: "Seri başına jeton ve Tic Tac Toe puanı kazan.",
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
  }),
  mode("guess-the-goal", "/guess-the-goal", "mini-guess-the-goal", {
    en: {
      metaTitle: "Guess the Goal — Name the Scorer from the Clip",
      metaDescription: "Watch a famous goal, name who scored it. Five clips a day in QuizBall Guess the Goal.",
      title: "Guess the Goal",
      intro: "A goal clip with the scorer hidden. Watch, think, and name the player before the options run out.",
      howToPlay: ["Watch the clip.", "Pick or type the scorer.", "Five goals a day; fewer hints, more points."],
      reward: "Earn coins and XP every day you play.",
    },
    ka: {
      metaTitle: "გამოიცანი გოლი — დაასახელე ავტორი ვიდეოდან",
      metaDescription: "უყურე ცნობილ გოლს და დაასახელე, ვინ გაიტანა. ხუთი ვიდეო ყოველდღე.",
      title: "გამოიცანი გოლი",
      intro: "გოლის ვიდეო დამალული ავტორით. უყურე, დაფიქრდი და დაასახელე ფეხბურთელი.",
      howToPlay: ["უყურე ვიდეოს.", "აირჩიე ან ჩაწერე გოლის ავტორი.", "ხუთი გოლი დღეში; ნაკლები მინიშნება — მეტი ქულა."],
      reward: "დააგროვე მონეტები და XP ყოველდღე.",
    },
    es: {
      metaTitle: "Adivina el gol — Nombra al goleador por el clip",
      metaDescription: "Mira un gol famoso y nombra a quien lo marcó. Cinco clips al día en Adivina el gol.",
      title: "Adivina el gol",
      intro: "Un clip de gol con el autor oculto. Mira, piensa y nombra al jugador.",
      howToPlay: ["Mira el clip.", "Elige o escribe al goleador.", "Cinco goles al día; menos pistas, más puntos."],
      reward: "Gana monedas y XP cada día que juegues.",
    },
    tr: {
      metaTitle: "Golü Tahmin Et — Klipten Golcüyü Söyle",
      metaDescription: "Ünlü bir golü izle, kimin attığını söyle. QuizBall Golü Tahmin Et'te günde beş klip.",
      title: "Golü Tahmin Et",
      intro: "Golcüsü gizlenmiş bir gol klibi. İzle, düşün ve seçenekler bitmeden oyuncuyu söyle.",
      howToPlay: ["Klibi izle.", "Golcüyü seç ya da yaz.", "Günde beş gol; daha az ipucu, daha çok puan."],
      reward: "Oynadığın her gün jeton ve XP kazan.",
    },
  }),
];

export function findGamePage(section: GamePageSection, slug: string): GamePageEntry | null {
  return GAME_PAGES.find((entry) => entry.section === section && entry.slug === slug) ?? null;
}

export function gamePagePath(entry: GamePageEntry, locale: Locale): string {
  return `/${locale}/${entry.section}/${entry.slug}`;
}
