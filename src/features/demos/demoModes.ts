import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";
import { FIFA_MODES } from "@/features/fifa-universe/registry";

export type DemoI18nText = { en: string; ka: string; es?: string; tr?: string; ru?: string };

export interface DemoModeCard {
  slug: string;
  title: DemoI18nText;
  description: DemoI18nText;
  group: "featured" | "daily";
  dailyType?: DailyChallengeType;
}

// The 1v1 training match demo is hidden from the hub for now — it will be
// continued as a separate feature. The /demos/match route (DemoTraining)
// stays wired so it can still be reached directly.
const HIDDEN_DEMO_MODES: DemoModeCard[] = [
  // The live Guess the Goal runs on its own public page (guest session) and /guess-the-goal, not through the demo hub.
  {
    slug: "guess-the-goal",
    title: { en: "Guess the Goal", ka: "გამოიცანი გოლი", es: "Adivina el gol", tr: "Golü Tahmin Et", ru: "Угадай гол" },
    description: {
      en: "A legendary goal replays on the tactics board. Name it, then watch the clip.",
      ka: "ლეგენდარული გოლი ტაქტიკურ დაფაზე მეორდება. გამოიცანი და ნახე ვიდეო.",
      es: "Un gol legendario se repite en la pizarra táctica. Adivínalo y mira el clip.",
      tr: "Efsane bir gol taktik tahtasında yeniden oynanıyor. Bil, sonra klibi izle.",
      ru: "Легендарный гол повторяется на тактической доске. Угадай его, а потом посмотри видео.",
    },
    group: "daily",
  },
  // Buscaminas futbolero runs on its own public page and /buscaminas, not through the demo hub.
  {
    slug: "buscaminas",
    title: { en: "Football Minesweeper", ka: "საფეხბურთო მაღაროები", es: "Buscaminas futbolero", tr: "Futbol Mayın Tarlası", ru: "Футбольный сапер", },
    description: {
      en: "16 players, 12 fit the clue, 4 are mines. 20 rounds a day.",
      ka: "16 მოთამაშე, 12 შეესაბამება, 4 მაღაროა. დღეში 20 რაუნდი.",
      es: "16 jugadores, 12 cumplen la consigna, 4 son minas. 20 rondas por día.",
      tr: "16 oyuncu, 12'si uyar, 4'ü mayın. Günde 20 tur.",
      ru: "16 игроков: 12 подходят под описание, 4 — мины. 20 раундов в день.",
    },
    group: "daily",
  },
  {
    slug: "pistas",
    title: { en: "Football Clues", ka: "საფეხბურთო მინიშნებები", es: "Pistas futboleras", tr: "Futbolcu Tahmin Etme Oyunu", ru: "Футбольные подсказки", },
    description: {
      en: "10 players a day, 10 clues each. Guess early for more points.",
      ka: "დღეში 10 მოთამაშე, თითოეულს 10 მინიშნება. რაც ადრე გამოიცნობ, მით მეტი ქულა.",
      es: "10 jugadores por día, 10 pistas cada uno. Adiviná antes y sumás más.",
      tr: "Günde 10 oyuncu, her birine 10 ipucu. Erken bil, daha çok puan al.",
      ru: "10 игроков в день, по 10 подсказок на каждого. Угадывай быстрее, чтобы получить больше очков.",
    },
    group: "daily",
  },
  {
    slug: "minuto",
    title: { en: "What Minute?", ka: "რომელ წუთზე?", es: "¿En qué minuto?", tr: "Kaçıncı Dakika?", ru: "На какой минуте?", },
    description: {
      en: "10 famous goals a day: guess the minute each one went in.",
      ka: "დღეში 10 ცნობილი გოლი: გამოიცანი, რომელ წუთზე გავიდა.",
      es: "10 goles famosos por día: adiviná en qué minuto entró cada uno.",
      tr: "Her gün 10 ünlü gol: kaçıncı dakikada atıldığını tahmin et.",
      ru: "Каждый день — 10 знаменитых голов: угадай, на какой минуте забили каждый.",
    },
    group: "daily",
  },
  {
    slug: "shared-player",
    title: { en: "Played for Both", ka: "საერთო ფეხბურთელი", es: "Jugador en común", tr: "Ortak Futbolcu", ru: "Играл за обоих", },
    description: {
      en: "Two clubs, 20 seconds: name a footballer who played for both. 10 pairs a day.",
      ka: "ორი კლუბი, 20 წამი: დაასახელე ფეხბურთელი, რომელმაც ორივეში ითამაშა. დღეში 10 წყვილი.",
      es: "Dos clubes, 20 segundos: nombrá un futbolista que jugó en los dos. 10 pares por día.",
      tr: "İki kulüp, 20 saniye: ikisinde de oynamış bir futbolcu yaz. Günde 10 eşleşme.",
      ru: "Два клуба, 20 секунд: назови футболиста, который играл за оба. Каждый день — 10 пар.",
    },
    group: "daily",
  },
  {
    slug: "tenable",
    title: { en: "Football Tenable", ka: "ფეხბურთის ტოპ 10", es: "Adivina el Top 10", tr: "Futbol Top 10", ru: "Угадай топ-10" },
    description: {
      en: "One hidden top 10 a day. Name who is on it before the tower beats you.",
      ka: "ყოველდღე ერთი დამალული ტოპ 10. დაასახელე, ვინ არის მასში.",
      es: "Un top 10 oculto por día. Nombrá a los que están antes de que gane la torre.",
      tr: "Her gün gizli bir Top 10. Kule kazanmadan listedekileri bul.",
      ru: "Каждый день — скрытый топ-10. Назови тех, кто в нём, пока башня не победила.",
    },
    group: "daily",
  },
  {
    slug: "name-chain",
    title: { en: "Football Name Chain", ka: "ფეხბურთელობანა", es: "Cadena de futbolistas", tr: "Son Harfle Futbolcu", ru: "Цепочка футболистов", },
    description: {
      en: "Name a footballer starting with the last letter of the previous one. 3 chains a day.",
      ka: "დაასახელე ფეხბურთელი წინა სახელის ბოლო ასოზე. დღეში 3 ჯაჭვი.",
      es: "Nombrá un futbolista que empiece con la última letra del anterior. 3 cadenas por día.",
      tr: "Bir öncekinin son harfiyle başlayan futbolcuyu yaz. Günde 3 zincir.",
      ru: "Назови футболиста, имя которого начинается на последнюю букву имени предыдущего. Каждый день — 3 цепочки.",
    },
    group: "daily",
  },
  {
    slug: "football-horserace",
    title: { en: "Football Horserace", ka: "ფეხბურთის დოღი", es: "Carrera de caballos futbolera", tr: "Futbol At Yarışı", ru: "Футбольные скачки" },
    description: {
      en: "Your nation against three: pick the stats it leads and race to the line. One race a day.",
      ka: "შენი ნაკრები სამის წინააღმდეგ: აირჩიე სტატისტიკა, რომელშიც ლიდერობს, და მიდი ფინიშისკენ. ერთი დოღი დღეში.",
      es: "Tu selección contra tres: elegí las estadísticas que lidera y corré hasta la meta. Una carrera por día.",
      tr: "Milli takımın üç rakibe karşı: önde olduğu istatistikleri seç ve çizgiye koş. Günde bir yarış.",
      ru: "Твоя сборная против трёх: выбирай статистику, где она лидирует, и мчись к финишу. Одна гонка в день.",
    },
    group: "daily",
  },
  {
    slug: "ultimo",
    title: { en: "Last Answer Standing", ka: "ბოლომდე დარჩენილი", es: "Último en pie futbolero", tr: "Futbolcu Sayma Oyunu", ru: "Последний ответ", },
    description: {
      en: "5 football lists a day. Name answers before the shrinking clock runs out.",
      ka: "დღეში 5 საფეხბურთო სია. დაასახელე პასუხები, სანამ დრო ამოიწურება.",
      es: "5 listas futboleras por día. Nombrá respuestas antes de que se acabe el reloj.",
      tr: "Günde 5 futbol listesi. Kısalan süre bitmeden cevapları say.",
      ru: "5 футбольных списков в день. Называй ответы, пока не вышло время на таймере.",
    },
    group: "daily",
  },
  {
    slug: "match",
    title: { en: "1v1 Match", ka: "1v1 მატჩი", es: "Partido 1v1", tr: "1v1 Maç", ru: "Матч 1 на 1", },
    description: {
      en: "The flagship head-to-head quiz duel — bans, halves and a live scoreboard.",
      ka: "მთავარი რეჟიმი — პირისპირ ქვიზ-დუელი ბანებით, ტაიმებით და ცოცხალი ანგარიშით.",
      es: "El duelo de fútbol definitivo cara a cara: prohibiciones, mitades y un marcador en vivo.",
      tr: "Amiral gemisi kafa kafaya bilgi düellosu — yasaklar, devreler ve canlı skor tablosu.",
      ru: "Главная дуэль в формате викторины: баны, таймы и счет в реальном времени.",
    },
    group: "featured",
  },
];

