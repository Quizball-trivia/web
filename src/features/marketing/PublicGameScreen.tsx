import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { SeoPageLocale } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { engineEmitsEvents, findPublicGameByModeId, publicGamePath, relatedPublishedGames, type PublicGame } from "@/lib/seo/public-games";
import { PublicCardGrid, PublicPageFrame } from "./public/PublicCards";
import { PublicGameEmbed } from "./public/PublicGameEmbed";
import { PlayNowLink } from "./public/PlayNowLink";
import { BuscaminasBanner } from "./public/BuscaminasBanner";
import { DeferredWordDailyBoard } from "./public/DeferredWordDailyBoard";
import { SignInLink } from "./public/PublicLinks";
import { PublicPageBoard } from "./public/PublicPageBoard";

const L: Record<SeoPageLocale, { compete: string; competeText: string; howTo: string; details: string; related: string; all: string; account: string; accountText: string; start: string; note: string; exit: string; guest: string; guestDaily: string; startDaily: string; accountDaily: string; coinLabel: string; coinStart: string; coinNote: string; coinAccountText: string; member: string; english: string; noteDaily: string; loading: string; sampleFallback: string; accountTextDaily: string; playNow: string; playNowLabel: string; playNowNote: string; training: string; trainingText: string; ranked: string; rankedText: string; samePhone: string }> = {
  en: { compete: "Play online", competeText: "Sign up to play real opponents online, earn ranked points and get on the leaderboards.", howTo: "How to play", details: "Rules and details", related: "Related games", all: "All football games", account: "Play the real thing", accountText: "The practice round above is a sample. Sign in to play today's real game, keep your results and earn coins.", start: "Play training", note: "No account needed. Sample content, bot opponents where relevant, virtual points only, nothing is saved.", exit: "Exit practice", guest: "Guest practice", guestDaily: "Sneak peek", startDaily: "Try the game", accountDaily: "Play for coins", member: "Play", english: "The practice round is in English for now.", noteDaily: "A fixed sample round, the same every day. No account needed; your sample score isn't saved.", accountTextDaily: "Sign in to play today's real challenge for coins and keep your streak.", loading: "Loading today's set…", sampleFallback: "Sample round (today's set could not be loaded)" , coinLabel: "Sneak peek · 1,000 practice coins", coinStart: "Try the game", coinNote: "A fixed sample with sample odds and practice coins. No account rewards; nothing is saved.", coinAccountText: "Sign in to stake real coins from your wallet, with the live odds and the day's leaderboards.", playNow: "Play now", playNowLabel: "Quick match", playNowNote: "No account needed. Jump straight into a match; nothing counts toward the rankings.", training: "Play training", trainingText: "Learn the rules in a short guided round before you play.", ranked: "Play ranked", rankedText: "Sign up to earn ranked points and get on the leaderboard.", samePhone: "Two players on this phone" },
  tr: { compete: "Çevrimiçi oyna", competeText: "Kaydol, çevrimiçi gerçek rakiplerle oyna, dereceli puan kazan ve liderlik tablolarına gir.", howTo: "Nasıl oynanır", details: "Kurallar ve ayrıntılar", related: "Benzer oyunlar", all: "Tüm futbol oyunları", account: "Gerçeğini oyna", accountText: "Yukarıdaki alıştırma turu bir örnektir. Bugünün gerçek oyununu oynamak, sonuçlarını saklamak ve jeton kazanmak için giriş yap.", start: "Antrenmanı oyna", note: "Hesap gerekmez. Örnek içerik, gerektiğinde bot rakipler, yalnızca sanal puan, hiçbir şey kaydedilmez.", exit: "Alıştırmadan çık", guest: "Misafir alıştırması", guestDaily: "Ön izleme", startDaily: "Oyunu dene", accountDaily: "Jeton için oyna", member: "Oyna", english: "Alıştırma turu şimdilik İngilizce.", noteDaily: "Her gün aynı olan sabit bir örnek tur. Hesap gerekmez; örnek puanın kaydedilmez.", accountTextDaily: "Bugünün gerçek görevini jeton için oynamak ve serini korumak için giriş yap.", loading: "Bugünün seti yükleniyor…", sampleFallback: "Örnek tur (bugünün seti yüklenemedi)" , coinLabel: "Ön izleme · 1.000 alıştırma jetonu", coinStart: "Oyunu dene", coinNote: "Örnek oranlar ve alıştırma jetonlarıyla sabit bir örnek. Hesap ödülü yok; hiçbir şey kaydedilmez.", coinAccountText: "Cüzdanından gerçek jeton yatırmak, canlı oranlar ve günün liderlik tablolarıyla oynamak için giriş yap.", playNow: "Hemen oyna", playNowLabel: "Hızlı maç", playNowNote: "Hesap gerekmez. Doğrudan bir maça gir; hiçbir şey sıralamaya sayılmaz.", training: "Antrenmanı oyna", trainingText: "Oynamadan önce kısa bir rehberli turda kuralları öğren.", ranked: "Dereceli oyna", rankedText: "Kaydol, dereceli puan kazan ve liderlik tablosuna gir.", samePhone: "Bu telefonda iki kişi" },
  ru: { compete: "Играй онлайн", competeText: "Зарегистрируйся, играй онлайн с реальными соперниками, зарабатывай рейтинговые очки и попадай в таблицы лидеров.", howTo: "Как играть", details: "Правила и подробности", related: "Похожие игры", all: "Все футбольные игры", account: "Играй по-настоящему", accountText: "Раунд тренировки выше — это пример. Войди, чтобы сыграть в сегодняшнюю настоящую игру, сохранить результаты и заработать монеты.", start: "Играть в тренировку", note: "Аккаунт не нужен. Пример контента, где нужно — соперники-боты, только виртуальные очки, прогресс не сохраняется.", exit: "Выйти из тренировки", guest: "Тренировка гостем", guestDaily: "Попробуй", startDaily: "Попробовать игру", accountDaily: "Играй за монеты", member: "Играть", english: "Пока раунд тренировки доступен только на английском.", noteDaily: "Один и тот же пример раунда каждый день. Аккаунт не нужен; результат не сохранится.", accountTextDaily: "Войди, чтобы пройти сегодняшнее настоящее испытание за монеты и сохранить серию.", loading: "Загружаем сегодняшний набор…", sampleFallback: "Пример раунда (не удалось загрузить сегодняшний набор)" , coinLabel: "Попробуй · 1 000 тренировочных монет", coinStart: "Попробовать игру", coinNote: "Постоянный пример с примерными коэффициентами и тренировочными монетами. Наград за аккаунт нет, прогресс не сохраняется.", coinAccountText: "Войди, чтобы играть на реальные монеты из кошелька, использовать актуальные коэффициенты и попасть в сегодняшний рейтинг.", playNow: "Играть сейчас", playNowLabel: "Быстрый матч", playNowNote: "Аккаунт не нужен. Сразу начинай матч — он не повлияет на рейтинг.", training: "Играть в тренировку", trainingText: "Изучи правила в коротком раунде с подсказками перед игрой.", ranked: "Играть в рейтинговом режиме", rankedText: "Зарегистрируйся, чтобы зарабатывать рейтинговые очки и попасть в рейтинг.", samePhone: "Два игрока на одном телефоне" },
  pt: { compete: "Jogue online", competeText: "Cadastre-se para jogar online contra adversários reais, ganhar pontos no ranking e subir nas classificações.", howTo: "Como jogar", details: "Regras e detalhes", related: "Jogos relacionados", all: "Todos os jogos de futebol", account: "Jogue de verdade", accountText: "A rodada de treino acima é uma amostra. Entre na sua conta para jogar a partida real de hoje, acompanhar seus resultados e ganhar moedas.", start: "Jogue o treino", note: "Não precisa de conta. Conteúdo de amostra, adversários controlados pelo jogo quando necessário, só pontos virtuais, nada é salvo.", exit: "Sair do treino", guest: "Treino como visitante", guestDaily: "Espiada", startDaily: "Experimente o jogo", accountDaily: "Jogue por moedas", member: "Jogar", english: "O treino está em inglês por enquanto.", noteDaily: "Uma rodada de amostra fixa, igual todos os dias. Não precisa de conta; sua pontuação de amostra não é salva.", accountTextDaily: "Entre na sua conta para jogar o desafio real de hoje por moedas e manter sua sequência.", loading: "Carregando o conjunto de hoje…", sampleFallback: "Rodada de amostra (não foi possível carregar o conjunto de hoje)" , coinLabel: "Espiada · 1.000 moedas de treino", coinStart: "Experimente o jogo", coinNote: "Uma amostra fixa com probabilidades de exemplo e moedas de treino. Sem recompensas na conta; nada é salvo.", coinAccountText: "Entre na sua conta para apostar moedas reais da sua carteira, com as probabilidades ao vivo e o ranking do dia.", playNow: "Jogue agora", playNowLabel: "Partida rápida", playNowNote: "Não precisa de conta. Entre direto em uma partida; ela não conta para o ranking.", training: "Jogue o treino", trainingText: "Aprenda as regras em uma rodada guiada antes de jogar.", ranked: "Jogue no modo ranqueado", rankedText: "Cadastre-se para ganhar pontos no ranking e entrar na classificação.", samePhone: "Dois jogadores neste celular" },
  de: { compete: "Online spielen", competeText: "Melde dich an, spiele online gegen echte Gegner, sammle Ranked-Punkte und steige in der Rangliste auf.", howTo: "So spielst du", details: "Regeln und Details", related: "Ähnliche Spiele", all: "Alle Fußballspiele", account: "Spiel richtig mit", accountText: "Die Trainingsrunde oben ist ein Beispiel. Melde dich an, um das echte heutige Spiel zu spielen, deine Ergebnisse zu speichern und Münzen zu sammeln.", start: "Training spielen", note: "Kein Konto nötig. Beispielinhalte, bei Bedarf Bot-Gegner, nur virtuelle Punkte, nichts wird gespeichert.", exit: "Training verlassen", guest: "Training als Gast", guestDaily: "Vorschau", startDaily: "Spiel ausprobieren", accountDaily: "Für Münzen spielen", member: "Spielen", english: "Die Trainingsrunde ist vorerst auf Englisch.", noteDaily: "Eine feste Beispielrunde, jeden Tag dieselbe. Kein Konto nötig; dein Beispielergebnis wird nicht gespeichert.", accountTextDaily: "Melde dich an, um die echte Tages-Challenge für Münzen zu spielen und deine Serie fortzusetzen.", loading: "Heutiges Set wird geladen…", sampleFallback: "Beispielrunde (heutiges Set konnte nicht geladen werden)" , coinLabel: "Vorschau · 1.000 Trainingsmünzen", coinStart: "Spiel ausprobieren", coinNote: "Ein festes Beispiel mit Beispielchancen und Trainingsmünzen. Keine Kontobelohnungen; nichts wird gespeichert.", coinAccountText: "Melde dich an, um mit echten Münzen aus deinem Guthaben zu spielen und aktuelle Chancen sowie die Rangliste des Tages zu sehen.", playNow: "Jetzt spielen", playNowLabel: "Schnelles Match", playNowNote: "Kein Konto nötig. Starte direkt ein Match; es zählt nicht für die Rangliste.", training: "Training spielen", trainingText: "Lerne die Regeln vor dem Spiel in einer kurzen geführten Runde.", ranked: "Ranked spielen", rankedText: "Melde dich an, sammle Ranked-Punkte und komm in die Rangliste.", samePhone: "Zwei Spieler auf diesem Handy" },
  es: { compete: "Juega online", competeText: "Regístrate para jugar contra rivales reales online, ganar puntos y entrar en las clasificaciones.", howTo: "Cómo jugar", details: "Reglas y detalles", related: "Juegos relacionados", all: "Todos los juegos de fútbol", account: "Juega la versión real", accountText: "La ronda de práctica de arriba es una muestra. Inicia sesión para jugar el juego real de hoy, guardar tus resultados y ganar monedas.", start: "Jugar el entrenamiento", note: "Sin cuenta. Contenido de muestra, rivales bot donde aplica, solo puntos virtuales, no se guarda nada.", exit: "Salir de la práctica", guest: "Práctica de invitado", guestDaily: "Adelanto", startDaily: "Prueba el juego", accountDaily: "Juega por monedas", member: "Jugar", english: "La ronda de práctica está en inglés por ahora.", noteDaily: "Una ronda de muestra fija, la misma cada día. Sin cuenta; tu puntuación de muestra no se guarda.", accountTextDaily: "Inicia sesión para jugar el reto real de hoy por monedas y mantener tu racha.", loading: "Cargando el set de hoy…", sampleFallback: "Ronda de muestra (no se pudo cargar el set de hoy)" , coinLabel: "Adelanto · 1.000 monedas de práctica", coinStart: "Prueba el juego", coinNote: "Una muestra fija con probabilidades de muestra y monedas de práctica. Sin recompensas de cuenta; no se guarda nada.", coinAccountText: "Inicia sesión para apostar monedas reales de tu cartera, con las probabilidades en vivo y las clasificaciones del día.", playNow: "Jugar ahora", playNowLabel: "Partida rápida", playNowNote: "Sin cuenta. Entra directamente en una partida; nada cuenta para las clasificaciones.", training: "Jugar el entrenamiento", trainingText: "Aprende las reglas en una ronda guiada corta antes de jugar.", ranked: "Jugar clasificatoria", rankedText: "Regístrate para ganar puntos de clasificación y entrar en la tabla.", samePhone: "Dos jugadores en este móvil" },
  ka: { compete: "ითამაშე ონლაინ", competeText: "დარეგისტრირდი, ითამაშე ნამდვილ მეტოქეებთან ონლაინ, დააგროვე რეიტინგული ქულები და მოხვდი ლიდერბორდზე.", howTo: "როგორ ვითამაშო", details: "წესები და დეტალები", related: "მსგავსი თამაშები", all: "ყველა საფეხბურთო თამაში", account: "ითამაშე ნამდვილი", accountText: "ზემოთ სავარჯიშო რაუნდია — ნიმუში. შედი ანგარიშში, რომ ითამაშო დღევანდელი ნამდვილი თამაში, შეინახო შედეგები და დააგროვო ქოინები.", start: "ითამაშე ვარჯიში", note: "ანგარიშის გარეშე. სანიმუშო შინაარსი, ბოტი მეტოქე სადაც საჭიროა, მხოლოდ ვირტუალური ქულები, არაფერი ინახება.", exit: "სავარჯიშოდან გასვლა", guest: "სტუმრის სავარჯიშო", guestDaily: "გასინჯე", startDaily: "სცადე თამაში", accountDaily: "ითამაშე ქოინებზე", member: "ითამაშე", english: "სავარჯიშო რაუნდი ჯერჯერობით ინგლისურადაა.", noteDaily: "ფიქსირებული სანიმუშო რაუნდი — ყოველდღე ერთი და იგივე. ანგარიში არ სჭირდება; სანიმუშო ქულა არ ინახება.", accountTextDaily: "შედი ანგარიშში, რომ დღევანდელი ნამდვილი გამოწვევა ქოინებზე ითამაშო და სერია შეინარჩუნო.", loading: "დღევანდელი ნაკრები იტვირთება…", sampleFallback: "სანიმუშო რაუნდი (დღევანდელი ნაკრები ვერ ჩაიტვირთა)" , coinLabel: "გასინჯე · 1,000 სავარჯიშო ქოინი", coinStart: "სცადე თამაში", coinNote: "ფიქსირებული ნიმუში სანიმუშო შანსებით და სავარჯიშო ქოინებით. ანგარიშის ჯილდოები არ არის; არაფერი ინახება.", coinAccountText: "შედი ანგარიშში, რომ საფულედან ნამდვილი ქოინები დადო, ცოცხალი შანსებითა და დღის ლიდერბორდებით.", playNow: "ითამაშე ახლა", playNowLabel: "სწრაფი მატჩი", playNowNote: "ანგარიშის გარეშე. პირდაპირ მატჩში შედიხარ; არაფერი ითვლება რეიტინგში.", training: "ითამაშე ვარჯიში", trainingText: "წესები მოკლე, გზამკვლევიან რაუნდში ისწავლე თამაშამდე.", ranked: "ითამაშე რეიტინგული", rankedText: "დარეგისტრირდი, დააგროვე რეიტინგული ქულები და მოხვდი ლიდერბორდზე.", samePhone: "ორი მოთამაშე ამ ტელეფონით" },
};

