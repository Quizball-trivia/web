import type { Locale } from "@/lib/i18n/locale";
import type { LocalizedText } from "./ultimo.logic";

export interface UltimoCopy {
  brandA: string;
  brandB: string;
  loading: string;
  loadError: string;
  retry: string;
  exit: string;
  soon: string;
  guestYesterday: string;
  playToday: string;
  dayOver: string;
  maintenance: string;
  actionError: string;
  connection: string;
  restarted: string;
  sessionChanged: string;
  intro: { lines: string[]; start: string; resume: (n: number) => string; finished: string; past: string; newBoard: string };
  category: (n: number, total: number) => string;
  perTurn: (s: number) => string;
  left: (n: number, total: number) => string;
  begin: string;
  startsIn: string;
  go: string;
  turnFirst: string;
  turnNext: string;
  errors: string;
  placeholder: string;
  say: string;
  you: string;
  pts: string;
  feedback: { wrong: (text: string, n: number, max: number) => string; repeat: (text: string, n: number, max: number) => string; ambiguous: (text: string) => string; late: string };
  catEnd: {
    time: string; misses: (max: number) => string; complete: string;
    titleComplete: string; titleOut: string;
    named: (n: number, total: number, pts: number) => string;
    missing: (n: number) => string; revealLater: string;
    next: string; result: string;
  };
  end: { title: string; points: (n: number) => string; answers: (n: number) => string; rank: (n: number) => string; share: string; copied: string; leaderboard: string; noPlayers: string };
  archive: { title: string; back: string; day: (n: number) => string; today: string };
  board: { title: string; players: (n: number) => string; empty: string; join: string; joinButton: string };
}

const es: UltimoCopy = {
  brandA: "Último en pie",
  brandB: "futbolero",
  loading: "Cargando…",
  loadError: "No pudimos cargar las categorías. Probá de nuevo.",
  retry: "Reintentar",
  exit: "Salir",
  soon: "Las primeras categorías llegan pronto.",
  guestYesterday: "Iniciá sesión para jugar el de hoy y entrar al ranking. Mientras, jugá los días anteriores.",
  playToday: "Jugar el de hoy",
  dayOver: "Ese día ya cerró. Te llevamos al de hoy.",
  maintenance: "Estamos haciendo un ajuste. Probá en un rato.",
  actionError: "Algo falló. Probá de nuevo.",
  connection: "Conexión inestable: recuperando tu partida…",
  restarted: "Las categorías se actualizaron: empezá de nuevo.",
  sessionChanged: "Cambió tu sesión: volvé a empezar.",
  intro: {
    lines: [
      "5 categorías por día, las mismas para todos.",
      "Nombrá respuestas una tras otra, sin repetir: el reloj arranca en 20 s y se achica con cada acierto.",
      "Si se te acaba el tiempo o errás 3 veces seguidas, termina la categoría.",
      "1 punto por respuesta y +5 si completás la lista.",
    ],
    start: "Jugar",
    resume: (n) => `Seguir · categoría ${n}`,
    finished: "Ver resultado",
    past: "Días anteriores",
    newBoard: "Nuevas categorías todos los días a la medianoche de Argentina.",
  },
  category: (n, total) => `Categoría ${n} de ${total}`,
  perTurn: (s) => `${s} s por turno`,
  left: (n, total) => `quedan ${n} de ${total}`,
  begin: "Empezar categoría",
  startsIn: "Arranca en…",
  go: "¡Ya!",
  turnFirst: "¡Arrancá!",
  turnNext: "Nombrá otro",
  errors: "errores",
  placeholder: "Escribí una respuesta",
  say: "Decir",
  you: "Vos",
  pts: "pts",
  feedback: {
    wrong: (t, n, max) => `✗ “${t}” no está en la lista (${n}/${max})`,
    repeat: (t, n, max) => `↺ “${t}” ya lo dijiste (${n}/${max})`,
    ambiguous: (t) => `¿Cuál “${t}”? Hay más de uno: escribí el nombre completo`,
    late: "Se te acabó el tiempo",
  },
  catEnd: {
    time: "Se te acabó el tiempo",
    misses: (max) => `Erraste ${max} veces seguidas`,
    complete: "No quedó ninguna sin nombrar",
    titleComplete: "¡Lista completa!",
    titleOut: "Quedaste afuera",
    named: (n, total, pts) => `Nombraste ${n} de ${total} · +${pts} pts`,
    missing: (n) => `Te faltaron ${n}`,
    revealLater: "Las que faltaron se revelan cuando cierre el día.",
    next: "Siguiente categoría",
    result: "Ver resultado",
  },
  end: {
    title: "Desafío del día",
    points: (n) => (n === 1 ? "punto" : "puntos"),
    answers: (n) => (n === 1 ? "1 respuesta" : `${n} respuestas`),
    rank: (n) => `Puesto #${n} de hoy`,
    share: "Compartir",
    copied: "¡Copiado!",
    leaderboard: "Ranking de hoy",
    noPlayers: "Todavía nadie terminó hoy.",
  },
  archive: { title: "Días anteriores", back: "Volver", day: (n) => `Día #${n}`, today: "Hoy" },
  board: { title: "Ranking del día", players: (n) => (n === 1 ? "1 jugador" : `${n} jugadores`), empty: "Todavía nadie terminó hoy. ¡Sé el primero!", join: "Iniciá sesión para jugar el de hoy y aparecer en el ranking.", joinButton: "Iniciar sesión" },
};

