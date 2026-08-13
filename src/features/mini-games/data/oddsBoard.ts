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
    q: { en: 'Which team did Manchester City defeat to win their first UEFA Champions League title in 2023?', ka: 'რომელი გუნდი დაამარცხა მანჩესტერ სიტიმ 2023 წელს უეფას ჩემპიონთა ლიგის პირველი ტიტულის მოსაგებად?' },
    options: [
      { text: { en: 'Real Madrid', ka: 'რეალ მადრიდი' }, odds: 2.8 },
      { text: { en: 'Chelsea', ka: 'ჩელსი' }, odds: 4.0 },
      { text: { en: 'Inter Milan', ka: 'ინტერი' }, odds: 1.4 },
      { text: { en: 'Bayern Munich', ka: 'ბაიერნი' }, odds: 9.0 },
    ],
    answer: 2,
  },
  {
    id: 'ob2',
    q: { en: 'Which country has won the most African Cup of Nations (AFCON) titles?', ka: 'რომელ ქვეყანას აქვს მოგებული აფრიკის ერთა თასის (AFCON) ყველაზე მეტი ტიტული?' },
    options: [
      { text: { en: 'Cameroon', ka: 'კამერუნი' }, odds: 3.2 },
      { text: { en: 'Ghana', ka: 'განა' }, odds: 5.0 },
      { text: { en: 'Nigeria', ka: 'ნიგერია' }, odds: 8.0 },
      { text: { en: 'Egypt', ka: 'ეგვიპტე' }, odds: 1.3 },
    ],
    answer: 3,
  },
  {
    id: 'ob3',
    q: { en: 'Which player holds the record for the most assists in English Premier League history?', ka: 'რომელ მოთამაშეს ეკუთვნის რეკორდი ინგლისის პრემიერ ლიგის ისტორიაში ყველაზე მეტი საგოლე გადაცემით?' },
    options: [
      { text: { en: 'Kevin De Bruyne', ka: 'კევინ დე ბრუინი' }, odds: 2.5 },
      { text: { en: 'Cesc Fàbregas', ka: 'სესკ ფაბრეგასი' }, odds: 4.5 },
      { text: { en: 'Ryan Giggs', ka: 'რაიან გიგზი' }, odds: 1.5 },
      { text: { en: 'Frank Lampard', ka: 'ფრენკ ლემპარდი' }, odds: 10.0 },
    ],
    answer: 2,
  },
  {
    id: 'ob4',
    q: { en: 'Which nation won the UEFA Nations League in its inaugural 2018-19 season?', ka: 'რომელმა ქვეყანამ მოიგო უეფას ერთა ლიგა სადებიუტო 2018-19 წლების სეზონში?' },
    options: [
      { text: { en: 'France', ka: 'საფრანგეთი' }, odds: 3.0 },
      { text: { en: 'Spain', ka: 'ესპანეთი' }, odds: 4.2 },
      { text: { en: 'Portugal', ka: 'პორტუგალია' }, odds: 1.35 },
      { text: { en: 'Netherlands', ka: 'ნიდერლანდები' }, odds: 7.5 },
    ],
    answer: 2,
  },
  {
    id: 'ob5',
    q: { en: 'Which team won the UEFA Europa League in the 2023-2024 season?', ka: 'რომელმა გუნდმა მოიგო უეფას ევროპა ლიგა 2023-2024 წლების სეზონში?' },
    options: [
      { text: { en: 'Bayer Leverkusen', ka: 'ბაიერ ლევერკუზენი' }, odds: 1.4 },
      { text: { en: 'Atalanta', ka: 'ატალანტა' }, odds: 6.0 },
      { text: { en: 'AS Roma', ka: 'რომა' }, odds: 2.8 },
      { text: { en: 'Sevilla', ka: 'სევილია' }, odds: 4.5 },
    ],
    answer: 1,
  },
  {
    id: 'ob6',
    q: { en: 'Which African nation won the gold medal in men\'s football at the 1996 Olympic Games?', ka: 'რომელმა აფრიკულმა ქვეყანამ მოიპოვა ოქროს მედალი ვაჟთა ფეხბურთში 1996 წლის ოლიმპიურ თამაშებზე?' },
    options: [
      { text: { en: 'Cameroon', ka: 'კამერუნი' }, odds: 1.5 },
      { text: { en: 'Senegal', ka: 'სენეგალი' }, odds: 3.0 },
      { text: { en: 'Ghana', ka: 'განა' }, odds: 4.0 },
      { text: { en: 'Nigeria', ka: 'ნიგერია' }, odds: 5.5 },
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