type FullGameCopy = { label: string; start: string; note: string; account: string; accountText: string };

/** Full daily games play the real board on their page: no "sample" or "play for coins" framing. */
const BUSCAMINAS_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { label: "New board every day · no account needed", start: "Play now", note: "20 rounds. As a guest you play yesterday's board; with an account, today's board and the leaderboard.", account: "More football games", accountText: "Create an account to play Tic Tac Toe, Auction and ranked matches against real opponents, and earn coins." },
  ka: { label: "ყოველდღე ახალი დაფა · ანგარიშის გარეშე", start: "თამაში", note: "20 რაუნდი. სტუმრად გუშინდელ დაფას თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს.", account: "მეტი საფეხბურთო თამაში", accountText: "შექმენი ანგარიში, ითამაშე Tic Tac Toe, აუქციონი და რეიტინგული მატჩები ნამდვილ მეტოქეებთან და დააგროვე ქოინები." },
  es: { label: "Tablero nuevo cada día · sin cuenta", start: "Jugar ahora", note: "20 rondas. Sin cuenta jugás el tablero de ayer; con cuenta, el de hoy y el ranking.", account: "Más juegos de fútbol", accountText: "Creá tu cuenta para jugar el Tic Tac Toe futbolero, la Subasta futbolera y ¿Quién sabe más de fútbol? 1v1 contra rivales reales, y ganar monedas." },
  tr: { label: "Her gün yeni tahta · hesap gerekmez", start: "Oyna", note: "20 tur. Misafir olarak dünün tahtasını oynarsın; hesapla bugününkünü ve sıralamayı.", account: "Daha fazla futbol oyunu", accountText: "Futbol XOX, Açık Artırma ve gerçek rakiplere karşı dereceli maçlar oynamak ve jeton kazanmak için hesap oluştur." },
  ru: { label: "Новая доска каждый день · аккаунт не нужен", start: "Играть сейчас", note: "20 раундов. Гость играет на вчерашней доске, а с аккаунтом доступны сегодняшняя доска и рейтинг.", account: "Больше футбольных игр", accountText: "Создай аккаунт, чтобы играть в крестики-нолики, аукцион и рейтинговые матчи 1 на 1 с реальными соперниками и зарабатывать монеты." },
  pt: { label: "Tabuleiro novo todo dia · sem precisar de conta", start: "Jogue agora", note: "20 rodadas. Como visitante, você joga no tabuleiro de ontem; com uma conta, no de hoje e no ranking.", account: "Mais jogos de futebol", accountText: "Crie uma conta para jogar Jogo da velha de futebol, Leilão de jogadores e partidas ranqueadas contra adversários reais e ganhar moedas." },
  de: { label: "Jeden Tag ein neues Spielfeld · kein Konto nötig", start: "Jetzt spielen", note: "20 Runden. Als Gast spielst du das Spielfeld von gestern; mit Konto spielst du das heutige und siehst die Rangliste.", account: "Mehr Fußballspiele", accountText: "Erstelle ein Konto, um Fußball Tic Tac Toe, die Fußball-Auktion und Ranked gegen echte Gegner zu spielen und Münzen zu sammeln." },
};

