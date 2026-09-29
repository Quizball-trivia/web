import type { Locale } from "@/lib/i18n/locale";
import type { DuelGameId } from "@/lib/realtime/socket.types";

export interface DuelCopy {
  games: Record<DuelGameId, string>;
  playWithFriend: string;
  playWithFriendHint: string;
  you: string;
  connecting: string;
  waitingRival: (name: string) => string;
  getReady: string;
  yourTurn: string;
  theirTurn: (name: string) => string;
  round: (n: number, total: number) => string;
  player: (n: number, total: number) => string;
  points: (n: number) => string;
  secondsLeft: (n: number) => string;
  idleWarning: string;
  bm: {
    pick: string;
    random: string;
    youMine: (rival: string, pts: number) => string;
    rivalMine: (name: string, pts: number) => string;
    cleared: (pts: number) => string;
    found: (n: number, of: number) => string;
    impostor: string;
  };
  pf: {
    pointsInPlay: string;
    nextClue: string;
    /** At the last clue this round can reach: passing ends the player for both. */
    skip: string;
    guess: string;
    placeholder: string;
    youPassed: string;
    rivalPassed: (name: string) => string;
    lockedYou: string;
    lockedRival: (name: string, clues: number) => string;
    tried: (name: string, text: string) => string;
    solvedBy: (name: string, pts: number) => string;
    youSolved: (pts: number) => string;
    nobody: string;
    answerWas: string;
  };
  result: {
    win: string;
    lose: string;
    draw: string;
    cancelled: string;
    forfeit: (name: string) => string;
    idle: (name: string) => string;
    noShow: (name: string) => string;
    disconnect: (name: string) => string;
    youForfeit: string;
    youIdle: string;
    youDisconnect: string;
    youNoShow: string;
    backToRoom: string;
    exit: string;
  };
  forfeit: { button: string; confirm: string; yes: string; no: string };
  retry: string;
  intro: { vs: string; go: string; startsIn: string; rules: Record<DuelGameId, string[]> };
  pause: { rivalGone: (name: string) => string; waiting: string; ifNotBack: string; reconnecting: string };
  offline: string;
  activeDuel: { title: string; back: string };
  errors: Record<string, string>;
}