const en: UltimoCopy = {
  brandA: "Last Answer",
  brandB: "Standing",
  loading: "Loading…",
  loadError: "We couldn't load the categories. Try again.",
  retry: "Retry",
  exit: "Exit",
  soon: "The first categories are coming soon.",
  guestYesterday: "Sign in to play today's and make the ranking. Meanwhile, play the previous days.",
  playToday: "Play today's",
  dayOver: "That day is over. Taking you to today's.",
  maintenance: "We're making a quick fix. Try again soon.",
  actionError: "Something went wrong. Try again.",
  connection: "Unstable connection: recovering your game…",
  restarted: "The categories were updated: start again.",
  sessionChanged: "Your session changed: start again.",
  intro: {
    lines: [
      "5 categories a day, the same for everyone.",
      "Name answers one after another, no repeats: the clock starts at 20 s and gets shorter with every hit.",
      "Run out of time or miss 3 times in a row and the category is over.",
      "1 point per answer and +5 for a complete list.",
    ],
    start: "Play",
    resume: (n) => `Continue · category ${n}`,
    finished: "See result",
    past: "Previous days",
    newBoard: "New categories every day at midnight, Argentina time.",
  },
  category: (n, total) => `Category ${n} of ${total}`,
  perTurn: (s) => `${s} s per turn`,
  left: (n, total) => `${n} of ${total} left`,
  begin: "Start category",
  startsIn: "Starting in…",
  go: "Go!",
  turnFirst: "Go!",
  turnNext: "Name another",
  errors: "misses",
  placeholder: "Type an answer",
  say: "Say",
  you: "You",
  pts: "pts",
  feedback: {
    wrong: (t, n, max) => `✗ “${t}” isn't on the list (${n}/${max})`,
    repeat: (t, n, max) => `↺ You already said “${t}” (${n}/${max})`,
    ambiguous: (t) => `Which “${t}”? There's more than one: type the full name`,
    late: "Time's up",
  },
  catEnd: {
    time: "Time's up",
    misses: (max) => `${max} misses in a row`,
    complete: "Nothing left unnamed",
    titleComplete: "List complete!",
    titleOut: "You're out",
    named: (n, total, pts) => `You named ${n} of ${total} · +${pts} pts`,
    missing: (n) => `You missed ${n}`,
    revealLater: "The ones you missed are revealed when the day closes.",
    next: "Next category",
    result: "See result",
  },
  end: {
    title: "Daily challenge",
    points: (n) => (n === 1 ? "point" : "points"),
    answers: (n) => (n === 1 ? "1 answer" : `${n} answers`),
    rank: (n) => `#${n} today`,
    share: "Share",
    copied: "Copied!",
    leaderboard: "Today's ranking",
    noPlayers: "Nobody has finished today yet.",
  },
  archive: { title: "Previous days", back: "Back", day: (n) => `Day #${n}`, today: "Today" },
  board: { title: "Daily ranking", players: (n) => (n === 1 ? "1 player" : `${n} players`), empty: "Nobody has finished today yet. Be the first!", join: "Sign in to play today's and appear in the ranking.", joinButton: "Sign in" },
};