const PISTAS_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { label: "10 new players every day · no account needed", start: "Play now", note: "10 players, 10 clues each. As a guest you play past days; with an account, today's clues and the leaderboard.", account: "More football games", accountText: "Create an account to play Tic Tac Toe, Auction and ranked matches against real opponents, and earn coins." },
  ka: { label: "ყოველდღე 10 ახალი მოთამაშე · ანგარიშის გარეშე", start: "თამაში", note: "10 მოთამაშე, თითოეულს 10 მინიშნება. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს.", account: "მეტი საფეხბურთო თამაში", accountText: "შექმენი ანგარიში, ითამაშე Tic Tac Toe, აუქციონი და რეიტინგული მატჩები ნამდვილ მეტოქეებთან და დააგროვე ქოინები." },
  es: { label: "10 jugadores nuevos cada día · sin cuenta", start: "Jugar ahora", note: "10 jugadores, 10 pistas cada uno. Sin cuenta jugás los días anteriores; con cuenta, las pistas de hoy y el ranking.", account: "Más juegos de fútbol", accountText: "Creá tu cuenta para jugar el Tic Tac Toe futbolero, la Subasta futbolera y ¿Quién sabe más de fútbol? 1v1 contra rivales reales, y ganar monedas." },
  tr: { label: "Her gün 10 yeni oyuncu · hesap gerekmez", start: "Oyna", note: "10 oyuncu, her birine 10 ipucu. Misafir olarak önceki günleri oynarsın; hesapla bugünün ipuçlarını ve sıralamayı.", account: "Daha fazla futbol oyunu", accountText: "Futbol XOX, Açık Artırma ve gerçek rakiplere karşı dereceli maçlar oynamak ve jeton kazanmak için hesap oluştur." },
  ru: { label: "10 новых игроков каждый день · аккаунт не нужен", start: "Играть сейчас", note: "10 игроков, по 10 подсказок на каждого. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние подсказки и рейтинг.", account: "Больше футбольных игр", accountText: "Создай аккаунт, чтобы играть в крестики-нолики, аукцион и рейтинговые матчи 1 на 1 с реальными соперниками и зарабатывать монеты." },
  pt: { label: "10 jogadores novos todo dia · sem precisar de conta", start: "Jogue agora", note: "10 jogadores, 10 dicas para cada um. Como visitante, você joga os dias anteriores; com uma conta, vê as dicas de hoje e entra no ranking.", account: "Mais jogos de futebol", accountText: "Crie uma conta para jogar Jogo da velha de futebol, Leilão de jogadores e partidas ranqueadas contra adversários reais e ganhar moedas." },
  de: { label: "Jeden Tag 10 neue Spieler · kein Konto nötig", start: "Jetzt spielen", note: "10 Spieler, je 10 Hinweise. Als Gast spielst du frühere Tage; mit Konto siehst du die Hinweise von heute und die Rangliste.", account: "Mehr Fußballspiele", accountText: "Erstelle ein Konto, um Fußball Tic Tac Toe, die Fußball-Auktion und Ranked gegen echte Gegner zu spielen und Münzen zu sammeln." },
};

