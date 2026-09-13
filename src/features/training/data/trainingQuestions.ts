import type { GameQuestion } from "@/lib/domain";

/**
 * Hardcoded football trivia questions for the training match.
 * Mix of easy, medium, and hard — 6 per half.
 */
export const TRAINING_QUESTIONS: GameQuestion[] = [
  // ── Half 1 (6 questions) ──
  {
    id: "train-1",
    prompt: "Which country has won the most FIFA World Cups?",
    options: ["Germany", "Brazil", "Argentina", "Italy"],
    correctIndex: 1,
    difficulty: "easy",
    categoryName: "World Cup",
  },
  {
    id: "train-2",
    prompt: "Who holds the record for most goals in a single calendar year (91 goals in 2012)?",
    options: ["Cristiano Ronaldo", "Lionel Messi", "Gerd Müller", "Robert Lewandowski"],
    correctIndex: 1,
    difficulty: "medium",
    categoryName: "Records & Stats",
  },
  {
    id: "train-3",
    prompt: "Which club has won the most UEFA Champions League titles?",
    options: ["AC Milan", "Barcelona", "Real Madrid", "Liverpool"],
    correctIndex: 2,
    difficulty: "easy",
    categoryName: "Champions League",
  },
  {
    id: "train-4",
    prompt: "In which year did the Premier League officially start, replacing the old First Division?",
    options: ["1988", "1990", "1992", "1996"],
    correctIndex: 2,
    difficulty: "hard",
    categoryName: "Premier League",
  },
  {
    id: "train-5",
    prompt: "Which player scored the 'Hand of God' goal at the 1986 World Cup?",
    options: ["Pelé", "Diego Maradona", "Zinedine Zidane", "Johan Cruyff"],
    correctIndex: 1,
    difficulty: "medium",
    categoryName: "World Cup",
  },
  {
    id: "train-6",
    prompt: "What is the maximum number of substitutions allowed per team in a standard FIFA match (since 2022)?",
    options: ["3", "4", "5", "6"],
    correctIndex: 2,
    difficulty: "medium",
    categoryName: "Rules & Regulations",
  },
  // ── Half 2 (6 questions) ──
  {
    id: "train-7",
    prompt: "Which country won the 2022 FIFA World Cup in Qatar?",
    options: ["France", "Argentina", "Brazil", "Croatia"],
    correctIndex: 1,
    difficulty: "easy",
    categoryName: "World Cup",
  },
  {
    id: "train-8",
    prompt: "Who is this player?",
    options: ["Harry Kane", "Jamie Vardy", "Wayne Rooney", "Alan Shearer"],
    correctIndex: 0,
    difficulty: "easy",
    categoryName: "Players",
    image: { url: "/promo/players/kane.jpg", width: 330, height: 495 },
  },
  {
    id: "train-9",
    prompt: "How far is the penalty spot from the goal line?",
    options: ["10 yards", "11 yards", "12 yards", "14 yards"],
    correctIndex: 2,
    difficulty: "easy",
    categoryName: "Rules & Regulations",
  },
  {
    id: "train-10",
    prompt: "Which manager has won the most Premier League titles?",
    options: ["Arsène Wenger", "José Mourinho", "Sir Alex Ferguson", "Pep Guardiola"],
    correctIndex: 2,
    difficulty: "medium",
    categoryName: "Premier League",
  },
  {
    id: "train-11",
    prompt: "Which African nation became the first to reach a World Cup quarter-final, doing so in 1990?",
    options: ["Nigeria", "Cameroon", "Ghana", "Senegal"],
    correctIndex: 1,
    difficulty: "hard",
    categoryName: "World Cup",
  },
  {
    id: "train-12",
    prompt: "Which player has scored the most goals in Champions League history?",
    options: ["Lionel Messi", "Cristiano Ronaldo", "Robert Lewandowski", "Raúl"],
    correctIndex: 1,
    difficulty: "medium",
    categoryName: "Champions League",
  },
];

/**
 * Questions for the practice penalty shootout: one per kick (shoot, save,
 * shoot) plus a spare for the sudden-death kick when the shootout is level.
 * Kept easy — the shootout is about teaching the mechanic, not stumping.
 */
