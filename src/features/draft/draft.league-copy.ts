import type { Honour } from "./draft.rules";

/** League choice, weekly boards and the hidden Budget squads: merged into the Football Draft copy by `draftCopy`. */
export interface LeagueCopy {
  rules: readonly string[];
  chooseLeague: string; iconicName: string; iconicNote: string; boardWeek: (league: string) => string; yourWeek: (rec: string) => string; draftIn: (league: string) => string;
  signInBoard: string; teamHidden: string; hiddenRule: string; boardEmpty: string; weekReset: string; ratingOnSign: string; honours: Record<Honour, string>;
}

const en: LeagueCopy = {
  rules: [
    "Pick a league, then spin a club and a season and sign one of its players.",
    "You see names and prices only: each rating is revealed when you sign him. Big names cost more, breakout seasons come cheap.",
    "Fill all 11 places within your budget, then your XI plays a full league season.",
    "Every league has its own weekly leaderboard. Your best season of the week counts.",
  ],
  chooseLeague: "Choose your league", iconicName: "Iconic Clubs", iconicNote: "The greatest seasons ever", boardWeek: (l) => `${l} · this week`, yourWeek: (r) => `Your best this week: ${r}`, draftIn: (l) => `Draft in ${l}`,
  teamHidden: "This team is also a live challenge: play it first to see the XI.",
  signInBoard: "Sign in to get on the weekly leaderboard", hiddenRule: "Ratings stay hidden until you sign a player: judge him by his name and his price.", boardEmpty: "Nobody on this week's board yet. Be the first.", weekReset: "Boards reset every Monday", ratingOnSign: "Rating on signing",
  honours: { treble: "Treble winners", double: "Double winners", champions: "League champions", unbeaten: "Unbeaten champions", centurions: "100-point champions", ucl_winners: "Champions League winners", ucl_final: "European Cup finalists", ucl_semi: "Champions League semi-finalists", european_cup: "European Cup winners", uefa_cup: "UEFA Cup winners", europa_league: "Europa League winners", surprise: "Shock of the season", title_race: "Title race to the last day" },
};

const es: LeagueCopy = {
  rules: [
    "Elegí una liga, girá un club y una temporada y fichá a uno de sus jugadores.",
    "Solo ves nombres y precios: la valoración aparece cuando lo fichás. Los nombres famosos cuestan más; las temporadas sorpresa salen baratas.",
    "Completá los 11 puestos con tu presupuesto y tu once juega una liga entera.",
    "Cada liga tiene su ranking semanal. Cuenta tu mejor temporada de la semana.",
  ],
  chooseLeague: "Elegí tu liga", iconicName: "Clubes icónicos", iconicNote: "Las temporadas más grandes de la historia", boardWeek: (l) => `${l} · esta semana`, yourWeek: (r) => `Tu mejor de la semana: ${r}`, draftIn: (l) => `Jugar en ${l}`,
  teamHidden: "Este equipo también es un desafío abierto: jugalo primero para ver el once.",
  signInBoard: "Iniciá sesión para entrar al ranking semanal", hiddenRule: "Las valoraciones se ven recién cuando fichás: juzgá por el nombre y el precio.", boardEmpty: "Todavía no hay nadie en el ranking de esta semana. Sé el primero.", weekReset: "El ranking se reinicia cada lunes", ratingOnSign: "Valoración al fichar",
  honours: { treble: "Triplete", double: "Doblete", champions: "Campeón de liga", unbeaten: "Campeón invicto", centurions: "Campeón de los 100 puntos", ucl_winners: "Campeón de la Champions", ucl_final: "Finalista de Europa", ucl_semi: "Semifinalista de la Champions", european_cup: "Campeón de la Copa de Europa", uefa_cup: "Campeón de la Copa UEFA", europa_league: "Campeón de la Europa League", surprise: "La sorpresa de la temporada", title_race: "Pelea por el título hasta el final" },
};

