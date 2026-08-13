import type { GameQuestion } from "@/lib/domain";
import type { Locale } from "@/lib/i18n/messages";
import { getI18nText } from "@/lib/utils/i18n";

type DemoI18nText = { en: string; ka: string };

export interface DemoQuestion {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  category: DemoI18nText;
  prompt: DemoI18nText;
  options: DemoI18nText[];
  correctIndex: number;
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "demo-q-01",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which German teammate provided the cross for Götze's 2014 World Cup-winning goal?", ka: "რომელმა გერმანელმა თანაგუნდელმა ჩააწოდა გიოტცეს 2014 წლის მსოფლიო ჩემპიონატის მომგები გოლის დროს?" },
    options: [
      { en: "Thomas Müller", ka: "თომას მიულერი" },
      { en: "Toni Kroos", ka: "ტონი კროოსი" },
      { en: "Mesut Özil", ka: "მესუთ ოზილი" },
      { en: "André Schürrle", ka: "ანდრე შიურლე" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-02",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which Bundesliga team conceded Lewandowski's historic five goals in nine minutes in 2015?", ka: "ბუნდესლიგის რომელმა გუნდმა გაუშვა ლევანდოვსკის ისტორიული ხუთი გოლი ცხრა წუთში 2015 წელს?" },
    options: [
      { en: "Borussia Dortmund", ka: "დორტმუნდის ბორუსია" },
      { en: "Schalke 04", ka: "შალკე 04" },
      { en: "Bayer Leverkusen", ka: "ბაიერ ლევერკუზენი" },
      { en: "Wolfsburg", ka: "ვოლფსბურგი" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-03",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which Italian defender was bitten by Suárez at the 2014 World Cup?", ka: "რომელ იტალიელ მცველს უკბინა სუარესმა 2014 წლის მსოფლიო ჩემპიონატზე?" },
    options: [
      { en: "Leonardo Bonucci", ka: "ლეონარდო ბონუჩი" },
      { en: "Andrea Barzagli", ka: "ანდრეა ბარძალი" },
      { en: "Giorgio Chiellini", ka: "ჯორჯო კიელინი" },
      { en: "Claudio Marchisio", ka: "კლაუდიო მარკიზიო" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-04",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Who provided the high cross that Zinedine Zidane volleyed in the 2002 Champions League final?", ka: "ვინ ჩააწოდა ბურთი, რომელიც ზინედინ ზიდანმა 2002 წლის ჩემპიონთა ლიგის ფინალში პირდაპირ დარტყმით გაიტანა?" },
    options: [
      { en: "Luís Figo", ka: "ლუიშ ფიგუ" },
      { en: "Roberto Carlos", ka: "რობერტო კარლოსი" },
      { en: "Santiago Solari", ka: "სანტიაგო სოლარი" },
      { en: "Míchel Salgado", ka: "მიჩელ სალგადო" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-05",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Against which national team did René Higuita execute his legendary scorpion kick in 1995?", ka: "რომელი ნაკრების წინააღმდეგ შეასრულა რენე იგიტამ თავისი ლეგენდარული „მორიელის დარტყმა“ 1995 წელს?" },
    options: [
      { en: "Brazil", ka: "ბრაზილია" },
      { en: "Germany", ka: "გერმანია" },
      { en: "England", ka: "ინგლისი" },
      { en: "Italy", ka: "იტალია" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-06",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which Manchester United teammate provided the cross for Wayne Rooney's legendary 2011 bicycle kick?", ka: "მანჩესტერ იუნაიტედის რომელმა თანაგუნდელმა ჩააწოდა უეინ რუნის 2011 წლის ლეგენდარული მაკრატელა დარტყმის დროს?" },
    options: [
      { en: "Ryan Giggs", ka: "რაიან გიგზი" },
      { en: "Paul Scholes", ka: "პოლ სქოულზი" },
      { en: "Nani", ka: "ნანი" },
      { en: "Antonio Valencia", ka: "ანტონიო ვალენსია" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-07",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Who is the all-time top scorer in the UEFA Champions League?", ka: "ვინ არის უეფა-ს ჩემპიონთა ლიგის ყველა დროის საუკეთესო ბომბარდირი?" },
    options: [
      { en: "Lionel Messi", ka: "ლიონელ მესი" },
      { en: "Cristiano Ronaldo", ka: "კრიშტიანუ რონალდუ" },
      { en: "Robert Lewandowski", ka: "რობერტ ლევანდოვსკი" },
      { en: "Karim Benzema", ka: "კარიმ ბენზემა" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-08",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which country won the first ever FIFA World Cup in 1930?", ka: "რომელმა ქვეყანამ მოიგო პირველი ფიფა-ს მსოფლიო ჩემპიონატი 1930 წელს?" },
    options: [
      { en: "Brazil", ka: "ბრაზილია" },
      { en: "Argentina", ka: "არგენტინა" },
      { en: "Italy", ka: "იტალია" },
      { en: "Uruguay", ka: "ურუგვაი" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-09",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which player holds the record for the most goals in a single calendar year (91 goals in 2012)?", ka: "რომელი მოთამაშე ფლობს რეკორდს ერთ კალენდარულ წელიწადში გატანილი ყველაზე მეტი გოლით (91 გოლი 2012 წელს)?" },
    options: [
      { en: "Cristiano Ronaldo", ka: "კრიშტიანუ რონალდუ" },
      { en: "Pelé", ka: "პელე" },
      { en: "Gerd Müller", ka: "გერდ მიულერი" },
      { en: "Lionel Messi", ka: "ლიონელ მესი" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-10",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "What is the nickname of the Italian club Juventus?", ka: "რა არის იტალიური კლუბის, იუვენტუსის მეტსახელი?" },
    options: [
      { en: "The Old Lady", ka: "ბებერი ქალბატონი" },
      { en: "The Red Devils", ka: "წითელი ეშმაკები" },
      { en: "The Flying Donkeys", ka: "მფრინავი ვირები" },
      { en: "The Eagles", ka: "არწივები" },
    ],
    correctIndex: 0,
  },
  {
    id: "demo-q-11",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which English club is famously known as \"The Invincibles\" for going undefeated during the 2003-04 Premier League season?", ka: "რომელი ინგლისური კლუბია ცნობილი როგორც „უძლეველები“ 2003-04 წლების პრემიერ ლიგის სეზონში დაუმარცხებლად ასპარეზობის გამო?" },
    options: [
      { en: "Manchester United", ka: "მანჩესტერ იუნაიტედი" },
      { en: "Chelsea", ka: "ჩელსი" },
      { en: "Arsenal", ka: "არსენალი" },
      { en: "Liverpool", ka: "ლივერპული" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-12",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which African nation was the first to reach the semi-finals of a Men's World Cup?", ka: "რომელი აფრიკული ქვეყანა გახდა პირველი, რომელმაც მამაკაცთა მსოფლიო ჩემპიონატის ნახევარფინალს მიაღწია?" },
    options: [
      { en: "Ghana", ka: "განა" },
      { en: "Senegal", ka: "სენეგალი" },
      { en: "Cameroon", ka: "კამერუნი" },
      { en: "Morocco", ka: "მაროკო" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-13",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which player won the Ballon d'Or in 2018, temporarily breaking the Messi-Ronaldo duopoly?", ka: "რომელმა მოთამაშემ მოიგო ოქროს ბურთი 2018 წელს, რითაც დროებით დაარღვია მესი-რონალდუს დუოპოლია?" },
    options: [
      { en: "Antoine Griezmann", ka: "ანტუან გრიზმანი" },
      { en: "Luka Modrić", ka: "ლუკა მოდრიჩი" },
      { en: "Virgil van Dijk", ka: "ვირჯილ ვან დაიკი" },
      { en: "Neymar", ka: "ნეიმარი" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-14",
    difficulty: "hard",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Which player holds the record for the fastest hat-trick in Premier League history (2 minutes 56 seconds)?", ka: "რომელი მოთამაშე ფლობს პრემიერ ლიგის ისტორიაში ყველაზე სწრაფი ჰეთ-თრიქის რეკორდს (2 წუთი და 56 წამი)?" },
    options: [
      { en: "Robbie Fowler", ka: "რობი ფაულერი" },
      { en: "Sergio Agüero", ka: "სერხიო აგუერო" },
      { en: "Thierry Henry", ka: "ტიერი ანრი" },
      { en: "Sadio Mané", ka: "სადიო მანე" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-15",
    difficulty: "hard",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი" },
    prompt: { en: "Who is the only goalkeeper in history to win the Ballon d'Or?", ka: "ვინ არის ისტორიაში ერთადერთი მეკარე, რომელმაც ოქროს ბურთი მოიგო?" },
    options: [
      { en: "Gianluigi Buffon", ka: "ჯანლუიჯი ბუფონი" },
      { en: "Iker Casillas", ka: "იკერ კასილასი" },
      { en: "Lev Yashin", ka: "ლევ იაშინი" },
      { en: "Oliver Kahn", ka: "ოლივერ კანი" },
    ],
    correctIndex: 2,
  },
];

export function getDemoGameQuestions(locale: Locale): GameQuestion[] {
  return DEMO_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: getI18nText(q.prompt, locale),
    options: q.options.map((option) => getI18nText(option, locale)),
    correctIndex: q.correctIndex,
    categoryName: getI18nText(q.category, locale),
    difficulty: q.difficulty,
  }));
}
