/**
 * Stat Sniper mock data — "closest guess" numeric football stats. Values are
 * real-world figures (rounded, prototype bank). The slider spans min..max;
 * scoring is proximity within a quarter of the span.
 */

import type { MiniLocale } from '../lib/i18n';

type BilingualText = Record<MiniLocale, string>;

export interface SniperRound {
  id: string;
  prompt: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

interface BilingualRound extends Omit<SniperRound, 'prompt' | 'unit'> {
  prompt: BilingualText;
  unit: BilingualText;
}

const BANK: BilingualRound[] = [
  {
    id: 'ss1',
    prompt: { en: "Jude Bellingham's transfer fee to Real Madrid?", ka: 'ჯუდ ბელინგემის ტრანსფერის ღირებულება რეალ მადრიდში?', es: "¿Cuánto pagó el Real Madrid por Jude Bellingham?", tr: "Jude Bellingham'ın Real Madrid'e transfer bedeli?" },
    unit: { en: '€M', ka: 'მლნ €', es: 'M€', tr: 'M€' },
    value: 103, min: 0, max: 200, step: 1,
  },
  {
    id: 'ss2',
    prompt: { en: "Neymar's world-record move to PSG?", ka: 'ნეიმარის მსოფლიო რეკორდული ტრანსფერი PSG-ში?', es: "¿Cuánto costó el traspaso récord de Neymar al PSG?", tr: "Neymar'ın PSG'ye dünya rekoru transferi?" },
    unit: { en: '€M', ka: 'მლნ €', es: 'M€', tr: 'M€' },
    value: 222, min: 0, max: 300, step: 1,
  },
  {
    id: 'ss3',
    prompt: { en: 'Attendance at the 1950 World Cup final at the Maracanã?', ka: '1950 წლის მსოფლიო თასის ფინალის დამსწრეები მარაკანაზე?', es: "¿Cuántos espectadores hubo en la final del Mundial de 1950 en Maracaná?", tr: "1950 Dünya Kupası finalinde Maracanã'daki seyirci sayısı?" },
    unit: { en: 'fans', ka: 'გულშემატკივარი', es: 'espectadores', tr: 'seyirci' },
    value: 199854, min: 0, max: 250000, step: 1000,
  },
  {
    id: 'ss4',
    prompt: { en: "Man City's record Premier League points in a season?", ka: 'მან სიტის რეკორდული ქულები პრემიერ ლიგის ერთ სეზონში?', es: "¿Cuál es el récord de puntos del Man City en una temporada de Premier League?", tr: "Man City'nin bir Premier Lig sezonundaki rekor puanı?" },
    unit: { en: 'points', ka: 'ქულა', es: 'puntos', tr: 'puan' },
    value: 100, min: 50, max: 120, step: 1,
  },
  {
    id: 'ss5',
    prompt: { en: 'Most goals scored in a calendar year (Messi, 2012)?', ka: 'ყველაზე მეტი გოლი ერთ კალენდარულ წელს (მესი, 2012)?', es: "¿Cuántos goles marcó Messi en el año natural 2012, el récord?", tr: "Bir takvim yılında atılan en çok gol (Messi, 2012)?" },
    unit: { en: 'goals', ka: 'გოლი', es: 'goles', tr: 'gol' },
    value: 91, min: 0, max: 120, step: 1,
  },
  {
    id: 'ss6',
    prompt: { en: 'Fastest men’s World Cup goal — seconds after kickoff?', ka: 'ყველაზე სწრაფი გოლი მსოფლიო თასზე — წამები კიკოფიდან?', es: "¿El gol más rápido de un Mundial masculino: segundos tras el saque?", tr: "En hızlı erkekler Dünya Kupası golü — başlama vuruşundan kaç saniye sonra?" },
    unit: { en: 'seconds', ka: 'წამი', es: 'segundos', tr: 'saniye' },
    value: 11, min: 0, max: 60, step: 1,
  },
  {
    id: 'ss7',
    prompt: { en: "Real Madrid's total Champions League / European Cup titles?", ka: 'რეალ მადრიდის ჩემპიონთა ლიგის / ევროპის თასის ტიტულები ჯამში?', es: "¿Cuántas Champions / Copas de Europa tiene el Real Madrid?", tr: "Real Madrid'in toplam Şampiyonlar Ligi / Avrupa Kupası sayısı?" },
    unit: { en: 'titles', ka: 'ტიტული', es: 'títulos', tr: 'kupa' },
    value: 15, min: 0, max: 20, step: 1,
  },
  {
    id: 'ss8',
    prompt: { en: "Cristiano Ronaldo's men's international goals record?", ka: 'კრიშტიანუ რონალდუს გოლების რეკორდი ნაკრებში?', es: "¿Cuál es el récord de goles internacionales de Cristiano Ronaldo?", tr: "Cristiano Ronaldo'nun erkek millî takım gol rekoru?" },
    unit: { en: 'goals', ka: 'გოლი', es: 'goles', tr: 'gol' },
    value: 138, min: 0, max: 250, step: 1,
  },
  {
    id: 'ss9',
    prompt: { en: 'Career hat-tricks scored by Lionel Messi (club + country)?', ka: 'ლიონელ მესის ჰეთ-თრიქები კარიერაში (კლუბი + ნაკრები)?', es: "¿Cuántos hat-tricks ha marcado Messi en su carrera (club + selección)?", tr: "Lionel Messi'nin kariyer hat-trick sayısı (kulüp + millî takım)?" },
    unit: { en: 'hat-tricks', ka: 'ჰეთ-თრიქი', es: 'hat-tricks', tr: 'hat-trick' },
    value: 57, min: 0, max: 100, step: 1,
  },
  {
    id: 'ss10',
    prompt: { en: 'In which year did Lev Yashin win his Ballon d’Or?', ka: 'რომელ წელს მოიგო ლევ იაშინმა ოქროს ბურთი?', es: "¿En qué año ganó Lev Yashin el Balón de Oro?", tr: "Lev Yashin Ballon d'Or'u hangi yıl kazandı?" },
    unit: { en: 'year', ka: 'წელი', es: 'año', tr: 'yıl' },
    value: 1963, min: 1950, max: 2000, step: 1,
  },
];

export function getSniperRounds(locale: MiniLocale): SniperRound[] {
  return BANK.map((r) => ({ ...r, prompt: r.prompt[locale], unit: r.unit[locale] }));
}

/** Proximity score: 100 at spot-on, fading to 0 at a quarter of the span away.
 *  Exact hits earn a +25 bullseye bonus. */
export function sniperScore(guess: number, round: SniperRound): number {
  if (guess === round.value) return 125;
  const span = round.max - round.min;
  const closeness = Math.abs(guess - round.value) / span;
  return Math.max(0, Math.round(100 * (1 - closeness * 4)));
}