const ULTIMO_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { label: "5 new categories every day · no account needed", start: "Play now", note: "5 lists, one shrinking clock. As a guest you play past days; with an account, today's categories and the leaderboard.", account: "More football games", accountText: "Create an account to play Tic Tac Toe, Auction and ranked matches against real opponents, and earn coins." },
  ka: { label: "ყოველდღე 5 ახალი კატეგორია · ანგარიშის გარეშე", start: "თამაში", note: "5 სია და მცირდებადი საათი. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს.", account: "მეტი საფეხბურთო თამაში", accountText: "შექმენი ანგარიში, ითამაშე Tic Tac Toe, აუქციონი და რეიტინგული მატჩები ნამდვილ მეტოქეებთან და დააგროვე ქოინები." },
  es: { label: "5 categorías nuevas cada día · sin cuenta", start: "Jugar ahora", note: "5 listas y un reloj que se acorta. Sin cuenta jugás los días anteriores; con cuenta, las categorías de hoy y el ranking.", account: "Más juegos de fútbol", accountText: "Creá tu cuenta para jugar el Tic Tac Toe futbolero, la Subasta futbolera y ¿Quién sabe más de fútbol? 1v1 contra rivales reales, y ganar monedas." },
  tr: { label: "Her gün 5 yeni kategori · hesap gerekmez", start: "Oyna", note: "5 liste, kısalan bir süre. Misafir olarak önceki günleri oynarsın; hesapla bugünün kategorilerini ve sıralamayı.", account: "Daha fazla futbol oyunu", accountText: "Futbol XOX, Açık Artırma ve gerçek rakiplere karşı dereceli maçlar oynamak ve jeton kazanmak için hesap oluştur." },
  ru: { label: "5 новых категорий каждый день · аккаунт не нужен", start: "Играть сейчас", note: "5 списков и таймер, который отсчитывает время. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние категории и рейтинг.", account: "Больше футбольных игр", accountText: "Создай аккаунт, чтобы играть в крестики-нолики, аукцион и рейтинговые матчи 1 на 1 с реальными соперниками и зарабатывать монеты." },
  pt: { label: "5 categorias novas todo dia · sem precisar de conta", start: "Jogue agora", note: "5 listas e um cronômetro regressivo. Como visitante, você joga os dias anteriores; com uma conta, acessa as categorias de hoje e o ranking.", account: "Mais jogos de futebol", accountText: "Crie uma conta para jogar Jogo da velha de futebol, Leilão de jogadores e partidas ranqueadas contra adversários reais e ganhar moedas." },
  de: { label: "Jeden Tag 5 neue Kategorien · kein Konto nötig", start: "Jetzt spielen", note: "5 Listen und ein Countdown. Als Gast spielst du frühere Tage; mit Konto siehst du die heutigen Kategorien und die Rangliste.", account: "Mehr Fußballspiele", accountText: "Erstelle ein Konto, um Fußball Tic Tac Toe, die Fußball-Auktion und Ranked gegen echte Gegner zu spielen und Münzen zu sammeln." },
};

const MINUTO_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { label: "10 famous goals every day · no account needed", start: "Play now", note: "Guess the minute of 10 famous goals. As a guest you play past days; with an account, today's goals and the leaderboard.", account: "More football games", accountText: "Create an account to play Tic Tac Toe, Auction and ranked matches against real opponents, and earn coins." },
  ka: { label: "ყოველდღე 10 ცნობილი გოლი · ანგარიშის გარეშე", start: "თამაში", note: "გამოიცანი 10 ცნობილი გოლის წუთი. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს.", account: "მეტი საფეხბურთო თამაში", accountText: "შექმენი ანგარიში, ითამაშე Tic Tac Toe, აუქციონი და რეიტინგული მატჩები ნამდვილ მეტოქეებთან და დააგროვე ქოინები." },
  es: { label: "10 goles famosos cada día · sin cuenta", start: "Jugar ahora", note: "Adiviná el minuto de 10 goles famosos. Sin cuenta jugás los días anteriores; con cuenta, los goles de hoy y el ranking.", account: "Más juegos de fútbol", accountText: "Creá tu cuenta para jugar el Tic Tac Toe futbolero, la Subasta futbolera y ¿Quién sabe más de fútbol? 1v1 contra rivales reales, y ganar monedas." },
  tr: { label: "Her gün 10 ünlü gol · hesap gerekmez", start: "Oyna", note: "10 ünlü golün dakikasını tahmin et. Misafir olarak önceki günleri oynarsın; hesapla bugünün gollerini ve sıralamayı.", account: "Daha fazla futbol oyunu", accountText: "Futbol XOX, Açık Artırma ve gerçek rakiplere karşı dereceli maçlar oynamak ve jeton kazanmak için hesap oluştur." },
  ru: { label: "10 знаменитых голов каждый день · аккаунт не нужен", start: "Играть сейчас", note: "Угадай минуту 10 знаменитых голов. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние голы и рейтинг.", account: "Больше футбольных игр", accountText: "Создай аккаунт, чтобы играть в крестики-нолики, аукцион и рейтинговые матчи 1 на 1 с реальными соперниками и зарабатывать монеты." },
  pt: { label: "10 gols famosos todo dia · sem precisar de conta", start: "Jogue agora", note: "Adivinhe o minuto de 10 gols famosos. Como visitante, você joga os dias anteriores; com uma conta, acessa os gols de hoje e o ranking.", account: "Mais jogos de futebol", accountText: "Crie uma conta para jogar Jogo da velha de futebol, Leilão de jogadores e partidas ranqueadas contra adversários reais e ganhar moedas." },
  de: { label: "Jeden Tag 10 berühmte Tore · kein Konto nötig", start: "Jetzt spielen", note: "Errate die Minute von 10 berühmten Toren. Als Gast spielst du frühere Tage; mit Konto siehst du die Tore von heute und die Rangliste.", account: "Mehr Fußballspiele", accountText: "Erstelle ein Konto, um Fußball Tic Tac Toe, die Fußball-Auktion und Ranked gegen echte Gegner zu spielen und Münzen zu sammeln." },
};

