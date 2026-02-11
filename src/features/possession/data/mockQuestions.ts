import type { GameQuestion } from '@/lib/domain/gameQuestion';

// ─── Easy ───────────────────────────────────────────────────────
export const EASY_QUESTIONS: GameQuestion[] = [
  { id: 'e1', prompt: 'Which country has won the most FIFA World Cups?', options: ['Germany', 'Brazil', 'Argentina', 'Italy'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'easy' },
  { id: 'e2', prompt: 'In which year was the first FIFA World Cup held?', options: ['1928', '1930', '1934', '1926'], correctIndex: 1, categoryName: 'History', difficulty: 'easy' },
  { id: 'e3', prompt: 'Which club has won the most UEFA Champions League titles?', options: ['AC Milan', 'Barcelona', 'Real Madrid', 'Bayern Munich'], correctIndex: 2, categoryName: 'Champions League', difficulty: 'easy' },
  { id: 'e4', prompt: 'Who scored the "Hand of God" goal?', options: ['Pel\u00e9', 'Diego Maradona', 'Zinedine Zidane', 'Johan Cruyff'], correctIndex: 1, categoryName: 'Iconic Moments', difficulty: 'easy' },
  { id: 'e5', prompt: 'Which country hosted the 2014 FIFA World Cup?', options: ['South Africa', 'Russia', 'Brazil', 'Germany'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'easy' },
  { id: 'e6', prompt: 'What does VAR stand for?', options: ['Video Analysis Review', 'Video Assistant Referee', 'Visual Aid Replay', 'Video Action Replay'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e7', prompt: 'How long is a standard football match (excluding extra time)?', options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e8', prompt: 'Which club is known as "The Red Devils"?', options: ['Liverpool', 'Arsenal', 'Manchester United', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'easy' },
  { id: 'e9', prompt: 'How many players are on the field per team?', options: ['9', '10', '11', '12'], correctIndex: 2, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e10', prompt: 'Which player is nicknamed "CR7"?', options: ['Cristiano Ronaldo', 'Carlos Tevez', 'Clarence Seedorf', 'Cafu'], correctIndex: 0, categoryName: 'Players', difficulty: 'easy' },
];

// ─── Medium ─────────────────────────────────────────────────────
export const MEDIUM_QUESTIONS: GameQuestion[] = [
  { id: 'm1', prompt: 'Who holds the record for most goals in a single World Cup tournament?', options: ['Pel\u00e9', 'Miroslav Klose', 'Just Fontaine', 'Ronaldo'], correctIndex: 2, categoryName: 'Records', difficulty: 'medium' },
  { id: 'm2', prompt: 'What is the maximum number of substitutions allowed in a standard FIFA match?', options: ['3', '4', '5', '6'], correctIndex: 2, categoryName: 'Rules', difficulty: 'medium' },
  { id: 'm3', prompt: 'Which team completed "The Invincibles" season in 2003-04?', options: ['Manchester United', 'Chelsea', 'Arsenal', 'Liverpool'], correctIndex: 2, categoryName: 'Premier League', difficulty: 'medium' },
  { id: 'm4', prompt: 'Which player has scored the most goals in Champions League history?', options: ['Lionel Messi', 'Cristiano Ronaldo', 'Ra\u00fal', 'Robert Lewandowski'], correctIndex: 1, categoryName: 'Champions League', difficulty: 'medium' },
  { id: 'm5', prompt: 'Which country won the first ever European Championship in 1960?', options: ['West Germany', 'Soviet Union', 'Spain', 'Italy'], correctIndex: 1, categoryName: 'Euros', difficulty: 'medium' },
  { id: 'm6', prompt: 'Who managed Barcelona during the "tiki-taka" era?', options: ['Frank Rijkaard', 'Pep Guardiola', 'Luis Enrique', 'Johan Cruyff'], correctIndex: 1, categoryName: 'Managers', difficulty: 'medium' },
  { id: 'm7', prompt: 'Which player scored the fastest hat-trick in Premier League history?', options: ['Robbie Fowler', 'Sadio Man\u00e9', 'Alan Shearer', 'Sergio Ag\u00fcero'], correctIndex: 1, categoryName: 'Records', difficulty: 'medium' },
  { id: 'm8', prompt: 'What year did the Premier League start?', options: ['1990', '1991', '1992', '1993'], correctIndex: 2, categoryName: 'History', difficulty: 'medium' },
  { id: 'm9', prompt: 'Which nation has appeared in the most World Cup finals?', options: ['Brazil', 'Germany', 'Argentina', 'Italy'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'medium' },
  { id: 'm10', prompt: 'Who is the all-time top scorer for the Brazilian national team?', options: ['Pel\u00e9', 'Ronaldo', 'Neymar', 'Rom\u00e1rio'], correctIndex: 2, categoryName: 'Records', difficulty: 'medium' },
];

// ─── Hard ───────────────────────────────────────────────────────
export const HARD_QUESTIONS: GameQuestion[] = [
  { id: 'h1', prompt: 'In the 1950 World Cup, which team upset Brazil in the final match (the "Maracanazo")?', options: ['Argentina', 'Uruguay', 'Sweden', 'Spain'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h2', prompt: 'Who is the youngest player to score in a World Cup final?', options: ['Pel\u00e9', 'Kylian Mbapp\u00e9', 'Michael Owen', 'Ronaldo'], correctIndex: 0, categoryName: 'Records', difficulty: 'hard' },
  { id: 'h3', prompt: 'Which club won six trophies in a single calendar year in 2009?', options: ['Real Madrid', 'Manchester United', 'Barcelona', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'hard' },
  { id: 'h4', prompt: 'How many times has the World Cup final ended 0-0 after 90 minutes?', options: ['Never', 'Once', 'Twice', 'Three times'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h5', prompt: 'Which goalkeeper has the most clean sheets in Premier League history?', options: ['David James', 'Petr \u010cech', 'Edwin van der Sar', 'Peter Schmeichel'], correctIndex: 1, categoryName: 'Premier League', difficulty: 'hard' },
  { id: 'h6', prompt: "Who won the first ever Ballon d'Or?", options: ['Alfredo Di St\u00e9fano', 'Stanley Matthews', 'Raymond Kopa', 'Lev Yashin'], correctIndex: 1, categoryName: 'Awards', difficulty: 'hard' },
  { id: 'h7', prompt: 'Which African nation was the first to reach a World Cup quarter-final?', options: ['Nigeria', 'Ghana', 'Cameroon', 'Senegal'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h8', prompt: 'What is the diameter of a regulation football?', options: ['20-22 cm', '22-23 cm', '18-20 cm', '24-26 cm'], correctIndex: 0, categoryName: 'Rules', difficulty: 'hard' },
  { id: 'h9', prompt: 'Which player scored in three different World Cup finals?', options: ['Pel\u00e9', 'Zinedine Zidane', 'Vav\u00e1', 'Kylian Mbapp\u00e9'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h10', prompt: 'Who was the first player to score 100 Champions League goals?', options: ['Lionel Messi', 'Cristiano Ronaldo', 'Ra\u00fal', 'Karim Benzema'], correctIndex: 1, categoryName: 'Champions League', difficulty: 'hard' },
];

// ─── Helpers ────────────────────────────────────────────────────
export function getQuestionPool(difficulty: 'easy' | 'medium' | 'hard'): GameQuestion[] {
  switch (difficulty) {
    case 'easy': return EASY_QUESTIONS;
    case 'medium': return MEDIUM_QUESTIONS;
    case 'hard': return HARD_QUESTIONS;
  }
}

export function pickQuestion(pool: GameQuestion[], usedIds: Set<string>): GameQuestion {
  const available = pool.filter(q => !usedIds.has(q.id));
  if (available.length === 0) {
    usedIds.clear();
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    usedIds.add(chosen.id);
    return chosen;
  }
  const chosen = available[Math.floor(Math.random() * available.length)];
  usedIds.add(chosen.id);
  return chosen;
}

export function getDifficultyLabel(d?: string): string {
  if (d === 'hard') return 'Hard';
  if (d === 'medium') return 'Medium';
  return 'Easy';
}
