import { missingXiMatches } from "@/features/game-mode-lab/data/missingXi";
import { CHAIN_PLAYERS, CHAIN_PUZZLES, findChainPlayer, getPlayer, shareClub, solve } from "@/features/mini-games/data/passChain";
import type { PassChainLinkResult, PassChainPlayer } from "@/lib/domain/dailyChallenge";
import { getSniperRounds } from "@/features/mini-games/data/statSniper";
import type {
  CardDetectiveSession,
  DailyChallengeSession,
  DailyChallengeType,
  FootballLogicSession,
  MoneyDropSession,
} from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";
import { getI18nText } from "@/lib/utils/i18n";
import { getPoolSessions } from "./demoPoolSessions";
import type { FifaCardsSession } from "@/lib/domain/dailyChallenge";
import { FIFA_CARDS, PLAYABLE_EDITIONS } from "@/features/mini-games/data/guessFifaCard";
import { DEMO_QUESTIONS } from "./demoQuestions";

type L = Locale;

const EXTRA = {
  "Money Drop": {
    "es": "Money Drop",
    "tr": "Money Drop"
  },
  "Answer correctly to protect your money": {
    "es": "Responde bien para proteger tu dinero",
    "tr": "Paranı korumak için doğru cevapla"
  },
  "Football Logic": {
    "es": "Lógica futbolera",
    "tr": "Futbol Mantığı"
  },
  "Decode the player from the two pictures": {
    "es": "Descifra al jugador a partir de las dos imágenes",
    "tr": "İki resimden oyuncuyu çöz"
  },
  "Transfers": {
    "es": "Traspasos",
    "tr": "Transferler"
  },
  "Which player connects these two clubs with a world-record €222M transfer?": {
    "es": "¿Qué jugador une a estos dos clubes con un traspaso récord mundial de 222 M€?",
    "tr": "Hangi oyuncu bu iki kulübü 222 M€'luk dünya rekoru transferle birbirine bağlar?"
  },
  "Neymar": {
    "es": "Neymar",
    "tr": "Neymar"
  },
  "Neymar moved from Barcelona to PSG for €222M in 2017 — still the world record.": {
    "es": "Neymar pasó del Barcelona al PSG por 222 M€ en 2017: sigue siendo el récord mundial.",
    "tr": "Neymar 2017'de 222 M€'ya Barcelona'dan PSG'ye geçti — hâlâ dünya rekoru."
  },
  "Which striker famously moved between these two rivals on a free transfer in 2014?": {
    "es": "¿Qué delantero pasó entre estos dos rivales con un traspaso libre en 2014?",
    "tr": "Hangi forvet 2014'te bu iki rakip arasında bedelsiz transferle geçti?"
  },
  "Robert Lewandowski": {
    "es": "Robert Lewandowski",
    "tr": "Robert Lewandowski"
  },
  "Lewandowski left Dortmund for Bayern on a free in 2014 and became a Bundesliga legend.": {
    "es": "Lewandowski dejó el Dortmund por el Bayern gratis en 2014 y se convirtió en leyenda de la Bundesliga.",
    "tr": "Lewandowski 2014'te Dortmund'dan Bayern'e bedelsiz geçti ve bir Bundesliga efsanesi oldu."
  },
  "Which winger made a then-world-record move between these clubs in 2013?": {
    "es": "¿Qué extremo protagonizó en 2013 un traspaso entonces récord mundial entre estos clubes?",
    "tr": "Hangi kanat oyuncusu 2013'te bu kulüpler arasında o dönemin dünya rekoru transferini yaptı?"
  },
  "Gareth Bale": {
    "es": "Gareth Bale",
    "tr": "Gareth Bale"
  },
  "Bale joined Real Madrid from Tottenham for ~€100M in 2013 — a world record at the time.": {
    "es": "Bale fichó por el Real Madrid desde el Tottenham por unos 100 M€ en 2013, récord mundial entonces.",
    "tr": "Bale 2013'te Tottenham'dan ~100 M€'ya Real Madrid'e katıldı — o dönemde dünya rekoru."
  },
  "Which superstar moved between these clubs for a then-record £80M in 2009?": {
    "es": "¿Qué estrella pasó entre estos clubes por 80 M£, récord entonces, en 2009?",
    "tr": "Hangi süperstar 2009'da bu kulüpler arasında o dönemin rekoru 80 M£'a geçti?"
  },
  "Cristiano Ronaldo": {
    "es": "Cristiano Ronaldo",
    "tr": "Cristiano Ronaldo"
  },
  "Cristiano Ronaldo's 2009 move from United to Real Madrid was the world record for four years.": {
    "es": "El traspaso de Cristiano Ronaldo del United al Real Madrid en 2009 fue récord mundial durante cuatro años.",
    "tr": "Cristiano Ronaldo'nun 2009'da United'dan Real Madrid'e geçişi dört yıl boyunca dünya rekoruydu."
  },
  "Which striker left this London club for Barcelona in 2007?": {
    "es": "¿Qué delantero dejó este club londinense por el Barcelona en 2007?",
    "tr": "Hangi forvet 2007'de bu Londra kulübünden Barcelona'ya gitti?"
  },
  "Thierry Henry": {
    "es": "Thierry Henry",
    "tr": "Thierry Henry"
  },
  "Arsenal's all-time top scorer joined Barcelona in 2007 and won the treble there in 2009.": {
    "es": "El máximo goleador histórico del Arsenal fichó por el Barcelona en 2007 y ganó el triplete en 2009.",
    "tr": "Arsenal'in tüm zamanların en golcü oyuncusu 2007'de Barcelona'ya katıldı ve 2009'da üçlemeyi kazandı."
  },
  "Which Georgian star moved between these clubs in January 2025?": {
    "es": "¿Qué estrella georgiana pasó entre estos clubes en enero de 2025?",
    "tr": "Hangi Gürcü yıldız Ocak 2025'te bu kulüpler arasında geçti?"
  },
  "Khvicha Kvaratskhelia": {
    "es": "Khvicha Kvaratskhelia",
    "tr": "Khvicha Kvaratskhelia"
  },
  "Kvaradona swapped Naples for Paris in January 2025 and won the Champions League that spring.": {
    "es": "Kvaradona cambió Nápoles por París en enero de 2025 y ganó la Champions esa primavera.",
    "tr": "Kvaradona Ocak 2025'te Napoli'yi Paris'le değiştirdi ve o bahar Şampiyonlar Ligi'ni kazandı."
  },
  "Which midfielder returned between these clubs for a record £89M in 2016?": {
    "es": "¿Qué centrocampista regresó entre estos clubes por 89 M£, récord, en 2016?",
    "tr": "Hangi orta saha 2016'da bu kulüpler arasında rekor 89 M£'a geri döndü?"
  },
  "Paul Pogba": {
    "es": "Paul Pogba",
    "tr": "Paul Pogba"
  },
  "Pogba left United for free in 2012 and returned from Juventus for a then-world-record £89M.": {
    "es": "Pogba dejó el United gratis en 2012 y volvió desde la Juventus por 89 M£, récord mundial entonces.",
    "tr": "Pogba 2012'de United'dan bedelsiz ayrıldı ve Juventus'tan o dönemin dünya rekoru 89 M£'a döndü."
  },
  "Which Brazilian striker moved between these clubs in 2002 after winning the World Cup?": {
    "es": "¿Qué delantero brasileño pasó entre estos clubes en 2002 tras ganar el Mundial?",
    "tr": "Hangi Brezilyalı forvet 2002'de Dünya Kupası'nı kazandıktan sonra bu kulüpler arasında geçti?"
  },
  "Ronaldo Nazário": {
    "es": "Ronaldo Nazário",
    "tr": "Ronaldo Nazário"
  },
  "Fresh off his 2002 World Cup heroics, O Fenômeno joined the Galácticos from Inter.": {
    "es": "Recién coronado en el Mundial 2002, O Fenômeno llegó a los Galácticos desde el Inter.",
    "tr": "2002 Dünya Kupası kahramanlığının ardından O Fenômeno Inter'den Galácticos'a katıldı."
  },
  "Which French forward moved between these clubs in 2017 for €180M?": {
    "es": "¿Qué delantero francés pasó entre estos clubes en 2017 por 180 M€?",
    "tr": "Hangi Fransız forvet 2017'de 180 M€'ya bu kulüpler arasında geçti?"
  },
  "Kylian Mbappé": {
    "es": "Kylian Mbappé",
    "tr": "Kylian Mbappé"
  },
  "The teenage Mbappé left Monaco for PSG in the second-biggest transfer of all time.": {
    "es": "El adolescente Mbappé dejó el Mónaco por el PSG en el segundo traspaso más caro de la historia.",
    "tr": "Genç Mbappé, tüm zamanların en pahalı ikinci transferiyle Monaco'dan PSG'ye geçti."
  },
  "Which defender rose through this club's academy and later captained the other?": {
    "es": "¿Qué defensa salió de la cantera de este club y después fue capitán del otro?",
    "tr": "Hangi savunmacı bu kulübün akademisinden yetişti ve daha sonra diğerinin kaptanı oldu?"
  },
  "Sergio Ramos": {
    "es": "Sergio Ramos",
    "tr": "Sergio Ramos"
  },
  "Ramos left Sevilla for Real Madrid at 19 and captained them to four Champions League titles.": {
    "es": "Ramos dejó el Sevilla por el Real Madrid a los 19 y lo capitaneó a cuatro Champions.",
    "tr": "Ramos 19 yaşında Sevilla'dan Real Madrid'e geçti ve kaptan olarak dört Şampiyonlar Ligi kazandı."
  },
  "Missing XI": {
    "es": "XI perdido",
    "tr": "Kayıp XI"
  },
  "Tap a shirt and name the player who started there.": {
    "es": "Toca una camiseta y nombra al jugador que fue titular ahí.",
    "tr": "Bir formaya dokun ve orada ilk 11'de başlayan oyuncuyu söyle."
  },
  "Stat Sniper": {
    "es": "Stat Sniper",
    "tr": "Stat Sniper"
  },
  "Slide to your best guess.": {
    "es": "Desliza hasta tu mejor estimación.",
    "tr": "En iyi tahminine kaydır."
  },
  "Pass Chain": {
    "es": "Cadena de pases",
    "tr": "Pas Zinciri"
  },
  "Link two players through shared clubs.": {
    "es": "Conecta a dos jugadores a través de clubes en común.",
    "tr": "İki oyuncuyu ortak kulüpler üzerinden bağla."
  },
  "FIFA Cards": {
    "es": "Cartas FIFA",
    "tr": "FIFA Kartları"
  },
  "Card Detective": {
    "es": "Detective de cartas",
    "tr": "Kart Dedektifi"
  },
  "A gold card, stats only — name the player.": {
    "es": "Una carta dorada, solo estadísticas: nombra al jugador.",
    "tr": "Altın bir kart, sadece istatistikler — oyuncuyu söyle."
  },
  "Everything hidden, 100 clue coins — name the player using the least information.": {
    "es": "Todo oculto, 100 monedas de pista: nombra al jugador con la menor información posible.",
    "tr": "Her şey gizli, 100 ipucu jetonu — oyuncuyu en az bilgiyle söyle."
  }
} as const satisfies Record<string, { es: string; tr: string }>;
/** Display labels that the mini-game data keeps in English only. */
const MATCH_LABELS: Record<string, Record<L, string>> = {
  "vs Manchester United — 2011 Champions League Final": { en: "vs Manchester United — 2011 Champions League Final", ka: "მანჩესტერ იუნაიტედთან — 2011 ჩემპიონთა ლიგის ფინალი", es: "vs Manchester United — Final de la Champions 2011", tr: "Manchester United'a karşı — 2011 Şampiyonlar Ligi Finali" },
  "vs Juventus — 2017 Champions League Final": { en: "vs Juventus — 2017 Champions League Final", ka: "იუვენტუსთან — 2017 ჩემპიონთა ლიგის ფინალი", es: "vs Juventus — Final de la Champions 2017", tr: "Juventus'a karşı — 2017 Şampiyonlar Ligi Finali" },
  "vs France — 2022 World Cup Final": { en: "vs France — 2022 World Cup Final", ka: "საფრანგეთთან — 2022 მსოფლიო ჩემპიონატის ფინალი", es: "vs Francia — Final del Mundial 2022", tr: "Fransa'ya karşı — 2022 Dünya Kupası Finali" },
};
export const LEAGUE_LABELS: Record<string, Record<L, string>> = {
  "Liga Portugal": { en: "Liga Portugal", ka: "პორტუგალიის ლიგა", es: "Liga Portugal", tr: "Portekiz Ligi" },
  "Portuguese Liga ZON SAGRES": { en: "Portuguese Liga ZON SAGRES", ka: "პორტუგალიის ლიგა", es: "Liga portuguesa", tr: "Portekiz Ligi" },
  "Ligue 1 McDonald's": { en: "Ligue 1 McDonald's", ka: "ლიგა 1", es: "Ligue 1", tr: "Ligue 1" },
  "Major League Soccer": { en: "Major League Soccer", ka: "MLS", es: "MLS", tr: "MLS" },
  "USA Major League Soccer": { en: "USA Major League Soccer", ka: "MLS", es: "MLS", tr: "MLS" },
  "Pro League": { en: "Pro League", ka: "პრო ლიგა", es: "Pro League", tr: "Pro Lig" },
  "ROSHN Saudi League": { en: "ROSHN Saudi League", ka: "საუდის პრო ლიგა", es: "Liga Profesional Saudí", tr: "Suudi Pro Ligi" },
  "Russian Premier League": { en: "Russian Premier League", ka: "რუსეთის პრემიერ ლიგა", es: "Liga Premier rusa", tr: "Rusya Premier Ligi" },
  "Serie A Enilive": { en: "Serie A Enilive", ka: "სერია A", es: "Serie A", tr: "Serie A" },
  "Spain Primera Division": { en: "Spain Primera Division", ka: "ლა ლიგა", es: "LaLiga", tr: "La Liga" },
  "Turkish Süper Lig": { en: "Turkish Süper Lig", ka: "თურქეთის სუპერ ლიგა", es: "Süper Lig turca", tr: "Türkiye Süper Ligi" },
  "Premier League": { en: "Premier League", ka: "პრემიერ ლიგა", es: "Premier League", tr: "Premier Lig" },
  "Serie A": { en: "Serie A", ka: "სერია A", es: "Serie A", tr: "Serie A" },
  "Ligue 1": { en: "Ligue 1", ka: "ლიგა 1", es: "Ligue 1", tr: "Ligue 1" },
  "LaLiga": { en: "LaLiga", ka: "ლა ლიგა", es: "LaLiga", tr: "LaLiga" },
  "Eredivisie": { en: "Eredivisie", ka: "ერედივიზიე", es: "Eredivisie", tr: "Eredivisie" },
  "Primeira Liga": { en: "Primeira Liga", ka: "პრიმეირა ლიგა", es: "Primeira Liga", tr: "Primeira Liga" },
  "Süper Lig": { en: "Süper Lig", ka: "სუპერ ლიგა", es: "Süper Lig", tr: "Süper Lig" },
  "Saudi Pro League": { en: "Saudi Pro League", ka: "საუდის პრო ლიგა", es: "Liga Profesional Saudí", tr: "Suudi Pro Ligi" },
  "MLS": { en: "MLS", ka: "MLS", es: "MLS", tr: "MLS" },
  "English Premier League": { en: "English Premier League", ka: "ინგლისის პრემიერ ლიგა", es: "Premier League inglesa", tr: "İngiltere Premier Ligi" },
  "Italian Serie A": { en: "Italian Serie A", ka: "იტალიის სერია A", es: "Serie A italiana", tr: "İtalya Serie A" },
  "German 1. Bundesliga": { en: "German 1. Bundesliga", ka: "გერმანიის ბუნდესლიგა", es: "Bundesliga alemana", tr: "Almanya Bundesliga" },
  "Bundesliga": { en: "Bundesliga", ka: "ბუნდესლიგა", es: "Bundesliga", tr: "Bundesliga" },
  "French Ligue 1": { en: "French Ligue 1", ka: "საფრანგეთის ლიგა 1", es: "Ligue 1 francesa", tr: "Fransa Ligue 1" },
  "La Liga": { en: "La Liga", ka: "ლა ლიგა", es: "LaLiga", tr: "La Liga" },
  "LALIGA EA SPORTS": { en: "LALIGA EA SPORTS", ka: "ლა ლიგა", es: "LALIGA EA SPORTS", tr: "LALIGA EA SPORTS" },
  "Championship": { en: "Championship", ka: "ჩემპიონშიპი", es: "Championship", tr: "Championship" },
  "Holland Eredivisie": { en: "Holland Eredivisie", ka: "ნიდერლანდების ერედივიზიე", es: "Eredivisie neerlandesa", tr: "Hollanda Eredivisie" },
  "Argentina Primera División": { en: "Argentina Primera División", ka: "არგენტინის პრიმერა დივიზიონი", es: "Primera División argentina", tr: "Arjantin Primera División" },
  "Chinese Super League": { en: "Chinese Super League", ka: "ჩინეთის სუპერლიგა", es: "Superliga china", tr: "Çin Süper Ligi" },
  "Japanese J. League Division 1": { en: "Japanese J. League Division 1", ka: "იაპონიის J-ლიგა", es: "J. League japonesa", tr: "Japonya J. Ligi" },
};
const label = (table: Record<string, Record<L, string>>, locale: L, value: string) => table[value]?.[locale] ?? value;
type ExtraKey = keyof typeof EXTRA;
/** en/ka inline; es/tr from EXTRA. `en` must be a known key, so an English copy edit without its translations fails to compile. */
const pick = (locale: L, en: ExtraKey, ka: string): string => {
  if (locale === "ka") return ka;
  if (locale === "es" || locale === "tr") return EXTRA[en][locale];
  return en;
};

