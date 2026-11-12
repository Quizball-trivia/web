/**
 * Mentalista Futbolero playground-prototype copy, in every supported UI locale (en / es / ka / tr / ru / pt / de / fr).
 * The table is a `Record<Locale, …>`, so a supported locale can never silently fall back to English; only an unknown
 * locale string does. Interface strings only: this does not imply the game's category content exists in all of these
 * languages. Prototype strings: the production build moves player-facing copy into `messages/*.json`. No real football
 * content lives here.
 */

import { isSupportedLocale, type Locale } from "@/lib/i18n/locale-config";

export interface MentalistaCopy {
  brand: readonly [string, string];
  exit: string;
  rules: string;
  /** Lobby/intro Start control. */
  start: string;
  /** Short tag for a player who has left the match (shown after their name on the results table). */
  left: string;
  /** You are the chooser, choosing phase. */
  youChoose: string;
  youChooseHint: string;
  /** Someone else is the chooser, choosing phase (waiting). */
  waitChoose: (chooser: string) => string;
  /** You are a predictor, guessing phase. */
  youPredict: (chooser: string) => string;
  youPredictHint: string;
  /** You are the chooser, guessing phase (being read). */
  beingRead: string;
  locked: string;
  revise: string;
  committed: string;
  predicted: string;
  /** Reveal. */
  pickWas: (chooser: string) => string;
  matched: string;
  missed: string;
  noPick: string;
  voidTimeout: string;
  voidDropped: string;
  plusTwo: (points: number) => string;
  round: (n: number, total: number) => string;
  chooserTag: string;
  youTag: string;
  // results
  youWon: string;
  tieFirst: string;
  youPlace: (place: number) => string;
  colReads: string;
  // validation notices
  invalid: Record<"empty" | "too_long" | "out_of_category", string>;
  offline: string;
}

const EN: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Leave",
  rules: "One player secretly picks a name in the category. Everyone else guesses that exact pick — read them right for 2 points. 3–6 players; the chooser rotates so everyone reads and is read.",
  start: "Start",
  left: "Left",
  youChoose: "Pick one — secretly",
  youChooseHint: "The others will try to guess exactly who you chose.",
  waitChoose: (c) => `${c} is choosing a name…`,
  youPredict: (c) => `Who did ${c} pick?`,
  youPredictHint: "Not just a valid name — their exact pick.",
  beingRead: "They are trying to read you…",
  locked: "Locked in",
  revise: "Tap another to change",
  committed: "Chosen",
  predicted: "Guessed",
  pickWas: (c) => `${c} picked`,
  matched: "Read it!",
  missed: "Missed",
  noPick: "No pick was made",
  voidTimeout: "The chooser ran out of time — no points this round.",
  voidDropped: "The chooser left — no points this round.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Round ${n} of ${total}`,
  chooserTag: "Mentalist",
  youTag: "You",
  youWon: "You won!",
  tieFirst: "Tied for first!",
  youPlace: (p) => `You finished ${p}${p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"}`,
  colReads: "Reads",
  invalid: {
    empty: "Type a name first.",
    too_long: "That name is too long.",
    out_of_category: "Not a name in this category.",
  },
  offline: "Connection lost — reconnecting…",
};

const ES: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Salir",
  rules: "Un jugador elige un nombre en secreto. El resto adivina ese nombre exacto: acertar la mente vale 2 puntos. 3–6 jugadores; el mentalista rota, así todos leen y son leídos.",
  start: "Empezar",
  left: "Se fue",
  youChoose: "Elegí uno — en secreto",
  youChooseHint: "Los demás intentarán adivinar a quién elegiste.",
  waitChoose: (c) => `${c} está eligiendo un nombre…`,
  youPredict: (c) => `¿A quién eligió ${c}?`,
  youPredictHint: "No cualquier nombre válido: su elección exacta.",
  beingRead: "Están intentando leerte…",
  locked: "Confirmado",
  revise: "Tocá otro para cambiar",
  committed: "Eligió",
  predicted: "Adivinó",
  pickWas: (c) => `${c} eligió`,
  matched: "¡Lo leíste!",
  missed: "Fallaste",
  noPick: "No hubo elección",
  voidTimeout: "Al mentalista se le acabó el tiempo: ronda sin puntos.",
  voidDropped: "El mentalista se fue: ronda sin puntos.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Ronda ${n} de ${total}`,
  chooserTag: "Mentalista",
  youTag: "Vos",
  youWon: "¡Ganaste!",
  tieFirst: "¡Empate en el 1º!",
  youPlace: (p) => `Quedaste ${p}º`,
  colReads: "Aciertos",
  invalid: {
    empty: "Escribí un nombre.",
    too_long: "Ese nombre es muy largo.",
    out_of_category: "No es un nombre de esta categoría.",
  },
  offline: "Se perdió la conexión: reconectando…",
};

