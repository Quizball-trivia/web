/** Mock ჩამოთვალე categories for the frontend prototype. Real content will
 *  come from the backend `countdown_list` question bank; the shape below
 *  mirrors it (prompt + accepted answers with aliases). */

export interface TdListAnswer {
  /** Canonical Georgian display form — what gets written on the board. */
  display: string;
  /** Accepted inputs: Georgian + Latin transliterations + short forms. */
  aliases: string[];
}

export interface TdListCategory {
  id: string;
  prompt: string;
  answers: TdListAnswer[];
}

export const TD_LIST_CATEGORIES: TdListCategory[] = [
  {
    id: 'nl-milan-scorers',
    prompt: 'გაიხსენეთ ჰოლანდიელები რომლებსაც მილანის მაისურით გოლი აქვთ გატანილი',
    answers: [
      { display: 'გულიტი', aliases: ['გულიტი', 'რუდ გულიტი', 'gullit', 'ruud gullit'] },
      { display: 'ვან ბასტენი', aliases: ['ვან ბასტენი', 'მარკო ვან ბასტენი', 'ბასტენი', 'van basten', 'marco van basten'] },
      { display: 'რაიკარდი', aliases: ['რაიკარდი', 'ფრანკ რაიკარდი', 'rijkaard', 'frank rijkaard'] },
      { display: 'სედორფი', aliases: ['სედორფი', 'კლარენს სედორფი', 'seedorf', 'clarence seedorf'] },
      { display: 'კლუივერტი', aliases: ['კლუივერტი', 'პატრიკ კლუივერტი', 'kluivert', 'patrick kluivert'] },
    ],
  },
  {
    id: 'zidane-clubs',
    prompt: 'ჩამოთვალეთ გუნდები რომლებშიც ზიდანს უთამაშია',
    answers: [
      { display: 'კანი', aliases: ['კანი', 'cannes'] },
      { display: 'ბორდო', aliases: ['ბორდო', 'bordeaux'] },
      { display: 'იუვენტუსი', aliases: ['იუვენტუსი', 'იუვე', 'juventus', 'juve'] },
      { display: 'მადრიდის რეალი', aliases: ['მადრიდის რეალი', 'რეალი', 'რეალ მადრიდი', 'real madrid', 'real'] },
    ],
  },
  {
    id: 'wc2022-semifinalists',
    prompt: 'ჩამოთვალეთ 2022 წლის მუნდიალის ნახევარფინალისტები',
    answers: [
      { display: 'არგენტინა', aliases: ['არგენტინა', 'argentina'] },
      { display: 'საფრანგეთი', aliases: ['საფრანგეთი', 'france'] },
      { display: 'ხორვატია', aliases: ['ხორვატია', 'croatia'] },
      { display: 'მაროკო', aliases: ['მაროკო', 'morocco'] },
    ],
  },
  {
    id: 'epl-champions-10y',
    prompt: 'გაიხსენეთ გუნდები რომლებსაც ბოლო 10 წელიწადში პრემიერ ლიგა მოუგიათ',
    answers: [
      { display: 'მანჩესტერ სიტი', aliases: ['მანჩესტერ სიტი', 'სიტი', 'manchester city', 'man city', 'city'] },
      { display: 'ლივერპული', aliases: ['ლივერპული', 'liverpool'] },
      { display: 'ჩელსი', aliases: ['ჩელსი', 'chelsea'] },
      { display: 'ლესტერი', aliases: ['ლესტერი', 'leicester', 'leicester city'] },
    ],
  },
];