const es: DuelCopy = {
  games: { buscaminas: "Buscaminas futbolero", pistas: "Pistas futboleras" },
  playWithFriend: "Jugar con un amigo",
  playWithFriendHint: "Mandale el link y juegan en vivo, cara a cara.",
  you: "Vos",
  connecting: "Conectando…",
  waitingRival: (name) => `Esperando a ${name}…`,
  getReady: "¡Arranca!",
  yourTurn: "Tu turno",
  theirTurn: (name) => `Turno de ${name}`,
  round: (n, total) => `Ronda ${n}/${total}`,
  player: (n, total) => `Jugador ${n}/${total}`,
  points: (n) => `${n} ${n === 1 ? "punto" : "puntos"}`,
  secondsLeft: (n) => `${n} s`,
  idleWarning: "¿Seguís ahí? Si no jugás, perdés la partida.",
  bm: {
    pick: "Elegí un jugador que cumpla la categoría",
    random: "al azar",
    youMine: (rival, pts) => `Tocaste un impostor · +${pts} para ${rival}`,
    rivalMine: (name, pts) => `${name} tocó un impostor · +${pts} para vos`,
    cleared: (pts) => `¡Encontraron los 12! +${pts} para los dos`,
    found: (n, of) => `${n}/${of} encontrados`,
    impostor: "Impostor",
  },
  pf: {
    pointsInPlay: "puntos en juego",
    nextClue: "Otra pista",
    skip: "Pasar al siguiente",
    guess: "Adivinar",
    placeholder: "Apellido del jugador",
    youPassed: "Pediste otra pista",
    rivalPassed: (name) => `${name} quiere otra pista`,
    lockedYou: "Fallaste: ahora juega tu rival",
    lockedRival: (name, clues) => `${name} falló · te quedan hasta ${clues} ${clues === 1 ? "pista" : "pistas"}`,
    tried: (name, text) => `${name} probó “${text}”`,
    solvedBy: (name, pts) => `¡${name} lo sacó! +${pts}`,
    youSolved: (pts) => `¡Lo sacaste! +${pts}`,
    nobody: "Nadie lo sacó",
    answerWas: "Era",
  },
  result: {
    win: "¡Ganaste!",
    lose: "Perdiste",
    draw: "Empate",
    cancelled: "La partida se canceló",
    forfeit: (name) => `${name} abandonó la partida`,
    idle: (name) => `${name} dejó de jugar`,
    noShow: (name) => `${name} no llegó a entrar`,
    disconnect: (name) => `${name} se desconectó y no volvió`,
    youForfeit: "Abandonaste la partida",
    youIdle: "Dejaste de jugar",
    youDisconnect: "Te desconectaste y no volviste a tiempo",
    youNoShow: "No llegaste a entrar",
    backToRoom: "Volver a la sala",
    exit: "Salir",
  },
  forfeit: { button: "Abandonar", confirm: "¿Abandonar la partida? Gana tu rival.", yes: "Sí, abandonar", no: "Seguir jugando" },
  retry: "Reintentar",
  intro: {
    vs: "VS",
    go: "¡A jugar!",
    startsIn: "Arranca en",
    rules: {
      pistas: ["Las mismas pistas para los dos, una por vez.", "El primero que lo saca suma 11 − pistas.", "Si le errás, tu rival tiene hasta 3 pistas más."],
      buscaminas: ["Elijan jugadores por turnos.", "Si tocás un impostor, suma tu rival.", "Si encuentran los 12, suman los dos."],
    },
  },
  pause: {
    rivalGone: (name) => `${name} se desconectó`,
    waiting: "Esperando que vuelva…",
    ifNotBack: "Si no vuelve a tiempo, ganás la partida.",
    reconnecting: "Reconectando…",
  },
  offline: "Sin conexión · reconectando…",
  activeDuel: { title: "Tenés un duelo en curso", back: "Volver al duelo" },
  errors: {
    not_your_turn: "Todavía no es tu turno",
    locked_out: "Ya fallaste este jugador",
    rate_limited: "Más despacio…",
    duel_not_found: "No encontramos esta partida",
    not_in_match: "Esta partida no es tuya",
    empty_guess: "Escribí un apellido",
    default: "Algo falló. Probá de nuevo.",
  },
};

