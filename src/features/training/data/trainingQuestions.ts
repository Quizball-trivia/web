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
    prompt: "Which goalkeeper has won the most Ballon d'Or awards?",
    options: ["Gianluigi Buffon", "Manuel Neuer", "Lev Yashin", "Oliver Kahn"],
    correctIndex: 2,
    difficulty: "hard",
    categoryName: "Awards & Trophies",
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
