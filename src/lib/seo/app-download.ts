import type { Locale } from '@/lib/i18n/locale';
import { SITE_SCHEMA_IDS } from './structured-data';
import { SITE_ICON_PATH, SITE_URL } from './site';
import { GOOGLE_PLAY_URL } from './app-links';

export { GOOGLE_PLAY_URL } from './app-links';
export const downloadPath = (locale: Locale) => `/${locale}/download`;

type DownloadCopy = {
  metaTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  highlight: string;
  storeCta: string;
  homeCta: string;
  browserCta: string;
  homeLabel: string;
  languagesLabel: string;
  free: string;
  accountNote: string;
  featuresTitle: string;
  features: Array<{ title: string; body: string }>;
  privacy: string;
  terms: string;
  officialNote: string;
  rankedScreenshot: string;
  rankedAlt: string;
  rankedCaption: string;
};

export const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  en: {
    metaTitle: 'Quizball for Android — Official Google Play Download',
    description: 'Download the official Quizball football and soccer quiz app on Google Play. Play 1v1 trivia, Tiki Taka Toe, Football Auction and daily challenges on Android.',
    eyebrow: 'The official Quizball Android app',
    title: 'Football knowledge.',
    highlight: 'In your pocket.',
    storeCta: 'Get Quizball on Google Play',
    homeCta: 'Quizball for Android',
    browserCta: 'Play in your browser',
    homeLabel: 'Quizball home',
    languagesLabel: 'Choose language',
    free: 'Free download · Android phones and tablets',
    accountNote: 'Create an account for ranked matches, ranking points and saved progress. You can also play as a guest in your browser.',
    featuresTitle: 'More than a football quiz',
    features: [
      { title: 'Ranked 1v1 trivia', body: 'Answer football questions, compete head-to-head and climb the leaderboard.' },
      { title: 'Tiki Taka Toe & Auction', body: 'Name the player who fits both categories, or use the clues to win a football signing.' },
      { title: 'Daily games & Party Quiz', body: 'Try daily football challenges or invite your friends to a private quiz lobby.' },
    ],
    privacy: 'Privacy policy', terms: 'Terms of service',
    officialNote: 'The official Quizball app from quizball.io, published by Quizball LLC.',
    rankedScreenshot: '/assets/download/ranked-en.png',
    rankedAlt: 'Quizball Ranked gameplay on an Android phone: football possession, a question and four answers.',
    rankedCaption: 'Ranked 1v1. Real Android gameplay.',
  },
  ka: {
    metaTitle: 'Quizball Android-ზე — ჩამოტვირთე Google Play-დან',
    description: 'ჩამოტვირთე Quizball-ის ოფიციალური საფეხბურთო ქვიზი Google Play-დან. ითამაშე 1v1 მატჩები, Tiki Taka Toe, აუქციონი და ყოველდღიური გამოწვევები Android-ზე.',
    eyebrow: 'Quizball-ის ოფიციალური Android აპი',
    title: 'საფეხბურთო ცოდნა.',
    highlight: 'ყოველთვის შენთან.',
    storeCta: 'ჩამოტვირთე Google Play-დან',
    homeCta: 'Quizball Android-ზე',
    browserCta: 'ითამაშე ბრაუზერში',
    homeLabel: 'Quizball-ის მთავარი გვერდი',
    languagesLabel: 'აირჩიე ენა',
    free: 'უფასო ჩამოტვირთვა · Android ტელეფონები და პლანშეტები',
    accountNote: 'სარეიტინგო მატჩებისთვის, სარეიტინგო ქულების მოსაპოვებლად და პროგრესის შესანახად შექმენი ანგარიში. ბრაუზერში სტუმრად თამაშიც შეგიძლია.',
    featuresTitle: 'მეტი, ვიდრე საფეხბურთო ქვიზი',
    features: [
      { title: 'სარეიტინგო 1v1 მატჩები', body: 'უპასუხე საფეხბურთო კითხვებს, შეეჯიბრე მეტოქეს და დაწინაურდი ლიდერბორდში.' },
      { title: 'Tiki Taka Toe და აუქციონი', body: 'დაასახელე ფეხბურთელი, რომელიც ორივე კატეგორიას ერგება, ან მინიშნებებით მოიგე აუქციონი.' },
      { title: 'ყოველდღიური თამაშები და Party Quiz', body: 'სცადე ყოველდღიური საფეხბურთო გამოწვევები ან მოიწვიე მეგობრები პირად ქვიზ-ოთახში.' },
    ],
    privacy: 'კონფიდენციალურობის პოლიტიკა', terms: 'მომსახურების პირობები',
    officialNote: 'Quizball-ის ოფიციალური აპი quizball.io-დან. გამომცემელი: Quizball LLC.',
    rankedScreenshot: '/assets/download/ranked-en.png',
    rankedAlt: 'Quizball-ის რეიტინგული თამაში Android ტელეფონზე: ბურთის ფლობა, კითხვა და ოთხი პასუხი. ინგლისური ვერსია.',
    rankedCaption: 'რეიტინგული 1v1 Android-ზე · ინგლისური ვერსია',
  },
  es: {
    metaTitle: 'Quizball para Android — Descarga oficial en Google Play',
    description: 'Descarga la app oficial de Quizball en Google Play. Trivia de fútbol 1v1, Tiki Taka Toe, subastas y retos diarios en tu móvil o tablet Android.',
    eyebrow: 'La app oficial de Quizball para Android',
    title: 'Tu pasión por el fútbol.',
    highlight: 'Siempre contigo.',
    storeCta: 'Descarga Quizball en Google Play',
    homeCta: 'Quizball para Android',
    browserCta: 'Juega en tu navegador',
    homeLabel: 'Inicio de Quizball',
    languagesLabel: 'Elige tu idioma',
    free: 'Descarga gratuita · Móviles y tablets Android',
    accountNote: 'Crea una cuenta para jugar partidos de clasificación, ganar puntos y guardar tu progreso. También puedes jugar como invitado en el navegador.',
    featuresTitle: 'Más que un quiz de fútbol',
    features: [
      { title: 'Trivia 1v1 con clasificación', body: 'Responde preguntas de fútbol, compite cara a cara y sube en la clasificación.' },
      { title: 'Tiki Taka Toe y subasta', body: 'Adivina el jugador que encaja en ambas categorías o usa las pistas para ganar un fichaje.' },
      { title: 'Retos diarios y Party Quiz', body: 'Prueba los retos diarios de fútbol o invita a tus amigos a una sala privada de trivia.' },
    ],
    privacy: 'Política de privacidad', terms: 'Términos del servicio',
    officialNote: 'La app oficial de Quizball de quizball.io, publicada por Quizball LLC.',
    rankedScreenshot: '/assets/download/ranked-es.png',
    rankedAlt: 'Una partida clasificatoria de Quizball en un móvil Android: posesión, una pregunta y cuatro respuestas.',
    rankedCaption: 'Clasificatorio 1v1. Partida real en Android.',
  },
  tr: {
    metaTitle: 'Android için Quizball — Google Play’den resmî indirme',
    description: 'Quizball’un resmî futbol bilgi oyununu Google Play’den indir. Android’de 1v1 bilgi yarışması, Tiki Taka Toe, futbol açık artırması ve günlük görevler oyna.',
    eyebrow: 'Quizball’un resmî Android uygulaması',
    title: 'Futbol bilgin.',
    highlight: 'Her zaman yanında.',
    storeCta: 'Quizball’u Google Play’den indir',
    homeCta: 'Android için Quizball',
    browserCta: 'Tarayıcıda oyna',
    homeLabel: 'Quizball ana sayfası',
    languagesLabel: 'Dil seç',
    free: 'Ücretsiz indir · Android telefonlar ve tabletler',
    accountNote: 'Dereceli maçlara katılmak, sıralama puanı kazanmak ve ilerlemeni kaydetmek için hesap oluştur. Tarayıcıda misafir olarak da oynayabilirsin.',
    featuresTitle: 'Bir futbol quizinden daha fazlası',
    features: [
      { title: 'Dereceli 1v1 bilgi yarışması', body: 'Futbol sorularını yanıtla, rakibinle bire bir yarış ve liderlik tablosunda yüksel.' },
      { title: 'Tiki Taka Toe ve açık artırma', body: 'İki kategoriye de uyan futbolcuyu bul veya ipuçlarını kullanarak transferi kazan.' },
      { title: 'Günlük görevler ve Party Quiz', body: 'Günlük futbol görevlerini dene veya arkadaşlarını özel bir quiz lobisine davet et.' },
    ],
    privacy: 'Gizlilik politikası', terms: 'Hizmet şartları',
    officialNote: 'Quizball LLC tarafından yayınlanan, quizball.io’nun resmî Quizball uygulaması.',
    rankedScreenshot: '/assets/download/ranked-tr.png',
    rankedAlt: 'Android telefonda Quizball dereceli maçı: topa sahip olma, bir soru ve dört yanıt.',
    rankedCaption: 'Dereceli 1v1. Android’de gerçek oyun.',
  },
};

/** A normal WebPage with a verified install link; no invented ratings or app-rich-result promises. */
export function buildDownloadStructuredData(locale: Locale) {
  const copy = DOWNLOAD_COPY[locale];
  const url = `${SITE_URL}${downloadPath(locale)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: copy.metaTitle,
    description: copy.description,
    inLanguage: locale,
    image: `${SITE_URL}${SITE_ICON_PATH}`,
    isPartOf: { '@id': SITE_SCHEMA_IDS.website },
    about: { '@id': SITE_SCHEMA_IDS.game },
    publisher: { '@id': SITE_SCHEMA_IDS.organization },
    significantLink: GOOGLE_PLAY_URL,
  };
}