function moneyDropSession(locale: L): MoneyDropSession {
  return {
    challengeType: "moneyDrop",
    title: pick(locale, "Money Drop", "ფულის ვარდნა"),
    description: pick(
      locale,
      "Answer correctly to protect your money",
      "უპასუხე სწორად, რომ დაიცვა შენი თანხა",
    ),
    questionCount: 10,
    secondsPerQuestion: 20,
    startingMoney: 1000,
    questions: DEMO_QUESTIONS.slice(0, 10).map((q) => ({
      id: q.id,
      category: getI18nText(q.category, locale),
      difficulty: q.difficulty,
      prompt: getI18nText(q.prompt, locale),
      options: q.options.map((option) => getI18nText(option, locale)),
      correctAnswerIndex: q.correctIndex,
      clue: null,
    })),
  };
}








function footballLogicSession(locale: L): FootballLogicSession {
  return {
    challengeType: "footballLogic",
    title: pick(locale, "Football Logic", "საფეხბურთო ლოგიკა"),
    description: pick(
      locale,
      "Decode the player from the two pictures",
      "ამოიცანი ფეხბურთელი ორი სურათით",
    ),
    questionCount: 10,
    secondsPerQuestion: 25,
    questions: [
      {
        id: "demo-fl-1",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which player connects these two clubs with a world-record €222M transfer?",
          "რომელი ფეხბურთელი აკავშირებს ამ ორ კლუბს მსოფლიო რეკორდული €222-მილიონიანი ტრანსფერით?",
        ),
        imageAUrl: "/assets/demos/fl-fc-barcelona.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Neymar", "ნეიმარი"),
        acceptedAnswers: ["Neymar", "Neymar Jr", "ნეიმარი"],
        explanation: pick(
          locale,
          "Neymar moved from Barcelona to PSG for €222M in 2017 — still the world record.",
          "ნეიმარი 2017 წელს ბარსელონადან პსჟ-ში €222 მილიონად გადავიდა — დღემდე მსოფლიო რეკორდია.",
        ),
      },
      {
        id: "demo-fl-2",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which striker famously moved between these two rivals on a free transfer in 2014?",
          "რომელი თავდამსხმელი გადავიდა ამ ორ მეტოქეს შორის თავისუფალი ტრანსფერით 2014 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-borussia-dortmund.png",
        imageBUrl: "/assets/demos/fl-bayern-munich.png",
        displayAnswer: pick(locale, "Robert Lewandowski", "რობერტ ლევანდოვსკი"),
        acceptedAnswers: [
          "Robert Lewandowski",
          "Lewandowski",
          "რობერტ ლევანდოვსკი",
          "ლევანდოვსკი",
        ],
        explanation: pick(
          locale,
          "Lewandowski left Dortmund for Bayern on a free in 2014 and became a Bundesliga legend.",
          "ლევანდოვსკიმ 2014 წელს დორტმუნდი ბაიერნზე თავისუფალი ტრანსფერით გაცვალა და ბუნდესლიგის ლეგენდა გახდა.",
        ),
      },
      {
        id: "demo-fl-3",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which winger made a then-world-record move between these clubs in 2013?",
          "რომელი ვინგერი გადავიდა ამ ორ კლუბს შორის მაშინდელი მსოფლიო რეკორდით 2013 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-tottenham-hotspur.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Gareth Bale", "გარეთ ბეილი"),
        acceptedAnswers: ["Gareth Bale", "Bale", "გარეთ ბეილი", "ბეილი"],
        explanation: pick(
          locale,
          "Bale joined Real Madrid from Tottenham for ~€100M in 2013 — a world record at the time.",
          "ბეილი ტოტენჰემიდან რეალში ~€100 მილიონად გადავიდა 2013 წელს — მაშინდელი მსოფლიო რეკორდი.",
        ),
      },
      {
        id: "demo-fl-4",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which superstar moved between these clubs for a then-record £80M in 2009?",
          "რომელი ვარსკვლავი გადავიდა ამ ორ კლუბს შორის მაშინდელი რეკორდული £80 მილიონად 2009 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-manchester-united.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ"),
        acceptedAnswers: ["Cristiano Ronaldo", "Ronaldo", "CR7", "კრიშტიანუ რონალდუ", "რონალდუ"],
        explanation: pick(
          locale,
          "Cristiano Ronaldo's 2009 move from United to Real Madrid was the world record for four years.",
          "კრიშტიანუ რონალდუს 2009 წლის ტრანსფერი იუნაიტედიდან რეალში ოთხი წლის განმავლობაში მსოფლიო რეკორდი იყო.",
        ),
      },
      {
        id: "demo-fl-5",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which striker left this London club for Barcelona in 2007?",
          "რომელმა თავდამსხმელმა დატოვა ეს ლონდონური კლუბი ბარსელონასთვის 2007 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-arsenal-fc.png",
        imageBUrl: "/assets/demos/fl-fc-barcelona.png",
        displayAnswer: pick(locale, "Thierry Henry", "ტიერი ანრი"),
        acceptedAnswers: ["Thierry Henry", "Henry", "ტიერი ანრი", "ანრი"],
        explanation: pick(
          locale,
          "Arsenal's all-time top scorer joined Barcelona in 2007 and won the treble there in 2009.",
          "არსენალის ისტორიის საუკეთესო ბომბარდირი 2007 წელს ბარსელონას შეუერთდა და 2009 წელს ტრებლი მოიგო.",
        ),
      },
      {
        id: "demo-fl-6",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which Georgian star moved between these clubs in January 2025?",
          "რომელი ქართველი ვარსკვლავი გადავიდა ამ ორ კლუბს შორის 2025 წლის იანვარში?",
        ),
        imageAUrl: "/assets/demos/fl-ssc-napoli.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Khvicha Kvaratskhelia", "ხვიჩა კვარაცხელია"),
        acceptedAnswers: [
          "Khvicha Kvaratskhelia",
          "Kvaratskhelia",
          "Kvara",
          "ხვიჩა კვარაცხელია",
          "კვარაცხელია",
          "ხვიჩა",
        ],
        explanation: pick(
          locale,
          "Kvaradona swapped Naples for Paris in January 2025 and won the Champions League that spring.",
          "კვარადონამ 2025 წლის იანვარში ნეაპოლი პარიზზე გაცვალა და იმავე გაზაფხულზე ჩემპიონთა ლიგა მოიგო.",
        ),
      },
      {
        id: "demo-fl-7",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which midfielder returned between these clubs for a record £89M in 2016?",
          "რომელი ნახევარმცველი დაბრუნდა ამ ორ კლუბს შორის რეკორდული £89 მილიონად 2016 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-juventus-fc.png",
        imageBUrl: "/assets/demos/fl-manchester-united.png",
        displayAnswer: pick(locale, "Paul Pogba", "პოლ პოგბა"),
        acceptedAnswers: ["Paul Pogba", "Pogba", "პოლ პოგბა", "პოგბა"],
        explanation: pick(
          locale,
          "Pogba left United for free in 2012 and returned from Juventus for a then-world-record £89M.",
          "პოგბამ იუნაიტედი უფასოდ დატოვა 2012-ში და იუვენტუსიდან მაშინდელი მსოფლიო რეკორდით, £89 მილიონად დაბრუნდა.",
        ),
      },
      {
        id: "demo-fl-8",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which Brazilian striker moved between these clubs in 2002 after winning the World Cup?",
          "რომელი ბრაზილიელი თავდამსხმელი გადავიდა ამ ორ კლუბს შორის 2002 წელს, მსოფლიო ჩემპიონატის მოგების შემდეგ?",
        ),
        imageAUrl: "/assets/demos/fl-inter-milan.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Ronaldo Nazário", "რონალდო ნაზარიო"),
        acceptedAnswers: ["Ronaldo Nazario", "Ronaldo", "R9", "რონალდო ნაზარიო", "რონალდო"],
        explanation: pick(
          locale,
          "Fresh off his 2002 World Cup heroics, O Fenômeno joined the Galácticos from Inter.",
          "2002 წლის მუნდიალის გმირობის შემდეგ „ფენომენი“ ინტერიდან „გალაქტიკოსებს“ შეუერთდა.",
        ),
      },
      {
        id: "demo-fl-9",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which French forward moved between these clubs in 2017 for €180M?",
          "რომელი ფრანგი თავდამსხმელი გადავიდა ამ ორ კლუბს შორის 2017 წელს €180 მილიონად?",
        ),
        imageAUrl: "/assets/demos/fl-as-monaco.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Kylian Mbappé", "კილიან მბაპე"),
        acceptedAnswers: ["Kylian Mbappe", "Mbappe", "კილიან მბაპე", "მბაპე"],
        explanation: pick(
          locale,
          "The teenage Mbappé left Monaco for PSG in the second-biggest transfer of all time.",
          "თინეიჯერმა მბაპემ მონაკო პსჟ-ზე გაცვალა — ისტორიაში სიდიდით მეორე ტრანსფერით.",
        ),
      },
      {
        id: "demo-fl-10",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which defender rose through this club's academy and later captained the other?",
          "რომელი მცველი გაიზარდა ამ კლუბის აკადემიაში და მოგვიანებით მეორის კაპიტანი გახდა?",
        ),
        imageAUrl: "/assets/demos/fl-sevilla-fc.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Sergio Ramos", "სერხიო რამოსი"),
        acceptedAnswers: ["Sergio Ramos", "Ramos", "სერხიო რამოსი", "რამოსი"],
        explanation: pick(
          locale,
          "Ramos left Sevilla for Real Madrid at 19 and captained them to four Champions League titles.",
          "რამოსმა 19 წლისამ სევილია რეალზე გაცვალა და კაპიტნად ოთხი ჩემპიონთა ლიგა მოიგო.",
        ),
      },
    ],
  };
}

