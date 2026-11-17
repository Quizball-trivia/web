import type { CupRun, TacticId } from "./draft.rules";

/** Rules v2 copy: the bench, the team talk, moments, the winter break and January window, cups and awards. Merged into the Football Draft copy. */
export interface SeasonCopy {
  bench: string; benchHint: string; benchSlot: string;
  teamTalk: string; captain: string; chooseCaptain: string; captainSet: (name: string) => string;
  chooseTactic: string; tacticNames: Record<TacticId, string>; tacticNotes: Record<TacticId, string>;
  chemistry: string; chemLinks: (n: number) => string; chemNone: string; chemPair: (a: string, b: string, club: string, season: string) => string;
  kickOff: string; firstHalf: string; secondHalf: string; winterBreak: string; halfRecord: (w: number, d: number, l: number, pts: number) => string;
  january: string; januaryHint: string; januaryScout: string; januaryAgain: string; januaryMoney: (m: number) => string; januaryPick: string; januaryPlace: (name: string) => string;
  januaryDone: (inName: string, out: string | null, refund: number) => string; januaryNone: string; secondTactic: string; playSecondHalf: string;
  injury: (name: string, weeks: number, cover: string | null) => string; red: (name: string, cover: string | null) => string; derby: (rival: string) => string; momentsTitle: string;
  trophies: string; cupName: string; europeName: string; stage: (kind: CupRun["kind"], stage: number, of: number) => string;
  cupWon: string; europeWon: string; treble: string; outIn: (stage: string, opponent: string, score: string) => string; noEurope: string; trophyCoins: (n: number) => string;
  awards: string; goldenBootVs: (mine: string, goals: number, real: string, realGoals: number, season: string) => string; januarySigning: string;
  europeLeague: string; europeNote: string;
}

