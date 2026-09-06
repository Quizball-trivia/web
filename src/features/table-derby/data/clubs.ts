/** Favorite-club options for onboarding (Georgian + European giants).
 *  No crest assets in the prototype — colored chips with the club name. */

export interface TdClub {
  id: string;
  name: string;
  color: string;
}

export const TD_CLUBS: TdClub[] = [
  { id: 'dinamo-tbilisi', name: 'დინამო თბილისი', color: '#1E5AA8' },
  { id: 'dinamo-batumi', name: 'დინამო ბათუმი', color: '#1266B4' },
  { id: 'torpedo', name: 'ტორპედო ქუთაისი', color: '#C1121F' },
  { id: 'saburtalo', name: 'საბურთალო', color: '#0FA958' },
  { id: 'barcelona', name: 'ბარსელონა', color: '#A50044' },
  { id: 'real', name: 'მადრიდის რეალი', color: '#E8E6E3' },
  { id: 'mancity', name: 'მანჩესტერ სიტი', color: '#6CABDD' },
  { id: 'liverpool', name: 'ლივერპული', color: '#C8102E' },
  { id: 'arsenal', name: 'არსენალი', color: '#EF0107' },
  { id: 'manutd', name: 'მან იუნაიტედი', color: '#DA291C' },
  { id: 'chelsea', name: 'ჩელსი', color: '#034694' },
  { id: 'bayern', name: 'ბაიერნი', color: '#DC052D' },
  { id: 'juventus', name: 'იუვენტუსი', color: '#CFCFCF' },
  { id: 'milan', name: 'მილანი', color: '#FB090B' },
  { id: 'inter', name: 'ინტერი', color: '#2B4FA0' },
  { id: 'psg', name: 'პსჟ', color: '#004170' },
];
