import type { Locale } from '@/lib/i18n/messages';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { wildcardKey } from './criterionPresentation';

type Translations = Record<Locale, string>;

export const BOTH_CLUES_EXPLANATION: Translations = {
  en: 'Both clues must fit the same player, but they can refer to different seasons of their career.',
  ka: 'ერთმა ფეხბურთელმა ორივე პირობა უნდა დააკმაყოფილოს — ეს სხვადასხვა სეზონშიც შეიძლება მომხდარიყო.',
  es: 'El mismo jugador debe cumplir ambas pistas, aunque pueden corresponder a distintas temporadas de su carrera.',
  tr: 'İki ipucu da aynı oyuncuya uymalı, ancak kariyerinin farklı sezonlarıyla ilgili olabilir.',
};

// These describe the published membership rules, not the player's current club
// or position in one particular match. Keep in sync with the backend generator's
// criterion subtypes; don't infer a new rule from a translated display label.
const FAMILY_RULES: Record<Exclude<FootballGridCriterionView['family'], 'wildcard'>, Translations> = {
  club: {
    en: 'Name a footballer who played for this club’s senior team, at any point in their career. Youth-team spells alone do not count.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც კარიერის რომელიმე ეტაპზე ამ კლუბის ძირითად გუნდში უთამაშია. მხოლოდ ახალგაზრდულ გუნდში თამაში არ ითვლება.',
    es: 'Nombra a un futbolista que haya jugado en el primer equipo de este club, en cualquier etapa de su carrera. Jugar solo en la cantera no cuenta.',
    tr: 'Kariyerinin herhangi bir döneminde bu kulübün A takımında oynamış bir futbolcu yaz. Sadece altyapıda oynamış olmak sayılmaz.',
  },
  country: {
    en: 'Name a footballer with this nationality or who represented this country’s national team. Playing for a club in the country is not enough.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ამ ქვეყნის მოქალაქეობა აქვს ან მის ნაკრებში უთამაშია. მხოლოდ ამ ქვეყნის კლუბში თამაში საკმარისი არ არის.',
    es: 'Nombra a un futbolista de esta nacionalidad o que haya representado a su selección. Jugar en un club del país no es suficiente.',
    tr: 'Bu ülkenin vatandaşı olan veya millî takımında oynamış bir futbolcu yaz. Ülkedeki bir kulüpte oynamak tek başına yeterli değildir.',
  },
  league: {
    en: 'Name a footballer who made a senior appearance in this league. Past seasons count; winning the league is not required.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ამ ლიგაში ძირითად გუნდთან ერთად უთამაშია. წინა სეზონებიც ითვლება; ჩემპიონობა საჭირო არ არის.',
    es: 'Nombra a un futbolista que haya disputado un partido de esta liga con el primer equipo. Cuentan las temporadas anteriores; no hace falta haberla ganado.',
    tr: 'Bu ligde A takım düzeyinde maça çıkmış bir futbolcu yaz. Geçmiş sezonlar da sayılır; ligi kazanmış olması gerekmez.',
  },
  manager: {
    en: 'Name a footballer who played under this manager during their career.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც კარიერის განმავლობაში ამ მწვრთნელის ხელმძღვანელობით უთამაშია.',
    es: 'Nombra a un futbolista que haya jugado a las órdenes de este entrenador durante su carrera.',
    tr: 'Kariyerinde bu teknik direktörün yönetiminde oynamış bir futbolcu yaz.',
  },
  teammate: {
    en: 'Name a different footballer who played for the same club in the same season as this player. Being national-team teammates alone does not count.',
    ka: 'დაასახელე სხვა ფეხბურთელი, რომელსაც ამ მოთამაშესთან ერთად ერთ კლუბში, ერთსა და იმავე სეზონში უთამაშია. მხოლოდ ნაკრებში თანაგუნდელობა არ ითვლება.',
    es: 'Nombra a otro futbolista que haya jugado en el mismo club y en la misma temporada que este jugador. Ser compañeros solo de selección no cuenta.',
    tr: 'Bu oyuncuyla aynı sezonda aynı kulüpte oynamış başka bir futbolcu yaz. Sadece millî takımda takım arkadaşı olmak sayılmaz.',
  },
  trophy_award: {
    en: 'Name a footballer who appeared in this competition for the winning team during a title-winning season. Simply playing in the competition is not enough.',
    ka: 'დაასახელე ფეხბურთელი, რომელმაც ამ ტურნირში გამარჯვებული გუნდის შემადგენლობაში ითამაშა იმ სეზონში, როცა გუნდმა ტიტული მოიგო. მხოლოდ ტურნირში მონაწილეობა საკმარისი არ არის.',
    es: 'Nombra a un futbolista que haya jugado en esta competición con el equipo campeón durante la temporada del título. Participar sin ganarla no es suficiente.',
    tr: 'Şampiyonluk sezonunda kazanan takım adına bu turnuvada oynamış bir futbolcu yaz. Sadece turnuvaya katılmış olmak yeterli değildir.',
  },
};

