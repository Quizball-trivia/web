import type { SeoPageLocale } from "./game-pages";

/**
 * The body copy of each published game page (rules, scoring, limits, tips),
 * server-rendered above the practice engine. Keyed by the game-pages.ts slug.
 * A page is only published (public-games.ts `page: true`) once it has a body
 * here in every locale — templated pages with five strings are not indexed.
 */
export const GAME_PAGE_DETAILS: Record<string, Partial<Record<SeoPageLocale, string[]>>> = {
  ranked: {
    en: [
      "Ranked is Quizball's competitive mode: a live one-against-one football trivia match against a real opponent, played for ranked points (RP). Three categories are drawn from the catalogue; each player bans one, and the match is played in the category that survives. Twelve questions in two halves, with a category re-draw at half-time.",
      "Every question is a possession battle. Both players answer the same question; the faster correct answer wins ground on the pitch. Push the ball to the opponent's goal line to earn a shot, and a shot that beats the keeper is a goal. If the score is level at full time the match goes to penalties: a question decides every kick.",
      "Winning earns RP and moves you up the tiers, from Academy to the top divisions; losing costs RP. New accounts play three placement matches before they get a tier. Your matches, win rate and rank live on the leaderboard, and the weekend competition takes its qualification points from ranked play.",
      "The training match on this page is a guided version of exactly that flow: the same ban phase, the same possession rounds and a penalty shoot-out, against CoachBot, with hints at every step. It awards nothing and is not saved. Ranked itself needs an account.",
    ],
    ka: [
      "რეიტინგული Quizball-ის შეჯიბრებითი რეჟიმია: ლაივ ერთი ერთზე საფეხბურთო ტრივია ნამდვილი მეტოქის წინააღმდეგ, რეიტინგული ქულებისთვის (RP). კატალოგიდან სამი კატეგორია ვარდება; თითოეული მოთამაშე ერთს ბანავს და მატჩი გადარჩენილ კატეგორიაში თამაშდება. თორმეტი კითხვა ორ ტაიმად, შესვენებაზე კატეგორიების ხელახალი გათამაშებით.",
      "ყოველი კითხვა ფლობისთვის ბრძოლაა. ორივე მოთამაშე ერთსა და იმავე კითხვას პასუხობს; უფრო სწრაფი სწორი პასუხი მოედანზე ადგილს იგებს. მიიტანე ბურთი მეტოქის კარის ხაზამდე, რომ დარტყმა მოიპოვო; მეკარისთვის მოგებული დარტყმა გოლია. თუ მატჩი ფრედ დასრულდა, პენალტები იწყება: ყოველ დარტყმას კითხვა წყვეტს.",
      "მოგება RP-ს გაძლევს და ტიერებში გწევს, აკადემიიდან უმაღლეს დივიზიონებამდე; წაგება RP-ს გაკლებს. ახალი ანგარიში ტიერის მიღებამდე სამ საკვალიფიკაციო მატჩს თამაშობს. შენი მატჩები, მოგების პროცენტი და ადგილი ლიდერბორდზე ჩანს, ხოლო შაბათ-კვირის შეჯიბრი საკვალიფიკაციო ქულებს რეიტინგული თამაშიდან იღებს.",
      "ამ გვერდის საწვრთნელი მატჩი ზუსტად ამ პროცესის მინიშნებებიანი ვერსიაა: იგივე ბანის ფაზა, იგივე ფლობის რაუნდები და პენალტების სერია CoachBot-ის წინააღმდეგ. ის არაფერს გაძლევს და არ ინახება. თავად რეიტინგულს ანგარიში სჭირდება.",
    ],
    es: [
      "«¿Quién sabe más de fútbol? 1v1» es el modo competitivo de Quizball: un partido de trivia de fútbol uno contra uno, en vivo, contra un rival real, jugado por puntos de clasificación (RP). Se sortean tres categorías del catálogo; cada jugador veta una y el partido se juega en la que sobrevive. Doce preguntas en dos tiempos, con un nuevo sorteo de categoría en el descanso.",
      "Cada pregunta es una batalla por la posesión. Los dos responden la misma pregunta; la respuesta correcta más rápida gana terreno en el campo. Lleva el balón hasta la línea de gol del rival para ganar un disparo, y un disparo que supera al portero es gol. Si el marcador está igualado al final, el partido se decide en los penaltis: una pregunta decide cada lanzamiento.",
      "Ganar da RP y te sube de nivel, desde Academia hasta las divisiones más altas; perder resta RP. Una cuenta nueva juega tres partidos de colocación antes de recibir un nivel. Tus partidos, tu porcentaje de victorias y tu puesto aparecen en la clasificación, y la competición del fin de semana toma sus puntos de clasificación del modo clasificatorio.",
      "El partido de entrenamiento de esta página es una versión guiada de ese mismo flujo: la misma fase de vetos, las mismas rondas de posesión y una tanda de penaltis contra CoachBot, con pistas en cada paso. No otorga nada y no se guarda. El modo clasificatorio en sí requiere una cuenta.",
    ],
    tr: [
      "1v1 Futbol Bilgi Yarışması, Quizball'un dereceli rekabet modudur: gerçek bir rakibe karşı canlı, bire bir futbol bilgi maçı, dereceli puan (RP) için oynanır. Katalogdan üç kategori çekilir; her oyuncu birini yasaklar ve maç kalan kategoride oynanır. İki devrede on iki soru, devre arasında yeni kategori çekilişiyle.",
      "Her soru bir top hakimiyeti mücadelesidir. İki oyuncu da aynı soruyu cevaplar; daha hızlı doğru cevap sahada yer kazandırır. Topu rakibin kale çizgisine kadar götürerek şut hakkı kazan; kaleciyi geçen şut goldür. Maç sonunda skor eşitse penaltılara gidilir: her vuruşu bir soru belirler.",
      "Kazanmak RP kazandırır ve seni Akademi'den üst liglere doğru yükseltir; kaybetmek RP götürür. Yeni hesaplar bir kademe almadan önce üç yerleştirme maçı oynar. Maçların, kazanma oranın ve sıran liderlik tablosunda görünür; hafta sonu yarışması da katılım puanlarını dereceli maçlardan alır.",
      "Bu sayfadaki antrenman maçı tam olarak bu akışın yönlendirmeli sürümüdür: aynı yasak aşaması, aynı top hakimiyeti turları ve CoachBot'a karşı bir penaltı serisi, her adımda ipuçlarıyla. Hiçbir şey kazandırmaz ve kaydedilmez. Dereceli modun kendisi hesap gerektirir.",
    ],
  },
  "football-tic-tac-toe": {
    en: [
      "Football Tic Tac Toe is played on a three-by-three grid. Each row and each column carries a category: a club, a nation, a league, a trophy or a manager. Every square therefore stands for two categories at once, and you claim it by naming a footballer who fits both, for example a Brazilian who played for Chelsea.",
      "Turns are timed. Type a name, and the game accepts surnames, full names, common nicknames and small typos. If nobody can fill the square you can pass, and a board with no winning line left is a draw. Close matches are settled as a best-of-three series so a lucky board does not decide the day.",
      "The practice round on this page plays against a bot with the same rules. Signed-in players face real opponents in the app, keep their record and earn ranked points; guest practice awards nothing and is not saved.",
    ],
    ka: [
      "საფეხბურთო იქს-ნული სამზე სამ ბადეზე თამაშდება. ყოველ სტრიქონსა და სვეტს თავისი კატეგორია აქვს: კლუბი, ქვეყანა, ლიგა, ტროფეი ან მწვრთნელი. უჯრა ორ კატეგორიას ერთდროულად ნიშნავს და მას იკავებ, თუ დაასახელებ ფეხბურთელს, რომელიც ორივეს ერგება — მაგალითად ბრაზილიელს, რომელიც ჩელსიში თამაშობდა.",
      "სვლები დროზეა. ჩაწერე სახელი — მიიღება გვარი, სრული სახელი, ცნობილი მეტსახელი და მცირე შეცდომები. თუ უჯრას ვერავინ ავსებს, შეგიძლია გამოტოვო; ბადე, სადაც გამარჯვების ხაზი აღარ დარჩა, ფრეა. თანაბარი მატჩები სამიდან საუკეთესო სერიით წყდება.",
      "ამ გვერდის სავარჯიშო რაუნდი ბოტის წინააღმდეგ თამაშდება იმავე წესებით. ავტორიზებული მოთამაშეები აპლიკაციაში ნამდვილ მეტოქეებს ხვდებიან, ინახავენ სტატისტიკას და აგროვებენ რეიტინგულ ქულებს; სტუმრის სავარჯიშო არაფერს არ ითვლის და არ ინახება.",
    ],
    es: [
      "El tres en raya futbolero se juega en una cuadrícula de tres por tres. Cada fila y cada columna tiene una categoría: un club, un país, una liga, un trofeo o un entrenador. Cada casilla representa dos categorías a la vez y la conquistas nombrando a un futbolista que cumpla ambas, por ejemplo un brasileño que jugó en el Chelsea.",
      "Los turnos tienen tiempo. Escribe un nombre: se aceptan apellidos, nombres completos, apodos habituales y erratas pequeñas. Si nadie puede llenar una casilla puedes pasar, y un tablero sin línea ganadora posible es empate. Los partidos igualados se resuelven al mejor de tres.",
      "La ronda de práctica de esta página se juega contra un bot con las mismas reglas. Los jugadores registrados se enfrentan a rivales reales en la app, guardan su historial y ganan puntos de clasificación; la práctica de invitado no otorga nada y no se guarda.",
    ],
    tr: [
      "Futbol XOX (Tic Tac Toe) üçe üç bir ızgarada oynanır. Her satır ve her sütun bir kategori taşır: bir kulüp, bir ülke, bir lig, bir kupa ya da bir teknik direktör. Böylece her kare aynı anda iki kategoriyi temsil eder; kareyi, ikisine de uyan bir futbolcunun adını yazarak alırsın, örneğin Chelsea'de oynamış bir Brezilyalı.",
      "Turlar süreye bağlıdır. Bir isim yaz; oyun soyadları, tam adları, yaygın lakapları ve küçük yazım hatalarını kabul eder. Kareyi kimse dolduramazsa pas geçebilirsin; kazanan bir çizgi kalmayan tahta beraberliktir. Yakın maçlar, şanslı bir tahta günü belirlemesin diye üç maçlık seri olarak oynanır.",
      "Bu sayfadaki alıştırma turu aynı kurallarla bir bota karşı oynanır. Giriş yapmış oyuncular uygulamada gerçek rakiplerle karşılaşır, sicilini korur ve dereceli puan kazanır; misafir alıştırması hiçbir şey kazandırmaz ve kaydedilmez.",
    ],
  },
  auction: {
    en: [
      "Football Auction is a bidding game for up to four managers. Footballers come up one at a time, hidden behind clues about their career, position and value. Managers bid from a shared starting budget; the highest bid when the hammer falls signs the player, and the clues reveal who you really bought.",
      "The aim is a complete line-up in the chosen formation. Overpay early and you will be outbid for the players you need later; wait too long and the good ones are gone. When every squad is full, teams are rated and the best complete team wins the round.",
      "The practice auction on this page runs against bots with virtual budget and no saved result. In the app, signed-in players bid against real managers, earn coins and climb the auction rank.",
    ],
    ka: [
      "საფეხბურთო აუქციონი ოთხ მენეჯერამდე ვაჭრობის თამაშია. ფეხბურთელები სათითაოდ გამოდიან მინიშნებების უკან — კარიერა, პოზიცია, ღირებულება. მენეჯერები საერთო საწყისი ბიუჯეტიდან ვაჭრობენ; ჩაქუჩის დაცემისას მაქსიმალური ფსონი ფეხბურთელს იძენს და მინიშნებები ამხელს, ვინ იყიდე.",
      "მიზანი არჩეულ სქემაში სრული შემადგენლობაა. ადრე გადაიხადე მეტი — მოგვიანებით საჭირო ფეხბურთელებზე გაგასწრებენ; დიდხანს დაელოდე — კარგები წავლენ. როცა ყველა გუნდი შევსებულია, გუნდები ფასდება და საუკეთესო სრული გუნდი იგებს.",
      "ამ გვერდის სავარჯიშო აუქციონი ბოტების წინააღმდეგ ვირტუალური ბიუჯეტით თამაშდება და შედეგი არ ინახება. აპლიკაციაში ავტორიზებული მოთამაშეები ნამდვილ მენეჯერებთან ვაჭრობენ, აგროვებენ ქოინებს და ადიან აუქციონის რეიტინგში.",
    ],
    es: [
      "La subasta de fútbol es un juego de pujas para hasta cuatro mánagers. Los futbolistas salen uno a uno, ocultos tras pistas sobre su carrera, posición y valor. Los mánagers pujan con un presupuesto inicial común; la puja más alta al caer el martillo ficha al jugador y las pistas revelan a quién compraste.",
      "El objetivo es un once completo en la formación elegida. Si pagas de más al principio te superarán en las pujas por los jugadores que necesitas después; si esperas demasiado, los buenos se habrán ido. Cuando todas las plantillas están completas, se valoran los equipos y gana el mejor equipo completo.",
      "La subasta de práctica de esta página se juega contra bots con presupuesto virtual y sin resultado guardado. En la app, los jugadores registrados pujan contra mánagers reales, ganan monedas y suben en el rango de subasta.",
    ],
    tr: [
      "Futbol Müzayedesi dört menajere kadar oynanan bir açık artırma oyunudur. Futbolcular teker teker, kariyerleri, mevkileri ve değerleri hakkındaki ipuçlarının arkasına gizlenmiş olarak gelir. Menajerler ortak bir başlangıç bütçesinden teklif verir; tokmak indiğinde en yüksek teklif oyuncuyu alır ve ipuçları kimi aldığını ortaya çıkarır.",
      "Amaç, seçilen dizilişte eksiksiz bir kadro kurmaktır. Erken aşamada fazla öde, sonra ihtiyacın olan oyuncularda geride kalırsın; çok bekle, iyiler gider. Her kadro dolduğunda takımlar puanlanır ve en iyi eksiksiz takım turu kazanır.",
      "Bu sayfadaki alıştırma müzayedesi sanal bütçeyle botlara karşı oynanır ve sonuç kaydedilmez. Uygulamada giriş yapmış oyuncular gerçek menajerlere karşı teklif verir, jeton kazanır ve müzayede sıralamasında yükselir.",
    ],
  },
  "money-drop": {
    en: [
      "Money Drop starts you with a virtual bankroll and five football questions. Every question has four possible answers, and you spread your money across the answers you believe in. Money placed on wrong answers drops through the trapdoors; money on the right answer stays with you.",
      "Confidence pays: putting everything on one answer keeps the whole stack if you are right and loses it all if you are wrong. Splitting protects you but shrinks what you keep. Lifelines can remove two wrong answers, reveal a clue or skip a question once each.",
      "Your score is what is left after the fifth drop. The practice round uses a sample question set; the daily game in the app has a fresh set every day, awards coins for what you keep and counts towards your streak.",
    ],
    ka: [
      "Money Drop ვირტუალური ბანკითა და ხუთი საფეხბურთო კითხვით იწყება. ყოველ კითხვას ოთხი შესაძლო პასუხი აქვს და ფულს იმ პასუხებზე ანაწილებ, რომლებსაც ენდობი. არასწორ პასუხებზე დადებული ფული ლუქებში ცვივა; სწორზე დადებული შენ გრჩება.",
      "თავდაჯერებულობა ფასობს: ყველაფერი ერთ პასუხზე — მთელი ბანკი გრჩება, თუ მართალი ხარ, და ყველაფერს კარგავ, თუ ცდები. განაწილება გიცავს, მაგრამ ამცირებს შენარჩუნებულს. დამხმარეები ერთხელ შლიან ორ არასწორ პასუხს, აჩვენებენ მინიშნებას ან გამოტოვებენ კითხვას.",
      "შენი ქულა ის არის, რაც მეხუთე ვარდნის შემდეგ დარჩა. სავარჯიშო რაუნდი სანიმუშო კითხვებს იყენებს; აპლიკაციის ყოველდღიური თამაშს ყოველდღე ახალი ნაკრები აქვს, ქოინებს გაძლევს და სერიაში ითვლება.",
    ],
    es: [
      "Money Drop empieza con un banco virtual y cinco preguntas de fútbol. Cada pregunta tiene cuatro respuestas posibles y repartes tu dinero entre las que crees correctas. El dinero colocado en respuestas erróneas cae por las trampillas; el de la respuesta correcta se queda contigo.",
      "La confianza paga: apostarlo todo a una respuesta conserva todo el montón si aciertas y lo pierde todo si fallas. Repartir te protege pero reduce lo que conservas. Los comodines eliminan dos respuestas erróneas, revelan una pista o saltan una pregunta, una vez cada uno.",
      "Tu puntuación es lo que queda tras la quinta caída. La ronda de práctica usa un set de preguntas de muestra; el juego diario de la app trae un set nuevo cada día, da monedas por lo que conservas y cuenta para tu racha.",
    ],
    tr: [
      "Money Drop sana sanal bir kasa ve beş futbol sorusu verir. Her sorunun dört olası cevabı vardır ve paranı güvendiğin cevaplara dağıtırsın. Yanlış cevaplara konan para kapaklardan aşağı düşer; doğru cevaptaki para sende kalır.",
      "Güven kazandırır: her şeyi tek bir cevaba koymak, haklıysan tüm yığını korur, yanılıyorsan hepsini kaybettirir. Bölmek seni korur ama elinde kalanı küçültür. Can simitleri birer kez iki yanlış cevabı eleyebilir, bir ipucu gösterebilir ya da bir soruyu atlayabilir.",
      "Puanın, beşinci düşüşten sonra elinde kalandır. Alıştırma turu örnek bir soru seti kullanır; uygulamadaki günlük oyunun her gün yeni bir seti vardır, elinde kalan için jeton verir ve serine sayılır.",
    ],
  },
  "true-or-false-football": {
    en: [
      "True or False is the fastest daily on Quizball. A football statement appears, from transfer facts to record scorers, and you have a few seconds to decide whether it is true or false. Answer before the timer runs out; a late answer counts as a miss.",
      "Statements are written to sound plausible either way, so the game rewards real knowledge over guessing. Each correct call scores a point and keeps your run alive; the daily set ends after the last statement or your first wrong answer, depending on the round rules shown at the start.",
      "The practice round here uses a fixed sample. In the app, a new statement set arrives every day, correct calls earn coins and your results feed the daily streak.",
    ],
    ka: [
      "„სწორია თუ არა“ Quizball-ის ყველაზე სწრაფი ყოველდღიური თამაშია. ეკრანზე საფეხბურთო განცხადება ჩნდება — ტრანსფერებიდან რეკორდსმენ ბომბარდირებამდე — და რამდენიმე წამში წყვეტ, სწორია თუ არა. უპასუხე დროის ამოწურვამდე; დაგვიანებული პასუხი შეცდომად ითვლება.",
      "განცხადებები ისეა დაწერილი, რომ ორივე მხარეს დამაჯერებლად ჟღერს, ამიტომ თამაში ვარაუდზე მეტად ნამდვილ ცოდნას აჯილდოებს. ყოველი სწორი პასუხი ქულაა და სერიას აგრძელებს.",
      "სავარჯიშო რაუნდი ფიქსირებულ ნიმუშს იყენებს. აპლიკაციაში ყოველდღე ახალი განცხადებები მოდის, სწორი პასუხები ქოინებს იძლევა და შედეგები ყოველდღიურ სერიაში ითვლება.",
    ],
    es: [
      "Verdadero o falso futbolero es el diario más rápido de Quizball. Aparece una afirmación de fútbol, desde traspasos hasta máximos goleadores, y tienes unos segundos para decidir si es verdadera o falsa. Responde antes de que acabe el tiempo; una respuesta tardía cuenta como fallo.",
      "Las afirmaciones están escritas para sonar creíbles en ambos sentidos, así que el juego premia el conocimiento real sobre la suerte. Cada acierto suma un punto y mantiene viva tu racha.",
      "La ronda de práctica usa una muestra fija. En la app llega un set nuevo cada día, los aciertos dan monedas y tus resultados alimentan la racha diaria.",
    ],
    tr: [
      "Doğru mu Yanlış mı, Quizball'daki en hızlı günlük oyundur. Transfer bilgilerinden rekor golcülere kadar bir futbol ifadesi belirir ve doğru mu yanlış mı olduğuna karar vermek için birkaç saniyen vardır. Süre bitmeden cevapla; geç cevap ıska sayılır.",
      "İfadeler her iki yönde de inandırıcı görünecek şekilde yazılır, bu yüzden oyun tahmini değil gerçek bilgiyi ödüllendirir. Her doğru karar bir puan getirir ve serini sürdürür; günlük set, başta gösterilen tur kurallarına göre son ifadeden ya da ilk yanlış cevabından sonra biter.",
      "Buradaki alıştırma turu sabit bir örnek kullanır. Uygulamada her gün yeni bir ifade seti gelir, doğru kararlar jeton kazandırır ve sonuçların günlük serine işlenir.",
    ],
  },
  countdown: {
    en: [
      "Countdown gives you one football list and a ticking clock. The list might be every club Zlatan Ibrahimović played for, or the last ten Ballon d'Or winners. Type as many valid entries as you can before time runs out; each accepted answer is worth a point.",
      "Names are matched generously: surnames, common short forms and small spelling slips are accepted, and an entry you have already given is simply ignored. The round ends when the clock hits zero or the list is complete.",
      "The practice round uses sample lists. The daily version in the app rotates the lists every day, pays coins per answer found and adds to your streak.",
    ],
    ka: [
      "Countdown ერთ საფეხბურთო სიას და მოტიკტიკე საათს გაძლევს. სია შეიძლება იყოს ყველა კლუბი, სადაც ზლატან იბრაჰიმოვიჩი თამაშობდა, ან ბოლო ათი „ოქროს ბურთის“ მფლობელი. ჩაწერე რაც შეიძლება მეტი სწორი ჩანაწერი დროის ამოწურვამდე; ყოველი მიღებული პასუხი ქულაა.",
      "სახელები ლმობიერად მოწმდება: მიიღება გვარები, გავრცელებული შემოკლებები და მცირე შეცდომები; უკვე ნათქვამი პასუხი უბრალოდ იგნორირდება. რაუნდი მთავრდება, როცა საათი ნულს მიაღწევს ან სია შეივსება.",
      "სავარჯიშო რაუნდი სანიმუშო სიებს იყენებს. აპლიკაციის ყოველდღიური ვერსია სიებს ყოველდღე ცვლის, ნაპოვნ პასუხზე ქოინებს იხდის და სერიაში ითვლება.",
    ],
    es: [
      "Contrarreloj futbolera te da una lista futbolera y un reloj en marcha. La lista puede ser todos los clubes en los que jugó Zlatan Ibrahimović o los últimos diez ganadores del Balón de Oro. Escribe tantas entradas válidas como puedas antes de que acabe el tiempo; cada respuesta aceptada vale un punto.",
      "Los nombres se comparan con generosidad: se aceptan apellidos, formas cortas habituales y pequeños errores de escritura, y una entrada repetida simplemente se ignora. La ronda termina cuando el reloj llega a cero o la lista se completa.",
      "La ronda de práctica usa listas de muestra. La versión diaria de la app cambia las listas cada día, paga monedas por respuesta encontrada y suma a tu racha.",
    ],
    tr: [
      "Geri Sayım sana bir futbol listesi ve işleyen bir saat verir. Liste, Zlatan Ibrahimović'in oynadığı tüm kulüpler ya da son on Ballon d'Or kazananı olabilir. Süre bitmeden olabildiğince çok geçerli girdi yaz; kabul edilen her cevap bir puandır.",
      "İsimler esnek eşleştirilir: soyadları, yaygın kısaltmalar ve küçük yazım hataları kabul edilir; daha önce verdiğin bir girdi yalnızca yok sayılır. Tur, saat sıfıra ulaştığında ya da liste tamamlandığında biter.",
      "Alıştırma turu örnek listeler kullanır. Uygulamadaki günlük sürüm listeleri her gün değiştirir, bulunan cevap başına jeton öder ve serine ekler.",
    ],
  },
  "higher-or-lower": {
    en: [
      "Higher or Lower puts two footballers side by side with one hidden number: goals in a season, transfer fee, caps, age or market value. You see the first player's figure and decide whether the second player's is higher or lower.",
      "A correct call keeps the run going and brings up the next pair; the first wrong call ends the round. Rounds are short and the numbers come from verified records, so the game is about knowing the sport rather than luck.",
      "The practice round uses sample pairs. In the app, the daily set changes every day, rounds cleared earn coins and results count towards your streak.",
    ],
    ka: [
      "„მეტი თუ ნაკლები“ ორ ფეხბურთელს ერთ დამალულ რიცხვთან ერთად გვერდიგვერდ აყენებს: გოლები სეზონში, ტრანსფერის ფასი, ნაკრების მატჩები, ასაკი ან საბაზრო ღირებულება. ხედავ პირველის ციფრს და წყვეტ, მეორისა მეტია თუ ნაკლები.",
      "სწორი პასუხი სერიას აგრძელებს და შემდეგ წყვილს აჩენს; პირველი შეცდომა რაუნდს ამთავრებს. რაუნდები მოკლეა და რიცხვები დადასტურებული ჩანაწერებიდანაა, ამიტომ თამაში იღბალზე მეტად ცოდნაზეა.",
      "სავარჯიშო რაუნდი სანიმუშო წყვილებს იყენებს. აპლიკაციაში ყოველდღიური ნაკრები ყოველდღე იცვლება, გავლილი რაუნდები ქოინებს იძლევა და შედეგები სერიაში ითვლება.",
    ],
    es: [
      "Higher or Lower futbolero enfrenta a dos futbolistas con un número oculto: goles en una temporada, precio de traspaso, internacionalidades, edad o valor de mercado. Ves la cifra del primero y decides si la del segundo es mayor o menor.",
      "Un acierto mantiene la racha y trae la siguiente pareja; el primer fallo termina la ronda. Las rondas son cortas y los números salen de registros verificados, así que el juego va de conocer el deporte, no de suerte.",
      "La ronda de práctica usa parejas de muestra. En la app, el set diario cambia cada día, las rondas superadas dan monedas y los resultados cuentan para tu racha.",
    ],
    tr: [
      "Higher or Lower Futbolcu, iki futbolcuyu gizli bir sayıyla yan yana koyar: bir sezondaki goller, transfer ücreti, millî maç sayısı, yaş ya da piyasa değeri. İlk oyuncunun sayısını görürsün ve ikincininkinin daha yüksek mi yoksa daha düşük mü olduğuna karar verirsin.",
      "Doğru bir karar seriyi sürdürür ve sonraki ikiliyi getirir; ilk yanlış karar turu bitirir. Turlar kısadır ve sayılar doğrulanmış kayıtlardan gelir, bu yüzden oyun şansla değil sporu bilmekle ilgilidir.",
      "Alıştırma turu örnek ikililer kullanır. Uygulamada günlük set her gün değişir, geçilen turlar jeton kazandırır ve sonuçlar serine sayılır.",
    ],
  },
  imposter: {
    en: [
      "Imposter shows you a group of footballers who all share something, such as a club they played for or a trophy they won, except for one or two who do not belong. Your job is to spot the imposters and select them before the timer ends.",
      "Each round has a stated theme and a stated number of imposters. Select exactly those players: every correct selection counts, every wrong one costs you. The round is scored when you confirm or when time runs out.",
      "The practice round uses sample groups. In the app the groups change daily, correct rounds earn coins and your results build the daily streak.",
    ],
    ka: [
      "„შემპარავი“ ფეხბურთელების ჯგუფს გაჩვენებს, რომლებსაც რაღაც საერთო აქვთ — კლუბი, სადაც თამაშობდნენ, ან მოგებული ტროფეი — გარდა ერთი-ორისა, რომლებიც ჯგუფს არ ეკუთვნიან. შენი საქმეა შემპარავების პოვნა და მონიშვნა დროის ამოწურვამდე.",
      "ყოველ რაუნდს თემა და შემპარავების რაოდენობა აქვს. მონიშნე ზუსტად ისინი: ყოველი სწორი არჩევანი ითვლება, ყოველი არასწორი გაკარგვინებს. რაუნდი ფასდება დადასტურებისას ან დროის ამოწურვისას.",
      "სავარჯიშო რაუნდი სანიმუშო ჯგუფებს იყენებს. აპლიკაციაში ჯგუფები ყოველდღე იცვლება, სწორი რაუნდები ქოინებს იძლევა და შედეგები ყოველდღიურ სერიას ქმნის.",
    ],
    es: [
      "Impostor te muestra un grupo de futbolistas que comparten algo, como un club en el que jugaron o un trofeo que ganaron, salvo uno o dos que no encajan. Tu tarea es detectar a los impostores y seleccionarlos antes de que acabe el tiempo.",
      "Cada ronda tiene un tema y un número de impostores declarados. Selecciona exactamente a esos jugadores: cada selección correcta cuenta y cada error resta. La ronda se puntúa al confirmar o cuando se agota el tiempo.",
      "La ronda de práctica usa grupos de muestra. En la app los grupos cambian a diario, las rondas correctas dan monedas y tus resultados construyen la racha diaria.",
    ],
    tr: [
      "Sahtekâr sana ortak bir şeyi paylaşan bir futbolcu grubu gösterir, örneğin oynadıkları bir kulüp ya da kazandıkları bir kupa; ancak biri ya da ikisi gruba ait değildir. Görevin, süre bitmeden sahtekârları bulup seçmektir.",
      "Her turun belirtilen bir teması ve belirtilen sayıda sahtekârı vardır. Tam olarak o oyuncuları seç: her doğru seçim sayılır, her yanlış seçim puan kaybettirir. Tur, onayladığında ya da süre bittiğinde puanlanır.",
      "Alıştırma turu örnek gruplar kullanır. Uygulamada gruplar her gün değişir, doğru turlar jeton kazandırır ve sonuçların günlük serini oluşturur.",
    ],
  },
  "card-detective": {
    en: [
      "Card Detective hands you a player card with every slot locked: overall rating, position, club, nation, league and the card's edition. Each slot is a clue with its own price in coins. Open the clues you need, then name the player.",
      "You start each card with a budget. Cheap clues tell you little, expensive clues almost give the game away, so the skill is knowing which single reveal will let you guess. Name the player correctly and you keep what you did not spend; run out of budget and the card is lost.",
      "Ten cards make up a day. The practice round on this page uses a sample set of cards; the daily game in the app rotates cards every day, pays coins for what you keep and counts towards your streak.",
    ],
    ka: [
      "„ბარათის დეტექტივი“ ფეხბურთელის ბარათს გაძლევს დახურული უჯრებით: საერთო რეიტინგი, პოზიცია, კლუბი, ქვეყანა, ლიგა და ბარათის გამოშვება. ყოველი უჯრა მინიშნებაა თავისი ფასით ქოინებში. გახსენი საჭირო მინიშნებები და დაასახელე ფეხბურთელი.",
      "ყოველ ბარათს ბიუჯეტით იწყებ. იაფი მინიშნებები ცოტას ამბობს, ძვირი — თითქმის ყველაფერს, ამიტომ ხელოვნება იმის ცოდნაა, რომელი ერთი გახსნა გამოგაცნობინებს. სწორად დაასახელე — დაუხარჯავი გრჩება; ბიუჯეტი დაამთავრე — ბარათი დაკარგულია.",
      "დღეს ათი ბარათი ქმნის. ამ გვერდის სავარჯიშო რაუნდი სანიმუშო ბარათებს იყენებს; აპლიკაციის ყოველდღიური თამაში ბარათებს ყოველდღე ცვლის, შენარჩუნებულ ქოინებს გაძლევს და სერიაში ითვლება.",
    ],
    es: [
      "«Adivina el jugador por su carta» te entrega una carta de jugador con todas las casillas bloqueadas: valoración general, posición, club, país, liga y edición de la carta. Cada casilla es una pista con su precio en monedas. Abre las pistas que necesites y nombra al jugador.",
      "Empiezas cada carta con un presupuesto. Las pistas baratas dicen poco, las caras casi lo regalan, así que la habilidad está en saber qué única revelación te permitirá acertar. Nombra bien al jugador y conservas lo que no gastaste; agota el presupuesto y la carta se pierde.",
      "Diez cartas forman un día. La ronda de práctica de esta página usa un set de cartas de muestra; el juego diario de la app cambia las cartas cada día, paga monedas por lo que conservas y cuenta para tu racha.",
    ],
    tr: [
      "Kart Dedektifi sana her alanı kilitli bir oyuncu kartı verir: genel reyting, mevki, kulüp, ülke, lig ve kartın sürümü. Her alan, jeton cinsinden kendi fiyatı olan bir ipucudur. İhtiyacın olan ipuçlarını aç, sonra oyuncunun adını söyle.",
      "Her karta bir bütçeyle başlarsın. Ucuz ipuçları az şey söyler, pahalı ipuçları neredeyse cevabı verir; beceri, hangi tek açığın tahmin etmeni sağlayacağını bilmektir. Oyuncuyu doğru bilirsen harcamadığını korursun; bütçen biterse kart kaybedilir.",
      "Bir gün on karttan oluşur. Bu sayfadaki alıştırma turu örnek bir kart seti kullanır; uygulamadaki günlük oyun kartları her gün değiştirir, koruduğun için jeton öder ve serine sayılır.",
    ],
  },
  "guess-the-goal": {
    en: [
      "Guess the Goal plays a real goal clip with the scorer hidden. Watch the build-up, the strike and the celebration, then name the player who scored. Clips cover famous finals, derbies and cult goals from the last thirty years.",
      "Fewer hints mean more points: name the scorer from the clip alone for the maximum, or reveal the season, the competition or the club for a smaller reward. Five goals make a round.",
      "The practice round uses a fixed set of clips. In the app, five new goals arrive every day, correct names earn coins and results count towards your streak.",
    ],
    ka: [
      "„გამოიცანი გოლი“ ნამდვილი გოლის ვიდეოს უშვებს დამალული ავტორით. უყურე შეტევას, დარტყმას და ზეიმს, შემდეგ დაასახელე გოლის ავტორი. ვიდეოები ცნობილ ფინალებს, დერბიებსა და საკულტო გოლებს მოიცავს ბოლო ოცდაათი წლიდან.",
      "ნაკლები მინიშნება — მეტი ქულა: დაასახელე ავტორი მხოლოდ ვიდეოთი მაქსიმალური ქულისთვის, ან გახსენი სეზონი, ტურნირი ან კლუბი მცირე ჯილდოსთვის. ხუთი გოლი რაუნდს ქმნის.",
      "სავარჯიშო რაუნდი ფიქსირებულ ვიდეოებს იყენებს. აპლიკაციაში ყოველდღე ხუთი ახალი გოლი მოდის, სწორი პასუხები ქოინებს იძლევა და შედეგები სერიაში ითვლება.",
    ],
    es: [
      "Adivina el gol reproduce un clip de un gol real con el goleador oculto. Mira la jugada, el remate y la celebración, y nombra al jugador que marcó. Los clips cubren finales famosas, derbis y goles de culto de los últimos treinta años.",
      "Menos pistas, más puntos: nombra al goleador solo con el clip para el máximo, o revela la temporada, la competición o el club por una recompensa menor. Cinco goles forman una ronda.",
      "La ronda de práctica usa un set fijo de clips. En la app llegan cinco goles nuevos cada día, los nombres correctos dan monedas y los resultados cuentan para tu racha.",
    ],
    tr: [
      "Golü Tahmin Et, golü atan gizlenmiş gerçek bir gol klibi oynatır. Hücumu, vuruşu ve sevinci izle, sonra golü atan oyuncunun adını söyle. Klipler son otuz yılın ünlü finallerini, derbilerini ve efsanevi gollerini kapsar.",
      "Daha az ipucu daha çok puan demektir: en yüksek puan için golcüyü yalnızca klipten bil ya da daha küçük bir ödül için sezonu, turnuvayı veya kulübü aç. Bir tur beş golden oluşur.",
      "Alıştırma turu sabit bir klip seti kullanır. Uygulamada her gün beş yeni gol gelir, doğru isimler jeton kazandırır ve sonuçlar serine sayılır.",
    ],
  },
  "football-clues": {
    en: [
      "Football Clues is a guess-the-player game built on a clue ladder. Every day there are ten hidden footballers, and each one comes with ten clues that start vague — the continent they play for, their position, their stronger foot — and end with the details that give them away: a famous final, a transfer, a record.",
      "You decide how many clues you need. A correct surname on the first clue is worth ten points, and every clue you reveal lowers the points in play by one, down to a single point on the tenth. A wrong guess isn't the end: you get one more try, with at most three more clues to fix it.",
      "Ten new players arrive every day at midnight Argentina time. Without an account you play the previous days and see every answer; signed-in players get today's clues, one ranked run on the daily leaderboard and their streak. At the end you get ten coloured squares to share.",
      "You can also play Football Clues 1v1 against a friend online: send them the room link, you both see the same clues at the same time and the first to type the right surname takes the points. Miss, and your rival gets at most three more clues to get it.",
    ],
    ka: [
      "„საფეხბურთო მინიშნებები“ მოთამაშის გამოცნობის თამაშია. ყოველდღე ათი დამალული ფეხბურთელია, თითოეულს ათი მინიშნება ახლავს — ბუნდოვანიდან (კონტინენტი, პოზიცია, ფეხი) ზუსტამდე.",
      "შენ წყვეტ, რამდენი მინიშნება გჭირდება. პირველივე მინიშნებით სწორი გვარი ათ ქულას იძლევა, ყოველი ახალი მინიშნება ერთ ქულას აკლებს. შეცდომის შემდეგ კიდევ ერთი მცდელობა და მაქსიმუმ სამი მინიშნება გრჩება.",
      "ათი ახალი მოთამაშე ყოველდღე შუაღამისას ჩნდება (არგენტინის დროით). ანგარიშის გარეშე წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს, დღის რეიტინგს და სერიას.",
      "საფეხბურთო მინიშნებები შეგიძლია მეგობართან ერთადაც ითამაშო ონლაინ, პირისპირ: გაუგზავნე ოთახის ბმული, ორივე ერთსა და იმავე მინიშნებებს ხედავთ და ვინც პირველი ჩაწერს სწორ გვარს, ქულებს ის იღებს.",
    ],
    es: [
      "Pistas futboleras es un juego de adivinar el jugador con una escalera de pistas. Cada día hay diez futbolistas ocultos y cada uno tiene diez pistas que arrancan vagas —de qué continente es, en qué puesto juega, con qué pierna le pega— y terminan con los datos que lo delatan: una final famosa, un pase, un récord.",
      "Vos decidís cuántas pistas necesitás. Si escribís el apellido correcto con la primera pista ganás diez puntos, y cada pista que revelás baja un punto lo que está en juego, hasta un solo punto con la décima. Errarle no es el final: tenés un intento más y como máximo tres pistas para corregirlo.",
      "Cada día a la medianoche (hora de Argentina) llegan diez jugadores nuevos. Sin cuenta jugás las pistas de los días anteriores y ves todas las respuestas; con tu cuenta jugás las de hoy, entrás al ranking del día y sumás racha. Al final tenés diez cuadraditos de colores para compartir.",
      "También podés jugar Pistas futboleras 1 contra 1 con un amigo online: mandale el link de la sala, ven las mismas pistas al mismo tiempo y el primero que escribe el apellido correcto se lleva los puntos. Si le errás, tu rival tiene como máximo tres pistas más para sacarlo.",
    ],
    tr: [
      "Futbolcu Tahmin Etme Oyunu, ipucu merdiveniyle oynanan bir futbolcu tahmin oyunudur. Her gün on gizli futbolcu var ve her birinin belirsizden kesine giden on ipucu var.",
      "Kaç ipucuna ihtiyacın olduğuna sen karar verirsin. İlk ipucunda doğru soyadı on puan eder, açtığın her ipucu oyundaki puanı bir azaltır. Yanlış tahminden sonra bir hakkın ve en fazla üç ipucun daha olur.",
      "Her gün gece yarısı (Arjantin saati) on yeni oyuncu gelir. Hesapsız önceki günleri oynarsın; hesapla bugünün ipuçlarını, günün sıralamasını ve serini.",
      "Futbolcu Tahmin Etme Oyunu'nu bir arkadaşınla çevrimiçi 1'e 1 de oynayabilirsin: oda linkini gönder, ikiniz aynı ipuçlarını aynı anda görürsünüz ve doğru soyadını ilk yazan puanları alır.",
    ],
  },
  "guess-the-goal-minute": {
    en: [
      "Guess the Minute of the Goal is the game from the streams: a famous goal appears on screen with the match, the final score, the stage and the scorer, and you say the minute it went in. Ten goals a day from World Cup finals and knockout nights, Champions League ties, the Euro and the Copa América.",
      "The exact minute is worth 3 points. Within two minutes you still get 2, within five minutes 1, and anything further scores nothing, so a perfect day is 30 points. Added time counts on to the minute: a goal at 90+3 is minute 93 and a goal at 45+2 is minute 47.",
      "Every minute is checked against two independent match records before a goal is used. Ten new goals arrive every day at midnight Argentina time. Without an account you play the previous days; signed-in players get today's goals, one ranked run on the daily leaderboard and their streak. At the end you get ten coloured squares to share.",
      "You can also play it 1v1 against a friend online, like on the streams: send them the room link and you both see the same goal at the same time. Each of you types a minute without seeing the other's, then both are revealed: the exact minute takes 3 points, otherwise the closer guess takes 1.",
    ],
    ka: [
      "„გამოიცანი გოლის წუთი“ სტრიმების თამაშია: ეკრანზე ცნობილი გოლი ჩნდება მატჩით, საბოლოო ანგარიშით, ეტაპით და ავტორით, შენ კი ასახელებ წუთს, როცა ის გავიდა. დღეში ათი გოლი მსოფლიო ჩემპიონატის ფინალებიდან, ჩემპიონთა ლიგიდან, ევროდან და კოპა ამერიკიდან.",
      "ზუსტი წუთი 3 ქულაა. ორი წუთის სიზუსტით 2 ქულას იღებ, ხუთი წუთის სიზუსტით 1-ს, უფრო შორს კი — არაფერს, ასე რომ, იდეალური დღე 30 ქულაა. დამატებითი დრო წუთს ემატება: 90+3 წუთზე გატანილი გოლი 93-ე წუთია.",
      "ყოველი წუთი ორ დამოუკიდებელ წყაროსთან მოწმდება. ათი ახალი გოლი ყოველდღე შუაღამისას ჩნდება (არგენტინის დროით). ანგარიშის გარეშე წინა დღეებს თამაშობ; ანგარიშით — დღევანდელს, დღის რეიტინგს და სერიას.",
      "შეგიძლია მეგობართან ერთადაც ითამაშო ონლაინ, პირისპირ: გაუგზავნე ოთახის ბმული და ორივე ერთსა და იმავე გოლს ხედავთ. თითოეული წერს წუთს ისე, რომ მეორისას ვერ ხედავს, შემდეგ ორივე პასუხი ჩანს: ზუსტი წუთი 3 ქულაა, თუ არა — უფრო ახლო პასუხი 1 ქულას იღებს.",
    ],
    es: [
      "Adivina el minuto exacto del gol es el juego de los streams: aparece un gol famoso con el partido, el resultado final, la instancia y el goleador, y vos decís en qué minuto entró. ¿En qué minuto? Diez goles por día de finales y eliminatorias del Mundial, cruces de Champions, la Eurocopa y la Copa América.",
      "El minuto exacto vale 3 puntos. Si quedás a dos minutos o menos sumás 2, a cinco o menos 1, y más lejos no suma, así que un día perfecto son 30 puntos. El tiempo añadido se suma al minuto: un gol en el 90+3 es el minuto 93 y uno en el 45+2 es el 47.",
      "Cada minuto se comprueba con dos registros independientes del partido antes de usar el gol. Cada día a la medianoche (hora de Argentina) llegan diez goles nuevos. Sin cuenta jugás los días anteriores; con tu cuenta jugás los de hoy, entrás al ranking del día y sumás racha. Al final tenés diez cuadraditos de colores para compartir.",
      "También podés jugarlo 1 contra 1 con un amigo online, como en los streams: mandale el link de la sala y los dos ven el mismo gol al mismo tiempo. Cada uno escribe su minuto sin ver el del otro y después se revelan los dos: el minuto exacto se lleva 3 puntos y, si no, el que quedó más cerca se lleva 1.",
    ],
    tr: [
      "Gol Dakikası Tahmin Oyunu yayınlardaki oyundur: ekranda maçı, final skoru, turu ve golü atanla birlikte ünlü bir gol belirir ve sen golün kaçıncı dakikada atıldığını söylersin. Her gün Dünya Kupası finallerinden ve eleme gecelerinden, Şampiyonlar Ligi'nden, EURO'dan ve Copa América'dan on gol.",
      "Tam dakika 3 puan eder. En fazla iki dakika farkla 2, en fazla beş dakika farkla 1 puan alırsın, daha uzağı puan getirmez; yani mükemmel bir gün 30 puandır. Uzatma dakikaya eklenir: 90+3'te atılan gol 93. dakikadır.",
      "Her dakika, gol kullanılmadan önce iki bağımsız maç kaydıyla kontrol edilir. Her gün gece yarısı (Arjantin saati) on yeni gol gelir. Hesapsız önceki günleri oynarsın; hesapla bugünün gollerini, günün sıralamasını ve serini.",
      "Bir arkadaşınla çevrimiçi 1'e 1 de oynayabilirsin: oda linkini gönder, ikiniz aynı golü aynı anda görürsünüz. Herkes diğerininkini görmeden dakikasını yazar, sonra ikisi birden açılır: tam dakika 3 puan, değilse en yakın tahmin 1 puan alır.",
    ],
  },
  "played-for-both-clubs": {
    en: [
      "Played for Both is the football game from the videos: two clubs, one question. Who played for both? Every day there are ten pairs, from rivals who rarely share a player to clubs with dozens of names in common.",
      "You get 20 seconds per pair and you only need one footballer. Type the surname, the full name or the name he is known by; accents do not matter and small typos are forgiven. A wrong answer blocks the box for one second. Loans count: if he was a first-team player there, he is a valid answer.",
      "New pairs arrive every day at midnight Argentina time. Without an account you play the previous days and see example answers for every pair; signed-in players get today's ten pairs and one ranked run on the daily leaderboard, where equal scores are split by speed. Today's answers stay hidden until the day is over.",
      "It is even better with friends. Open a room, share the link and up to six of you race on the same pairs: in a 1v1 the first right answer takes the point, and with three or more the first scores 3, the second 2 and everyone else who finds one scores 1. The host picks the league: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Süper Lig or the biggest clubs mixed.",
    ],
    ka: [
      "„საერთო ფეხბურთელი“ ვიდეოებიდან ნაცნობი თამაშია: ორი კლუბი, ერთი კითხვა. ვინ ითამაშა ორივეში? ყოველდღე ათი წყვილია.",
      "თითო წყვილზე 20 წამი გაქვს და მხოლოდ ერთი ფეხბურთელია საჭირო. დაწერე გვარი, სრული სახელი ან ის სახელი, რომლითაც ცნობილია; მცირე შეცდომები გეპატიება. არასწორი პასუხი ველს ერთი წამით კეტავს. იჯარაც ითვლება.",
      "ახალი წყვილები ყოველდღე შუაღამისას ჩნდება (არგენტინის დროით). ანგარიშის გარეშე წინა დღეებს თამაშობ და ყველა წყვილის სამაგალითო პასუხებს ხედავ; ანგარიშით — დღევანდელ ათ წყვილს და დღის რეიტინგს, სადაც თანაბარ ქულებს სისწრაფე წყვეტს.",
      "მეგობრებთან კიდევ უფრო საინტერესოა. გახსენი ოთახი, გააზიარე ბმული და ექვს მოთამაშემდე ერთსა და იმავე წყვილებზე შეეჯიბრეთ: ერთი ერთზე პირველი სწორი პასუხი იღებს ქულას, სამი ან მეტი მოთამაშისას პირველი 3 ქულას იღებს, მეორე 2-ს, დანარჩენები 1-ს. ლიგას ოთახის მფლობელი ირჩევს.",
    ],
    es: [
      "Jugador en común es el juego de los videos: dos clubes, una pregunta. ¿Quién jugó en los dos? Cada día hay diez pares, desde clásicos que casi no comparten jugadores hasta clubes con decenas de nombres en común.",
      "Tenés 20 segundos por par y alcanza con un solo futbolista. Escribí el apellido, el nombre completo o el apodo; los acentos no importan y se perdonan errores de tipeo. Una respuesta incorrecta bloquea la casilla un segundo. Las cesiones cuentan: si fue jugador del primer equipo, vale.",
      "Los pares nuevos llegan cada día a la medianoche de Argentina. Sin cuenta jugás los días anteriores y ves respuestas de ejemplo de cada par; con tu cuenta jugás los diez pares de hoy y tenés una partida que cuenta para el ranking del día, donde el empate se define por velocidad. Las respuestas de hoy no se muestran hasta que termina el día.",
      "Con amigos es todavía mejor. Abrí una sala, compartí el link y hasta seis juegan los mismos pares: en un 1 contra 1 la primera respuesta correcta se lleva el punto, y con tres o más el primero suma 3, el segundo 2 y los demás que acierten 1. El anfitrión elige la liga: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Süper Lig o los clubes más grandes mezclados.",
    ],
    tr: [
      "Ortak Futbolcu, videolardan bildiğin oyun: iki kulüp, tek soru. İkisinde de kim oynadı? Her gün on eşleşme var; neredeyse hiç ortak oyuncusu olmayan rakiplerden onlarca ortak ismi olan kulüplere kadar.",
      "Her eşleşme için 20 saniyen var ve tek bir futbolcu yeterli. Soyadını, tam adını ya da bilinen adını yaz; Türkçe karakterler ve aksanlar fark etmez, küçük yazım hataları kabul edilir. Yanlış cevap kutuyu bir saniye kilitler. Kiralık dönemler de sayılır.",
      "Yeni eşleşmeler her gün Arjantin saatiyle gece yarısı gelir. Hesapsız önceki günleri oynar ve her eşleşmenin örnek cevaplarını görürsün; hesapla bugünün on eşleşmesini oynar ve günün sıralamasına girersin. Puanlar eşitse hızlı olan üstte yer alır. Bugünün cevapları gün bitene kadar gösterilmez.",
      "Arkadaşlarla daha da keyifli. Bir oda aç, linki paylaş; altı kişiye kadar aynı eşleşmelerde yarışın: 1'e 1'de ilk doğru cevap puanı alır, üç ya da daha fazla kişide ilk bilen 3, ikinci 2, bulan diğer herkes 1 puan alır. Ligi oda sahibi seçer: Süper Lig, Premier Lig, La Liga, Serie A, Bundesliga, Ligue 1 ya da büyük kulüpler karışık.",
    ],
  },
  "football-name-chain": {
    en: [
      "Football Name Chain is the word chain game played with footballers. Each name has to start with the last letter of the one before, so one answer sets up the next: a chain that ends in a hard letter is a trap you set for yourself.",
      "First name or surname both count, so Anthony Martial answers A and M, and the next letter is the last letter of the name he is known by. Accents are ignored: Özil starts with O. You have 10 seconds per name, a wrong answer costs only the time it took, and no footballer can be used twice in a day's run.",
      "Every day has three chains, each from a different well-known footballer. Your score is every name across the three, and the clock shortens by a second every five names, down to six seconds. New chains arrive at midnight Argentina time; without an account you play the previous days, and signed-in players get today's chains and the daily leaderboard.",
      "With friends it becomes a knockout. Open a room for 2 to 6 players and take turns on one shared chain: run out of time and you are out of the round, the last one standing takes the point, and the first to 3 points wins.",
    ],
    ka: [
      "„ფეხბურთელობანა“ სიტყვების ჯაჭვის თამაშია ფეხბურთელებით. ყოველი სახელი წინა სახელის ბოლო ასოთი უნდა იწყებოდეს, ასე რომ ერთი პასუხი შემდეგს ამზადებს.",
      "ითვლება სახელიც და გვარიც, ხოლო შემდეგი ასო იმ სახელის ბოლო ასოა, რომლითაც ფეხბურთელია ცნობილი. სახელები ლათინური ასოებით იწერება. თითო სახელზე 10 წამი გაქვს, არასწორი პასუხი მხოლოდ დროს გაკარგვინებს და ერთი ფეხბურთელი ორჯერ არ ითვლება.",
      "ყოველდღე სამი ჯაჭვია, თითოეული სხვა ცნობილი ფეხბურთელიდან. შენი ქულა სამივე ჯაჭვის ყველა სახელია, ხოლო დრო ყოველ ხუთ სახელზე ერთი წამით მოკლდება, ექვს წამამდე. ახალი ჯაჭვები შუაღამისას ჩნდება (არგენტინის დროით); ანგარიშის გარეშე წინა დღეებს თამაშობ, ანგარიშით — დღევანდელს და დღის რეიტინგს.",
      "მეგობრებთან ეს გამოვარდნის თამაშია. გახსენი ოთახი 2-დან 6 მოთამაშემდე და რიგრიგობით ითამაშეთ ერთ ჯაჭვზე: ვისაც დრო ამოეწურება, რაუნდიდან ვარდება, ბოლოს დარჩენილი იღებს ქულას, ხოლო პირველი, ვინც 3 ქულას დააგროვებს, იგებს.",
    ],
    es: [
      "Cadena de futbolistas es el juego de las palabras encadenadas, pero con futbolistas. Cada nombre tiene que empezar con la última letra del anterior, así que una respuesta prepara la siguiente: una cadena que termina en una letra difícil es una trampa que te ponés vos mismo.",
      "Vale el nombre o el apellido, así que Anthony Martial sirve para la A y para la M, y la letra siguiente es la última del nombre por el que se lo conoce. Los acentos no cuentan. Tenés 10 segundos por nombre, una respuesta incorrecta solo te cuesta el tiempo que tardaste y ningún futbolista vale dos veces en el día.",
      "Cada día hay tres cadenas, cada una desde un futbolista conocido distinto. Tu puntaje es la suma de todos los nombres de las tres, y el reloj se acorta un segundo cada cinco nombres, hasta seis segundos. Las cadenas nuevas llegan a la medianoche de Argentina; sin cuenta jugás los días anteriores, y con tu cuenta las cadenas de hoy y el ranking del día.",
      "Con amigos es por eliminación. Abrí una sala de 2 a 6 jugadores y jueguen por turnos sobre una misma cadena: al que se le acaba el tiempo queda fuera de la ronda, el último en pie se lleva el punto y gana el primero en llegar a 3.",
    ],
    tr: [
      "Son Harfle Futbolcu, kelime zinciri oyununun futbolcularla oynanan hâli. Her isim bir öncekinin son harfiyle başlamak zorunda; yani verdiğin her cevap bir sonrakini hazırlar. Zor bir harfle biten isim, kendine kurduğun tuzaktır.",
      "İsim de soyisim de sayılır: Anthony Martial hem A hem M için geçerlidir; sıradaki harf ise futbolcunun bilinen adının son harfidir. Harfler aksansız sayılır: Özil O ile başlar. Her isim için 10 saniyen var, yanlış cevap sadece zaman kaybettirir ve aynı futbolcu bir günde iki kez söylenemez.",
      "Her gün üç zincir var; her biri farklı, tanınmış bir futbolcuyla başlar. Puanın üç zincirdeki bütün isimlerin toplamıdır ve süre her beş isimde bir saniye kısalır, altı saniyeye kadar. Yeni zincirler Arjantin saatiyle gece yarısı gelir; hesapsız önceki günleri oynarsın, hesapla bugünün zincirlerini ve günün sıralamasını.",
      "Arkadaşlarla eleme oyununa dönüşür. 2-6 kişilik bir oda aç ve tek bir zincirde sırayla oynayın: süresi biten o turdan elenir, ayakta kalan son oyuncu puanı alır ve 3 puana ilk ulaşan kazanır.",
    ],
  },
  "last-answer-standing": {
    en: [
      "Last Answer Standing is a list game. Every day there are five football categories, and each one is a closed list: a World Cup squad, every Copa Libertadores champion, a club's top scorers. You name answers one after another and every correct answer is worth a point.",
      "The clock is the twist. Your first answer gets 20 seconds, and every answer you name shortens the next clock, down to 6 seconds. Three misses in a row or a clock that runs out ends the category. Name the entire list and you earn a +5 bonus on top of the points.",
      "New categories arrive every day at midnight Argentina time. Without an account you play the previous days and see every answer; signed-in players get today's categories, one ranked run on the daily leaderboard and their streak. At the end you get five coloured squares to share: yellow for a whole list, green for half or more, blue for some and black for none.",
      "You can also play Last Answer Standing 1v1 against a friend online, like on the streams: send them the room link and take turns naming answers from the same list. Whoever is left standing wins the category, and the first to win 3 categories wins the duel.",
    ],
    ka: [
      "„ბოლომდე დარჩენილი“ სიების თამაშია. ყოველდღე ხუთი საფეხბურთო კატეგორიაა და თითოეული დახურული სიაა: მსოფლიო ჩემპიონატის შემადგენლობა, ლიბერტადორესის ყველა ჩემპიონი, კლუბის ბომბარდირები. ასახელებ პასუხებს სათითაოდ და ყოველი სწორი პასუხი ერთი ქულაა.",
      "საათი აძნელებს თამაშს. პირველ პასუხზე 20 წამი გაქვს, ყოველი დასახელებული პასუხი შემდეგ საათს ამოკლებს — 6 წამამდე. სამი შეცდომა ზედიზედ ან ამოწურული დრო კატეგორიას ამთავრებს. მთელი სიის დასახელება ქულებს +5 ბონუსს უმატებს.",
      "ახალი კატეგორიები ყოველდღე შუაღამისას ჩნდება (არგენტინის დროით). ანგარიშის გარეშე წინა დღეებს თამაშობ და ყველა პასუხს ხედავ; ანგარიშით — დღევანდელს, დღის რეიტინგს და სერიას. ბოლოს ხუთი ფერადი კვადრატი გეძლევა გასაზიარებლად: ყვითელი — სრული სია, მწვანე — ნახევარი ან მეტი, ლურჯი — რამდენიმე, შავი — არცერთი.",
      "„ბოლომდე დარჩენილი“ მეგობართან ერთადაც ითამაშება ონლაინ, პირისპირ, როგორც სტრიმებზე: გაუგზავნე ოთახის ბმული და რიგრიგობით დაასახელეთ პასუხები ერთი და იმავე სიიდან. ვინც ბოლომდე დარჩება, კატეგორიას იგებს, ხოლო პირველი, ვინც 3 კატეგორიას მოიგებს, დუელს იგებს.",
    ],
    es: [
      "Último en pie futbolero es un juego de listas. Cada día hay cinco categorías futboleras y cada una es una lista cerrada: un plantel mundialista, todos los campeones de la Copa Libertadores, los goleadores de un club. Nombrás respuestas una tras otra y cada acierto vale un punto.",
      "El reloj es lo que lo hace difícil. Para la primera respuesta tenés 20 segundos y cada respuesta que nombrás acorta el reloj siguiente, hasta 6 segundos. Tres errores seguidos o un reloj que llega a cero terminan la categoría. Si nombrás la lista entera, te llevás +5 de bonus sobre los puntos.",
      "Cada día a la medianoche (hora de Argentina) llegan categorías nuevas. Sin cuenta jugás los días anteriores y ves todas las respuestas; con tu cuenta jugás las de hoy, entrás al ranking del día y sumás racha. Al final tenés cinco cuadraditos de colores para compartir: amarillo por una lista completa, verde por la mitad o más, azul por algunas y negro por ninguna.",
      "También podés jugar Último en pie futbolero 1 contra 1 con un amigo online, como en los streams: mandale el link de la sala y se turnan para nombrar respuestas de la misma lista. El que queda en pie gana la categoría y el primero en ganar 3 categorías se lleva el duelo.",
    ],
    tr: [
      "Futbolcu Sayma Oyunu bir liste oyunudur. Her gün beş futbol kategorisi vardır ve her biri kapalı bir listedir: bir Dünya Kupası kadrosu, Copa Libertadores'in tüm şampiyonları, bir kulübün en çok gol atanları. Cevapları art arda sayarsın ve her doğru cevap bir puandır.",
      "Zorluk saatten gelir. İlk cevap için 20 saniyen var ve saydığın her cevap bir sonraki süreyi kısaltır, 6 saniyeye kadar. Üst üste üç yanlış ya da biten süre kategoriyi bitirir. Listenin tamamını sayarsan puanlara +5 bonus eklenir.",
      "Her gün gece yarısı (Arjantin saati) yeni kategoriler gelir. Hesapsız önceki günleri oynar ve tüm cevapları görürsün; hesabınla bugünün kategorilerini oynar, günün sıralamasına girer ve serini sürdürürsün. Sonunda paylaşmak için beş renkli kare alırsın: sarı tam liste, yeşil yarısı ya da fazlası, mavi birkaçı, siyah hiçbiri.",
      "Futbolcu Sayma Oyunu bir arkadaşla çevrimiçi 1'e 1 de oynanır, tıpkı yayınlardaki gibi: oda linkini gönder ve aynı listeden sırayla cevap sayın. Ayakta kalan kategoriyi kazanır, 3 kategoriyi ilk kazanan düelloyu alır.",
    ],
  },
  "football-minesweeper": {
    en: [
      "Football Minesweeper turns a football quiz into a minesweeper board made of players. Every round has one clue and sixteen portrait cards. Twelve players fit the clue and four are mines. The clues range from a club's season and the matchday squad of a famous final to where a player was born or which World Cup he scored in.",
      "Each correct tap adds a point to the round's pot. Stepping on a mine ends the round and wipes that pot, so the real decision is when to bank. Finding all twelve is a perfect round worth fifteen points. A full day is twenty rounds that get harder as you go, for a maximum of three hundred points.",
      "A new board arrives every day at midnight Argentina time. Without an account you play the previous day's board and see every answer after each round; signed-in players get today's board, one ranked run on the daily leaderboard and their streak. At the end you get a grid of twenty coloured squares to share with friends.",
      "Football Minesweeper can also be played 1v1 against a friend online, like on the streams: you take turns picking players, and whoever hits an impostor hands the round's points to the rival. Find all 12 and you both score.",
    ],
    ka: [
      "„საფეხბურთო მაღაროები“ საფეხბურთო ვიქტორინას მოთამაშეებისგან შემდგარ მაღაროების დაფად აქცევს. ყოველ რაუნდში ერთი პირობა და თექვსმეტი ბარათია. თორმეტი მოთამაშე პირობას შეესაბამება, ოთხი მაღაროა.",
      "ყოველი სწორი არჩევანი რაუნდის ბანკს ერთ ქულას უმატებს. მაღარო რაუნდს ამთავრებს და ბანკს აქრობს, ამიტომ მთავარი გადაწყვეტილებაა, როდის შეინახო. თორმეტივეს პოვნა თხუთმეტ ქულას იძლევა. დღეში ოცი რაუნდია, მაქსიმუმ სამასი ქულა.",
      "ახალი დაფა ყოველდღე შუაღამისას ჩნდება (არგენტინის დროით). ანგარიშის გარეშე წინა დღის დაფას თამაშობ და ყოველი რაუნდის შემდეგ პასუხებს ხედავ; ანგარიშით — დღევანდელ დაფას, დღის რეიტინგს და სერიას. ბოლოს ოცი ფერადი კვადრატი გეძლევა გასაზიარებლად.",
      "საფეხბურთო მაღაროები მეგობართან ერთადაც ითამაშება ონლაინ, პირისპირ: რიგრიგობით ირჩევთ მოთამაშეებს და ვინც მატყუარას აირჩევს, რაუნდის ქულებს მეტოქეს აძლევს.",
    ],
    es: [
      "El buscaminas futbolero convierte un quiz de fútbol en un tablero de minas hecho de jugadores. Cada ronda tiene una consigna y dieciséis cartas con cara y nombre. Doce futbolistas la cumplen y cuatro son minas. Las consignas van desde la temporada de un club y la planilla de una final famosa hasta dónde nació un jugador o en qué Mundial hizo un gol.",
      "Cada acierto suma un punto al pozo de la ronda. Pisar una mina termina la ronda y borra ese pozo, así que la decisión de verdad es cuándo plantarse. Encontrar a los doce es una ronda perfecta que vale quince puntos. Un día completo son veinte rondas que se ponen cada vez más difíciles, con un máximo de trescientos puntos.",
      "Cada día a la medianoche de Argentina llega un tablero nuevo. Sin cuenta jugás el tablero del día anterior y ves todas las respuestas al terminar cada ronda; con tu cuenta jugás el de hoy, entrás al ranking del día y sumás racha. Al final te llevás una grilla de veinte cuadraditos de colores para compartir con tus amigos.",
      "El buscaminas futbolero también se juega 1 contra 1 con un amigo online, como en los streams: eligen jugadores por turnos y el que toca un impostor le regala los puntos de la ronda al rival. Si encuentran a los 12, suman los dos.",
    ],
    tr: [
      "Futbol Mayın Tarlası, futbol bilgi yarışmasını oyunculardan oluşan bir mayın tarlasına çevirir. Her turda bir ipucu ve on altı oyuncu kartı vardır. On iki oyuncu ipucuna uyar, dördü mayındır.",
      "Her doğru seçim turun kasasına bir puan ekler. Mayına basmak turu bitirir ve kasayı siler; asıl karar ne zaman kasaya alacağındır. On ikisinin hepsini bulmak on beş puanlık mükemmel bir turdur. Bir gün yirmi turdur ve en fazla üç yüz puan kazanılır.",
      "Her gün Arjantin saatiyle gece yarısı yeni bir tahta gelir. Hesapsız bir önceki günün tahtasını oynar, her turdan sonra tüm cevapları görürsün; hesabınla bugünün tahtasını oynar, günün sıralamasına girer ve serini sürdürürsün. Sonunda arkadaşlarınla paylaşmak için yirmi renkli kareden oluşan bir tablo alırsın.",
      "Futbol Mayın Tarlası bir arkadaşla çevrimiçi 1'e 1 de oynanır: sırayla oyuncu seçersiniz ve sahtekâra basan, turun puanlarını rakibine verir. 12'sini de bulursanız ikiniz de puan alırsınız.",
    ],
  },
  "trivia-mines": {
    en: [
      "Trivia Mines is a football minesweeper. Twenty-five tiles hide four defenders. You choose a stake, open tiles one at a time and every safe tile multiplies the pot by the fair odds of that pick. Hit a defender and the stake is gone; cash out before that and the pot is yours.",
      "You can scout up to three times per round: answer a football question correctly and one hidden defender is flagged. Scouting lowers the risk of the next picks, and the multipliers shrink with it, so the return stays the same whichever way you play. The house keeps three percent at cash-out.",
      "On this page you play with practice points that cannot be withdrawn or converted. In the app, signed-in players stake real coins from their wallet, with stakes between five and five hundred and a capped pot.",
    ],
    ka: [
      "„ტრივია-მაღაროები“ საფეხბურთო მაღაროების მძებნელია. 25 უჯრაში ოთხი მცველი იმალება. ირჩევ ფსონს, ხსნი უჯრებს სათითაოდ და ყოველი უსაფრთხო უჯრა ბანკს იმ სვლის სამართლიანი შანსით ამრავლებს. მცველს დაეჯახე — ფსონი წავიდა; მანამდე აიღე ბანკი — შენია.",
      "რაუნდში სამჯერ შეგიძლია დაზვერვა: სწორად უპასუხე საფეხბურთო კითხვას და ერთი დამალული მცველი მოინიშნება. დაზვერვა შემდეგი სვლების რისკს ამცირებს და მასთან ერთად მულტიპლიკატორებსაც, ამიტომ დაბრუნება ერთი და იგივე რჩება, როგორც არ უნდა ითამაშო. სახლი ბანკის აღებისას სამ პროცენტს იტოვებს.",
      "ამ გვერდზე სავარჯიშო ქულებით თამაშობ, რომელთა გამოტანა ან გადაცვლა შეუძლებელია. აპლიკაციაში ავტორიზებული მოთამაშეები საფულის ნამდვილ ქოინებს დებენ, ხუთიდან ხუთასამდე, შეზღუდული ბანკით.",
    ],
    es: [
      "Minas de trivia es un juego de casillas con preguntas de fútbol. Veinticinco casillas esconden cuatro defensas. Eliges una apuesta, abres casillas de una en una y cada casilla segura multiplica el bote por la probabilidad justa de esa elección. Si tocas un defensa la apuesta se pierde; retira antes y el bote es tuyo.",
      "Puedes explorar hasta tres veces por ronda: responde bien una pregunta de fútbol y se marca un defensa oculto. Explorar reduce el riesgo de las siguientes elecciones y los multiplicadores bajan con él, así que el retorno es el mismo juegues como juegues. La casa se queda el tres por ciento al retirar.",
      "En esta página juegas con puntos de práctica que no se pueden retirar ni convertir. En la app, los jugadores registrados apuestan monedas reales de su cartera, entre cinco y quinientas, con un bote limitado.",
    ],
    tr: [
      "Trivia Mines bir futbol mayın tarlasıdır. Yirmi beş karo dört defans oyuncusunu gizler. Bir bahis seçersin, karoları teker teker açarsın ve her güvenli karo potu o seçimin adil oranıyla çarpar. Bir defans oyuncusuna denk gelirsen bahis gider; ondan önce parayı çekersen pot senindir.",
      "Her turda üç kez keşif yapabilirsin: bir futbol sorusunu doğru cevapla, gizli bir defans oyuncusu işaretlenir. Keşif sonraki seçimlerin riskini düşürür ve çarpanlar da onunla küçülür, böylece nasıl oynarsan oyna beklenen getiri aynı kalır. Para çekişte kasa yüzde üç alır.",
      "Bu sayfada çekilemeyen ve dönüştürülemeyen alıştırma puanlarıyla oynarsın. Uygulamada giriş yapmış oyuncular cüzdanlarından gerçek jeton yatırır; bahisler beş ile beş yüz arasındadır ve potun üst sınırı vardır.",
    ],
  },
  "football-logic": {
    en: [
      "Football Logic is a picture riddle. Two images appear side by side, a club crest next to a landmark, a flag beside an object, an emoji pair, and together they hint at one footballer, one transfer or one famous moment. Read the pair, type the answer, and the next riddle appears.",
      "Riddles come in three flavours: a transfer told through two crests, a career that only one player fits, and pure wordplay where the pictures sound out a name. Surnames and small typos are accepted; a wrong guess shows the answer so you learn the trick before the next one.",
      "The practice round uses a fixed set of riddles. In the app, five new riddles arrive every day, each correct answer earns coins and the day counts towards your streak.",
    ],
    ka: [
      "„საფეხბურთო ლოგიკა“ სურათებიანი თავსატეხია. ორი სურათი გვერდიგვერდ ჩნდება — კლუბის ემბლემა და ღირსშესანიშნაობა, დროშა და საგანი, ემოჯის წყვილი — და ერთად ერთ ფეხბურთელს, ტრანსფერს ან ცნობილ მომენტს მიანიშნებს. წაიკითხე წყვილი, ჩაწერე პასუხი და შემდეგი თავსატეხი გამოჩნდება.",
      "თავსატეხები სამგვარია: ტრანსფერი ორი ემბლემით, კარიერა, რომელსაც მხოლოდ ერთი ფეხბურთელი ერგება, და სიტყვათა თამაში, სადაც სურათები სახელს „ჟღერენ“. გვარი და მცირე შეცდომები მიიღება; არასწორი პასუხი სწორს აჩვენებს, რომ შემდეგისთვის ხერხი ისწავლო.",
      "სავარჯიშო რაუნდი ფიქსირებულ თავსატეხებს იყენებს. აპლიკაციაში ყოველდღე ხუთი ახალი თავსატეხი მოდის, ყოველი სწორი პასუხი ქოინებს იძლევა და დღე სერიაში ითვლება.",
    ],
    es: [
      "Cada reto de Acertijos de fútbol es un acertijo visual. Aparecen dos imágenes juntas, un escudo junto a un monumento, una bandera junto a un objeto, un par de emojis, y entre las dos apuntan a un futbolista, un traspaso o un momento famoso. Lee el par, escribe la respuesta y llega el siguiente acertijo.",
      "Hay tres tipos: un traspaso contado con dos escudos, una carrera que solo encaja con un jugador, y puro juego de palabras donde las imágenes suenan como un nombre. Se aceptan apellidos y erratas pequeñas; un fallo muestra la respuesta para que aprendas el truco antes del siguiente.",
      "La ronda de práctica usa un set fijo de acertijos. En la app llegan cinco nuevos cada día, cada acierto da monedas y el día cuenta para tu racha.",
    ],
    tr: [
      "Futbol Bilmeceleri'nde her soru resimli bir bilmecedir. Yan yana iki görsel belirir: bir kulüp arması yanında bir simge yapı, bir bayrak yanında bir nesne, bir emoji çifti; birlikte tek bir futbolcuya, tek bir transfere ya da tek bir ünlü ana işaret ederler. İkiliyi oku, cevabı yaz ve sonraki bilmece gelsin.",
      "Bilmeceler üç çeşittir: iki armayla anlatılan bir transfer, yalnızca tek bir oyuncuya uyan bir kariyer ve resimlerin bir ismi seslendirdiği saf kelime oyunu. Soyadları ve küçük yazım hataları kabul edilir; yanlış bir tahmin cevabı gösterir, böylece sonrakinden önce hileyi öğrenirsin.",
      "Alıştırma turu sabit bir bilmece seti kullanır. Uygulamada her gün beş yeni bilmece gelir, her doğru cevap jeton kazandırır ve gün serine sayılır.",
    ],
  },
  "missing-xi": {
    en: [
      "Missing XI shows a famous starting line-up as eleven shirts on the pitch, in the real formation, with every name hidden. The match is named, for example a Champions League final, and your job is to name the player who started in each position. Tap a shirt, type the name, move on.",
      "Every line-up is verified against the official match record, so the formation and the eleven starters are exactly right. Names are matched generously in English and Georgian spellings. You can skip a shirt you cannot recall; skipping reveals the face and the name so the squad still reads complete at the end.",
      "Three line-ups make a day. The practice round uses sample squads; the daily game in the app rotates squads every day, pays coins per shirt named and counts towards your streak.",
    ],
    ka: [
      "„დაკარგული XI“ ცნობილ შემადგენლობას თერთმეტი მაისურით აჩვენებს მოედანზე, ნამდვილი სქემით, დამალული სახელებით. მატჩი დასახელებულია — მაგალითად ჩემპიონთა ლიგის ფინალი — და შენი საქმეა თითოეულ პოზიციაზე დამწყები ფეხბურთელის დასახელება. დააჭირე მაისურს, ჩაწერე სახელი, გააგრძელე.",
      "ყოველი შემადგენლობა ოფიციალურ მატჩის ჩანაწერთანაა შედარებული, ამიტომ სქემა და თერთმეტი დამწყები ზუსტია. სახელები ლმობიერად მოწმდება ინგლისურ და ქართულ მართლწერაში. მაისური, რომელიც არ გახსოვს, შეგიძლია გამოტოვო; გამოტოვება სახესა და სახელს ამხელს, რომ ბოლოს შემადგენლობა სრული იყოს.",
      "დღეს სამი შემადგენლობა ქმნის. სავარჯიშო რაუნდი სანიმუშო გუნდებს იყენებს; აპლიკაციის ყოველდღიური თამაში შემადგენლობებს ყოველდღე ცვლის, დასახელებულ მაისურზე ქოინებს იხდის და სერიაში ითვლება.",
    ],
    es: [
      "Adivina el 11 muestra una alineación famosa como once camisetas sobre el campo, en la formación real, con todos los nombres ocultos. El partido está identificado, por ejemplo una final de Champions, y tu tarea es nombrar al jugador que salió de inicio en cada posición. Toca una camiseta, escribe el nombre y sigue.",
      "Cada alineación está verificada con el acta oficial del partido, así que la formación y los once titulares son exactos. Los nombres se comparan con generosidad. Puedes saltar una camiseta que no recuerdes; saltarla revela la cara y el nombre para que el once quede completo al final.",
      "Tres alineaciones forman un día. La ronda de práctica usa equipos de muestra; el juego diario de la app cambia las alineaciones cada día, paga monedas por camiseta acertada y cuenta para tu racha.",
    ],
    tr: [
      "İlk 11 Tahmin Etme ünlü bir ilk on biri sahada on bir forma olarak, gerçek dizilişte ve her isim gizli şekilde gösterir. Maç adlandırılmıştır, örneğin bir Şampiyonlar Ligi finali; görevin her mevkide maça başlayan oyuncunun adını söylemektir. Bir formaya dokun, ismi yaz, devam et.",
      "Her ilk on bir resmî maç kaydına göre doğrulanır, bu yüzden diziliş ve on bir oyuncu tam olarak doğrudur. İsimler İngilizce ve Gürcüce yazımlarıyla esnek eşleştirilir. Hatırlayamadığın bir formayı atlayabilirsin; atlamak yüzü ve ismi açar, böylece kadro sonunda yine eksiksiz görünür.",
      "Bir gün üç ilk on birden oluşur. Alıştırma turu örnek kadrolar kullanır; uygulamadaki günlük oyun kadroları her gün değiştirir, bilinen forma başına jeton öder ve serine sayılır.",
    ],
  },
  "pass-chain": {
    en: [
      "Pass Chain gives you two footballers who never played together and asks you to connect them. Type a player who shared a club, a manager or a dressing room with the current end of the chain; if the link is real, the chain grows by one and the new player becomes the end. Reach the target and the puzzle is solved.",
      "Every link is checked against a verified career graph, so a guess only counts when the two players genuinely overlapped. Fewer links score more: every puzzle has a known shortest route, and beating or matching it is the goal. If you are stuck, reveal the shortest chain and move on.",
      "Two puzzles make a day, one warm-up and one that needs a less obvious bridge. The practice round uses sample puzzles; the daily game in the app rotates puzzles every day, pays coins per solve and counts towards your streak.",
    ],
    ka: [
      "„პასების ჯაჭვი“ ორ ფეხბურთელს გაძლევს, რომლებიც ერთად არასოდეს უთამაშიათ, და მათ დაკავშირებას გთხოვს. ჩაწერე ფეხბურთელი, რომელსაც ჯაჭვის ბოლო წევრთან საერთო კლუბი, მწვრთნელი ან გასახდელი ჰქონდა; თუ კავშირი ნამდვილია, ჯაჭვი ერთით იზრდება და ახალი ფეხბურთელი ბოლო ხდება. მიაღწიე სამიზნეს — თავსატეხი ამოხსნილია.",
      "ყოველი რგოლი დადასტურებულ კარიერულ გრაფთან მოწმდება, ამიტომ ვარაუდი მხოლოდ მაშინ ითვლება, როცა ორი ფეხბურთელი მართლა იკვეთებოდა. ნაკლები რგოლი — მეტი ქულა: ყოველ თავსატეხს ცნობილი უმოკლესი გზა აქვს. თუ გაიჭედე, გახსენი უმოკლესი ჯაჭვი და გააგრძელე.",
      "დღეს ორი თავსატეხი ქმნის — გასახურებელი და ისეთი, რომელსაც ნაკლებად აშკარა ხიდი სჭირდება. სავარჯიშო რაუნდი სანიმუშო თავსატეხებს იყენებს; აპლიკაციის ყოველდღიური თამაში თავსატეხებს ყოველდღე ცვლის, ამოხსნაზე ქოინებს იხდის და სერიაში ითვლება.",
    ],
    es: [
      "Conectando jugadores te da dos futbolistas que nunca jugaron juntos y te pide conectarlos. Escribe un jugador que compartió club, entrenador o vestuario con el extremo actual de la cadena; si el vínculo es real, la cadena crece en uno y el nuevo jugador pasa a ser el extremo. Llega al objetivo y el puzle está resuelto.",
      "Cada eslabón se comprueba contra un grafo de carreras verificado, así que una respuesta solo cuenta si los dos jugadores coincidieron de verdad. Menos eslabones, más puntos: cada puzle tiene una ruta más corta conocida y el objetivo es igualarla o mejorarla. Si te atascas, revela la cadena más corta y sigue.",
      "Dos puzles forman un día, uno de calentamiento y otro que necesita un puente menos evidente. La ronda de práctica usa puzles de muestra; el juego diario de la app los cambia cada día, paga monedas por solución y cuenta para tu racha.",
    ],
    tr: [
      "Futbolcu Bağlantı Zinciri sana hiç birlikte oynamamış iki futbolcu verir ve onları bağlamanı ister. Zincirin şu anki ucuyla bir kulübü, bir teknik direktörü ya da bir soyunma odasını paylaşmış bir oyuncu yaz; bağlantı gerçekse zincir bir halka uzar ve yeni oyuncu uç olur. Hedefe ulaştığında bulmaca çözülmüştür.",
      "Her halka doğrulanmış bir kariyer grafiğine göre kontrol edilir, bu yüzden bir tahmin yalnızca iki oyuncu gerçekten aynı dönemde bulunmuşsa sayılır. Daha az halka daha çok puan getirir: her bulmacanın bilinen bir en kısa yolu vardır ve onu yakalamak ya da geçmek hedeftir. Takılırsan en kısa zinciri açıp devam et.",
      "Bir gün iki bulmacadan oluşur: bir ısınma ve daha az belirgin bir köprü gerektiren bir tane. Alıştırma turu örnek bulmacalar kullanır; uygulamadaki günlük oyun bulmacaları her gün değiştirir, çözüm başına jeton öder ve serine sayılır.",
    ],
  },
  "stat-sniper": {
    en: [
      "Closest Wins is a football numbers game. Each question names a real figure: a transfer fee, a player's peak market value, his league goals in a season, his games for a club, his height or the crowd at a big European night. You give a number, and the closer it is to the truth, the better.",
      "Solo, it is a daily: ten questions, a slider across a plausible range, and points by proximity (the exact value scores 100, a quarter of the range away scores nothing), with the day's accuracy leaderboard. With friends, 2 to 6 players type their guesses at the same time and the closest takes the round: in a 1v1 the closest scores, with three or more there is a podium, and an exact answer earns a bonus.",
      "It is the same idea as the price-is-right and \"closest wins\" tie-breaker of a pub quiz, built on football: guess the transfer fee, guess the market value, guess the attendance. Every number comes from a traceable dataset, and the friend rooms use their own question pool, so nobody can learn the answers from the daily.",
    ],
    ka: [
      "„სტატ სნაიპერი“ ფეხბურთის რიცხვების ქვიზია. ყოველი კითხვა ნამდვილ რიცხვს ეხება: ტრანსფერის ფასს, ფეხბურთელის პიკურ საბაზრო ღირებულებას, გოლებს სეზონში, მატჩებს კლუბში, სიმაღლეს ან დამსწრეთა რაოდენობას დიდ ევროპულ მატჩზე. ასახელებ რიცხვს — რაც უფრო ახლოსაა სიმართლესთან, მით უკეთესი.",
      "მარტო ეს ყოველდღიური გამოწვევაა: ათი კითხვა, სლაიდერი სავარაუდო დიაპაზონზე და ქულა სიახლოვით (ზუსტი მნიშვნელობა 100 ქულაა, დიაპაზონის მეოთხედით დაშორება — ნული) და დღის ლიდერბორდი. მეგობრებთან 2–6 მოთამაშე ერთდროულად წერს თავის რიცხვს და რაუნდს ყველაზე ახლოს მოხვედრილი იგებს: 1-ზე-1 თამაშში ქულას ყველაზე ახლოს მყოფი იღებს, სამიდან — პოდიუმია, ზუსტი პასუხი კი ბონუსს იძლევა.",
      "ყოველი რიცხვი მონაცემთა ბაზამდე მიდის, ხოლო მეგობრების ოთახებს საკუთარი კითხვების ნაკრები აქვს, ამიტომ ყოველდღიური თამაშიდან პასუხებს ვერავინ ისწავლის.",
    ],
    es: [
      "Aproximado futbolero es un juego de cifras del fútbol. Cada pregunta nombra un número real: el precio de un fichaje, el valor de mercado máximo de un jugador, sus goles en liga en una temporada, sus partidos en un club, su altura o el público de una gran noche europea. Das una cifra, y cuanto más se acerque a la real, mejor.",
      "Solo es un reto diario: diez preguntas, un deslizador sobre un rango plausible y puntos por proximidad (el valor exacto vale 100, a un cuarto del rango no suma), con la clasificación de precisión del día. Con amigos, de 2 a 6 jugadores escriben su cifra a la vez y gana la ronda el que más se acerca: en un 1 contra 1 suma el más cercano, con tres o más hay podio, y el pleno da bonus.",
      "Es el mismo espíritu del precio justo y del clásico \"quién se acerca más gana\", con fútbol: adivina el precio del jugador, su valor de mercado o el público de un partido. Cada dato es trazable a su conjunto de datos, y las salas con amigos usan su propio banco de preguntas, así que nadie puede aprenderse las respuestas del reto diario.",
    ],
    tr: [
      "En Yakın Tahmin, bir futbol sayıları oyunudur. Her soru gerçek bir sayıyı sorar: bir bonservis bedeli, bir oyuncunun en yüksek piyasa değeri, bir sezondaki lig golleri, bir kulüpteki maç sayısı, boyu ya da büyük bir Avrupa gecesindeki seyirci sayısı. Bir sayı söylersin; gerçeğe ne kadar yakınsa o kadar iyi.",
      "Tek başına bir günlük oyundur: on soru, makul bir aralıkta bir kaydırıcı ve yakınlığa göre puan (tam değer 100 puan, aralığın dörtte biri kadar uzak tahmin sıfır) ve günün isabet liderlik tablosu. Arkadaşlarla 2–6 oyuncu tahminini aynı anda yazar ve turu en yakın tahmin eden kazanır: 1v1'de en yakın olan puan alır, üç ve daha fazla oyuncuda kürsü vardır, tam isabet bonus kazandırır.",
      "Her sayı izlenebilir bir veri setinden gelir ve arkadaş odaları kendi soru havuzunu kullanır; böylece kimse cevapları günlük oyundan ezberleyemez.",
    ],
  },
  "free-kicks": {
    en: [
      "Free Kicks is a coin game with a goal wall. You stake coins, and each attack starts with a football question. A correct answer opens another section of the goal and asks the next question; a wrong answer or a timeout locks answering, so you have to shoot with whatever is open.",
      "When you shoot, you pick a zone; the keeper dives for one of the open zones and the pot pays out according to how many were open, so more correct answers mean a safer shot and a bigger multiplier. Miss and the stake is gone; score and you can cash out or take another attack with the pot on the line.",
      "On this page you play with practice points that cannot be withdrawn. In the app, signed-in players stake real coins from their wallet, with the same fair odds and the house margin shown on every state.",
    ],
    ka: [
      "„თავისუფალი დარტყმები“ ქოინების თამაშია კარის კედლით. დებ ფსონს და ყოველი შეტევა საფეხბურთო კითხვით იწყება. სწორი პასუხი კარის კიდევ ერთ მონაკვეთს ხსნის და შემდეგ კითხვას სვამს; შეცდომა ან დროის ამოწურვა პასუხებს ბლოკავს და უნდა დაარტყა იმით, რაც გახსნილია.",
      "დარტყმისას ზონას ირჩევ; მეკარე ერთ-ერთ გახსნილ ზონაში ვარდება და ბანკი გახსნილი ზონების რაოდენობის მიხედვით იხდის — მეტი სწორი პასუხი უფრო უსაფრთხო დარტყმასა და მეტ მულტიპლიკატორს ნიშნავს. ააცილე — ფსონი წავიდა; გაიტანე — აიღე ბანკი ან სცადე შემდეგი შეტევა.",
      "ამ გვერდზე სავარჯიშო ქულებით თამაშობ, რომელთა გამოტანა შეუძლებელია. აპლიკაციაში ავტორიზებული მოთამაშეები საფულის ნამდვილ ქოინებს დებენ, იმავე სამართლიანი შანსებით და ყოველ მდგომარეობაზე ნაჩვენები სახლის მარჟით.",
    ],
    es: [
      "Tiros libres es un juego con monedas y una barrera en la portería. Apuestas monedas y cada ataque empieza con una pregunta de fútbol. Un acierto abre otra sección de la portería y lanza la siguiente pregunta; un fallo o el tiempo agotado bloquea las respuestas y tienes que tirar con lo que esté abierto.",
      "Al tirar eliges una zona; el portero se lanza a una de las zonas abiertas y el bote paga según cuántas había abiertas, así que más aciertos significan un tiro más seguro y un multiplicador mayor. Falla y la apuesta se pierde; marca y puedes retirar o jugar otro ataque con el bote en juego.",
      "En esta página juegas con puntos de práctica que no se pueden retirar. En la app, los jugadores registrados apuestan monedas reales de su cartera, con las mismas probabilidades justas y el margen de la casa visible en cada estado.",
    ],
    tr: [
      "Serbest Vuruşlar, kale duvarlı bir jeton oyunudur. Jeton yatırırsın ve her hücum bir futbol sorusuyla başlar. Doğru cevap kalenin bir bölümünü daha açar ve sonraki soruyu sorar; yanlış cevap ya da süre aşımı cevaplamayı kilitler, böylece açık ne varsa onunla şut çekmen gerekir.",
      "Şut çektiğinde bir bölge seçersin; kaleci açık bölgelerden birine uzanır ve pot kaç bölgenin açık olduğuna göre öder; yani daha çok doğru cevap daha güvenli bir şut ve daha büyük bir çarpan demektir. Kaçırırsan bahis gider; gol atarsan parayı çekebilir ya da potu ortaya koyarak yeni bir hücum yapabilirsin.",
      "Bu sayfada çekilemeyen alıştırma puanlarıyla oynarsın. Uygulamada giriş yapmış oyuncular cüzdanlarından gerçek jeton yatırır; aynı adil oranlar ve her durumda gösterilen kasa payı geçerlidir.",
    ],
  },
  "road-to-goal": {
    en: [
      "Road to Goal is a ladder of eleven zones from your own box to the opponent's goal. You choose a fixed stake, then answer one football question per zone under a fifteen-second clock. Each correct answer moves you up a zone and raises the multiplier; the questions get harder the closer you get to goal.",
      "After every zone you decide: cash out what the ladder is worth so far, or continue to the next question with the whole pot at risk. One wrong answer or timeout ends the run and the stake is lost. Clearing all eleven zones pays the top of the ladder.",
      "On this page you play with practice points only. In the app, signed-in players stake real coins at fixed amounts, the question order is committed before the run starts, and the round proof can be verified afterwards.",
    ],
    ka: [
      "„გზა კარამდე“ თერთმეტი ზონის კიბეა შენი მოედნის ნახევრიდან მოწინააღმდეგის კარამდე. ირჩევ ფიქსირებულ ფსონს და ყოველ ზონაზე ერთ საფეხბურთო კითხვას პასუხობ თხუთმეტწამიან დროში. ყოველი სწორი პასუხი ერთი ზონით წინ გწევს და მულტიპლიკატორს ზრდის; კარისკენ კითხვები რთულდება.",
      "ყოველი ზონის შემდეგ წყვეტ: აიღე, რაც კიბემ აქამდე მოგცა, ან გააგრძელე შემდეგი კითხვისკენ მთელი ბანკის რისკით. ერთი შეცდომა ან დროის ამოწურვა სერიას ამთავრებს და ფსონი იკარგება. თერთმეტივე ზონის გავლა კიბის მაქსიმუმს იხდის.",
      "ამ გვერდზე მხოლოდ სავარჯიშო ქულებით თამაშობ. აპლიკაციაში ავტორიზებული მოთამაშეები ფიქსირებული ოდენობით ნამდვილ ქოინებს დებენ, კითხვების რიგი სერიის დაწყებამდე ფიქსირდება და რაუნდის მტკიცებულების გადამოწმება მოგვიანებით შეიძლება.",
    ],
    es: [
      "Camino al gol es una escalera de once zonas desde tu área hasta la portería rival. Eliges una apuesta fija y respondes una pregunta de fútbol por zona con quince segundos de reloj. Cada acierto te sube una zona y aumenta el multiplicador; las preguntas se endurecen cuanto más cerca estás del gol.",
      "Tras cada zona decides: retirar lo que vale la escalera hasta ahora o seguir a la siguiente pregunta con todo el bote en juego. Un fallo o el tiempo agotado termina la racha y la apuesta se pierde. Superar las once zonas paga el tope de la escalera.",
      "En esta página juegas solo con puntos de práctica. En la app, los jugadores registrados apuestan monedas reales en cantidades fijas, el orden de las preguntas se fija antes de empezar y la prueba de la ronda puede verificarse después.",
    ],
    tr: [
      "Gole Giden Yol, kendi ceza sahandan rakip kaleye on bir bölgelik bir merdivendir. Sabit bir bahis seçersin, sonra on beş saniyelik süre altında bölge başına bir futbol sorusu cevaplarsın. Her doğru cevap seni bir bölge yukarı taşır ve çarpanı yükseltir; kaleye yaklaştıkça sorular zorlaşır.",
      "Her bölgeden sonra karar verirsin: merdivenin o ana kadarki değerini çek ya da tüm potu riske atarak sonraki soruya devam et. Bir yanlış cevap ya da süre aşımı koşuyu bitirir ve bahis kaybedilir. On bir bölgenin tamamını geçmek merdivenin tepesini öder.",
      "Bu sayfada yalnızca alıştırma puanlarıyla oynarsın. Uygulamada giriş yapmış oyuncular sabit tutarlarda gerçek jeton yatırır, soru sırası koşu başlamadan önce sabitlenir ve tur kanıtı sonradan doğrulanabilir.",
    ],
  },
  "squad-spin": {
    en: [
      "Squad Spin is a run of spins. Each spin lands three reels on a club, a position and a nation, and you have fifteen seconds to name a footballer who fits all three, for example a Brazilian forward who played for Chelsea. Four- and five-reel runs add a league, a manager or a trophy and pay more per spin.",
      "A correct answer multiplies the pot; you then choose to cash out or spin again before the next reels are shown, so you never get to peek first. A wrong answer or a timeout ends the run and the stake is lost. Every combo has at least one verified answer, and names are accepted in English and Georgian spellings with typo tolerance.",
      "On this page you play with practice points only. In the app, signed-in players stake real coins, the multipliers come from measured accuracy per difficulty tier, and runs are capped at ten spins and forty times the stake.",
    ],
    ka: [
      "Squad Spin ტრიალების სერიაა. ყოველი ტრიალი სამ ბორბალს კლუბზე, პოზიციასა და ქვეყანაზე აჩერებს და გაქვს თხუთმეტი წამი, რომ დაასახელო ფეხბურთელი, რომელიც სამივეს ერგება — მაგალითად ბრაზილიელი თავდამსხმელი, რომელიც ჩელსიში თამაშობდა. ოთხ- და ხუთბორბლიანი სერიები ლიგას, მწვრთნელს ან ტროფეის ამატებს და ტრიალზე მეტს იხდის.",
      "სწორი პასუხი ბანკს ამრავლებს; შემდეგ ირჩევ — აიღო ბანკი თუ დაატრიალო ისევ — სანამ შემდეგ ბორბლებს დაინახავ, ასე რომ წინასწარ ვერ იჭვრიტები. შეცდომა ან დროის ამოწურვა სერიას ამთავრებს და ფსონი იკარგება. ყოველ კომბინაციას სულ მცირე ერთი დადასტურებული პასუხი აქვს; სახელები ინგლისურად და ქართულად, შეცდომების ტოლერანტობით მიიღება.",
      "ამ გვერდზე მხოლოდ სავარჯიშო ქულებით თამაშობ. აპლიკაციაში ავტორიზებული მოთამაშეები ნამდვილ ქოინებს დებენ, მულტიპლიკატორები სირთულის დონეების გაზომილი სიზუსტიდან მოდის და სერია ათ ტრიალსა და ფსონის ორმოცმაგზე ჩერდება.",
    ],
    es: [
      "Ruleta futbolera es una racha de giros. Cada giro deja tres carretes en un club, una posición y un país, y tienes quince segundos para nombrar un futbolista que encaje en los tres, por ejemplo un delantero brasileño que jugó en el Chelsea. Las rachas de cuatro y cinco carretes añaden liga, entrenador o trofeo y pagan más por giro.",
      "Un acierto multiplica el bote; después eliges retirar o girar de nuevo antes de ver los siguientes carretes, así que nunca puedes mirar primero. Un fallo o el tiempo agotado termina la racha y la apuesta se pierde. Cada combinación tiene al menos una respuesta verificada y los nombres se aceptan con tolerancia a erratas.",
      "En esta página juegas solo con puntos de práctica. En la app, los jugadores registrados apuestan monedas reales, los multiplicadores salen de la precisión medida por nivel de dificultad y las rachas se limitan a diez giros y cuarenta veces la apuesta.",
    ],
    tr: [
      "Futbol Çarkı bir dizi çevirmedir. Her çevirme üç makarayı bir kulüp, bir mevki ve bir ülkeye oturtur ve üçüne de uyan bir futbolcunun adını söylemek için on beş saniyen vardır, örneğin Chelsea'de oynamış Brezilyalı bir forvet. Dört ve beş makaralı koşular bir lig, bir teknik direktör ya da bir kupa ekler ve çevirme başına daha çok öder.",
      "Doğru cevap potu çarpar; sonra, sonraki makaralar gösterilmeden önce parayı çekmeyi ya da yeniden çevirmeyi seçersin, yani asla önceden bakamazsın. Yanlış cevap ya da süre aşımı koşuyu bitirir ve bahis kaybedilir. Her kombinasyonun en az bir doğrulanmış cevabı vardır; isimler yazım hatası toleransıyla İngilizce ve Gürcüce yazımlarıyla kabul edilir.",
      "Bu sayfada yalnızca alıştırma puanlarıyla oynarsın. Uygulamada giriş yapmış oyuncular gerçek jeton yatırır, çarpanlar zorluk seviyesi başına ölçülen isabetten gelir ve koşular on çevirme ve bahsin kırk katıyla sınırlıdır.",
    ],
  },
};
