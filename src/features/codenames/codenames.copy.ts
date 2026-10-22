import type { CardKind } from "./codenames.view";

export interface CodenamesCopy {
  brand: readonly [string, string];
  tag: string;
  lines: readonly string[];
  kinds: Record<CardKind, string>;
  yourTeam: string;
  rivalTeam: string;
  scout: string;
  left: (n: number) => string;
  clue: string;
  guessesLeft: (n: number) => string;
  flip: string;
  stop: string;
  endTurn: string;
  giveClue: string;
  cluePlaceholder: string;
  clueProblems: Record<"empty" | "words" | "long", string>;
  clueRule: string;
  nameKinds: Record<"player" | "manager" | "club" | "nation" | "stadium" | "word", string>;
  clueUsed: string;
  /** Word boards. */
  words: { placeholder: string; rule: string; onBoard: (word: string) => string; onBoardAny: string; scoutKeyNote: string; tag: string; lines: string[]; starts: string; otherCards: string; wordsIn: string; practiceTag: string; newBoard: string; unavailable: string; endComplete: string };
  board: { label: string; pictures: string; words: string; picturesNote: string; wordsNote: string; hostPicks: string };
  number: string;
  youAreScout: string;
  scoutKeyNote: string;
  yourScoutThinking: (name: string) => string;
  rivalScoutThinking: (name: string) => string;
  yourTurn: string;
  rivalGuessing: string;
  teamsTitle: string;
  teamsNote: string;
  home: string;
  away: string;
  guessers: string;
  noScout: string;
  noTeam: string;
  joinScout: string;
  joinGuesser: string;
  otherCards: string;
  shuffle: string;
  kickOff: string;
  waitingHost: string;
  needScouts: string;
  starts: string;
  youWon: string;
  youLost: string;
  cleared: string;
  ownGoalBy: (mine: boolean) => string;
  rivalLeft: string;
  history: string;
  backToRoom: string;
  leave: string;
  found: (n: number, total: number) => string;
  clueOf: (i: number, n: number) => string;
  endComplete: string;
  endOwnGoal: string;
  endClues: string;
  why: string;
  seeResult: string;
  shareText: (number: number, found: number, total: number, grid: string) => string;
  botScout: string;
  botScoutNote: string;
  passed: string;
  sawKeyNote: string;
  clueBlocked: string;
  tryAgain: string;
  foundLabel: string;
  cardLabel: (n: number) => string;
  needBothTeams: string;
  yourTeamLeft: string;
  idleTitle: string;
  idleText: string;
  /** Over the result banner's two counts (cards each team still had to find). */
  cardsLeftTitle: string;
  /** A finished run of today's board: the key and reasons wait for the day to close. */
  answersLater: string;
  /** The daily's notes when another tab of the same run moved it on under the player's pick. */
  staleNotes: Record<"confirmAgain" | "notSent" | "clueChanged" | "cardTaken" | "finished" | "stopAgain", string>;
}