const ka: UltimoCopy = {
  ...en,
  brandA: "ბოლომდე",
  brandB: "დარჩენილი",
  loading: "იტვირთება…",
  loadError: "კატეგორიები ვერ ჩაიტვირთა. სცადე ხელახლა.",
  retry: "ხელახლა",
  exit: "გასვლა",
  soon: "პირველი კატეგორიები მალე გამოჩნდება.",
  guestYesterday: "შედი ანგარიშზე, რომ დღევანდელი ითამაშო და რეიტინგში მოხვდე. მანამდე ითამაშე წინა დღეები.",
  playToday: "დღევანდელის თამაში",
  dayOver: "ეს დღე დასრულდა. გადაგიყვანთ დღევანდელზე.",
  maintenance: "მცირე შესწორებას ვაკეთებთ. სცადე ცოტა ხანში.",
  actionError: "რაღაც შეცდომა მოხდა. სცადე ხელახლა.",
  connection: "არასტაბილური კავშირი: თამაშს ვაღდგენთ…",
  restarted: "კატეგორიები განახლდა: დაიწყე თავიდან.",
  sessionChanged: "სესია შეიცვალა: დაიწყე თავიდან.",
  intro: {
    lines: [
      "დღეში 5 კატეგორია, ყველასთვის ერთნაირი.",
      "დაასახელე პასუხები ერთმანეთის მიყოლებით, გამეორების გარეშე: საათი 20 წამით იწყება და ყოველ სწორ პასუხზე მცირდება.",
      "თუ დრო ამოგეწურა ან ზედიზედ 3-ჯერ შეცდი, კატეგორია სრულდება.",
      "1 ქულა თითო პასუხზე და +5 სრულ სიაზე.",
    ],
    start: "თამაში",
    resume: (n) => `გაგრძელება · კატეგორია ${n}`,
    finished: "შედეგის ნახვა",
    past: "წინა დღეები",
    newBoard: "ახალი კატეგორიები ყოველდღე, არგენტინის დროით შუაღამეს.",
  },
  category: (n, total) => `კატეგორია ${n} / ${total}`,
  perTurn: (s) => `${s} წმ სვლაზე`,
  left: (n, total) => `დარჩა ${n} / ${total}`,
  begin: "კატეგორიის დაწყება",
  startsIn: "იწყება…",
  go: "დავიწყოთ!",
  turnFirst: "დაიწყე!",
  turnNext: "დაასახელე კიდევ",
  errors: "შეცდომა",
  placeholder: "ჩაწერე პასუხი",
  say: "თქმა",
  you: "შენ",
  pts: "ქულა",
  feedback: {
    wrong: (t, n, max) => `✗ „${t}“ სიაში არ არის (${n}/${max})`,
    repeat: (t, n, max) => `↺ „${t}“ უკვე თქვი (${n}/${max})`,
    ambiguous: (t) => `რომელი „${t}“? რამდენიმეა: ჩაწერე სრული სახელი`,
    late: "დრო ამოიწურა",
  },
  catEnd: {
    time: "დრო ამოიწურა",
    misses: (max) => `ზედიზედ ${max} შეცდომა`,
    complete: "არცერთი არ დარჩა დაუსახელებელი",
    titleComplete: "სია სრულია!",
    titleOut: "გამოეთიშე",
    named: (n, total, pts) => `დაასახელე ${n} / ${total} · +${pts} ქულა`,
    missing: (n) => `გამოგრჩა ${n}`,
    revealLater: "გამორჩენილი პასუხები დღის დასრულებისას გამოჩნდება.",
    next: "შემდეგი კატეგორია",
    result: "შედეგის ნახვა",
  },
  end: {
    title: "დღის გამოწვევა",
    points: () => "ქულა",
    answers: (n) => `${n} პასუხი`,
    rank: (n) => `#${n} დღეს`,
    share: "გაზიარება",
    copied: "დაკოპირდა!",
    leaderboard: "დღევანდელი რეიტინგი",
    noPlayers: "დღეს ჯერ არავის დაუსრულებია.",
  },
  archive: { title: "წინა დღეები", back: "უკან", day: (n) => `დღე #${n}`, today: "დღეს" },
  board: { title: "დღის რეიტინგი", players: (n) => `${n} მოთამაშე`, empty: "დღეს ჯერ არავის დაუსრულებია. იყავი პირველი!", join: "შედი ანგარიშზე, რომ დღევანდელი ითამაშო და რეიტინგში გამოჩნდე.", joinButton: "შესვლა" },
};