const tr: LeagueCopy = {
  rules: [
    "Bir lig seç, bir kulüp ve sezon çevir, kadrodan bir oyuncu al.",
    "Sadece isimleri ve fiyatları görürsün: reyting, oyuncuyu aldığında açılır. Ünlü isimler pahalı, sürpriz sezonlar ucuzdur.",
    "11 mevkiyi bütçenle doldur, ilk 11'in tam bir lig sezonu oynasın.",
    "Her ligin kendi haftalık sıralaması var. Haftanın en iyi sezonun sayılır.",
  ],
  chooseLeague: "Ligini seç", iconicName: "İkonik Kulüpler", iconicNote: "Tarihin en büyük sezonları", boardWeek: (l) => `${l} · bu hafta`, yourWeek: (r) => `Bu haftaki en iyin: ${r}`, draftIn: (l) => `${l} ile başla`,
  teamHidden: "Bu takım aynı zamanda açık bir meydan okuma: ilk 11'i görmek için önce onu oyna.",
  signInBoard: "Haftalık sıralamaya girmek için giriş yap", hiddenRule: "Reytingler ancak transfer edince görünür: isme ve fiyata göre karar ver.", boardEmpty: "Bu hafta sıralamada henüz kimse yok. İlk sen ol.", weekReset: "Sıralama her pazartesi sıfırlanır", ratingOnSign: "Reyting transferde",
  honours: { treble: "Üçleme", double: "Çifte kupa", champions: "Lig şampiyonu", unbeaten: "Yenilgisiz şampiyon", centurions: "100 puanlı şampiyon", ucl_winners: "Şampiyonlar Ligi şampiyonu", ucl_final: "Avrupa finalisti", ucl_semi: "Şampiyonlar Ligi yarı finalisti", european_cup: "Avrupa Kupası şampiyonu", uefa_cup: "UEFA Kupası şampiyonu", europa_league: "Avrupa Ligi şampiyonu", surprise: "Sezonun sürprizi", title_race: "Son haftaya kadar şampiyonluk yarışı" },
};

const ka: LeagueCopy = {
  rules: [
    "აირჩიე ლიგა, დაატრიალე კლუბი და სეზონი და აიყვანე მისი ერთ-ერთი მოთამაშე.",
    "ხედავ მხოლოდ სახელებსა და ფასებს: რეიტინგი ხელმოწერისას ჩანს. ცნობილი სახელები ძვირია, მოულოდნელი სეზონები — იაფი.",
    "შეავსე 11-ვე პოზიცია შენი ბიუჯეტით და შენი გუნდი სრულ სეზონს ითამაშებს.",
    "ყველა ლიგას თავისი კვირის რეიტინგი აქვს. ითვლება კვირის შენი საუკეთესო სეზონი.",
  ],
  chooseLeague: "აირჩიე ლიგა", iconicName: "ლეგენდარული კლუბები", iconicNote: "ისტორიის უდიდესი სეზონები", boardWeek: (l) => `${l} · ამ კვირაში`, yourWeek: (r) => `შენი საუკეთესო ამ კვირაში: ${r}`, draftIn: (l) => `თამაში: ${l}`,
  teamHidden: "ეს გუნდი ღია გამოწვევაცაა: შემადგენლობის სანახავად ჯერ ის ითამაშე.",
  signInBoard: "შედი ანგარიშზე, რომ კვირის რეიტინგში მოხვდე", hiddenRule: "რეიტინგი მხოლოდ ხელმოწერის შემდეგ ჩანს: შეაფასე სახელითა და ფასით.", boardEmpty: "ამ კვირის რეიტინგში ჯერ არავინაა. იყავი პირველი.", weekReset: "რეიტინგი ყოველ ორშაბათს ახლდება", ratingOnSign: "რეიტინგი ხელმოწერისას",
  honours: { treble: "სამმაგი", double: "ორმაგი", champions: "ლიგის ჩემპიონი", unbeaten: "დაუმარცხებელი ჩემპიონი", centurions: "100-ქულიანი ჩემპიონი", ucl_winners: "ჩემპიონთა ლიგის გამარჯვებული", ucl_final: "ევროპის ფინალისტი", ucl_semi: "ჩემპიონთა ლიგის ნახევარფინალისტი", european_cup: "ევროპის თასის მფლობელი", uefa_cup: "UEFA-ს თასის მფლობელი", europa_league: "ევროპის ლიგის გამარჯვებული", surprise: "სეზონის სენსაცია", title_race: "ბრძოლა ტიტულისთვის ბოლომდე" },
};

const pt: LeagueCopy = {
  rules: [
    "Escolha uma liga, gire um clube e uma temporada e contrate um dos jogadores.",
    "Você só vê nomes e preços: a nota aparece quando você contrata. Nomes famosos custam mais; temporadas-surpresa saem baratas.",
    "Preencha as 11 posições com seu orçamento e seu time joga uma temporada inteira.",
    "Cada liga tem seu ranking semanal. Vale sua melhor temporada da semana.",
  ],
  chooseLeague: "Escolha sua liga", iconicName: "Clubes icônicos", iconicNote: "As maiores temporadas da história", boardWeek: (l) => `${l} · esta semana`, yourWeek: (r) => `Seu melhor da semana: ${r}`, draftIn: (l) => `Jogar em ${l}`,
  teamHidden: "Este time também é um desafio aberto: jogue-o primeiro para ver a escalação.",
  signInBoard: "Entre na sua conta para aparecer no ranking semanal", hiddenRule: "As notas só aparecem quando você contrata: julgue pelo nome e pelo preço.", boardEmpty: "Ninguém no ranking desta semana ainda. Seja o primeiro.", weekReset: "O ranking recomeça toda segunda-feira", ratingOnSign: "Nota ao contratar",
  honours: { treble: "Tríplice coroa", double: "Dobradinha", champions: "Campeão da liga", unbeaten: "Campeão invicto", centurions: "Campeão dos 100 pontos", ucl_winners: "Campeão da Champions", ucl_final: "Finalista europeu", ucl_semi: "Semifinalista da Champions", european_cup: "Campeão da Copa dos Campeões", uefa_cup: "Campeão da Copa da UEFA", europa_league: "Campeão da Liga Europa", surprise: "A surpresa da temporada", title_race: "Briga pelo título até o fim" },
};