const en: CodenamesCopy = {
  brand: ["Football", "Codenames"],
  tag: "Picture clues",
  lines: [
    "20 picture cards. 8 are yours, 7 the rival's, 4 neutral and one is the Own Goal.",
    "The Scout gives one football clue and a number, like “Ferguson · 2”, “Real Madrid · 3” or “Hand of God · 1”. Find the cards it points to.",
    "The bot gives 3 clues. For each you may flip up to its number + 1 cards: tap a card to pick it, tap it again to flip.",
    "A right card keeps the clue going. A rival or neutral card ends it. The Own Goal ends the game.",
  ],
  kinds: { mine: "Ours", theirs: "Rival", neutral: "Neutral", owngoal: "Own Goal" },
  yourTeam: "Your team",
  rivalTeam: "Rival",
  scout: "Scout",
  left: (n) => `${n} left`,
  clue: "Clue",
  guessesLeft: (n) => (n === 1 ? "1 guess left" : `${n} guesses left`),
  flip: "Flip",
  stop: "I'm done",
  endTurn: "End turn",
  giveClue: "Give clue",
  cluePlaceholder: "Type a football clue…",
  clueProblems: { empty: "Type a clue", words: "Up to 4 words", long: "Too long" },
  clueRule: "Football only: a player, club, manager, stadium, country or famous moment. E.g. Mourinho, Real Madrid, Hand of God.",
  nameKinds: { player: "Player", manager: "Manager", club: "Club", nation: "National team", stadium: "Stadium", word: "Football word" },
  clueUsed: "Already used this game",
  words: { placeholder: "Type a clue…", rule: "Any word or name, plus how many cards it links. Not a word on the board, or part of one.", onBoard: (word) => `${word} is on the board`, onBoardAny: "That clue is a word on the board, or part of one", scoutKeyNote: "Only Scouts see the colours. Give one clue that links your green words.", tag: "Word clues", lines: [
      "25 football words, each with a second meaning. 9 are yours, 8 the rival's, 7 neutral and one is the Own Goal.",
      "The Scout links your words with one clue and a number, like “Wedding · 3” for RICE, BEST and TIE.",
      "The bot gives up to 4 clues. For each you may flip up to its number + 1 cards: tap a card to pick it, tap it again to flip.",
      "A right card keeps the clue going. A rival or neutral card ends it. The Own Goal ends the game.",
    ], starts: "starts · 9 cards", otherCards: "8 cards", wordsIn: "Words in English", practiceTag: "Practice · new board every time", newBoard: "New board", unavailable: "Word boards are not ready in this language yet. Try again later.", endComplete: "All 9 found!" },
  board: { label: "Board", pictures: "Pictures", words: "Words", picturesNote: "20 football pictures", wordsNote: "25 two-meaning words", hostPicks: "The host picks the board." },
  number: "Cards",
  youAreScout: "You're the Scout",
  scoutKeyNote: "Only Scouts see the colours. Give one football clue that links your green cards.",
  yourScoutThinking: (name) => `${name} is thinking of a clue…`,
  rivalScoutThinking: (name) => `Rival Scout ${name} is thinking…`,
  yourTurn: "Your team's turn",
  rivalGuessing: "Rival team is guessing",
  teamsTitle: "Pick your team",
  teamsNote: "Pick a side as Scout (sees which card is whose) or guesser.",
  home: "Home",
  away: "Away",
  guessers: "Guessers",
  noScout: "No Scout yet",
  noTeam: "Not in a team yet",
  joinScout: "Join as Scout",
  joinGuesser: "Join as guesser",
  otherCards: "7 cards",
  shuffle: "Shuffle teams",
  kickOff: "Kick off",
  waitingHost: "Waiting for the host to kick off",
  needScouts: "Teams without a Scout get the bot Scout",
  starts: "starts · 8 cards",
  youWon: "You won!",
  youLost: "You lost",
  cleared: "All cards found",
  ownGoalBy: (mine) => (mine ? "Your team flipped the Own Goal" : "The rival flipped the Own Goal"),
  rivalLeft: "The rival team left",
  history: "Clues",
  backToRoom: "Back to the room",
  leave: "Leave",
  found: (n, total) => `${n}/${total} found`,
  clueOf: (i, n) => `Clue ${i} of ${n}`,
  endComplete: "All 8 found!",
  endOwnGoal: "Own Goal!",
  endClues: "Out of clues",
  why: "Why",
  seeResult: "See result",
  shareText: (number, found, total, grid) => `Football Codenames #${number} · ${found}/${total}\n${grid}`,
  botScout: "Bot Scout",
  botScoutNote: "A team without a Scout gets the bot Scout. On your own, you guess and the bot gives the clues.",
  passed: "The Scout passed",
  sawKeyNote: "You've seen the key, so your teammates do the guessing.",
  clueBlocked: "Pick another clue",
  tryAgain: "That didn't go through. Try again.",
  foundLabel: "Found",
  cardLabel: (n) => `Card ${n}`,
  needBothTeams: "Both teams need at least one player",
  yourTeamLeft: "Your team ran out of players",
  idleTitle: "Game over: no moves",
  idleText: "Nobody played for four turns in a row, so the game ended without a winner.",
  cardsLeftTitle: "Cards left",
  answersLater: "Every card, the rest of the clues and the reasons appear here when today's board closes.",
  staleNotes: {
    confirmAgain: "The board changed in another tab. Your pick wasn't played: tap it again to confirm.",
    notSent: "Your pick wasn't played. Tap it again to confirm.",
    clueChanged: "The clue changed in another tab, so your pick wasn't played. Choose again.",
    cardTaken: "That card was already turned in another tab.",
    finished: "This board was finished in another tab.",
    stopAgain: "The board changed in another tab. Press I'm done again to end this clue.",
  },
};

