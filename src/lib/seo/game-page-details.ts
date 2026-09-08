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
};
