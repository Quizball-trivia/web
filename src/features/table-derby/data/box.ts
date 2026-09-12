/** Mock პაპა კარლოს ყუთი content: 10 category cards (2 per box side),
 *  2 questions each for the prototype (real count TBD with the owner). */

export interface TdBoxQuestion {
  q: string;
  display: string;
  aliases: string[];
}

export interface TdBoxCard {
  id: string;
  title: string;
  questions: TdBoxQuestion[];
}

const q = (text: string, display: string, aliases: string[] = []): TdBoxQuestion => ({
  q: text,
  display,
  aliases: [display, ...aliases],
});

export const TD_BOX_CARDS: TdBoxCard[] = [
  {
    id: 'teams',
    title: 'გუნდები',
    questions: [
      q('რომელ ქალაქშია გუნდი „ბოკა ხუნიორსი"?', 'ბუენოს-აირესი', ['buenos aires', 'ბუენოს აირესი']),
      q('რომელი გუნდის სტადიონია „ენფილდი"?', 'ლივერპული', ['liverpool']),
    ],
  },
  {
    id: 'worldcup',
    title: 'მუნდიალი',
    questions: [
      q('ვინ მოიგო 2014 წლის მუნდიალი?', 'გერმანია', ['germany']),
      q('რომელ ქვეყანაში ჩატარდა 2010 წლის მუნდიალი?', 'სამხრეთ აფრიკა', ['south africa', 'სამხრეთი აფრიკა']),
    ],
  },
  {
    id: 'ballondor',
    title: 'ოქროს ბურთი',
    questions: [
      q('ვინ მოიგო ოქროს ბურთი 2007 წელს?', 'კაკა', ['kaka']),
      q('ვინ მოიგო ოქროს ბურთი 2018 წელს?', 'მოდრიჩი', ['modric', 'luka modric', 'ლუკა მოდრიჩი']),
    ],
  },
  {
    id: 'georgians',
    title: 'ქართველები',
    questions: [
      q('რომელ გუნდში თამაშობს ხვიჩა კვარაცხელია?', 'პსჟ', ['psg', 'პარი სენ ჟერმენი', 'პარიზი']),
      q('რომელი თბილისური გუნდის ლეგენდაა დავით ყიფიანი?', 'დინამო თბილისი', ['დინამო', 'dinamo tbilisi', 'dinamo']),
    ],
  },
  {
    id: 'coaches',
    title: 'მწვრთნელები',
    questions: [
      q('რომელ გუნდს წვრთნიდა გვარდიოლა მანჩესტერ სიტიმდე?', 'ბაიერნი', ['bayern', 'ბაიერნ მიუნხენი']),
      q('რომელი გუნდის მწვრთნელია დიეგო სიმეონე?', 'ატლეტიკო', ['atletico', 'ატლეტიკო მადრიდი']),
    ],
  },
  {
    id: 'ucl',
    title: 'ჩემპიონთა ლიგა',
    questions: [
      q('ვინ მოიგო ჩემპიონთა ლიგა 2023 წელს?', 'მანჩესტერ სიტი', ['man city', 'city', 'სიტი', 'manchester city']),
      q('რომელ ქალაქში გაიმართა ჩლ-ის ფინალი 2022 წელს?', 'პარიზი', ['paris', 'პარიჟი']),
    ],
  },
  {
    id: 'scorers',
    title: 'ბომბარდირები',
    questions: [
      q('ვინ არის პრემიერ ლიგის ისტორიის საუკეთესო ბომბარდირი?', 'ალან შირერი', ['shearer', 'შირერი', 'alan shearer']),
      q('ვინ არის ლა ლიგის ისტორიის საუკეთესო ბომბარდირი?', 'მესი', ['messi', 'ლიონელ მესი']),
    ],
  },
  {
    id: 'numbers',
    title: 'ნომრები',
    questions: [
      q('რა ნომრით თამაშობდა მარადონა?', '10', []),
      q('რა ნომრით თამაშობდა კრიშტიანუ რონალდუ მადრიდის რეალში?', '7', []),
    ],
  },
  {
    id: 'derbies',
    title: 'დერბები',
    questions: [
      q('მილანის დერბი: მილანი და ...?', 'ინტერი', ['inter', 'ინტერ მილანი']),
      q('მერსისაიდის დერბი: ლივერპული და ...?', 'ევერტონი', ['everton']),
    ],
  },
  {
    id: 'euro',
    title: 'ევროპის ჩემპიონატი',
    questions: [
      q('ვინ მოიგო ევრო 2004?', 'საბერძნეთი', ['greece']),
      q('ვინ მოიგო ევრო 2020?', 'იტალია', ['italy']),
    ],
  },
];