const de: LeagueCopy = {
  rules: [
    "Wähle eine Liga, dreh einen Verein und eine Saison und verpflichte einen Spieler daraus.",
    "Du siehst nur Namen und Preise: Die Bewertung zeigt sich erst bei der Verpflichtung. Große Namen kosten mehr, Durchbruch-Saisons sind günstig.",
    "Fülle alle 11 Positionen mit deinem Budget, dann spielt deine Elf eine ganze Ligasaison.",
    "Jede Liga hat ihre eigene Wochenrangliste. Es zählt deine beste Saison der Woche.",
  ],
  chooseLeague: "Wähle deine Liga", iconicName: "Legendäre Teams", iconicNote: "Die größten Saisons der Geschichte", boardWeek: (l) => `${l} · diese Woche`, yourWeek: (r) => `Deine Bestleistung diese Woche: ${r}`, draftIn: (l) => `Draft starten: ${l}`,
  teamHidden: "Dieses Team ist auch eine offene Herausforderung: Spiel sie zuerst, um die Elf zu sehen.",
  signInBoard: "Melde dich an, um in die Wochenrangliste zu kommen", hiddenRule: "Bewertungen siehst du erst nach der Verpflichtung: Entscheide nach Name und Preis.", boardEmpty: "Diese Woche steht noch niemand in der Rangliste. Sei der Erste.", weekReset: "Die Ranglisten starten jeden Montag neu", ratingOnSign: "Bewertung bei Verpflichtung",
  honours: { treble: "Triple-Sieger", double: "Double-Sieger", champions: "Meister", unbeaten: "Ungeschlagener Meister", centurions: "Meister mit 100 Punkten", ucl_winners: "Champions-League-Sieger", ucl_final: "Europapokal-Finalist", ucl_semi: "Champions-League-Halbfinalist", european_cup: "Europapokalsieger der Landesmeister", uefa_cup: "UEFA-Cup-Sieger", europa_league: "Europa-League-Sieger", surprise: "Überraschung der Saison", title_race: "Titelkampf bis zum letzten Spieltag" },
};

const ru: LeagueCopy = {
  rules: [
    "Выбери лигу, крути клуб и сезон и подпиши одного из его игроков.",
    "Видны только имена и цены: рейтинг открывается при подписании. Громкие имена стоят дороже, прорывные сезоны — дешевле.",
    "Заполни все 11 позиций в рамках бюджета, и твой состав сыграет целый сезон.",
    "У каждой лиги свой недельный рейтинг. Засчитывается твой лучший сезон недели.",
  ],
  chooseLeague: "Выбери лигу", iconicName: "Легендарные клубы", iconicNote: "Величайшие сезоны в истории", boardWeek: (l) => `${l} · эта неделя`, yourWeek: (r) => `Твой лучший результат недели: ${r}`, draftIn: (l) => `Играть: ${l}`,
  teamHidden: "Эта команда — ещё и открытый вызов: сначала сыграй его, чтобы увидеть состав.",
  signInBoard: "Войди, чтобы попасть в недельный рейтинг", hiddenRule: "Рейтинг виден только после подписания: оценивай по имени и цене.", boardEmpty: "В рейтинге этой недели пока никого нет. Стань первым.", weekReset: "Рейтинги обнуляются каждый понедельник", ratingOnSign: "Рейтинг при подписании",
  honours: { treble: "Требл", double: "Золотой дубль", champions: "Чемпион лиги", unbeaten: "Непобеждённый чемпион", centurions: "Чемпион со 100 очками", ucl_winners: "Победитель Лиги чемпионов", ucl_final: "Финалист еврокубка", ucl_semi: "Полуфиналист Лиги чемпионов", european_cup: "Обладатель Кубка чемпионов", uefa_cup: "Обладатель Кубка УЕФА", europa_league: "Победитель Лиги Европы", surprise: "Сенсация сезона", title_race: "Борьба за титул до последнего тура" },
};