export const FEATURED_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "weekend-league",
    title: { en: "Weekend League", ka: "შაბათ-კვირის ლიგა", es: "Weekend League", tr: "Weekend League", ru: "Weekend League", },
    description: {
      en: "Live multiplayer tournament — 1,000 players answer the same quiz at the same time.",
      ka: "ლაივ მულტიპლეიერ ტურნირი — 1000 მოთამაშე ერთდროულად პასუხობს ერთსა და იმავე კითხვებს.",
      es: "Torneo multijugador en vivo: 1.000 jugadores responden el mismo quiz al mismo tiempo.",
      tr: "Canlı çok oyunculu turnuva — 1.000 oyuncu aynı anda aynı bilgi yarışmasına katılıyor.",
      ru: "Сетевой турнир в прямом эфире: 1000 игроков отвечают на одни и те же вопросы одновременно.",
    },
    group: "featured",
  },
  {
    slug: "auction",
    title: { en: "Auction", ka: "აუქციონი", es: "Subasta futbolera", tr: "Müzayede", ru: "Аукцион", },
    description: {
      en: "Bid against rivals to sign mystery footballers and build the best squad.",
      ka: "ივაჭრე მეტოქეების წინააღმდეგ იდუმალ ფეხბურთელებზე და ააწყვე საუკეთესო გუნდი.",
      es: "Puja contra rivales para fichar futbolistas misteriosos y formar la mejor plantilla.",
      tr: "Gizemli futbolcuları transfer etmek ve en iyi kadroyu kurmak için rakiplerine karşı teklif ver.",
      ru: "Делай ставки против соперников, чтобы подписать секретных футболистов и собрать лучший состав.",
    },
    group: "featured",
  },
];