const en: SeasonCopy = {
  bench: "Bench", benchHint: "Three subs: they play when someone is injured or sent off.", benchSlot: "SUB",
  teamTalk: "Team talk", captain: "Captain", chooseCaptain: "Tap a player to give him the armband (+4).", captainSet: (n) => `${n} wears the armband`,
  chooseTactic: "Your manager's tactic",
  tacticNames: { gegenpress: "Gegenpress", catenaccio: "Catenaccio", tikitaka: "Tiki-taka", counter: "Counter-attack", wingplay: "Wing play", parkbus: "Park the bus" },
  tacticNotes: { gegenpress: "Win it high, score more, leave space behind", catenaccio: "Locked at the back, little going forward", tikitaka: "Own the ball, own the midfield", counter: "Sit deep, break fast", wingplay: "Width and crosses for the forwards", parkbus: "Everyone behind the ball" },
  chemistry: "Chemistry", chemLinks: (n) => `${n} former ${n === 1 ? "teammates link" : "teammate links"} up`, chemNone: "No former teammates in your XI: chemistry comes from players who shared a dressing room.", chemPair: (a, b, cl, se) => `${a} & ${b} · ${cl} ${se}`,
  kickOff: "Kick off the season", firstHalf: "First half of the season", secondHalf: "Second half of the season", winterBreak: "Winter break", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} pts at the turn of the year`,
  january: "January transfer window", januaryHint: "One signing: he takes a place in your XI or on the bench, and whoever was there is sold for half his price.", januaryScout: "Scout a squad", januaryAgain: "Another squad", januaryMoney: (m) => `€${m}M to spend`, januaryPick: "Tap a player, then the place he takes", januaryPlace: (n) => `Where does ${n} play?`,
  januaryDone: (i, o, r) => (o ? `${i} in, ${o} out (+€${r}M)` : `${i} signed`), januaryNone: "No January signing", secondTactic: "Tactic for the second half", playSecondHalf: "Play the second half",
  injury: (n, w, c) => `${n} injured, out ${w} ${w === 1 ? "week" : "weeks"}: ${c ?? "an academy kid"} steps in`, red: (n, c) => `${n} sent off, banned one game: ${c ?? "an academy kid"} steps in`, derby: (r) => `Derby day against ${r}`, momentsTitle: "The season's moments",
  trophies: "Trophies", cupName: "Cup", europeName: "Europe", stage: (k, s, of) => (["Final", "Semi-final", "Quarter-final", "Round of 16", "Round of 32"][of - 1 - s] ?? `Round ${s + 1}`),
  cupWon: "Cup winners!", europeWon: "Champions of Europe!", treble: "TREBLE!", outIn: (st, o, sc) => `Out in the ${st.toLowerCase()}: ${sc} against ${o}`, noEurope: "Finish in the top four to play in Europe.", trophyCoins: (n) => `+${n} coins for trophies`,
  awards: "Awards", goldenBootVs: (m, g, r, rg, se) => `${m} scored ${g}. The real ${se} Golden Boot: ${r} with ${rg}.`, januarySigning: "January signing",
  europeLeague: "Europe", europeNote: "All five leagues in one draw",
};

const es: SeasonCopy = {
  bench: "Suplentes", benchHint: "Tres suplentes: juegan cuando alguien se lesiona o lo expulsan.", benchSlot: "SUP",
  teamTalk: "Charla técnica", captain: "Capitán", chooseCaptain: "Tocá un jugador para darle la cinta (+4).", captainSet: (n) => `${n} lleva la cinta`,
  chooseTactic: "La táctica de tu DT",
  tacticNames: { gegenpress: "Gegenpress", catenaccio: "Catenaccio", tikitaka: "Tiki-taka", counter: "Contraataque", wingplay: "Juego por bandas", parkbus: "Colectivo en el área" },
  tacticNotes: { gegenpress: "Presión alta, más gol, espacios atrás", catenaccio: "Cerrado atrás, poco arriba", tikitaka: "Dueño de la pelota y del medio", counter: "Bloque bajo y salida rápida", wingplay: "Amplitud y centros para los de arriba", parkbus: "Todos detrás de la pelota" },
  chemistry: "Química", chemLinks: (n) => `${n} ${n === 1 ? "conexión" : "conexiones"} entre ex compañeros`, chemNone: "No hay ex compañeros en tu once: la química sale de jugadores que compartieron vestuario.", chemPair: (a, b, cl, se) => `${a} y ${b} · ${cl} ${se}`,
  kickOff: "Arrancar la temporada", firstHalf: "Primera mitad de la temporada", secondHalf: "Segunda mitad de la temporada", winterBreak: "Parón de invierno", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} pts a mitad de temporada`,
  january: "Mercado de enero", januaryHint: "Un fichaje: ocupa un lugar en tu once o en el banco, y el que estaba se vende a mitad de precio.", januaryScout: "Ver un plantel", januaryAgain: "Otro plantel", januaryMoney: (m) => `€${m}M para gastar`, januaryPick: "Tocá un jugador y después su lugar", januaryPlace: (n) => `¿Dónde juega ${n}?`,
  januaryDone: (i, o, r) => (o ? `Llega ${i}, se va ${o} (+€${r}M)` : `${i} fichado`), januaryNone: "Sin fichaje en enero", secondTactic: "Táctica para la segunda mitad", playSecondHalf: "Jugar la segunda mitad",
  injury: (n, w, c) => `${n} lesionado, ${w} ${w === 1 ? "fecha" : "fechas"} afuera: entra ${c ?? "un juvenil"}`, red: (n, c) => `${n} expulsado, una fecha de suspensión: entra ${c ?? "un juvenil"}`, derby: (r) => `Clásico contra ${r}`, momentsTitle: "Los momentos de la temporada",
  trophies: "Trofeos", cupName: "Copa", europeName: "Europa", stage: (k, s, of) => (["Final", "Semifinal", "Cuartos de final", "Octavos de final", "Dieciseisavos"][of - 1 - s] ?? `Ronda ${s + 1}`),
  cupWon: "¡Campeón de copa!", europeWon: "¡Campeón de Europa!", treble: "¡TRIPLETE!", outIn: (st, o, sc) => `Afuera en ${st.toLowerCase()}: ${sc} contra ${o}`, noEurope: "Terminá entre los cuatro primeros para jugar en Europa.", trophyCoins: (n) => `+${n} monedas por trofeos`,
  awards: "Premios", goldenBootVs: (m, g, r, rg, se) => `${m} hizo ${g}. El goleador real de ${se}: ${r} con ${rg}.`, januarySigning: "Fichaje de enero",
  europeLeague: "Europa", europeNote: "Las cinco ligas en un mismo sorteo",
};