const es: CodenamesCopy = {
  brand: ["Codenames", "Futbolero"],
  tag: "Pistas con imágenes",
  lines: [
    "20 cartas con dibujos. 8 son tuyas, 7 del rival, 4 neutrales y una es el Autogol.",
    "El Ojeador da una pista futbolera y un número, como “Ferguson · 2”, “Real Madrid · 3” o “Mano de Dios · 1”. Encuentra las cartas que señala.",
    "El bot da 3 pistas. En cada una puedes dar vuelta hasta su número + 1 cartas: toca una carta para elegirla y tócala otra vez para darla vuelta.",
    "Si aciertas, sigues con la pista. Una carta rival o neutral la termina. El Autogol termina la partida.",
  ],
  kinds: { mine: "Nuestra", theirs: "Rival", neutral: "Neutral", owngoal: "Autogol" },
  yourTeam: "Tu equipo",
  rivalTeam: "Rival",
  scout: "Ojeador",
  left: (n) => `faltan ${n}`,
  clue: "Pista",
  guessesLeft: (n) => (n === 1 ? "te queda 1 intento" : `te quedan ${n} intentos`),
  flip: "Girar",
  stop: "Ya está",
  endTurn: "Pasar turno",
  giveClue: "Dar pista",
  cluePlaceholder: "Escribe una pista futbolera…",
  clueProblems: { empty: "Escribe una pista", words: "Máximo 4 palabras", long: "Demasiado larga" },
  clueRule: "Solo fútbol: un jugador, club, entrenador, estadio, selección o momento famoso. Ej.: Mourinho, Real Madrid, Mano de Dios.",
  nameKinds: { player: "Jugador", manager: "Entrenador", club: "Club", nation: "Selección", stadium: "Estadio", word: "Palabra futbolera" },
  clueUsed: "Ya se usó en esta partida",
  words: { placeholder: "Escribe una pista…", rule: "Cualquier palabra o nombre, y cuántas cartas une. No puede ser una palabra del tablero ni parte de una.", onBoard: (word) => `${word} está en el tablero`, onBoardAny: "Esa pista es una palabra del tablero o parte de una", scoutKeyNote: "Solo los Ojeadores ven los colores. Da una pista que una tus palabras verdes.", tag: "Pistas con palabras", lines: [
      "25 palabras futboleras, cada una con un segundo significado. 9 son tuyas, 8 del rival, 7 neutrales y una es el Autogol.",
      "El Ojeador une tus palabras con una pista y un número, como “Ajedrez · 3” para TORRES, REINA y CASILLAS.",
      "El bot da hasta 4 pistas. En cada una puedes dar vuelta hasta su número + 1 cartas: toca una carta para elegirla y tócala otra vez para darla vuelta.",
      "Si aciertas, sigues con la pista. Una carta rival o neutral la termina. El Autogol termina la partida.",
    ], starts: "empieza · 9 cartas", otherCards: "8 cartas", wordsIn: "Palabras en español", practiceTag: "Práctica · tablero nuevo cada vez", newBoard: "Tablero nuevo", unavailable: "Los tableros de palabras aún no están listos en este idioma. Prueba más tarde.", endComplete: "¡Las 9!" },
  board: { label: "Tablero", pictures: "Imágenes", words: "Palabras", picturesNote: "20 dibujos futboleros", wordsNote: "25 palabras con doble sentido", hostPicks: "El anfitrión elige el tablero." },
  number: "Cartas",
  youAreScout: "Eres el Ojeador",
  scoutKeyNote: "Solo los Ojeadores ven los colores. Da una pista futbolera que una tus cartas verdes.",
  yourScoutThinking: (name) => `${name} está pensando una pista…`,
  rivalScoutThinking: (name) => `El Ojeador rival ${name} está pensando…`,
  yourTurn: "Turno de tu equipo",
  rivalGuessing: "El equipo rival está adivinando",
  teamsTitle: "Elige tu equipo",
  teamsNote: "Elige un lado como Ojeador (ve de quién es cada carta) o adivinador.",
  home: "Local",
  away: "Visitante",
  guessers: "Adivinan",
  noScout: "Sin Ojeador",
  noTeam: "Aún sin equipo",
  joinScout: "Ser Ojeador",
  joinGuesser: "Adivinar aquí",
  otherCards: "7 cartas",
  shuffle: "Mezclar equipos",
  kickOff: "Sacar",
  waitingHost: "Esperando a que el anfitrión saque",
  needScouts: "Los equipos sin Ojeador juegan con el Ojeador bot",
  starts: "empieza · 8 cartas",
  youWon: "¡Ganaste!",
  youLost: "Perdiste",
  cleared: "Encontraron todas las cartas",
  ownGoalBy: (mine) => (mine ? "Tu equipo giró el Autogol" : "El rival giró el Autogol"),
  rivalLeft: "El equipo rival se fue",
  history: "Pistas",
  backToRoom: "Volver a la sala",
  leave: "Salir",
  found: (n, total) => `${n}/${total} encontradas`,
  clueOf: (i, n) => `Pista ${i} de ${n}`,
  endComplete: "¡Las 8!",
  endOwnGoal: "¡Autogol!",
  endClues: "Sin pistas",
  why: "Por qué",
  seeResult: "Ver resultado",
  shareText: (number, found, total, grid) => `Codenames Futbolero #${number} · ${found}/${total}\n${grid}`,
  botScout: "Ojeador bot",
  botScoutNote: "Un equipo sin Ojeador juega con el Ojeador bot. Si estás solo, adivinas tú y el bot da las pistas.",
  passed: "El Ojeador pasó",
  sawKeyNote: "Ya viste las claves: adivinan tus compañeros.",
  clueBlocked: "Elige otra pista",
  tryAgain: "No se pudo. Intenta de nuevo.",
  foundLabel: "Encontradas",
  cardLabel: (n) => `Carta ${n}`,
  needBothTeams: "Cada equipo necesita al menos un jugador",
  yourTeamLeft: "Tu equipo se quedó sin jugadores",
  idleTitle: "Partido terminado: sin jugadas",
  idleText: "Nadie jugó durante cuatro turnos seguidos, así que el partido terminó sin ganador.",
  cardsLeftTitle: "Cartas restantes",
  answersLater: "Todas las cartas, el resto de las pistas y las razones aparecen aquí cuando cierre el tablero de hoy.",
  staleNotes: {
    confirmAgain: "El tablero cambió en otra pestaña. Tu carta no se jugó: tócala otra vez para confirmar.",
    notSent: "Tu carta no se jugó. Tócala otra vez para confirmar.",
    clueChanged: "La pista cambió en otra pestaña, así que tu carta no se jugó. Elige de nuevo.",
    cardTaken: "Esa carta ya se giró en otra pestaña.",
    finished: "Esta partida terminó en otra pestaña.",
    stopAgain: "El tablero cambió en otra pestaña. Pulsa «Ya está» otra vez para terminar esta pista.",
  },
};