export const TRAINING_PENALTY_QUESTIONS: GameQuestion[] = [
  {
    id: "train-pen-1",
    prompt: "From how many yards is a penalty kick taken?",
    options: ["10", "12", "14", "16"],
    correctIndex: 1,
    difficulty: "easy",
    categoryName: "Rules",
  },
  {
    id: "train-pen-2",
    prompt: "Which of these is a legendary Italian goalkeeper?",
    options: ["Gianluigi Buffon", "Paolo Maldini", "Andrea Pirlo", "Francesco Totti"],
    correctIndex: 0,
    difficulty: "easy",
    categoryName: "Legends",
  },
  {
    id: "train-pen-3",
    prompt: "What is it called when a player scores three goals in one match?",
    options: ["A brace", "A hat-trick", "A treble", "A triple"],
    correctIndex: 1,
    difficulty: "easy",
    categoryName: "Basics",
  },
  {
    id: "train-pen-4",
    prompt: "Which country won the 2022 World Cup final on penalties?",
    options: ["France", "Brazil", "Argentina", "Croatia"],
    correctIndex: 2,
    difficulty: "easy",
    categoryName: "World Cup",
  },
  {
    id: "train-pen-5",
    prompt: "What colour card sends a player off the pitch?",
    options: ["Yellow", "Red", "Blue", "Green"],
    correctIndex: 1,
    difficulty: "easy",
    categoryName: "Rules",
  },
  {
    id: "train-pen-6",
    prompt: "How many players does a football team field at kick-off?",
    options: ["9", "10", "11", "12"],
    correctIndex: 2,
    difficulty: "easy",
    categoryName: "Basics",
  },
];

// ─── Localization ────────────────────────────────────────────────
// The training questions are hardcoded (no backend), so their es/ka variants
// live here too and are swapped in at render time via localizeTrainingQuestion.

interface QuestionL10n {
  prompt: string;
  options: string[];
}