const WILDCARD_RULES: Record<string, Translations> = {
  'position-gk': {
    en: 'Name a footballer whose playing position is goalkeeper.',
    ka: 'დაასახელე ფეხბურთელი, რომელიც მეკარის პოზიციაზე თამაშობს ან თამაშობდა.',
    es: 'Nombra a un futbolista cuya posición sea o haya sido portero.',
    tr: 'Kaleci olarak oynayan veya oynamış bir futbolcu yaz.',
  },
  'position-def': {
    en: 'Name a footballer who plays or played as a defender, such as a centre-back or full-back.',
    ka: 'დაასახელე ფეხბურთელი, რომელიც მცველის პოზიციაზე თამაშობს ან თამაშობდა — მაგალითად, ცენტრალური ან განაპირა მცველი.',
    es: 'Nombra a un futbolista que juegue o haya jugado de defensa, por ejemplo como central o lateral.',
    tr: 'Stoper veya bek gibi savunma pozisyonlarında oynayan ya da oynamış bir futbolcu yaz.',
  },
  'position-mid': {
    en: 'Name a footballer who plays or played in midfield, including defensive, central and attacking midfielders.',
    ka: 'დაასახელე ფეხბურთელი, რომელიც ნახევარდაცვაში თამაშობს ან თამაშობდა — საყრდენი, ცენტრალური ან შემტევი ნახევარმცველი.',
    es: 'Nombra a un futbolista que juegue o haya jugado de centrocampista: defensivo, central u ofensivo.',
    tr: 'Ön libero, merkez veya ofansif orta saha olarak oynayan ya da oynamış bir futbolcu yaz.',
  },
  'position-fwd': {
    en: 'Name a footballer who plays or played in attack, including strikers and attacking wingers.',
    ka: 'დაასახელე ფეხბურთელი, რომელიც თავდასხმაში თამაშობს ან თამაშობდა — ცენტრფორვარდი ან ფლანგის თავდამსხმელი.',
    es: 'Nombra a un futbolista que juegue o haya jugado en ataque, incluidos delanteros centro y extremos.',
    tr: 'Santrfor veya kanat forvet gibi hücum pozisyonlarında oynayan ya da oynamış bir futbolcu yaz.',
  },
  'international-caps-100': {
    en: 'Name a footballer with at least 100 appearances for their senior national team. Club and youth-team matches do not count.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ძირითად ეროვნულ ნაკრებში მინიმუმ 100 მატჩი აქვს ჩატარებული. კლუბისა და ახალგაზრდული ნაკრების მატჩები არ ითვლება.',
    es: 'Nombra a un futbolista con al menos 100 partidos con la selección absoluta. No cuentan los partidos de clubes ni de selecciones juveniles.',
    tr: 'A millî takımında en az 100 maça çıkmış bir futbolcu yaz. Kulüp ve genç millî takım maçları sayılmaz.',
  },
  'major-leagues-3': {
    en: 'Name a footballer who played in at least three of these five leagues: Premier League, La Liga, Serie A, Bundesliga and Ligue 1.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ამ ხუთიდან მინიმუმ სამ ლიგაში უთამაშია: პრემიერ ლიგა, ლა ლიგა, სერია A, ბუნდესლიგა და ლიგა 1.',
    es: 'Nombra a un futbolista que haya jugado en al menos tres de estas cinco ligas: Premier League, La Liga, Serie A, Bundesliga y Ligue 1.',
    tr: 'Premier Lig, La Liga, Serie A, Bundesliga ve Ligue 1 liglerinden en az üçünde oynamış bir futbolcu yaz.',
  },
  'titles-multiple-countries': {
    en: 'Name a footballer who played in league-title-winning campaigns in at least two different countries. Cup wins alone do not count.',
    ka: 'დაასახელე ფეხბურთელი, რომელიც მინიმუმ ორ სხვადასხვა ქვეყანაში ლიგის ჩემპიონი გახდა. მხოლოდ თასის მოგება არ ითვლება.',
    es: 'Nombra a un futbolista que haya jugado en campañas de liga ganadoras en al menos dos países distintos. Ganar solo copas no cuenta.',
    tr: 'En az iki farklı ülkede lig şampiyonluğu kazanılan sezonlarda oynamış bir futbolcu yaz. Sadece kupa kazanmak sayılmaz.',
  },
  'ballon-dor-winner': {
    en: 'Name a footballer who won the Ballon d’Or. Being nominated is not enough.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ოქროს ბურთი აქვს მოგებული. მხოლოდ ნომინაცია საკმარისი არ არის.',
    es: 'Nombra a un futbolista que haya ganado el Balón de Oro. Estar nominado no es suficiente.',
    tr: 'Ballon d’Or kazanmış bir futbolcu yaz. Aday gösterilmek yeterli değildir.',
  },
  'champions-league-2plus': {
    en: 'Name a footballer who played in at least two Champions League-winning campaigns.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც ჩემპიონთა ლიგის მინიმუმ ორ გამარჯვებულ სეზონში უთამაშია.',
    es: 'Nombra a un futbolista que haya participado en al menos dos campañas ganadoras de la Champions League.',
    tr: 'Şampiyonlar Ligi’nin kazanıldığı en az iki sezonda oynamış bir futbolcu yaz.',
  },
  'treble-winner': {
    en: 'Name a footballer who won the domestic league, main domestic cup and Champions League in the same season.',
    ka: 'დაასახელე ფეხბურთელი, რომელმაც ერთსა და იმავე სეზონში ქვეყნის ლიგა, მთავარი ეროვნული თასი და ჩემპიონთა ლიგა მოიგო.',
    es: 'Nombra a un futbolista que haya ganado la liga nacional, la copa nacional principal y la Champions League en la misma temporada.',
    tr: 'Aynı sezonda ulusal ligi, ana ulusal kupayı ve Şampiyonlar Ligi’ni kazanmış bir futbolcu yaz.',
  },
  'played-for-rivals': {
    en: 'Name a footballer who played for the senior teams of both clubs in a derby rivalry, at any time in their career.',
    ka: 'დაასახელე ფეხბურთელი, რომელსაც კარიერის განმავლობაში დერბიში დაპირისპირებული ორივე კლუბის ძირითად გუნდში უთამაშია.',
    es: 'Nombra a un futbolista que haya jugado en los primeros equipos de ambos clubes de un derbi, en cualquier momento de su carrera.',
    tr: 'Kariyerinin herhangi bir döneminde bir derbinin iki rakip kulübünün de A takımında oynamış bir futbolcu yaz.',
  },
};

/** Unknown future special rules get no invented explanation. */
export function criterionExplanation(criterion: FootballGridCriterionView, locale: Locale): string | null {
  if (criterion.family !== 'wildcard') return FAMILY_RULES[criterion.family][locale];
  const key = wildcardKey(criterion);
  if (!key) return null;
  const born = key.match(/^born-(\d{4})s$/);
  if (born) {
    const start = Number(born[1]);
    const end = start + 9;
    return {
      en: `Name a footballer born between ${start} and ${end}, inclusive. This is their birth year, not when they played.`,
      ka: `დაასახელე ფეხბურთელი, რომელიც ${start}–${end} წლებში დაიბადა, ორივე წლის ჩათვლით. იგულისხმება დაბადების წელი და არა თამაშის პერიოდი.`,
      es: `Nombra a un futbolista nacido entre ${start} y ${end}, ambos incluidos. Se refiere al año de nacimiento, no a cuándo jugó.`,
      tr: `${start}–${end} yılları arasında doğmuş bir futbolcu yaz; iki yıl da dahildir. Oynadığı dönem değil, doğum yılı soruluyor.`,
    }[locale];
  }
  return WILDCARD_RULES[key]?.[locale] ?? null;
}
