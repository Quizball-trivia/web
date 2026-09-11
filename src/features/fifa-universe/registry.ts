// FIFA / FC Universe — the collection of card-database prototypes on /demos.
// Hub copy is bilingual; in-game copy is English-only for now (prototypes).
import type { DemoModeCard } from '@/features/demos/demoModes';

type Text = { en: string; ka: string; es?: string; tr?: string };

export interface FifaModeMeta extends DemoModeCard {
  duration: Text;
  format: Text;
  /** Player shown on the hub card art (name as in the dataset). */
  artPlayer: string;
  /** Edition of the art card. */
  artEdition: string;
}

const SOLO: Text = { en: 'Single-player', ka: 'სოლო', es: 'Un jugador', tr: 'Tek oyunculu' };
const RIVAL: Text = { en: '1v1 vs rival', ka: '1v1 მეტოქესთან', es: '1 contra 1 contra rival', tr: '1v1 rakibe karşı' };
const SHORT: Text = { en: '1–2 min', ka: '1–2 წთ', es: '1–2 min', tr: '1–2 dk' };
const MEDIUM: Text = { en: '2–3 min', ka: '2–3 წთ', es: '2–3 min', tr: '2–3 dk' };
const LONG: Text = { en: '3–5 min', ka: '3–5 წთ', es: '3–5 min', tr: '3–5 dk' };
const ENDLESS: Text = { en: 'Endless', ka: 'უსასრულო', es: 'Sin fin', tr: 'Sonsuz' };