const STAT_SNIPER_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...MINUTO_PAGE.en, label: "10 new football numbers every day · no account needed", note: "10 real football numbers. As a guest you play today's; with an account your score goes on the leaderboard." },
  ka: { ...MINUTO_PAGE.ka, label: "ყოველდღე ფეხბურთის 10 ახალი რიცხვი · ანგარიშის გარეშე", note: "ფეხბურთის 10 ნამდვილი რიცხვი. სტუმრად დღევანდელს თამაშობ; ანგარიშით შენი ქულა რეიტინგში ხვდება." },
  es: { ...MINUTO_PAGE.es, label: "10 cifras nuevas del fútbol cada día · sin cuenta", note: "10 cifras reales del fútbol. Sin cuenta jugás las de hoy; con cuenta, tu puntaje entra al ranking." },
  tr: { ...MINUTO_PAGE.tr, label: "Her gün 10 yeni futbol sayısı · hesap gerekmez", note: "10 gerçek futbol sayısı. Misafir olarak bugününkünü oynarsın; hesapla puanın sıralamaya girer." },
  ru: { ...MINUTO_PAGE.ru, label: "10 новых футбольных чисел каждый день · аккаунт не нужен", note: "10 настоящих футбольных чисел. Гость играет в сегодняшний выпуск, а с аккаунтом результат попадёт в рейтинг." },
  pt: { ...MINUTO_PAGE.pt, label: "10 novos números do futebol todo dia · sem precisar de conta", note: "10 números reais do futebol. Como visitante, você joga o desafio de hoje; com uma conta, sua pontuação entra no ranking." },
  de: { ...MINUTO_PAGE.de, label: "Jeden Tag 10 neue Fußballzahlen · kein Konto nötig", note: "10 echte Fußballzahlen. Als Gast spielst du die heutige Ausgabe; mit Konto kommt dein Ergebnis in die Rangliste." },
};

const SHARED_PLAYER_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...ULTIMO_PAGE.en, label: "10 new club pairs every day · no account needed", note: "10 pairs, 20 seconds each. As a guest you play past days; with an account, today's pairs and the leaderboard." },
  ka: { ...ULTIMO_PAGE.ka, label: "ყოველდღე 10 ახალი წყვილი · ანგარიშის გარეშე", note: "10 წყვილი, თითოზე 20 წამი. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...ULTIMO_PAGE.es, label: "10 pares de clubes nuevos cada día · sin cuenta", note: "10 pares, 20 segundos cada uno. Sin cuenta jugás los días anteriores; con cuenta, los pares de hoy y el ranking." },
  tr: { ...ULTIMO_PAGE.tr, label: "Her gün 10 yeni eşleşme · hesap gerekmez", note: "10 eşleşme, her biri 20 saniye. Misafir olarak önceki günleri oynarsın; hesapla bugünün eşleşmelerini ve sıralamayı." },
  ru: { ...ULTIMO_PAGE.ru, label: "10 новых пар клубов каждый день · аккаунт не нужен", note: "10 пар, по 20 секунд на каждую. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние пары и рейтинг." },
  pt: { ...ULTIMO_PAGE.pt, label: "10 novos pares de times todo dia · sem precisar de conta", note: "10 pares, 20 segundos para cada um. Como visitante, você joga os dias anteriores; com uma conta, acessa os pares de hoje e o ranking." },
  de: { ...ULTIMO_PAGE.de, label: "Jeden Tag 10 neue Vereinspaare · kein Konto nötig", note: "10 Paare, je 20 Sekunden. Als Gast spielst du frühere Tage; mit Konto siehst du die Paare von heute und die Rangliste." },
};

const NAME_CHAIN_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...ULTIMO_PAGE.en, label: "3 new chains every day · no account needed", note: "3 chains, 10 seconds per name. As a guest you play past days; with an account, today's chains and the leaderboard." },
  ka: { ...ULTIMO_PAGE.ka, label: "ყოველდღე 3 ახალი ჯაჭვი · ანგარიშის გარეშე", note: "3 ჯაჭვი, თითო სახელზე 10 წამი. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...ULTIMO_PAGE.es, label: "3 cadenas nuevas cada día · sin cuenta", note: "3 cadenas, 10 segundos por nombre. Sin cuenta jugás los días anteriores; con cuenta, las cadenas de hoy y el ranking." },
  tr: { ...ULTIMO_PAGE.tr, label: "Her gün 3 yeni zincir · hesap gerekmez", note: "3 zincir, her isim için 10 saniye. Misafir olarak önceki günleri oynarsın; hesapla bugünün zincirlerini ve sıralamayı." },
  ru: { ...ULTIMO_PAGE.ru, label: "3 новые цепочки каждый день · аккаунт не нужен", note: "3 цепочки, по 10 секунд на имя. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние цепочки и рейтинг." },
  pt: { ...ULTIMO_PAGE.pt, label: "3 novas sequências todo dia · sem precisar de conta", note: "3 sequências, 10 segundos por nome. Como visitante, você joga os dias anteriores; com uma conta, acessa as sequências de hoje e o ranking." },
  de: { ...ULTIMO_PAGE.de, label: "Jeden Tag 3 neue Ketten · kein Konto nötig", note: "3 Ketten, 10 Sekunden pro Name. Als Gast spielst du frühere Tage; mit Konto siehst du die Ketten von heute und die Rangliste." },
};

const FOOTBALL_HORSERACE_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...NAME_CHAIN_PAGE.en, label: "A new race every day · no account needed", start: "Play now", note: "Your nation against three. As a guest you play past days; with an account, today's race and the leaderboard." },
  ka: { ...NAME_CHAIN_PAGE.ka, label: "ყოველდღე ახალი დოღი · ანგარიშის გარეშე", start: "თამაში", note: "შენი ნაკრები სამის წინააღმდეგ. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...NAME_CHAIN_PAGE.es, label: "Una carrera nueva cada día · sin cuenta", start: "Jugar ahora", note: "Tu selección contra tres. Sin cuenta jugás los días anteriores; con cuenta, la carrera de hoy y el ranking." },
  tr: { ...NAME_CHAIN_PAGE.tr, label: "Her gün yeni bir yarış · hesap gerekmez", start: "Oyna", note: "Milli takımın üç rakibe karşı. Misafir olarak önceki günleri oynarsın; hesapla bugünün yarışını ve sıralamayı." },
  ru: { ...NAME_CHAIN_PAGE.ru, label: "Новая гонка каждый день · аккаунт не нужен", start: "Играть сейчас", note: "Твоя сборная против трёх. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшняя гонка и рейтинг." },
  pt: { ...NAME_CHAIN_PAGE.pt, label: "Uma nova corrida todo dia · sem precisar de conta", start: "Jogue agora", note: "Sua seleção contra outras três. Como visitante, você joga os dias anteriores; com uma conta, acessa a corrida de hoje e o ranking." },
  de: { ...NAME_CHAIN_PAGE.de, label: "Jeden Tag ein neues Rennen · kein Konto nötig", start: "Jetzt spielen", note: "Deine Nationalmannschaft gegen drei andere. Als Gast spielst du frühere Tage; mit Konto spielst du das heutige Rennen und siehst die Rangliste." },
};

