import { asWordLocale } from "@/features/wordgames/copy";

/** Copy of the name chain's relaxed practice (untimed, unranked). The rest of the screen uses the word games' copy. */
const practice = {
  en: {
    open: "Relaxed practice", hint: "No timer, not ranked: learn the names at your own pace.", badge: "Practice",
    banner: "No clock. Take your time: practice never counts for the leaderboard.",
    inChain: (n: number) => `${n} in this chain`, best: (n: number) => `Longest chain: ${n}`,
    endChain: "End chain", chainOver: "Chain over", newChain: "New chain", back: "Back to the daily", fromEnd: "Relaxed practice (no timer)",
    nobodyLeft: "No start names left. Great practice!",
  },
  es: {
    open: "Práctica tranquila", hint: "Sin reloj y sin ranking: aprendé los nombres a tu ritmo.", badge: "Práctica",
    banner: "Sin reloj. Tomate tu tiempo: la práctica no cuenta para el ranking.",
    inChain: (n: number) => `En esta cadena: ${n}`, best: (n: number) => `Cadena más larga: ${n}`,
    endChain: "Terminar cadena", chainOver: "Se acabó la cadena", newChain: "Nueva cadena", back: "Volver al desafío del día", fromEnd: "Práctica tranquila (sin reloj)",
    nobodyLeft: "No quedan nombres para empezar. ¡Buena práctica!",
  },
  ka: {
    open: "მშვიდი ვარჯიში", hint: "ტაიმერისა და რეიტინგის გარეშე: ისწავლე სახელები შენი ტემპით.", badge: "ვარჯიში",
    banner: "საათი არ არის. იფიქრე რამდენიც გინდა: ვარჯიში რეიტინგში არ ითვლება.",
    inChain: (n: number) => `ამ ჯაჭვში: ${n}`, best: (n: number) => `ყველაზე გრძელი ჯაჭვი: ${n}`,
    endChain: "ჯაჭვის დასრულება", chainOver: "ჯაჭვი დასრულდა", newChain: "ახალი ჯაჭვი", back: "დღის თამაშზე დაბრუნება", fromEnd: "მშვიდი ვარჯიში (ტაიმერის გარეშე)",
    nobodyLeft: "საწყისი სახელები ამოიწურა. კარგი ვარჯიში იყო!",
  },
  tr: {
    open: "Rahat antrenman", hint: "Süre yok, sıralamaya sayılmaz: isimleri kendi hızında öğren.", badge: "Antrenman",
    banner: "Süre yok. Acele etme; antrenman sıralamaya sayılmaz.",
    inChain: (n: number) => `Bu zincirde ${n} futbolcu`, best: (n: number) => `En uzun zincir: ${n}`,
    endChain: "Zinciri bitir", chainOver: "Zincir bitti", newChain: "Yeni zincir", back: "Günün oyununa dön", fromEnd: "Rahat antrenman (süresiz)",
    nobodyLeft: "Başlatacak isim kalmadı. Harika bir antrenmandı!",
  },
  ru: {
    open: "Спокойная тренировка", hint: "Без таймера и без рейтинга: учи имена в своём темпе.", badge: "Тренировка",
    banner: "Таймера нет. Не торопись: тренировка не идёт в рейтинг.",
    inChain: (n: number) => `В этой цепочке: ${n}`, best: (n: number) => `Самая длинная цепочка: ${n}`,
    endChain: "Закончить цепочку", chainOver: "Цепочка закончилась", newChain: "Новая цепочка", back: "Вернуться к игре дня", fromEnd: "Спокойная тренировка (без таймера)",
    nobodyLeft: "Стартовые имена закончились. Отличная тренировка!",
  },
  pt: {
    open: "Treino tranquilo", hint: "Sem cronômetro e fora do ranking: aprenda os nomes no seu ritmo.", badge: "Treino",
    banner: "Sem relógio. Vá com calma: o treino não conta para o ranking.",
    inChain: (n: number) => `Nesta sequência: ${n}`, best: (n: number) => `Maior sequência: ${n}`,
    endChain: "Encerrar sequência", chainOver: "Fim da sequência", newChain: "Nova sequência", back: "Voltar ao desafio do dia", fromEnd: "Treino tranquilo (sem cronômetro)",
    nobodyLeft: "Acabaram os nomes iniciais. Ótimo treino!",
  },
  de: {
    open: "Entspanntes Training", hint: "Ohne Timer und ohne Rangliste: Lerne die Namen in deinem Tempo.", badge: "Training",
    banner: "Keine Uhr. Lass dir Zeit: Training zählt nicht für die Rangliste.",
    inChain: (n: number) => `In dieser Kette: ${n}`, best: (n: number) => `Längste Kette: ${n}`,
    endChain: "Kette beenden", chainOver: "Kette vorbei", newChain: "Neue Kette", back: "Zurück zum Tagesspiel", fromEnd: "Entspanntes Training (ohne Timer)",
    nobodyLeft: "Keine Startnamen mehr übrig. Starkes Training!",
  },
  fr: {
    open: "Entraînement libre", hint: "Sans chrono ni classement : apprends les noms à ton rythme.", badge: "Entraînement",
    banner: "Pas de chrono. Prends ton temps : l’entraînement ne compte jamais pour le classement.",
    inChain: (n: number) => `Dans cette suite : ${n}`, best: (n: number) => `Plus longue suite : ${n}`,
    endChain: "Terminer la suite", chainOver: "Suite terminée", newChain: "Nouvelle suite", back: "Retour au défi du jour", fromEnd: "Entraînement libre (sans chrono)",
    nobodyLeft: "Il ne reste aucun nom de départ. Bel entraînement !",
  },
} as const;

export const nameChainPracticeCopy = (locale: string) => practice[asWordLocale(locale)];
