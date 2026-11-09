/**
 * Mentalista Futbolero copy in the four shipping locales (en / es / ka / tr). Prototype strings only: the production
 * build moves player-facing copy into `messages/*.json`. No real football content lives here.
 */

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

const BY_LOCALE: Record<string, MentalistaCopy> = { en: EN, es: ES, ka: KA, tr: TR };

export function mentalistaCopy(locale: string): MentalistaCopy {
  return BY_LOCALE[locale] ?? EN;
}