const FOOTBALL_CODENAMES_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...NAME_CHAIN_PAGE.en, label: "A new board every day · no account needed", start: "Play now", note: "Pictures: 20 cards, 3 clues, 8 to find. Words: a new 25-word board every time. As a guest you play past days; with an account, today's board and the leaderboard." },
  ka: { ...NAME_CHAIN_PAGE.ka, label: "ყოველდღე ახალი დაფა · ანგარიშის გარეშე", start: "თამაში", note: "სურათები: 20 ბარათი, 3 მინიშნება, 8 საპოვნი. სიტყვები: ყოველ ჯერზე ახალი დაფა 25 სიტყვით. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...NAME_CHAIN_PAGE.es, label: "Un tablero nuevo cada día · sin cuenta", start: "Jugar ahora", note: "Imágenes: 20 cartas, 3 pistas, 8 para encontrar. Palabras: un tablero nuevo de 25 palabras cada vez. Sin cuenta jugás los días anteriores; con cuenta, el tablero de hoy y el ranking." },
  tr: { ...NAME_CHAIN_PAGE.tr, label: "Her gün yeni bir tahta · hesap gerekmez", start: "Oyna", note: "Resimler: 20 kart, 3 ipucu, bulunacak 8 kart. Kelimeler: her seferinde 25 kelimelik yeni tahta. Misafir olarak önceki günleri oynarsın; hesapla bugünün tahtasını ve sıralamayı." },
  ru: { ...NAME_CHAIN_PAGE.ru, label: "Новое поле каждый день · аккаунт не нужен", start: "Играть сейчас", note: "Картинки: 20 карточек, 3 подсказки, 8 нужно найти. Слова: каждый раз новое поле из 25 слов. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшнее поле и рейтинг." },
  pt: { ...NAME_CHAIN_PAGE.pt, label: "Um tabuleiro novo todo dia · sem precisar de conta", start: "Jogue agora", note: "Imagens: 20 cartas, 3 dicas, encontre 8. Palavras: um tabuleiro novo de 25 palavras a cada vez. Como visitante, você joga os dias anteriores; com uma conta, acessa o tabuleiro de hoje e o ranking." },
  de: { ...NAME_CHAIN_PAGE.de, label: "Jeden Tag ein neues Spielfeld · kein Konto nötig", start: "Jetzt spielen", note: "Bilder: 20 Karten, 3 Hinweise, 8 zu finden. Wörter: jedes Mal ein neues Spielfeld mit 25 Wörtern. Als Gast spielst du frühere Tage; mit Konto spielst du das heutige Spielfeld und siehst die Rangliste." },
};

const DATO_FALSO_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...NAME_CHAIN_PAGE.en, label: "10 new cards every day · no account needed", start: "Play now", note: "One footballer, five facts, one fake. As a guest you play past days; with an account, today's cards and the leaderboard." },
  ka: { ...NAME_CHAIN_PAGE.ka, label: "ყოველდღე 10 ახალი ბარათი · ანგარიშის გარეშე", start: "თამაში", note: "ერთი ფეხბურთელი, ხუთი ფაქტი, ერთი ყალბი. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელ ბარათებს და რეიტინგს." },
  es: { ...NAME_CHAIN_PAGE.es, label: "10 cartas nuevas cada día · sin cuenta", start: "Jugar ahora", note: "Un futbolista, cinco datos, uno falso. Sin cuenta jugás los días anteriores; con cuenta, las cartas de hoy y el ranking." },
  tr: { ...NAME_CHAIN_PAGE.tr, label: "Her gün 10 yeni kart · hesap gerekmez", start: "Oyna", note: "Bir futbolcu, beş bilgi, biri yanlış. Misafir olarak önceki günleri oynarsın; hesapla bugünün kartlarını ve sıralamayı." },
  ru: { ...NAME_CHAIN_PAGE.ru, label: "10 новых карточек каждый день · аккаунт не нужен", start: "Играть сейчас", note: "Один футболист, пять фактов, один ложный. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшние карточки и рейтинг." },
  pt: { ...NAME_CHAIN_PAGE.pt, label: "10 cartas novas todo dia · sem precisar de conta", start: "Jogue agora", note: "Um jogador de futebol, cinco fatos, um falso. Como visitante, você joga os dias anteriores; com uma conta, acessa as cartas de hoje e o ranking." },
  de: { ...NAME_CHAIN_PAGE.de, label: "Jeden Tag 10 neue Karten · kein Konto nötig", start: "Jetzt spielen", note: "Ein Fußballer, fünf Fakten, einer davon ist falsch. Als Gast spielst du frühere Tage; mit Konto siehst du die Karten von heute und die Rangliste." },
};

const CONEXIONES_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...NAME_CHAIN_PAGE.en, label: "A new board every day · no account needed", start: "Play now", note: "16 footballers, 4 hidden links. As a guest you play past boards; with an account, today's board and the leaderboard." },
  ka: { ...NAME_CHAIN_PAGE.ka, label: "ყოველდღე ახალი დაფა · ანგარიშის გარეშე", start: "თამაში", note: "16 ფეხბურთელი, 4 დამალული კავშირი. სტუმრად წინა დაფებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...NAME_CHAIN_PAGE.es, label: "Un tablero nuevo cada día · sin cuenta", start: "Jugar ahora", note: "16 futbolistas, 4 conexiones ocultas. Sin cuenta jugás los tableros anteriores; con cuenta, el tablero de hoy y el ranking." },
  tr: { ...NAME_CHAIN_PAGE.tr, label: "Her gün yeni bir tahta · hesap gerekmez", start: "Oyna", note: "16 futbolcu, 4 gizli bağlantı. Misafir olarak önceki tahtaları oynarsın; hesapla bugünün tahtasını ve sıralamayı." },
  ru: { ...NAME_CHAIN_PAGE.ru, label: "Новое поле каждый день · аккаунт не нужен", start: "Играть сейчас", note: "16 футболистов, 4 скрытые связи. Гость играет за прошлые поля, а с аккаунтом доступны сегодняшнее поле и рейтинг." },
  pt: { ...NAME_CHAIN_PAGE.pt, label: "Um tabuleiro novo todo dia · sem precisar de conta", start: "Jogue agora", note: "16 jogadores, 4 conexões escondidas. Como visitante, você joga os tabuleiros anteriores; com uma conta, acessa o tabuleiro de hoje e o ranking." },
  de: { ...NAME_CHAIN_PAGE.de, label: "Jeden Tag ein neues Brett · kein Konto nötig", start: "Jetzt spielen", note: "16 Spieler, 4 versteckte Verbindungen. Als Gast spielst du frühere Bretter; mit Konto spielst du das heutige Brett und siehst die Rangliste." },
};