const en: DuelCopy = {
  games: { buscaminas: "Football Minesweeper", pistas: "Football Clues" },
  playWithFriend: "Play with a friend",
  playWithFriendHint: "Send the link and play live, head to head.",
  you: "You",
  connecting: "Connecting…",
  waitingRival: (name) => `Waiting for ${name}…`,
  getReady: "Here we go!",
  yourTurn: "Your turn",
  theirTurn: (name) => `${name}'s turn`,
  round: (n, total) => `Round ${n}/${total}`,
  player: (n, total) => `Player ${n}/${total}`,
  points: (n) => `${n} ${n === 1 ? "point" : "points"}`,
  secondsLeft: (n) => `${n}s`,
  idleWarning: "Still there? If you don't play, you lose the match.",
  bm: {
    pick: "Pick a player who fits the category",
    random: "random",
    youMine: (rival, pts) => `You hit an impostor · +${pts} for ${rival}`,
    rivalMine: (name, pts) => `${name} hit an impostor · +${pts} for you`,
    cleared: (pts) => `All 12 found! +${pts} each`,
    found: (n, of) => `${n}/${of} found`,
    impostor: "Impostor",
  },
  pf: {
    pointsInPlay: "points in play",
    nextClue: "Next clue",
    skip: "Skip player",
    guess: "Guess",
    placeholder: "Player's surname",
    youPassed: "You asked for another clue",
    rivalPassed: (name) => `${name} wants another clue`,
    lockedYou: "Wrong: your rival plays on",
    lockedRival: (name, clues) => `${name} missed · up to ${clues} ${clues === 1 ? "clue" : "clues"} left for you`,
    tried: (name, text) => `${name} tried “${text}”`,
    solvedBy: (name, pts) => `${name} got it! +${pts}`,
    youSolved: (pts) => `You got it! +${pts}`,
    nobody: "Nobody got it",
    answerWas: "It was",
  },
  result: {
    win: "You win!",
    lose: "You lose",
    draw: "Draw",
    cancelled: "The match was cancelled",
    forfeit: (name) => `${name} left the match`,
    idle: (name) => `${name} stopped playing`,
    noShow: (name) => `${name} never joined`,
    disconnect: (name) => `${name} disconnected and did not come back`,
    youForfeit: "You left the match",
    youIdle: "You stopped playing",
    youDisconnect: "You disconnected and didn't come back in time",
    youNoShow: "You never joined",
    backToRoom: "Back to the room",
    exit: "Exit",
  },
  forfeit: { button: "Leave", confirm: "Leave the match? Your rival wins.", yes: "Yes, leave", no: "Keep playing" },
  retry: "Retry",
  intro: {
    vs: "VS",
    go: "Go!",
    startsIn: "Starts in",
    rules: {
      pistas: ["Same clues for both of you, one at a time.", "First to get it scores 11 − clues.", "Miss, and your rival gets up to 3 more clues."],
      buscaminas: ["Take turns picking players.", "Hit an impostor and your rival scores.", "Find all 12 and you both score."],
    },
  },
  pause: {
    rivalGone: (name) => `${name} disconnected`,
    waiting: "Waiting for them to come back…",
    ifNotBack: "If they don't come back in time, you win.",
    reconnecting: "Reconnecting…",
  },
  offline: "No connection · reconnecting…",
  activeDuel: { title: "You have a duel in progress", back: "Back to the duel" },
  errors: {
    not_your_turn: "Not your turn yet",
    locked_out: "You already missed this player",
    rate_limited: "Slow down…",
    duel_not_found: "We couldn't find this match",
    not_in_match: "This match isn't yours",
    empty_guess: "Type a surname",
    default: "Something went wrong. Try again.",
  },
};