const KA: MentalistaCopy = {
  brand: ["მენტალისტა", "ფუტბოლერო"],
  exit: "გასვლა",
  rules: "ერთი მოთამაშე ფარულად ირჩევს სახელს კატეგორიიდან. დანარჩენები ცდილობენ ზუსტად გამოიცნონ მისი არჩევანი — სწორი ვარაუდი 2 ქულაა. 3–6 მოთამაშე; მენტალისტა ტრიალებს, ასე რომ ყველა კითხულობს და იკითხება.",
  start: "დაწყება",
  left: "გავიდა",
  youChoose: "აირჩიე ერთი — ფარულად",
  youChooseHint: "სხვები შეეცდებიან ზუსტად გამოიცნონ ვინ აირჩიე.",
  waitChoose: (c) => `${c} ირჩევს სახელს…`,
  youPredict: (c) => `ვინ აირჩია ${c}-მ?`,
  youPredictHint: "არა უბრალოდ სწორი სახელი — მისი ზუსტი არჩევანი.",
  beingRead: "ცდილობენ წაგიკითხონ…",
  locked: "დადასტურდა",
  revise: "შესაცვლელად დააჭირე სხვას",
  committed: "აირჩია",
  predicted: "გამოიცნო",
  pickWas: (c) => `${c}-მ აირჩია`,
  matched: "გამოიცანი!",
  missed: "ვერ გამოიცანი",
  noPick: "არჩევანი არ გაკეთებულა",
  voidTimeout: "მენტალისტას დრო ამოეწურა — რაუნდი ქულების გარეშე.",
  voidDropped: "მენტალისტა გავიდა — რაუნდი ქულების გარეშე.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `რაუნდი ${n} / ${total}`,
  chooserTag: "მენტალისტა",
  youTag: "შენ",
  youWon: "მოიგე!",
  tieFirst: "ფრე პირველ ადგილზე!",
  youPlace: (p) => `დაიკავე ${p}-ე ადგილი`,
  colReads: "გამოცნობები",
  invalid: {
    empty: "ჯერ სახელი აკრიფე.",
    too_long: "ეს სახელი ძალიან გრძელია.",
    out_of_category: "ეს სახელი ამ კატეგორიაში არ არის.",
  },
  offline: "კავშირი დაიკარგა — ხელახლა დაკავშირება…",
};

const TR: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Çık",
  rules: "Bir oyuncu kategoriden gizlice bir isim seçer. Diğerleri tam o seçimi tahmin etmeye çalışır — doğru okuma 2 puan. 3–6 oyuncu; mentalist döner, böylece herkes okur ve okunur.",
  start: "Başla",
  left: "Ayrıldı",
  youChoose: "Birini seç — gizlice",
  youChooseHint: "Diğerleri tam olarak kimi seçtiğini tahmin etmeye çalışacak.",
  waitChoose: (c) => `${c} bir isim seçiyor…`,
  youPredict: (c) => `${c} kimi seçti?`,
  youPredictHint: "Sadece geçerli bir isim değil — tam onun seçimi.",
  beingRead: "Seni okumaya çalışıyorlar…",
  locked: "Kilitlendi",
  revise: "Değiştirmek için başkasına dokun",
  committed: "Seçti",
  predicted: "Tahmin etti",
  pickWas: (c) => `${c} şunu seçti`,
  matched: "Okudun!",
  missed: "Iskaladın",
  noPick: "Seçim yapılmadı",
  voidTimeout: "Mentalistin süresi doldu — bu turda puan yok.",
  voidDropped: "Mentalist ayrıldı — bu turda puan yok.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Tur ${n} / ${total}`,
  chooserTag: "Mentalist",
  youTag: "Sen",
  youWon: "Kazandın!",
  tieFirst: "Birincilikte berabere!",
  youPlace: (p) => `${p}. oldun`,
  colReads: "Okumalar",
  invalid: {
    empty: "Önce bir isim yaz.",
    too_long: "Bu isim çok uzun.",
    out_of_category: "Bu kategoride böyle bir isim yok.",
  },
  offline: "Bağlantı koptu — yeniden bağlanılıyor…",
};

