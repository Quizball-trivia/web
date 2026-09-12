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
  /** Real face photo (SoFIFA id/version, served via /api/fifa-face). */
  photo?: { id: number; ver: string };
}

export interface TdCardCategory {
  id: string;
  prompt: string;
  cards: TdCard[];
}

const c = (
  id: string,
  value: 1 | 2 | 3,
  lines: string[],
  display: string,
  aliases: string[],
  photo?: { id: number; ver: string },
): TdCard => ({
  id,
  value,
  lines,
  display,
  aliases: [display, ...aliases],
  photo,
});

export const TD_CARD_CATEGORIES: TdCardCategory[] = [
  {
    id: 'african-players',
    prompt: 'აფრიკელი ფეხბურთელები',
    cards: [
      c('salah', 1, ['ეგვიპტე', 'ლივერპული'], 'სალაჰი', ['salah', 'mo salah', 'მო სალაჰი', 'სალა'], { id: 209331, ver: '24' }),
      c('mane', 1, ['სენეგალი', 'ლივერპული'], 'მანე', ['mane', 'sadio mane', 'სადიო მანე'], { id: 208722, ver: '21' }),
      c('drogba', 1, ['კოტ-დივუარი', 'ჩელსი'], 'დროგბა', ['drogba', 'didier drogba', 'დიდიე დროგბა'], { id: 31432, ver: '15' }),
      c('etoo', 1, ['კამერუნი', 'ბარსელონა'], 'ეტოო', ['etoo', "eto'o", 'samuel etoo', 'სამუელ ეტოო'], { id: 9676, ver: '15' }),
      c('osimhen', 1, ['ნიგერია', 'ნაპოლი'], 'ოსიმენი', ['osimhen', 'victor osimhen', 'ვიქტორ ოსიმენი'], { id: 232293, ver: '24' }),
      c('hakimi', 1, ['მაროკო', 'პსჟ'], 'ჰაკიმი', ['hakimi', 'achraf hakimi', 'აშრაფ ჰაკიმი'], { id: 235212, ver: '24' }),
      c('aubameyang', 2, ['გაბონი', 'დორტმუნდი'], 'ობამეიანგი', ['aubameyang', 'ობამეიანი'], { id: 188567, ver: '18' }),
      c('mahrez', 2, ['ალჟირი', 'მანჩესტერ სიტი'], 'მარეზი', ['mahrez', 'riyad mahrez', 'რიად მარეზი'], { id: 204485, ver: '22' }),
      c('yaya', 2, ['კოტ-დივუარი', 'მანჩესტერ სიტი'], 'იაია ტურე', ['yaya toure', 'toure', 'ტურე', 'იაია'], { id: 20289, ver: '15' }),
      c('koulibaly', 2, ['სენეგალი', 'ნაპოლი'], 'კულიბალი', ['koulibaly', 'kalidou koulibaly'], { id: 201024, ver: '20' }),
      c('partey', 2, ['განა', 'არსენალი'], 'პარტეი', ['partey', 'thomas partey', 'თომას პარტეი'], { id: 209989, ver: '24' }),
      c('onana', 2, ['კამერუნი', 'მანჩესტერ იუნაიტედი'], 'ონანა', ['onana', 'andre onana', 'ანდრე ონანა'], { id: 226753, ver: '24' }),
      c('ziyech', 2, ['მაროკო', 'ჩელსი'], 'ზიეში', ['ziyech', 'hakim ziyech', 'ჰაკიმ ზიეში', 'ზიაში'], { id: 208670, ver: '20' }),
      c('gueye', 2, ['სენეგალი', 'პსჟ'], 'გეიე', ['gueye', 'idrissa gueye', 'იდრისა გეიე'], { id: 193474, ver: '21' }),
      c('guirassy', 3, ['გვინეა', 'დორტმუნდი'], 'გირასი', ['guirassy', 'serhou guirassy', 'სერჰუ გირასი'], { id: 215441, ver: '24' }),
      c('benatia', 3, ['მაროკო', 'იუვენტუსი'], 'ბენატია', ['benatia', 'medhi benatia', 'მედი ბენატია'], { id: 177509, ver: '19' }),
      c('brahimi', 3, ['ალჟირი', 'პორტუ'], 'ბრაჰიმი', ['brahimi', 'yacine brahimi', 'იასინ ბრაჰიმი'], { id: 41236, ver: '19' }),
      c('ndidi', 3, ['ნიგერია', 'ლესტერი'], 'ნდიდი', ['ndidi', 'wilfred ndidi', 'უილფრედ ნდიდი'], { id: 226790, ver: '22' }),
      c('mbeumo', 3, ['კამერუნი', 'მანჩესტერ იუნაიტედი'], 'მბემო', ['mbeumo', 'bryan mbeumo', 'ბრაიან მბემო', 'მბეუმო'], { id: 243014, ver: '24' }),
      c('bennacer', 3, ['ალჟირი', 'მილანი'], 'ბენასერი', ['bennacer', 'ismael bennacer', 'ისმაელ ბენასერი'], { id: 220697, ver: '24' }),
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
