/** Copy of the word games' screens (played for both, name chain). The lobby and SEO pages keep their own strings. */
export type WordLocale = "tr" | "en" | "es" | "ka";
export const asWordLocale = (locale: string): WordLocale => (locale === "tr" || locale === "es" || locale === "ka" ? locale : "en");

const ordinalEn = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

const shared = {
  tr: {
    exit: "Çık", you: "Sen", rival: "Rakip", placeholder: "Futbolcu yaz", say: "Gönder", won: "Maçı kazandın!", lost: "Maçı kaybettin", draw: "Berabere",
    youWon: "Kazandın!", tieFirst: "Birincilik paylaşıldı!", youPlace: (n: number) => `${n}. oldun`, left: "Ayrıldı", away: "Bağlantı yok", backToRoom: "Odaya dön",
    rivalLeft: "Rakip ayrıldı.", offline: "Bağlantı yok: yeniden bağlanılıyor…", leave: "Maçtan çık", leaveConfirm: "Maçtan çıkılsın mı? Geri dönemezsin.", leaveYes: "Çık", leaveNo: "Devam et",
    iWasRight: "Doğru yazdım", reported: "Teşekkürler, inceleyeceğiz.", startsIn: "Başlıyor",
  },
  en: {
    exit: "Exit", you: "You", rival: "Rival", placeholder: "Type a footballer", say: "Send", won: "You won the match!", lost: "You lost the match", draw: "Draw",
    youWon: "You won!", tieFirst: "First place shared!", youPlace: (n: number) => `You finished ${ordinalEn(n)}`, left: "Left", away: "Disconnected", backToRoom: "Back to the room",
    rivalLeft: "Your rival left.", offline: "No connection: reconnecting…", leave: "Leave the match", leaveConfirm: "Leave the match? You will not be able to come back.", leaveYes: "Leave", leaveNo: "Keep playing",
    iWasRight: "I was right", reported: "Thanks, we will check it.", startsIn: "Starting",
  },
  es: {
    exit: "Salir", you: "Vos", rival: "Rival", placeholder: "Escribí un futbolista", say: "Enviar", won: "¡Ganaste el partido!", lost: "Perdiste el partido", draw: "Empate",
    youWon: "¡Ganaste!", tieFirst: "¡Empate en el primer puesto!", youPlace: (n: number) => `Quedaste ${n}º`, left: "Se fue", away: "Desconectado", backToRoom: "Volver a la sala",
    rivalLeft: "Tu rival se fue.", offline: "Sin conexión: reconectando…", leave: "Salir del partido", leaveConfirm: "¿Salir del partido? No vas a poder volver a entrar.", leaveYes: "Salir", leaveNo: "Seguir jugando",
    iWasRight: "Lo escribí bien", reported: "Gracias, lo vamos a revisar.", startsIn: "Empieza",
  },
  ka: {
    exit: "გასვლა", you: "შენ", rival: "მეტოქე", placeholder: "დაწერე ფეხბურთელი", say: "გაგზავნა", won: "მატჩი მოიგე!", lost: "მატჩი წააგე", draw: "ფრე",
    youWon: "მოიგე!", tieFirst: "პირველი ადგილი გაიყო!", youPlace: (n: number) => `${n}-ე ადგილზე გახვედი`, left: "გავიდა", away: "კავშირი არ არის", backToRoom: "ოთახში დაბრუნება",
    rivalLeft: "მეტოქე გავიდა.", offline: "კავშირი არ არის: ხელახლა ვუკავშირდებით…", leave: "მატჩიდან გასვლა", leaveConfirm: "გახვიდე მატჩიდან? ვეღარ დაბრუნდები.", leaveYes: "გასვლა", leaveNo: "თამაშის გაგრძელება",
    iWasRight: "სწორად დავწერე", reported: "მადლობა, გადავამოწმებთ.", startsIn: "იწყება",
  },
} as const;