const L10N: Record<string, Record<string, QuestionL10n>> = {
  es: {
    "train-1": { prompt: "¿Qué país ha ganado más Copas del Mundo de la FIFA?", options: ["Alemania", "Brasil", "Argentina", "Italia"] },
    "train-2": { prompt: "¿Quién tiene el récord de más goles en un año natural (91 goles en 2012)?", options: ["Cristiano Ronaldo", "Lionel Messi", "Gerd Müller", "Robert Lewandowski"] },
    "train-3": { prompt: "¿Qué club ha ganado más títulos de la Champions League?", options: ["AC Milan", "Barcelona", "Real Madrid", "Liverpool"] },
    "train-4": { prompt: "¿En qué año comenzó oficialmente la Premier League, reemplazando a la antigua First Division?", options: ["1988", "1990", "1992", "1996"] },
    "train-5": { prompt: "¿Qué jugador marcó el gol de la 'mano de Dios' en el Mundial de 1986?", options: ["Pelé", "Diego Maradona", "Zinedine Zidane", "Johan Cruyff"] },
    "train-6": { prompt: "¿Cuál es el número máximo de cambios por equipo en un partido estándar de la FIFA (desde 2022)?", options: ["3", "4", "5", "6"] },
    "train-7": { prompt: "¿Qué país ganó la Copa del Mundo 2022 en Catar?", options: ["Francia", "Argentina", "Brasil", "Croacia"] },
    "train-8": { prompt: "¿Quién es este jugador?", options: ["Harry Kane", "Jamie Vardy", "Wayne Rooney", "Alan Shearer"] },
    "train-9": { prompt: "¿A qué distancia está el punto de penalti de la línea de gol?", options: ["10 yardas", "11 yardas", "12 yardas", "14 yardas"] },
    "train-10": { prompt: "¿Qué entrenador ha ganado más títulos de la Premier League?", options: ["Arsène Wenger", "José Mourinho", "Sir Alex Ferguson", "Pep Guardiola"] },
    "train-11": { prompt: "¿Qué país africano fue el primero en llegar a cuartos de final de un Mundial, en 1990?", options: ["Nigeria", "Camerún", "Ghana", "Senegal"] },
    "train-12": { prompt: "¿Qué jugador ha marcado más goles en la historia de la Champions League?", options: ["Lionel Messi", "Cristiano Ronaldo", "Robert Lewandowski", "Raúl"] },
    "train-pen-1": { prompt: "¿Desde cuántas yardas se lanza un penalti?", options: ["10", "12", "14", "16"] },
    "train-pen-2": { prompt: "¿Cuál de estos es un portero italiano legendario?", options: ["Gianluigi Buffon", "Paolo Maldini", "Andrea Pirlo", "Francesco Totti"] },
    "train-pen-3": { prompt: "¿Cómo se llama cuando un jugador marca tres goles en un partido?", options: ["Un doblete", "Un hat-trick", "Un triplete", "Un triple"] },
    "train-pen-4": { prompt: "¿Qué país ganó la final del Mundial 2022 en los penaltis?", options: ["Francia", "Brasil", "Argentina", "Croacia"] },
    "train-pen-5": { prompt: "¿Qué tarjeta expulsa a un jugador del campo?", options: ["Amarilla", "Roja", "Azul", "Verde"] },
    "train-pen-6": { prompt: "¿Con cuántos jugadores sale un equipo de fútbol al inicio del partido?", options: ["9", "10", "11", "12"] },
  },
  ka: {
    "train-1": { prompt: "რომელ ქვეყანას აქვს მოგებული ყველაზე მეტი FIFA-ს მსოფლიო თასი?", options: ["გერმანია", "ბრაზილია", "არგენტინა", "იტალია"] },
    "train-2": { prompt: "ვის ეკუთვნის ერთ კალენდარულ წელს გატანილი გოლების რეკორდი (91 გოლი 2012 წელს)?", options: ["კრიშტიანუ რონალდუ", "ლიონელ მესი", "გერდ მიულერი", "რობერტ ლევანდოვსკი"] },
    "train-3": { prompt: "რომელ კლუბს აქვს მოგებული ყველაზე მეტი ჩემპიონთა ლიგის ტიტული?", options: ["მილანი", "ბარსელონა", "რეალ მადრიდი", "ლივერპული"] },
    "train-4": { prompt: "რომელ წელს დაიწყო ოფიციალურად პრემიერ ლიგა, რომელმაც ძველი პირველი დივიზიონი ჩაანაცვლა?", options: ["1988", "1990", "1992", "1996"] },
    "train-5": { prompt: "რომელმა მოთამაშემ გაიტანა „ღმერთის ხელის“ გოლი 1986 წლის მსოფლიო თასზე?", options: ["პელე", "დიეგო მარადონა", "ზინედინ ზიდანი", "იოჰან კროიფი"] },
    "train-6": { prompt: "მაქსიმუმ რამდენი შეცვლაა დაშვებული გუნდზე სტანდარტულ FIFA-ს მატჩში (2022 წლიდან)?", options: ["3", "4", "5", "6"] },
    "train-7": { prompt: "რომელმა ქვეყანამ მოიგო 2022 წლის მსოფლიო თასი კატარში?", options: ["საფრანგეთი", "არგენტინა", "ბრაზილია", "ხორვატია"] },
    "train-8": { prompt: "ვინ არის ეს მოთამაშე?", options: ["ჰარი კეინი", "ჯეიმი ვარდი", "უეინ რუნი", "ალან შირერი"] },
    "train-9": { prompt: "რა მანძილზეა პენალტის წერტილი კარის ხაზიდან?", options: ["10 იარდი", "11 იარდი", "12 იარდი", "14 იარდი"] },
    "train-10": { prompt: "რომელ მწვრთნელს აქვს მოგებული ყველაზე მეტი პრემიერ ლიგის ტიტული?", options: ["არსენ ვენგერი", "ჟოზე მოურინიო", "სერ ალექს ფერგიუსონი", "პეპ გვარდიოლა"] },
    "train-11": { prompt: "რომელი აფრიკული ქვეყანა გავიდა პირველად მსოფლიო თასის მეოთხედფინალში 1990 წელს?", options: ["ნიგერია", "კამერუნი", "განა", "სენეგალი"] },
    "train-12": { prompt: "რომელ მოთამაშეს აქვს გატანილი ყველაზე მეტი გოლი ჩემპიონთა ლიგის ისტორიაში?", options: ["ლიონელ მესი", "კრიშტიანუ რონალდუ", "რობერტ ლევანდოვსკი", "რაული"] },
    "train-pen-1": { prompt: "რამდენი იარდიდან სრულდება პენალტი?", options: ["10", "12", "14", "16"] },
    "train-pen-2": { prompt: "რომელია ლეგენდარული იტალიელი მეკარე?", options: ["ჯანლუიჯი ბუფონი", "პაოლო მალდინი", "ანდრეა პირლო", "ფრანჩესკო ტოტი"] },
    "train-pen-3": { prompt: "რა ჰქვია, როცა მოთამაშე ერთ მატჩში სამ გოლს იტანს?", options: ["დუბლი", "ჰეთ-ტრიკი", "ტრებლი", "ტრიპლი"] },
    "train-pen-4": { prompt: "რომელმა ქვეყანამ მოიგო 2022 წლის მსოფლიო თასის ფინალი პენალტებით?", options: ["საფრანგეთი", "ბრაზილია", "არგენტინა", "ხორვატია"] },
    "train-pen-5": { prompt: "რომელი ფერის ბარათი აძევებს მოთამაშეს მოედნიდან?", options: ["ყვითელი", "წითელი", "ლურჯი", "მწვანე"] },
    "train-pen-6": { prompt: "რამდენი მოთამაშით იწყებს საფეხბურთო გუნდი მატჩს?", options: ["9", "10", "11", "12"] },
  },
};

/** Swap a training question's prompt/options for the active locale (en = as-authored). */
export function localizeTrainingQuestion(question: GameQuestion, locale: string): GameQuestion {
  const l10n = L10N[locale]?.[question.id];
  if (!l10n) return question;
  return {
    ...question,
    prompt: l10n.prompt,
    options: l10n.options.length === question.options.length ? l10n.options : question.options,
  };
}
