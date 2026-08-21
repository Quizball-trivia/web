/** Shared football trivia pool for the mini-games (Trivia Spin, Penalty
 *  Shootout, Daily Jackpot). Multiple choice with a single correct index.
 *  Sourced from the real published question pool (staging DB export),
 *  bilingual EN/KA — resolve with getTrivia(locale). */

import type { MiniLocale } from '../lib/i18n';

interface BilingualText {
  en: string;
  ka: string;
}

export interface TriviaQuestion {
  id: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: { url: string; width: number; height: number };
}

interface BilingualTrivia extends Omit<TriviaQuestion, 'q' | 'options'> {
  q: BilingualText;
  options: BilingualText[];
}

const BANK: BilingualTrivia[] = [
  {
    id: 'q1',
    q: { en: 'Which club has won the most Serie A titles in Italy?', ka: 'რომელ კლუბს აქვს მოგებული ყველაზე მეტი სერია A-ს ტიტული იტალიაში?' },
    options: [
      { en: 'AC Milan', ka: 'მილანი' },
      { en: 'Inter Milan', ka: 'ინტერ მილანი' },
      { en: 'Juventus', ka: 'იუვენტუსი' },
      { en: 'AS Roma', ka: 'რომა' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q2',
    q: { en: 'Who is the all-time top scorer for the England men\'s national team?', ka: 'ვინ არის ინგლისის ვაჟთა ეროვნული ნაკრების ყველა დროის საუკეთესო ბომბარდირი?' },
    options: [
      { en: 'Wayne Rooney', ka: 'უეინ რუნი' },
      { en: 'Bobby Charlton', ka: 'ბობი ჩარლტონი' },
      { en: 'Gary Lineker', ka: 'გარი ლინეკერი' },
      { en: 'Harry Kane', ka: 'ჰარი კეინი' },
    ],
    answer: 3,
    difficulty: 'medium',
  },
  {
    id: 'q3',
    q: { en: 'Which player holds the record for the most red cards in La Liga history?', ka: 'რომელ მოთამაშეს ეკუთვნის ლა ლიგის ისტორიაში ყველაზე მეტი წითელი ბარათის რეკორდი?' },
    options: [
      { en: 'Pepe', ka: 'პეპე' },
      { en: 'Sergio Ramos', ka: 'სერხიო რამოსი' },
      { en: 'Diego Simeone', ka: 'დიეგო სიმეონე' },
      { en: 'Fernando Hierro', ka: 'ფერნანდო იერო' },
    ],
    answer: 1,
    difficulty: 'medium',
  },
  {
    id: 'q4',
    q: { en: 'Which African player won the Ballon d\'Or in 1995?', ka: 'რომელმა აფრიკელმა მოთამაშემ მოიგო ოქროს ბურთი 1995 წელს?' },
    options: [
      { en: 'Didier Drogba', ka: 'დიდიე დროგბა' },
      { en: 'Samuel Eto\'o', ka: 'სამუელ ეტო\'ო' },
      { en: 'George Weah', ka: 'ჯორჯ ვეა' },
      { en: 'Roger Milla', ka: 'როჟე მილა' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q5',
    q: { en: 'Which player won the Golden Boot at the 2014 Men\'s FIFA World Cup?', ka: 'რომელმა მოთამაშემ მოიგო ოქროს ბუცი 2014 წლის მამაკაცთა ფიფას მსოფლიო ჩემპიონატზე?' },
    options: [
      { en: 'Thomas Müller', ka: 'თომას მიულერი' },
      { en: 'Lionel Messi', ka: 'ლიონელ მესი' },
      { en: 'James Rodríguez', ka: 'ხამეს როდრიგესი' },
      { en: 'Robin van Persie', ka: 'რობინ ვან პერსი' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q6',
    q: { en: 'Which manager has won the most UEFA Champions League titles?', ka: 'რომელ მწვრთნელს აქვს მოგებული უეფას ჩემპიონთა ლიგის ყველაზე მეტი ტიტული?' },
    options: [
      { en: 'Pep Guardiola', ka: 'პეპ გვარდიოლა' },
      { en: 'Sir Alex Ferguson', ka: 'სერ ალექს ფერგიუსონი' },
      { en: 'Carlo Ancelotti', ka: 'კარლო ანჩელოტი' },
      { en: 'Zinedine Zidane', ka: 'ზინედინ ზიდანი' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q7',
    q: { en: 'Who scored the winning goal in extra time during the 2010 World Cup final?', ka: 'ვინ გაიტანა გამარჯვების გოლი დამატებით დროში 2010 წლის მსოფლიო ჩემპიონატის ფინალში?' },
    options: [
      { en: 'David Villa', ka: 'დავიდ ვილია' },
      { en: 'Fernando Torres', ka: 'ფერნანდო ტორესი' },
      { en: 'Xavi', ka: 'ჩავი' },
      { en: 'Andrés Iniesta', ka: 'ანდრეს ინიესტა' },
    ],
    answer: 3,
    difficulty: 'medium',
  },
  {
    id: 'q8',
    q: { en: 'Which team won the 2004 UEFA European Championship in a massive upset?', ka: 'რომელმა გუნდმა მოიგო 2004 წლის უეფას ევროპის ჩემპიონატი მოულოდნელი გამარჯვებით?' },
    options: [
      { en: 'Portugal', ka: 'პორტუგალია' },
      { en: 'Denmark', ka: 'დანია' },
      { en: 'Greece', ka: 'საბერძნეთი' },
      { en: 'Czech Republic', ka: 'ჩეხეთის რესპუბლიკა' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q9',
    q: { en: 'Which English team was the first to win the European Cup in 1968?', ka: 'რომელი ინგლისური გუნდი იყო პირველი, რომელმაც 1968 წელს ევროპის თასი მოიგო?' },
    options: [
      { en: 'Liverpool', ka: 'ლივერპული' },
      { en: 'Manchester United', ka: 'მანჩესტერ იუნაიტედი' },
      { en: 'Nottingham Forest', ka: 'ნოტინგემ ფორესტი' },
      { en: 'Aston Villa', ka: 'ასტონ ვილა' },
    ],
    answer: 1,
    difficulty: 'medium',
  },
  {
    id: 'q10',
    q: { en: 'Which club won the 2003-04 UEFA Champions League under Jose Mourinho?', ka: 'რომელმა კლუბმა მოიგო 2003-04 წლების უეფას ჩემპიონთა ლიგა ჟოზე მოურინიოს ხელმძღვანელობით?' },
    options: [
      { en: 'Chelsea', ka: 'ჩელსი' },
      { en: 'Inter Milan', ka: 'ინტერი' },
      { en: 'FC Porto', ka: 'პორტუ' },
      { en: 'AS Monaco', ka: 'მონაკო' },
    ],
    answer: 2,
    difficulty: 'medium',
  },
  {
    id: 'q11',
    q: { en: 'What was the original name of Manchester United when the club was founded in 1878?', ka: 'რა იყო მანჩესტერ იუნაიტედის თავდაპირველი სახელი, როდესაც კლუბი 1878 წელს დაარსდა?' },
    options: [
      { en: 'Manchester Central FC', ka: 'მანჩესტერ ცენტრალ ფკ' },
      { en: 'Newton Heath LYR Football Club', ka: 'ნიუტონ ჰით LYR საფეხბურთო კლუბი' },
      { en: 'Stretford End FC', ka: 'სტრეტფორდ ენდ ფკ' },
      { en: 'Salford City Rovers', ka: 'სალფორდ სიტი როვერსი' },
    ],
    answer: 1,
    difficulty: 'hard',
  },
  {
    id: 'q12',
    q: { en: 'Which club did Thierry Henry play for immediately before joining Arsenal in 1999?', ka: 'რომელ კლუბში თამაშობდა ტიერი ანრი 1999 წელს არსენალში გადასვლამდე?' },
    options: [
      { en: 'AS Monaco', ka: 'ას მონაკო' },
      { en: 'Barcelona', ka: 'ბარსელონა' },
      { en: 'Juventus', ka: 'იუვენტუსი' },
      { en: 'Paris Saint-Germain', ka: 'პარი სენ-ჟერმენი' },
    ],
    answer: 2,
    difficulty: 'hard',
  },
  {
    id: 'q13',
    q: { en: 'Who was the first football player to cost over €100 million in a transfer?', ka: 'ვინ იყო პირველი ფეხბურთელი, რომლის ტრანსფერიც 100 მილიონ ევროზე მეტი დაჯდა?' },
    options: [
      { en: 'Cristiano Ronaldo', ka: 'კრიშტიანუ რონალდუ' },
      { en: 'Paul Pogba', ka: 'პოლ პოგბა' },
      { en: 'Gareth Bale', ka: 'გარეთ ბეილი' },
      { en: 'Neymar', ka: 'ნეიმარი' },
    ],
    answer: 2,
    difficulty: 'hard',
  },
  {
    id: 'q14',
    q: { en: 'Which player has made the most appearances in Premier League history?', ka: 'რომელ მოთამაშეს აქვს ჩატარებული ყველაზე მეტი მატჩი პრემიერ ლიგის ისტორიაში?' },
    options: [
      { en: 'Ryan Giggs', ka: 'რაიან გიგზი' },
      { en: 'Frank Lampard', ka: 'ფრენკ ლემპარდი' },
      { en: 'James Milner', ka: 'ჯეიმს მილნერი' },
      { en: 'Gareth Barry', ka: 'გარეთ ბარი' },
    ],
    answer: 3,
    difficulty: 'hard',
  },
  {
    id: 'q15',
    q: { en: 'Who is the highest-scoring defender in the history of professional football?', ka: 'ვინ არის ყველაზე მეტი გოლის ავტორი მცველი პროფესიონალური ფეხბურთის ისტორიაში?' },
    options: [
      { en: 'Roberto Carlos', ka: 'რობერტო კარლოსი' },
      { en: 'Sergio Ramos', ka: 'სერხიო რამოსი' },
      { en: 'Ronald Koeman', ka: 'რონალდ კუმანი' },
      { en: 'Franz Beckenbauer', ka: 'ფრანც ბეკენბაუერი' },
    ],
    answer: 2,
    difficulty: 'hard',
  },
  {
    id: 'q16',
    q: { en: 'Which player holds the record for the most goals in a single Men\'s World Cup tournament (13 goals)?', ka: 'რომელ მოთამაშეს ეკუთვნის რეკორდი ერთ მსოფლიო ჩემპიონატზე გატანილი ყველაზე მეტი გოლით (13 გოლი)?' },
    options: [
      { en: 'Just Fontaine', ka: 'ჟიუსტ ფონტენი' },
      { en: 'Gerd Müller', ka: 'გერდ მიულერი' },
      { en: 'Miroslav Klose', ka: 'მიროსლავ კლოზე' },
      { en: 'Pelé', ka: 'პელე' },
    ],
    answer: 0,
    difficulty: 'hard',
  },
  {
    id: 'q17',
    q: { en: 'Which African nation won the gold medal in men\'s football at the 1996 Olympic Games?', ka: 'რომელმა აფრიკულმა ქვეყანამ მოიპოვა ოქროს მედალი ვაჟთა ფეხბურთში 1996 წლის ოლიმპიურ თამაშებზე?' },
    options: [
      { en: 'Cameroon', ka: 'კამერუნი' },
      { en: 'Senegal', ka: 'სენეგალი' },
      { en: 'Ghana', ka: 'განა' },
      { en: 'Nigeria', ka: 'ნიგერია' },
    ],
    answer: 3,
    difficulty: 'hard',
  },
  {
    id: 'q18',
    q: { en: 'Who is the all-time leading goalscorer in the French Ligue 1?', ka: 'ვინ არის საფრანგეთის ლიგა 1-ის ყველა დროის საუკეთესო ბომბარდირი?' },
    options: [
      { en: 'Kylian Mbappé', ka: 'კილიან მბაპე' },
      { en: 'Jean-Pierre Papin', ka: 'ჟან-პიერ პაპენი' },
      { en: 'Delio Onnis', ka: 'დელიო ონისი' },
      { en: 'Thierry Henry', ka: 'ტიერი ანრი' },
    ],
    answer: 2,
    difficulty: 'hard',
  },
];

function resolve(row: BilingualTrivia, locale: MiniLocale): TriviaQuestion {
  return {
    ...row,
    q: row.q[locale],
    options: row.options.map((o) => o[locale]),
  };
}

export function getTrivia(locale: MiniLocale): TriviaQuestion[] {
  return BANK.map((row) => resolve(row, locale));
}

export function getHardQuestions(locale: MiniLocale): TriviaQuestion[] {
  return getTrivia(locale).filter((q) => q.difficulty === 'hard');
}

// Back-compat for the /dev pages and not-yet-localized callers.
export const TRIVIA: TriviaQuestion[] = getTrivia('en');
export const HARD_QUESTIONS: TriviaQuestion[] = getHardQuestions('en');