const GUESS_THE_GOAL_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { label: "5 goals a day · no account needed", start: "Play now", note: "The real game: five goals a day. As a guest you play for points; sign in to earn coins and XP.", account: "Earn coins for every goal", accountText: "Sign in to earn coins and XP the first time you name each goal, and play Tic Tac Toe, Auction and ranked matches against real opponents." },
  ka: { label: "5 გოლი დღეში · ანგარიშის გარეშე", start: "თამაში", note: "ნამდვილი თამაში: ხუთი გოლი დღეში. სტუმრად ქულებზე თამაშობ; შედი ანგარიშზე, რომ ქოინები და XP მიიღო.", account: "მიიღე ქოინები ყოველ გოლზე", accountText: "შედი ანგარიშზე, რომ ყოველ პირველად გამოცნობილ გოლზე ქოინები და XP მიიღო და ითამაშო Tic Tac Toe, აუქციონი და რეიტინგული მატჩები ნამდვილ მეტოქეებთან." },
  es: { label: "5 goles al día · sin cuenta", start: "Jugar ahora", note: "El juego real: cinco goles al día. Sin cuenta juegas por puntos; inicia sesión para ganar monedas y XP.", account: "Gana monedas con cada gol", accountText: "Inicia sesión para ganar monedas y XP la primera vez que aciertas cada gol, y jugar Tic Tac Toe, Subasta y partidas clasificatorias contra rivales reales." },
  tr: { label: "Günde 5 gol · hesap gerekmez", start: "Oyna", note: "Gerçek oyun: günde beş gol. Misafir olarak puan için oynarsın; coin ve XP kazanmak için giriş yap.", account: "Her golden coin kazan", accountText: "Her golü ilk kez bildiğinde coin ve XP kazanmak, ayrıca gerçek rakiplere karşı XOX, Açık Artırma ve dereceli maç oynamak için giriş yap." },
  ru: { label: "5 голов в день · аккаунт не нужен", start: "Играть сейчас", note: "Настоящая игра: пять голов в день. Гость играет на очки, а чтобы получать монеты и XP, войди в аккаунт.", account: "Монеты за каждый гол", accountText: "Войди, чтобы получать монеты и XP, когда впервые угадываешь гол, и играть в крестики-нолики, аукцион и рейтинговые матчи с реальными соперниками." },
  pt: { label: "5 gols por dia · sem precisar de conta", start: "Jogue agora", note: "O jogo de verdade: cinco gols por dia. Como visitante, você joga por pontos; entre na sua conta para ganhar moedas e XP.", account: "Ganhe moedas a cada gol", accountText: "Entre na sua conta para ganhar moedas e XP na primeira vez que acertar cada gol e jogar Jogo da velha de futebol, Leilão de jogadores e partidas ranqueadas contra adversários reais." },
  de: { label: "5 Tore pro Tag · kein Konto nötig", start: "Jetzt spielen", note: "Das echte Spiel: fünf Tore pro Tag. Als Gast spielst du um Punkte; melde dich an, um Münzen und XP zu sammeln.", account: "Für jedes Tor Münzen sammeln", accountText: "Melde dich an, um beim ersten Erraten jedes Tores Münzen und XP zu sammeln und Fußball Tic Tac Toe, die Fußball-Auktion und Ranked gegen echte Gegner zu spielen." },
};

const TENABLE_PAGE: Record<SeoPageLocale, FullGameCopy> = {
  en: { ...ULTIMO_PAGE.en, label: "A new top 10 every day · past days free, no account", note: "One hidden list, 3 lives. As a guest you play past days; with an account, today's list and the leaderboard." },
  ka: { ...ULTIMO_PAGE.ka, label: "ყოველდღე ახალი ტოპ 10 · წინა დღეები უფასოდ, ანგარიშის გარეშე", note: "ერთი დამალული სია, 3 სიცოცხლე. სტუმრად წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს და რეიტინგს." },
  es: { ...ULTIMO_PAGE.es, label: "Un top 10 nuevo cada día · días anteriores gratis, sin cuenta", note: "Una lista oculta, 3 vidas. Sin cuenta jugás los días anteriores; con cuenta, la lista de hoy y el ranking." },
  tr: { ...ULTIMO_PAGE.tr, label: "Her gün yeni bir Top 10 · önceki günler ücretsiz, hesapsız", note: "Tek gizli liste, 3 can. Misafir olarak önceki günleri oynarsın; hesapla bugünün listesini ve sıralamayı." },
  ru: { ...ULTIMO_PAGE.ru, label: "Новый топ-10 каждый день · прошлые дни бесплатно, без аккаунта", note: "Один скрытый список, 3 жизни. Гость играет за прошлые дни, а с аккаунтом доступны сегодняшний список и рейтинг." },
  pt: { ...ULTIMO_PAGE.pt, label: "Novo top 10 todo dia · dias anteriores grátis, sem conta", note: "Uma lista escondida, 3 vidas. Como visitante, você joga os dias anteriores; com uma conta, acessa a lista de hoje e o ranking." },
  de: { ...ULTIMO_PAGE.de, label: "Jeden Tag eine neue Top 10 · frühere Tage gratis, kein Konto nötig", note: "Eine versteckte Liste, 3 Leben. Als Gast spielst du frühere Tage; mit Konto siehst du die heutige Liste und die Rangliste." },
};

const FULL_GAME_PAGES: Record<string, Record<SeoPageLocale, FullGameCopy>> = { buscaminas: BUSCAMINAS_PAGE, "guess-the-goal": GUESS_THE_GOAL_PAGE, pistas: PISTAS_PAGE, ultimo: ULTIMO_PAGE, minuto: MINUTO_PAGE, "shared-player": SHARED_PLAYER_PAGE, "name-chain": NAME_CHAIN_PAGE, "football-horserace": FOOTBALL_HORSERACE_PAGE, "football-codenames": FOOTBALL_CODENAMES_PAGE, "dato-falso-futbolero": DATO_FALSO_PAGE, "conexiones-futboleras": CONEXIONES_PAGE, "daily-statSniper": STAT_SNIPER_PAGE, tenable: TENABLE_PAGE };

