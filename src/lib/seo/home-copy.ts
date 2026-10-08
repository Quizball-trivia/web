import type { Locale } from "@/lib/i18n/locale";
import type { SeoPageLocale } from "./game-pages";

export interface HomeCopy {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  accessLine: string;
  nav: { games: string; quizzes: string; signIn: string };
  sections: { competitive: string; daily: string; dailyHint: string; dailyAll: string; whyAccount: string; quizzes: string; faq: string };
  cards: { practice: string; accountRequired: string; guest: string; playLabel: string; rankedTitle: string; rankedText: string; rankedCta: string; wlTitle: string; wlText: string; wlCta: string; quizPage: string };
  whyAccount: string[];
  about: { title: string; text: string };
  quizLinks: { hub: string; guessPlayer: string; careerPath: string };
  faq: Array<{ q: string; a: string }>;
}

export const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    metaTitle: "Quizball — Football Games and Soccer Trivia",
    metaDescription: "Play football trivia games online, including Tic Tac Toe, Auction and friendly matches. Start as a guest, then join Ranked play and Weekend League.",
    h1: "Football Games and Multiplayer Online Trivia",
    intro: "Play football trivia on Quizball, the official game at quizball.io. Try Football Tic Tac Toe or Football Auction in your browser, or download Quizball for Android. Create an account for Ranked play and Weekend League, with in-game coins and rare cosmetic reward packs shown for each event.",
    accessLine: "Guest games need no account. Ranked play and Weekend League require sign-in.",
    nav: { games: "Football Games", quizzes: "Football Quizzes", signIn: "Sign in" },
    sections: { competitive: "Compete and earn in-game rewards", daily: "Daily challenges", dailyHint: "A new set every day. Practice here, play the real one in the app.", dailyAll: "All daily challenges", whyAccount: "Why create a Quizball account", quizzes: "Football quizzes", faq: "Questions" },
    cards: { practice: "Practice round", accountRequired: "Account required", guest: "Play as guest", playLabel: "Play", rankedTitle: "Ranked Play", rankedText: "Test your football knowledge against other players and build your rank. Account required.", rankedCta: "Sign up for Ranked", wlTitle: "Weekend League", wlText: "Enter Quizball's weekend competition for in-game coins and rare cosmetic items. Account required; qualification and event rules apply.", wlCta: "View Weekend League details", quizPage: "Open the quiz" },
    whyAccount: [
      "Guest games let you try Quizball straight away. Create an account when you want to compete in Ranked play and Weekend League.",
      "Build your rank and follow the standings. Weekend League rewards are in-game coins and rare cosmetic packs, not cash, gift cards or vouchers. Check the current event's schedule, qualification requirements and reward details before entering.",
      "Guest practice results do not award Ranked points, coins or Weekend League qualification.",
    ],
    about: { title: "About the games", text: "Quizball brings football knowledge into games you can play online. Match players to categories in Football Tic Tac Toe, make your choices in Auction, or answer football trivia in a friendly match. Pick the format you enjoy and read its rules on the game page. You can also explore football quizzes about players, clubs and leagues, then move into account-based competitions when you are ready." },
    quizLinks: { hub: "All football quizzes", guessPlayer: "Guess the Player", careerPath: "Career Path quiz" },
    faq: [
      { q: "Can I play without an account?", a: "Yes. The guest games shown here can be played without signing up. Ranked play and Weekend League require an account." },
      { q: "What are the Weekend League rewards?", a: "Weekend League offers in-game coins and rare cosmetic reward packs. Rewards vary by event and result. They are not cash, gift cards or vouchers and cannot be exchanged for money. Check the current event for its qualification requirements and rewards." },
      { q: "Do mini-game scores count toward Ranked play?", a: "Guest mini-game results do not award Ranked points or qualify you for Weekend League. Ranked progression follows the competitive mode's own rules." },
      { q: "What happens if I register after a game?", a: "You return to the game you were playing." },
    ],
  },
  es: {
    metaTitle: "Quizball — Juegos de fútbol y trivia online",
    metaDescription: "Juega a juegos de trivia de fútbol online: Tic Tac Toe futbolero, subasta futbolera y partidos amistosos. Empieza como invitado y luego únete al modo clasificatorio y a la Weekend League.",
    h1: "Juegos de Fútbol y Trivia Online",
    intro: "Juega a trivia de fútbol en Quizball, el juego oficial de quizball.io. Prueba el Tic Tac Toe futbolero o la subasta en tu navegador, o descarga Quizball para Android. Crea una cuenta para el modo clasificatorio y la Weekend League, con monedas del juego y packs de cosméticos raros indicados en cada evento.",
    accessLine: "Los juegos de invitado no necesitan cuenta. El modo clasificatorio y la Weekend League requieren iniciar sesión.",
    nav: { games: "Juegos de fútbol", quizzes: "Quizzes de fútbol", signIn: "Iniciar sesión" },
    sections: { competitive: "Compite y gana recompensas del juego", daily: "Retos diarios", dailyHint: "Un set nuevo cada día. Practica aquí, juega el real en la app.", dailyAll: "Todos los retos diarios", whyAccount: "Por qué crear una cuenta de Quizball", quizzes: "Quizzes de fútbol", faq: "Preguntas" },
    cards: { practice: "Ronda de práctica", accountRequired: "Requiere cuenta", guest: "Jugar como invitado", playLabel: "Jugar", rankedTitle: "Modo clasificatorio", rankedText: "Pon a prueba tu fútbol contra otros jugadores y construye tu rango. Requiere cuenta.", rankedCta: "Regístrate para clasificatorio", wlTitle: "Weekend League", wlText: "Participa en la competición de fin de semana de Quizball para ganar monedas del juego y cosméticos raros. Requiere cuenta; se aplican las condiciones de clasificación y del evento.", wlCta: "Ver detalles de la Weekend League", quizPage: "Abrir el quiz" },
    whyAccount: [
      "Los juegos de invitado te permiten probar Quizball al instante. Crea una cuenta cuando quieras competir en clasificatorio y en la Weekend League.",
      "Sube de rango y sigue la clasificación. Las recompensas de la Weekend League son monedas del juego y packs de cosméticos raros, no dinero, tarjetas regalo ni vales. Consulta los requisitos, el calendario y las recompensas del evento antes de participar.",
      "Los resultados de práctica como invitado no dan puntos de clasificación, monedas ni acceso a la Weekend League.",
    ],
    about: { title: "Sobre los juegos", text: "Quizball convierte el conocimiento futbolero en juegos online. Empareja jugadores con categorías en el Tic Tac Toe futbolero, decide en la subasta futbolera o responde trivia en un amistoso. Elige el formato que te guste y lee sus reglas en la página del juego. También puedes explorar quizzes sobre jugadores, clubes y ligas, y pasar a las competiciones con cuenta cuando quieras." },
    quizLinks: { hub: "Todos los quizzes de fútbol", guessPlayer: "Adivina el jugador", careerPath: "Quiz de trayectoria" },
    faq: [
      { q: "¿Puedo jugar sin cuenta?", a: "Sí. Los juegos de invitado que ves aquí se juegan sin registrarse. El modo clasificatorio y la Weekend League requieren cuenta." },
      { q: "¿Cuáles son las recompensas de la Weekend League?", a: "La Weekend League ofrece monedas del juego y packs de cosméticos raros. Las recompensas varían según el evento y el resultado. No son dinero, tarjetas regalo ni vales, y no se pueden cambiar por dinero. Consulta el evento actual para conocer los requisitos y las recompensas." },
      { q: "¿Los minijuegos cuentan para el clasificatorio?", a: "Los resultados de invitado no dan puntos de clasificación ni acceso a la Weekend League. La progresión clasificatoria sigue sus propias reglas." },
      { q: "¿Qué pasa si me registro después de una partida?", a: "Vuelves al juego que estabas jugando." },
    ],
  },
  ka: {
    metaTitle: "Quizball — საფეხბურთო თამაშები და ქვიზები",
    metaDescription: "ითამაშე საფეხბურთო ტრივია ონლაინ: იქს-ნული, აუქციონი და მეგობრული მატჩები. დაიწყე სტუმრად, შემდეგ შეუერთდი რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას.",
    h1: "საფეხბურთო თამაშები და ქვიზები",
    intro: "ითამაშე საფეხბურთო ქვიზი Quizball-ზე — ოფიციალურ თამაშზე quizball.io-ზე. სცადე იქს-ნული ან აუქციონი ბრაუზერში, ან ჩამოტვირთე Quizball Android-ზე. რეიტინგული თამაშისა და შაბათ-კვირის ლიგისთვის შექმენი ანგარიში. თითოეულ ტურნირზე ნახავ სათამაშო ქოინებისა და იშვიათი კოსმეტიკური ნივთების ნაკრებების ჯილდოებს.",
    accessLine: "სტუმრის თამაშებს ანგარიში არ სჭირდება. რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას შესვლა სჭირდება.",
    nav: { games: "საფეხბურთო თამაშები", quizzes: "საფეხბურთო ქვიზები", signIn: "შესვლა" },
    sections: { competitive: "შეეჯიბრე და მოიპოვე სათამაშო ჯილდოები", daily: "ყოველდღიური გამოწვევები", dailyHint: "ყოველდღე ახალი ნაკრები. ივარჯიშე აქ, ნამდვილი აპლიკაციაში ითამაშე.", dailyAll: "ყველა ყოველდღიური გამოწვევა", whyAccount: "რატომ შექმნა Quizball-ის ანგარიში", quizzes: "საფეხბურთო ქვიზები", faq: "კითხვები" },
    cards: { practice: "სავარჯიშო რაუნდი", accountRequired: "ანგარიშია საჭირო", guest: "ითამაშე სტუმრად", playLabel: "თამაში", rankedTitle: "რეიტინგული თამაში", rankedText: "შეამოწმე ცოდნა სხვა მოთამაშეების წინააღმდეგ და აიწიე რეიტინგში. ანგარიშია საჭირო.", rankedCta: "დარეგისტრირდი რეიტინგულისთვის", wlTitle: "შაბათ-კვირის ლიგა", wlText: "შეუერთდი Quizball-ის შაბათ-კვირის შეჯიბრს სათამაშო ქოინებისა და იშვიათი კოსმეტიკური ნივთებისთვის. ანგარიშია საჭირო; მოქმედებს კვალიფიკაციის პირობები და ტურნირის წესები.", wlCta: "ლიგის დეტალები", quizPage: "ქვიზის გახსნა" },
    whyAccount: [
      "სტუმრის თამაშები Quizball-ს მაშინვე გაცნობს. შექმენი ანგარიში, როცა რეიტინგულ თამაშსა და შაბათ-კვირის ლიგაში შეჯიბრი გინდა.",
      "აიწიე რეიტინგში და ადევნე თვალი ცხრილს. შაბათ-კვირის ლიგის ჯილდოებია სათამაშო ქოინები და იშვიათი კოსმეტიკური ნივთების ნაკრებები — არა ფული, სასაჩუქრე ბარათები ან ვაუჩერები. მონაწილეობამდე გადაამოწმე ტურნირის განრიგი, კვალიფიკაციის პირობები და ჯილდოები.",
      "სტუმრის სავარჯიშო შედეგები რეიტინგულ ქულებს, ქოინებს ან შაბათ-კვირის ლიგის კვალიფიკაციას არ იძლევა.",
    ],
    about: { title: "თამაშების შესახებ", text: "Quizball საფეხბურთო ცოდნას ონლაინ თამაშებად აქცევს. დაუკავშირე ფეხბურთელები კატეგორიებს იქს-ნულში, გააკეთე არჩევანი აუქციონზე ან უპასუხე ტრივიას მეგობრულ მატჩში. აირჩიე ფორმატი და წაიკითხე წესები თამაშის გვერდზე. შეგიძლია ასევე ფეხბურთელების, კლუბებისა და ლიგების ქვიზები გაიარო და მზადყოფნისას ანგარიშიან შეჯიბრებზე გადახვიდე." },
    quizLinks: { hub: "ყველა საფეხბურთო ქვიზი", guessPlayer: "გამოიცანი ფეხბურთელი", careerPath: "კარიერის გზის ქვიზი" },
    faq: [
      { q: "შემიძლია ანგარიშის გარეშე თამაში?", a: "დიახ. აქ ნაჩვენები სტუმრის თამაშები რეგისტრაციის გარეშე თამაშდება. რეიტინგულ თამაშსა და შაბათ-კვირის ლიგას ანგარიში სჭირდება." },
      { q: "რა ჯილდოებია შაბათ-კვირის ლიგაში?", a: "შაბათ-კვირის ლიგის ჯილდოებია სათამაშო ქოინები და იშვიათი კოსმეტიკური ნივთების ნაკრებები. ჯილდო დამოკიდებულია ტურნირსა და შედეგზე. ეს არ არის ფული, სასაჩუქრე ბარათები ან ვაუჩერები და ფულზე არ იცვლება. მიმდინარე ტურნირზე ნახავ კვალიფიკაციის პირობებსა და ჯილდოებს." },
      { q: "ითვლება მინი-თამაშების ქულები რეიტინგულში?", a: "სტუმრის შედეგები რეიტინგულ ქულებს ან შაბათ-კვირის ლიგის კვალიფიკაციას არ იძლევა. რეიტინგული პროგრესი თავისი წესებით მიდის." },
      { q: "რა ხდება, თუ თამაშის შემდეგ დავრეგისტრირდები?", a: "იმავე თამაშს უბრუნდები, რომელსაც თამაშობდი." },
    ],
  },
  tr: {
    metaTitle: "Quizball — Futbol Oyunları ve Bilgi Yarışması",
    metaDescription: "Futbol bilgi oyunlarını çevrimiçi oyna: Futbol XOX (Tic Tac Toe), Açık Artırma ve dostluk maçları. Misafir olarak başla, sonra Sıralamalı oyuna ve Hafta Sonu Ligi'ne katıl.",
    h1: "Futbol Oyunları ve Çok Oyunculu Bilgi Yarışması",
    intro: "Quizball’u resmî adresi quizball.io’da oyna. Tarayıcında Futbol XOX (Tic Tac Toe) veya Futbol Açık Artırma’yı dene ya da Android için Quizball’u indir. Dereceli oyun ve Hafta Sonu Ligi için hesap aç; her etkinlikte oyun içi jetonları ve nadir kozmetik ödül paketlerini görebilirsin.",
    accessLine: "Misafir oyunları için hesap gerekmez. Sıralamalı oyun ve Hafta Sonu Ligi giriş gerektirir.",
    nav: { games: "Futbol Oyunları", quizzes: "Futbol Quizleri", signIn: "Giriş yap" },
    sections: { competitive: "Yarış ve oyun içi ödüller kazan", daily: "Günlük görevler", dailyHint: "Her gün yeni bir set. Burada alıştır, gerçeğini uygulamada oyna.", dailyAll: "Tüm günlük görevler", whyAccount: "Neden Quizball hesabı açmalısın", quizzes: "Futbol quizleri", faq: "Sorular" },
    cards: { practice: "Alıştırma turu", accountRequired: "Hesap gerekir", guest: "Misafir olarak oyna", playLabel: "Oyna", rankedTitle: "Sıralamalı Oyun", rankedText: "Futbol bilgini diğer oyunculara karşı sına ve sıralamanı yükselt. Hesap gerekir.", rankedCta: "Sıralamalı için kaydol", wlTitle: "Hafta Sonu Ligi", wlText: "Oyun içi jetonlar ve nadir kozmetik eşyalar için Quizball'un hafta sonu yarışmasına katıl. Hesap gerekir; katılım koşulları ve etkinlik kuralları geçerlidir.", wlCta: "Hafta Sonu Ligi ayrıntıları", quizPage: "Quizi aç" },
    whyAccount: [
      "Misafir oyunları Quizball'u hemen denemeni sağlar. Sıralamalı oyun ve Hafta Sonu Ligi'nde yarışmak istediğinde hesap aç.",
      "Sıralamanı yükselt ve puan tablosunu takip et. Hafta Sonu Ligi ödülleri oyun içi jetonlar ve nadir kozmetik paketleridir; nakit, hediye kartı veya kupon değildir. Katılmadan önce etkinliğin takvimini, katılım koşullarını ve ödüllerini kontrol et.",
      "Misafir alıştırma sonuçları Sıralama puanı, jeton ya da Hafta Sonu Ligi katılım hakkı kazandırmaz.",
    ],
    about: { title: "Oyunlar hakkında", text: "Quizball futbol bilgisini çevrimiçi oynayabileceğin oyunlara dönüştürür. Futbol XOX oyununda oyuncuları kategorilerle eşleştir, Açık Artırma'da seçimlerini yap ya da bir dostluk maçında futbol sorularını cevapla. Sevdiğin formatı seç ve kurallarını oyun sayfasında oku. Oyuncular, kulüpler ve ligler hakkındaki futbol quizlerini de keşfedebilir, hazır olduğunda hesap gerektiren yarışmalara geçebilirsin." },
    quizLinks: { hub: "Tüm futbol quizleri", guessPlayer: "Oyuncuyu Tahmin Et", careerPath: "Kariyer Yolu quizi" },
    faq: [
      { q: "Hesap açmadan oynayabilir miyim?", a: "Evet. Buradaki misafir oyunları kaydolmadan oynanabilir. Sıralamalı oyun ve Hafta Sonu Ligi hesap gerektirir." },
      { q: "Hafta Sonu Ligi ödülleri nelerdir?", a: "Hafta Sonu Ligi oyun içi jetonlar ve nadir kozmetik ödül paketleri sunar. Ödüller etkinliğe ve sonuca göre değişir. Nakit, hediye kartı veya kupon değildir ve paraya çevrilemez. Katılım koşulları ve ödüller için güncel etkinliği kontrol et." },
      { q: "Mini oyun puanları Sıralamalı oyuna sayılır mı?", a: "Misafir mini oyun sonuçları Sıralama puanı vermez ve Hafta Sonu Ligi katılım hakkı kazandırmaz. Sıralama ilerlemesi rekabet modunun kendi kurallarına göre işler." },
      { q: "Bir oyundan sonra kaydolursam ne olur?", a: "Oynadığın oyuna geri dönersin." },
    ],
  },
};