const ka: DuelCopy = {
  games: { buscaminas: "საფეხბურთო მაღაროები", pistas: "საფეხბურთო მინიშნებები" },
  playWithFriend: "მეგობართან ერთად თამაში",
  playWithFriendHint: "გაუგზავნე ბმული და ითამაშეთ პირისპირ.",
  you: "შენ",
  connecting: "ვუკავშირდებით…",
  waitingRival: (name) => `ველოდებით ${name}-ს…`,
  getReady: "დავიწყეთ!",
  yourTurn: "შენი სვლაა",
  theirTurn: (name) => `${name}-ის სვლაა`,
  round: (n, total) => `რაუნდი ${n}/${total}`,
  player: (n, total) => `მოთამაშე ${n}/${total}`,
  points: (n) => `${n} ქულა`,
  secondsLeft: (n) => `${n} წმ`,
  idleWarning: "აქ ხარ? თუ არ ითამაშებ, მატჩს წააგებ.",
  bm: {
    pick: "აირჩიე მოთამაშე, რომელიც კატეგორიას შეესაბამება",
    random: "შემთხვევით",
    youMine: (rival, pts) => `მატყუარა აირჩიე · +${pts} ${rival}-ს`,
    rivalMine: (name, pts) => `${name}-მა მატყუარა აირჩია · +${pts} შენ`,
    cleared: (pts) => `12-ივე ნაპოვნია! +${pts} ორივეს`,
    found: (n, of) => `ნაპოვნია ${n}/${of}`,
    impostor: "მატყუარა",
  },
  pf: {
    pointsInPlay: "ქულა თამაშშია",
    nextClue: "კიდევ ერთი მინიშნება",
    skip: "შემდეგზე გადასვლა",
    guess: "გამოცნობა",
    placeholder: "მოთამაშის გვარი",
    youPassed: "კიდევ ერთი მინიშნება ითხოვე",
    rivalPassed: (name) => `${name} კიდევ ერთ მინიშნებას ითხოვს`,
    lockedYou: "შეცდი: ახლა მეტოქე თამაშობს",
    lockedRival: (name, clues) => `${name} შეცდა · დაგრჩა მაქსიმუმ ${clues} მინიშნება`,
    tried: (name, text) => `${name}-მა სცადა „${text}“`,
    solvedBy: (name, pts) => `${name}-მა გამოიცნო! +${pts}`,
    youSolved: (pts) => `გამოიცანი! +${pts}`,
    nobody: "ვერავინ გამოიცნო",
    answerWas: "ეს იყო",
  },
  result: {
    win: "მოიგე!",
    lose: "წააგე",
    draw: "ფრე",
    cancelled: "მატჩი გაუქმდა",
    forfeit: (name) => `${name}-მა მატჩი დატოვა`,
    idle: (name) => `${name}-მა თამაში შეწყვიტა`,
    noShow: (name) => `${name} ვერ შემოვიდა`,
    disconnect: (name) => `${name} გაითიშა და აღარ დაბრუნდა`,
    youForfeit: "შენ დატოვე მატჩი",
    youIdle: "შენ შეწყვიტე თამაში",
    youDisconnect: "გაითიშე და დროულად ვერ დაბრუნდი",
    youNoShow: "ვერ შემოხვედი",
    backToRoom: "ოთახში დაბრუნება",
    exit: "გასვლა",
  },
  forfeit: { button: "დატოვება", confirm: "დატოვებ მატჩს? მეტოქე მოიგებს.", yes: "დიახ, დატოვება", no: "თამაშის გაგრძელება" },
  retry: "თავიდან ცდა",
  intro: {
    vs: "VS",
    go: "დავიწყეთ!",
    startsIn: "იწყება",
    rules: {
      pistas: ["ორივეს ერთი და იგივე მინიშნებები, თითო-თითოდ.", "ვინც პირველი გამოიცნობს, იღებს 11 − მინიშნება ქულას.", "თუ შეცდი, მეტოქეს მაქსიმუმ 3 მინიშნება დარჩება."],
      buscaminas: ["მოთამაშეებს რიგრიგობით ირჩევთ.", "თუ მატყუარას აირჩევ, ქულას მეტოქე იღებს.", "თუ 12-ივეს იპოვით, ორივე იღებთ ქულას."],
    },
  },
  pause: {
    rivalGone: (name) => `${name} გაითიშა`,
    waiting: "ველოდებით დაბრუნებას…",
    ifNotBack: "თუ დროულად არ დაბრუნდება, შენ მოიგებ.",
    reconnecting: "ვუკავშირდებით…",
  },
  offline: "კავშირი არ არის · ვუკავშირდებით…",
  activeDuel: { title: "დუელი მიმდინარეობს", back: "დუელში დაბრუნება" },
  errors: {
    not_your_turn: "ჯერ შენი სვლა არ არის",
    locked_out: "ამ მოთამაშეზე უკვე შეცდი",
    rate_limited: "ნელა…",
    duel_not_found: "ეს მატჩი ვერ ვიპოვეთ",
    not_in_match: "ეს მატჩი შენი არ არის",
    empty_guess: "ჩაწერე გვარი",
    default: "რაღაც შეცდომა მოხდა. სცადე თავიდან.",
  },
};