// Prototype mini-games (features/mini-games) — self-contained, no backend.
// In-game copy is English-only for now (prototypes); hub cards are bilingual.
const ALL_MINI_GAME_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "mini-final-third",
    title: { en: "Free Kicks", ka: "თავისუფალი დარტყმები", es: "Tiros Libres", tr: "Free Kicks", ru: "Штрафные удары", },
    description: {
      en: "Know football, read the goal, take the shot — cash out or ride the multiplier.",
      ka: "ფეხბურთის ცოდნით ამოიცანი მეკარის ზონა და დაარტყი — აიღე მოგება ან გარისკე მეტ მამრავლზე.",
      es: "Lee el partido, marca el gol, tira a puerta: cobra o sube el multiplicador.",
      tr: "Futbolu bil, golü oku, şutu çek — nakde çevir veya çarpanla devam et.",
      ru: "Знай футбол, читай ворота, бей — забирай выигрыш или рискни ради множителя.",
    },
    group: "featured",
  },
  {
    slug: "mini-road-to-goal",
    title: { en: "Road to Goal", ka: "გზა გოლისკენ", es: "Road to Goal", tr: "Road to Goal", ru: "Путь к воротам", },
    description: {
      en: "Beat 11 defenders with 11 football questions — bank each zone or risk the tackle.",
      ka: "აჯობე 11 მცველს 11 საფეხბურთო კითხვით — აიღე მოგება ან გარისკე ჩაჭრაზე.",
      es: "Supera a 11 defensas con 11 preguntas de fútbol: asegura cada zona o arriesga la entrada.",
      tr: "11 futbol sorusuyla 11 savunmacıyı yen — her bölgeyi banka hesabına ekle veya top kapma riskini al.",
      ru: "Обыграй 11 защитников, ответив на 11 вопросов — сохраняй прогресс в зонах или рискуй всем.",
    },
    group: "featured",
  },
  {
    slug: "mini-squad-spin",
    title: { en: "Squad Spin", ka: "Squad Spin", es: "Ruleta futbolera", tr: "Futbol Çarkı", ru: "Спин состава", },
    description: {
      en: "Spin the reels — club, position, nation — then name a player who fits.",
      ka: "დაატრიალე — კლუბი, პოზიცია, ქვეყანა — და დაასახელე შესაბამისი ფეხბურთელი.",
      es: "Gira las tragaperras: club, posición, nación; luego nombra a un jugador que encaje.",
      tr: "Çarkları çevir — kulüp, pozisyon, ülke — sonra uyumlu bir oyuncu adı söyle.",
      ru: "Крути барабаны — клуб, позиция, страна — и назови подходящего игрока.",
    },
    group: "featured",
  },
  {
    slug: "mini-trivia-spin",
    title: { en: "Trivia Spin", ka: "Trivia Spin", es: "Trivia Spin", tr: "Trivia Çarkı", ru: "Trivia Spin", },
    description: {
      en: "Answer to earn spins, then let the wheel decide your payout.",
      ka: "უპასუხე, მოაგროვე დატრიალებები და ბორბალმა გადაწყვიტოს შენი მოგება.",
      es: "Responde para ganar giros, luego deja que la rueda decida tu premio.",
      tr: "Kazançlarını belirleyecek çarkı çevirmek için cevap ver.",
      ru: "Отвечай, чтобы получить спины, и пусть колесо определит твой выигрыш.",
    },
    group: "featured",
  },
  {
    slug: "mini-penalty-shootout",
    title: { en: "Penalty Shootout", ka: "პენალტების სერია", es: "Tanda de penaltis", tr: "Penaltı Atışları", ru: "Серия пенальти", },
    description: {
      en: "Answer to earn a shot, pick your corner against the keeper — five rounds.",
      ka: "უპასუხე, მოიგე დარტყმა და აირჩიე კუთხე მეკარის წინააღმდეგ — ხუთი რაუნდი.",
      es: "Responde para ganar un tiro, elige tu esquina contra el portero: cinco rondas.",
      tr: "Bir şut kazanmak için cevap ver, kaleciye karşı köşeni seç — beş tur.",
      ru: "Отвечай, чтобы пробить по воротам, и выбери угол — впереди пять раундов.",
    },
    group: "featured",
  },
  {
    slug: "mini-daily-jackpot",
    title: { en: "Daily Jackpot", ka: "Daily Jackpot", es: "Jackpot Diario", tr: "Günlük Jackpot", ru: "Ежедневный джекпот", },
    description: {
      en: "One hard question a day — a pot that climbs until someone cracks it.",
      ka: "დღეში ერთი რთული კითხვა — ჯექპოტი იზრდება, სანამ ვინმე გატეხავს.",
      es: "Una pregunta difícil al día: un bote que sube hasta que alguien lo gana.",
      tr: "Günde bir zor soru — biri kırana kadar artan bir pot.",
      ru: "Один сложный вопрос в день — банк растет, пока кто-то его не заберет.",
    },
    group: "featured",
  },
  {
    slug: "mini-pass-chain",
    title: { en: "Pass Chain", ka: "Pass Chain", es: "Conectando jugadores", tr: "Futbolcu Bağlantı Zinciri", ru: "Цепочка пасов", },
    description: {
      en: "Link two players through shared clubs — fewer links score higher.",
      ka: "დააკავშირე ორი ფეხბურთელი საერთო კლუბებით — ნაკლები რგოლი, მეტი ქულა.",
      es: "Enlaza dos jugadores por clubes compartidos: menos enlaces, mayor puntuación.",
      tr: "Ortak kulüpler aracılığıyla iki oyuncuyu bağla — daha az bağlantı daha yüksek puan alır.",
      ru: "Свяжи двух игроков через общие клубы — чем меньше звеньев, тем выше балл.",
    },
    group: "featured",
  },
  {
    slug: "mini-accumulator",
    title: { en: "Accumulator", ka: "ექსპრესი", es: "Acumulador", tr: "Kombine", ru: "Аккумулятор", },
    description: {
      en: "Pick 5 legs, one stake, all must land — odds multiply, cash out late.",
      ka: "აირჩიე 5 პასუხი ერთი ფსონით — კოეფიციენტები მრავლდება, დროულად დააქეშაუთე.",
      es: "Elige 5 partidos, una apuesta, todos deben acertar: las cuotas se multiplican, cobra tarde.",
      tr: "5 maç seç, tek bahis, hepsi tutmalı — oranlar çarpılır, geç ödeme al.",
      ru: "Выбери 5 событий: одна ставка, все должны совпасть — кэфы растут.",
    },
    group: "featured",
  },
  {
    slug: "mini-squad-collection",
    title: { en: "Squad Collection", ka: "Squad Collection", es: "Colección de Plantilla", tr: "Kadroyu Topla", ru: "Коллекция состава", },
    description: {
      en: "Answer to pull player cards and fill your formation — pack-opening reveals.",
      ka: "უპასუხე, ამოიღე ბარათები და შეავსე შენი შემადგენლობა — პაკეტების გახსნით.",
      es: "Responde para sacar cartas de jugador y completar tu formación: revelaciones al abrir sobres.",
      tr: "Oyuncu kartları çekip dizilişini tamamlamak için cevap ver — paket açılışları seni bekliyor.",
      ru: "Отвечай, чтобы открывать паки с карточками и заполнять свою расстановку.",
    },
    group: "featured",
  },
  {
    slug: "mini-bet-slip-booster",
    title: { en: "Bet Slip Booster", ka: "Bet Slip Booster", es: "Mejorador de Boleto de Apuesta", tr: "Bahis Kuponu Yükseltici", ru: "Бустер купона", },
    description: {
      en: "A 3-leg slip — answer club questions to boost each leg's odds.",
      ka: "3-პოზიციანი ტალონი — უპასუხე კლუბების კითხვებს და გაზარდე კოეფიციენტები.",
      es: "Un boleto de 3 partidos: responde preguntas de clubes para mejorar las cuotas de cada partido.",
      tr: "3 maçlık kupon — her maçın oranını yükseltmek için kulüp sorularını cevapla.",
      ru: "Купон из 3 событий — отвечай на вопросы о клубах, чтобы повысить коэффициенты.",
    },
    group: "featured",
  },
  {
    slug: "mini-half-time-trivia",
    title: { en: "Half-Time Trivia", ka: "Half-Time Trivia", es: "Trivia del Descanso", tr: "Devre Arası Trivia", ru: "Викторина в перерыве", },
    description: {
      en: "A live match at half-time — a 60-second quiz above the markets.",
      ka: "მატჩის შესვენება — 60-წამიანი ქვიზი მარკეტების თავზე.",
      es: "Un partido en directo al descanso: un quiz de 60 segundos sobre los mercados.",
      tr: "Devre arasında canlı maç — piyasaların üzerinde 60 saniyelik bir bilgi yarışması.",
      ru: "Живой матч в перерыве — 60-секундный квиз прямо над рынками ставок.",
    },
    group: "featured",
  },
  {
    slug: "mini-odds-board",
    title: { en: "Odds Board", ka: "Odds Board", es: "Marcador de cuotas", tr: "Oran Tablosu", ru: "Доска коэффициентов", },
    description: {
      en: "Every answer is priced like a market — obvious pays 1.2x, contrarian 6x.",
      ka: "ყველა პასუხი მარკეტივით ფასდება — აშკარა 1.2x-ს იხდის, სარისკო 6x-ს.",
      es: "Cada respuesta tiene un precio como un mercado: lo obvio paga 1.2x, lo contrario 6x.",
      tr: "Her cevap bir piyasa gibi fiyatlandırılır — bariz olan 1.2 kat, aykırı olan 6 kat öder.",
      ru: "Каждый ответ имеет цену — очевидный дает 1.2x, рискованный — 6x.",
    },
    group: "featured",
  },
  {
    slug: "mini-football-grid",
    title: { en: "Football Tic Tac Toe", ka: "საფეხბურთო იქს-ნული", es: "Tic Tac Toe futbolero", tr: "Futbol XOX", ru: "Футбольные крестики-нолики", },
    description: {
      en: "Tic-tac-toe on a club × nation grid — claim cells by naming players.",
      ka: "იქს-ნული კლუბი × ქვეყანა ბადეზე — დაიკავე უჯრები ფეხბურთელების დასახელებით.",
      es: "Tres en raya en una cuadrícula de club × nación: reclama casillas nombrando jugadores.",
      tr: "Kulüp × ülke tablosunda üç taş oyunu — oyuncu adları söyleyerek hücreleri kap.",
      ru: "Крестики-нолики на сетке «клуб × страна» — занимай клетки, называя игроков.",
    },
    group: "featured",
  },
  {
    slug: "mini-survivor",
    title: { en: "Survivor", ka: "სურვაივერი", es: "Superviviente", tr: "Hayatta Kalan", ru: "Выживание", },
    description: {
      en: "Sudden death — questions get harder until one mistake ends the run.",
      ka: "უეცარი სიკვდილი — კითხვები მძიმდება, ერთი შეცდომა ამთავრებს სერიას.",
      es: "Muerte súbita: las preguntas se vuelven más difíciles hasta que un error acaba con la racha.",
      tr: "Tek gol — sorular zorlaşır, tek hata seriyi bitirir.",
      ru: "Игра на вылет — вопросы становятся сложнее, пока одна ошибка не завершит путь.",
    },
    group: "featured",
  },
  {
    slug: "mini-trivia-mines",
    title: { en: "Trivia Mines", ka: "Trivia Mines", es: "Trivia Mines", tr: "Trivia Mayınları", ru: "Минное поле знаний", },
    description: {
      en: "Dribble past hidden defenders — scout them out with your knowledge.",
      ka: "გაუარე დამალულ მცველებს — დაზვერე ისინი შენი ცოდნით.",
      es: "Regatea a defensas ocultos: descúbrelos con tu conocimiento.",
      tr: "Gizli defans oyuncularını geç — bilginle onları keşfet.",
      ru: "Обыгрывай скрытых защитников — используй свои знания для разведки.",
    },
    group: "featured",
  },
  {
    slug: "mini-quiz-board",
    title: { en: "Quiz Board", ka: "ქვიზის დაფა", es: "Tablero Quiz", tr: "Quiz Tahtası", ru: "Доска викторины", },
    description: {
      en: "Jeopardy-style value board vs the AI — steal tiles when it slips.",
      ka: "ჯეპარდის სტილის დაფა AI-ს წინააღმდეგ — მოიპარე უჯრები, როცა შეცდება.",
      es: "Tablero de valor estilo Jeopardy contra la IA: roba casillas cuando falle.",
      tr: "Yapay zekaya karşı Jeopardy tarzı değer tablosu — hata yaptığında karoları çal.",
      ru: "Битва против ИИ в стиле «Своей игры» — забирай плитки, когда соперник ошибается.",
    },
    group: "featured",
  },
  {
    slug: "mini-last-one-standing",
    title: { en: "Last One Standing", ka: "უკანასკნელი გადარჩენილი", es: "El último en pie", tr: "Son Ayakta Kalan", ru: "Последний герой", },
    description: {
      en: "100 players, nine cuts, one survivor — answer fast to stay alive.",
      ka: "100 მოთამაშე, ცხრა გადარჩევა, ერთი გადარჩენილი — უპასუხე სწრაფად.",
      es: "100 jugadores, nueve cortes, un superviviente: responde rápido para seguir vivo.",
      tr: "100 oyuncu, dokuz eleme, bir kazanan — hayatta kalmak için hızlı cevap ver.",
      ru: "100 игроков, девять этапов, один победитель — отвечай быстро, чтобы выжить.",
    },
    group: "featured",
  },
  {
    slug: "mini-golden-goal",
    title: { en: "Golden Goal", ka: "ოქროს გოლი", es: "Gol de Oro", tr: "Altın Gol", ru: "Золотой гол", },
    description: {
      en: "Blitz duel — speed and accuracy push the ball; first goal wins.",
      ka: "ბლიც-დუელი — სისწრაფე და სიზუსტე წევს ბურთს; პირველი გოლი იგებს.",
      es: "Duelo relámpago: velocidad y precisión mueven el balón; el primer gol gana.",
      tr: "Hızlı düello — hız ve isabet topu ileri iter; ilk gol kazandırır.",
      ru: "Блиц-дуэль — скорость и точность двигают мяч; побеждает тот, кто забьет первым.",
    },
    group: "featured",
  },
  {
    slug: "mini-career-race",
    title: { en: "Career Race", ka: "კარიერის რბოლა", es: "Carrera Profesional", tr: "Kariyer Yarışı", ru: "Карьерная гонка", },
    description: {
      en: "Transfer trail reveals club by club — buzz before your rival.",
      ka: "კარიერა იხსნება კლუბ-კლუბ — დააჭირე ზარს მეტოქეზე ადრე.",
      es: "El rastro de fichajes revela club por club — anticípate a tu rival.",
      tr: "Kulüpten kulübe transfer izi — rakibinden önce kap.",
      ru: "Трансферный путь открывает клуб за клубом — жми кнопку раньше соперника.",
    },
    group: "featured",
  },
  {
    slug: "mini-guess-the-goal",
    title: { en: "Guess the Goal", ka: "გამოიცანი გოლი", es: "Guess the Goal", tr: "Guess the Goal", ru: "Угадай гол", },
    description: {
      en: "An iconic goal replays on the tactics board — name it early for more points.",
      ka: "ლეგენდარული გოლი ტაქტიკურ დაფაზე — ადრე გამოიცანი და მეტი ქულა აიღე.",
      es: "Un gol icónico se repite en la pizarra táctica — adivínalo pronto para más puntos.",
      tr: "Taktik tahtasında ikonik bir gol tekrarı — daha çok puan için erken bil.",
      ru: "Легендарный гол на тактической доске — назови его быстрее, чтобы набрать больше очков.",
    },
    group: "featured",
  },
  {
    slug: "mini-stat-sniper",
    title: { en: "Closest Wins", ka: "სტატ სნაიპერი", es: "Aproximado futbolero", tr: "En Yakın Tahmin", ru: "Кто ближе", },
    description: {
      en: "No options — slide to your best guess and score on proximity.",
      ka: "ვარიანტების გარეშე — გაასრიალე შენი ვარაუდი და დააგროვე სიზუსტით.",
      es: "Sin opciones — desliza a tu mejor suposición y anota por proximidad.",
      tr: "Seçenek yok — en iyi tahminine kaydır ve yakınlıkla puan kazan.",
      ru: "Без вариантов ответа — двигай слайдер к своей догадке и забивай за счет точности.",
    },
    group: "featured",
  },
];