export const FIFA_MODES: FifaModeMeta[] = [
  {
    slug: 'fifa-higher-lower',
    title: { en: 'Higher or Lower', ka: 'მეტი თუ ნაკლები', es: 'Más alto o más bajo', tr: 'Yüksek mi Alçak mı' },
    description: { en: 'Will the next season\'s rating be higher, the same or lower? One miss ends the run.', ka: 'შემდეგი სეზონის რეიტინგი მეტი, იგივე თუ ნაკლები იქნება? ერთი შეცდომა ამთავრებს სერიას.', es: '¿Será la valoración de la próxima temporada más alta, igual o más baja? Un fallo termina la racha.', tr: 'Gelecek sezonun reytingi daha yüksek mi, aynı mı, yoksa daha mı düşük olacak? Bir yanlış hakkını bitirir.' },
    group: 'featured', duration: ENDLESS, format: SOLO, artPlayer: 'Lionel Messi', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-stat-battle',
    title: { en: 'Stat Battle', ka: 'სტატ-ბრძოლა', es: 'Batalla de estadísticas', tr: 'İstatistik Savaşı' },
    description: { en: 'A hand of five cards, five categories — play the right card at the right time. Best of 5.', ka: 'ხუთი ბარათი, ხუთი კატეგორია — ითამაშე სწორი ბარათი სწორ დროს. საუკეთესო 5-დან.', es: 'Una mano de cinco cartas, cinco categorías: juega la carta correcta en el momento adecuado. Mejor de 5.', tr: 'Beş kartlık bir el, beş kategori — doğru kartı doğru zamanda oyna. En iyi 5.' },
    group: 'featured', duration: MEDIUM, format: RIVAL, artPlayer: 'Cristiano Ronaldo', artEdition: 'FIFA17',
  },
  {
    slug: 'fifa-card-detective',
    title: { en: 'Card Detective', ka: 'ბარათის დეტექტივი', es: 'Detective de Cartas', tr: 'Kart Dedektifi' },
    description: { en: 'Everything hidden, 100 clue coins — identify the card using the least information.', ka: 'ყველაფერი დამალულია, 100 მინიშნების ქოინი — ამოიცანი ბარათი მინიმალური ინფორმაციით.', es: 'Todo oculto, 100 monedas de pista: identifica la carta usando la menor información.', tr: 'Her şey gizli, 100 ipucu jetonu — en az bilgiyle kartı belirle.' },
    group: 'featured', duration: MEDIUM, format: SOLO, artPlayer: 'Mohamed Salah', artEdition: 'FIFA21',
    // Plays the daily-challenge build (deal reel + on-card clues) with a demo session.
    dailyType: 'cardDetective',
  },
  {
    slug: 'fifa-evolution',
    title: { en: 'FIFA Evolution', ka: 'FIFA ევოლუცია', es: 'Evolución FIFA', tr: 'FIFA Evrimi' },
    description: { en: 'A career slides in card by card with its OVR curve, faces hidden — recognise the shape and buzz.', ka: 'კარიერა ბარათ-ბარათ იშლება OVR-ის მრუდით, სახეები დამალულია — ამოიცანი ფორმა და დააჭირე ზარს.', es: 'Una carrera se desliza carta a carta con su curva OVR, caras ocultas: reconoce la forma y reacciona.', tr: 'Kariyer kart kart ilerliyor, OVR eğrisiyle, yüzler gizli — şekli tanı ve bas.' },
    group: 'featured', duration: MEDIUM, format: SOLO, artPlayer: 'Kevin De Bruyne', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-card-order',
    title: { en: 'Cards in Order', ka: 'ბარათები რიგზე', es: 'Cartas en orden', tr: 'Kartları Sıralama' },
    description: { en: 'Four cards from one career — tap them into chronological, rating or pace order.', ka: 'ოთხი ბარათი ერთი კარიერიდან — დაალაგე ქრონოლოგიურად, რეიტინგით ან სისწრაფით.', es: 'Cuatro cartas de una carrera: tócalas en orden cronológico, de valoración o de ritmo.', tr: 'Bir kariyerden dört kart — kronolojik, reyting veya hız sırasına göre dokun.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Gareth Bale', artEdition: 'FIFA17',
  },
  {
    slug: 'fifa-fake-stat',
    title: { en: 'One Stat Is Fake', ka: 'ერთი სტატი ყალბია', es: 'Una estadística es falsa', tr: 'Bir İstatistik Sahte' },
    description: { en: 'A fully revealed card with one doctored attribute — ±10, then ±5, then ±2.', ka: 'სრულად გახსნილი ბარათი ერთი შეცვლილი ატრიბუტით — ±10, შემდეგ ±5, შემდეგ ±2.', es: 'Una carta completamente revelada con un atributo manipulado: ±10, luego ±5, luego ±2.', tr: 'Tamamen gösterilen bir kart, bir tane hileli özellik — ±±10, sonra ±5, sonra ±2.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Neymar Jr', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-guess-year',
    title: { en: 'Guess the FIFA Year', ka: 'გამოიცანი FIFA-ს წელი', es: 'Adivina el año FIFA', tr: 'FIFA Yılını Tahmin Et' },
    description: { en: 'Pure nostalgia — club, rating and stats shown, edition hidden. Which FIFA?', ka: 'წმინდა ნოსტალგია — კლუბი, რეიტინგი და სტატები ჩანს, გამოშვება დამალულია. რომელი FIFA?', es: 'Pura nostalgia: club, valoración y estadísticas mostradas, edición oculta. ¿Qué FIFA?', tr: 'Saf nostalji — kulüp, reyting ve istatistikler gösterilir, sürüm gizlidir. Hangi FIFA?' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Eden Hazard', artEdition: 'FIFA15',
  },
  {
    slug: 'fifa-wonderkid',
    title: { en: 'Wonderkid', ka: 'ვუნდერკინდი', es: 'Promesa', tr: 'Harika Çocuk' },
    description: { en: 'A modest early card and the rating it grew into — Career Mode nostalgia.', ka: 'მოკრძალებული ადრეული ბარათი და რეიტინგი, რომლამდეც გაიზარდა — Career Mode ნოსტალგია.', es: 'Una carta temprana modesta y la valoración en la que se convirtió: nostalgia del Modo Carrera.', tr: 'Mütevazı bir ilk kart ve büyüdüğü reyting — Kariyer Modu nostaljisi.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Kylian Mbappé', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-whos-missing',
    title: { en: "Who's Missing?", ka: 'ვინ აკლია?' },
    description: { en: 'A club\'s strongest seven from one FIFA, two of them blanked — name them in 30s.', ka: 'კლუბის საუკეთესო შვიდეული ერთი FIFA-დან, ორი დამალულია — დაასახელე 30 წამში.', es: 'Los siete más fuertes de un club de una FIFA, dos de ellos en blanco — nómbralos en 30s.', tr: 'Bir FIFA\'dan en iyi yedi oyuncu, ikisi boş — 30 saniyede isimlerini söyle.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Sergio Ramos', artEdition: 'FIFA16',
  },
  {
    slug: 'fifa-best-xi',
    title: { en: 'Build the Best XI', ka: 'ააწყვე საუკეთესო XI', es: 'Crea el Mejor XI', tr: 'En İyi XI\'i Kur' },
    description: { en: 'Three choices per position and a 100-coin budget — stars cost more. Beat the rival\'s XI.', ka: 'სამი არჩევანი პოზიციაზე და 100 ქოინის ბიუჯეტი — ვარსკვლავები ძვირია. აჯობე მეტოქის XI-ს.', es: 'Tres opciones por posición y un presupuesto de 100 monedas — las estrellas cuestan más. Supera al XI rival.', tr: 'Her pozisyon için üç seçenek ve 100 jeton bütçe — yıldızlar daha pahalı. Rakibin XI\'ini yen.' },
    group: 'featured', duration: MEDIUM, format: RIVAL, artPlayer: 'Robert Lewandowski', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-draft-battle',
    title: { en: 'Draft Battle', ka: 'დრაფტ-ბრძოლა', es: 'Duelo de Draft', tr: 'Draft Savaşı' },
    description: { en: 'Answer fast for premium picks, draft an XI, then out-think the rival with tactics.', ka: 'უპასუხე სწრაფად პრემიუმ არჩევანისთვის, ააწყვე XI და აჯობე მეტოქეს ტაქტიკით.', es: 'Responde rápido para selecciones premium, haz un XI, y luego supera al rival con tácticas.', tr: 'Özel seçimler için hızlı cevap ver, bir XI taslağı oluştur, sonra taktiklerle rakibini alt et.' },
    group: 'featured', duration: LONG, format: RIVAL, artPlayer: 'Erling Haaland', artEdition: 'FC24',
  },
  {
    slug: 'fifa-survival',
    title: { en: 'FIFA Survival', ka: 'FIFA სურვაივალი', es: 'Supervivencia FIFA', tr: 'FIFA Survival' },
    description: { en: 'Three lives, every round type, rising difficulty — the daily retention meta-mode.', ka: 'სამი სიცოცხლე, ყველა რაუნდის ტიპი, მზარდი სირთულე — ყოველდღიური მეტა-რეჟიმი.', es: 'Tres vidas, cada tipo de ronda, dificultad creciente — el modo meta de retención diario.', tr: 'Üç can, her tur tipi, artan zorluk — günlük elde tutma meta-modu.' },
    group: 'featured', duration: ENDLESS, format: SOLO, artPlayer: 'Virgil van Dijk', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-gauntlet',
    title: { en: 'FIFA Gauntlet', ka: 'FIFA განტლეტი', es: 'Desafío FIFA', tr: 'FIFA Gauntlet' },
    description: { en: 'Mario Party × FIFA knowledge — seven random mini-games against a rival.', ka: 'Mario Party × FIFA ცოდნა — შვიდი შემთხვევითი მინი-თამაში მეტოქის წინააღმდეგ.', es: 'Mario Party × conocimiento de fútbol — siete minijuegos aleatorios contra un rival.', tr: 'Mario Party × FIFA bilgisi — rakibe karşı yedi rastgele mini oyun.' },
    group: 'featured', duration: LONG, format: RIVAL, artPlayer: 'Zlatan Ibrahimović', artEdition: 'FIFA15',
  },
];

export const FIFA_MODE_BY_SLUG = new Map(FIFA_MODES.map((m) => [m.slug, m]));
export const isFifaSlug = (slug: string) => slug.startsWith('fifa-');