const tr: DuelCopy = {
  games: { buscaminas: "Futbol Mayın Tarlası", pistas: "Futbol İpuçları" },
  playWithFriend: "Arkadaşınla oyna",
  playWithFriendHint: "Linki gönder, kafa kafaya canlı oynayın.",
  you: "Sen",
  connecting: "Bağlanıyor…",
  waitingRival: (name) => `${name} bekleniyor…`,
  getReady: "Başlıyoruz!",
  yourTurn: "Sıra sende",
  theirTurn: (name) => `Sıra ${name}'de`,
  round: (n, total) => `Tur ${n}/${total}`,
  player: (n, total) => `Oyuncu ${n}/${total}`,
  points: (n) => `${n} puan`,
  secondsLeft: (n) => `${n} sn`,
  idleWarning: "Orada mısın? Oynamazsan maçı kaybedersin.",
  bm: {
    pick: "Kategoriye uyan bir oyuncu seç",
    random: "rastgele",
    youMine: (rival, pts) => `Bir sahtekâra bastın · ${rival}'e +${pts}`,
    rivalMine: (name, pts) => `${name} bir sahtekâra bastı · sana +${pts}`,
    cleared: (pts) => `12'si de bulundu! İkinize de +${pts}`,
    found: (n, of) => `${n}/${of} bulundu`,
    impostor: "Sahtekâr",
  },
  pf: {
    pointsInPlay: "puan oyunda",
    nextClue: "Bir ipucu daha",
    skip: "Sonraki oyuncuya geç",
    guess: "Tahmin et",
    placeholder: "Oyuncunun soyadı",
    youPassed: "Bir ipucu daha istedin",
    rivalPassed: (name) => `${name} bir ipucu daha istiyor`,
    lockedYou: "Yanlış: şimdi rakibin oynuyor",
    lockedRival: (name, clues) => `${name} bilemedi · en fazla ${clues} ipucun kaldı`,
    tried: (name, text) => `${name} “${text}” dedi`,
    solvedBy: (name, pts) => `${name} bildi! +${pts}`,
    youSolved: (pts) => `Bildin! +${pts}`,
    nobody: "Kimse bilemedi",
    answerWas: "Cevap",
  },
  result: {
    win: "Kazandın!",
    lose: "Kaybettin",
    draw: "Berabere",
    cancelled: "Maç iptal edildi",
    forfeit: (name) => `${name} maçtan ayrıldı`,
    idle: (name) => `${name} oynamayı bıraktı`,
    noShow: (name) => `${name} maça girmedi`,
    disconnect: (name) => `${name} bağlantıyı kaybetti ve dönmedi`,
    youForfeit: "Maçtan ayrıldın",
    youIdle: "Oynamayı bıraktın",
    youDisconnect: "Bağlantın koptu ve zamanında dönmedin",
    youNoShow: "Maça girmedin",
    backToRoom: "Odaya dön",
    exit: "Çık",
  },
  forfeit: { button: "Ayrıl", confirm: "Maçtan ayrılıyor musun? Rakibin kazanır.", yes: "Evet, ayrıl", no: "Oynamaya devam et" },
  retry: "Tekrar dene",
  intro: {
    vs: "VS",
    go: "Başla!",
    startsIn: "Başlıyor",
    rules: {
      pistas: ["İkinize de aynı ipuçları, teker teker.", "İlk bilen 11 − ipucu puan alır.", "Bilemezsen rakibine en fazla 3 ipucu daha kalır."],
      buscaminas: ["Sırayla oyuncu seçin.", "Sahtekâra basarsan puanı rakibin alır.", "12'sini de bulursanız ikiniz de puan alırsınız."],
    },
  },
  pause: {
    rivalGone: (name) => `${name} bağlantıyı kaybetti`,
    waiting: "Geri dönmesi bekleniyor…",
    ifNotBack: "Zamanında dönmezse maçı sen kazanırsın.",
    reconnecting: "Yeniden bağlanıyor…",
  },
  offline: "Bağlantı yok · yeniden bağlanıyor…",
  activeDuel: { title: "Devam eden bir düellon var", back: "Düelloya dön" },
  errors: {
    not_your_turn: "Henüz sıra sende değil",
    locked_out: "Bu oyuncuyu zaten bilemedin",
    rate_limited: "Yavaş…",
    duel_not_found: "Bu maçı bulamadık",
    not_in_match: "Bu maç senin değil",
    empty_guess: "Bir soyadı yaz",
    default: "Bir şeyler ters gitti. Tekrar dene.",
  },
};

const COPY: Record<Locale, DuelCopy> = { es, en, ka, tr };

export const duelCopy = (locale: Locale): DuelCopy => COPY[locale] ?? es;

/** Errors a player caused by acting on a screen one step behind; the next snapshot already fixes it. */
export const QUIET_ERRORS = new Set(["stale_turn", "stale_round", "stale_clue", "round_over", "already_picked", "not_active", "command_id_reused"]);