const toDemoChainPlayer = (p: (typeof CHAIN_PLAYERS)[number]): PassChainPlayer => ({ id: p.id, name: p.name, clubs: p.clubs, imageUrl: null });

/** Demo chains resolve client-side against the prototype's small graph; the real daily asks the API. */
export async function resolveDemoPassChainLink(fromPlayerId: string, text: string, targetId: string): Promise<PassChainLinkResult> {
  const from = getPlayer(fromPlayerId);
  const target = getPlayer(targetId);
  const candidate = findChainPlayer(text);
  const none = { player: null, viaClub: null, viaKind: null, reachesTarget: false, targetClub: null, targetKind: null };
  if (!from || !target) return { status: "unknown", ...none };
  if (!candidate) return { status: "unknown", ...none };
  const via = shareClub(from, candidate);
  if (!via || candidate.id === from.id) return { status: "noLink", ...none };
  const toTarget = candidate.id === target.id ? via : shareClub(candidate, target);
  return { status: "linked", player: toDemoChainPlayer(candidate), viaClub: via, viaKind: "club", reachesTarget: Boolean(toTarget), targetClub: toTarget, targetKind: toTarget ? "club" : null };
}

function statSniperSession(locale: Locale): DailyChallengeSession {
  const rounds = getSniperRounds(locale);
  return {
    challengeType: "statSniper",
    title: pick(locale, "Stat Sniper", "სტატ-სნაიპერი"),
    description: pick(locale, "Slide to your best guess.", "მიიტანე სლაიდერი შენს ვარაუდამდე."),
    questionCount: rounds.length,
    secondsPerQuestion: 30,
    questions: rounds.map((r, i) => ({ id: `demo-stat-sniper-${i}`, difficulty: "easy" as const, kind: "demo", prompt: r.prompt, unit: r.unit, value: r.value, min: r.min, max: r.max, step: r.step })),
  };
}