// Hidden from the hub per owner (2026-08-18); routes stay reachable directly.
const HIDDEN_MINI_SLUGS = [
  "mini-trivia-spin",
  "mini-penalty-shootout",
  "mini-daily-jackpot",
  "mini-golden-goal",
  "mini-survivor",
];

export const MINI_GAME_DEMO_MODES: DemoModeCard[] = ALL_MINI_GAME_DEMO_MODES.filter(
  (mode) => !HIDDEN_MINI_SLUGS.includes(mode.slug),
);

const HIDDEN_MINI_MODES: DemoModeCard[] = ALL_MINI_GAME_DEMO_MODES.filter((mode) =>
  HIDDEN_MINI_SLUGS.includes(mode.slug),
);

// Concept prototypes (features/game-mode-lab) — client-only playground used to
// test new game-mode ideas with users before committing to build them.
// In-game copy is English-only for now (prototypes); hub cards are bilingual.
export const LAB_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "lab-own-goal",
    title: { en: "Own Goal", ka: "ავტოგოლი", es: "Gol en Propia Puerta", tr: "Kendi Kalesine Gol", ru: "Автогол", },
    description: {
      en: "Football Codenames — claim your team's meme cards and dodge the Own Goal.",
      ka: "საფეხბურთო Codenames — დაიკავე შენი გუნდის ბარათები და აარიდე თავი ავტოგოლს.",
      es: "Nombres en Clave de Fútbol — reclama las cartas de memes de tu equipo y esquiva el Gol en Propia Puerta.",
      tr: "Futbol Codenames — takımının meme kartlarını kap ve Kendi Kalesine Gol'dan kaç.",
      ru: "Футбольные кодовые имена — собирай мем-карты своей команды и избегай Автогола.",
    },
    group: "featured",
  },
  {
    slug: "lab-say-it-with-memes",
    title: { en: "Say It With Memes", ka: "თქვი მემებით", es: "Dilo Con Memes", tr: "Mizahla Anlat", ru: "Скажи это мемом", },
    description: {
      en: "Explain footballers using only meme cards — no words allowed.",
      ka: "ახსენი ფეხბურთელი მხოლოდ მემ-ბარათებით — სიტყვების გარეშე.",
      es: "Explica futbolistas usando solo cartas de memes — no se permiten palabras.",
      tr: "Futbolcuları sadece meme kartlarıyla açıkla — kelime yasak.",
      ru: "Объясняй футболистов только с помощью мем-карт — слова запрещены.",
    },
    group: "featured",
  },
  {
    slug: "lab-draft-battle",
    title: { en: "Draft Battle", ka: "დრაფტ-ბრძოლა", es: "Duelo de Draft", tr: "Draft Savaşı", ru: "Драфт-битва", },
    description: {
      en: "Spin for legendary squads, draft an XI, prove you know them, chase the cup.",
      ka: "დაატრიალე ლეგენდარული შემადგენლობები, ააწყვე XI, დაამტკიცე ცოდნა და იბრძოლე თასზე.",
      es: "Gira para conseguir escuadras legendarias, haz un draft de un XI, demuestra que los conoces, persigue la copa.",
      tr: "Efsanevi kadrolar için çevir, bir XI draft et, onları tanıdığını kanıtla, kupayı kovala.",
      ru: "Крути колесо для выбора легендарных составов, собери XI, докажи знания и забери кубок.",
    },
    group: "featured",
  },
  {
    slug: "lab-top-10-knockout",
    title: { en: "Top 10 Knockout", ka: "ტოპ 10 ნოკაუტი", es: "Top 10 KO", tr: "İlk 10 Eleme", ru: "Топ-10 на вылет", },
    description: {
      en: "Take turns naming players from a hidden Top 10 list — three lives each.",
      ka: "რიგრიგობით დაასახელეთ ფეხბურთელები დამალული ტოპ 10-იდან — სამ-სამი სიცოცხლე.",
      es: "Por turnos, nombra jugadores de una lista Top 10 oculta — tres vidas cada uno.",
      tr: "Gizli bir İlk 10 listesinden sırayla oyuncu adlandır — her biri için üç can.",
      ru: "Называйте по очереди игроков из скрытого Топ-10 — у каждого по три жизни.",
    },
    group: "featured",
  },
  {
    slug: "lab-missing-xi",
    dailyType: "missingXi",
    title: { en: "Missing XI", ka: "დაკარგული XI", es: "Adivina el 11", tr: "İlk 11 Tahmin Etme", ru: "Missing XI", },
    description: {
      en: "Rebuild a legendary starting XI shirt by shirt against a rival.",
      ka: "აღადგინე ლეგენდარული შემადგენლობა პოზიცია-პოზიცია მეტოქესთან ბრძოლაში.",
      es: "Reconstruye un XI titular legendario, camiseta a camiseta, contra un rival.",
      tr: "Efsanevi bir ilk 11'i rakibe karşı forma forma yeniden kur.",
      ru: "Воссоздай легендарный стартовый состав против соперника, выбирая футболку за футболкой.",
    },
    group: "featured",
  },
  {
    slug: "lab-ball-knowledge",
    title: { en: "Ball Knowledge", ka: "ღრმა ცოდნა", es: "Conocimiento de Balón", tr: "Futbol Bilgisi", ru: "Ball Knowledge", },
    description: {
      en: "Rare answers score big, obvious ones score small — who really knows football?",
      ka: "იშვიათი პასუხი მეტ ქულას იძლევა, აშკარა — ნაკლებს. ვინ იცის ფეხბურთი მართლა?",
      es: "Las respuestas raras puntúan alto, las obvias puntúan bajo — ¿quién conoce realmente el fútbol?",
      tr: "Nadir cevaplar yüksek puan kazandırır, bariz olanlar az puan — futbolu kim gerçekten biliyor?",
      ru: "Редкие ответы приносят максимум очков, очевидные — минимум. Кто здесь настоящий эксперт?",
    },
    group: "featured",
  },
  {
    slug: "lab-bingo-battle",
    title: { en: "Bingo Battle", ka: "ბინგო-ბრძოლა", es: "Duelo de Bingo", tr: "Bingo Savaşı", ru: "Bingo Battle", },
    description: {
      en: "Place each player on a category square — first to complete a line wins.",
      ka: "დააყენე ფეხბურთელი შესაბამის უჯრაზე — ვინც ხაზს პირველი შეავსებს, იგებს.",
      es: "Coloca a cada jugador en una casilla de categoría — el primero en completar una línea gana.",
      tr: "Her oyuncuyu bir kategori karesine yerleştir — önce bir çizgiyi tamamlayan kazanır.",
      ru: "Распределяй игроков по категориям на поле — побеждает тот, кто первым соберет линию.",
    },
    group: "featured",
  },
  {
    slug: "lab-connections-race",
    title: { en: "Connections Race", ka: "კავშირების რბოლა", es: "Carrera de Conexiones", tr: "Bağlantılar Yarışı", ru: "Connections Race", },
    description: {
      en: "16 players hide four secret groups — find them before your rival.",
      ka: "16 ფეხბურთელში ოთხი ფარული ჯგუფია — იპოვე მეტოქეზე ადრე.",
      es: "16 jugadores ocultan cuatro grupos secretos — encuéntralos antes que tu rival.",
      tr: "16 oyuncu dört gizli grubu saklıyor — rakibinden önce bul.",
      ru: "16 игроков скрывают четыре секретные группы — найди их быстрее соперника.",
    },
    group: "featured",
  },
  {
    slug: "lab-stat-501",
    title: { en: "Stat 501", ka: "სტატ 501", es: "Estadística 501", tr: "İstatistik 501", ru: "Stat 501", },
    description: {
      en: "Darts with footballers — count down from 501 using real career stats.",
      ka: "დარტსი ფეხბურთელებით — ჩამოდი 501-დან რეალური სტატისტიკით.",
      es: "Dardos con futbolistas: cuenta atrás desde 501 usando estadísticas reales de su carrera.",
      tr: "Futbolcularla dart — gerçek kariyer istatistikleriyle 501'den geriye say.",
      ru: "Дартс с футболистами — обнули 501 очко, используя реальную статистику их карьеры.",
    },
    group: "featured",
  },
];