const sharedPlayer = {
  tr: {
    brand: ["ORTAK", "FUTBOLCU"] as const,
    rules: ["İki kulüp aynı anda açılır.", "İkisinde de oynamış bir futbolcuyu yaz. Kiralık dönemler sayılır.", "Yanlış cevap seni 1 saniye bekletir."],
    duelRule: "İlk doğru cevap puanı alır. 3 puana ilk ulaşan kazanır.", partyRule: "8 tur. İlk doğru cevap 3, ikinci 2, diğer doğru cevaplar 1 puan.",
    prompt: "İkisinde de oynamış bir futbolcu yaz", round: (n: number, of: number) => `${n}. tur / ${of}`, roundOpen: (n: number) => `${n}. tur`,
    wrong: (text: string) => `“${text}” ikisinde de oynamadı`, locked: (s: number) => `Yanlış! ${s} sn bekle`, got: (name: string) => `${name} doğru!`,
    waitRival: "Cevabın kilitlendi…", lockedIn: "Cevabın alındı. Diğerleri bekleniyor…", sending: "Gönderiliyor…",
    pointYou: "Puan senin!", pointRival: "Puan rakibin", pointBoth: "Puan paylaşıldı", nobody: "Kimse bulamadı",
    answers: (n: number) => `Doğru cevaplar (${n})`, more: (n: number) => `+${n} futbolcu daha`, next: "Sıradaki eşleşme geliyor…",
    answeredCount: (n: number, of: number) => `${n}/${of} oyuncu buldu`, firstWas: (name: string) => `İlk bilen: ${name}`, youFirst: "İlk sen bildin!", noAnswer: "bulamadı",
    foundStat: "Bulunan", foundDetail: (n: number, of: number) => `${of} eşleşmenin ${n} tanesi`, summary: "Eşleşmeler",
  },
  en: {
    brand: ["PLAYED FOR", "BOTH"] as const,
    rules: ["Two clubs are revealed at the same moment.", "Type a footballer who played for both. Loans count.", "A wrong answer blocks you for 1 second."],
    duelRule: "The first right answer takes the point. First to 3 points wins.", partyRule: "8 rounds. First right answer 3 points, second 2, any other right answer 1.",
    prompt: "Type a footballer who played for both", round: (n: number, of: number) => `Round ${n} / ${of}`, roundOpen: (n: number) => `Round ${n}`,
    wrong: (text: string) => `“${text}” did not play for both`, locked: (s: number) => `Wrong! Wait ${s} s`, got: (name: string) => `${name} is right!`,
    waitRival: "Your answer is locked in…", lockedIn: "Your answer is in. Waiting for the others…", sending: "Sending…",
    pointYou: "Point to you!", pointRival: "Point to your rival", pointBoth: "Point shared", nobody: "Nobody found one",
    answers: (n: number) => `Valid answers (${n})`, more: (n: number) => `+${n} more`, next: "Next pair coming…",
    answeredCount: (n: number, of: number) => `${n}/${of} players found one`, firstWas: (name: string) => `First to find one: ${name}`, youFirst: "You were first!", noAnswer: "no answer",
    foundStat: "Found", foundDetail: (n: number, of: number) => `${n} of ${of} pairs`, summary: "Pairs",
  },
  es: {
    brand: ["JUGADOR EN", "COMÚN"] as const,
    rules: ["Dos clubes aparecen al mismo tiempo.", "Escribí un futbolista que jugó en los dos. Las cesiones cuentan.", "Una respuesta incorrecta te frena 1 segundo."],
    duelRule: "La primera respuesta correcta se lleva el punto. Gana el primero en llegar a 3.", partyRule: "8 rondas. La primera respuesta correcta vale 3 puntos, la segunda 2 y las demás 1.",
    prompt: "Escribí un futbolista que jugó en los dos", round: (n: number, of: number) => `Ronda ${n} / ${of}`, roundOpen: (n: number) => `Ronda ${n}`,
    wrong: (text: string) => `“${text}” no jugó en los dos`, locked: (s: number) => `¡Incorrecto! Esperá ${s} s`, got: (name: string) => `¡${name} es correcto!`,
    waitRival: "Tu respuesta quedó registrada…", lockedIn: "Tu respuesta está registrada. Esperando a los demás…", sending: "Enviando…",
    pointYou: "¡Punto para vos!", pointRival: "Punto para tu rival", pointBoth: "Punto compartido", nobody: "Nadie lo encontró",
    answers: (n: number) => `Respuestas válidas (${n})`, more: (n: number) => `+${n} más`, next: "Viene el siguiente par…",
    answeredCount: (n: number, of: number) => `${n}/${of} jugadores lo encontraron`, firstWas: (name: string) => `El primero: ${name}`, youFirst: "¡Fuiste el primero!", noAnswer: "sin respuesta",
    foundStat: "Encontrados", foundDetail: (n: number, of: number) => `${n} de ${of} pares`, summary: "Pares",
  },
  ka: {
    brand: ["საერთო", "ფეხბურთელი"] as const,
    rules: ["ორი კლუბი ერთდროულად ჩნდება.", "დაწერე ფეხბურთელი, რომელმაც ორივეში ითამაშა. იჯარაც ითვლება.", "არასწორი პასუხი 1 წამით გაჩერებს."],
    duelRule: "პირველი სწორი პასუხი იღებს ქულას. იგებს ის, ვინც პირველი დააგროვებს 3-ს.", partyRule: "8 რაუნდი. პირველი სწორი პასუხი 3 ქულა, მეორე 2, დანარჩენი სწორი პასუხები 1.",
    prompt: "დაწერე ფეხბურთელი, რომელმაც ორივეში ითამაშა", round: (n: number, of: number) => `რაუნდი ${n} / ${of}`, roundOpen: (n: number) => `რაუნდი ${n}`,
    wrong: (text: string) => `„${text}“ ორივეში არ უთამაშია`, locked: (s: number) => `არასწორია! დაელოდე ${s} წმ`, got: (name: string) => `${name} სწორია!`,
    waitRival: "შენი პასუხი მიღებულია…", lockedIn: "შენი პასუხი მიღებულია. ველოდებით დანარჩენებს…", sending: "იგზავნება…",
    pointYou: "ქულა შენია!", pointRival: "ქულა მეტოქისაა", pointBoth: "ქულა გაიყო", nobody: "ვერავინ იპოვა",
    answers: (n: number) => `სწორი პასუხები (${n})`, more: (n: number) => `+${n} სხვა`, next: "შემდეგი წყვილი მოდის…",
    answeredCount: (n: number, of: number) => `${n}/${of} მოთამაშემ იპოვა`, firstWas: (name: string) => `პირველი: ${name}`, youFirst: "პირველი შენ იყავი!", noAnswer: "ვერ იპოვა",
    foundStat: "ნაპოვნი", foundDetail: (n: number, of: number) => `${of} წყვილიდან ${n}`, summary: "წყვილები",
  },
} as const;