export const COLLECTION_COPY: Record<SeoPageLocale, { metaTitle: string; metaDescription: string; h1: string; intro: string; reset: string }> = {
  en: { metaTitle: "Daily Football Challenges — A New Set Every Day | QuizBall", metaDescription: "Quizball's daily football challenges: Money Drop, True or False, Countdown, Higher or Lower, Imposter and Card Detective. Practice as a guest; play the real daily in the app.", h1: "Daily football challenges", intro: "A fresh set of football puzzles every day. Try a practice round of each here without an account; the real daily set, coins and streaks live in the app.", reset: "Daily sets reset at 04:00 Georgia time (midnight UTC)." },
  es: { metaTitle: "Retos diarios de fútbol — un set nuevo cada día | QuizBall", metaDescription: "Los retos diarios de Quizball: Money Drop, Verdadero o falso futbolero, Contrarreloj, Higher or Lower futbolero, Impostor y Adivina el jugador por su carta. Practica como invitado; juega el diario real en la app.", h1: "Retos diarios de fútbol", intro: "Un set nuevo de puzles futboleros cada día. Prueba aquí una ronda de práctica de cada uno sin cuenta; el set diario real, las monedas y las rachas están en la app.", reset: "Los sets diarios se renuevan a las 04:00, hora de Georgia (medianoche UTC)." },
  ka: { metaTitle: "ყოველდღიური საფეხბურთო გამოწვევები — ახალი ნაკრები ყოველდღე | QuizBall", metaDescription: "Quizball-ის ყოველდღიური გამოწვევები: Money Drop, სწორია თუ არა, Countdown, მეტი თუ ნაკლები, შემპარავი და ბარათის დეტექტივი. ივარჯიშე სტუმრად; ნამდვილი აპლიკაციაშია.", h1: "ყოველდღიური საფეხბურთო გამოწვევები", intro: "ყოველდღე ახალი საფეხბურთო თავსატეხები. სცადე თითოეულის სავარჯიშო რაუნდი აქ ანგარიშის გარეშე; ნამდვილი ყოველდღიური ნაკრები, ქოინები და სერიები აპლიკაციაშია.", reset: "ყოველდღიური ნაკრები 04:00-ზე, საქართველოს დროით (UTC შუაღამე) განახლდება." },
  tr: { metaTitle: "Günlük Futbol Görevleri — Her Gün Yeni Bir Set | QuizBall", metaDescription: "Quizball'un günlük futbol görevleri: Money Drop, Doğru mu Yanlış mı, Countdown, Higher or Lower Futbolcu, Köstebek ve Kart Dedektifi. Misafir olarak alıştır, gerçeğini uygulamada oyna.", h1: "Günlük futbol görevleri", intro: "Her gün her tür için yeni bir set. Burada misafir olarak alıştırma turu oyna; gerçek set, jetonlar ve seri için uygulamaya giriş yap.", reset: "Setler her gün 04:00'te, Gürcistan saatiyle (UTC gece yarısı) yenilenir." },
};
