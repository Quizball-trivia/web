/** Mock ბარათონი (Cards round) categories. Real content comes from the
 *  CMS later — the show uses image cards (crests, photos); the prototype
 *  uses text-clue faces: two short lines, guess the answer. The `value`
 *  is the card's corner number = points for winning it. */

export interface TdCard {
  id: string;
  /** Corner number on the face — the card's point value. */
  value: 1 | 2 | 3;
  /** Clue lines shown on the face (country, club, ...). */
  lines: string[];
  display: string;
  aliases: string[];
}

export interface TdCardCategory {
  id: string;
  prompt: string;
  cards: TdCard[];
}

const c = (id: string, value: 1 | 2 | 3, lines: string[], display: string, aliases: string[]): TdCard => ({
  id,
  value,
  lines,
  display,
  aliases: [display, ...aliases],
});

export const TD_CARD_CATEGORIES: TdCardCategory[] = [
  {
    id: 'african-players',
    prompt: 'აფრიკელი ფეხბურთელები',
    cards: [
      c('salah', 1, ['ეგვიპტე', 'ლივერპული'], 'სალაჰი', ['salah', 'mo salah', 'მო სალაჰი', 'სალა']),
      c('mane', 1, ['სენეგალი', 'ლივერპული'], 'მანე', ['mane', 'sadio mane', 'სადიო მანე']),
      c('drogba', 1, ['კოტ-დივუარი', 'ჩელსი'], 'დროგბა', ['drogba', 'didier drogba', 'დიდიე დროგბა']),
      c('etoo', 1, ['კამერუნი', 'ბარსელონა'], 'ეტოო', ['etoo', "eto'o", 'samuel etoo', 'სამუელ ეტოო']),
      c('osimhen', 1, ['ნიგერია', 'ნაპოლი'], 'ოსიმენი', ['osimhen', 'victor osimhen', 'ვიქტორ ოსიმენი']),
      c('hakimi', 1, ['მაროკო', 'პსჟ'], 'ჰაკიმი', ['hakimi', 'achraf hakimi', 'აშრაფ ჰაკიმი']),
      c('yaya', 2, ['კოტ-დივუარი', 'მანჩესტერ სიტი'], 'იაია ტურე', ['yaya toure', 'toure', 'ტურე', 'იაია']),
      c('okocha', 2, ['ნიგერია', 'პსჟ'], 'ოკოჩა', ['okocha', 'jay jay okocha', 'ჯეი ჯეი ოკოჩა']),
      c('weah', 2, ['ლიბერია', 'მილანი'], 'ვეა', ['weah', 'george weah', 'ჯორჯ ვეა']),
      c('mahrez', 2, ['ალჟირი', 'მანჩესტერ სიტი'], 'მარეზი', ['mahrez', 'riyad mahrez', 'რიად მარეზი']),
      c('aubameyang', 2, ['გაბონი', 'არსენალი'], 'ობამეიანგი', ['aubameyang', 'ობამეიანი']),
      c('koulibaly', 2, ['სენეგალი', 'ნაპოლი'], 'კულიბალი', ['koulibaly', 'kalidou koulibaly']),
      c('partey', 2, ['განა', 'არსენალი'], 'პარტეი', ['partey', 'thomas partey', 'თომას პარტეი']),
      c('onana', 2, ['კამერუნი', 'მანჩესტერ იუნაიტედი'], 'ონანა', ['onana', 'andre onana', 'ანდრე ონანა']),
      c('kessie', 3, ['კოტ-დივუარი', 'მილანი'], 'კესიე', ['kessie', 'franck kessie', 'ფრანკ კესიე']),
      c('zaha', 3, ['კოტ-დივუარი', 'კრისტალ პალასი'], 'ზაჰა', ['zaha', 'wilfried zaha', 'უილფრიდ ზაჰა']),
      c('mendy', 3, ['სენეგალი', 'ჩელსი'], 'მენდი', ['mendy', 'edouard mendy', 'ედუარ მენდი']),
      c('kanu', 3, ['ნიგერია', 'არსენალი'], 'კანუ', ['kanu', 'nwankwo kanu']),
      c('essien', 3, ['განა', 'ჩელსი'], 'ესიენი', ['essien', 'michael essien', 'მაიკლ ესიენი']),
      c('adebayor', 3, ['ტოგო', 'არსენალი'], 'ადებაიორი', ['adebayor', 'emmanuel adebayor']),
    ],
  },
  {
    id: 'legendary-keepers',
    prompt: 'ცნობილი მეკარეები',
    cards: [
      c('buffon', 1, ['იტალია', 'იუვენტუსი'], 'ბუფონი', ['buffon', 'gigi buffon', 'ჯანლუიჯი ბუფონი']),
      c('casillas', 1, ['ესპანეთი', 'მადრიდის რეალი'], 'კასილიასი', ['casillas', 'iker casillas', 'იკერ კასილიასი']),
      c('neuer', 1, ['გერმანია', 'ბაიერნი'], 'ნოიერი', ['neuer', 'manuel neuer', 'მანუელ ნოიერი']),
      c('cech', 1, ['ჩეხეთი', 'ჩელსი'], 'ჩეხი', ['cech', 'petr cech', 'პეტრ ჩეხი']),
      c('courtois', 1, ['ბელგია', 'მადრიდის რეალი'], 'კურტუა', ['courtois', 'thibaut courtois', 'ტიბო კურტუა']),
      c('alisson', 1, ['ბრაზილია', 'ლივერპული'], 'ალისონი', ['alisson', 'ალისსონი']),
      c('donnarumma', 1, ['იტალია', 'პსჟ'], 'დონარუმა', ['donnarumma', 'gianluigi donnarumma', 'დონნარუმა']),
      c('mamardashvili', 1, ['საქართველო', 'ვალენსია'], 'მამარდაშვილი', ['mamardashvili', 'გიორგი მამარდაშვილი', 'გიგა მამარდაშვილი']),
      c('kahn', 2, ['გერმანია', 'ბაიერნი'], 'კანი', ['kahn', 'oliver kahn', 'ოლივერ კანი']),
      c('vandersar', 2, ['ჰოლანდია', 'მანჩესტერ იუნაიტედი'], 'ვან დერ სარი', ['van der sar', 'edwin van der sar', 'ვანდერსარი']),
      c('schmeichel', 2, ['დანია', 'მანჩესტერ იუნაიტედი'], 'შმაიხელი', ['schmeichel', 'peter schmeichel', 'პეტერ შმაიხელი']),
      c('terstegen', 2, ['გერმანია', 'ბარსელონა'], 'ტერ შტეგენი', ['ter stegen', 'ტერშტეგენი', 'შტეგენი']),
      c('oblak', 2, ['სლოვენია', 'ატლეტიკო'], 'ობლაკი', ['oblak', 'jan oblak', 'იან ობლაკი']),
      c('ederson', 2, ['ბრაზილია', 'მანჩესტერ სიტი'], 'ედერსონი', ['ederson']),
      c('lloris', 2, ['საფრანგეთი', 'ტოტენჰემი'], 'ლორისი', ['lloris', 'hugo lloris', 'უგო ლორისი']),
      c('martinez', 2, ['არგენტინა', 'ასტონ ვილა'], 'ემი მარტინესი', ['martinez', 'emi martinez', 'მარტინესი', 'ემილიანო მარტინესი']),
      c('dida', 3, ['ბრაზილია', 'მილანი'], 'დიდა', ['dida']),
      c('juliocesar', 3, ['ბრაზილია', 'ინტერი'], 'ჟულიო სეზარი', ['julio cesar', 'ჟულიო ცეზარი']),
      c('lehmann', 3, ['გერმანია', 'არსენალი'], 'ლემანი', ['lehmann', 'jens lehmann', 'იენს ლემანი']),
      c('seaman', 3, ['ინგლისი', 'არსენალი'], 'სიმანი', ['seaman', 'david seaman', 'დევიდ სიმანი']),
    ],
  },
];