const nameChain = {
  tr: {
    brand: ["SON", "HARFLE"] as const,
    yourTurn: (letter: string) => `Senin sıran: ${letter} ile başlayan bir futbolcu`, seatTurn: (name: string, letter: string) => `${name} yazıyor: ${letter} harfi`,
    nextLetter: "Sıradaki harf", round: (n: number) => `${n}. tur`, supplied: "Oyun verdi", fresh: "O harfle kimse kalmadı, yeni isim verildi.",
    unknown: (text: string) => `“${text}” listede yok, tekrar dene`, letter: (name: string, starts: string, need: string) => `${name} ${starts} ile başlıyor, ${need} lazım`, repeat: (name: string) => `${name} zaten söylendi`,
    roundWon: "Tur senin!", roundLost: "Turu kaybettin", time: "Süre doldu", passed: "Pes edildi", leftTurn: "Oyundan ayrıldı", giveUp: "Pes et",
    could: (letter: string) => `${letter} ile söylenebilecekler`, nextRound: "Sıradaki tur başlıyor…", waiting: "Rakibin yazıyor…", sending: "Gönderiliyor…",
    out: "Elendi", youOut: "Bu turda elendin. Sıradaki turu bekle.", knocked: (name: string) => `${name} elendi`, roundTo: (name: string) => `Turu ${name} aldı`, lastStanding: "Ayakta kalan son oyuncu",
    answersStat: "Cevap", answersDetail: (n: number) => `${n} doğru cevap`, chainTitle: "Zincir",
  },
  en: {
    brand: ["NAME", "CHAIN"] as const,
    yourTurn: (letter: string) => `Your turn: a footballer starting with ${letter}`, seatTurn: (name: string, letter: string) => `${name} is typing: letter ${letter}`,
    nextLetter: "Next letter", round: (n: number) => `Round ${n}`, supplied: "Given by the game", fresh: "Nobody was left on that letter, so the game gave a new name.",
    unknown: (text: string) => `“${text}” is not in the list, try again`, letter: (name: string, starts: string, need: string) => `${name} starts with ${starts}, you need ${need}`, repeat: (name: string) => `${name} was already used`,
    roundWon: "Round to you!", roundLost: "You lost the round", time: "Time ran out", passed: "Gave up", leftTurn: "Left the match", giveUp: "Give up",
    could: (letter: string) => `Names that start with ${letter}`, nextRound: "Next round starting…", waiting: "Your rival is typing…", sending: "Sending…",
    out: "Out", youOut: "You are out of this round. Wait for the next one.", knocked: (name: string) => `${name} is out`, roundTo: (name: string) => `${name} took the round`, lastStanding: "Last player standing",
    answersStat: "Answers", answersDetail: (n: number) => `${n} right answer${n === 1 ? "" : "s"}`, chainTitle: "Chain",
  },
  es: {
    brand: ["CADENA DE", "FUTBOLISTAS"] as const,
    yourTurn: (letter: string) => `Tu turno: un futbolista que empiece con ${letter}`, seatTurn: (name: string, letter: string) => `${name} está escribiendo: letra ${letter}`,
    nextLetter: "Siguiente letra", round: (n: number) => `Ronda ${n}`, supplied: "Lo dio el juego", fresh: "No quedaba nadie con esa letra: el juego dio un nombre nuevo.",
    unknown: (text: string) => `“${text}” no está en la lista, probá otra vez`, letter: (name: string, starts: string, need: string) => `${name} empieza con ${starts}, necesitás ${need}`, repeat: (name: string) => `${name} ya se dijo`,
    roundWon: "¡La ronda es tuya!", roundLost: "Perdiste la ronda", time: "Se acabó el tiempo", passed: "Se rindió", leftTurn: "Salió del partido", giveUp: "Rendirse",
    could: (letter: string) => `Nombres que empiezan con ${letter}`, nextRound: "Empieza la siguiente ronda…", waiting: "Tu rival está escribiendo…", sending: "Enviando…",
    out: "Fuera", youOut: "Quedaste fuera de esta ronda. Esperá la siguiente.", knocked: (name: string) => `${name} quedó fuera`, roundTo: (name: string) => `${name} se llevó la ronda`, lastStanding: "El último en pie",
    answersStat: "Respuestas", answersDetail: (n: number) => `${n} ${n === 1 ? "respuesta correcta" : "respuestas correctas"}`, chainTitle: "Cadena",
  },
  ka: {
    brand: ["ბოლო", "ასოთი"] as const,
    yourTurn: (letter: string) => `შენი ჯერია: ფეხბურთელი ${letter} ასოზე`, seatTurn: (name: string, letter: string) => `${name} წერს: ასო ${letter}`,
    nextLetter: "შემდეგი ასო", round: (n: number) => `რაუნდი ${n}`, supplied: "თამაშმა მოგცა", fresh: "ამ ასოზე აღარავინ დარჩა, თამაშმა ახალი სახელი მოგცა.",
    unknown: (text: string) => `„${text}“ სიაში არ არის, სცადე ხელახლა`, letter: (name: string, starts: string, need: string) => `${name} იწყება ${starts}-ზე, საჭიროა ${need}`, repeat: (name: string) => `${name} უკვე ითქვა`,
    roundWon: "რაუნდი შენია!", roundLost: "რაუნდი წააგე", time: "დრო ამოიწურა", passed: "დანებდა", leftTurn: "მატჩიდან გავიდა", giveUp: "დანებება",
    could: (letter: string) => `სახელები ${letter} ასოზე`, nextRound: "იწყება შემდეგი რაუნდი…", waiting: "მეტოქე წერს…", sending: "იგზავნება…",
    out: "გავარდა", youOut: "ამ რაუნდიდან გავარდი. დაელოდე შემდეგს.", knocked: (name: string) => `${name} გავარდა`, roundTo: (name: string) => `რაუნდი მოიგო: ${name}`, lastStanding: "ბოლოს დარჩენილი მოთამაშე",
    answersStat: "პასუხები", answersDetail: (n: number) => `${n} სწორი პასუხი`, chainTitle: "ჯაჭვი",
  },
} as const;