const tr: SeasonCopy = {
  bench: "Yedekler", benchHint: "Üç yedek: biri sakatlanınca ya da atılınca oynarlar.", benchSlot: "YDK",
  teamTalk: "Takım konuşması", captain: "Kaptan", chooseCaptain: "Pazubandı vermek için bir oyuncuya dokun (+4).", captainSet: (n) => `Pazubandı ${n} taşıyor`,
  chooseTactic: "Teknik direktörünün taktiği",
  tacticNames: { gegenpress: "Gegenpress", catenaccio: "Catenaccio", tikitaka: "Tiki-taka", counter: "Kontra atak", wingplay: "Kanat oyunu", parkbus: "Otobüsü çek" },
  tacticNotes: { gegenpress: "Önde bas, çok gol at, arkada boşluk bırak", catenaccio: "Geride kilit, ileride az", tikitaka: "Topa ve orta sahaya hükmet", counter: "Geride bekle, hızlı çık", wingplay: "Genişlik ve forvetlere orta", parkbus: "Herkes topun gerisinde" },
  chemistry: "Uyum", chemLinks: (n) => `${n} eski takım arkadaşı bağı`, chemNone: "İlk 11'inde eski takım arkadaşı yok: uyum, aynı soyunma odasını paylaşmış oyunculardan gelir.", chemPair: (a, b, cl, se) => `${a} ve ${b} · ${cl} ${se}`,
  kickOff: "Sezonu başlat", firstHalf: "Sezonun ilk yarısı", secondHalf: "Sezonun ikinci yarısı", winterBreak: "Devre arası", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · devre arasında ${p} puan`,
  january: "Ocak transfer dönemi", januaryHint: "Tek transfer: ilk 11'inde ya da yedekte bir yer alır, oradaki oyuncu yarı fiyatına satılır.", januaryScout: "Bir kadroya bak", januaryAgain: "Başka kadro", januaryMoney: (m) => `Harcanacak €${m}M`, januaryPick: "Bir oyuncuya, sonra yerine dokun", januaryPlace: (n) => `${n} nerede oynasın?`,
  januaryDone: (i, o, r) => (o ? `${i} geldi, ${o} gitti (+€${r}M)` : `${i} transfer edildi`), januaryNone: "Ocakta transfer yok", secondTactic: "İkinci yarı taktiği", playSecondHalf: "İkinci yarıyı oyna",
  injury: (n, w, c) => `${n} sakatlandı, ${w} hafta yok: yerine ${c ?? "bir altyapı oyuncusu"}`, red: (n, c) => `${n} kırmızı kart gördü, bir maç ceza: yerine ${c ?? "bir altyapı oyuncusu"}`, derby: (r) => `${r} ile derbi günü`, momentsTitle: "Sezonun anları",
  trophies: "Kupalar", cupName: "Kupa", europeName: "Avrupa", stage: (k, s, of) => (["Final", "Yarı final", "Çeyrek final", "Son 16", "Son 32"][of - 1 - s] ?? `${s + 1}. tur`),
  cupWon: "Kupa şampiyonu!", europeWon: "Avrupa şampiyonu!", treble: "ÜÇLEME!", outIn: (st, o, sc) => `${st} turunda elendi: ${o} karşısında ${sc}`, noEurope: "Avrupa'da oynamak için ilk dörtte bitir.", trophyCoins: (n) => `Kupalar için +${n} jeton`,
  awards: "Ödüller", goldenBootVs: (m, g, r, rg, se) => `${m} ${g} gol attı. ${se} gerçek gol kralı: ${r}, ${rg} gol.`, januarySigning: "Ocak transferi",
  europeLeague: "Avrupa", europeNote: "Beş lig tek çekilişte",
};

const ka: SeasonCopy = {
  bench: "სათადარიგოები", benchHint: "სამი სათადარიგო: თამაშობენ, როცა ვინმე ტრავმირდება ან გაძევებულია.", benchSlot: "სათ",
  teamTalk: "გუნდთან საუბარი", captain: "კაპიტანი", chooseCaptain: "შეეხე მოთამაშეს, რომ სამკლაური გადასცე (+4).", captainSet: (n) => `სამკლაური ${n}-ს აქვს`,
  chooseTactic: "შენი მწვრთნელის ტაქტიკა",
  tacticNames: { gegenpress: "გეგენპრესინგი", catenaccio: "კატენაჩო", tikitaka: "ტიკი-ტაკა", counter: "კონტრშეტევა", wingplay: "ფლანგებიდან თამაში", parkbus: "ავტობუსის დაყენება" },
  tacticNotes: { gegenpress: "მაღალი წნეხი, მეტი გოლი, სივრცე უკან", catenaccio: "ჩაკეტილი დაცვა, ცოტა შეტევა", tikitaka: "ბურთი და ნახევარდაცვა შენია", counter: "დაბლა ჯდომა, სწრაფი გარღვევა", wingplay: "სიგანე და ჩაწოდებები თავდამსხმელებს", parkbus: "ყველა ბურთის უკან" },
  chemistry: "ქიმია", chemLinks: (n) => `${n} კავშირი ყოფილ თანაგუნდელებს შორის`, chemNone: "შენს 11-ში ყოფილი თანაგუნდელები არ არიან: ქიმია ერთ გასახდელში ნამყოფი მოთამაშეებიდან მოდის.", chemPair: (a, b, cl, se) => `${a} და ${b} · ${cl} ${se}`,
  kickOff: "სეზონის დაწყება", firstHalf: "სეზონის პირველი ნახევარი", secondHalf: "სეზონის მეორე ნახევარი", winterBreak: "ზამთრის შესვენება", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} ქულა სეზონის შუაში`,
  january: "იანვრის სატრანსფერო ფანჯარა", januaryHint: "ერთი ტრანსფერი: ის იკავებს ადგილს შენს 11-ში ან სკამზე, იქ მყოფი კი ნახევარ ფასად იყიდება.", januaryScout: "შემადგენლობის ნახვა", januaryAgain: "სხვა შემადგენლობა", januaryMoney: (m) => `დასახარჯად €${m}M`, januaryPick: "შეეხე მოთამაშეს, შემდეგ მის ადგილს", januaryPlace: (n) => `სად ითამაშებს ${n}?`,
  januaryDone: (i, o, r) => (o ? `მოვიდა ${i}, წავიდა ${o} (+€${r}M)` : `${i} აიყვანე`), januaryNone: "იანვარში ტრანსფერი არ ყოფილა", secondTactic: "ტაქტიკა მეორე ნახევრისთვის", playSecondHalf: "მეორე ნახევრის თამაში",
  injury: (n, w, c) => `${n} ტრავმირდა, ${w} კვირა არ ითამაშებს: შედის ${c ?? "აკადემიელი"}`, red: (n, c) => `${n} გააძევეს, ერთი მატჩით დისკვალიფიკაცია: შედის ${c ?? "აკადემიელი"}`, derby: (r) => `დერბი ${r}-ის წინააღმდეგ`, momentsTitle: "სეზონის მომენტები",
  trophies: "ტროფეები", cupName: "თასი", europeName: "ევროპა", stage: (k, s, of) => (["ფინალი", "ნახევარფინალი", "მეოთხედფინალი", "1/8 ფინალი", "1/16 ფინალი"][of - 1 - s] ?? `რაუნდი ${s + 1}`),
  cupWon: "თასის მფლობელი!", europeWon: "ევროპის ჩემპიონი!", treble: "სამმაგი!", outIn: (st, o, sc) => `${st}: ${o}-სთან ${sc}`, noEurope: "ევროპაში სათამაშოდ პირველ ოთხეულში უნდა დაასრულო.", trophyCoins: (n) => `+${n} ქოინი ტროფეებისთვის`,
  awards: "ჯილდოები", goldenBootVs: (m, g, r, rg, se) => `${m}-მა ${g} გოლი გაიტანა. ${se} სეზონის ნამდვილი ბომბარდირი: ${r}, ${rg} გოლი.`, januarySigning: "იანვრის ტრანსფერი",
  europeLeague: "ევროპა", europeNote: "ხუთივე ლიგა ერთ გათამაშებაში",
};