function passChainSession(locale: Locale): DailyChallengeSession {
  const puzzles = CHAIN_PUZZLES.slice(0, 2).map((puzzle, index) => {
    const start = getPlayer(puzzle.startId)!;
    const target = getPlayer(puzzle.endId)!;
    const par = solve(puzzle.startId, puzzle.endId);
    // one bridge that the prototype graph guarantees for par-2 puzzles
    const bridge = CHAIN_PLAYERS.find((p) => p.id !== start.id && p.id !== target.id && shareClub(start, p) && shareClub(p, target));
    return {
      id: `demo-pass-chain-${index}`,
      difficulty: index === 0 ? ("easy" as const) : ("medium" as const),
      par: Number.isFinite(par) ? par : 2,
      start: toDemoChainPlayer(start),
      target: toDemoChainPlayer(target),
      solution: bridge ? [{ player: toDemoChainPlayer(bridge), via: shareClub(start, bridge) ?? "", kind: "club" as const }] : [],
    };
  });
  return {
    challengeType: "passChain",
    title: pick(locale, "Pass Chain", "პასების ჯაჭვი"),
    description: pick(locale, "Link two players through shared clubs.", "დააკავშირე ორი ფეხბურთელი საერთო კლუბებით."),
    puzzleCount: puzzles.length,
    secondsPerPuzzle: 120,
    puzzles,
  };
}