const daily = {
  tr: {
    loading: "Yükleniyor…", loadError: "Oyun yüklenemedi.", retry: "Tekrar dene", exit: "Çık", soon: "İlk gün yakında açılıyor.", back: "Geri",
    play: "Oyna", resume: "Devam et", seeResult: "Sonucu gör", archive: "Geçmiş günler", archiveTitle: "Geçmiş günler", today: "Bugün", next: "Devam",
    guestPast: "Misafir olarak geçmiş bir günü oynuyorsun. Sıralamaya girmez.", guestToday: "Bugünün oyunu için hesap gerekli. Misafir olarak geçmiş günleri oynayabilirsin.",
    playToday: "Bugünü oynamak için kaydol", practice: "Bu gün sıralamaya girmiyor (antrenman).", rank: (n: number) => `Bugün ${n}. sıradasın`,
    notices: { dayOver: "Gün bitti. Yeni gün açıldı.", guestToday: "Bugünün oyunu için hesap gerekli.", maintenance: "Kısa bir bakım var. Birazdan tekrar dene.", restarted: "Bu günün içeriği güncellendi; baştan başlıyorsun.", sessionChanged: "Oturumun değişti. Tekrar başla.", actionError: "Bir şey ters gitti. Tekrar dene.", connection: "Bağlantı yok: yeniden bağlanılıyor…" },
    share: "Paylaş", copy: "Kopyala", copied: "Kopyalandı", friends: "Arkadaşlarınla oyna (2–6)", friendsSignIn: "Arkadaşlarınla oynamak için giriş yap", points: "puan",
    board: { title: "Günün sıralaması", players: (n: number) => `${n} oyuncu`, empty: "Bugün henüz kimse bitirmedi. İlk sen ol.", join: "Sıralamaya girmek için kaydol.", joinButton: "Kaydol" },
  },
  en: {
    loading: "Loading…", loadError: "The game could not be loaded.", retry: "Try again", exit: "Exit", soon: "The first day opens soon.", back: "Back",
    play: "Play", resume: "Continue", seeResult: "See the result", archive: "Past days", archiveTitle: "Past days", today: "Today", next: "Next",
    guestPast: "You are playing a past day as a guest. It is not ranked.", guestToday: "Today's game needs an account. As a guest you can play past days.",
    playToday: "Sign up to play today", practice: "This day is not ranked (practice).", rank: (n: number) => `You are #${n} today`,
    notices: { dayOver: "The day is over. A new one is open.", guestToday: "Today's game needs an account.", maintenance: "Short maintenance. Try again in a moment.", restarted: "This day's content was updated; you start again.", sessionChanged: "Your session changed. Start again.", actionError: "Something went wrong. Try again.", connection: "No connection: reconnecting…" },
    share: "Share", copy: "Copy", copied: "Copied", friends: "Play with friends (2–6)", friendsSignIn: "Sign in to play with friends", points: "pts",
    board: { title: "Today's ranking", players: (n: number) => `${n} player${n === 1 ? "" : "s"}`, empty: "Nobody has finished today yet. Be the first.", join: "Sign up to get on the ranking.", joinButton: "Sign up" },
  },
  es: {
    loading: "Cargando…", loadError: "No se pudo cargar el juego.", retry: "Reintentar", exit: "Salir", soon: "El primer día se abre pronto.", back: "Volver",
    play: "Jugar", resume: "Continuar", seeResult: "Ver el resultado", archive: "Días anteriores", archiveTitle: "Días anteriores", today: "Hoy", next: "Siguiente",
    guestPast: "Estás jugando un día anterior como invitado. No cuenta para el ranking.", guestToday: "El juego de hoy necesita una cuenta. Como invitado podés jugar días anteriores.",
    playToday: "Registrate para jugar hoy", practice: "Este día no cuenta para el ranking (práctica).", rank: (n: number) => `Vas ${n}º hoy`,
    notices: { dayOver: "El día terminó. Ya hay uno nuevo.", guestToday: "El juego de hoy necesita una cuenta.", maintenance: "Mantenimiento breve. Probá de nuevo en un momento.", restarted: "El contenido de este día se actualizó; empezás de nuevo.", sessionChanged: "Tu sesión cambió. Empezá de nuevo.", actionError: "Algo salió mal. Probá de nuevo.", connection: "Sin conexión: reconectando…" },
    share: "Compartir", copy: "Copiar", copied: "Copiado", friends: "Jugar con amigos (2–6)", friendsSignIn: "Iniciá sesión para jugar con amigos", points: "pts",
    board: { title: "Ranking de hoy", players: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"}`, empty: "Nadie terminó hoy todavía. Sé el primero.", join: "Registrate para entrar al ranking.", joinButton: "Registrarse" },
  },
  ka: {
    loading: "იტვირთება…", loadError: "თამაში ვერ ჩაიტვირთა.", retry: "სცადე ხელახლა", exit: "გასვლა", soon: "პირველი დღე მალე გაიხსნება.", back: "უკან",
    play: "თამაში", resume: "გაგრძელება", seeResult: "შედეგის ნახვა", archive: "წინა დღეები", archiveTitle: "წინა დღეები", today: "დღეს", next: "შემდეგი",
    guestPast: "სტუმრად წინა დღეს თამაშობ. რეიტინგში არ ითვლება.", guestToday: "დღევანდელ თამაშს ანგარიში სჭირდება. სტუმრად წინა დღეების თამაში შეგიძლია.",
    playToday: "დარეგისტრირდი დღევანდელი თამაშისთვის", practice: "ეს დღე რეიტინგში არ ითვლება (ვარჯიში).", rank: (n: number) => `დღეს ${n}-ე ადგილზე ხარ`,
    notices: { dayOver: "დღე დასრულდა. ახალი უკვე ღიაა.", guestToday: "დღევანდელ თამაშს ანგარიში სჭირდება.", maintenance: "მოკლე ტექნიკური შესვენება. სცადე ცოტა ხანში.", restarted: "ამ დღის შინაარსი განახლდა; თავიდან იწყებ.", sessionChanged: "სესია შეიცვალა. დაიწყე თავიდან.", actionError: "რაღაც შეცდომა მოხდა. სცადე ხელახლა.", connection: "კავშირი არ არის: ხელახლა ვუკავშირდებით…" },
    share: "გაზიარება", copy: "კოპირება", copied: "დაკოპირდა", friends: "ითამაშე მეგობრებთან (2–6)", friendsSignIn: "შედი, რომ მეგობრებთან ითამაშო", points: "ქულა",
    board: { title: "დღის რეიტინგი", players: (n: number) => `${n} მოთამაშე`, empty: "დღეს ჯერ არავის დაუსრულებია. იყავი პირველი.", join: "დარეგისტრირდი, რომ რეიტინგში მოხვდე.", joinButton: "რეგისტრაცია" },
  },
} as const;

const sharedPlayerDaily = {
  tr: {
    title: "Ortak Futbolcu", tag: "Günün 10 eşleşmesi",
    lines: ["Her gün 10 kulüp eşleşmesi.", "Her eşleşmede ikisinde de oynamış bir futbolcu yaz: 10 saniyen var.", "Bulduğun her eşleşme 1 puan. Hızlı olan sıralamada öne geçer."],
    pair: (n: number, of: number) => `Eşleşme ${n}/${of}`, found: "Doğru!", missed: "Süre doldu", yourAnswer: (name: string) => `Cevabın: ${name}`,
    answersTomorrow: (n: number) => `${n} doğru cevap var. İsimler gün bitince açılır.`, nextPair: "Sıradaki eşleşme", finish: "Sonucu gör",
    endTitle: "Bugünlük bitti", result: (n: number, of: number) => `${of} eşleşmenin ${n} tanesini buldun`, summary: "Eşleşmeler", notFound: "bulunamadı", late: "Süre dolmuştu, cevap sayılmadı.",
    shareText: (number: number, score: number, of: number) => `Ortak Futbolcu #${number}: ${score}/${of}`, speedLabel: "Hız",
  },
  en: {
    title: "Played for Both", tag: "Ten pairs a day",
    lines: ["Ten club pairs every day.", "For each pair, type a footballer who played for both: you have 10 seconds.", "Every pair you find is 1 point. Faster players rank higher."],
    pair: (n: number, of: number) => `Pair ${n}/${of}`, found: "Correct!", missed: "Time ran out", yourAnswer: (name: string) => `Your answer: ${name}`,
    answersTomorrow: (n: number) => `There are ${n} valid answers. The names open once the day is over.`, nextPair: "Next pair", finish: "See the result",
    endTitle: "Done for today", result: (n: number, of: number) => `You found ${n} of ${of} pairs`, summary: "Pairs", notFound: "not found", late: "Time had run out, the answer did not count.",
    shareText: (number: number, score: number, of: number) => `Played for Both #${number}: ${score}/${of}`, speedLabel: "Speed",
  },
  es: {
    title: "Jugador en común", tag: "10 pares cada día",
    lines: ["Diez pares de clubes cada día.", "En cada par, escribí un futbolista que jugó en los dos: tenés 10 segundos.", "Cada par que encontrás vale 1 punto. El más rápido sube en el ranking."],
    pair: (n: number, of: number) => `Par ${n}/${of}`, found: "¡Correcto!", missed: "Se acabó el tiempo", yourAnswer: (name: string) => `Tu respuesta: ${name}`,
    answersTomorrow: (n: number) => `Hay ${n} respuestas válidas. Los nombres se ven cuando termina el día.`, nextPair: "Siguiente par", finish: "Ver el resultado",
    endTitle: "Listo por hoy", result: (n: number, of: number) => `Encontraste ${n} de ${of} pares`, summary: "Pares", notFound: "sin encontrar", late: "El tiempo ya había terminado; la respuesta no contó.",
    shareText: (number: number, score: number, of: number) => `Jugador en común #${number}: ${score}/${of}`, speedLabel: "Velocidad",
  },
  ka: {
    title: "საერთო ფეხბურთელი", tag: "დღეში 10 წყვილი",
    lines: ["ყოველდღე 10 კლუბის წყვილი.", "თითო წყვილზე დაწერე ფეხბურთელი, რომელმაც ორივეში ითამაშა: გაქვს 10 წამი.", "ყოველი ნაპოვნი წყვილი 1 ქულაა. უფრო სწრაფი რეიტინგში მაღლა დგას."],
    pair: (n: number, of: number) => `წყვილი ${n}/${of}`, found: "სწორია!", missed: "დრო ამოიწურა", yourAnswer: (name: string) => `შენი პასუხი: ${name}`,
    answersTomorrow: (n: number) => `არის ${n} სწორი პასუხი. სახელები დღის დასრულების შემდეგ გაიხსნება.`, nextPair: "შემდეგი წყვილი", finish: "შედეგის ნახვა",
    endTitle: "დღეისთვის დასრულდა", result: (n: number, of: number) => `${of} წყვილიდან იპოვე ${n}`, summary: "წყვილები", notFound: "ვერ იპოვე", late: "დრო უკვე ამოწურული იყო, პასუხი არ ჩაითვალა.",
    shareText: (number: number, score: number, of: number) => `საერთო ფეხბურთელი #${number}: ${score}/${of}`, speedLabel: "სისწრაფე",
  },
} as const;

const nameChainDaily = {
  tr: {
    title: "Son Harfle Futbolcu", tag: "Günün 3 zinciri",
    lines: ["Bir futbolcu veriyoruz. Sen, adının son harfiyle başlayan başka bir futbolcu yazıyorsun.", "İsim de soyisim de sayılır: Anthony Martial hem A hem M için geçerli.", "Her cevap için 10 saniyen var; zincir uzadıkça süre kısalır. Günde 3 zincir, toplam kaç futbolcu?"],
    chainOf: (n: number, of: number) => `Zincir ${n}/${of}`, tooFast: "Çok hızlı! Bir an bekle.", late: "Süre dolmuştu, cevap sayılmadı.",
    chainOver: "Zincir bitti", capped: "Zincir tamamlandı!", soFar: (n: number) => `Şu ana kadar ${n} futbolcu`, nextChain: "Sıradaki zincir", finish: "Sonucu gör",
    endTitle: "Bugünlük bitti", footballers: (n: number) => `${n} futbolcu`, longest: (n: number) => `En uzun zincir: ${n}`, chains: "Zincirler", longestLabel: "En uzun",
    shareText: (number: number, score: number, chains: string) => `Son Harfle Futbolcu #${number}: ${score} futbolcu (${chains})`,
  },
  en: {
    title: "Football Name Chain", tag: "Three chains a day",
    lines: ["We give you a footballer. You type another one whose name starts with the last letter of that name.", "First name or surname both count: Anthony Martial answers A and M.", "You have 10 seconds per answer; the clock gets shorter as the chain grows. Three chains a day: how many footballers in total?"],
    chainOf: (n: number, of: number) => `Chain ${n}/${of}`, tooFast: "Too fast! Wait a moment.", late: "Time had run out, the answer did not count.",
    chainOver: "Chain over", capped: "Chain complete!", soFar: (n: number) => `${n} footballer${n === 1 ? "" : "s"} so far`, nextChain: "Next chain", finish: "See the result",
    endTitle: "Done for today", footballers: (n: number) => `${n} footballer${n === 1 ? "" : "s"}`, longest: (n: number) => `Longest chain: ${n}`, chains: "Chains", longestLabel: "Longest",
    shareText: (number: number, score: number, chains: string) => `Football Name Chain #${number}: ${score} footballers (${chains})`,
  },
  es: {
    title: "Cadena de futbolistas", tag: "3 cadenas cada día",
    lines: ["Te damos un futbolista. Escribís otro cuyo nombre empiece con la última letra de ese nombre.", "Vale el nombre o el apellido: Anthony Martial sirve para la A y para la M.", "Tenés 10 segundos por respuesta; el reloj se acorta cuando la cadena crece. Tres cadenas al día: ¿cuántos futbolistas en total?"],
    chainOf: (n: number, of: number) => `Cadena ${n}/${of}`, tooFast: "¡Demasiado rápido! Esperá un momento.", late: "El tiempo ya había terminado; la respuesta no contó.",
    chainOver: "Se acabó la cadena", capped: "¡Cadena completa!", soFar: (n: number) => `${n} ${n === 1 ? "futbolista" : "futbolistas"} hasta ahora`, nextChain: "Siguiente cadena", finish: "Ver el resultado",
    endTitle: "Listo por hoy", footballers: (n: number) => `${n} ${n === 1 ? "futbolista" : "futbolistas"}`, longest: (n: number) => `Cadena más larga: ${n}`, chains: "Cadenas", longestLabel: "Más larga",
    shareText: (number: number, score: number, chains: string) => `Cadena de futbolistas #${number}: ${score} futbolistas (${chains})`,
  },
  ka: {
    title: "ფეხბურთელობანა", tag: "დღეში 3 ჯაჭვი",
    lines: ["ჩვენ გაძლევთ ფეხბურთელს. შენ წერ სხვას, რომლის სახელი იმ სახელის ბოლო ასოთი იწყება.", "ითვლება სახელიც და გვარიც: Anthony Martial გამოდგება A-ზეც და M-ზეც.", "თითო პასუხზე 10 წამი გაქვს; ჯაჭვის ზრდასთან ერთად დრო მოკლდება. დღეში 3 ჯაჭვი: სულ რამდენი ფეხბურთელი?"],
    chainOf: (n: number, of: number) => `ჯაჭვი ${n}/${of}`, tooFast: "ძალიან სწრაფია! ცოტა დაიცადე.", late: "დრო უკვე ამოწურული იყო, პასუხი არ ჩაითვალა.",
    chainOver: "ჯაჭვი დასრულდა", capped: "ჯაჭვი შევსებულია!", soFar: (n: number) => `ჯერჯერობით ${n} ფეხბურთელი`, nextChain: "შემდეგი ჯაჭვი", finish: "შედეგის ნახვა",
    endTitle: "დღეისთვის დასრულდა", footballers: (n: number) => `${n} ფეხბურთელი`, longest: (n: number) => `ყველაზე გრძელი ჯაჭვი: ${n}`, chains: "ჯაჭვები", longestLabel: "ყველაზე გრძელი",
    shareText: (number: number, score: number, chains: string) => `ფეხბურთელობანა #${number}: ${score} ფეხბურთელი (${chains})`,
  },
} as const;

export const wordSharedCopy = (locale: string) => shared[asWordLocale(locale)];
export const sharedPlayerCopy = (locale: string) => sharedPlayer[asWordLocale(locale)];
export const nameChainCopy = (locale: string) => nameChain[asWordLocale(locale)];
export const wordDailyCopy = (locale: string) => daily[asWordLocale(locale)];
export const sharedPlayerDailyCopy = (locale: string) => sharedPlayerDaily[asWordLocale(locale)];
export const nameChainDailyCopy = (locale: string) => nameChainDaily[asWordLocale(locale)];
export type WordDailyCopy = ReturnType<typeof wordDailyCopy>;
export type WordSharedCopy = ReturnType<typeof wordSharedCopy>;
export type SharedPlayerCopy = ReturnType<typeof sharedPlayerCopy>;