/** One public game page: server-rendered content first, the practice engine on demand below it. */
export function PublicGameScreen({ game, locale }: { game: PublicGame; locale: SeoPageLocale }) {
  const copy = game.copy[locale];
  const labels = L[locale];
  const home = HOME_COPY[locale];
  const details = GAME_PAGE_DETAILS[game.slug]?.[locale] ?? [];
  const path = publicGamePath(game, locale);
  const related = relatedPublishedGames(game);
  const competitive = game.group === "multiplayer" || game.group === "competitive";
  const isDaily = Boolean(game.demoSlug?.startsWith("daily-"));
  const isCoinSample = game.group === "coins";
  const fullGame = game.demoSlug ? FULL_GAME_PAGES[game.demoSlug]?.[locale] ?? null : null;
  const crossLinkGame = game.modeId === "triviaMines" ? findPublicGameByModeId("buscaminas") : game.modeId === "buscaminas" ? findPublicGameByModeId("triviaMines") : null;
  const crossLinkHref = crossLinkGame ? publicGamePath(crossLinkGame, locale) : null;
  // Tic Tac Toe and Auction (owner, 2026-09-16): the hero is "Play now" (a live
  // match against bots for guests), the bottom card hosts the scripted training,
  // and "Play ranked" above the Top 10 is the sign-up CTA. Ranked keeps its layout.
  const botPlay = game.modeId === "grid" || game.modeId === "auction";
  const playNowGuestHref = game.modeId === "grid" ? "/tic-tac-toe?source=practice_bot&pack=european" : "/auction?source=practice_bot";
  const playNowMemberHref = game.modeId === "grid" ? "/tic-tac-toe?source=matchmaking&pack=european" : "/auction";
  return (
    <PublicPageFrame>
      <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wide text-white/55">
        <ol className="flex items-center gap-1">
          <li><Link href={`/${locale}`} className="hover:text-white">{home.nav.games}</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li className="text-white/85" aria-current="page">{copy.title}</li>
        </ol>
      </nav>

      {/* Desktop: the copy sections flow under the hero in the left column so
          they sit beside the leaderboard instead of below it; on phones the
          DOM order keeps the board right after the hero. */}
      <section className="mt-4 grid items-start gap-8 md:grid-cols-[1.2fr_1fr] md:grid-rows-[auto_1fr]">
        <div className="md:col-start-1 md:row-start-1">
          <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
          {crossLinkHref && crossLinkGame && <BuscaminasBanner locale={locale} href={crossLinkHref} target={crossLinkGame.modeId === "triviaMines" ? "triviaMines" : "buscaminas"} />}
          <p className="mt-3 text-sm font-semibold text-brand-yellow">{fullGame ? fullGame.label : botPlay ? labels.playNowLabel : game.guest === "demo" ? (isCoinSample ? labels.coinLabel : isDaily ? labels.guestDaily : labels.guest) : home.cards.accountRequired}</p>
          {botPlay ? (
            <section aria-label={labels.playNow} className="mt-6 flex flex-col items-start gap-3">
              <PlayNowLink modeId={game.modeId} locale={locale} guestHref={playNowGuestHref} memberHref={playNowMemberHref} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-green text-white hover:bg-brand-green-deep px-8 text-base font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-70">
                {labels.playNow}
              </PlayNowLink>
              <p className="text-sm text-white/75">{labels.playNowNote}</p>
              {game.modeId === "grid" && (
                <Link href="/tic-tac-toe/local" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  {labels.samePhone}
                </Link>
              )}
            </section>
          ) : game.guest === "demo" && game.demoSlug ? (
            <PublicGameEmbed modeId={game.modeId} demoSlug={game.demoSlug} locale={locale} pagePath={path} playPath={game.playPath} engineEmitsEvents={engineEmitsEvents(game.demoSlug)} practiceLocalised={!game.practiceLocales || game.practiceLocales.includes(locale)} copy={{ start: fullGame ? fullGame.start : isCoinSample ? labels.coinStart : isDaily ? labels.startDaily : labels.start, note: fullGame ? fullGame.note : isCoinSample ? labels.coinNote : isDaily ? labels.noteDaily : labels.note, exit: labels.exit, english: labels.english, title: copy.title }} />
          ) : (
            <SignInLink placement="game_page_hero" modeId={game.modeId} returnTo={game.playPath} className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{home.nav.signIn}</SignInLink>
          )}
        </div>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <div className="overflow-hidden rounded-2xl bg-brand-blue">
            <div className="aspect-video w-full"><DemoModeArt slug={game.artSlug} className="size-full" priority sizes="(min-width: 1024px) 436px, (min-width: 768px) calc((100vw - 64px) / 2.2), calc(100vw - 32px)" /></div>
          </div>
          {botPlay && (
            <section aria-label={labels.ranked} className="mt-6 rounded-2xl bg-brand-blue p-5">
              <h2 className="text-lg font-bold uppercase">{labels.ranked}</h2>
              <p className="mt-2 text-sm text-white/85">{labels.rankedText}</p>
              <SignInLink placement="game_page_ranked" modeId={game.modeId} returnTo={game.playPath} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{labels.ranked}</SignInLink>
            </section>
          )}
          {(game.modeId === "ranked" || game.modeId === "grid" || game.modeId === "auction") && <PublicPageBoard modeId={game.modeId} locale={locale} playPath={game.playPath} />}
          {fullGame && (game.modeId === "sharedPlayer" || game.modeId === "nameChain" || game.modeId === "tenable" || game.modeId === "footballRace" || game.modeId === "codenames" || game.modeId === "datoFalso" || game.modeId === "conexiones"
            ? <DeferredWordDailyBoard modeId={game.modeId} locale={locale} className="mt-6" />
            : (game.modeId === "pistas" || game.modeId === "ultimo" || game.modeId === "minuto" || game.modeId === "buscaminas" || game.modeId === "statSniper")
              ? <PublicPageBoard modeId={game.modeId} locale={locale} playPath={game.playPath} className="mt-6" /> : null)}
        </div>

        <div className="md:col-start-1 md:row-start-2">
      <section className="mt-4 max-w-3xl md:mt-0">
        <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.howTo}</h2>
        <ol className="mt-4 space-y-3">
          {copy.howToPlay.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-sm font-black text-black">{index + 1}</span>
              <p className="pt-0.5 text-sm leading-relaxed text-white/85 md:text-base">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {details.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.details}</h2>
          {details.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{paragraph}</p>)}
          <p className="mt-3 text-sm font-semibold text-brand-yellow">{copy.reward}</p>
        </section>
      )}

      {botPlay ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-lg font-bold uppercase">{labels.training}</h2>
          <p className="mt-2 text-sm text-white/75">{labels.trainingText}</p>
          {game.demoSlug && (
            <PublicGameEmbed variant="inline" modeId={game.modeId} demoSlug={game.demoSlug} locale={locale} pagePath={path} playPath={game.playPath} engineEmitsEvents={engineEmitsEvents(game.demoSlug)} practiceLocalised={!game.practiceLocales || game.practiceLocales.includes(locale)} copy={{ start: isCoinSample ? labels.coinStart : isDaily ? labels.startDaily : labels.start, note: isCoinSample ? labels.coinNote : isDaily ? labels.noteDaily : labels.note, exit: labels.exit, english: labels.english, title: copy.title }} />
          )}
        </section>
      ) : (
        <section className="mt-12 max-w-3xl rounded-2xl bg-brand-blue p-5">
          <h2 className="text-lg font-bold uppercase">{fullGame ? fullGame.account : competitive ? labels.compete : isDaily || isCoinSample ? labels.accountDaily : labels.account}</h2>
          <p className="mt-2 text-sm text-white/85">{fullGame ? fullGame.accountText : competitive ? labels.competeText : isCoinSample ? labels.coinAccountText : isDaily ? labels.accountTextDaily : labels.accountText}</p>
          <SignInLink placement="game_page_account" modeId={game.modeId} returnTo={fullGame ? "/play" : game.playPath} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{labels.member}</SignInLink>
        </section>
      )}

        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.related}</h2>
          <Link href={`/${locale}`} className="text-sm font-bold uppercase tracking-wide text-brand-yellow hover:underline">{labels.all}</Link>
        </div>
        <div className="mt-4"><PublicCardGrid games={related} locale={locale} surface="public_game" deferArtwork /></div>
      </section>
    </PublicPageFrame>
  );
}