function missingXiSession(locale: Locale): DailyChallengeSession {
  // Prototype squads until the demo pool carries missing_xi rows.
  return {
    challengeType: "missingXi",
    title: pick(locale, "Missing XI", "დაკარგული XI"),
    description: pick(locale, "Tap a shirt and name the player who started there.", "დააჭირე მაისურს და დაასახელე, ვინ დაიწყო იქ."),
    squadCount: missingXiMatches.length,
    secondsPerSquad: 120,
    squads: missingXiMatches.map((match) => ({
      id: `00000000-0000-4000-8000-${match.id.padStart(12, "0").slice(-12)}`,
      difficulty: "easy",
      team: match.teamName,
      opponent: match.matchLabel.replace(/^vs\s+/, "").split(" — ")[0] ?? "",
      matchLabel: label(MATCH_LABELS, locale, match.matchLabel),
      score: null,
      formation: match.formation,
      slots: match.slots.map((slot) => ({
        id: slot.id,
        position: slot.position,
        number: slot.shirtNumber,
        x: slot.x,
        y: slot.y,
        name: slot.name,
        acceptedAnswers: [slot.name, ...slot.aliases],
        imageUrl: null,
      })),
    })),
  };
}

export function buildDemoDailySession(
  type: DailyChallengeType,
  locale: Locale,
): DailyChallengeSession {
  // Sessions come from the real published question pool (demoPoolSessions)
  // wherever the pool has native content for the type. moneyDrop keeps the
  // pool MCQ fixture; footballLogic keeps curated club riddles because the
  // pool's footballLogic rows still carry placeholder images.
  const pool = getPoolSessions(locale);
  switch (type) {
    case "moneyDrop":
      return moneyDropSession(locale);
    case "trueFalse":
      return pool.trueFalse;
    case "clues":
      return pool.clues;
    case "countdown":
      return pool.countdown;
    case "putInOrder":
      return pool.putInOrder;
    case "imposter":
      return pool.imposter;
    case "careerPath":
      return pool.careerPath;
    case "highLow":
      return pool.highLow;
    case "footballLogic":
      return footballLogicSession(locale);
    case "fifaCards": // replaced by Card Detective; the type only lives on for completion history
    case "cardDetective":
      return cardDetectiveSession(locale);
    case "missingXi":
      return missingXiSession(locale);
    case "passChain":
      return passChainSession(locale);
    case "statSniper":
      return statSniperSession(locale);
  }
}