const tr: CodenamesCopy = {
  brand: ["Futbol", "Codenames"],
  tag: "Resimli ipuçları",
  lines: [
    "20 resimli kart. 8'i senin, 7'si rakibin, 4'ü nötr, biri Kendi Kalesine Gol.",
    "Gözlemci bir futbol ipucu ve bir sayı verir: “Ferguson · 2”, “Real Madrid · 3” ya da “Tanrı'nın Eli · 1” gibi. İşaret ettiği kartları bul.",
    "Bot 3 ipucu verir. Her biri için sayısının 1 fazlasına kadar kart çevirebilirsin: seçmek için karta dokun, çevirmek için tekrar dokun.",
    "Doğru kart ipucunu sürdürür. Rakip ya da nötr kart bitirir. Kendi Kalesine Gol oyunu bitirir.",
  ],
  kinds: { mine: "Bizim", theirs: "Rakip", neutral: "Nötr", owngoal: "Kendi Kalesine" },
  yourTeam: "Takımın",
  rivalTeam: "Rakip",
  scout: "Gözlemci",
  left: (n) => `${n} kaldı`,
  clue: "İpucu",
  guessesLeft: (n) => `${n} tahmin hakkı`,
  flip: "Çevir",
  stop: "Bu kadar",
  endTurn: "Sırayı bitir",
  giveClue: "İpucu ver",
  cluePlaceholder: "Bir futbol ipucu yaz…",
  clueProblems: { empty: "Bir ipucu yaz", words: "En fazla 4 kelime", long: "Çok uzun" },
  clueRule: "Sadece futbol: oyuncu, kulüp, teknik direktör, stadyum, ülke ya da ünlü bir an. Örn. Mourinho, Real Madrid, Tanrı'nın Eli.",
  nameKinds: { player: "Oyuncu", manager: "Teknik direktör", club: "Kulüp", nation: "Milli takım", stadium: "Stadyum", word: "Futbol sözü" },
  clueUsed: "Bu maçta zaten kullanıldı",
  words: { placeholder: "Bir ipucu yaz…", rule: "Herhangi bir kelime ya da isim ve kaç kartı bağladığı. Tahtadaki bir kelime ya da onun parçası olamaz.", onBoard: (word) => `${word} tahtada var`, onBoardAny: "Bu ipucu tahtadaki bir kelime ya da onun parçası", scoutKeyNote: "Renkleri yalnızca Gözlemciler görür. Yeşil kelimelerini bağlayan tek bir ipucu ver.", tag: "Kelime ipuçları", lines: [
      "25 futbol kelimesi, her birinin ikinci bir anlamı var. 9'u senin, 8'i rakibin, 7'si nötr, biri Kendi Kalesine Gol.",
      "Gözlemci kelimelerini tek bir ipucu ve bir sayıyla bağlar: KALE ve TAÇ için “Kral · 2” gibi.",
      "Bot en fazla 4 ipucu verir. Her biri için sayısının 1 fazlasına kadar kart çevirebilirsin: seçmek için karta dokun, çevirmek için tekrar dokun.",
      "Doğru kart ipucunu sürdürür. Rakip ya da nötr kart bitirir. Kendi Kalesine Gol oyunu bitirir.",
    ], starts: "başlar · 9 kart", otherCards: "8 kart", wordsIn: "Türkçe kelimeler", practiceTag: "Antrenman · her seferinde yeni tahta", newBoard: "Yeni tahta", unavailable: "Bu dilde kelime tahtaları henüz hazır değil. Daha sonra tekrar dene.", endComplete: "9'u da bulundu!" },
  board: { label: "Tahta", pictures: "Resimler", words: "Kelimeler", picturesNote: "20 futbol resmi", wordsNote: "İki anlamlı 25 kelime", hostPicks: "Tahtayı oda sahibi seçer." },
  number: "Kart",
  youAreScout: "Gözlemci sensin",
  scoutKeyNote: "Renkleri sadece Gözlemciler görür. Yeşil kartlarını bağlayan bir futbol ipucu ver.",
  yourScoutThinking: (name) => `${name} ipucu düşünüyor…`,
  rivalScoutThinking: (name) => `Rakip Gözlemci ${name} düşünüyor…`,
  yourTurn: "Sıra takımında",
  rivalGuessing: "Rakip takım tahmin ediyor",
  teamsTitle: "Takımını seç",
  teamsNote: "Gözlemci (hangi kartın kimin olduğunu görür) ya da tahminci olarak bir taraf seç.",
  home: "Ev sahibi",
  away: "Deplasman",
  guessers: "Tahminciler",
  noScout: "Gözlemci yok",
  noTeam: "Henüz takımda değil",
  joinScout: "Gözlemci ol",
  joinGuesser: "Tahminci ol",
  otherCards: "7 kart",
  shuffle: "Takımları karıştır",
  kickOff: "Başla",
  waitingHost: "Oda sahibinin başlatması bekleniyor",
  needScouts: "Gözlemcisi olmayan takımlara Bot Gözlemci gelir",
  starts: "başlar · 8 kart",
  youWon: "Kazandın!",
  youLost: "Kaybettin",
  cleared: "Tüm kartlar bulundu",
  ownGoalBy: (mine) => (mine ? "Takımın Kendi Kalesine Gol kartını çevirdi" : "Rakip Kendi Kalesine Gol kartını çevirdi"),
  rivalLeft: "Rakip takım ayrıldı",
  history: "İpuçları",
  backToRoom: "Odaya dön",
  leave: "Ayrıl",
  found: (n, total) => `${n}/${total} bulundu`,
  clueOf: (i, n) => `İpucu ${i}/${n}`,
  endComplete: "8'i de bulundu!",
  endOwnGoal: "Kendi Kalesine Gol!",
  endClues: "İpucu kalmadı",
  why: "Neden",
  seeResult: "Sonucu gör",
  shareText: (number, found, total, grid) => `Futbol Codenames #${number} · ${found}/${total}\n${grid}`,
  botScout: "Bot Gözlemci",
  botScoutNote: "Gözlemcisi olmayan takıma Bot Gözlemci gelir. Tek başınaysan sen tahmin edersin, ipuçlarını bot verir.",
  passed: "Gözlemci pas geçti",
  sawKeyNote: "Anahtarı gördün; tahminleri takım arkadaşların yapar.",
  clueBlocked: "Başka bir ipucu seç",
  tryAgain: "Olmadı. Tekrar dene.",
  foundLabel: "Bulunan",
  cardLabel: (n) => `Kart ${n}`,
  needBothTeams: "İki takımda da en az bir oyuncu olmalı",
  yourTeamLeft: "Takımında oyuncu kalmadı",
  idleTitle: "Oyun bitti: hamle yok",
  idleText: "Dört tur üst üste kimse oynamadı, bu yüzden oyun kazanansız bitti.",
  cardsLeftTitle: "Kalan kartlar",
  answersLater: "Tüm kartlar, kalan ipuçları ve nedenleri bugünün oyunu kapanınca burada görünecek.",
  staleNotes: {
    confirmAgain: "Oyun alanı başka bir sekmede değişti. Seçtiğin kart açılmadı: onaylamak için ona tekrar dokun.",
    notSent: "Seçtiğin kart açılmadı. Onaylamak için ona tekrar dokun.",
    clueChanged: "İpucu başka bir sekmede değişti, bu yüzden seçtiğin kart açılmadı. Yeniden seç.",
    cardTaken: "Bu kart başka bir sekmede zaten çevrildi.",
    finished: "Bu oyun başka bir sekmede tamamlandı.",
    stopAgain: "Oyun alanı başka bir sekmede değişti. Bu ipucunu bitirmek için yeniden \"Bu kadar\" düğmesine bas.",
  },
};