const DAILY_DEMO_COPY: Record<DailyChallengeType, { title: DemoI18nText; description: DemoI18nText }> = {
  moneyDrop: {
    title: { en: "Money Drop", ka: "ფულის ვარდნა", es: "Money Drop", tr: "Money Drop", ru: "Money Drop", },
    description: {
      en: "Protect your prize money — every wrong answer costs you.",
      ka: "დაიცავი შენი საპრიზო თანხა — ყოველი შეცდომა ძვირად დაგიჯდება.",
      es: "Protege tu premio: cada respuesta incorrecta te cuesta.",
      tr: "Ödülünü koru — her yanlış cevap sana mal olur.",
      ru: "Защити свой призовой фонд — каждый неверный ответ стоит тебе денег.",
    },
  },
  trueFalse: {
    title: { en: "True or False", ka: "მართალია თუ ტყუილი", es: "Verdadero o falso futbolero", tr: "Doğru mu Yanlış mı", ru: "Правда или ложь", },
    description: {
      en: "Quick-fire football statements — call them true or false.",
      ka: "სწრაფი საფეხბურთო მტკიცებები — მართალია თუ ტყუილი?",
      es: "Afirmaciones rápidas de fútbol: di si son verdaderas o falsas.",
      tr: "Hızlı futbol ifadeleri — doğru mu yanlış mı olduklarını söyle.",
      ru: "Быстрые футбольные факты — определи, правда это или ложь.",
    },
  },
  clues: {
    title: { en: "Who Am I?", ka: "ვინ ვარ მე?", es: "¿Quién soy?", tr: "Ben Kimim?", ru: "Кто я?", },
    description: {
      en: "Clues reveal one by one — guess the player before they run out.",
      ka: "მინიშნებები სათითაოდ იხსნება — გამოიცანი ფეხბურთელი ვიდრე ამოიწურება.",
      es: "Las pistas se revelan una a una: adivina el jugador antes de que se acabe el tiempo.",
      tr: "İpuçları tek tek açılıyor — süre dolmadan oyuncuyu tahmin et.",
      ru: "Подсказки открываются одна за другой — угадай игрока, пока они не закончились.",
    },
  },
  countdown: {
    title: { en: "Countdown", ka: "უკუთვლა", es: "Contrarreloj futbolera", tr: "Geri Sayım", ru: "Обратный отсчет", },
    description: {
      en: "Name as many correct answers as you can before the clock hits zero.",
      ka: "დაასახელე რაც შეიძლება მეტი სწორი პასუხი, სანამ დრო ამოიწურება.",
      es: "Nombra tantas respuestas correctas como puedas antes de que el reloj llegue a cero.",
      tr: "Saat sıfıra vurmadan önce yapabildiğin kadar doğru cevap ver.",
      ru: "Назови как можно больше правильных ответов, пока время не истекло.",
    },
  },
  putInOrder: {
    title: { en: "Put In Order", ka: "დაალაგე რიგზე", es: "Pon en orden", tr: "Sıraya Koy", ru: "Расставь по порядку", },
    description: {
      en: "Drag and drop to rank players and clubs in the right order.",
      ka: "გადაათრიე და დაალაგე მოთამაშეები და კლუბები სწორი თანმიმდევრობით.",
      es: "Arrastra y suelta para clasificar jugadores y clubes en el orden correcto.",
      tr: "Oyuncuları ve kulüpleri doğru sıraya göre sürükleyip bırak.",
      ru: "Перетаскивай игроков и клубы, чтобы расставить их в правильном порядке.",
    },
  },
  imposter: {
    title: { en: "Imposter", ka: "იმპოსტერი", es: "Impostor", tr: "Sahte", ru: "Самозванец", },
    description: {
      en: "Spot every real answer — and don't get fooled by the imposters.",
      ka: "იპოვე ყველა ნამდვილი პასუხი — არ მოტყუვდე იმპოსტერებზე.",
      es: "Detecta todas las respuestas reales y no te dejes engañar por los impostores.",
      tr: "Her gerçek cevabı bul — ve sahtekarlar tarafından kandırılma.",
      ru: "Найди все верные ответы и не дай обманщикам себя запутать.",
    },
  },
  careerPath: {
    title: { en: "Career Path", ka: "კარიერის გზა", es: "Trayectoria", tr: "Kariyer Yolu", ru: "Карьерный путь", },
    description: {
      en: "Follow the transfer trail and name the player behind the career.",
      ka: "მიჰყევი ტრანსფერების კვალს და გამოიცანი ვისი კარიერაა.",
      es: "Sigue el rastro de los traspasos y nombra al jugador detrás de la carrera.",
      tr: "Transfer izini takip et ve kariyerin arkasındaki oyuncuyu adlandır.",
      ru: "Пройди по пути трансферов и назови игрока по его карьере.",
    },
  },
  highLow: {
    title: { en: "Higher or Lower", ka: "მეტი თუ ნაკლები", es: "Higher or Lower futbolero", tr: "Higher or Lower Futbolcu", ru: "Больше или меньше", },
    description: {
      en: "Compare the stats — pick which side is higher and keep the chain alive.",
      ka: "შეადარე სტატისტიკა — აირჩიე მეტი და შეინარჩუნე ჯაჭვი.",
      es: "Compara las estadísticas: elige qué lado es más alto y mantén la cadena viva.",
      tr: "İstatistikleri karşılaştır — hangi tarafın daha yüksek olduğunu seç ve zinciri canlı tut.",
      ru: "Сравнивай статистику: выбирай, чей показатель выше, и не прерывай серию.",
    },
  },
  footballLogic: {
    title: { en: "Football Logic", ka: "საფეხბურთო ლოგიკა", es: "Acertijos de fútbol", tr: "Futbol Bilmeceleri", ru: "Футбольная логика", },
    description: {
      en: "Two pictures, one player — decode the visual riddle.",
      ka: "ორი სურათი, ერთი ფეხბურთელი — ამოხსენი ვიზუალური თავსატეხი.",
      es: "Dos imágenes, un jugador: descifra el acertijo visual.",
      tr: "İki resim, bir oyuncu — görsel bilmeceyi çöz.",
      ru: "Две картинки, один игрок — разгадай визуальную загадку.",
    },
  },
  cardDetective: {
    title: { en: "Card Detective", ka: "ბარათის დეტექტივი", es: "Adivina el jugador por su carta", tr: "Kart Dedektifi", ru: "Карточный детектив", },
    description: {
      en: "Every slot on the card is a locked clue with a price — name the player with the most coins left.",
      ka: "ბარათის ყველა უჯრა დახურული მინიშნებაა ფასით — გამოიცანი მოთამაშე რაც შეიძლება მეტი ქოინის შენარჩუნებით.",
      es: "Cada casilla de la tarjeta es una pista bloqueada con un precio — nombra al jugador con más monedas restantes.",
      tr: "Karttaki her ipucu kilitli ve bir bedeli var — en çok jetonu kalan oyuncuyu bil.",
      ru: "Каждое поле на карточке — платная улика. Назови игрока, сохранив как можно больше монет.",
    },
  },
  statSniper: {
    title: { en: "Closest Wins", ka: "სტატ სნაიპერი", es: "Aproximado futbolero", tr: "En Yakın Tahmin", ru: "Кто ближе", },
    description: {
      en: "Ten football numbers — slide to your guess, the closer the better.",
      ka: "დღეში ათი რიცხვი — მიიტანე სლაიდერი ვარაუდამდე, რაც უფრო ახლოს, მით უკეთესი.",
      es: "Diez números de fútbol — desliza hasta tu suposición, cuanto más cerca, mejor.",
      tr: "On futbol numarası — tahminine kaydır, ne kadar yakın o kadar iyi.",
      ru: "Десять футбольных чисел — двигай ползунок к своей догадке. Чем ближе, тем лучше.",
    },
  },
  passChain: {
    title: { en: "Pass Chain", ka: "პასების ჯაჭვი", es: "Conectando jugadores", tr: "Futbolcu Bağlantı Zinciri", ru: "Цепочка пасов", },
    description: {
      en: "Link two players through shared clubs — fewer links score higher.",
      ka: "დააკავშირე ორი ფეხბურთელი საერთო კლუბებით — ნაკლები რგოლი, მეტი ქულა.",
      es: "Enlaza dos jugadores por clubes compartidos: menos enlaces, mayor puntuación.",
      tr: "Ortak kulüpler aracılığıyla iki oyuncuyu bağla — daha az bağlantı daha yüksek puan alır.",
      ru: "Свяжи двух игроков через общие клубы — чем меньше звеньев, тем выше балл.",
    },
  },
  missingXi: {
    title: { en: "Missing XI", ka: "დაკარგული XI", es: "Adivina el 11", tr: "İlk 11 Tahmin Etme", ru: "Missing XI", },
    description: {
      en: "Three famous line-ups a day — tap a shirt, name the starter.",
      ka: "დღეში სამი ცნობილი შემადგენლობა — დააჭირე მაისურს, დაასახელე ფეხბურთელი.",
      es: "Tres alineaciones famosas al día — toca una camiseta, nombra al titular.",
      tr: "Günde üç ünlü diziliş — bir formaya dokun, ilk oyuncuyu bil.",
      ru: "Три легендарных состава в день — жми на футболку и называй игрока старта.",
    },
  },
  fifaCards: {
    title: { en: "FIFA Cards", ka: "FIFA ბარათები", es: "Cartas FIFA", tr: "FIFA Kartları", ru: "Карточки FIFA", },
    description: {
      en: "A gold card, stats only — name the player before the clues run out.",
      ka: "ოქროს ბარათი მხოლოდ სტატისტიკით — გამოიცანი მოთამაშე, სანამ მინიშნებები ამოიწურება.",
      es: "Una tarjeta dorada, solo estadísticas — nombra al jugador antes de que se agoten las pistas.",
      tr: "Altın kart, sadece istatistikler — ipuçları bitmeden oyuncuyu bil.",
      ru: "Золотая карточка, только статы — назови игрока, пока не кончились подсказки.",
    },
  },
};