/**
 * Demo FIFA Cards round from the bundled free-play dataset: the top-rated card
 * of each playable edition, ten in total. Faces use the proxy's dataset
 * allowlist (no signature needed for bundled cards).
 */
function fifaCardsSession(locale: Locale): FifaCardsSession {
  const cards = PLAYABLE_EDITIONS
    .map((edition) => FIFA_CARDS.filter((card) => card.edition === edition).sort((a, b) => b.overall - a.overall)[0])
    .filter((card) => card != null)
    .slice(0, 10);
  return {
    challengeType: "fifaCards",
    title: pick(locale, "FIFA Cards", "FIFA ბარათები"),
    description: pick(locale, "A gold card, stats only — name the player.", "ოქროს ბარათი მხოლოდ სტატისტიკით — გამოიცანი მოთამაშე."),
    cardCount: cards.length,
    pointsPerSolve: 10,
    cards: cards.map((card) => ({
      id: card.id,
      edition: card.edition,
      editionLabel: card.editionLabel,
      name: card.name,
      acceptedAnswers: card.accepted,
      overall: card.overall,
      position: card.position,
      nation: card.nation,
      nationCode: card.nationCode,
      league: label(LEAGUE_LABELS, locale, card.league),
      club: card.club,
      stats: card.stats,
      faceUrl: card.photoId ? `/api/fifa-face?id=${card.photoId}&v=${card.photoVer}` : null,
      difficulty: card.overall >= 88 ? "easy" : card.overall >= 85 ? "medium" : "hard",
    })),
  };
}