const ru: CodenamesCopy = {
  brand: ["Кодовые имена:", "футбол"],
  tag: "Подсказки-картинки",
  lines: [
    "20 карточек с картинками. 8 твоих, 7 соперника, 4 нейтральные и одна — Автогол.",
    "Скаут даёт одну футбольную подсказку и число: «Фергюсон · 2», «Реал Мадрид · 3» или «Рука Бога · 1». Найди карточки, на которые она указывает.",
    "Бот даёт 3 подсказки. На каждую можно открыть до её числа + 1 карт: нажми на карту, чтобы выбрать, и ещё раз, чтобы открыть.",
    "Верная карточка продлевает подсказку. Чужая или нейтральная — заканчивает её. Автогол заканчивает игру.",
  ],
  kinds: { mine: "Наша", theirs: "Соперник", neutral: "Нейтральная", owngoal: "Автогол" },
  yourTeam: "Твоя команда",
  rivalTeam: "Соперник",
  scout: "Скаут",
  left: (n) => `осталось ${n}`,
  clue: "Подсказка",
  guessesLeft: (n) => `попыток: ${n}`,
  flip: "Открыть",
  stop: "Хватит",
  endTurn: "Закончить ход",
  giveClue: "Дать подсказку",
  cluePlaceholder: "Напиши футбольную подсказку…",
  clueProblems: { empty: "Напиши подсказку", words: "Не больше 4 слов", long: "Слишком длинно" },
  clueRule: "Только футбол: игрок, клуб, тренер, стадион, сборная или известный момент. Например: Моуриньо, Реал Мадрид, Рука Бога.",
  nameKinds: { player: "Игрок", manager: "Тренер", club: "Клуб", nation: "Сборная", stadium: "Стадион", word: "Футбольное слово" },
  clueUsed: "Уже было в этой игре",
  words: { placeholder: "Введи подсказку…", rule: "Любое слово или имя и сколько карточек оно связывает. Нельзя слово с поля или его часть.", onBoard: (word) => `${word} есть на поле`, onBoardAny: "Эта подсказка — слово с поля или его часть", scoutKeyNote: "Цвета видят только Скауты. Дай одну подсказку, которая связывает твои зелёные слова.", tag: "Подсказки-слова", lines: [
      "25 футбольных слов, у каждого есть второе значение. 9 твоих, 8 соперника, 7 нейтральных и одно — Автогол.",
      "Скаут связывает твои слова одной подсказкой и числом: «Спортзал · 2» для ШТАНГА и СКАМЕЙКА.",
      "Бот даёт до 4 подсказок. На каждую можно открыть до её числа + 1 карт: нажми на карту, чтобы выбрать, и ещё раз, чтобы открыть.",
      "Верная карточка продлевает подсказку. Чужая или нейтральная — заканчивает её. Автогол заканчивает игру.",
    ], starts: "начинает · 9 карт", otherCards: "8 карт", wordsIn: "Слова на русском", practiceTag: "Тренировка · каждый раз новое поле", newBoard: "Новое поле", unavailable: "Поля со словами на этом языке ещё не готовы. Попробуй позже.", endComplete: "Все 9!" },
  board: { label: "Поле", pictures: "Картинки", words: "Слова", picturesNote: "20 футбольных картинок", wordsNote: "25 слов с двойным смыслом", hostPicks: "Поле выбирает хозяин комнаты." },
  number: "Карт",
  youAreScout: "Ты — Скаут",
  scoutKeyNote: "Цвета видят только Скауты. Дай одну футбольную подсказку, которая связывает твои зелёные карточки.",
  yourScoutThinking: (name) => `${name} придумывает подсказку…`,
  rivalScoutThinking: (name) => `Скаут соперника ${name} думает…`,
  yourTurn: "Ход твоей команды",
  rivalGuessing: "Соперник угадывает",
  teamsTitle: "Выбери команду",
  teamsNote: "Выбери команду: Скаут (видит, чья карта) или угадывающий.",
  home: "Хозяева",
  away: "Гости",
  guessers: "Отгадчики",
  noScout: "Скаута нет",
  noTeam: "Пока без команды",
  joinScout: "Стать Скаутом",
  joinGuesser: "Отгадывать",
  otherCards: "7 карт",
  shuffle: "Перемешать команды",
  kickOff: "Начать",
  waitingHost: "Ждём, когда хозяин начнёт",
  needScouts: "Командам без Скаута подсказывает бот",
  starts: "начинает · 8 карт",
  youWon: "Победа!",
  youLost: "Поражение",
  cleared: "Все карточки найдены",
  ownGoalBy: (mine) => (mine ? "Твоя команда открыла Автогол" : "Соперник открыл Автогол"),
  rivalLeft: "Команда соперника ушла",
  history: "Подсказки",
  backToRoom: "Вернуться в комнату",
  leave: "Выйти",
  found: (n, total) => `найдено ${n}/${total}`,
  clueOf: (i, n) => `Подсказка ${i} из ${n}`,
  endComplete: "Все 8!",
  endOwnGoal: "Автогол!",
  endClues: "Подсказки закончились",
  why: "Почему",
  seeResult: "Результат",
  shareText: (number, found, total, grid) => `Кодовые имена: футбол #${number} · ${found}/${total}\n${grid}`,
  botScout: "Бот-Скаут",
  botScoutNote: "Если в команде нет Скаута, подсказки даёт бот. Если ты один — угадываешь ты, а подсказывает бот.",
  passed: "Скаут пропустил ход",
  sawKeyNote: "Ты видел ключ, поэтому угадывают твои партнёры.",
  clueBlocked: "Выбери другую подсказку",
  tryAgain: "Не получилось. Попробуй ещё раз.",
  foundLabel: "Найдено",
  cardLabel: (n) => `Карта ${n}`,
  needBothTeams: "В каждой команде нужен хотя бы один игрок",
  yourTeamLeft: "В твоей команде не осталось игроков",
  idleTitle: "Игра окончена: нет ходов",
  idleText: "Никто не ходил четыре хода подряд, поэтому игра закончилась без победителя.",
  cardsLeftTitle: "Осталось карточек",
  answersLater: "Все карточки, остальные подсказки и объяснения появятся здесь, когда сегодняшнее поле закроется.",
  staleNotes: {
    confirmAgain: "Поле изменилось в другой вкладке. Карточка не была открыта: нажми на неё ещё раз, чтобы подтвердить.",
    notSent: "Карточка не была открыта. Нажми на неё ещё раз, чтобы подтвердить.",
    clueChanged: "В другой вкладке сменилась подсказка, поэтому карточка не была открыта. Выбери заново.",
    cardTaken: "Эту карточку уже открыли в другой вкладке.",
    finished: "Эта партия уже завершена в другой вкладке.",
    stopAgain: "Поле изменилось в другой вкладке. Нажми «Хватит» ещё раз, чтобы закончить эту подсказку.",
  },
};