const RU: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Выйти",
  rules: "Один игрок тайно выбирает имя из категории. Остальные пытаются угадать именно этот выбор — точное попадание приносит 2 очка. 3–6 игроков; менталист меняется, так что каждый и читает, и становится тем, кого читают.",
  start: "Начать",
  left: "Вне игры",
  youChoose: "Выбери одного — тайно",
  youChooseHint: "Остальные попробуют угадать именно твой выбор.",
  waitChoose: (c) => `${c} выбирает имя…`,
  youPredict: (c) => `Кого выбрал игрок ${c}?`,
  youPredictHint: "Не просто подходящее имя — именно выбор менталиста.",
  beingRead: "Тебя пытаются прочитать…",
  locked: "Зафиксировано",
  revise: "Нажми на другой вариант, чтобы изменить",
  committed: "Выбор сделан",
  predicted: "Ответ дан",
  pickWas: (c) => `Выбор менталиста (${c})`,
  matched: "В точку!",
  missed: "Мимо",
  noPick: "Выбор не сделан",
  voidTimeout: "У менталиста вышло время — в этом раунде без очков.",
  voidDropped: "Менталист покинул игру — в этом раунде без очков.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Раунд ${n} из ${total}`,
  chooserTag: "Менталист",
  youTag: "Ты",
  youWon: "Победа!",
  tieFirst: "Делите первое место!",
  youPlace: (p) => `Твоё место: ${p}`,
  colReads: "Угадано",
  invalid: {
    empty: "Сначала введи имя.",
    too_long: "Слишком длинное имя.",
    out_of_category: "Такого имени нет в этой категории.",
  },
  offline: "Связь потеряна — переподключаемся…",
};

const PT: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Sair",
  rules: "Um jogador escolhe em segredo um nome da categoria. Os outros tentam adivinhar exatamente essa escolha — acertar vale 2 pontos. 3–6 jogadores; o mentalista se reveza, então todo mundo lê e é lido.",
  start: "Começar",
  left: "Saiu",
  youChoose: "Escolha um — em segredo",
  youChooseHint: "Os outros vão tentar adivinhar exatamente quem você escolheu.",
  waitChoose: (c) => `${c} está escolhendo um nome…`,
  youPredict: (c) => `Quem ${c} escolheu?`,
  youPredictHint: "Não vale qualquer nome — tem que ser a escolha exata do mentalista.",
  beingRead: "Estão tentando ler você…",
  locked: "Confirmado",
  revise: "Toque em outro para mudar",
  committed: "Escolheu",
  predicted: "Palpitou",
  pickWas: (c) => `${c} escolheu`,
  matched: "Acertou!",
  missed: "Errou",
  noPick: "Nenhuma escolha foi feita",
  voidTimeout: "O tempo do mentalista acabou — rodada sem pontos.",
  voidDropped: "O mentalista saiu — rodada sem pontos.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Rodada ${n} de ${total}`,
  chooserTag: "Mentalista",
  youTag: "Você",
  youWon: "Você venceu!",
  tieFirst: "Empate em 1º lugar!",
  youPlace: (p) => `Você terminou em ${p}º`,
  colReads: "Acertos",
  invalid: {
    empty: "Digite um nome primeiro.",
    too_long: "Esse nome é longo demais.",
    out_of_category: "Esse nome não é desta categoria.",
  },
  offline: "Conexão perdida — reconectando…",
};