/** Demo Card Detective round: the same ten bundled cards as the FIFA Cards demo, with the daily's clue prices. */
function cardDetectiveSession(locale: Locale): CardDetectiveSession {
  const base = fifaCardsSession(locale);
  return {
    challengeType: "cardDetective",
    title: pick(locale, "Card Detective", "ბარათის დეტექტივი"),
    description: pick(locale, "Everything hidden, 100 clue coins — name the player using the least information.", "ყველაფერი დამალულია, 100 მინიშნების ქოინი — გამოიცანი მოთამაშე მინიმალური ინფორმაციით."),
    cardCount: base.cards.length,
    startCoins: 100,
    clueCosts: { rating: 25, club: 20, league: 15, nation: 10, position: 10, pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 },
    wrongGuessCost: 15,
    cards: base.cards,
  };
}

/**
 * Sneak-peek lengths for the public game pages: one complete unit of the
 * mechanic (a squad, a puzzle, a round) or a handful of questions — enough to
 * understand the format, short enough to finish in a minute. Count fields are
 * kept consistent with the sliced content so every engine's progress UI is right.
 */
const PEEK_QUESTIONS = 5;
// The page copy promises ten numbers a day; the bundled bank holds exactly ten.
const PEEK_SNIPER_QUESTIONS = 10;
const PEEK_CLUES = 2;
const PEEK_CAREER_PATHS = 3;
const PEEK_CARDS = 2;

