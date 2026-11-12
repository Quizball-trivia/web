/**
 * Mentalista Futbolero — the REAL room screens' copy, in every supported UI locale (en / es / ka / tr / ru / pt / de /
 * fr). The table is a `Record<Locale, …>`, so a supported locale can never silently fall back to English; only an
 * unknown locale string does. This is interface copy only: the game's category content is a separate concern and is
 * NOT implied to exist in all of these languages. Separate from the playground prototype's `mentalista.copy.ts`.
 * Common room words (you / leave / away / offline / youWon / …) come from `wordSharedCopy`; only the game-specific
 * strings live here. No real football content.
 */

import { isSupportedLocale, type Locale } from "@/lib/i18n/locale-config";

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

const RU: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Раунд ${n} из ${total}`,
  chooserTag: "Менталист",
  youChoose: "Выбери одного — тайно",
  youChooseHint: "Остальные попробуют угадать именно твой выбор.",
  waitChoose: (c) => `${c} выбирает…`,
  chosen: "Выбор сделан",
  youPredict: (c) => `Кого выбрал игрок ${c}?`,
  youPredictHint: "Зафиксируй точный выбор менталиста — изменить будет нельзя.",
  beingRead: "Тебя пытаются прочитать…",
  predicted: "Зафиксировано",
  lock: "Зафиксировать",
  pickFirst: "Выбери вариант",
  locked: "Зафиксировано",
  sending: "Отправка…",
  waiting: "Ждём остальных…",
  lockedOf: (done, total) => `Зафиксировали: ${done}/${total}`,
  pickWas: (c) => `Выбор менталиста (${c})`,
  readIt: "В точку!",
  missed: "Мимо",
  noPrediction: "Без ответа",
  voided: "Выбор не сделан — в этом раунде без очков.",
  nextRound: "Скоро следующий раунд…",
  lastRound: "Последний раунд",
  readsStat: "Угадано",
  readsDetail: (r) => `Угадано: ${r}`,
  disconnectedNotice: "Связь потеряна. Переподключаемся; время продолжает идти.",
};

const PT: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Rodada ${n} de ${total}`,
  chooserTag: "Mentalista",
  youChoose: "Escolha um — em segredo",
  youChooseHint: "Os outros vão tentar ler exatamente quem você escolheu.",
  waitChoose: (c) => `${c} está escolhendo…`,
  chosen: "Escolheu",
  youPredict: (c) => `Quem ${c} escolheu?`,
  youPredictHint: "Confirme a escolha exata do mentalista — não dá para mudar depois.",
  beingRead: "Estão tentando ler você…",
  predicted: "Confirmado",
  lock: "Confirmar",
  pickFirst: "Escolha uma opção",
  locked: "Confirmado",
  sending: "Enviando…",
  waiting: "Esperando os outros…",
  lockedOf: (done, total) => `${done}/${total} confirmaram`,
  pickWas: (c) => `${c} escolheu`,
  readIt: "Acertou!",
  missed: "Errou",
  noPrediction: "Sem palpite",
  voided: "Nenhuma escolha foi feita — rodada sem pontos.",
  nextRound: "Já vem a próxima rodada…",
  lastRound: "Última rodada",
  readsStat: "Acertos",
  readsDetail: (r) => `${r} acerto${r === 1 ? "" : "s"}`,
  disconnectedNotice: "Conexão perdida. Reconectando; o relógio continua correndo.",
};

const DE: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Runde ${n} von ${total}`,
  chooserTag: "Mentalist",
  youChoose: "Wähl einen aus — geheim",
  youChooseHint: "Die anderen versuchen, genau deine Wahl zu erraten.",
  waitChoose: (c) => `${c} wählt…`,
  chosen: "Gewählt",
  youPredict: (c) => `Wen hat ${c} gewählt?`,
  youPredictHint: "Leg dich auf die exakte Wahl fest — ändern geht danach nicht mehr.",
  beingRead: "Sie versuchen, dich zu lesen…",
  predicted: "Festgelegt",
  lock: "Festlegen",
  pickFirst: "Wähl eine Option",
  locked: "Festgelegt",
  sending: "Wird gesendet…",
  waiting: "Warte auf die anderen…",
  lockedOf: (done, total) => `${done}/${total} festgelegt`,
  pickWas: (c) => `Gewählt hat: ${c}`,
  readIt: "Volltreffer!",
  missed: "Daneben",
  noPrediction: "Kein Tipp",
  voided: "Es wurde nichts gewählt — keine Punkte in dieser Runde.",
  nextRound: "Gleich kommt die nächste Runde…",
  lastRound: "Letzte Runde",
  readsStat: "Treffer",
  readsDetail: (r) => `${r} Treffer`,
  disconnectedNotice: "Verbindung verloren. Verbinde neu; die Uhr läuft weiter.",
};

const FR: MentalistaRoomCopy = {
  brand: ["Mentalista", "Futbolero"],
  round: (n, total) => `Manche ${n} sur ${total}`,
  chooserTag: "Mentaliste",
  youChoose: "Choisis-en un — en secret",
  youChooseHint: "Les autres vont essayer de deviner exactement ton choix.",
  waitChoose: (c) => `${c} fait son choix…`,
  chosen: "Choisi",
  youPredict: (c) => `Quel est le choix de ${c} ?`,
  youPredictHint: "Valide son choix exact — impossible de le changer ensuite.",
  beingRead: "Ils essaient de lire dans tes pensées…",
  predicted: "Validé",
  lock: "Valider",
  pickFirst: "Choisis une option",
  locked: "Validé",
  sending: "Envoi…",
  waiting: "En attente des autres…",
  lockedOf: (done, total) => `${done}/${total} ont validé`,
  pickWas: (c) => `Le choix de ${c}`,
  readIt: "Bien lu !",
  missed: "Raté",
  noPrediction: "Aucun choix",
  voided: "Aucun choix n’a été fait — pas de points cette manche.",
  nextRound: "La prochaine manche arrive…",
  lastRound: "Dernière manche",
  readsStat: "Réussites",
  readsDetail: (r) => `${r} réussite${r > 1 ? "s" : ""}`,
  disconnectedNotice: "Connexion perdue. Reconnexion en cours ; le chrono continue de tourner.",
};

/** Exhaustive by type: adding a `Locale` without its copy is a compile error, never a silent English fallback. */
const BY_LOCALE: Record<Locale, MentalistaRoomCopy> = { en: EN, es: ES, ka: KA, tr: TR, ru: RU, pt: PT, de: DE, fr: FR };

/** Copy for a supported locale; an unknown locale string falls back to English. */
export function mentalistaRoomCopy(locale: string): MentalistaRoomCopy {
  return isSupportedLocale(locale) ? BY_LOCALE[locale] : EN;
}