const ka: CodenamesCopy = {
  brand: ["ფეხბურთის", "Codenames"],
  tag: "სურათიანი მინიშნებები",
  lines: [
    "20 სურათიანი ბარათი. 8 შენია, 7 მეტოქის, 4 ნეიტრალური და ერთი ავტოგოლია.",
    "სკაუტი ასახელებს ერთ საფეხბურთო მინიშნებას და რიცხვს: „ფერგიუსონი · 2“, „რეალ მადრიდი · 3“ ან „ღმერთის ხელი · 1“. იპოვე ბარათები, რომლებზეც ის მიანიშნებს.",
    "ბოტი იძლევა 3 მინიშნებას. თითოეულზე შეგიძლია გადააბრუნო მის რიცხვს + 1 ბარათამდე: შეეხე ბარათს ასარჩევად და კიდევ ერთხელ გადასაბრუნებლად.",
    "სწორი ბარათი მინიშნებას აგრძელებს. მეტოქის ან ნეიტრალური ამთავრებს. ავტოგოლი თამაშს ამთავრებს.",
  ],
  kinds: { mine: "ჩვენი", theirs: "მეტოქის", neutral: "ნეიტრალური", owngoal: "ავტოგოლი" },
  yourTeam: "შენი გუნდი",
  rivalTeam: "მეტოქე",
  scout: "სკაუტი",
  left: (n) => `დარჩა ${n}`,
  clue: "მინიშნება",
  guessesLeft: (n) => `დარჩა ${n} ცდა`,
  flip: "გახსნა",
  stop: "საკმარისია",
  endTurn: "სვლის დასრულება",
  giveClue: "მინიშნების მიცემა",
  cluePlaceholder: "ჩაწერე საფეხბურთო მინიშნება…",
  clueProblems: { empty: "ჩაწერე მინიშნება", words: "მაქსიმუმ 4 სიტყვა", long: "ძალიან გრძელია" },
  clueRule: "მხოლოდ ფეხბურთი: მოთამაშე, კლუბი, მწვრთნელი, სტადიონი, ნაკრები ან ცნობილი მომენტი. მაგ.: მოურინიო, რეალ მადრიდი, ღმერთის ხელი.",
  nameKinds: { player: "მოთამაშე", manager: "მწვრთნელი", club: "კლუბი", nation: "ნაკრები", stadium: "სტადიონი", word: "საფეხბურთო სიტყვა" },
  clueUsed: "ამ თამაშში უკვე იყო",
  words: { placeholder: "ჩაწერე მინიშნება…", rule: "ნებისმიერი სიტყვა ან სახელი და რამდენ ბარათს აკავშირებს. არ შეიძლება დაფაზე არსებული სიტყვა ან მისი ნაწილი.", onBoard: (word) => `${word} დაფაზეა`, onBoardAny: "ეს მინიშნება დაფაზე არსებული სიტყვაა ან მისი ნაწილი", scoutKeyNote: "ფერებს მხოლოდ სკაუტები ხედავენ. მიეცი ერთი მინიშნება, რომელიც შენს მწვანე სიტყვებს აკავშირებს.", tag: "სიტყვიერი მინიშნებები", lines: [
      "25 საფეხბურთო სიტყვა, თითოეულს მეორე მნიშვნელობაც აქვს. 9 შენია, 8 მეტოქის, 7 ნეიტრალური და ერთი ავტოგოლია.",
      "სკაუტი შენს სიტყვებს ერთი მინიშნებითა და რიცხვით აკავშირებს: მაგალითად „სახლი · 2“ — კარი და კედელი.",
      "ბოტი იძლევა 4-მდე მინიშნებას. თითოეულზე შეგიძლია გადააბრუნო მის რიცხვს + 1 ბარათამდე: შეეხე ბარათს ასარჩევად და კიდევ ერთხელ გადასაბრუნებლად.",
      "სწორი ბარათი მინიშნებას აგრძელებს. მეტოქის ან ნეიტრალური ამთავრებს. ავტოგოლი თამაშს ამთავრებს.",
    ], starts: "იწყებს · 9 ბარათი", otherCards: "8 ბარათი", wordsIn: "სიტყვები ქართულად", practiceTag: "ვარჯიში · ყოველ ჯერზე ახალი დაფა", newBoard: "ახალი დაფა", unavailable: "ამ ენაზე სიტყვიანი დაფები ჯერ მზად არ არის. სცადე მოგვიანებით.", endComplete: "9-ივე ნაპოვნია!" },
  board: { label: "დაფა", pictures: "სურათები", words: "სიტყვები", picturesNote: "20 საფეხბურთო სურათი", wordsNote: "25 ორმნიშვნელოვანი სიტყვა", hostPicks: "დაფას ოთახის მასპინძელი ირჩევს." },
  number: "ბარათი",
  youAreScout: "შენ ხარ სკაუტი",
  scoutKeyNote: "ფერებს მხოლოდ სკაუტები ხედავენ. მოიფიქრე ერთი საფეხბურთო მინიშნება, რომელიც შენს მწვანე ბარათებს აკავშირებს.",
  yourScoutThinking: (name) => `${name} მინიშნებას ფიქრობს…`,
  rivalScoutThinking: (name) => `მეტოქის სკაუტი ${name} ფიქრობს…`,
  yourTurn: "შენი გუნდის სვლაა",
  rivalGuessing: "მეტოქე გამოიცნობს",
  teamsTitle: "აირჩიე გუნდი",
  teamsNote: "აირჩიე მხარე, როგორც სკაუტი (ხედავს, ვისია ბარათი) ან გამომცნობი.",
  home: "მასპინძელი",
  away: "სტუმარი",
  guessers: "გამომცნობები",
  noScout: "სკაუტი ჯერ არაა",
  noTeam: "ჯერ გუნდში არ არის",
  joinScout: "გახდი სკაუტი",
  joinGuesser: "გამოცნობა",
  otherCards: "7 ბარათი",
  shuffle: "გუნდების არევა",
  kickOff: "დაწყება",
  waitingHost: "ველოდებით, როდის დაიწყებს მასპინძელი",
  needScouts: "სკაუტის გარეშე გუნდებს ბოტი სკაუტი ეხმარება",
  starts: "იწყებს · 8 ბარათი",
  youWon: "მოიგე!",
  youLost: "წააგე",
  cleared: "ყველა ბარათი ნაპოვნია",
  ownGoalBy: (mine) => (mine ? "შენმა გუნდმა ავტოგოლი გახსნა" : "მეტოქემ ავტოგოლი გახსნა"),
  rivalLeft: "მეტოქე გუნდი წავიდა",
  history: "მინიშნებები",
  backToRoom: "ოთახში დაბრუნება",
  leave: "გასვლა",
  found: (n, total) => `ნაპოვნია ${n}/${total}`,
  clueOf: (i, n) => `მინიშნება ${i} / ${n}`,
  endComplete: "8-ივე ნაპოვნია!",
  endOwnGoal: "ავტოგოლი!",
  endClues: "მინიშნებები დასრულდა",
  why: "რატომ",
  seeResult: "შედეგი",
  shareText: (number, found, total, grid) => `ფეხბურთის Codenames #${number} · ${found}/${total}\n${grid}`,
  botScout: "ბოტი სკაუტი",
  botScoutNote: "გუნდს სკაუტის გარეშე ბოტი სკაუტი ეხმარება. მარტო თუ ხარ, შენ გამოიცნობ, მინიშნებებს ბოტი იძლევა.",
  passed: "სკაუტმა სვლა გამოტოვა",
  sawKeyNote: "გასაღები ნახე, ამიტომ გამოცნობს შენი თანაგუნდელები.",
  clueBlocked: "აირჩიე სხვა მინიშნება",
  tryAgain: "ვერ მოხერხდა. სცადე თავიდან.",
  foundLabel: "ნაპოვნი",
  cardLabel: (n) => `ბარათი ${n}`,
  needBothTeams: "ორივე გუნდს სჭირდება მინიმუმ ერთი მოთამაშე",
  yourTeamLeft: "შენს გუნდს მოთამაშეები აღარ დარჩა",
  idleTitle: "თამაში დასრულდა: სვლები არ არის",
  idleText: "ოთხი სვლის განმავლობაში არავინ ითამაშა, ამიტომ თამაში გამარჯვებულის გარეშე დასრულდა.",
  cardsLeftTitle: "დარჩენილი ბარათები",
  answersLater: "ყველა ბარათი, დანარჩენი მინიშნებები და ახსნები აქ გამოჩნდება, როცა დღევანდელი დაფა დაიხურება.",
  staleNotes: {
    confirmAgain: "დაფა სხვა ჩანართში შეიცვალა. ბარათი არ გახსნილა: დასადასტურებლად ისევ შეეხე მას.",
    notSent: "ბარათი არ გახსნილა. დასადასტურებლად ისევ შეეხე მას.",
    clueChanged: "მინიშნება სხვა ჩანართში შეიცვალა, ამიტომ ბარათი არ გახსნილა. ხელახლა აირჩიე.",
    cardTaken: "ეს ბარათი სხვა ჩანართში უკვე გადაბრუნდა.",
    finished: "ეს თამაში სხვა ჩანართში უკვე დასრულდა.",
    stopAgain: "დაფა სხვა ჩანართში შეიცვალა. ამ მინიშნების დასასრულებლად ისევ დააჭირე „საკმარისია“.",
  },
};

const COPY: Record<string, CodenamesCopy> = { en, es, tr, ru, ka };

export const codenamesCopy = (locale: string): CodenamesCopy => COPY[locale] ?? en;