export function toSneakPeekSession(session: DailyChallengeSession): DailyChallengeSession {
  switch (session.challengeType) {
    case "moneyDrop":
    case "trueFalse":
    case "imposter":
    case "footballLogic": {
      const questions = session.questions.slice(0, PEEK_QUESTIONS);
      return { ...session, questions, questionCount: questions.length } as DailyChallengeSession;
    }
    case "statSniper": {
      const questions = session.questions.slice(0, PEEK_SNIPER_QUESTIONS);
      return { ...session, questions, questionCount: questions.length } as DailyChallengeSession;
    }
    case "clues": {
      const questions = session.questions.slice(0, PEEK_CLUES);
      return { ...session, questions, questionCount: questions.length };
    }
    case "careerPath": {
      const questions = session.questions.slice(0, PEEK_CAREER_PATHS);
      return { ...session, questions, questionCount: questions.length };
    }
    case "countdown":
    case "highLow": {
      const rounds = session.rounds.slice(0, 1);
      return { ...session, rounds, roundCount: rounds.length } as DailyChallengeSession;
    }
    case "putInOrder": {
      const rounds = session.rounds.slice(0, 1);
      return { ...session, rounds, roundCount: rounds.length };
    }
    case "missingXi": {
      const squads = session.squads.slice(0, 1);
      return { ...session, squads, squadCount: squads.length };
    }
    case "passChain": {
      const puzzles = session.puzzles.slice(0, 1);
      return { ...session, puzzles, puzzleCount: puzzles.length };
    }
    case "cardDetective": {
      const cards = session.cards.slice(0, PEEK_CARDS);
      return { ...session, cards, cardCount: cards.length };
    }
    case "fifaCards":
      return session;
  }
}
