import type { Locale } from "@/lib/i18n/locale";

/**
 * The body copy of each published game page (rules, scoring, limits, tips),
 * server-rendered above the practice engine. Keyed by the game-pages.ts slug.
 * A page is only published (public-games.ts `page: true`) once it has a body
 * here in every locale — templated pages with five strings are not indexed.
 */
export const GAME_PAGE_DETAILS: Record<string, Record<Locale, string[]>> = {
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
      "Verdadero o falso es el diario más rápido de Quizball. Aparece una afirmación de fútbol, desde traspasos hasta máximos goleadores, y tienes unos segundos para decidir si es verdadera o falsa. Responde antes de que acabe el tiempo; una respuesta tardía cuenta como fallo.",
      "Las afirmaciones están escritas para sonar creíbles en ambos sentidos, así que el juego premia el conocimiento real sobre la suerte. Cada acierto suma un punto y mantiene viva tu racha.",
      "La ronda de práctica usa una muestra fija. En la app llega un set nuevo cada día, los aciertos dan monedas y tus resultados alimentan la racha diaria.",
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
      "Countdown te da una lista futbolera y un reloj en marcha. La lista puede ser todos los clubes en los que jugó Zlatan Ibrahimović o los últimos diez ganadores del Balón de Oro. Escribe tantas entradas válidas como puedas antes de que acabe el tiempo; cada respuesta aceptada vale un punto.",
      "Los nombres se comparan con generosidad: se aceptan apellidos, formas cortas habituales y pequeños errores de escritura, y una entrada repetida simplemente se ignora. La ronda termina cuando el reloj llega a cero o la lista se completa.",
      "La ronda de práctica usa listas de muestra. La versión diaria de la app cambia las listas cada día, paga monedas por respuesta encontrada y suma a tu racha.",
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
      "Más o menos enfrenta a dos futbolistas con un número oculto: goles en una temporada, precio de traspaso, internacionalidades, edad o valor de mercado. Ves la cifra del primero y decides si la del segundo es mayor o menor.",
      "Un acierto mantiene la racha y trae la siguiente pareja; el primer fallo termina la ronda. Las rondas son cortas y los números salen de registros verificados, así que el juego va de conocer el deporte, no de suerte.",
      "La ronda de práctica usa parejas de muestra. En la app, el set diario cambia cada día, las rondas superadas dan monedas y los resultados cuentan para tu racha.",
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
      "Detective de cartas te entrega una carta de jugador con todas las casillas bloqueadas: valoración general, posición, club, país, liga y edición de la carta. Cada casilla es una pista con su precio en monedas. Abre las pistas que necesites y nombra al jugador.",
      "Empiezas cada carta con un presupuesto. Las pistas baratas dicen poco, las caras casi lo regalan, así que la habilidad está en saber qué única revelación te permitirá acertar. Nombra bien al jugador y conservas lo que no gastaste; agota el presupuesto y la carta se pierde.",
      "Diez cartas forman un día. La ronda de práctica de esta página usa un set de cartas de muestra; el juego diario de la app cambia las cartas cada día, paga monedas por lo que conservas y cuenta para tu racha.",
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
      "Minas de trivia es un buscaminas futbolero. Veinticinco casillas esconden cuatro defensas. Eliges una apuesta, abres casillas de una en una y cada casilla segura multiplica el bote por la probabilidad justa de esa elección. Si tocas un defensa la apuesta se pierde; retira antes y el bote es tuyo.",
      "Puedes explorar hasta tres veces por ronda: responde bien una pregunta de fútbol y se marca un defensa oculto. Explorar reduce el riesgo de las siguientes elecciones y los multiplicadores bajan con él, así que el retorno es el mismo juegues como juegues. La casa se queda el tres por ciento al retirar.",
      "En esta página juegas con puntos de práctica que no se pueden retirar ni convertir. En la app, los jugadores registrados apuestan monedas reales de su cartera, entre cinco y quinientas, con un bote limitado.",
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
      "Lógica futbolera es un acertijo visual. Aparecen dos imágenes juntas, un escudo junto a un monumento, una bandera junto a un objeto, un par de emojis, y entre las dos apuntan a un futbolista, un traspaso o un momento famoso. Lee el par, escribe la respuesta y llega el siguiente acertijo.",
      "Hay tres tipos: un traspaso contado con dos escudos, una carrera que solo encaja con un jugador, y puro juego de palabras donde las imágenes suenan como un nombre. Se aceptan apellidos y erratas pequeñas; un fallo muestra la respuesta para que aprendas el truco antes del siguiente.",
      "La ronda de práctica usa un set fijo de acertijos. En la app llegan cinco nuevos cada día, cada acierto da monedas y el día cuenta para tu racha.",
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
      "Once perdido muestra una alineación famosa como once camisetas sobre el campo, en la formación real, con todos los nombres ocultos. El partido está identificado, por ejemplo una final de Champions, y tu tarea es nombrar al jugador que salió de inicio en cada posición. Toca una camiseta, escribe el nombre y sigue.",
      "Cada alineación está verificada con el acta oficial del partido, así que la formación y los once titulares son exactos. Los nombres se comparan con generosidad. Puedes saltar una camiseta que no recuerdes; saltarla revela la cara y el nombre para que el once quede completo al final.",
      "Tres alineaciones forman un día. La ronda de práctica usa equipos de muestra; el juego diario de la app cambia las alineaciones cada día, paga monedas por camiseta acertada y cuenta para tu racha.",
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
      "Cadena de pases te da dos futbolistas que nunca jugaron juntos y te pide conectarlos. Escribe un jugador que compartió club, entrenador o vestuario con el extremo actual de la cadena; si el vínculo es real, la cadena crece en uno y el nuevo jugador pasa a ser el extremo. Llega al objetivo y el puzle está resuelto.",
      "Cada eslabón se comprueba contra un grafo de carreras verificado, así que una respuesta solo cuenta si los dos jugadores coincidieron de verdad. Menos eslabones, más puntos: cada puzle tiene una ruta más corta conocida y el objetivo es igualarla o mejorarla. Si te atascas, revela la cadena más corta y sigue.",
      "Dos puzles forman un día, uno de calentamiento y otro que necesita un puente menos evidente. La ronda de práctica usa puzles de muestra; el juego diario de la app los cambia cada día, paga monedas por solución y cuenta para tu racha.",
    ],
  },
  "stat-sniper": {
    en: [
      "Stat Sniper is a numbers game. Each question names a real football statistic, such as a player's league goals in a season, a club's record transfer fee or a stadium's capacity, and gives you a slider across a plausible range. Move the slider to your guess and lock it in before the timer runs out.",
      "Scoring is by proximity: the exact value scores 100, and points fall away the further you land from it, reaching zero at a quarter of the slider's span. Ten questions make a round and your accuracy is the average, so a run of close guesses beats one bullseye and nine wild swings.",
      "Every fact is traceable to its dataset. The practice round uses a sample set; in the app every player gets the same ten questions each day and the day's accuracy leaderboard ranks them, with coins for your score and a place in your streak.",
    ],
    ka: [
      "„სტატ-სნაიპერი“ რიცხვების თამაშია. ყოველი კითხვა ნამდვილ საფეხბურთო სტატისტიკას ასახელებს — ფეხბურთელის გოლები სეზონში, კლუბის რეკორდული ტრანსფერი, სტადიონის ტევადობა — და სლაიდერს გაძლევს სავარაუდო დიაპაზონზე. მიიტანე სლაიდერი ვარაუდამდე და დააფიქსირე დროის ამოწურვამდე.",
      "ქულა სიახლოვით ითვლება: ზუსტი მნიშვნელობა 100 ქულაა და ქულები მცირდება, რაც უფრო შორს ხარ, სლაიდერის მეოთხედზე ნულამდე. ათი კითხვა რაუნდია და სიზუსტე საშუალოა, ამიტომ ახლო ვარაუდების სერია ერთ ზუსტსა და ცხრა შორს სჯობს.",
      "ყოველი ფაქტი თავის მონაცემთა ბაზამდე მიდის. სავარჯიშო რაუნდი სანიმუშო ნაკრებს იყენებს; აპლიკაციაში ყველა მოთამაშე ყოველდღე ერთსა და იმავე ათ კითხვას იღებს და დღის სიზუსტის ლიდერბორდი მათ ალაგებს, ქოინებით შენი ქულისთვის და ადგილით სერიაში.",
    ],
    es: [
      "Francotirador de datos es un juego de números. Cada pregunta nombra una estadística real del fútbol, como los goles de un jugador en una temporada, el fichaje récord de un club o el aforo de un estadio, y te da un deslizador sobre un rango plausible. Mueve el deslizador hasta tu estimación y fíjala antes de que acabe el tiempo.",
      "Se puntúa por proximidad: el valor exacto vale 100 y los puntos bajan cuanto más lejos caes, hasta cero a un cuarto del recorrido del deslizador. Diez preguntas forman una ronda y tu precisión es la media, así que una serie de estimaciones cercanas gana a un pleno y nueve disparates.",
      "Cada dato es trazable a su conjunto de datos. La ronda de práctica usa un set de muestra; en la app todos reciben las mismas diez preguntas cada día y la clasificación de precisión del día los ordena, con monedas por tu puntuación y un lugar en tu racha.",
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
      "Squad Spin es una racha de giros. Cada giro deja tres carretes en un club, una posición y un país, y tienes quince segundos para nombrar un futbolista que encaje en los tres, por ejemplo un delantero brasileño que jugó en el Chelsea. Las rachas de cuatro y cinco carretes añaden liga, entrenador o trofeo y pagan más por giro.",
      "Un acierto multiplica el bote; después eliges retirar o girar de nuevo antes de ver los siguientes carretes, así que nunca puedes mirar primero. Un fallo o el tiempo agotado termina la racha y la apuesta se pierde. Cada combinación tiene al menos una respuesta verificada y los nombres se aceptan con tolerancia a erratas.",
      "En esta página juegas solo con puntos de práctica. En la app, los jugadores registrados apuestan monedas reales, los multiplicadores salen de la precisión medida por nivel de dificultad y las rachas se limitan a diez giros y cuarenta veces la apuesta.",
    ],
  },
};
