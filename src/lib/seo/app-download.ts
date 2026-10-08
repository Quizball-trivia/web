import type { Locale } from '@/lib/i18n/locale';
import { SITE_SCHEMA_IDS } from './structured-data';
import { SITE_ICON_PATH, SITE_URL } from './site';
import { GOOGLE_PLAY_URL } from './app-links';

export { GOOGLE_PLAY_URL } from './app-links';
export const downloadPath = (locale: Locale) => `/${locale}/download`;
// Actual substantive copy update; never replace this with a request-time date.
export const DOWNLOAD_UPDATED_AT = '2026-10-08T00:00:00.000Z';

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
  installTitle: string;
  installSteps: string[];
  identityTitle: string;
  publisherLabel: string;
  packageLabel: string;
  questionsTitle: string;
  questions: Array<{ question: string; answer: string }>;
};

export const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  en: {
    metaTitle: 'Quizball on Google Play — Official Android Download',
    description: 'Download the official Quizball football and soccer quiz app on Google Play. Play 1v1 trivia, Tiki Taka Toe, Football Auction and daily challenges on Android.',
    eyebrow: 'The official Quizball Android app',
    title: 'Quizball for Android.',
    highlight: 'Football in your pocket.',
    storeCta: 'Get Quizball on Google Play',
    homeCta: 'Quizball on Google Play',
    browserCta: 'Play in your browser',
    homeLabel: 'Quizball home',
    languagesLabel: 'Choose language',
    free: 'Free download · Android phones and tablets',
    accountNote: 'Play supported solo games as a guest in the app or your browser. Create an account for ranked matches, ranking points, multiplayer and saved progress.',
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
    installTitle: 'How to download Quizball from Google Play',
    installSteps: ['Open the official Google Play listing using the button above.', 'Check that the developer is Quizball, then tap Install on your Android phone or tablet.', 'Open Quizball, choose your language and play. Sign in when you want ranked matches and saved progress.'],
    identityTitle: 'The Quizball app from quizball.io',
    publisherLabel: 'Published by',
    packageLabel: 'Android app ID',
    questionsTitle: 'Before you install',
    questions: [
      { question: 'Which Quizball app is this?', answer: 'This is the official Android app of quizball.io, published by Quizball LLC. The Google Play developer name is Quizball and the Android app ID is io.quizball.mobile. Use the download button on this page to open the correct listing.' },
      { question: 'Is Quizball free to download?', answer: 'Yes. Quizball is free to download from Google Play for supported Android phones and tablets. An internet connection is required to play.' },
      { question: 'Which languages can I choose?', answer: 'The Quizball app supports English, Georgian, Spanish and Turkish. Choose your language in the app’s settings.' },
    ],
  },
  ka: {
    metaTitle: 'Quizball Android-ზე — ჩამოტვირთე Google Play-დან',
    description: 'ჩამოტვირთე Quizball-ის ოფიციალური საფეხბურთო ქვიზი Google Play-დან. ითამაშე 1v1 მატჩები, Tiki Taka Toe, აუქციონი და ყოველდღიური გამოწვევები Android-ზე.',
    eyebrow: 'Quizball-ის ოფიციალური Android აპი',
    title: 'Quizball Android-ზე.',
    highlight: 'ფეხბურთი შენს ჯიბეში.',
    storeCta: 'ჩამოტვირთე Google Play-დან',
    homeCta: 'Quizball Google Play-ზე',
    browserCta: 'ითამაშე ბრაუზერში',
    homeLabel: 'Quizball-ის მთავარი გვერდი',
    languagesLabel: 'აირჩიე ენა',
    free: 'უფასო ჩამოტვირთვა · Android ტელეფონები და პლანშეტები',
    accountNote: 'ხელმისაწვდომი სოლო თამაშები სტუმრად ითამაშე აპში ან ბრაუზერში. სარეიტინგო მატჩებისთვის, სარეიტინგო ქულებისთვის, მეგობრებთან თამაშისთვის და პროგრესის შესანახად შექმენი ანგარიში.',
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
    installTitle: 'როგორ ჩამოტვირთო Quizball Google Play-დან',
    installSteps: ['ზემოთ მოცემული ღილაკით გახსენი ოფიციალური გვერდი Google Play-ზე.', 'შეამოწმე, რომ დეველოპერის სახელია Quizball, შემდეგ დააჭირე Install-ს შენს Android ტელეფონზე ან პლანშეტზე.', 'გახსენი Quizball, აირჩიე ენა და ითამაშე. სარეიტინგო მატჩებისთვის და პროგრესის შესანახად შედი ანგარიშში.'],
    identityTitle: 'Quizball-ის აპი quizball.io-დან',
    publisherLabel: 'გამომცემელი',
    packageLabel: 'Android აპის ID',
    questionsTitle: 'ჩამოტვირთვამდე',
    questions: [
      { question: 'რომელი Quizball აპია ეს?', answer: 'ეს არის quizball.io-ს ოფიციალური Android აპი, რომლის გამომცემელია Quizball LLC. Google Play-ზე დეველოპერის სახელია Quizball, ხოლო Android აპის ID — io.quizball.mobile. სწორი გვერდის გასახსნელად გამოიყენე ამ გვერდის ჩამოტვირთვის ღილაკი.' },
      { question: 'Quizball-ის ჩამოტვირთვა უფასოა?', answer: 'დიახ. Quizball Google Play-დან უფასოდ ჩამოიტვირთება მხარდაჭერილ Android ტელეფონებსა და პლანშეტებზე. თამაშს ინტერნეტკავშირი სჭირდება.' },
      { question: 'რომელი ენები შემიძლია ავირჩიო?', answer: 'Quizball-ის აპში ხელმისაწვდომია ინგლისური, ქართული, ესპანური და თურქული. ენა აპის პარამეტრებში აირჩიე.' },
    ],
  },
  es: {
    metaTitle: 'Quizball para Android — Descarga oficial en Google Play',
    description: 'Descarga la app oficial de Quizball en Google Play. Trivia de fútbol 1v1, Tiki Taka Toe, subastas y retos diarios en tu móvil o tablet Android.',
    eyebrow: 'La app oficial de Quizball para Android',
    title: 'Quizball para Android.',
    highlight: 'El fútbol en tu bolsillo.',
    storeCta: 'Descarga Quizball en Google Play',
    homeCta: 'Quizball en Google Play',
    browserCta: 'Juega en tu navegador',
    homeLabel: 'Inicio de Quizball',
    languagesLabel: 'Elige tu idioma',
    free: 'Descarga gratuita · Móviles y tablets Android',
    accountNote: 'Juega los modos individuales disponibles como invitado en la app o en el navegador. Crea una cuenta para jugar partidos de clasificación, ganar puntos, jugar en multijugador y guardar tu progreso.',
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
    installTitle: 'Cómo descargar Quizball desde Google Play',
    installSteps: ['Abre la ficha oficial de Google Play con el botón de arriba.', 'Comprueba que el desarrollador es Quizball y pulsa Instalar en tu móvil o tablet Android.', 'Abre Quizball, elige tu idioma y juega. Inicia sesión para jugar partidos de clasificación y guardar tu progreso.'],
    identityTitle: 'La app de Quizball de quizball.io',
    publisherLabel: 'Publicada por',
    packageLabel: 'ID de la app Android',
    questionsTitle: 'Antes de instalar',
    questions: [
      { question: '¿Qué app de Quizball es esta?', answer: 'Es la app oficial para Android de quizball.io, publicada por Quizball LLC. El nombre del desarrollador en Google Play es Quizball y el ID de la app Android es io.quizball.mobile. Usa el botón de descarga de esta página para abrir la ficha correcta.' },
      { question: '¿Se puede descargar Quizball gratis?', answer: 'Sí. Quizball se descarga gratis desde Google Play en móviles y tablets Android compatibles. Necesitas conexión a internet para jugar.' },
      { question: '¿Qué idiomas puedo elegir?', answer: 'La app de Quizball está disponible en inglés, georgiano, español y turco. Puedes elegir el idioma en los ajustes de la app.' },
    ],
  },
  tr: {
    metaTitle: 'Android için Quizball — Google Play’den resmî indirme',
    description: 'Quizball’un resmî futbol bilgi oyununu Google Play’den indir. Android’de 1v1 bilgi yarışması, Tiki Taka Toe, futbol açık artırması ve günlük görevler oyna.',
    eyebrow: 'Quizball’un resmî Android uygulaması',
    title: 'Android için Quizball.',
    highlight: 'Futbol cebinde.',
    storeCta: 'Quizball’u Google Play’den indir',
    homeCta: 'Google Play’de Quizball',
    browserCta: 'Tarayıcıda oyna',
    homeLabel: 'Quizball ana sayfası',
    languagesLabel: 'Dil seç',
    free: 'Ücretsiz indir · Android telefonlar ve tabletler',
    accountNote: 'Uygulamada veya tarayıcıda desteklenen tek oyunculu modları misafir olarak oyna. Dereceli maçlar, sıralama puanları, çok oyunculu oyunlar ve ilerlemeni kaydetmek için hesap oluştur.',
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
    installTitle: 'Quizball Google Play’den nasıl indirilir?',
    installSteps: ['Yukarıdaki düğmeyle resmî Google Play sayfasını aç.', 'Geliştirici adının Quizball olduğunu kontrol et, ardından Android telefonunda veya tabletinde Yükle’ye dokun.', 'Quizball’u aç, dilini seç ve oyna. Dereceli maçlar ve ilerlemeni kaydetmek için giriş yap.'],
    identityTitle: 'quizball.io’nun Quizball uygulaması',
    publisherLabel: 'Yayıncı',
    packageLabel: 'Android uygulama kimliği',
    questionsTitle: 'Yüklemeden önce',
    questions: [
      { question: 'Bu hangi Quizball uygulaması?', answer: 'Bu, quizball.io’nun Quizball LLC tarafından yayınlanan resmî Android uygulamasıdır. Google Play’de geliştirici adı Quizball, Android uygulama kimliği ise io.quizball.mobile’dır. Doğru sayfayı açmak için bu sayfadaki indirme düğmesini kullan.' },
      { question: 'Quizball ücretsiz indirilebilir mi?', answer: 'Evet. Quizball, desteklenen Android telefonlara ve tabletlere Google Play’den ücretsiz indirilebilir. Oynamak için internet bağlantısı gerekir.' },
      { question: 'Hangi dilleri seçebilirim?', answer: 'Quizball uygulaması İngilizce, Gürcüce, İspanyolca ve Türkçeyi destekler. Dilini uygulamanın ayarlarından seçebilirsin.' },
    ],
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
    dateModified: DOWNLOAD_UPDATED_AT,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: copy.homeLabel, item: `${SITE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: copy.homeCta, item: url },
      ],
    },
  };
}