const tr: UltimoCopy = {
  ...en,
  brandA: "Futbolcu",
  brandB: "Sayma",
  loading: "Yükleniyor…",
  loadError: "Kategoriler yüklenemedi. Tekrar dene.",
  retry: "Tekrar dene",
  exit: "Çıkış",
  soon: "İlk kategoriler yakında geliyor.",
  guestYesterday: "Bugünkünü oynamak ve sıralamaya girmek için giriş yap. Bu arada önceki günleri oyna.",
  playToday: "Bugünkünü oyna",
  dayOver: "O gün kapandı. Seni bugünküne götürüyoruz.",
  maintenance: "Küçük bir düzeltme yapıyoruz. Birazdan tekrar dene.",
  actionError: "Bir şeyler ters gitti. Tekrar dene.",
  connection: "Bağlantı dengesiz: oyunun kurtarılıyor…",
  restarted: "Kategoriler güncellendi: yeniden başla.",
  sessionChanged: "Oturumun değişti: yeniden başla.",
  intro: {
    lines: [
      "Günde 5 kategori, herkes için aynı.",
      "Cevapları tekrar etmeden art arda say: süre 20 sn'de başlar ve her doğruda kısalır.",
      "Süre biterse ya da üst üste 3 kez yanılırsan kategori biter.",
      "Her cevaba 1 puan, listeyi tamamlarsan +5.",
    ],
    start: "Oyna",
    resume: (n) => `Devam et · kategori ${n}`,
    finished: "Sonucu gör",
    past: "Önceki günler",
    newBoard: "Her gün Arjantin saatiyle gece yarısı yeni kategoriler.",
  },
  category: (n, total) => `Kategori ${n} / ${total}`,
  perTurn: (s) => `Tur başına ${s} sn`,
  left: (n, total) => `${total} içinden ${n} kaldı`,
  begin: "Kategoriyi başlat",
  startsIn: "Başlıyor…",
  go: "Başla!",
  turnFirst: "Başla!",
  turnNext: "Bir tane daha",
  errors: "hata",
  placeholder: "Bir cevap yaz",
  say: "Söyle",
  you: "Sen",
  pts: "puan",
  feedback: {
    wrong: (t, n, max) => `✗ “${t}” listede yok (${n}/${max})`,
    repeat: (t, n, max) => `↺ “${t}” zaten söyledin (${n}/${max})`,
    ambiguous: (t) => `Hangi “${t}”? Birden fazla var: tam adı yaz`,
    late: "Süre doldu",
  },
  catEnd: {
    time: "Süre doldu",
    misses: (max) => `Üst üste ${max} hata`,
    complete: "Söylenmeyen kalmadı",
    titleComplete: "Liste tamam!",
    titleOut: "Elendin",
    named: (n, total, pts) => `${total} içinden ${n} saydın · +${pts} puan`,
    missing: (n) => `${n} tanesini kaçırdın`,
    revealLater: "Kaçırdıkların gün kapanınca açıklanır.",
    next: "Sonraki kategori",
    result: "Sonucu gör",
  },
  end: {
    title: "Günün meydan okuması",
    points: () => "puan",
    answers: (n) => `${n} cevap`,
    rank: (n) => `Bugün #${n}`,
    share: "Paylaş",
    copied: "Kopyalandı!",
    leaderboard: "Bugünün sıralaması",
    noPlayers: "Bugün henüz kimse bitirmedi.",
  },
  archive: { title: "Önceki günler", back: "Geri", day: (n) => `Gün #${n}`, today: "Bugün" },
  board: { title: "Günün sıralaması", players: (n) => `${n} oyuncu`, empty: "Bugün henüz kimse bitirmedi. İlk sen ol!", join: "Bugünkünü oynamak ve sıralamada görünmek için giriş yap.", joinButton: "Giriş yap" },
};

const COPY: Record<string, UltimoCopy> = { es, en, ka, tr };

export const ultimoCopy = (locale: Locale | string): UltimoCopy => COPY[locale] ?? en;

export const textFor = (text: LocalizedText | null | undefined, locale: Locale | string): string =>
  !text ? "" : (text as Record<string, string | undefined>)[locale] ?? text.es;