const pt: SeasonCopy = {
  bench: "Reservas", benchHint: "Três reservas: entram quando alguém se machuca ou é expulso.", benchSlot: "RES",
  teamTalk: "Preleção", captain: "Capitão", chooseCaptain: "Toque num jogador para dar a braçadeira (+4).", captainSet: (n) => `${n} usa a braçadeira`,
  chooseTactic: "A tática do seu técnico",
  tacticNames: { gegenpress: "Gegenpress", catenaccio: "Catenaccio", tikitaka: "Tiki-taka", counter: "Contra-ataque", wingplay: "Jogo pelas pontas", parkbus: "Ferrolho" },
  tacticNotes: { gegenpress: "Pressão alta, mais gols, espaço atrás", catenaccio: "Fechado atrás, pouco na frente", tikitaka: "Dono da bola e do meio-campo", counter: "Linhas baixas e saída rápida", wingplay: "Amplitude e cruzamentos para os atacantes", parkbus: "Todo mundo atrás da bola" },
  chemistry: "Entrosamento", chemLinks: (n) => `${n} ${n === 1 ? "ligação" : "ligações"} entre ex-companheiros`, chemNone: "Nenhum ex-companheiro no seu time: o entrosamento vem de quem dividiu vestiário.", chemPair: (a, b, cl, se) => `${a} e ${b} · ${cl} ${se}`,
  kickOff: "Começar a temporada", firstHalf: "Primeira metade da temporada", secondHalf: "Segunda metade da temporada", winterBreak: "Pausa de inverno", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} pts na virada do turno`,
  january: "Janela de janeiro", januaryHint: "Uma contratação: ele assume uma vaga no time ou no banco, e quem estava lá é vendido pela metade do preço.", januaryScout: "Ver um elenco", januaryAgain: "Outro elenco", januaryMoney: (m) => `€${m}M para gastar`, januaryPick: "Toque num jogador e depois na vaga dele", januaryPlace: (n) => `Onde ${n} joga?`,
  januaryDone: (i, o, r) => (o ? `Chega ${i}, sai ${o} (+€${r}M)` : `${i} contratado`), januaryNone: "Nenhuma contratação em janeiro", secondTactic: "Tática para a segunda metade", playSecondHalf: "Jogar a segunda metade",
  injury: (n, w, c) => `${n} machucado, fora por ${w} ${w === 1 ? "rodada" : "rodadas"}: entra ${c ?? "um garoto da base"}`, red: (n, c) => `${n} expulso, suspenso por um jogo: entra ${c ?? "um garoto da base"}`, derby: (r) => `Clássico contra ${r}`, momentsTitle: "Os momentos da temporada",
  trophies: "Troféus", cupName: "Copa", europeName: "Europa", stage: (k, s, of) => (["Final", "Semifinal", "Quartas de final", "Oitavas de final", "16 avos de final"][of - 1 - s] ?? `Fase ${s + 1}`),
  cupWon: "Campeão da copa!", europeWon: "Campeão da Europa!", treble: "TRÍPLICE COROA!", outIn: (st, o, sc) => `Eliminado nas ${st.toLowerCase()}: ${sc} contra ${o}`, noEurope: "Termine entre os quatro primeiros para jogar na Europa.", trophyCoins: (n) => `+${n} moedas por troféus`,
  awards: "Prêmios", goldenBootVs: (m, g, r, rg, se) => `${m} marcou ${g}. O artilheiro real de ${se}: ${r} com ${rg}.`, januarySigning: "Contratação de janeiro",
  europeLeague: "Europa", europeNote: "As cinco ligas num só sorteio",
};

const de: SeasonCopy = {
  bench: "Bank", benchHint: "Drei Ersatzspieler: Sie spielen, wenn jemand verletzt oder gesperrt ist.", benchSlot: "ERS",
  teamTalk: "Teambesprechung", captain: "Kapitän", chooseCaptain: "Tippe auf einen Spieler, um ihm die Binde zu geben (+4).", captainSet: (n) => `${n} trägt die Binde`,
  chooseTactic: "Die Taktik deines Trainers",
  tacticNames: { gegenpress: "Gegenpressing", catenaccio: "Catenaccio", tikitaka: "Tiki-Taka", counter: "Konter", wingplay: "Flügelspiel", parkbus: "Mauern" },
  tacticNotes: { gegenpress: "Hoch anlaufen, mehr Tore, Raum hinten", catenaccio: "Hinten dicht, vorne wenig", tikitaka: "Ball und Mittelfeld gehören dir", counter: "Tief stehen, schnell umschalten", wingplay: "Breite und Flanken für die Stürmer", parkbus: "Alle hinter den Ball" },
  chemistry: "Chemie", chemLinks: (n) => `${n} ${n === 1 ? "Verbindung" : "Verbindungen"} ehemaliger Mitspieler`, chemNone: "Keine ehemaligen Mitspieler in deiner Elf: Chemie entsteht zwischen Spielern, die sich eine Kabine geteilt haben.", chemPair: (a, b, cl, se) => `${a} & ${b} · ${cl} ${se}`,
  kickOff: "Saison anpfeifen", firstHalf: "Hinrunde", secondHalf: "Rückrunde", winterBreak: "Winterpause", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} Punkte zur Winterpause`,
  january: "Wintertransferfenster", januaryHint: "Ein Transfer: Er übernimmt einen Platz in der Elf oder auf der Bank, wer dort war, wird zum halben Preis verkauft.", januaryScout: "Einen Kader ansehen", januaryAgain: "Anderer Kader", januaryMoney: (m) => `€${m}M zum Ausgeben`, januaryPick: "Tippe auf einen Spieler, dann auf seinen Platz", januaryPlace: (n) => `Wo spielt ${n}?`,
  januaryDone: (i, o, r) => (o ? `${i} kommt, ${o} geht (+€${r}M)` : `${i} verpflichtet`), januaryNone: "Kein Wintertransfer", secondTactic: "Taktik für die Rückrunde", playSecondHalf: "Rückrunde spielen",
  injury: (n, w, c) => `${n} verletzt, ${w} ${w === 1 ? "Woche" : "Wochen"} raus: ${c ?? "ein Nachwuchsspieler"} rückt nach`, red: (n, c) => `${n} vom Platz gestellt, ein Spiel gesperrt: ${c ?? "ein Nachwuchsspieler"} rückt nach`, derby: (r) => `Derby gegen ${r}`, momentsTitle: "Die Momente der Saison",
  trophies: "Titel", cupName: "Pokal", europeName: "Europa", stage: (k, s, of) => (["Finale", "Halbfinale", "Viertelfinale", "Achtelfinale", "Sechzehntelfinale"][of - 1 - s] ?? `Runde ${s + 1}`),
  cupWon: "Pokalsieger!", europeWon: "Europas Bester!", treble: "TRIPLE!", outIn: (st, o, sc) => `Aus im ${st}: ${sc} gegen ${o}`, noEurope: "Werde Vierter oder besser, um in Europa zu spielen.", trophyCoins: (n) => `+${n} Münzen für Titel`,
  awards: "Auszeichnungen", goldenBootVs: (m, g, r, rg, se) => `${m} traf ${g}-mal. Der echte Torschützenkönig ${se}: ${r} mit ${rg}.`, januarySigning: "Wintertransfer",
  europeLeague: "Europa", europeNote: "Alle fünf Ligen in einer Ziehung",
};