const fr: LeagueCopy = {
  rules: [
    "Choisis une ligue, fais tourner un club et une saison, puis recrute un de ses joueurs.",
    "Tu ne vois que les noms et les prix : la note apparaît à la signature. Les grands noms coûtent plus cher, les saisons révélation sont bon marché.",
    "Remplis les 11 postes avec ton budget et ton onze joue une saison complète.",
    "Chaque ligue a son classement de la semaine. Ta meilleure saison de la semaine compte.",
  ],
  chooseLeague: "Choisis ta ligue", iconicName: "Clubs mythiques", iconicNote: "Les plus grandes saisons de l'histoire", boardWeek: (l) => `${l} · cette semaine`, yourWeek: (r) => `Ton meilleur de la semaine : ${r}`, draftIn: (l) => `Jouer : ${l}`,
  teamHidden: "Cette équipe est aussi un défi en cours : joue-le d'abord pour voir le onze.",
  signInBoard: "Connecte-toi pour entrer au classement de la semaine", hiddenRule: "Les notes n'apparaissent qu'à la signature : juge sur le nom et le prix.", boardEmpty: "Personne au classement cette semaine. Sois le premier.", weekReset: "Les classements repartent à zéro chaque lundi", ratingOnSign: "Note à la signature",
  honours: { treble: "Triplé", double: "Doublé", champions: "Champion", unbeaten: "Champion invaincu", centurions: "Champion à 100 points", ucl_winners: "Vainqueur de la Ligue des champions", ucl_final: "Finaliste européen", ucl_semi: "Demi-finaliste de la Ligue des champions", european_cup: "Vainqueur de la Coupe des clubs champions", uefa_cup: "Vainqueur de la Coupe UEFA", europa_league: "Vainqueur de la Ligue Europa", surprise: "La surprise de la saison", title_race: "Course au titre jusqu'au bout" },
};

const el: LeagueCopy = {
  rules: [
    "Διάλεξε πρωτάθλημα, γύρνα έναν σύλλογο και μια σεζόν και υπόγραψε έναν παίκτη του.",
    "Βλέπεις μόνο ονόματα και τιμές: η βαθμολογία φαίνεται όταν υπογράφεις. Τα μεγάλα ονόματα κοστίζουν περισσότερο, οι σεζόν-έκπληξη βγαίνουν φθηνά.",
    "Συμπλήρωσε και τις 11 θέσεις με το μπάτζετ σου και η ενδεκάδα σου παίζει ολόκληρη σεζόν.",
    "Κάθε πρωτάθλημα έχει τη δική του εβδομαδιαία κατάταξη. Μετράει η καλύτερη σεζόν σου της εβδομάδας.",
  ],
  chooseLeague: "Διάλεξε πρωτάθλημα", iconicName: "Θρυλικές ομάδες", iconicNote: "Οι μεγαλύτερες σεζόν της ιστορίας", boardWeek: (l) => `${l} · αυτή την εβδομάδα`, yourWeek: (r) => `Το καλύτερό σου αυτή την εβδομάδα: ${r}`, draftIn: (l) => `Παίξε: ${l}`,
  teamHidden: "Αυτή η ομάδα είναι και ανοιχτή πρόκληση: παίξ' την πρώτα για να δεις την ενδεκάδα.",
  signInBoard: "Συνδέσου για να μπεις στην εβδομαδιαία κατάταξη", hiddenRule: "Οι βαθμολογίες φαίνονται μόνο όταν υπογράφεις: κρίνε από το όνομα και την τιμή.", boardEmpty: "Κανείς ακόμα στην κατάταξη της εβδομάδας. Γίνε ο πρώτος.", weekReset: "Οι κατατάξεις ξεκινούν από την αρχή κάθε Δευτέρα", ratingOnSign: "Βαθμολογία με την υπογραφή",
  honours: { treble: "Τρεμπλ", double: "Νταμπλ", champions: "Πρωταθλητής", unbeaten: "Αήττητος πρωταθλητής", centurions: "Πρωταθλητής με 100 βαθμούς", ucl_winners: "Κυπελλούχος Champions League", ucl_final: "Φιναλίστ Ευρώπης", ucl_semi: "Ημιφιναλίστ Champions League", european_cup: "Κυπελλούχος Πρωταθλητριών", uefa_cup: "Κυπελλούχος UEFA", europa_league: "Κυπελλούχος Europa League", surprise: "Η έκπληξη της σεζόν", title_race: "Μάχη για τον τίτλο μέχρι το τέλος" },
};

export const LEAGUE_COPY = { en, es, tr, ka, pt, de, ru, fr, el } as const;
