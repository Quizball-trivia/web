/**
 * Mentalista Futbolero — the REAL room screens' copy, in the four shipping locales (en / es / ka / tr). Separate from
 * the playground prototype's `mentalista.copy.ts`, which is left untouched. Common room words (you / leave / away /
 * offline / youWon / …) come from `wordSharedCopy`; only the game-specific strings live here. No real football content.
 */

export interface MentalistaRoomCopy {
  brand: readonly [string, string];
  round: (n: number, total: number) => string;
  chooserTag: string;
  /** Choose phase. */
  youChoose: string;
  youChooseHint: string;
  waitChoose: (chooser: string) => string;
  chosen: string;
  /** Predict phase. */
  youPredict: (chooser: string) => string;
  youPredictHint: string;
  beingRead: string;
  predicted: string;
  /** Lock control + locked state (no revise affordance). */
  lock: string;
  pickFirst: string;
  locked: string;
  sending: string;
  waiting: string;
  lockedOf: (done: number, total: number) => string;
  /** Reveal. */
  pickWas: (chooser: string) => string;
  readIt: string;
  missed: string;
  noPrediction: string;
  voided: string;
  nextRound: string;
  lastRound: string;
  /** Results. */
  readsStat: string;
  readsDetail: (reads: number) => string;
  disconnectedNotice: string;
}

const EN: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Round ${n} of ${total}`,
  chooserTag: "Mentalist",
  youChoose: "Pick one — secretly",
  youChooseHint: "The others will try to read exactly who you chose.",
  waitChoose: (c) => `${c} is choosing…`,
  chosen: "Chosen",
  youPredict: (c) => `Who did ${c} pick?`,
  youPredictHint: "Lock in their exact pick — you cannot change it.",
  beingRead: "They are trying to read you…",
  predicted: "Locked in",
  lock: "Lock it in",
  pickFirst: "Pick an option",
  locked: "Locked in",
  sending: "Sending…",
  waiting: "Waiting for the others…",
  lockedOf: (done, total) => `${done}/${total} locked in`,
  pickWas: (c) => `${c} picked`,
  readIt: "Read it!",
  missed: "Missed",
  noPrediction: "No pick",
  voided: "No pick was made — no points this round.",
  nextRound: "Next round coming up…",
  lastRound: "Last round",
  readsStat: "Reads",
  readsDetail: (r) => `${r} read${r === 1 ? "" : "s"}`,
  disconnectedNotice: "Connection lost. Reconnecting; the clock keeps running.",
};

const ES: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Ronda ${n} de ${total}`,
  chooserTag: "Mentalista",
  youChoose: "Elegí uno — en secreto",
  youChooseHint: "Los demás intentarán leer a quién elegiste.",
  waitChoose: (c) => `${c} está eligiendo…`,
  chosen: "Eligió",
  youPredict: (c) => `¿A quién eligió ${c}?`,
  youPredictHint: "Confirmá su elección exacta: no la podés cambiar.",
  beingRead: "Están intentando leerte…",
  predicted: "Confirmado",
  lock: "Confirmar",
  pickFirst: "Elegí una opción",
  locked: "Confirmado",
  sending: "Enviando…",
  waiting: "Esperando a los demás…",
  lockedOf: (done, total) => `${done}/${total} confirmados`,
  pickWas: (c) => `${c} eligió`,
  readIt: "¡Lo leíste!",
  missed: "Fallaste",
  noPrediction: "Sin elección",
  voided: "No hubo elección: ronda sin puntos.",
  nextRound: "Viene la próxima ronda…",
  lastRound: "Última ronda",
  readsStat: "Aciertos",
  readsDetail: (r) => `${r} acierto${r === 1 ? "" : "s"}`,
  disconnectedNotice: "Conexión perdida. Reconectando; el reloj sigue corriendo.",
};

const KA: MentalistaRoomCopy = {
  brand: ["მენტალისტა", "ფუტბოლერო"],
  round: (n, total) => `რაუნდი ${n} / ${total}`,
  chooserTag: "მენტალისტა",
  youChoose: "აირჩიე ერთი — ფარულად",
  youChooseHint: "სხვები შეეცდებიან ზუსტად გამოიცნონ ვინ აირჩიე.",
  waitChoose: (c) => `${c} ირჩევს…`,
  chosen: "აირჩია",
  youPredict: (c) => `ვინ აირჩია ${c}-მ?`,
  youPredictHint: "დაადასტურე მისი ზუსტი არჩევანი — შეცვლა ვეღარ შეძლებ.",
  beingRead: "ცდილობენ წაგიკითხონ…",
  predicted: "დადასტურდა",
  lock: "დადასტურება",
  pickFirst: "აირჩიე ვარიანტი",
  locked: "დადასტურდა",
  sending: "იგზავნება…",
  waiting: "ველოდებით დანარჩენებს…",
  lockedOf: (done, total) => `${done}/${total} დაადასტურა`,
  pickWas: (c) => `${c}-მ აირჩია`,
  readIt: "გამოიცანი!",
  missed: "ვერ გამოიცანი",
  noPrediction: "არჩევანის გარეშე",
  voided: "არჩევანი არ გაკეთებულა — რაუნდი ქულების გარეშე.",
  nextRound: "მოდის შემდეგი რაუნდი…",
  lastRound: "ბოლო რაუნდი",
  readsStat: "გამოცნობები",
  readsDetail: (r) => `${r} გამოცნობა`,
  disconnectedNotice: "კავშირი გაწყდა. ხელახლა ვუკავშირდებით; დროის ათვლა გრძელდება.",
};

const TR: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Tur ${n} / ${total}`,
  chooserTag: "Mentalist",
  youChoose: "Birini seç — gizlice",
  youChooseHint: "Diğerleri tam olarak kimi seçtiğini okumaya çalışacak.",
  waitChoose: (c) => `${c} seçiyor…`,
  chosen: "Seçti",
  youPredict: (c) => `${c} kimi seçti?`,
  youPredictHint: "Tam onun seçimini kilitle — değiştiremezsin.",
  beingRead: "Seni okumaya çalışıyorlar…",
  predicted: "Kilitlendi",
  lock: "Kilitle",
  pickFirst: "Bir seçenek seç",
  locked: "Kilitlendi",
  sending: "Gönderiliyor…",
  waiting: "Diğerleri bekleniyor…",
  lockedOf: (done, total) => `${done}/${total} kilitledi`,
  pickWas: (c) => `${c} şunu seçti`,
  readIt: "Okudun!",
  missed: "Iskaladın",
  noPrediction: "Seçim yok",
  voided: "Seçim yapılmadı — bu turda puan yok.",
  nextRound: "Sıradaki tur geliyor…",
  lastRound: "Son tur",
  readsStat: "Okumalar",
  readsDetail: (r) => `${r} okuma`,
  disconnectedNotice: "Bağlantı koptu. Yeniden bağlanılıyor; süre işlemeye devam ediyor.",
};

const BY_LOCALE: Record<string, MentalistaRoomCopy> = { en: EN, es: ES, ka: KA, tr: TR };

export function mentalistaRoomCopy(locale: string): MentalistaRoomCopy {
  return BY_LOCALE[locale] ?? EN;
}