const ru: SeasonCopy = {
  bench: "Запасные", benchHint: "Трое запасных: играют, когда кто-то травмирован или удалён.", benchSlot: "ЗАП",
  teamTalk: "Установка на сезон", captain: "Капитан", chooseCaptain: "Нажми на игрока, чтобы отдать ему повязку (+4).", captainSet: (n) => `Повязка у игрока ${n}`,
  chooseTactic: "Тактика твоего тренера",
  tacticNames: { gegenpress: "Гегенпрессинг", catenaccio: "Катеначчо", tikitaka: "Тики-така", counter: "Контратака", wingplay: "Игра флангами", parkbus: "Автобус" },
  tacticNotes: { gegenpress: "Высокий прессинг, больше голов, пространство сзади", catenaccio: "Надёжно сзади, мало впереди", tikitaka: "Мяч и центр поля твои", counter: "Низкий блок, быстрый выход", wingplay: "Ширина и навесы для форвардов", parkbus: "Все за линией мяча" },
  chemistry: "Сыгранность", chemLinks: (n) => `Связей между бывшими партнёрами: ${n}`, chemNone: "В составе нет бывших партнёров: сыгранность дают игроки, делившие раздевалку.", chemPair: (a, b, cl, se) => `${a} и ${b} · ${cl} ${se}`,
  kickOff: "Начать сезон", firstHalf: "Первый круг", secondHalf: "Второй круг", winterBreak: "Зимняя пауза", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} очков к зимней паузе`,
  january: "Зимнее трансферное окно", januaryHint: "Один трансфер: он занимает место в составе или на скамейке, а прежний игрок продаётся за полцены.", januaryScout: "Посмотреть состав", januaryAgain: "Другой состав", januaryMoney: (m) => `€${m}M на трансфер`, januaryPick: "Нажми на игрока, затем на его место", januaryPlace: (n) => `Где сыграет ${n}?`,
  januaryDone: (i, o, r) => (o ? `Пришёл ${i}, ушёл ${o} (+€${r}M)` : `${i} подписан`), januaryNone: "Без зимнего трансфера", secondTactic: "Тактика на второй круг", playSecondHalf: "Сыграть второй круг",
  injury: (n, w, c) => `${n} травмирован, пропустит ${w} ${w === 1 ? "тур" : w < 5 ? "тура" : "туров"}: выходит ${c ?? "воспитанник академии"}`, red: (n, c) => `${n} удалён, дисквалификация на матч: выходит ${c ?? "воспитанник академии"}`, derby: (r) => `Дерби с ${r}`, momentsTitle: "Моменты сезона",
  trophies: "Трофеи", cupName: "Кубок", europeName: "Европа", stage: (k, s, of) => (["Финал", "Полуфинал", "Четвертьфинал", "1/8 финала", "1/16 финала"][of - 1 - s] ?? `Раунд ${s + 1}`),
  cupWon: "Обладатель кубка!", europeWon: "Чемпион Европы!", treble: "ТРЕБЛ!", outIn: (st, o, sc) => `Вылет: ${st.toLowerCase()}, ${sc} с ${o}`, noEurope: "Финишируй в четвёрке, чтобы сыграть в Европе.", trophyCoins: (n) => `+${n} монет за трофеи`,
  awards: "Награды", goldenBootVs: (m, g, r, rg, se) => `${m} забил ${g}. Настоящий лучший бомбардир ${se}: ${r}, ${rg}.`, januarySigning: "Зимний трансфер",
  europeLeague: "Европа", europeNote: "Все пять лиг в одной жеребьёвке",
};

const fr: SeasonCopy = {
  bench: "Banc", benchHint: "Trois remplaçants : ils jouent quand quelqu'un est blessé ou suspendu.", benchSlot: "REM",
  teamTalk: "Causerie", captain: "Capitaine", chooseCaptain: "Touche un joueur pour lui donner le brassard (+4).", captainSet: (n) => `${n} porte le brassard`,
  chooseTactic: "La tactique de ton coach",
  tacticNames: { gegenpress: "Gegenpressing", catenaccio: "Catenaccio", tikitaka: "Tiki-taka", counter: "Contre-attaque", wingplay: "Jeu sur les ailes", parkbus: "Bus garé" },
  tacticNotes: { gegenpress: "Pressing haut, plus de buts, de l'espace derrière", catenaccio: "Verrouillé derrière, peu devant", tikitaka: "Le ballon et le milieu sont à toi", counter: "Bloc bas, transitions rapides", wingplay: "De la largeur et des centres pour les attaquants", parkbus: "Tout le monde derrière le ballon" },
  chemistry: "Complicité", chemLinks: (n) => `${n} ${n === 1 ? "lien" : "liens"} entre anciens coéquipiers`, chemNone: "Aucun ancien coéquipier dans ton onze : la complicité vient de joueurs qui ont partagé un vestiaire.", chemPair: (a, b, cl, se) => `${a} et ${b} · ${cl} ${se}`,
  kickOff: "Lancer la saison", firstHalf: "Phase aller", secondHalf: "Phase retour", winterBreak: "Trêve hivernale", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} pts à la trêve`,
  january: "Mercato d'hiver", januaryHint: "Une recrue : elle prend une place dans ton onze ou sur le banc, et celui qui y était est vendu à moitié prix.", januaryScout: "Voir un effectif", januaryAgain: "Un autre effectif", januaryMoney: (m) => `€${m}M à dépenser`, januaryPick: "Touche un joueur, puis sa place", januaryPlace: (n) => `Où joue ${n} ?`,
  januaryDone: (i, o, r) => (o ? `${i} arrive, ${o} part (+€${r}M)` : `${i} recruté`), januaryNone: "Pas de recrue cet hiver", secondTactic: "Tactique pour la phase retour", playSecondHalf: "Jouer la phase retour",
  injury: (n, w, c) => `${n} blessé, absent ${w} ${w === 1 ? "semaine" : "semaines"} : ${c ?? "un jeune du centre"} le remplace`, red: (n, c) => `${n} expulsé, suspendu un match : ${c ?? "un jeune du centre"} le remplace`, derby: (r) => `Jour de derby contre ${r}`, momentsTitle: "Les moments de la saison",
  trophies: "Trophées", cupName: "Coupe", europeName: "Europe", stage: (k, s, of) => (["Finale", "Demi-finale", "Quart de finale", "Huitième de finale", "Seizième de finale"][of - 1 - s] ?? `Tour ${s + 1}`),
  cupWon: "Vainqueur de la coupe !", europeWon: "Champion d'Europe !", treble: "TRIPLÉ !", outIn: (st, o, sc) => `Éliminé en ${st.toLowerCase()} : ${sc} contre ${o}`, noEurope: "Termine dans les quatre premiers pour jouer en Europe.", trophyCoins: (n) => `+${n} pièces pour les trophées`,
  awards: "Récompenses", goldenBootVs: (m, g, r, rg, se) => `${m} a marqué ${g} buts. Le vrai meilleur buteur ${se} : ${r} avec ${rg}.`, januarySigning: "Recrue d'hiver",
  europeLeague: "Europe", europeNote: "Les cinq ligues dans un seul tirage",
};