const DE: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Verlassen",
  rules: "Ein Spieler wählt geheim einen Namen aus der Kategorie. Alle anderen versuchen, genau diese Wahl zu erraten — ein Treffer bringt 2 Punkte. 3–6 Spieler; der Mentalist wechselt, sodass jeder mal liest und gelesen wird.",
  start: "Starten",
  left: "Raus",
  youChoose: "Wähl einen aus — geheim",
  youChooseHint: "Die anderen versuchen, genau deine Wahl zu erraten.",
  waitChoose: (c) => `${c} wählt einen Namen…`,
  youPredict: (c) => `Wen hat ${c} gewählt?`,
  youPredictHint: "Nicht irgendein gültiger Name — genau die Wahl des Mentalisten.",
  beingRead: "Sie versuchen, dich zu lesen…",
  locked: "Festgelegt",
  revise: "Tippe auf einen anderen, um zu ändern",
  committed: "Gewählt",
  predicted: "Getippt",
  pickWas: (c) => `Gewählt hat: ${c}`,
  matched: "Volltreffer!",
  missed: "Daneben",
  noPick: "Es wurde nichts gewählt",
  voidTimeout: "Dem Mentalisten ist die Zeit ausgegangen — keine Punkte in dieser Runde.",
  voidDropped: "Der Mentalist ist raus — keine Punkte in dieser Runde.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Runde ${n} von ${total}`,
  chooserTag: "Mentalist",
  youTag: "Du",
  youWon: "Du hast gewonnen!",
  tieFirst: "Geteilter erster Platz!",
  youPlace: (p) => `Du landest auf Platz ${p}`,
  colReads: "Treffer",
  invalid: {
    empty: "Gib zuerst einen Namen ein.",
    too_long: "Dieser Name ist zu lang.",
    out_of_category: "Kein Name aus dieser Kategorie.",
  },
  offline: "Verbindung verloren — verbinde neu…",
};

const FR: MentalistaCopy = {
  brand: ["Mentalista", "Futbolero"],
  exit: "Quitter",
  rules: "Un joueur choisit en secret un nom de la catégorie. Les autres tentent de deviner exactement ce choix — bien lire rapporte 2 points. 3 à 6 joueurs ; le mentaliste change à chaque manche, ainsi tout le monde lit et se fait lire.",
  start: "Commencer",
  left: "A quitté",
  youChoose: "Choisis-en un — en secret",
  youChooseHint: "Les autres vont essayer de deviner exactement ton choix.",
  waitChoose: (c) => `${c} choisit un nom…`,
  youPredict: (c) => `Quel est le choix de ${c} ?`,
  youPredictHint: "Pas juste un nom valide — son choix exact.",
  beingRead: "Ils essaient de lire dans tes pensées…",
  locked: "Validé",
  revise: "Touche une autre option pour changer",
  committed: "A choisi",
  predicted: "A deviné",
  pickWas: (c) => `Le choix de ${c}`,
  matched: "Bien lu !",
  missed: "Raté",
  noPick: "Aucun choix n’a été fait",
  voidTimeout: "Le mentaliste a manqué de temps — pas de points cette manche.",
  voidDropped: "Le mentaliste est parti — pas de points cette manche.",
  plusTwo: (p) => `+${p}`,
  round: (n, total) => `Manche ${n} sur ${total}`,
  chooserTag: "Mentaliste",
  youTag: "Toi",
  youWon: "Tu as gagné !",
  tieFirst: "Égalité à la première place !",
  youPlace: (p) => `Tu termines à la ${p}${p === 1 ? "re" : "e"} place`,
  colReads: "Réussites",
  invalid: {
    empty: "Écris d’abord un nom.",
    too_long: "Ce nom est trop long.",
    out_of_category: "Ce nom n’est pas dans cette catégorie.",
  },
  offline: "Connexion perdue — reconnexion…",
};

/** Exhaustive by type: adding a `Locale` without its copy is a compile error, never a silent English fallback. */
const BY_LOCALE: Record<Locale, MentalistaCopy> = { en: EN, es: ES, ka: KA, tr: TR, ru: RU, pt: PT, de: DE, fr: FR };

/** Copy for a supported locale; an unknown locale string falls back to English. */
export function mentalistaCopy(locale: string): MentalistaCopy {
  return isSupportedLocale(locale) ? BY_LOCALE[locale] : EN;
}