// Hidden from the hub per owner (2026-08-13); routes stay reachable directly.
// fifaCards hidden 2026-09-06: Card Detective replaces it as the card daily.
const HIDDEN_DAILY_TYPES: DailyChallengeType[] = ["clues", "putInOrder", "fifaCards"];

const buildDailyCard = (type: DailyChallengeType): DemoModeCard => ({
  slug: `daily-${type}`,
  title: DAILY_DEMO_COPY[type].title,
  description: DAILY_DEMO_COPY[type].description,
  group: "daily",
  dailyType: type,
});

export const DAILY_DEMO_MODES: DemoModeCard[] = (
  Object.keys(DAILY_DEMO_COPY) as DailyChallengeType[]
)
  .filter((type) => !HIDDEN_DAILY_TYPES.includes(type))
  .map(buildDailyCard);

const HIDDEN_DAILY_MODES: DemoModeCard[] = HIDDEN_DAILY_TYPES.map(buildDailyCard);

/** Every daily challenge, including the two hidden from the demos hub. */
export const ALL_DAILY_DEMO_MODES: DemoModeCard[] = (
  Object.keys(DAILY_DEMO_COPY) as DailyChallengeType[]
).map(buildDailyCard);

// FIFA / FC Universe collection (features/fifa-universe) — card-database
// prototypes, plus the existing FIFA Cards mini-game as its anchor.
export const FIFA_DEMO_MODES: DemoModeCard[] = [...FIFA_MODES];

export const ALL_DEMO_MODES: DemoModeCard[] = [
  ...FEATURED_DEMO_MODES,
  ...MINI_GAME_DEMO_MODES,
  ...FIFA_MODES,
  ...LAB_DEMO_MODES,
  ...DAILY_DEMO_MODES,
  ...HIDDEN_DEMO_MODES,
  ...HIDDEN_MINI_MODES,
  ...HIDDEN_DAILY_MODES,
];

export function findDemoMode(slug: string): DemoModeCard | undefined {
  return ALL_DEMO_MODES.find((mode) => mode.slug === slug);
}

/** Copy in the app locale; English when that language has no text yet. */
export function demoText(text: DemoI18nText, locale: Locale): string {
  return (locale === 'en' ? undefined : text[locale]) || text.en;
}