const el: SeasonCopy = {
  bench: "Πάγκος", benchHint: "Τρεις αναπληρωματικοί: παίζουν όταν κάποιος τραυματιστεί ή αποβληθεί.", benchSlot: "ΑΝΑ",
  teamTalk: "Ομιλία στα αποδυτήρια", captain: "Αρχηγός", chooseCaptain: "Πάτα έναν παίκτη για να του δώσεις το περιβραχιόνιο (+4).", captainSet: (n) => `Το περιβραχιόνιο το φοράει ο ${n}`,
  chooseTactic: "Η τακτική του προπονητή σου",
  tacticNames: { gegenpress: "Γκέγκενπρες", catenaccio: "Κατενάτσιο", tikitaka: "Τίκι-τάκα", counter: "Αντεπίθεση", wingplay: "Παιχνίδι στα άκρα", parkbus: "Πούλμαν" },
  tacticNotes: { gegenpress: "Ψηλό πρέσινγκ, περισσότερα γκολ, κενά πίσω", catenaccio: "Κλειστή άμυνα, λίγα μπροστά", tikitaka: "Η μπάλα και η μεσαία γραμμή είναι δικές σου", counter: "Χαμηλά και γρήγορη μετάβαση", wingplay: "Πλάτος και σέντρες για τους επιθετικούς", parkbus: "Όλοι πίσω από την μπάλα" },
  chemistry: "Χημεία", chemLinks: (n) => `${n} ${n === 1 ? "δεσμός" : "δεσμοί"} πρώην συμπαικτών`, chemNone: "Δεν υπάρχουν πρώην συμπαίκτες στην ενδεκάδα σου: η χημεία έρχεται από παίκτες που μοιράστηκαν αποδυτήρια.", chemPair: (a, b, cl, se) => `${a} & ${b} · ${cl} ${se}`,
  kickOff: "Ξεκίνα τη σεζόν", firstHalf: "Πρώτος γύρος", secondHalf: "Δεύτερος γύρος", winterBreak: "Χειμερινή διακοπή", halfRecord: (w, d, l, p) => `${w}–${d}–${l} · ${p} βαθμοί στη διακοπή`,
  january: "Μεταγραφική περίοδος Ιανουαρίου", januaryHint: "Μία μεταγραφή: παίρνει μια θέση στην ενδεκάδα ή στον πάγκο, κι όποιος ήταν εκεί πουλιέται στη μισή τιμή.", januaryScout: "Δες ένα ρόστερ", januaryAgain: "Άλλο ρόστερ", januaryMoney: (m) => `€${m}M για ξόδεμα`, januaryPick: "Πάτα έναν παίκτη και μετά τη θέση του", januaryPlace: (n) => `Πού παίζει ο ${n};`,
  januaryDone: (i, o, r) => (o ? `Έρχεται ο ${i}, φεύγει ο ${o} (+€${r}M)` : `Υπογραφή: ${i}`), januaryNone: "Καμία μεταγραφή τον Ιανουάριο", secondTactic: "Τακτική για τον δεύτερο γύρο", playSecondHalf: "Παίξε τον δεύτερο γύρο",
  injury: (n, w, c) => `Ο ${n} τραυματίστηκε, εκτός για ${w} ${w === 1 ? "εβδομάδα" : "εβδομάδες"}: μπαίνει ${c ?? "ένας παίκτης ακαδημίας"}`, red: (n, c) => `Ο ${n} αποβλήθηκε, τιμωρία ενός αγώνα: μπαίνει ${c ?? "ένας παίκτης ακαδημίας"}`, derby: (r) => `Ντέρμπι με ${r}`, momentsTitle: "Οι στιγμές της σεζόν",
  trophies: "Τρόπαια", cupName: "Κύπελλο", europeName: "Ευρώπη", stage: (k, s, of) => (["Τελικός", "Ημιτελικός", "Προημιτελικός", "Φάση των 16", "Φάση των 32"][of - 1 - s] ?? `Γύρος ${s + 1}`),
  cupWon: "Κυπελλούχος!", europeWon: "Πρωταθλητής Ευρώπης!", treble: "ΤΡΕΜΠΛ!", outIn: (st, o, sc) => `Αποκλεισμός στον ${st.toLowerCase()}: ${sc} με ${o}`, noEurope: "Τερμάτισε στην πρώτη τετράδα για να παίξεις στην Ευρώπη.", trophyCoins: (n) => `+${n} νομίσματα για τρόπαια`,
  awards: "Βραβεία", goldenBootVs: (m, g, r, rg, se) => `Ο ${m} σκόραρε ${g}. Ο πραγματικός πρώτος σκόρερ της ${se}: ${r} με ${rg}.`, januarySigning: "Μεταγραφή Ιανουαρίου",
  europeLeague: "Ευρώπη", europeNote: "Και τα πέντε πρωταθλήματα σε μία κλήρωση",
};

export const SEASON_COPY = { en, es, tr, ka, pt, de, ru, fr, el } as const;
