import type { Locale } from "./locale-config";
import type { MessageKey } from "./messages";

// A small synchronous subset for non-React callers that can run before locale chunks load.
// Regression tests require these values to match the canonical message dictionaries.
const en = {
  "dailyChallenge.answerPrefix": "Answer",
  "dailyChallenge.chainComplete": "Chain complete.",
  "dailyChallenge.correct": "Correct.",
  "dailyChallenge.correctAnswers": "Correct answers",
  "dailyChallenge.higherValueInstruction": "Pick who has the higher value. A wrong answer ends the chain.",
  "dailyChallenge.imposterInstruction": "Select the exact set of correct answers.",
  "dailyChallenge.matchup": "Matchup",
  "dailyChallenge.pick": "Pick",
  "dailyChallenge.round": "Round",
  "dailyChallenge.roundFailed": "Round failed.",
  "dailyChallenge.score": "Score",
  "common.submit": "Submit",
  "dailyChallenge.submitSelection": "Submit Selection",
  "dailyChallenge.typePlayerName": "Type the player name",
  "dailyChallenge.typeYourAnswer": "Type your answer",
  "auth.sessionEnded": "Your session has ended",
  "notifications.challengeReceivedToast": "Challenge from {name}",
  "notifications.challengeAccepted": "Challenge accepted",
  "notifications.challengeDeclined": "Challenge declined",
  "notifications.challengeExpired": "Challenge expired",
  "errors.INSUFFICIENT_TICKETS": "Not enough tickets"
} as const satisfies Partial<Record<MessageKey, string>>;

const es = {
  "dailyChallenge.answerPrefix": "Respuesta",
  "dailyChallenge.chainComplete": "Cadena completada.",
  "dailyChallenge.correct": "Correcto.",
  "dailyChallenge.correctAnswers": "Respuestas correctas",
  "dailyChallenge.higherValueInstruction": "Elige quién tiene mayor valor. Un fallo rompe la cadena.",
  "dailyChallenge.imposterInstruction": "Selecciona el conjunto exacto de respuestas correctas.",
  "dailyChallenge.matchup": "Enfrentamiento",
  "dailyChallenge.pick": "Elegir",
  "dailyChallenge.round": "Ronda",
  "dailyChallenge.roundFailed": "Ronda fallida.",
  "dailyChallenge.score": "Puntuación",
  "common.submit": "Enviar",
  "dailyChallenge.submitSelection": "Enviar selección",
  "dailyChallenge.typePlayerName": "Escribe el nombre del jugador",
  "dailyChallenge.typeYourAnswer": "Escribe tu respuesta",
  "auth.sessionEnded": "Tu sesión ha finalizado",
  "notifications.challengeReceivedToast": "Desafío de {name}",
  "notifications.challengeAccepted": "Desafío aceptado",
  "notifications.challengeDeclined": "Desafío rechazado",
  "notifications.challengeExpired": "Desafío caducado",
  "errors.INSUFFICIENT_TICKETS": "No tienes suficientes tickets"
} satisfies Record<keyof typeof en, string>;

const ka = {
  "dailyChallenge.answerPrefix": "პასუხი",
  "dailyChallenge.chainComplete": "ჯაჭვი დასრულებულია.",
  "dailyChallenge.correct": "სწორია.",
  "dailyChallenge.correctAnswers": "სწორი პასუხები",
  "dailyChallenge.higherValueInstruction": "აირჩიე, ვის აქვს უფრო მაღალი მაჩვენებელი. არასწორი პასუხი წყვეტს ჯაჭვს.",
  "dailyChallenge.imposterInstruction": "აირჩიე სწორი პასუხების ზუსტი ნაკრები.",
  "dailyChallenge.matchup": "დაპირისპირება",
  "dailyChallenge.pick": "აირჩიე",
  "dailyChallenge.round": "რაუნდი",
  "dailyChallenge.roundFailed": "რაუნდი ჩაიშალა.",
  "dailyChallenge.score": "ქულა",
  "common.submit": "გაგზავნა",
  "dailyChallenge.submitSelection": "არჩევანის დადასტურება",
  "dailyChallenge.typePlayerName": "ჩაწერე მოთამაშის სახელი",
  "dailyChallenge.typeYourAnswer": "ჩაწერე შენი პასუხი",
  "auth.sessionEnded": "თქვენი სესია დასრულდა",
  "notifications.challengeReceivedToast": "გამოწვევა {name}-სგან",
  "notifications.challengeAccepted": "გამოწვევა მიღებულია",
  "notifications.challengeDeclined": "გამოწვევა უარყოფილია",
  "notifications.challengeExpired": "გამოწვევის ვადა ამოიწურა",
  "errors.INSUFFICIENT_TICKETS": "არ გაქვთ საკმარისი ბილეთები"
} satisfies Record<keyof typeof en, string>;

const tr = {
  "dailyChallenge.answerPrefix": "Cevap",
  "dailyChallenge.chainComplete": "Zincir tamamlandı.",
  "dailyChallenge.correct": "Doğru.",
  "dailyChallenge.correctAnswers": "Doğru cevaplar",
  "dailyChallenge.higherValueInstruction": "Daha yüksek değere sahip olanı seç. Yanlış cevap zinciri bitirir.",
  "dailyChallenge.imposterInstruction": "Doğru cevapların tam setini seç.",
  "dailyChallenge.matchup": "Eşleşme",
  "dailyChallenge.pick": "Seç",
  "dailyChallenge.round": "Tur",
  "dailyChallenge.roundFailed": "Tur başarısız oldu.",
  "dailyChallenge.score": "Skor",
  "common.submit": "Gönder",
  "dailyChallenge.submitSelection": "Seçimi Gönder",
  "dailyChallenge.typePlayerName": "Oyuncu adını yaz",
  "dailyChallenge.typeYourAnswer": "Cevabını yaz",
  "auth.sessionEnded": "Oturumun sona erdi",
  "notifications.challengeReceivedToast": "{name} tarafından meydan okuma",
  "notifications.challengeAccepted": "Meydan okuma kabul edildi",
  "notifications.challengeDeclined": "Meydan okuma reddedildi",
  "notifications.challengeExpired": "Meydan okuma süresi doldu",
  "errors.INSUFFICIENT_TICKETS": "Yeterli bilet yok"
} satisfies Record<keyof typeof en, string>;

export type RuntimeMessageKey = keyof typeof en;
export const RUNTIME_MESSAGE_KEYS = Object.keys(en) as RuntimeMessageKey[];
const dictionaries: Record<Locale, Readonly<Record<RuntimeMessageKey, string>>> = { en, es, ka, tr };

export function translateRuntimeCopy(locale: Locale, key: RuntimeMessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[locale][key];
  return params ? template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] === undefined ? match : String(params[name])) : template;
}

