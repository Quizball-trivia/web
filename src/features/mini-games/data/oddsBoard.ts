/** Odds Board data: each answer is priced like a betting market. Odds reflect
 *  crowd perception, NOT correctness. Questions sourced from the real
 *  published question pool (staging DB export), bilingual EN/KA. */

import type { MiniLocale } from '../lib/i18n';

interface BilingualText {
  en: string;
  ka: string;
}

export interface OddsOption {
  text: string;
  odds: number;
}
export interface OddsQuestion {
  id: string;
  q: string;
  options: OddsOption[];
  answer: number;
}

interface BilingualOddsQuestion extends Omit<OddsQuestion, 'q' | 'options'> {
  q: BilingualText;
  options: Array<{ text: BilingualText; odds: number }>;
}

const BANK: BilingualOddsQuestion[] = [
  {
    id: 'ob1',
    q: { en: 'Which club won the Copa Libertadores in 2023?', ka: 'რომელმა კლუბმა მოიგო კოპა ლიბერტადორესი 2023 წელს?' },
    options: [
      { text: { en: 'Boca Juniors', ka: 'ბოკა ხუნიორსი' }, odds: 2.8 },
      { text: { en: 'Flamengo', ka: 'ფლამენგო' }, odds: 4.0 },
      { text: { en: 'Palmeiras', ka: 'პალმეირასი' }, odds: 9.0 },
      { text: { en: 'Fluminense', ka: 'ფლუმინენსე' }, odds: 1.4 },
    ],
    answer: 3,
  },
  {
    id: 'ob2',
    q: { en: 'Which of these countries has NEVER qualified for a Men\'s FIFA World Cup?', ka: 'ჩამოთვლილი ქვეყნებიდან რომელი არასოდეს გასულა მამაკაცთა ფიფას მსოფლიო ჩემპიონატზე?' },
    options: [
      { text: { en: 'Iceland', ka: 'ისლანდია' }, odds: 3.2 },
      { text: { en: 'Jamaica', ka: 'იამაიკა' }, odds: 5.0 },
      { text: { en: 'Venezuela', ka: 'ვენესუელა' }, odds: 1.3 },
      { text: { en: 'Togo', ka: 'ტოგო' }, odds: 8.0 },
    ],
    answer: 2,
  },
  {
    id: 'ob3',
    q: { en: 'Who won the European Golden Shoe for the 2013-14 season alongside Cristiano Ronaldo?', ka: 'ვინ მოიგო ევროპის ოქროს ბუცი 2013-14 წლების სეზონში კრიშტიანუ რონალდუსთან ერთად?' },
    options: [
      { text: { en: 'Lionel Messi', ka: 'ლიონელ მესი' }, odds: 2.5 },
      { text: { en: 'Luis Suárez', ka: 'ლუის სუარესი' }, odds: 1.5 },
      { text: { en: 'Zlatan Ibrahimović', ka: 'ზლატან იბრაჰიმოვიჩი' }, odds: 4.5 },
      { text: { en: 'Robert Lewandowski', ka: 'რობერტ ლევანდოვსკი' }, odds: 10.0 },
    ],
    answer: 1,
  },
  {
    id: 'ob4',
    q: { en: 'In the 1982 World Cup second round, the Soviet Union defeated Belgium by what exact score?', ka: '1982 წლის მსოფლიო ჩემპიონატის მეორე რაუნდში, რა ზუსტი ანგარიშით დაამარცხა საბჭოთა კავშირმა ბელგია?' },
    options: [
      { text: { en: '1-0', ka: '1-0' }, odds: 1.35 },
      { text: { en: '2-1', ka: '2-1' }, odds: 3.0 },
      { text: { en: '2-0', ka: '2-0' }, odds: 4.2 },
      { text: { en: '3-1', ka: '3-1' }, odds: 7.5 },
    ],
    answer: 0,
  },
  {
    id: 'ob5',
    q: { en: 'Which team did Manchester City defeat to win their first UEFA Champions League title in 2023?', ka: 'რომელი გუნდი დაამარცხა მანჩესტერ სიტიმ 2023 წელს უეფას ჩემპიონთა ლიგის პირველი ტიტულის მოსაგებად?' },
    options: [
      { text: { en: 'Real Madrid', ka: 'რეალ მადრიდი' }, odds: 1.4 },
      { text: { en: 'Chelsea', ka: 'ჩელსი' }, odds: 2.8 },
      { text: { en: 'Inter Milan', ka: 'ინტერი' }, odds: 6.0 },
      { text: { en: 'Bayern Munich', ka: 'ბაიერნი' }, odds: 4.5 },
    ],
    answer: 2,
  },
  {
    id: 'ob6',
    q: { en: 'Which country has won the most African Cup of Nations (AFCON) titles?', ka: 'რომელ ქვეყანას აქვს მოგებული აფრიკის ერთა თასის (AFCON) ყველაზე მეტი ტიტული?' },
    options: [
      { text: { en: 'Cameroon', ka: 'კამერუნი' }, odds: 1.5 },
      { text: { en: 'Ghana', ka: 'განა' }, odds: 3.0 },
      { text: { en: 'Nigeria', ka: 'ნიგერია' }, odds: 4.0 },
      { text: { en: 'Egypt', ka: 'ეგვიპტე' }, odds: 5.5 },
    ],
    answer: 3,
  },
];

export function getOddsQuestions(locale: MiniLocale): OddsQuestion[] {
  return BANK.map((row) => ({
    ...row,
    q: row.q[locale],
    options: row.options.map((o) => ({ text: o.text[locale], odds: o.odds })),
  }));
}

// Back-compat for the /dev pages and not-yet-localized callers.
export const ODDS_QUESTIONS: OddsQuestion[] = getOddsQuestions('en');
